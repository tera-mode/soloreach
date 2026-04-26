import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { enqueueTask } from "@/lib/tasks/client";
import { z } from "zod";

export const runtime = "nodejs";

const OverridesSchema = z.object({
  hook: z.string().max(20).optional(),
  body: z.string().max(280).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params;

  const overrides = OverridesSchema.safeParse(
    await req.json().catch(() => ({}))
  );

  const db = getFirestore();
  const draftDoc = await db.collection("channelDrafts").doc(draftId).get();
  if (!draftDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const update: Record<string, unknown> = {
    status: "APPROVED",
    decidedAt: Timestamp.now(),
  };
  if (overrides.success) {
    if (overrides.data.hook) update.hook = overrides.data.hook;
    if (overrides.data.body) update.body = overrides.data.body;
  }

  await draftDoc.ref.update(update);
  await enqueueTask({ queue: "draft-publish", payload: { draftId } });

  return NextResponse.json({ ok: true });
}
