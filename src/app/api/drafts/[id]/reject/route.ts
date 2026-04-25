import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getFirestore();
  const doc = await db.collection("channelDrafts").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await doc.ref.update({ status: "REJECTED", decidedAt: Timestamp.now() });
  return NextResponse.json({ ok: true });
}
