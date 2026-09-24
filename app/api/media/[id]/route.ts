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
    const response = await driveFetch(
      `drive/v3/files/${encodeURIComponent(file.drive_id)}?alt=media`,
    );
    const inline =
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        file.mime,
      ) && req.nextUrl.searchParams.get("download") !== "1";
    const filename = encodeURIComponent(file.name).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16)}`,
    );
    return new Response(response.body, {
      headers: {
        "Content-Type": inline ? file.mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
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
