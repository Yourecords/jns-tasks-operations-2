import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  checkTarget,
  driveDb,
  driveFetch,
  ownerEmail,
  failure,
} from "@/lib/google-drive";
import { inferMimeType } from "@/lib/drive-security";
import { getRealAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(req);
    const { id } = await context.params;
    const db = await driveDb();
    const file = (
      await db.query("SELECT * FROM jns_media_files WHERE id::text=$1", [id])
    ).rows[0];
    if (!file) return new Response("Not found", { status: 404 });
    await checkTarget(file.kind, file.target_id, user);

    const mime = inferMimeType(file.name, file.mime);
    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const isPreviewable =
      mime.startsWith("image/") ||
      mime.startsWith("video/") ||
      mime.startsWith("audio/") ||
      mime === "application/pdf";
    const inline = isPreviewable && !isDownload;

    // Forward HTTP Range header if requested (vital for HTML5 video seeking & playback)
    const range = req.headers.get("range");
    const driveHeaders: Record<string, string> = {};
    if (range) {
      driveHeaders["Range"] = range;
    }

    const response = await driveFetch(
      `drive/v3/files/${encodeURIComponent(file.drive_id)}?alt=media`,
      { headers: driveHeaders },
    );

    const filename = encodeURIComponent(file.name).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16)}`,
    );

    let streamMime = mime;
    if (inline && (streamMime === "video/quicktime" || file.name.toLowerCase().endsWith(".mov"))) {
      streamMime = "video/mp4";
    }

    const headers = new Headers();
    headers.set("Content-Type", inline ? streamMime : "application/octet-stream");
    headers.set(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
    );
    headers.set("Cache-Control", "private, no-store");
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Content-Type-Options", "nosniff");

    if (response.headers.get("content-range")) {
      headers.set("Content-Range", response.headers.get("content-range")!);
    }
    if (response.headers.get("content-length")) {
      headers.set("Content-Length", response.headers.get("content-length")!);
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    if (user.role !== "ADMIN" && user.email.toLowerCase() !== ownerEmail()) {
      throw new Error("Access denied: Only administrators can remove media items.");
    }
    const { id } = await context.params;
    const db = await driveDb();
    const file = (
      await db.query("SELECT * FROM jns_media_files WHERE id::text=$1", [id])
    ).rows[0];
    if (!file) return new Response("Not found", { status: 404 });

    // Attempt deletion from Google Drive
    if (file.drive_id) {
      try {
        await driveFetch(`drive/v3/files/${encodeURIComponent(file.drive_id)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.warn("Could not delete file from Google Drive (may already be deleted):", err);
      }
    }

    // Delete record from PostgreSQL
    await db.query("DELETE FROM jns_media_files WHERE id::text=$1", [id]);
    return NextResponse.json({ success: true, id });
  } catch (e) {
    return failure(e);
  }
}
