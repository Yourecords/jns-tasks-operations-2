'use client';

/**
 * Utility for generating, caching, and persisting high-quality video thumbnails.
 * Prevents black frames by seeking past the initial seconds and verifying frame luminance.
 */

// In-memory cache for instant cross-component retrieval
const thumbnailCache = new Map<string, string>();

export function getCachedThumbnail(key: string): string | undefined {
  if (typeof window === 'undefined') return undefined;
  if (thumbnailCache.has(key)) return thumbnailCache.get(key);
  try {
    const item = sessionStorage.getItem(`v_thumb_${key}`);
    if (item) {
      thumbnailCache.set(key, item);
      return item;
    }
  } catch {}
  return undefined;
}

export function setCachedThumbnail(key: string, dataUrl: string): void {
  if (typeof window === 'undefined') return;
  thumbnailCache.set(key, dataUrl);
  try {
    // Only store in sessionStorage if not excessively large
    if (dataUrl.length < 200_000) {
      sessionStorage.setItem(`v_thumb_${key}`, dataUrl);
    }
  } catch {}
}

export function isVideoFile(file: { name: string; mime?: string; type?: string } | File): boolean {
  if (!file) return false;
  const mime = ('mime' in file ? file.mime : (file as any).type) || '';
  if (mime && mime.startsWith('video/')) return true;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi', 'ogv', 'wmv'].includes(ext);
}

export interface VideoThumbnailResult {
  thumbnail: string;
  duration: number;
}

/**
 * Extracts a representative, non-black video frame as a JPEG data URL.
 * Automatically seeks past black opening frames / fades.
 */
export function captureVideoThumbnail(
  source: File | string,
  options: {
    seekTime?: number;
    maxWidth?: number;
    timeoutMs?: number;
  } = {}
): Promise<VideoThumbnailResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Cannot capture video thumbnail on server'));
    }

    const {
      seekTime = 1.5,
      maxWidth = 640,
      timeoutMs = 12000,
    } = options;

    let isObjectUrl = false;
    let url: string;

    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      isObjectUrl = true;
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    let cleanedUp = false;
    let attemptedSecondarySeek = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (isObjectUrl) {
        URL.revokeObjectURL(url);
      }
    };

    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Video thumbnail extraction timed out.'));
    }, timeoutMs);

    const finishSuccess = (result: VideoThumbnailResult) => {
      clearTimeout(timeoutTimer);
      cleanup();
      resolve(result);
    };

    const finishError = (err: Error) => {
      clearTimeout(timeoutTimer);
      cleanup();
      reject(err);
    };

    video.onerror = () => {
      finishError(new Error('Browser could not decode video for thumbnail generation.'));
    };

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration || 0;
        let targetTime = seekTime;

        if (Number.isFinite(duration) && duration > 0) {
          if (duration <= 1.0) {
            targetTime = Math.max(0.1, duration * 0.5);
          } else if (duration <= 3.0) {
            targetTime = Math.min(1.0, duration * 0.35);
          } else {
            // Seek to 1.5s or 15% into the video to avoid initial black frames
            targetTime = Math.min(seekTime, duration * 0.2);
          }
        }

        video.currentTime = targetTime;
      } catch (err) {
        // Fallback: try default seek
        try {
          video.currentTime = 1.0;
        } catch {
          finishError(new Error('Could not set video currentTime.'));
        }
      }
    };

    video.onseeked = () => {
      // Allow frame rendering to settle
      requestAnimationFrame(() => {
        try {
          const vWidth = video.videoWidth || 640;
          const vHeight = video.videoHeight || 360;
          const scale = Math.min(1, maxWidth / vWidth);
          const width = Math.max(160, Math.round(vWidth * scale));
          const height = Math.max(90, Math.round(vHeight * scale));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            finishError(new Error('Canvas 2D context unavailable'));
            return;
          }

          ctx.drawImage(video, 0, 0, width, height);

          // Check frame brightness to prevent dark/black frames (e.g. fades from black)
          let isBlackFrame = false;
          try {
            const sampleW = Math.min(width, 80);
            const sampleH = Math.min(height, 80);
            const imgData = ctx.getImageData(0, 0, sampleW, sampleH).data;
            let totalLuma = 0;
            const count = imgData.length / 4;
            for (let i = 0; i < imgData.length; i += 4) {
              totalLuma += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
            }
            const avgLuma = totalLuma / count;
            // Luminance < 14 indicates a black or near-black frame
            if (avgLuma < 14) {
              isBlackFrame = true;
            }
          } catch {
            // In case canvas is tainted, proceed with image
          }

          const duration = video.duration || 0;
          if (isBlackFrame && !attemptedSecondarySeek && duration > 3.0) {
            attemptedSecondarySeek = true;
            // Seek further in (3.0s or 35% of video) to capture visible content
            const secondTarget = Math.min(3.5, duration * 0.35);
            video.currentTime = secondTarget;
            return; // Will fire onseeked again
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          finishSuccess({
            thumbnail: dataUrl,
            duration: Number.isFinite(duration) ? duration : 0,
          });
        } catch (e: any) {
          finishError(e instanceof Error ? e : new Error('Failed to capture frame from video'));
        }
      });
    };

    video.src = url;
  });
}

/**
 * Persist generated thumbnail to the server for a specific media item.
 */
export async function saveThumbnailToServer(mediaId: string, thumbnailDataUrl: string): Promise<boolean> {
  if (!mediaId || !thumbnailDataUrl) return false;
  try {
    const res = await fetch(`/api/media/${mediaId}/thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnail: thumbnailDataUrl }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to save thumbnail to server:', err);
    return false;
  }
}
