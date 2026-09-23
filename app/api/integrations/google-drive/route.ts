import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  connection,
  ownerEmail,
  uploadLimit,
  failure,
} from "@/lib/google-drive";
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req, true).catch(() => null);
    await requireUser(req);
    const row = await connection();
    return NextResponse.json(
      {
        connected: !!row,
        ready:
          !!row?.folder_id &&
          row.folder_id === process.env.GOOGLE_DRIVE_FOLDER_ID &&
          row.email === ownerEmail(),
        canConfigure: !!user,
        ownerEmail: ownerEmail(),
        maxBytes: uploadLimit(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
