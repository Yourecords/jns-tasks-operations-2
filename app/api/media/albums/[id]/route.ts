import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  driveDb,
  driveFetch,
  ownerEmail,
  failure,
} from "@/lib/google-drive";
import { getRealAuthenticatedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    if (user.role !== "ADMIN" && user.email.toLowerCase() !== ownerEmail()) {
      throw new Error("Access denied: Only administrators can remove albums.");
    }
    const { id } = await context.params;
    const db = await driveDb();

    // Query files belonging to this album
    const files = (
      await db.query(
        "SELECT drive_id FROM jns_media_files WHERE kind='album' AND target_id=$1",
        [id],
      )
    ).rows;

    for (const f of files) {
      if (f.drive_id) {
        try {
          await driveFetch(`drive/v3/files/${encodeURIComponent(f.drive_id)}`, {
            method: "DELETE",
          });
        } catch (err) {
          // ignore
        }
      }
    }

    // Delete files and album from PostgreSQL
    await db.query(
      "DELETE FROM jns_media_files WHERE kind='album' AND target_id=$1",
      [id],
    );
    await db.query("DELETE FROM jns_media_albums WHERE id::text=$1", [id]);

    return NextResponse.json({ success: true, id });
  } catch (e) {
    return failure(e);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    if (user.role === "TEAM_MEMBER" && user.email.toLowerCase() !== ownerEmail()) {
      throw new Error("Access denied: Team members cannot rename albums.");
    }
    const { id } = await context.params;
    const body = await req.json();
    const name = body?.name;
    if (typeof name !== "string" || !name.trim() || name.length > 150) {
      throw new Error("Invalid album name.");
    }
    const db = await driveDb();
    const result = await db.query(
      "UPDATE jns_media_albums SET name = $1 WHERE id::text = $2 RETURNING id, name",
      [name.trim(), id],
    );
    if (result.rowCount === 0) {
      throw new Error("Album not found.");
    }
    return NextResponse.json({ success: true, album: result.rows[0] });
  } catch (e) {
    return failure(e);
  }
}
