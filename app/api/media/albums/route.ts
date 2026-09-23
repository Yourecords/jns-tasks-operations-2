import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, sameOrigin, driveDb, failure } from "@/lib/google-drive";
export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const db = await driveDb();
    return NextResponse.json(
      {
        albums: (
          await db.query(
            "SELECT id,name,created_at FROM jns_media_albums ORDER BY created_at DESC",
          )
        ).rows,
      },
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
