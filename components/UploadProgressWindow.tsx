'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useUpload, UploadItem } from './UploadContext';
import {
  UploadCloud,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Film,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Minimize2,
  Maximize2,
  GripHorizontal,
} from 'lucide-react';

export default function UploadProgressWindow() {
  const {
    items,
    isOpen,
    isMinimized,
    isUploading,
    closeWindow,
    toggleMinimize,
    cancelItem,
    cancelAll,
    clearCompleted,
    retryItem,
  } = useUpload();

  // Dragging state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });
  const windowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll list as files update
  const listRef = useRef<HTMLDivElement>(null);

  // Don't render if not open or no items
  if (!isOpen || items.length === 0) return null;

  // Calculate aggregate stats
  const totalCount = items.length;
  const completedCount = items.filter((it) => it.status === 'completed').length;
  const errorCount = items.filter((it) => it.status === 'error').length;
  const activeCount = items.filter((it) => it.status === 'uploading' || it.status === 'queued').length;

  const totalBytes = items.reduce((sum, it) => sum + (it.totalBytes || it.size || 0), 0);
  const loadedBytes = items.reduce((sum, it) => {
    if (it.status === 'completed') return sum + (it.totalBytes || it.size || 0);
    return sum + (it.loadedBytes || 0);
  }, 0);

  const overallPercent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
  const allDone = activeCount === 0;

  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const loadedMb = (loadedBytes / (1024 * 1024)).toFixed(1);

  // Group target title
  const targetTitle = items[items.length - 1]?.targetName || 'Media & Albums';

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);

    const rect = windowRef.current?.getBoundingClientRect();
    const currentX = rect ? rect.left : window.innerWidth - 400;
    const currentY = rect ? rect.top : window.innerHeight - 380;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;

      const newX = Math.max(12, Math.min(window.innerWidth - 390, dragStartRef.current.initialX + deltaX));
      const newY = Math.max(12, Math.min(window.innerHeight - 100, dragStartRef.current.initialY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const getFileIcon = (filename: string) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) {
      return <Film size={16} color="var(--jns-gold)" />;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg'].includes(ext)) {
      return <ImageIcon size={16} color="#38bdf8" />;
    }
    return <FileText size={16} color="#c084fc" />;
  };

  // Minimized Floating Pill
  if (isMinimized) {
    return (
      <div
        ref={windowRef}
        style={{
          position: 'fixed',
          left: position ? `${position.x}px` : undefined,
          top: position ? `${position.y}px` : undefined,
          right: position ? undefined : '24px',
          bottom: position ? undefined : '78px',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderRadius: 24,
          backgroundColor: 'rgba(10, 16, 28, 0.95)',
          border: '1px solid rgba(229, 169, 60, 0.35)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(229, 169, 60, 0.2)',
          color: '#f8fafc',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          animation: 'fadeIn 0.2s ease-out',
          userSelect: 'none',
        }}
        onClick={toggleMinimize}
        title="Click to expand upload progress"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isUploading ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <UploadCloud size={16} color="var(--jns-gold)" style={{ animation: 'bounce 1s infinite' }} />
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -3,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--jns-gold)',
                }}
              />
            </div>
          ) : (
            <CheckCircle2 size={16} color="#22c55e" />
          )}

          <span>
            {isUploading
              ? `Uploading ${activeCount} ${activeCount === 1 ? 'file' : 'files'} (${overallPercent}%)`
              : `${completedCount} ${completedCount === 1 ? 'file' : 'files'} uploaded`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Expand"
          >
            <ChevronUp size={15} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (isUploading) {
                if (window.confirm('Cancel ongoing uploads?')) {
                  cancelAll();
                  closeWindow();
                }
              } else {
                closeWindow();
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Undocked Window
  return (
    <div
      ref={windowRef}
      role="region"
      aria-label="Upload Progress Window"
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : undefined,
        top: position ? `${position.y}px` : undefined,
        right: position ? undefined : '24px',
        bottom: position ? undefined : '78px',
        width: 380,
        maxWidth: 'calc(100vw - 32px)',
        borderRadius: 14,
        backgroundColor: 'rgba(10, 16, 28, 0.96)',
        border: '1px solid rgba(229, 169, 60, 0.35)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 24px rgba(229, 169, 60, 0.15)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: isDragging ? 'none' : 'auto',
      }}
    >
      {/* Header bar (Draggable) */}
      <header
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: isUploading ? 'rgba(229, 169, 60, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isUploading ? 'var(--jns-gold)' : '#22c55e',
              flexShrink: 0,
            }}
          >
            {isUploading ? <UploadCloud size={18} /> : <CheckCircle2 size={18} />}
          </div>

          <div style={{ minWidth: 0 }}>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#f8fafc',
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isUploading ? `Uploading ${totalCount} ${totalCount === 1 ? 'item' : 'items'}…` : 'Upload Complete'}
            </h4>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Destination: {targetTitle}
            </span>
          </div>
        </div>

        {/* Window controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={toggleMinimize}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            title="Minimize"
          >
            <ChevronDown size={17} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isUploading) {
                if (window.confirm('Are you sure you want to cancel remaining uploads?')) {
                  cancelAll();
                  closeWindow();
                }
              } else {
                closeWindow();
              }
            }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            title="Close"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* Aggregate Progress Bar */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>
          <span>
            {completedCount} of {totalCount} completed
            {errorCount > 0 && <span style={{ color: '#f87171', marginLeft: 6 }}>({errorCount} failed)</span>}
          </span>
          <span style={{ fontWeight: 600, color: 'var(--jns-gold)' }}>
            {loadedMb} MB / {totalMb} MB ({overallPercent}%)
          </span>
        </div>

        <div
          style={{
            height: 6,
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${overallPercent}%`,
              background: allDone
                ? errorCount > 0
                  ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
                  : 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)'
                : 'linear-gradient(90deg, #e5a93c 0%, #f59e0b 100%)',
              borderRadius: 3,
              transition: 'width 0.25s ease-out',
            }}
          />
        </div>
      </div>

      {/* Itemized File List */}
      <div
        ref={listRef}
        style={{
          maxHeight: 220,
          overflowY: 'auto',
          padding: '6px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {items.map((item) => {
          const sizeMb = (item.size / (1024 * 1024)).toFixed(2);
          const isItemUploading = item.status === 'uploading';
          const isItemCompleted = item.status === 'completed';
          const isItemError = item.status === 'error';
          const isItemQueued = item.status === 'queued';

          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderRadius: 8,
                backgroundColor: isItemUploading
                  ? 'rgba(229, 169, 60, 0.08)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: isItemUploading
                  ? '1px solid rgba(229, 169, 60, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.04)',
                gap: 10,
                fontSize: 12,
              }}
            >
              {/* File Icon & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                <div style={{ flexShrink: 0 }}>{getFileIcon(item.name)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: '#f8fafc',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontSize: 12,
                    }}
                    title={item.name}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                    {sizeMb} MB
                    {isItemUploading && (
                      <span style={{ color: 'var(--jns-gold)', marginLeft: 6, fontWeight: 600 }}>
                        • {item.progress}%
                      </span>
                    )}
                    {isItemError && (
                      <span style={{ color: '#f87171', marginLeft: 6 }}>
                        • {item.error || 'Failed'}
                      </span>
                    )}
                  </div>

                  {/* Micro Progress bar for uploading item */}
                  {isItemUploading && (
                    <div
                      style={{
                        height: 3,
                        width: '100%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 2,
                        marginTop: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.progress}%`,
                          backgroundColor: 'var(--jns-gold)',
                          transition: 'width 0.2s linear',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {isItemCompleted && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: '#22c55e',
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Done</span>
                  </span>
                )}

                {isItemQueued && (
                  <span style={{ fontSize: 11, color: '#64748b' }}>Queued</span>
                )}

                {isItemUploading && (
                  <button
                    type="button"
                    onClick={() => cancelItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                    title="Cancel this file"
                  >
                    <X size={14} />
                  </button>
                )}

                {isItemError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => retryItem(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--jns-gold)',
                        cursor: 'pointer',
                        padding: 2,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Retry upload"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelItem(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <footer
        style={{
          padding: '10px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 11,
        }}
      >
        <span style={{ color: '#64748b' }}>
          {isUploading ? 'Uploading in background…' : 'All uploads finished.'}
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          {allDone ? (
            <button
              type="button"
              onClick={() => {
                clearCompleted();
                closeWindow();
              }}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                backgroundColor: 'var(--jns-gold)',
                color: '#090e18',
                border: 'none',
                fontWeight: 700,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Cancel all remaining uploads?')) {
                  cancelAll();
                }
              }}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 600,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              Cancel All
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
