import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firestore/client";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params;

  const db = getFirestore();
  const draftDoc = await db.collection("channelDrafts").doc(draftId).get();
  if (!draftDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await draftDoc.ref.update({
    status: "STOCKED",
    scheduledAt: null,
  });

  return NextResponse.json({ ok: true });
}
