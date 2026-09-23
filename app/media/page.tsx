"use client";
import React, { useEffect, useState } from "react";
import { useUser } from "@/components/UserContext";
import Attachments from "@/components/Attachments";

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
        window.gapi.load("picker", {
          callback: resolve,
          onerror: () => reject(new Error("Unable to load Google Picker.")),
        });
      if (window.gapi) {
        load();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = load;
      script.onerror = () => reject(new Error("Unable to load Google Picker."));
      document.head.appendChild(script);
    }).catch((e) => {
      pickerScript = undefined;
      throw e;
    });
  return pickerScript;
}
export default function MediaPage() {
  const { currentUser } = useUser();
  const [status, setStatus] = useState<any>(null);
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const api = async (path: string, body?: unknown) => {
    const r = await fetch(
      path,
      body === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Request failed.");
    return d;
  };
  const refresh = async () => {
    const [s, a] = await Promise.all([
      api("/api/integrations/google-drive"),
      api("/api/media/albums"),
    ]);
    setStatus(s);
    setAlbums(a.albums);
  };
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
    const outcome = new URLSearchParams(window.location.search).get("drive");
    if (outcome === "connected")
      setNotice("Google Drive authorized. Now select JNS Website Uploads.");
    if (outcome === "failed")
      setError(
        "Drive authorization was cancelled or failed. Use the storage owner’s work account, accept the requested permission, and try again.",
      );
  }, []);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
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
    const config = await api("/api/integrations/google-drive/picker", {});
    const view = new window.google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes("application/vnd.google-apps.folder");
    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(config.accessToken)
      .setDeveloperKey(config.apiKey)
      .setAppId(config.appId)
      .setOrigin(window.location.origin)
      .setCallback((data: any) => {
        if (data.action === "picked")
          void run(async () => {
            await api("/api/integrations/google-drive/folder", {
              folderId: data.docs[0].id,
            });
            setNotice(
              "Storage connected. You can now upload attachments and album files.",
            );
            await refresh();
          });
      })
      .build();
    picker.setVisible(true);
  };
  const active = albums.find((a) => a.id === selected);
  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        display: "grid",
        gap: 20,
        paddingBottom: 40,
      }}
    >
      <h1 style={{ fontSize: 24 }}>Media & Albums</h1>
      <p>
        Team albums and files. Attach files to requests and ideas from their
        Attachments buttons.
      </p>
      {error && (
        <p role="alert" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!status && !error && <p>Loading storage…</p>}
      {status && (
        <section className="section-panel" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 18 }}>File storage</h2>
          <p>
            {status.ready
              ? "Ready for uploads"
              : status.connected
                ? "Authorized — folder selection needed"
                : "Not connected"}
          </p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Files use the connected work account’s available Google storage.
            Maximum {status.maxBytes / 1024 / 1024} MB per file. Images have
            previews; other files are available to download. Albums are visible
            to all signed-in team members.
          </p>
          {status.canConfigure ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 12,
              }}
            >
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const d = await api(
                      "/api/integrations/google-drive/connect",
                      {},
                    );
                    window.location.assign(d.url);
                  })
                }
              >
                {status.connected
                  ? "Reconnect Google Drive"
                  : "Connect Google Drive"}
              </button>
              {status.connected && (
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void run(chooseFolder)}
                >
                  Select upload folder
                </button>
              )}
            </div>
          ) : (
            !status.ready && (
              <p>Ask {status.ownerEmail} to complete storage setup.</p>
            )
          )}
        </section>
      )}
      {currentUser && currentUser.role !== "TEAM_MEMBER" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const d = await api("/api/media/albums", { name });
              setName("");
              await refresh();
              setSelected(d.id);
            });
          }}
          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <input
            className="form-input"
            aria-label="New album name"
            placeholder="New album name"
            value={name}
            maxLength={150}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" disabled={busy}>
            Create album
          </button>
        </form>
      )}
      <label>
        Album{" "}
        <select
          className="form-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select an album</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      {status && !albums.length && (
        <p>No albums yet. A producer or administrator can create one.</p>
      )}
      {active && (
        <section className="section-panel" style={{ padding: 12 }}>
          <h2>{active.name}</h2>
          <Attachments
            key={active.id}
            kind="album"
            target={active.id}
            expanded
          />
        </section>
      )}
    </main>
  );
}
