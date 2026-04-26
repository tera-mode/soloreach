import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { enqueueTask } from "@/lib/tasks/client";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  scheduledAt: z.string().datetime(),
  hook: z.string().max(20).optional(),
  body: z.string().max(280).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params;

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { scheduledAt, hook, body } = parsed.data;
  const scheduleDate = new Date(scheduledAt);

  if (scheduleDate.getTime() <= Date.now() + 60_000) {
    return NextResponse.json(
      { error: "scheduledAt must be at least 1 minute in the future" },
      { status: 400 }
    );
  }

  const db = getFirestore();
  const draftDoc = await db.collection("channelDrafts").doc(draftId).get();
  if (!draftDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    status: "SCHEDULED",
    scheduledAt: Timestamp.fromDate(scheduleDate),
    decidedAt: Timestamp.now(),
  };
  if (hook) update.hook = hook;
  if (body) update.body = body;

  await draftDoc.ref.update(update);
  await enqueueTask({
    queue: "draft-publish",
    payload: { draftId },
    scheduleAt: scheduleDate,
  });

  return NextResponse.json({ ok: true, scheduledAt });
}
