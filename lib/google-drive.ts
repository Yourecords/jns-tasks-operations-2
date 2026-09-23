import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getRealAuthenticatedUser } from "./auth";
import { getPgPool } from "./pg";
import { getDbAsync } from "./db";
import { seal, unseal } from "./drive-security";
import type { User } from "./types";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const STATE_COOKIE = "jns_drive_state";
export const ownerEmail = () =>
  (process.env.GOOGLE_DRIVE_OWNER_EMAIL || "yskvirski@jns.org").toLowerCase();
export const secret = () => process.env.NEXTAUTH_SECRET || "";
export const uploadLimit = () =>
  Math.min(
    100,
    Math.max(1, Number(process.env.GOOGLE_DRIVE_MAX_UPLOAD_MB) || 25),
  ) *
  1024 *
  1024;
export function appOrigin() {
  const origin = new URL(process.env.NEXTAUTH_URL || "http://localhost:3000")
    .origin;
  if (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
    throw new Error("HTTPS is required.");
  return origin;
}
export const callbackUrl = () =>
  `${appOrigin()}/api/integrations/google-drive/callback`;
export function sameOrigin(req: NextRequest) {
  if (req.headers.get("origin") !== appOrigin())
    throw new Error("Invalid request origin.");
}
export async function requireUser(
  req: NextRequest,
  owner = false,
): Promise<User> {
  const user = owner
    ? await getRealAuthenticatedUser(req)
    : await getAuthenticatedUser(req);
  if (
    !user ||
    (owner &&
      (user.role !== "ADMIN" || user.email.toLowerCase() !== ownerEmail()))
  )
    throw new Error("Access denied.");
  return user;
}
let schema: Promise<unknown> | undefined;
export async function driveDb() {
  const db = getPgPool();
  if (!db) throw new Error("PostgreSQL is required for file storage.");
  if (!schema)
    schema = db
      .query(
        `
    CREATE TABLE IF NOT EXISTS jns_drive_connection (
      id integer PRIMARY KEY CHECK (id=1), token text NOT NULL, email text NOT NULL,
      folder_id text, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS jns_media_albums (
      id uuid PRIMARY KEY, name text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE TABLE IF NOT EXISTS jns_media_files (
      id uuid PRIMARY KEY, drive_id text NOT NULL UNIQUE, kind text NOT NULL, target_id text NOT NULL,
      name text NOT NULL, mime text NOT NULL, bytes bigint NOT NULL, uploaded_by text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS jns_media_target ON jns_media_files(kind,target_id);
  `,
      )
      .catch((err) => {
        schema = undefined;
        throw err;
      });
  await schema;
  return db;
}
export async function connection() {
  const db = await driveDb();
  return (await db.query("SELECT * FROM jns_drive_connection WHERE id=1"))
    .rows[0];
}
export async function accessToken() {
  const row = await connection();
  if (!row || row.email !== ownerEmail())
    throw new Error("The storage owner must connect Google Drive.");
  const refresh = unseal(row.token, secret());
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: refresh,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok)
    throw new Error(
      "Google Drive authorization expired or was revoked. Ask the storage owner to reconnect.",
    );
  const data = await r.json();
  return data.access_token as string;
}
export async function driveFetch(
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token || (await accessToken())}`);
  const r = await fetch(`https://www.googleapis.com/${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    if (r.status === 403)
      throw new Error(
        "Drive rejected the request. Check folder permission, available storage, or Workspace restrictions.",
      );
    if (r.status === 404)
      throw new Error("The Drive file or folder is no longer available.");
    throw new Error("Google Drive request failed. Please try again.");
  }
  return r;
}
export async function checkTarget(
  kind: string,
  id: string,
  user: User,
  write = false,
) {
  if (!id || id.length > 150)
    throw new Error("Invalid attachment destination.");
  if (kind === "album") {
    const db = await driveDb();
    if (
      !(
        await db.query("SELECT id FROM jns_media_albums WHERE id::text=$1", [
          id,
        ])
      ).rowCount
    )
      throw new Error("Album not found.");
    return;
  }
  const db = await getDbAsync();
  let record: any;
  if (kind === "idea") record = db.showIdeas.find((x) => x.id === id);
  if (kind === "graphics")
    record = db.graphicDesignTasks?.find((x) => x.id === id);
  if (kind === "equipment")
    record = db.equipmentRequests.find((x) => x.id === id);
  if (kind === "improvement") record = db.improvements.find((x) => x.id === id);
  if (!record) throw new Error("Attachment destination not found.");
  if (
    write &&
    user.role === "TEAM_MEMBER" &&
    ![
      record.submittedById,
      record.createdById,
      record.requestedById,
      record.assignedUserId,
      record.authorId,
    ].includes(user.id)
  )
    throw new Error(
      "Only the requester, assignee, producer, or administrator can add attachments here.",
    );
}
export function failure(error: unknown) {
  // Never expose upstream response bodies, tokens, or database errors.
  const message = error instanceof Error ? error.message : "";
  const known =
    /^(Access denied|Invalid |File exceeds|Empty file|A file name|PostgreSQL is required|The storage owner|Google Drive|Drive rejected|The Drive|Attachment destination|Album not found|Only the requester|Select the configured|Folder cannot|OAuth |Storage is not|Too many)/;
  return NextResponse.json(
    {
      error: known.test(message)
        ? message
        : "Unable to complete this operation. Please try again or contact the administrator.",
    },
    {
      status: message === "Access denied." ? 403 : 400,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export { seal, unseal };
