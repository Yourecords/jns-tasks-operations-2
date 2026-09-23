import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, sameOrigin, driveDb, driveFetch, ownerEmail, failure } from "@/lib/google-drive";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const db = await driveDb();
    const isAdmin = user.role === "ADMIN" || user.email.toLowerCase() === ownerEmail();

    // Check if client is requesting/ensuring the dedicated 'graphics media' album
    if (req.nextUrl.searchParams.get("graphicsMedia") === "1") {
      let album = (
        await db.query(
          "SELECT id,name,created_at FROM jns_media_albums WHERE LOWER(name)='graphics media' LIMIT 1",
        )
      ).rows[0];
      if (!album) {
        const id = randomUUID();
        await db.query(
          "INSERT INTO jns_media_albums(id,name,created_by) VALUES($1,$2,$3)",
          [id, "graphics media", user.id],
        );
        album = { id, name: "graphics media", created_at: new Date().toISOString() };
      }
      return NextResponse.json({ album }, { headers: { "Cache-Control": "no-store" } });
    }

    // Regular album shelf: 'graphics media' is strictly visible ONLY to Admin
    let sql = "SELECT id,name,created_at FROM jns_media_albums";
    if (!isAdmin) {
      sql += " WHERE LOWER(name) != 'graphics media'";
    }
    sql += " ORDER BY created_at DESC";

    const rows = (await db.query(sql)).rows;
    return NextResponse.json(
      { albums: rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    if (user.role === "TEAM_MEMBER") throw new Error("Access denied.");
    const { name } = await req.json();
    if (typeof name !== "string" || !name.trim() || name.length > 150)
      throw new Error("Invalid album name.");
    const db = await driveDb();
    const id = randomUUID();
    await db.query(
      "INSERT INTO jns_media_albums(id,name,created_by) VALUES($1,$2,$3)",
      [id, name.trim(), user.id],
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    if (user.role !== "ADMIN" && user.email.toLowerCase() !== ownerEmail()) {
      throw new Error("Access denied: Only administrators can remove albums.");
    }
    const { id } = await req.json();
    if (!id || typeof id !== "string") {
      throw new Error("Invalid album ID.");
    }
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

    // Delete files and album from database
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

export async function PATCH(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    if (user.role === "TEAM_MEMBER" && user.email.toLowerCase() !== ownerEmail()) {
      throw new Error("Access denied: Team members cannot rename albums.");
    }
    const { id, name } = await req.json();
    if (!id || typeof id !== "string") {
      throw new Error("Invalid album ID.");
    }
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

