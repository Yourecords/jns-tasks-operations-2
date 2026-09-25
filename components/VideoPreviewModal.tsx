'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  Play,
  Maximize2,
  AlertCircle,
  Film,
  Video,
  Sparkles,
} from 'lucide-react';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
  subtitle?: string;
  poster?: string;
}

export function parseVideoUrl(url: string): {
  type: 'DROPBOX' | 'YOUTUBE' | 'DRIVE' | 'DIRECT' | 'UNKNOWN';
  streamUrl: string;
  embedUrl?: string;
  originalUrl: string;
} {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) {
    return { type: 'UNKNOWN', streamUrl: '', originalUrl: cleanUrl };
  }

  // 1. YouTube
  const ytMatch =
    cleanUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'YOUTUBE',
      streamUrl: cleanUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
      originalUrl: cleanUrl,
    };
  }

  // 2. Google Drive
  const driveMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/i);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return {
      type: 'DRIVE',
      streamUrl: cleanUrl,
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      originalUrl: cleanUrl,
    };
  }

  // 3. Dropbox
  if (cleanUrl.includes('dropbox.com') || cleanUrl.includes('dl.dropboxusercontent.com')) {
    let rawUrl = cleanUrl;
    if (rawUrl.includes('dl.dropboxusercontent.com')) {
      // Already a direct stream
    } else if (rawUrl.includes('?')) {
      // Replace dl=0 or add raw=1
      if (rawUrl.includes('dl=0')) {
        rawUrl = rawUrl.replace('dl=0', 'raw=1');
      } else if (rawUrl.includes('dl=1')) {
        rawUrl = rawUrl.replace('dl=1', 'raw=1');
      } else if (!rawUrl.includes('raw=1')) {
        rawUrl = `${rawUrl}&raw=1`;
      }
    } else {
      rawUrl = `${rawUrl}?raw=1`;
    }

    return {
      type: 'DROPBOX',
      streamUrl: rawUrl,
      originalUrl: cleanUrl,
    };
  }

  // 4. Direct video extension (.mp4, .mov, .webm, .m4v)
  if (cleanUrl.match(/\.(mp4|mov|webm|m4v)(\?.*)?$/i)) {
    return {
      type: 'DIRECT',
      streamUrl: cleanUrl,
      originalUrl: cleanUrl,
    };
  }

  return {
    type: 'UNKNOWN',
    streamUrl: cleanUrl,
    originalUrl: cleanUrl,
  };
}

export default function VideoPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  title = 'Video Preview',
  subtitle,
  poster,
}: VideoPreviewModalProps) {
  const [playbackError, setPlaybackError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const parsed = parseVideoUrl(videoUrl);

  // Keyboard navigation: Escape to close, Space to toggle
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === ' ' && videoRef.current && parsed.type !== 'YOUTUBE' && parsed.type !== 'DRIVE') {
        // Prevent default page scroll on space
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, parsed.type]);

  // Reset error state on URL change
  useEffect(() => {
    setPlaybackError(false);
    setPlaybackRate(1);
  }, [videoUrl, isOpen]);

  if (!isOpen || !videoUrl) return null;

  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          backgroundColor: '#0f172a',
          borderRadius: '16px',
          border: '1px solid #334155',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 30px rgba(37, 99, 235, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: parsed.type === 'DROPBOX' ? 'rgba(0, 97, 254, 0.15)' : parsed.type === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                border: `1px solid ${parsed.type === 'DROPBOX' ? 'rgba(0, 97, 254, 0.3)' : parsed.type === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {parsed.type === 'YOUTUBE' ? (
                <Video size={18} color="#ef4444" />
              ) : (
                <Film size={18} color={parsed.type === 'DROPBOX' ? '#38bdf8' : '#60a5fa'} />
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                  {title}
                </h3>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: parsed.type === 'DROPBOX' ? 'rgba(0, 97, 254, 0.2)' : parsed.type === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: parsed.type === 'DROPBOX' ? '#38bdf8' : parsed.type === 'YOUTUBE' ? '#f87171' : '#cbd5e1',
                    border: `1px solid ${parsed.type === 'DROPBOX' ? 'rgba(0, 97, 254, 0.4)' : parsed.type === 'YOUTUBE' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.15)'}`,
                  }}
                >
                  {parsed.type === 'DROPBOX'
                    ? 'Dropbox Direct Stream'
                    : parsed.type === 'YOUTUBE'
                    ? 'YouTube Player'
                    : parsed.type === 'DRIVE'
                    ? 'Google Drive Video'
                    : 'Direct Video Stream'}
                </span>
              </div>
              {subtitle && (
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href={parsed.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(51, 65, 85, 0.6)',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s ease',
              }}
              title="Open source video in new tab"
            >
              <span>Open in {parsed.type === 'DROPBOX' ? 'Dropbox' : parsed.type === 'YOUTUBE' ? 'YouTube' : 'New Tab'}</span>
              <ExternalLink size={12} />
            </a>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(51, 65, 85, 0.5)',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#94a3b8',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Close Preview (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PLAYER CONTAINER */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 Aspect Ratio
            backgroundColor: '#000000',
          }}
        >
          {/* YOUTUBE OR GOOGLE DRIVE IFRAME */}
          {parsed.embedUrl ? (
            <iframe
              src={parsed.embedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : (
            <>
              {/* DIRECT / DROPBOX HTML5 VIDEO STREAM */}
              {!playbackError ? (
                <video
                  ref={videoRef}
                  src={parsed.streamUrl}
                  controls
                  autoPlay
                  playsInline
                  poster={poster || (videoUrl.includes('/api/media/') ? `${videoUrl}?thumb=1` : undefined)}
                  onError={() => setPlaybackError(true)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000',
                  }}
                />
              ) : (
                /* FALLBACK IF BROWSER CODEC CANNOT DECODE (E.G. PRORES RAW ON DROPBOX) */
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '32px',
                    textAlign: 'center',
                    color: '#cbd5e1',
                    background: 'radial-gradient(circle at center, #1e293b, #0f172a)',
                  }}
                >
                  <AlertCircle size={44} color="#f59e0b" style={{ marginBottom: '12px' }} />
                  <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
                    Direct Stream Codec Unsupported in Browser
                  </h4>
                  <p style={{ maxWidth: '520px', fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                    This video file is encoded in a format that browsers cannot play natively (such as Apple ProRes 422, Avid DNxHR, or uncompressed camera RAW).
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <a
                      href={parsed.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '13px',
                        textDecoration: 'none',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                      }}
                    >
                      <Play size={15} />
                      <span>Watch Transcoded Proxy on Dropbox ↗</span>
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* CONTROLS STRIP (Only for HTML5 Direct & Dropbox streams) */}
        {!parsed.embedUrl && !playbackError && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: '#0b1120',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600 }}>Speed:</span>
              {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: playbackRate === speed ? '1px solid #3b82f6' : '1px solid #334155',
                    backgroundColor: playbackRate === speed ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                    color: playbackRate === speed ? '#60a5fa' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '11px' }}>
              <span>Space: Play/Pause</span>
              <span>Esc: Close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
