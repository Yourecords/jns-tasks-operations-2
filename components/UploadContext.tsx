'use client';

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number; // 0 to 100
  loadedBytes: number;
  totalBytes: number;
  status: 'queued' | 'uploading' | 'completed' | 'error' | 'cancelled';
  error?: string;
  targetUrl: string;
  targetName?: string;
  onFileUploaded?: (file: File, result: any) => void;
  onAllCompleted?: () => void;
}

export interface UploadBatchOptions {
  files: File[];
  targetUrl: (file: File) => string;
  targetName?: string;
  maxBytes?: number;
  onFileUploaded?: (file: File, result: any) => void;
  onAllCompleted?: () => void;
  onError?: (err: string) => void;
}

interface UploadContextType {
  items: UploadItem[];
  isOpen: boolean;
  isMinimized: boolean;
  isUploading: boolean;
  openWindow: () => void;
  closeWindow: () => void;
  toggleMinimize: () => void;
  queueUploads: (options: UploadBatchOptions) => void;
  cancelItem: (id: string) => void;
  cancelAll: () => void;
  clearCompleted: () => void;
  retryItem: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const activeXhrs = useRef<Record<string, XMLHttpRequest>>({});
  const isProcessingQueue = useRef(false);

  const openWindow = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeWindow = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const cancelItem = useCallback((id: string) => {
    if (activeXhrs.current[id]) {
      try {
        activeXhrs.current[id].abort();
      } catch {}
      delete activeXhrs.current[id];
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'cancelled', error: 'Upload cancelled' } : item)),
    );
  }, []);

  const cancelAll = useCallback(() => {
    Object.values(activeXhrs.current).forEach((xhr) => {
      try {
        xhr.abort();
      } catch {}
    });
    activeXhrs.current = {};
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'uploading' || item.status === 'queued'
          ? { ...item, status: 'cancelled', error: 'Upload cancelled' }
          : item,
      ),
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((item) => item.status === 'uploading' || item.status === 'queued'));
  }, []);

  // Upload single file worker
  const uploadFile = useCallback((item: UploadItem): Promise<void> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      activeXhrs.current[item.id] = xhr;

      xhr.open('POST', item.targetUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    loadedBytes: e.loaded,
                    totalBytes: e.total,
                    progress: percent,
                  }
                : it,
            ),
          );
        }
      };

      xhr.onload = () => {
        delete activeXhrs.current[item.id];
        if (xhr.status >= 200 && xhr.status < 300) {
          let data: any = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch {}

          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'completed',
                    progress: 100,
                    loadedBytes: it.totalBytes || it.size,
                  }
                : it,
            ),
          );

          if (item.onFileUploaded) {
            try {
              item.onFileUploaded(item.file, data);
            } catch (err) {
              console.error('onFileUploaded callback error:', err);
            }
          }
        } else {
          let errMsg = `Upload failed (${xhr.status})`;
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed.error) errMsg = parsed.error;
          } catch {}

          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'error',
                    error: errMsg,
                  }
                : it,
            ),
          );
        }
        resolve();
      };

      xhr.onerror = () => {
        delete activeXhrs.current[item.id];
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  error: 'Network connection lost during upload.',
                }
              : it,
          ),
        );
        resolve();
      };

      xhr.onabort = () => {
        delete activeXhrs.current[item.id];
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'cancelled',
                  error: 'Upload cancelled.',
                }
              : it,
          ),
        );
        resolve();
      };

      try {
        xhr.send(item.file);
      } catch (err: any) {
        delete activeXhrs.current[item.id];
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  error: err.message || 'Failed to send file.',
                }
              : it,
          ),
        );
        resolve();
      }
    });
  }, []);

  // Process queue sequentially
  useEffect(() => {
    if (isProcessingQueue.current) return;

    const queuedItem = items.find((it) => it.status === 'queued');
    if (!queuedItem) return;

    isProcessingQueue.current = true;

    // Mark as uploading
    setItems((prev) =>
      prev.map((it) => (it.id === queuedItem.id ? { ...it, status: 'uploading', progress: 0 } : it)),
    );

    void uploadFile(queuedItem).then(() => {
      isProcessingQueue.current = false;

      // Check if this was the last item in a batch and trigger onAllCompleted
      setItems((latest) => {
        const remaining = latest.filter((it) => it.status === 'queued' || it.status === 'uploading');
        if (remaining.length === 0 && queuedItem.onAllCompleted) {
          try {
            queuedItem.onAllCompleted();
          } catch (err) {
            console.error('onAllCompleted callback error:', err);
          }
        }
        return latest;
      });
    });
  }, [items, uploadFile]);

  const queueUploads = useCallback(
    (options: UploadBatchOptions) => {
      const { files, targetUrl, targetName, maxBytes, onFileUploaded, onAllCompleted, onError } = options;
      if (!files || files.length === 0) return;

      const limit = maxBytes || 100 * 1024 * 1024; // 100 MB default
      const newItems: UploadItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > limit) {
          const err = `${file.name} exceeds ${(limit / (1024 * 1024)).toFixed(0)} MB limit.`;
          onError?.(err);
          continue;
        }

        const id = `upl_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`;
        newItems.push({
          id,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          status: 'queued',
          targetUrl: targetUrl(file),
          targetName,
          onFileUploaded,
          onAllCompleted,
        });
      }

      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
        setIsOpen(true);
        setIsMinimized(false);
      }
    },
    [],
  );

  const retryItem = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: 'queued',
                progress: 0,
                loadedBytes: 0,
                error: undefined,
              }
            : it,
        ),
      );
      setIsOpen(true);
      setIsMinimized(false);
    },
    [],
  );

  const isUploading = items.some((it) => it.status === 'uploading' || it.status === 'queued');

  return (
    <UploadContext.Provider
      value={{
        items,
        isOpen,
        isMinimized,
        isUploading,
        openWindow,
        closeWindow,
        toggleMinimize,
        queueUploads,
        cancelItem,
        cancelAll,
        clearCompleted,
        retryItem,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

const defaultContext: UploadContextType = {
  items: [],
  isOpen: false,
  isMinimized: false,
  isUploading: false,
  openWindow: () => {},
  closeWindow: () => {},
  toggleMinimize: () => {},
  queueUploads: () => {},
  cancelItem: () => {},
  cancelAll: () => {},
  clearCompleted: () => {},
  retryItem: () => {},
};

export function useUpload() {
  const ctx = useContext(UploadContext);
  return ctx || defaultContext;
}
