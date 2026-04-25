import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { verifyCloudTasksOidcToken } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { sendDraftNotification } from "@/lib/slack";
import { XAdapter } from "@/lib/channels/x/adapter";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { ContentBase, Service, KnowledgeEntry, ChannelDraft } from "@/lib/firestore/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  contentBaseId: z.string(),
  serviceId: z.string(),
});

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

  const { contentBaseId, serviceId } = parsed.data;
  const db = getFirestore();

  const [baseDoc, serviceDoc] = await Promise.all([
    db.collection("contentBases").doc(contentBaseId).get(),
    db.collection("services").doc(serviceId).get(),
  ]);

  if (!baseDoc.exists || !serviceDoc.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const base = baseDoc.data() as ContentBase;
  const service = serviceDoc.data() as Service;

  const [knowledgeSnap, recentDraftsSnap] = await Promise.all([
    db
      .collection("knowledgeEntries")
      .where("serviceId", "==", serviceId)
      .where("channel", "==", "x")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get(),
    db
      .collection("channelDrafts")
      .where("serviceId", "==", serviceId)
      .where("channel", "==", "x")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get(),
  ]);

  const knowledge = knowledgeSnap.docs.map(
    (d) => d.data() as KnowledgeEntry
  );

  const recentPrefixes = recentDraftsSnap.docs
    .map((d) => {
      const content = d.data().content as string;
      return content.split(/[\n。]/)[0].slice(0, 30);
    })
    .filter(Boolean);

  const candidates = await adapter.generateDrafts(
    base,
    service,
    knowledge,
    recentPrefixes
  );

  const now = Timestamp.now();
  const batchId = contentBaseId;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = candidates as any[];

  const draftRefs = await Promise.all(
    raw.map((c) =>
      db.collection("channelDrafts").add({
        contentBaseId,
        serviceId,
        channel: "x",
        batchId,
        angle: c.angle ?? "DATA",
        tone: c.tone ?? "friendly",
        format: c.format ?? "TEXT",
        hook: c.hook ?? (c.content ?? "").slice(0, 15),
        body: c.body ?? c.content ?? "",
        bodyShort: c.bodyShort ?? null,
        selfReplyText: c.selfReplyText ?? null,
        hashtags: c.hashtags ?? [],
        estimatedReachScore: c.estimatedReachScore ?? 50,
        riskFlags: [],
        status: "PENDING_REVIEW",
        slackMessageTs: null,
        scheduledAt: null,
        freshnessExpiresAt: null,
        createdAt: now,
        decidedAt: null,
      })
    )
  );

  const draftsWithIds = raw.map((c, i) => ({
    ...c,
    id: draftRefs[i].id,
    contentBaseId,
    serviceId,
    channel: "x" as const,
    batchId,
    tone: (c.tone ?? "friendly") as "formal" | "friendly" | "playful",
    format: (c.format ?? "TEXT") as "TEXT" | "IMAGE" | "VIDEO" | "POLL" | "THREAD" | "LONGFORM",
    hook: c.hook ?? "",
    body: c.body ?? c.content ?? "",
    riskFlags: [] as string[],
    estimatedReachScore: c.estimatedReachScore ?? 50,
    status: "PENDING_REVIEW" as const,
    slackMessageTs: null,
    scheduledAt: null,
    freshnessExpiresAt: null,
    createdAt: now,
    decidedAt: null,
  }));

  let slackTs: string | undefined;
  try {
    slackTs = await sendDraftNotification(
      draftsWithIds,
      base.title,
      base.sourceUrl ?? ""
    );

    if (slackTs) {
      await Promise.all(
        draftRefs.map((ref) => ref.update({ slackMessageTs: slackTs }))
      );
    }
  } catch (err) {
    logger.warn({ err }, "Failed to send Slack notification");
  }

  logger.info(
    { contentBaseId, draftCount: candidates.length, slackTs },
    "Drafts generated"
  );

  return NextResponse.json({ draftIds: draftRefs.map((r) => r.id) });
}
