'use client';

import React, { useEffect, useState } from 'react';
import { Eye, Download, FileText, Image as ImageIcon, Film, UploadCloud, AlertCircle, Trash2 } from 'lucide-react';
import { useUser } from './UserContext';
import MediaLightboxModal, { MediaItem } from './MediaLightboxModal';

export default function Attachments({
  kind,
  target,
  expanded = false,
}: {
  kind: string;
  target: string;
  expanded?: boolean;
}) {
  const { currentUser } = useUser();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.email?.toLowerCase() === 'yskvirski@jns.org';

  const [open, setOpen] = useState(expanded);
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(25 * 1024 * 1024);
  const [previewFile, setPreviewFile] = useState<MediaItem | null>(null);

  const query = new URLSearchParams({ kind, target }).toString();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/media?${query}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFiles(d.files);
    } catch (e: any) {
      setError(e.message || 'Unable to load files.');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (file: MediaItem) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/media/${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove file.');
      setPreviewFile(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to remove file.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
      fetch('/api/integrations/google-drive')
        .then((r) => r.json())
        .then((d) => {
          if (d.maxBytes) setLimit(d.maxBytes);
        })
        .catch(() => {});
    }
  }, [open, kind, target]);

  const upload = async (list: FileList | null) => {
    if (!list) return;
    setError('');
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        if (file.size > limit)
          throw new Error(
            `${file.name}: maximum file size is ${limit / 1024 / 1024} MB.`,
          );
        const r = await fetch(
          `/api/media?${query}&name=${encodeURIComponent(file.name)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file,
          },
        );
        const d = await r.json();
        if (!r.ok) throw new Error(`${file.name}: ${d.error}`);
      }
    } catch (e: any) {
      setError(e.message || 'Upload failed.');
    } finally {
      await load();
      setBusy(false);
    }
  };

  return (
    <section
      style={{
        padding: '14px 16px',
        borderTop: '1px solid var(--border-subtle)',
        borderRadius: 8,
      }}
    >
      {!expanded && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <UploadCloud size={14} />
          {open ? 'Hide attachments' : files.length > 0 ? `Attachments (${files.length})` : 'Attachments'}
        </button>
      )}

      {open && (
        <div style={{ display: 'grid', gap: 14, marginTop: expanded ? 0 : 12 }}>
          {/* Upload Drop/Input Box */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px dashed var(--border-medium)',
              backgroundColor: 'var(--bg-card-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <UploadCloud size={16} style={{ color: 'var(--jns-gold)' }} />
              <span>Attach files (up to {limit / 1024 / 1024} MB each)</span>
              <input
                aria-label="Upload attachments"
                type="file"
                multiple
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = '';
                }}
                style={{ display: 'none' }}
              />
              <span
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto', pointerEvents: 'none' }}
              >
                Choose files
              </span>
            </label>
          </div>

          {busy && (
            <p
              role="status"
              style={{
                fontSize: 13,
                color: 'var(--jns-gold)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Uploading… Please keep this page open.
            </p>
          )}

          {error && (
            <p
              role="alert"
              style={{
                color: '#f87171',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <AlertCircle size={15} />
              {error}
            </p>
          )}

          {loading && (
            <p role="status" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Loading attachments…
            </p>
          )}

          {!loading && !files.length && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              No attachments yet.
            </p>
          )}

          {/* Media Items Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {files.map((file) => {
              const isImage = file.mime?.startsWith('image/');
              const isVideo = file.mime?.startsWith('video/');
              const ext = file.name.split('.').pop()?.toUpperCase() || (file.mime ? file.mime.split('/')[1]?.toUpperCase() : 'FILE');
              const sizeFormatted = (Number(file.bytes || 0) / (1024 * 1024)).toFixed(2);

              return (
                <article
                  key={file.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'border-color 0.2s, transform 0.2s',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Thumbnail / Preview Header */}
                  <div
                    onClick={() => setPreviewFile(file)}
                    style={{
                      height: 120,
                      backgroundColor: 'var(--bg-input)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                    title={`Click to view ${file.name}`}
                  >
                    {isImage ? (
                      <img
                        src={`/api/media/${file.id}`}
                        alt={file.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.25s ease',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {isVideo ? <Film size={32} color="var(--jns-gold)" /> : <FileText size={32} />}
                      </div>
                    )}

                    {/* Badge */}
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(10, 16, 28, 0.75)',
                        backdropFilter: 'blur(4px)',
                        color: 'var(--jns-gold)',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {ext}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4,
                      }}
                      title={file.name}
                    >
                      {file.name}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        marginBottom: 10,
                      }}
                    >
                      {sizeFormatted} MB
                    </div>

                    {/* Actions: View and Download Original (plus Admin Remove) */}
                    <div
                      style={{
                        marginTop: 'auto',
                        display: 'flex',
                        gap: 6,
                        paddingTop: 8,
                        borderTop: '1px solid var(--border-subtle)',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                        title="View item"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>

                      <a
                        href={`/api/media/${file.id}?download=1`}
                        download
                        className="btn btn-primary btn-sm"
                        style={{
                          flex: 1,
                          padding: '5px 8px',
                          fontSize: 12,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          textDecoration: 'none',
                        }}
                        title="Download original file"
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove "${file.name}"?`)) {
                              void deleteFile(file);
                            }
                          }}
                          disabled={busy}
                          title="Remove file (Admin only)"
                          style={{
                            padding: '5px 7px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={!!previewFile}
        file={previewFile}
        files={files}
        onSelectFile={(f) => setPreviewFile(f)}
        onClose={() => setPreviewFile(null)}
        isAdmin={isAdmin}
        onDelete={deleteFile}
      />
    </section>
  );
}
