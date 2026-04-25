import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { TwitterApi } from "twitter-api-v2";
import { verifyCloudTasksOidcToken } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { decrypt } from "@/lib/crypto";
import { enqueueTask } from "@/lib/tasks/client";
import { isBlocked } from "@/lib/reach/filters";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { ChannelDraft, ChannelConnection } from "@/lib/firestore/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ draftId: z.string() });

async function getTwitterClient(conn: ChannelConnection) {
  const credentials = JSON.parse(
    decrypt(conn.encryptedCredentials, conn.credentialsIv, conn.credentialsTag)
  ) as { accessToken: string; refreshToken: string };

  const oauthClient = new TwitterApi({
    clientId: process.env.X_CLIENT_ID!,
    clientSecret: process.env.X_CLIENT_SECRET!,
  });

  try {
    return new TwitterApi(credentials.accessToken);
  } catch {
    const { accessToken: newToken } = await oauthClient.refreshOAuth2Token(
      credentials.refreshToken
    );
    return new TwitterApi(newToken);
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyCloudTasksOidcToken(req.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { draftId } = parsed.data;
  const db = getFirestore();

  const draftDoc = await db.collection("channelDrafts").doc(draftId).get();
  if (!draftDoc.exists) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const draft = draftDoc.data() as ChannelDraft;

  if (isBlocked(draft.riskFlags ?? [])) {
    return NextResponse.json({ error: "Draft is BLOCKED" }, { status: 400 });
  }

  if (draft.angle === "NEWS" && draft.freshnessExpiresAt) {
    if (draft.freshnessExpiresAt.toMillis() < Date.now()) {
      await draftDoc.ref.update({ status: "STALE" });
      return NextResponse.json({ error: "Draft is STALE" }, { status: 400 });
    }
  }

  const connSnap = await db
    .collection("channelConnections")
    .where("serviceId", "==", draft.serviceId)
    .where("channel", "==", "x")
    .where("enabled", "==", true)
    .limit(1)
    .get();

  if (connSnap.empty) {
    return NextResponse.json({ error: "No active X connection" }, { status: 400 });
  }

  const conn = connSnap.docs[0].data() as ChannelConnection;

  const recentSnap = await db
    .collection("publishExecutions")
    .where("serviceId", "==", draft.serviceId)
    .where("publishedAt", ">=", Timestamp.fromDate(
      new Date(Date.now() - (conn.minIntervalMinutes ?? 120) * 60 * 1000)
    ))
    .limit(1)
    .get();

  if (!recentSnap.empty) {
    const nextSlot = new Date(Date.now() + (conn.minIntervalMinutes ?? 120) * 60 * 1000);
    await enqueueTask({ queue: "draft-publish", payload: { draftId }, scheduleAt: nextSlot });
    await draftDoc.ref.update({ status: "SCHEDULED", scheduledAt: Timestamp.fromDate(nextSlot) });
    return NextResponse.json({ delayed: true, nextSlot });
  }

  try {
    const client = await getTwitterClient(conn);

    const bodyText = draft.body ?? draft.content ?? "";
    const hashtags = (draft.hashtags ?? []).map((h: string) => `#${h}`).join(" ");
    const tweetText = hashtags ? `${bodyText}\n\n${hashtags}` : bodyText;

    const { data: tweet } = await client.v2.tweet(tweetText);
    const externalUrl = `https://x.com/i/web/status/${tweet.id}`;

    let selfReplyExternalId: string | null = null;
    const selfReplyText = draft.selfReplyText;
    if (selfReplyText) {
      try {
        const { data: reply } = await client.v2.reply(selfReplyText, tweet.id);
        selfReplyExternalId = reply.id;
      } catch (err) {
        logger.warn({ err, draftId }, "Self-reply failed");
      }
    }

    const execRef = await db.collection("publishExecutions").add({
      draftId,
      channel: draft.channel,
      externalId: tweet.id,
      externalUrl,
      selfReplyExternalId,
      publishedAt: Timestamp.now(),
      errorMessage: null,
      serviceId: draft.serviceId,
    });

    await draftDoc.ref.update({ status: "PUBLISHED", decidedAt: Timestamp.now() });

    const now = Date.now();
    await Promise.all([
      enqueueTask({ queue: "outcome-measurement", payload: { publishId: execRef.id }, scheduleAt: new Date(now + 60 * 60 * 1000) }),
      enqueueTask({ queue: "outcome-measurement", payload: { publishId: execRef.id }, scheduleAt: new Date(now + 24 * 60 * 60 * 1000) }),
      enqueueTask({ queue: "outcome-measurement", payload: { publishId: execRef.id }, scheduleAt: new Date(now + 7 * 24 * 60 * 60 * 1000) }),
    ]);

    logger.info({ draftId, tweetId: tweet.id, selfReplyId: selfReplyExternalId }, "Published");
    return NextResponse.json({ executionId: execRef.id, url: externalUrl });
  } catch (err) {
    logger.error({ err, draftId }, "Publish failed");
    await draftDoc.ref.update({ status: "FAILED" });
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
