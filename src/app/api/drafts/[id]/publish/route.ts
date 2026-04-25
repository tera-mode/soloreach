import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { enqueueTask } from "@/lib/tasks/client";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params;
  const db = getFirestore();

  const draftDoc = await db.collection("channelDrafts").doc(draftId).get();
  if (!draftDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await draftDoc.ref.update({
    status: "APPROVED",
    decidedAt: Timestamp.now(),
  });

  await enqueueTask({
    queue: "draft-publish",
    payload: { draftId },
  });

  return NextResponse.json({ ok: true });
}
