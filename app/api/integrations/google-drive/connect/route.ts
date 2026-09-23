import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  sameOrigin,
  seal,
  secret,
  callbackUrl,
  DRIVE_SCOPE,
  STATE_COOKIE,
  failure,
} from "@/lib/google-drive";
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req);
    const user = await requireUser(req, true);
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      redirect_uri: callbackUrl(),
      response_type: "code",
      scope: `openid email ${DRIVE_SCOPE}`,
      access_type: "offline",
      prompt: "consent",
      state,
      login_hint: user.email,
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    }).toString();
    const res = NextResponse.json(
      { url: url.toString() },
      { headers: { "Cache-Control": "no-store" } },
    );
    res.cookies.set(
      STATE_COOKIE,
      seal(
        JSON.stringify({
          state,
          verifier,
          userId: user.id,
          expires: Date.now() + 600000,
        }),
        secret(),
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/integrations/google-drive",
        maxAge: 600,
      },
    );
    return res;
  } catch (e) {
    return failure(e);
  }
}
