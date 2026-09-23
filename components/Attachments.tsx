"use client";
import React, { useEffect, useState } from "react";
type MediaFile = { id: string; name: string; mime: string; bytes: number };
export default function Attachments({
  kind,
  target,
  expanded = false,
}: {
  kind: string;
  target: string;
  expanded?: boolean;
}) {
  const [open, setOpen] = useState(expanded);
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(25 * 1024 * 1024);
  const query = new URLSearchParams({ kind, target }).toString();
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/media?${query}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setFiles(d.files);
    } catch (e: any) {
      setError(e.message || "Unable to load files.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (open) {
      void load();
      fetch("/api/integrations/google-drive")
        .then((r) => r.json())
        .then((d) => {
          if (d.maxBytes) setLimit(d.maxBytes);
        })
        .catch(() => {});
    }
  }, [open, kind, target]);
  const upload = async (list: FileList | null) => {
    if (!list) return;
    setError("");
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
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: file,
          },
        );
        const d = await r.json();
        if (!r.ok) throw new Error(`${file.name}: ${d.error}`);
      }
    } catch (e: any) {
      setError(e.message || "Upload failed.");
    } finally {
      await load();
      setBusy(false);
    }
  };
  return (
    <section
      style={{ padding: "12px", borderTop: "1px solid var(--border-subtle)" }}
    >
      {!expanded && (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? "Hide attachments" : "Attachments"}
        </button>
      )}
      {open && (
        <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
          <label style={{ fontSize: 13 }}>
            Add files (up to {limit / 1024 / 1024} MB each)
            <input
              aria-label="Upload attachments"
              type="file"
              multiple
              disabled={busy}
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
              style={{ display: "block", marginTop: 8, maxWidth: "100%" }}
            />
          </label>
          {busy && <p role="status">Uploading… Please keep this page open.</p>}
          {error && (
            <p role="alert" style={{ color: "#f87171" }}>
              {error}
            </p>
          )}
          {loading && <p role="status">Loading attachments…</p>}
          {!loading && !files.length && (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              No attachments yet.
            </p>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
              gap: 12,
            }}
          >
            {files.map((file) => (
              <article
                key={file.id}
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: 10,
                  minWidth: 0,
                }}
              >
                {file.mime.startsWith("image/") && (
                  <a
                    href={`/api/media/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={`/api/media/${file.id}`}
                      alt={file.name}
                      loading="lazy"
                      style={{
                        width: "100%",
                        height: 120,
                        objectFit: "contain",
                      }}
                    />
                  </a>
                )}
                <div style={{ overflowWrap: "anywhere", fontSize: 13 }}>
                  {file.name}
                </div>
                <small>
                  {(Number(file.bytes) / 1024 / 1024).toFixed(2)} MB
                </small>
                <br />
                <a
                  href={`/api/media/${file.id}?download=1`}
                  style={{ color: "var(--jns-gold)" }}
                >
                  Download
                </a>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
