import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { verifyCloudTasksOidcToken } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { XAdapter } from "@/lib/channels/x/adapter";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { PublishExecution, ChannelConnection } from "@/lib/firestore/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ publishId: z.string() });
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

  const { publishId } = parsed.data;
  const db = getFirestore();

  const execDoc = await db.collection("publishExecutions").doc(publishId).get();
  if (!execDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const execution = execDoc.data() as PublishExecution;

  const connSnap = await db
    .collection("channelConnections")
    .where("serviceId", "==", execution.serviceId)
    .where("channel", "==", execution.channel)
    .limit(1)
    .get();

  if (connSnap.empty) {
    return NextResponse.json({ error: "No connection" }, { status: 400 });
  }

  const conn = connSnap.docs[0].data() as ChannelConnection;

  try {
    const outcome = await adapter.measureOutcome(execution, conn);

    await db.collection("outcomeSnapshots").add({
      publishId,
      measuredAt: Timestamp.now(),
      impressions: outcome.impressions,
      engagements: outcome.engagements,
      clicks: outcome.clicks,
      raw: outcome.raw,
    });

    logger.info({ publishId, outcome }, "Outcome measured");
    return NextResponse.json({ outcome });
  } catch (err) {
    logger.warn({ err, publishId }, "Failed to measure outcome");
    return NextResponse.json({ error: "Measurement failed" }, { status: 500 });
  }
}
