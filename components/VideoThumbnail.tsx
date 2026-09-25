'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Film, AlertTriangle } from 'lucide-react';
import {
  captureVideoThumbnail,
  getCachedThumbnail,
  setCachedThumbnail,
  saveThumbnailToServer,
} from '@/lib/video-thumbnail';

interface VideoThumbnailProps {
  fileId: string;
  src?: string;
  thumbnail?: string | null;
  name: string;
  duration?: number;
  showPlayBadge?: boolean;
  style?: React.CSSProperties;
  className?: string;
  objectFit?: 'cover' | 'contain';
}

function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function VideoThumbnail({
  fileId,
  src,
  thumbnail: initialThumbnail,
  name,
  duration: initialDuration,
  showPlayBadge = true,
  style,
  className,
  objectFit = 'cover',
}: VideoThumbnailProps) {
  const [thumbSrc, setThumbSrc] = useState<string | null>(() => {
    if (initialThumbnail) return initialThumbnail;
    const cached = getCachedThumbnail(fileId);
    if (cached) return cached;
    return null;
  });
  const [duration, setDuration] = useState<number | undefined>(initialDuration);
  const [loading, setLoading] = useState<boolean>(!thumbSrc);
  const [error, setError] = useState<boolean>(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (initialThumbnail) {
      setThumbSrc(initialThumbnail);
      setCachedThumbnail(fileId, initialThumbnail);
      setLoading(false);
      return;
    }

    const cached = getCachedThumbnail(fileId);
    if (cached) {
      setThumbSrc(cached);
      setLoading(false);
      return;
    }

    // Dynamic extraction using browser Range stream
    let cancelled = false;
    setLoading(true);
    setError(false);

    const videoUrl = src || `/api/media/${fileId}`;

    captureVideoThumbnail(videoUrl, { seekTime: 1.5, maxWidth: 540 })
      .then((res) => {
        if (cancelled || !isMounted.current) return;
        setThumbSrc(res.thumbnail);
        if (res.duration && !duration) {
          setDuration(res.duration);
        }
        setCachedThumbnail(fileId, res.thumbnail);
        setLoading(false);

        // Background persist to server so it never needs to be generated again
        saveThumbnailToServer(fileId, res.thumbnail).catch(() => {});
      })
      .catch((err) => {
        if (cancelled || !isMounted.current) return;
        console.warn(`Could not extract dynamic thumbnail for ${name}:`, err.message);
        setLoading(false);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, src, initialThumbnail]);

  const ext = (name.split('.').pop() || 'VIDEO').toUpperCase();

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#0c1322',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {/* 1. Successful Thumbnail Display */}
      {thumbSrc && !error ? (
        <>
          <img
            src={thumbSrc}
            alt={name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit,
              transition: 'transform 0.3s ease, filter 0.3s ease',
            }}
          />

          {/* Sleek Play Badge Overlay */}
          {showPlayBadge && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                transition: 'background-color 0.2s ease',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: '1.5px solid rgba(229, 169, 60, 0.8)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
                  color: 'var(--jns-gold, #e5a93c)',
                  transition: 'transform 0.2s ease, background-color 0.2s ease',
                }}
              >
                <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
              </div>
            </div>
          )}

          {/* Duration Pill in Bottom Right Corner */}
          {duration && duration > 0 ? (
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: 'rgba(10, 16, 28, 0.88)',
                backdropFilter: 'blur(6px)',
                color: '#f8fafc',
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.15)',
                letterSpacing: '0.03em',
                pointerEvents: 'none',
              }}
            >
              {formatDuration(duration)}
            </span>
          ) : (
            <span
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                backgroundColor: 'rgba(10, 16, 28, 0.85)',
                backdropFilter: 'blur(6px)',
                color: '#e2e8f0',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 5px',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                letterSpacing: '0.04em',
                pointerEvents: 'none',
              }}
            >
              {ext}
            </span>
          )}
        </>
      ) : loading ? (
        /* 2. Loading State: Subtle shimmer with Film Icon */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: 'var(--jns-gold, #e5a93c)',
            background: 'linear-gradient(135deg, #0e182a 0%, #16243d 100%)',
            width: '100%',
            height: '100%',
            animation: 'pulse 1.8s infinite ease-in-out',
          }}
        >
          <Film size={34} style={{ opacity: 0.85 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary, #94a3b8)', fontWeight: 500 }}>
            Generating preview…
          </span>
        </div>
      ) : (
        /* 3. Fallback for Codecs Unsupported by Browser: Stylized Gradient Card (Never a black box) */
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: '100%',
            padding: 12,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #111c30 0%, #1a2c4c 100%)',
            border: '1px solid rgba(229, 169, 60, 0.15)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: 'rgba(229, 169, 60, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--jns-gold, #e5a93c)',
            }}
          >
            <Film size={24} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>
            {ext} Video
          </span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>
            Click to play
          </span>
        </div>
      )}
    </div>
  );
}
