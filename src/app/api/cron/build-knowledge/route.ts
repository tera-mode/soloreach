import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { enqueueTask } from "@/lib/tasks/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCronSecret(req.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirestore();
  const servicesSnap = await db.collection("services").get();
  let enqueued = 0;

  for (const serviceDoc of servicesSnap.docs) {
    await enqueueTask({
      queue: "knowledge-building",
      payload: { serviceId: serviceDoc.id },
    });
    enqueued++;
    logger.info({ serviceId: serviceDoc.id }, "Enqueued knowledge-building");
  }

  return NextResponse.json({ enqueued });
}
