import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  accessToken,
  failure,
} from "@/lib/google-drive";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    await requireUser(req, true);
    const apiKey = process.env.GOOGLE_PICKER_API_KEY;
    const appId =
      process.env.GOOGLE_CLOUD_PROJECT_NUMBER ||
      process.env.GOOGLE_CLIENT_ID?.split("-")[0];
    if (!apiKey || !appId) throw new Error("Invalid Picker configuration.");
    return NextResponse.json(
      { apiKey, appId, accessToken: await accessToken() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
