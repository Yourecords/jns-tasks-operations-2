'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '@/components/UserContext';
import Attachments from '@/components/Attachments';
import MediaLightboxModal, { MediaItem } from '@/components/MediaLightboxModal';
import { useUpload } from '@/components/UploadContext';
import {
  Film,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Eye,
  Download,
  Search,
  Settings,
  LayoutGrid,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  Sliders,
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let pickerScript: Promise<void> | undefined;
function loadPicker() {
  if (!pickerScript)
    pickerScript = new Promise<void>((resolve, reject) => {
      const load = () =>
        window.gapi.load('picker', {
          callback: resolve,
          onerror: () => reject(new Error('Unable to load Google Picker.')),
        });
      if (window.gapi) {
        load();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = load;
      script.onerror = () => reject(new Error('Unable to load Google Picker.'));
      document.head.appendChild(script);
    }).catch((e) => {
      pickerScript = undefined;
      throw e;
    });
  return pickerScript;
}

interface Album {
  id: string;
  name: string;
  created_at?: string;
}

export default function MediaPage() {
  const { currentUser, realUser } = useUser();
  const [status, setStatus] = useState<any>(null);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const { queueUploads, isUploading } = useUpload();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  // Album media items state for stylized gallery
  const [albumFiles, setAlbumFiles] = useState<MediaItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IMAGE' | 'VIDEO' | 'DOC'>('ALL');
  const [previewFile, setPreviewFile] = useState<MediaItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [albumCovers, setAlbumCovers] = useState<Record<string, { count: number; coverId?: string }>>({});
  const [isDraggingOverAlbum, setIsDraggingOverAlbum] = useState(false);
  const [isDraggingOverSection, setIsDraggingOverSection] = useState(false);

  // Admin view toggle: 'album' vs 'admin'
  const [viewMode, setViewMode] = useState<'album' | 'admin'>('album');

  const isAdmin = useMemo(() => {
    return (
      currentUser?.role === 'ADMIN' ||
      currentUser?.email?.toLowerCase() === 'yskvirski@jns.org'
    );
  }, [currentUser]);

  // Load view mode preference from localStorage for Admin
  useEffect(() => {
    if (typeof window !== 'undefined' && isAdmin) {
      const saved = localStorage.getItem('jns_media_view_preference');
      if (saved === 'admin' || saved === 'album') {
        setViewMode(saved);
      }
    }
  }, [isAdmin]);

  const setAdminView = (mode: 'album' | 'admin') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jns_media_view_preference', mode);
    }
  };

  const api = async (path: string, body?: unknown) => {
    const r = await fetch(
      path,
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          },
    );
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed.');
    return d;
  };

  const refresh = async () => {
    const [s, a] = await Promise.all([
      api('/api/integrations/google-drive').catch(() => null),
      api('/api/media/albums').catch(() => ({ albums: [] })),
    ]);
    if (s) setStatus(s);
    if (a?.albums) {
      setAlbums(a.albums);
      // Auto-select first album if none selected
      if (!selected && a.albums.length > 0) {
        setSelected(a.albums[0].id);
      }
      // Load covers & counts for albums in background
      loadAlbumStats(a.albums);
    }
  };

  const loadAlbumStats = async (albumList: Album[]) => {
    const stats: Record<string, { count: number; coverId?: string }> = {};
    for (const alb of albumList.slice(0, 15)) {
      try {
        const res = await fetch(`/api/media?kind=album&target=${alb.id}`);
        const data = await res.json();
        if (data.files) {
          const firstImage = data.files.find(
            (f: MediaItem) => f.mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif)$/i.test(f.name)
          );
          stats[alb.id] = {
            count: data.files.length,
            coverId: firstImage?.id,
          };
        }
      } catch (e) {
        // ignore background stats load error
      }
    }
    setAlbumCovers((prev) => ({ ...prev, ...stats }));
  };

  // Load files for selected album
  const loadFilesForSelected = async (albumId: string) => {
    if (!albumId) {
      setAlbumFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/media?kind=album&target=${albumId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load media.');
      setAlbumFiles(data.files || []);
      // Update stats for this album
      const firstImage = (data.files || []).find(
        (f: MediaItem) => f.mime?.startsWith('image/') || /\.(jpe?g|png|gif|webp|avif)$/i.test(f.name)
      );
      setAlbumCovers((prev) => ({
        ...prev,
        [albumId]: {
          count: (data.files || []).length,
          coverId: firstImage?.id,
        },
      }));
    } catch (e: any) {
      setError(e.message || 'Error loading files.');
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const outcome = new URLSearchParams(window.location.search).get('drive');
    if (outcome === 'connected')
      setNotice('Google Drive authorized. Now select JNS Website Uploads.');
    if (outcome === 'failed')
      setError(
        'Drive authorization was cancelled or failed. Use the storage owner’s work account, accept the requested permission, and try again.',
      );
  }, []);

  useEffect(() => {
    if (selected) {
      void loadFilesForSelected(selected);
    }
  }, [selected]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const chooseFolder = async () => {
    await loadPicker();
    const config = await api('/api/integrations/google-drive/picker', {});
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes('application/vnd.google-apps.folder');
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(config.accessToken)
      .setDeveloperKey(config.apiKey)
      .setAppId(config.appId)
      .setOrigin(window.location.origin)
      .setCallback((data: any) => {
        if (data.action === 'picked')
          void run(async () => {
            await api('/api/integrations/google-drive/folder', {
              folderId: data.docs[0].id,
            });
            setNotice(
              'Storage connected. You can now upload attachments and album files.',
            );
            await refresh();
          });
      })
      .build();
    picker.setVisible(true);
  };

  // Upload handler with undocked real-time progress window
  const uploadToCurrentAlbum = (list: FileList | null) => {
    if (!list || !selected) return;
    const currentAlbumId = selected;
    const albumName = activeAlbum?.name || 'Album';
    const limit = status?.maxBytes || 100 * 1024 * 1024;

    queueUploads({
      files: Array.from(list),
      targetUrl: (file) => `/api/media?kind=album&target=${currentAlbumId}&name=${encodeURIComponent(file.name)}`,
      targetName: albumName,
      maxBytes: limit,
      onFileUploaded: () => {
        void loadFilesForSelected(currentAlbumId);
      },
      onAllCompleted: () => {
        setNotice('Files uploaded successfully to album!');
        void loadFilesForSelected(currentAlbumId);
        void refresh();
      },
      onError: (err) => {
        setError(err);
      },
    });
  };

  // Admin delete media item handler
  const deleteMediaItem = async (file: MediaItem) => {
    if (!isAdmin) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/media/${file.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove media item.');
      setNotice(`"${file.name}" was removed.`);
      if (previewFile?.id === file.id) {
        setPreviewFile(null);
      }
      await loadFilesForSelected(selected);
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to remove media item.');
    } finally {
      setBusy(false);
    }
  };

  // Admin delete album handler
  const deleteAlbum = async (albumId: string, albumName: string) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete the album "${albumName}" and all of its media files? This action will permanently remove files and cannot be undone.`
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/media/albums/${albumId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete album.');
      setNotice(`Album "${albumName}" was deleted.`);
      if (selected === albumId) {
        setSelected('');
      }
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to delete album.');
    } finally {
      setBusy(false);
    }
  };

  const activeAlbum = albums.find((a) => a.id === selected);

  // Filter media files in active album
  const filteredFiles = useMemo(() => {
    return albumFiles.filter((f) => {
      const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const fExt = (f.name.split('.').pop() || '').toLowerCase();
      const isImg = f.mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(fExt);
      const isVid = f.mime?.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi', 'ogv', 'wmv'].includes(fExt);

      if (typeFilter === 'IMAGE') return isImg;
      if (typeFilter === 'VIDEO') return isVid;
      if (typeFilter === 'DOC') return !isImg && !isVid;
      return true;
    });
  }, [albumFiles, searchQuery, typeFilter]);

  const canCreateAlbum = currentUser && currentUser.role !== 'TEAM_MEMBER';
  const canManageAlbums = canCreateAlbum || isAdmin;

  const openRenameAlbum = (album: Album) => {
    setEditingAlbum(album);
    setRenameValue(album.name);
  };

  const handleRenameAlbum = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingAlbum || !renameValue.trim()) return;
    const trimmed = renameValue.trim();
    if (trimmed === editingAlbum.name) {
      setEditingAlbum(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/media/albums/${editingAlbum.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename album.');

      setAlbums((prev) =>
        prev.map((a) => (a.id === editingAlbum.id ? { ...a, name: trimmed } : a)),
      );
      setNotice(`Album renamed to "${trimmed}".`);
      setEditingAlbum(null);
    } catch (err: any) {
      setError(err.message || 'Failed to rename album.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 1300,
        margin: '0 auto',
        padding: '24px 20px 60px 20px',
        display: 'grid',
        gap: 24,
      }}
    >
      {/* Top Header & Admin View Mode Switcher */}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--jns-gold)',
              }}
            >
              <Film size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                Media & Albums
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 2,
                }}
              >
                Production photo collections, asset reels, and studio media library.
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Admin View Mode Switcher: ONLY visible to Admin */}
          {isAdmin && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-card)',
                padding: 4,
                borderRadius: 8,
                border: '1px solid var(--border-medium)',
                boxShadow: 'var(--shadow-sm)',
              }}
              title="Admin view selector"
            >
              <button
                type="button"
                onClick={() => setAdminView('album')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'album' ? 'var(--jns-gold)' : 'transparent',
                  color: viewMode === 'album' ? '#090e18' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <LayoutGrid size={14} />
                <span>Stylized Album View</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminView('admin')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: viewMode === 'admin' ? 'var(--jns-navy-light)' : 'transparent',
                  color: viewMode === 'admin' ? 'var(--jns-gold)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Settings size={14} />
                <span>Admin & Storage View</span>
              </button>
            </div>
          )}

          {/* Create Album Button (if allowed) */}
          {canCreateAlbum && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <Plus size={16} />
              <span>Create Album</span>
            </button>
          )}
        </div>
      </header>

      {/* Status Messages */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 8,
            color: '#4ade80',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#4ade80',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FILE STORAGE WINDOW: ONLY VISIBLE TO ADMIN IN ADMIN & STORAGE VIEW         */}
      {/* ========================================================================= */}
      {isAdmin && viewMode === 'admin' && status && (
        <section
          className="section-panel"
          style={{
            padding: 22,
            borderRadius: 12,
            border: '1px solid var(--border-medium)',
            backgroundColor: 'var(--bg-card)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  backgroundColor: 'rgba(229, 169, 60, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--jns-gold)',
                }}
              >
                <Settings size={18} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
                File Storage Configuration
              </h2>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 4,
                backgroundColor: status.ready
                  ? 'rgba(34, 197, 94, 0.15)'
                  : status.connected
                  ? 'rgba(234, 179, 8, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
                color: status.ready ? '#4ade80' : status.connected ? '#facc15' : '#f87171',
                border: `1px solid ${
                  status.ready
                    ? 'rgba(34, 197, 94, 0.3)'
                    : status.connected
                    ? 'rgba(234, 179, 8, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                }`,
              }}
            >
              {status.ready
                ? 'Ready for uploads'
                : status.connected
                ? 'Folder selection needed'
                : 'Not connected'}
            </span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
            Google Drive storage is restricted to admin management. Files are stored directly in your connected organization Drive folder. Maximum {(status.maxBytes / (1024 * 1024)).toFixed(0)} MB per file.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const d = await api('/api/integrations/google-drive/connect', {});
                  window.location.assign(d.url);
                })
              }
              style={{ fontSize: 13 }}
            >
              {status.connected ? 'Reconnect Google Drive' : 'Connect Google Drive'}
            </button>

            {status.connected && (
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void run(chooseFolder)}
                style={{ fontSize: 13 }}
              >
                Select upload folder (Google Picker)
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void refresh()}
              disabled={busy}
              style={{ fontSize: 13, marginLeft: 'auto' }}
            >
              Refresh Status
            </button>
          </div>
        </section>
      )}

      {/* Create Album Modal / Popover */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 14,
              padding: 24,
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen size={20} color="var(--jns-gold)" />
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-main)', fontWeight: 600 }}>
                  Create New Album
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const d = await api('/api/media/albums', { name });
                  setName('');
                  setShowCreateModal(false);
                  await refresh();
                  setSelected(d.id);
                  setNotice(`Album "${name}" created successfully!`);
                });
              }}
              style={{ display: 'grid', gap: 16 }}
            >
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  Album Title
                </label>
                <input
                  className="form-input"
                  aria-label="New album name"
                  placeholder="e.g., Jerusalem Studio Launch, Season 3 B-Roll..."
                  value={name}
                  maxLength={150}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
                  {busy ? 'Creating…' : 'Create Album'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Album Modal */}
      {editingAlbum && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingAlbum(null);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 14,
              padding: 24,
              boxShadow: 'var(--shadow-lg)',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Pencil size={20} color="var(--jns-gold)" />
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-main)', fontWeight: 600 }}>
                  Rename Album
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAlbum(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameAlbum} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>
                  Album Title
                </label>
                <input
                  className="form-input"
                  aria-label="Album title"
                  value={renameValue}
                  maxLength={150}
                  onChange={(e) => setRenameValue(e.target.value)}
                  required
                  autoFocus
                  onFocus={(e) => e.target.select()}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingAlbum(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={busy || !renameValue.trim() || renameValue.trim() === editingAlbum.name}
                >
                  {busy ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ALBUM COVER SHELF: Visual stylized album cards                             */}
      {/* ========================================================================= */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} color="var(--jns-gold)" />
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>
              Albums ({albums.length})
            </h2>
          </div>
          {albums.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Click an album to open its gallery
            </span>
          )}
        </div>

        {albums.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px dashed var(--border-medium)',
              borderRadius: 12,
            }}
          >
            <Folder size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 16, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
              No Albums Available Yet
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              Create an album to organize team production photos, stills, and video attachments.
            </p>
            {canCreateAlbum && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create the First Album
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            {albums.map((album) => {
              const isSelected = album.id === selected;
              const stats = albumCovers[album.id];
              const count = stats?.count ?? 0;
              const coverId = stats?.coverId;

              return (
                <div
                  key={album.id}
                  onClick={() => setSelected(album.id)}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: 12,
                    border: isSelected
                      ? '2px solid var(--jns-gold)'
                      : '1px solid var(--border-subtle)',
                    boxShadow: isSelected
                      ? '0 0 18px rgba(229, 169, 60, 0.25), var(--shadow-md)'
                      : 'var(--shadow-sm)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-medium)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {/* Album Cover Art */}
                  <div
                    style={{
                      height: 120,
                      backgroundColor: 'var(--bg-card-subtle)',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      backgroundImage: coverId
                        ? undefined
                        : 'linear-gradient(135deg, rgba(14, 30, 56, 0.8) 0%, rgba(24, 46, 82, 0.6) 100%)',
                    }}
                  >
                    {coverId ? (
                      <img
                        src={`/api/media/${coverId}`}
                        alt={album.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          color: 'var(--jns-gold)',
                          opacity: 0.8,
                        }}
                      >
                        <FolderOpen size={36} />
                      </div>
                    )}

                    {/* Active Selected Badge */}
                    {isSelected && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: 'var(--jns-gold)',
                          color: '#090e18',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 4,
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
                        }}
                      >
                        ACTIVE
                      </span>
                    )}

                    {/* Rename Album Button */}
                    {canManageAlbums && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRenameAlbum(album);
                        }}
                        disabled={busy}
                        title={`Rename album "${album.name}"`}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: isAdmin ? 42 : 8,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid var(--border-medium)',
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 5,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--jns-gold)';
                          e.currentTarget.style.borderColor = 'var(--jns-gold)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-medium)';
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                    )}

                    {/* Admin Delete Album Button */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteAlbum(album.id, album.name);
                        }}
                        disabled={busy}
                        title={`Delete album "${album.name}" (Admin only)`}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 5,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    {/* Item Count Badge */}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(10, 16, 28, 0.85)',
                        backdropFilter: 'blur(6px)',
                        color: '#f8fafc',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 4,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* Album Info */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: isSelected ? 'var(--jns-gold)' : 'var(--text-main)',
                        margin: '0 0 6px 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={album.name}
                    >
                      {album.name}
                    </h3>

                    {album.created_at && (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          marginTop: 'auto',
                        }}
                      >
                        <Calendar size={12} />
                        <span>{new Date(album.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* ACTIVE ALBUM SHOWCASE: STYLIZED MEDIA GRID                                 */}
      {/* ========================================================================= */}
      {activeAlbum ? (
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOverSection(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDraggingOverSection(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDraggingOverSection(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOverSection(false);
            setIsDraggingOverAlbum(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              void uploadToCurrentAlbum(e.dataTransfer.files);
            }
          }}
          style={{
            backgroundColor: 'var(--bg-card)',
            border: isDraggingOverSection
              ? '2px dashed var(--jns-gold)'
              : '1px solid var(--border-medium)',
            borderRadius: 14,
            padding: 24,
            boxShadow: isDraggingOverSection
              ? '0 0 24px rgba(229, 169, 60, 0.25), var(--shadow-md)'
              : 'var(--shadow-md)',
            display: 'grid',
            gap: 20,
            position: 'relative',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          {/* Section Drag Overlay */}
          {isDraggingOverSection && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 14,
                backgroundColor: 'rgba(9, 14, 24, 0.92)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 40,
                pointerEvents: 'none',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  backgroundColor: 'rgba(229, 169, 60, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--jns-gold)',
                }}
              >
                <UploadCloud size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                Drop files to upload to &ldquo;{activeAlbum.name}&rdquo;
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                Release to upload directly into this album
              </p>
            </div>
          )}

          {/* Active Album Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FolderOpen size={24} color="var(--jns-gold)" />
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    margin: 0,
                  }}
                >
                  {activeAlbum.name}
                </h2>
                {canManageAlbums && (
                  <button
                    type="button"
                    onClick={() => openRenameAlbum(activeAlbum)}
                    disabled={busy}
                    title={`Rename "${activeAlbum.name}"`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                      borderRadius: 4,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--jns-gold)';
                      e.currentTarget.style.backgroundColor = 'rgba(229, 169, 60, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(229, 169, 60, 0.15)',
                    color: 'var(--jns-gold)',
                  }}
                >
                  {albumFiles.length} {albumFiles.length === 1 ? 'file' : 'files'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Rename Album Button */}
              {canManageAlbums && (
                <button
                  type="button"
                  onClick={() => openRenameAlbum(activeAlbum)}
                  disabled={busy}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                  }}
                  title="Rename this album"
                >
                  <Pencil size={15} />
                  <span>Rename Album</span>
                </button>
              )}

              {/* Admin Delete Album Button */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => void deleteAlbum(activeAlbum.id, activeAlbum.name)}
                  disabled={busy}
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 13,
                    color: '#f87171',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  }}
                  title="Delete this entire album (Admin only)"
                >
                  <Trash2 size={16} />
                  <span>Delete Album</span>
                </button>
              )}

              {/* Upload Button */}
              <label
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.7 : 1,
                }}
              >
                <UploadCloud size={16} />
                <span>{busy ? 'Uploading…' : 'Add Media to Album'}</span>
                <input
                  type="file"
                  multiple
                  disabled={busy}
                  onChange={(e) => {
                    void uploadToCurrentAlbum(e.target.files);
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Filtering & Search Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                backgroundColor: 'var(--bg-input)',
                padding: 4,
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {(
                [
                  { key: 'ALL', label: 'All Files' },
                  { key: 'IMAGE', label: 'Photos' },
                  { key: 'VIDEO', label: 'Videos' },
                  { key: 'DOC', label: 'Documents' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTypeFilter(tab.key)}
                  style={{
                    padding: '5px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: typeFilter === tab.key ? 'var(--jns-gold)' : 'transparent',
                    color: typeFilter === tab.key ? '#090e18' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                minWidth: 220,
              }}
            >
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search in this album…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  paddingLeft: 32,
                  fontSize: 12,
                  height: 34,
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Media Items Grid */}
          {loadingFiles ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <p>Loading album contents…</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverAlbum(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDraggingOverAlbum(true);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDraggingOverAlbum(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOverAlbum(false);
                setIsDraggingOverSection(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void uploadToCurrentAlbum(e.dataTransfer.files);
                }
              }}
              style={{
                padding: '52px 24px',
                textAlign: 'center',
                backgroundColor: isDraggingOverAlbum
                  ? 'rgba(229, 169, 60, 0.08)'
                  : 'var(--bg-card-subtle)',
                border: isDraggingOverAlbum
                  ? '2px dashed var(--jns-gold)'
                  : '2px dashed var(--border-medium)',
                borderRadius: 14,
                transition: 'all 0.2s ease',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: isDraggingOverAlbum ? '0 0 24px rgba(229, 169, 60, 0.2)' : 'none',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: isDraggingOverAlbum
                    ? 'rgba(229, 169, 60, 0.2)'
                    : 'rgba(229, 169, 60, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--jns-gold)',
                  marginBottom: 10,
                  transform: isDraggingOverAlbum ? 'scale(1.1)' : 'none',
                  transition: 'transform 0.2s ease',
                }}
              >
                {isDraggingOverAlbum ? <UploadCloud size={28} /> : <ImageIcon size={28} />}
              </div>

              <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                {searchQuery || typeFilter !== 'ALL'
                  ? 'No matching files found'
                  : isDraggingOverAlbum
                  ? 'Drop your files here to upload'
                  : 'This Album is Empty'}
              </h4>

              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0', maxWidth: 480, lineHeight: 1.5 }}>
                {searchQuery || typeFilter !== 'ALL'
                  ? 'Try clearing your search query or switching filters.'
                  : 'Add team photos, stills, or video clips by dragging and dropping media files directly into this album, or clicking "Add Media to Album" above.'}
              </p>

              {!searchQuery && typeFilter === 'ALL' && (
                <label
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    padding: '8px 18px',
                    cursor: busy ? 'not-allowed' : 'pointer',
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <UploadCloud size={15} />
                  <span>{busy ? 'Uploading…' : 'Drag Media Here or Click to Browse'}</span>
                  <input
                    type="file"
                    multiple
                    disabled={busy}
                    onChange={(e) => {
                      void uploadToCurrentAlbum(e.target.files);
                      e.target.value = '';
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: 16,
              }}
            >
              {filteredFiles.map((file) => {
                const fExt = (file.name.split('.').pop() || '').toLowerCase();
                const isImage = file.mime?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(fExt);
                const isVideo = file.mime?.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi', 'ogv', 'wmv'].includes(fExt);
                const ext =
                  file.name.split('.').pop()?.toUpperCase() ||
                  (file.mime ? file.mime.split('/')[1]?.toUpperCase() : 'FILE');
                const sizeMb = (Number(file.bytes || 0) / (1024 * 1024)).toFixed(2);

                return (
                  <article
                    key={file.id}
                    style={{
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--jns-gold)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                  >
                    {/* Media Thumbnail Container */}
                    <div
                      onClick={() => setPreviewFile(file)}
                      style={{
                        height: 160,
                        backgroundColor: '#090e18',
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
                            transition: 'transform 0.3s ease',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 8,
                            color: 'var(--text-muted)',
                          }}
                        >
                          {isVideo ? (
                            <Film size={38} color="var(--jns-gold)" />
                          ) : (
                            <FileText size={38} />
                          )}
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {isVideo ? 'Video Clip' : 'Document'}
                          </span>
                        </div>
                      )}

                      {/* Admin Delete Media Item Button on Thumbnail */}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Are you sure you want to delete "${file.name}"? This action permanently removes the file and cannot be undone.`
                              )
                            ) {
                              void deleteMediaItem(file);
                            }
                          }}
                          disabled={busy}
                          title={`Delete "${file.name}" (Admin only)`}
                          style={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            backdropFilter: 'blur(4px)',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.85)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {/* Format Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(10, 16, 28, 0.8)',
                          backdropFilter: 'blur(4px)',
                          color: 'var(--jns-gold)',
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: 4,
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        {ext}
                      </span>

                      {/* Quick Hover Eye Overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0,
                          transition: 'opacity 0.2s ease',
                          color: '#fff',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0';
                        }}
                      >
                        <div
                          style={{
                            padding: '6px 12px',
                            borderRadius: 20,
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                          }}
                        >
                          {isVideo ? <Film size={14} /> : <Eye size={14} />}
                          <span>{isVideo ? 'Play Video' : 'Quick Preview'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Media Card Details */}
                    <div
                      style={{
                        padding: '12px 14px',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <h4
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          margin: '0 0 4px 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={file.name}
                      >
                        {file.name}
                      </h4>

                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 12,
                        }}
                      >
                        <span>{sizeMb} MB</span>
                        {file.created_at && (
                          <span>{new Date(file.created_at).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* ========================================================= */}
                      {/* BUTTONS: VIEW & DOWNLOAD ORIGINAL (plus Admin Remove)     */}
                      {/* ========================================================= */}
                      <div
                        style={{
                          marginTop: 'auto',
                          display: 'flex',
                          gap: 6,
                          paddingTop: 10,
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
                            padding: '6px 10px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            borderRadius: 6,
                          }}
                          title="View in full screen"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>

                        <a
                          href={`/api/media/${file.id}?download=1`}
                          download
                          className="btn btn-primary btn-sm"
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 5,
                            borderRadius: 6,
                            textDecoration: 'none',
                          }}
                          title="Download original file"
                        >
                          <Download size={14} />
                          <span>Download original</span>
                        </a>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${file.name}"? This action cannot be undone.`)) {
                                void deleteMediaItem(file);
                              }
                            }}
                            disabled={busy}
                            className="btn btn-secondary btn-sm"
                            title={`Delete "${file.name}" (Admin only)`}
                            style={{
                              padding: '6px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 6,
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              color: '#f87171',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 5,
                              flexShrink: 0,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.7)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* Lightbox / Fullscreen Viewer Modal */}
      <MediaLightboxModal
        isOpen={!!previewFile}
        file={previewFile}
        files={filteredFiles}
        onSelectFile={(f) => setPreviewFile(f)}
        onClose={() => setPreviewFile(null)}
        isAdmin={isAdmin}
        onDelete={deleteMediaItem}
      />
    </main>
  );
}
