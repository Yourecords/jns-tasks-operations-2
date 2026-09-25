'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  X,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Film,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

export interface MediaItem {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  created_at?: string;
}

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: MediaItem | null;
  files?: MediaItem[];
  onSelectFile?: (file: MediaItem) => void;
  isAdmin?: boolean;
  onDelete?: (file: MediaItem) => void | Promise<void>;
}

export default function MediaLightboxModal({
  isOpen,
  onClose,
  file,
  files = [],
  onSelectFile,
  isAdmin = false,
  onDelete,
}: MediaLightboxModalProps) {
  const [zoomed, setZoomed] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ext = (file?.name ? file.name.split('.').pop() || '' : '').toLowerCase();
  const isVideo =
    file?.mime?.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi', 'ogv', 'wmv'].includes(ext);
  const isImage =
    file?.mime?.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(ext);
  const isPdf =
    file?.mime === 'application/pdf' ||
    ext === 'pdf';

  // Keyboard navigation
  const currentIndex = file && files.length > 0 ? files.findIndex((f) => f.id === file.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && onSelectFile) {
      setZoomed(false);
      setVideoError(false);
      setPlaybackRate(1);
      onSelectFile(files[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, files, onSelectFile]);

  const handleNext = useCallback(() => {
    if (hasNext && onSelectFile) {
      setZoomed(false);
      setVideoError(false);
      setPlaybackRate(1);
      onSelectFile(files[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, files, onSelectFile]);

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === ' ' && isVideo && videoRef.current) {
        // Spacebar toggles video play/pause
        e.preventDefault();
        if (videoRef.current.paused) {
          void videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, isVideo]);

  // Reset zoom and video state whenever file changes
  useEffect(() => {
    setZoomed(false);
    setVideoError(false);
    setPlaybackRate(1);
  }, [file?.id]);

  if (!isOpen || !file) return null;

  const sizeMb = (Number(file.bytes || 0) / (1024 * 1024)).toFixed(2);
  const downloadUrl = `/api/media/${file.id}?download=1`;
  const viewUrl = `/api/media/${file.id}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${file.name}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'rgba(5, 10, 20, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backgroundColor: 'rgba(10, 16, 28, 0.85)',
          gap: 16,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'rgba(229, 169, 60, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--jns-gold)',
              flexShrink: 0,
            }}
          >
            {isImage ? <ImageIcon size={20} /> : isVideo ? <Film size={20} /> : <FileText size={20} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
                maxWidth: '50vw',
              }}
              title={file.name}
            >
              {file.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              <span
                style={{
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--jns-gold)',
                }}
              >
                {file.mime ? file.mime.split('/')[1] || file.mime : 'FILE'}
              </span>
              <span>•</span>
              <span>{sizeMb} MB</span>
              {files.length > 1 && currentIndex >= 0 && (
                <>
                  <span>•</span>
                  <span>
                    {currentIndex + 1} of {files.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isImage && (
            <button
              type="button"
              onClick={() => setZoomed(!zoomed)}
              title={zoomed ? 'Fit to screen' : 'Zoom 100%'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#e2e8f0',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {zoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
              <span>{zoomed ? 'Fit' : 'Zoom'}</span>
            </button>
          )}

          <a
            href={downloadUrl}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 6,
              backgroundColor: 'var(--jns-gold)',
              color: '#090e18',
              fontWeight: 600,
              fontSize: 13,
              textDecoration: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(229, 169, 60, 0.3)',
              transition: 'transform 0.15s, background-color 0.15s',
            }}
          >
            <Download size={16} />
            <span>Download original</span>
          </a>

          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete "${file.name}"? This action will delete it permanently.`)) {
                  void onDelete(file);
                }
              }}
              title="Delete media item (Admin only)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Main Preview Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          overflow: zoomed ? 'auto' : 'hidden',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Navigation Previous Button */}
        {hasPrev && (
          <button
            type="button"
            onClick={handlePrev}
            title="Previous (Left Arrow)"
            style={{
              position: 'absolute',
              left: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              zIndex: 20,
              transition: 'all 0.15s',
            }}
          >
            <ChevronLeft size={24} />
          </button>
        )}

        {/* Content Preview */}
        {isImage && (
          <div
            style={{
              maxWidth: zoomed ? 'none' : '100%',
              maxHeight: zoomed ? 'none' : '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <img
              src={viewUrl}
              alt={file.name}
              style={{
                maxWidth: zoomed ? 'none' : '90vw',
                maxHeight: zoomed ? 'none' : '82vh',
                objectFit: 'contain',
                borderRadius: 4,
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
                cursor: zoomed ? 'zoom-out' : 'zoom-in',
              }}
              onClick={() => setZoomed(!zoomed)}
            />
          </div>
        )}

        {isVideo && !videoError && (
          <div
            style={{
              width: '100%',
              maxWidth: 1040,
              maxHeight: '84vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: '75vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08)',
              }}
            >
              <video
                ref={videoRef}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onError={() => {
                  setVideoError(true);
                }}
                style={{
                  width: '100%',
                  maxHeight: '75vh',
                  backgroundColor: '#000',
                  outline: 'none',
                }}
              >
                <source src={viewUrl} type={file.mime?.startsWith('video/') ? file.mime : (ext === 'mov' ? 'video/quicktime' : 'video/mp4')} />
                <source src={viewUrl} type="video/mp4" />
                <source src={viewUrl} type="video/quicktime" />
                <source src={viewUrl} type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </div>

            {/* Video Utility Bar: Speed selector, Spacebar hint, Open tab */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: 1040,
                padding: '6px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(8px)',
                fontSize: 12,
                color: '#94a3b8',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>SPEED:</span>
                {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => handleSpeedChange(spd)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: 'none',
                      backgroundColor: playbackRate === spd ? 'var(--jns-gold)' : 'rgba(255, 255, 255, 0.08)',
                      color: playbackRate === spd ? '#090e18' : '#e2e8f0',
                      fontWeight: 600,
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Press <kbd style={{ padding: '2px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }}>Space</kbd> to Play/Pause
                </span>
                <a
                  href={viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--jns-gold)',
                    textDecoration: 'none',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                  title="Open video in new tab"
                >
                  <ExternalLink size={12} />
                  <span>Open tab</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {isVideo && videoError && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '36px 32px',
              borderRadius: 16,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(229, 169, 60, 0.3)',
              maxWidth: 540,
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.6)',
              animation: 'fadeIn 0.25s ease-out',
            }}
          >
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 16,
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                border: '1px solid rgba(229, 169, 60, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--jns-gold)',
                marginBottom: 16,
              }}
            >
              <Film size={34} />
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                padding: '3px 10px',
                borderRadius: 20,
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                color: 'var(--jns-gold)',
                marginBottom: 10,
              }}
            >
              {ext.toUpperCase()} VIDEO CONTAINER
            </span>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: '0 0 10px 0' }}>
              {file.name}
            </h3>

            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 20px 0' }}>
              This video could not be played directly in your browser. This typically occurs when a file uses a professional editing codec (such as Apple ProRes, Avid DNxHD, or uncompressed QuickTime) not natively supported by web browsers.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <a
                href={downloadUrl}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 20px',
                  borderRadius: 8,
                  backgroundColor: 'var(--jns-gold)',
                  color: '#090e18',
                  fontWeight: 600,
                  fontSize: 13,
                  textDecoration: 'none',
                  boxShadow: '0 2px 10px rgba(229, 169, 60, 0.35)',
                }}
              >
                <Download size={16} />
                <span>Download Original ({sizeMb} MB)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setVideoError(false);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} />
                <span>Retry Playback</span>
              </button>
            </div>

            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: 11, color: '#64748b' }}>
              Tip: Standard H.264 MP4 and WebM videos play directly. Download ProRes or master files to play in QuickTime, VLC, or DaVinci Resolve.
            </div>
          </div>
        )}

        {isPdf && (
          <div
            style={{
              width: '100%',
              maxWidth: 960,
              height: '80vh',
              backgroundColor: '#fff',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            }}
          >
            <iframe
              src={viewUrl}
              title={file.name}
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        )}

        {!isImage && !isVideo && !isPdf && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              borderRadius: 16,
              backgroundColor: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              maxWidth: 480,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--jns-gold)',
                marginBottom: 16,
              }}
            >
              <FileText size={36} />
            </div>
            <h3 style={{ fontSize: 18, color: '#f8fafc', marginBottom: 8 }}>{file.name}</h3>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 20 }}>
              Direct browser preview is not available for this format ({file.mime || 'unknown'}). You can download the original file to view it on your machine.
            </p>
            <a
              href={downloadUrl}
              download
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                borderRadius: 8,
                backgroundColor: 'var(--jns-gold)',
                color: '#090e18',
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              <Download size={18} />
              Download original ({sizeMb} MB)
            </a>
          </div>
        )}

        {/* Navigation Next Button */}
        {hasNext && (
          <button
            type="button"
            onClick={handleNext}
            title="Next (Right Arrow)"
            style={{
              position: 'absolute',
              right: 20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              zIndex: 20,
              transition: 'all 0.15s',
            }}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* Footer thumbnail strip (if multiple files) */}
      {files.length > 1 && (
        <footer
          style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(10, 16, 28, 0.9)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            overflowX: 'auto',
            maxHeight: 70,
          }}
        >
          {files.map((f, idx) => {
            const isSelected = f.id === file.id;
            const fExt = (f.name.split('.').pop() || '').toLowerCase();
            const isFImage =
              f.mime?.startsWith('image/') ||
              ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(fExt);
            const isFVideo =
              f.mime?.startsWith('video/') ||
              ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi', 'ogv'].includes(fExt);

            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setZoomed(false);
                  onSelectFile?.(f);
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  border: isSelected ? '2px solid var(--jns-gold)' : '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  opacity: isSelected ? 1 : 0.6,
                  transform: isSelected ? 'scale(1.08)' : 'none',
                  transition: 'all 0.15s',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title={f.name}
              >
                {isFImage ? (
                  <img
                    src={`/api/media/${f.id}`}
                    alt={f.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : isFVideo ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    <Film size={18} color="var(--jns-gold)" />
                    <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>{fExt.toUpperCase()}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 10, color: 'var(--jns-gold)', fontWeight: 600 }}>
                    {idx + 1}
                  </span>
                )}
              </button>
            );
          })}
        </footer>
      )}
    </div>
  );
}
