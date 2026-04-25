import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { verifyCloudTasksOidcToken } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { XAdapter } from "@/lib/channels/x/adapter";
import { enqueueTask } from "@/lib/tasks/client";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { ChannelDraft, ChannelConnection } from "@/lib/firestore/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ draftId: z.string() });
const adapter = new XAdapter();

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

  const connSnap = await db
    .collection("channelConnections")
    .where("serviceId", "==", draft.serviceId)
    .where("channel", "==", draft.channel)
    .where("enabled", "==", true)
    .limit(1)
    .get();

  if (connSnap.empty) {
    return NextResponse.json(
      { error: "No active connection for channel" },
      { status: 400 }
    );
  }

  const conn = connSnap.docs[0].data() as ChannelConnection;

  try {
    const result = await adapter.publish(draft, conn);

    const execRef = await db.collection("publishExecutions").add({
      draftId,
      channel: draft.channel,
      externalId: result.externalId,
      externalUrl: result.externalUrl,
      publishedAt: Timestamp.now(),
      errorMessage: null,
      serviceId: draft.serviceId,
    });

    await draftDoc.ref.update({
      status: "PUBLISHED",
      decidedAt: Timestamp.now(),
    });

    const now = Date.now();
    await Promise.all([
      enqueueTask({
        queue: "outcome-measurement",
        payload: { publishId: execRef.id },
        scheduleAt: new Date(now + 60 * 60 * 1000),
      }),
      enqueueTask({
        queue: "outcome-measurement",
        payload: { publishId: execRef.id },
        scheduleAt: new Date(now + 24 * 60 * 60 * 1000),
      }),
      enqueueTask({
        queue: "outcome-measurement",
        payload: { publishId: execRef.id },
        scheduleAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
      }),
    ]);

    logger.info({ draftId, externalId: result.externalId }, "Draft published");
    return NextResponse.json({ executionId: execRef.id, url: result.externalUrl });
  } catch (err) {
    logger.error({ err, draftId }, "Publish failed");
    await draftDoc.ref.update({ status: "FAILED" });
    await db.collection("publishExecutions").add({
      draftId,
      channel: draft.channel,
      externalId: "",
      externalUrl: "",
      publishedAt: Timestamp.now(),
      errorMessage: String(err),
      serviceId: draft.serviceId,
    });
    return NextResponse.json({ error: "Publish failed" }, { status: 500 });
  }
}
