import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  driveFetch,
  driveDb,
  failure,
} from "@/lib/google-drive";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireUser(req, true);
    const { folderId } = await req.json();
    if (
      typeof folderId !== "string" ||
      folderId !== process.env.GOOGLE_DRIVE_FOLDER_ID
    )
      throw new Error("Select the configured JNS Website Uploads folder.");
    const file = await (
      await driveFetch(
        `drive/v3/files/${encodeURIComponent(folderId)}?fields=id,mimeType,trashed,capabilities(canAddChildren)`,
      )
    ).json();
    if (
      file.trashed ||
      file.mimeType !== "application/vnd.google-apps.folder" ||
      !file.capabilities?.canAddChildren
    )
      throw new Error("Folder cannot receive uploads.");
    const db = await driveDb();
    await db.query(
      "UPDATE jns_drive_connection SET folder_id=$1,updated_at=now() WHERE id=1",
      [folderId],
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return failure(e);
  }
}
