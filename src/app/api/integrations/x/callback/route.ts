import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { encrypt } from "@/lib/crypto";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const storedState = req.cookies.get("x_state")?.value;
  const codeVerifier = req.cookies.get("x_code_verifier")?.value;

  if (!code || !returnedState || !storedState || !codeVerifier) {
    return NextResponse.json({ error: "Missing OAuth params" }, { status: 400 });
  }

  if (returnedState !== storedState) {
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }

  let serviceId: string;
  try {
    const stateData = JSON.parse(storedState) as { serviceId: string };
    serviceId = stateData.serviceId;
  } catch {
    return NextResponse.json({ error: "Invalid state" }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL!;
  const client = new TwitterApi({
    clientId: process.env.X_CLIENT_ID!,
    clientSecret: process.env.X_CLIENT_SECRET!,
  });

  const {
    client: loggedClient,
    accessToken,
    refreshToken,
  } = await client.loginWithOAuth2({
    code,
    codeVerifier,
    redirectUri: `${baseUrl}/api/integrations/x/callback`,
  });

  const { data: me } = await loggedClient.v2.me();
  logger.info({ userId: me.id, username: me.username }, "X OAuth completed");

  const credentials = JSON.stringify({ accessToken, refreshToken });
  const { ciphertext, iv, tag } = encrypt(credentials);

  const db = getFirestore();

  const existing = await db
    .collection("channelConnections")
    .where("serviceId", "==", serviceId)
    .where("channel", "==", "x")
    .limit(1)
    .get();

  const connData = {
    serviceId,
    channel: "x" as const,
    encryptedCredentials: ciphertext,
    credentialsIv: iv,
    credentialsTag: tag,
    enabled: true,
    maxPostsPerDay: 3,
    maxPostsPerHour: 2,
    minIntervalMinutes: 120,
    xUserId: me.id,
    xUsername: me.username,
    createdAt: Timestamp.now(),
  };

  if (existing.empty) {
    await db.collection("channelConnections").add(connData);
  } else {
    await existing.docs[0].ref.update({
      encryptedCredentials: ciphertext,
      credentialsIv: iv,
      credentialsTag: tag,
      enabled: true,
      xUserId: me.id,
      xUsername: me.username,
    });
  }

  const response = NextResponse.redirect(`${baseUrl}/settings?x=connected`);
  response.cookies.delete("x_state");
  response.cookies.delete("x_code_verifier");
  return response;
}
