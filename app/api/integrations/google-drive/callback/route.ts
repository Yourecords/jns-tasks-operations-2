import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  unseal,
  seal,
  secret,
  callbackUrl,
  DRIVE_SCOPE,
  STATE_COOKIE,
  appOrigin,
  ownerEmail,
  driveDb,
} from "@/lib/google-drive";
export async function GET(req: NextRequest) {
  const result = new URL("/media", appOrigin());
  try {
    const user = await requireUser(req, true);
    const state = JSON.parse(
      unseal(req.cookies.get(STATE_COOKIE)?.value || "", secret()),
    );
    if (
      state.state !== req.nextUrl.searchParams.get("state") ||
      state.userId !== user.id ||
      state.expires < Date.now()
    )
      throw new Error("Invalid state");
    const code = req.nextUrl.searchParams.get("code");
    if (!code || req.nextUrl.searchParams.has("error"))
      throw new Error("Consent cancelled");
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        code_verifier: state.verifier,
        redirect_uri: callbackUrl(),
        grant_type: "authorization_code",
      }),
    });
    if (!response.ok) throw new Error("Token exchange failed");
    const token = await response.json();
    if (
      !token.refresh_token ||
      !(token.scope || "").split(" ").includes(DRIVE_SCOPE)
    )
      throw new Error("Missing permissions");
    const identityResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!identityResponse.ok) throw new Error("Identity check failed");
    const identity = await identityResponse.json();
    if (
      !identity.email_verified ||
      identity.email?.toLowerCase() !== ownerEmail()
    )
      throw new Error("Wrong account");
    const db = await driveDb();
    await db.query(
      `INSERT INTO jns_drive_connection(id,token,email) VALUES(1,$1,$2)
      ON CONFLICT(id) DO UPDATE SET token=EXCLUDED.token,email=EXCLUDED.email,folder_id=NULL,updated_at=now()`,
      [seal(token.refresh_token, secret()), ownerEmail()],
    );
    result.searchParams.set("drive", "connected");
  } catch {
    result.searchParams.set("drive", "failed");
  }
  const res = NextResponse.redirect(result);
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/integrations/google-drive",
    maxAge: 0,
  });
  return res;
}
