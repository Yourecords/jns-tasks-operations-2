import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  checkTarget,
  driveDb,
  connection,
  driveFetch,
  uploadLimit,
  failure,
} from "@/lib/google-drive";
import { boundedBody, safeName, previewType } from "@/lib/drive-security";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const kind = req.nextUrl.searchParams.get("kind") || "";
    const target = req.nextUrl.searchParams.get("target") || "";
    await checkTarget(kind, target, user);
    const db = await driveDb();
    const files = await db.query(
      "SELECT id,name,mime,bytes,created_at FROM jns_media_files WHERE kind=$1 AND target_id=$2 ORDER BY created_at DESC",
      [kind, target],
    );
    return NextResponse.json(
      { files: files.rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  let driveId: string | undefined;
  try {
    sameOrigin(req);
    const user = await requireUser(req);
    const kind = req.nextUrl.searchParams.get("kind") || "";
    const target = req.nextUrl.searchParams.get("target") || "";
    await checkTarget(kind, target, user, true);
    const row = await connection();
    if (!row?.folder_id || row.folder_id !== process.env.GOOGLE_DRIVE_FOLDER_ID)
      throw new Error(
        "Storage is not connected. Ask the administrator to select the upload folder.",
      );
    const db = await driveDb();
    const recent = await db.query(
      "SELECT count(*)::int AS count FROM jns_media_files WHERE uploaded_by=$1 AND created_at>now()-interval '1 hour'",
      [user.id],
    );
    if (recent.rows[0].count >= 100)
      throw new Error("Too many uploads. Please try again later.");
    const name = safeName(req.nextUrl.searchParams.get("name") || "");
    const bytes = await boundedBody(req, uploadLimit());
    const mime = previewType(bytes);
    const id = randomUUID();
    const boundary = `jns_${randomUUID()}`;
    const meta = {
      name,
      parents: [row.folder_id],
      appProperties: { jnsAttachmentId: id },
    };
    const body = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
      ),
      bytes,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const upload = await (
      await driveFetch("upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: new Uint8Array(body),
      })
    ).json();
    driveId = upload.id;
    if (!driveId) throw new Error("Google Drive did not return a file ID.");
    await db.query(
      "INSERT INTO jns_media_files(id,drive_id,kind,target_id,name,mime,bytes,uploaded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [id, driveId, kind, target, name, mime, bytes.length, user.id],
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    // Compensate if Drive succeeded but metadata persistence failed. Only this new file is touched.
    if (driveId)
      await driveFetch(`drive/v3/files/${encodeURIComponent(driveId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trashed: true }),
      }).catch(() => {});
    return failure(e);
  }
}
