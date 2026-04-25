import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { z } from "zod";

export const runtime = "nodejs";

const QuerySchema = z.object({
  serviceId: z.string(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({ serviceId: searchParams.get("serviceId") });

  if (!parsed.success) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL;
  if (!baseUrl) return NextResponse.json({ error: "APP_BASE_URL not set" }, { status: 500 });

  const client = new TwitterApi({
    clientId: process.env.X_CLIENT_ID!,
    clientSecret: process.env.X_CLIENT_SECRET!,
  });

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    `${baseUrl}/api/integrations/x/callback`,
    {
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      state: JSON.stringify({ serviceId: parsed.data.serviceId }),
    }
  );

  const response = NextResponse.redirect(url);
  response.cookies.set("x_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });
  response.cookies.set("x_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
  });

  return response;
}
