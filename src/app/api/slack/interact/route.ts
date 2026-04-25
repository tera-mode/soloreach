import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { enqueueTask } from "@/lib/tasks/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

async function verifySlackSignature(req: NextRequest): Promise<string> {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) throw new Error("SLACK_SIGNING_SECRET not set");

  const body = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!timestamp || !signature) throw new Error("Missing Slack headers");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Request too old");

  const sigBase = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret)
    .update(sigBase)
    .digest("hex");
  const expected = `v0=${hmac}`;

  if (
    !timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expected, "utf8")
    )
  ) {
    throw new Error("Invalid signature");
  }

  return body;
}

async function checkRateLimit(
  serviceId: string,
  conn: { maxPostsPerDay: number; maxPostsPerHour: number }
): Promise<{ canPost: boolean; nextSlot?: Date }> {
  const db = getFirestore();
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [hourSnap, daySnap] = await Promise.all([
    db
      .collection("publishExecutions")
      .where("serviceId", "==", serviceId)
      .where("publishedAt", ">=", Timestamp.fromDate(hourAgo))
      .get(),
    db
      .collection("publishExecutions")
      .where("serviceId", "==", serviceId)
      .where("publishedAt", ">=", Timestamp.fromDate(dayAgo))
      .get(),
  ]);

  if (
    hourSnap.size < conn.maxPostsPerHour &&
    daySnap.size < conn.maxPostsPerDay
  ) {
    return { canPost: true };
  }

  const nextSlot = new Date(now.getTime() + 60 * 60 * 1000);
  return { canPost: false, nextSlot };
}

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await verifySlackSignature(req);
  } catch (err) {
    logger.warn({ err }, "Slack signature verification failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(
    decodeURIComponent(body.replace(/^payload=/, ""))
  );

  const actionId = payload.actions?.[0]?.action_id as string;
  const value = payload.actions?.[0]?.value as string;

  if (actionId === "approve_draft") {
    const draftId = value;
    const db = getFirestore();

    const draftDoc = await db.collection("channelDrafts").doc(draftId).get();
    if (!draftDoc.exists) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const draft = draftDoc.data()!;

    const connSnap = await db
      .collection("channelConnections")
      .where("serviceId", "==", draft.serviceId)
      .where("channel", "==", "x")
      .where("enabled", "==", true)
      .limit(1)
      .get();

    if (connSnap.empty) {
      return NextResponse.json(
        { error: "No connection" },
        { status: 400 }
      );
    }

    const conn = connSnap.docs[0].data() as {
      maxPostsPerDay: number;
      maxPostsPerHour: number;
    };

    const { canPost, nextSlot } = await checkRateLimit(
      draft.serviceId as string,
      conn
    );

    await draftDoc.ref.update({
      status: canPost ? "APPROVED" : "QUEUED",
      decidedAt: Timestamp.now(),
    });

    await enqueueTask({
      queue: "draft-publish",
      payload: { draftId },
      scheduleAt: canPost ? undefined : nextSlot,
    });

    return NextResponse.json({ ok: true });
  }

  if (actionId === "skip_draft" || actionId === "reject_all_drafts") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
