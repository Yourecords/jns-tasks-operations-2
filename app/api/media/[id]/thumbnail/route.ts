import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  checkTarget,
  driveDb,
  failure,
} from "@/lib/google-drive";

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

    if (!file.thumbnail) {
      return new Response("No thumbnail available", { status: 404 });
    }

    if (file.thumbnail.startsWith("data:image/")) {
      const parts = file.thumbnail.split(",");
      const base64 = parts[1];
      const mimeMatch = parts[0].match(/^data:(image\/\w+);/);
      const contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const buffer = Buffer.from(base64, "base64");
      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      });
    }

    return NextResponse.redirect(file.thumbnail);
  } catch (e) {
    return failure(e);
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    const { id } = await context.params;
    const db = await driveDb();
    const file = (
      await db.query("SELECT * FROM jns_media_files WHERE id::text=$1", [id])
    ).rows[0];
    if (!file) return new Response("Not found", { status: 404 });
    await checkTarget(file.kind, file.target_id, user, true);

    const body = await req.json().catch(() => null);
    if (!body || typeof body.thumbnail !== "string") {
      return failure(new Error("Invalid thumbnail payload."));
    }

    const { thumbnail } = body;
    // Basic verification: data URL under 500KB
    if (!thumbnail.startsWith("data:image/") || thumbnail.length > 500_000) {
      return failure(new Error("Invalid thumbnail format or size."));
    }

    await db.query("UPDATE jns_media_files SET thumbnail=$1 WHERE id::text=$2", [
      thumbnail,
      id,
    ]);

    return NextResponse.json({ ok: true, id }, { status: 200 });
  } catch (e) {
    return failure(e);
  }
}
