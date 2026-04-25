import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "@google-cloud/firestore";
import { v4 as uuid } from "uuid";
import { verifyCloudTasksOidcToken } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { generateText } from "@/lib/gemini";
import { buildDraftBatchPrompt } from "@/prompts/generate-draft-batch";
import { calculateReachScore } from "@/lib/reach/scoring";
import { detectRiskFlags } from "@/lib/reach/filters";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type {
  ContentBase, Service, KnowledgeEntry, DraftCandidate,
} from "@/lib/firestore/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  contentBaseId: z.string(),
  serviceId: z.string(),
});

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
    db.collection("knowledgeEntries")
      .where("serviceId", "==", serviceId)
      .where("channel", "==", "x")
      .orderBy("createdAt", "desc")
      .limit(5)
      .get(),
    db.collection("channelDrafts")
      .where("serviceId", "==", serviceId)
      .where("channel", "==", "x")
      .orderBy("createdAt", "desc")
      .limit(30)
      .get(),
  ]);

  const knowledge = knowledgeSnap.docs.map((d) => d.data() as KnowledgeEntry);
  const recentHooks = recentDraftsSnap.docs
    .map((d) => {
      const hook = d.data().hook as string | undefined;
      const content = d.data().content as string | undefined;
      return hook ?? content?.slice(0, 15) ?? "";
    })
    .filter(Boolean);

  const prompt = buildDraftBatchPrompt(base, service, knowledge, recentHooks);

  const rawJson = await generateText(prompt, {
    type: "pro",
    contextType: "draft-batch",
    contextId: contentBaseId,
  });

  let candidates: DraftCandidate[] = [];
  try {
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { drafts: DraftCandidate[] };
      candidates = parsed.drafts.slice(0, 21);
    }
  } catch (e) {
    logger.warn({ err: e }, "Failed to parse draft batch JSON");
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }

  const batchId = uuid();
  const now = Timestamp.now();

  const draftRefs = await Promise.all(
    candidates.map((c) => {
      const score = c.estimatedReachScore ?? calculateReachScore(c);
      const riskFilters = service.riskFilters ?? {
        forbiddenWords: [],
        requirePrimarySource: false,
      };
      const riskFlags = detectRiskFlags(
        c.body,
        c.angle,
        c.selfReplyText,
        riskFilters
      );
      const status = riskFlags.length > 0 ? "BLOCKED" : "PENDING_REVIEW";

      return db.collection("channelDrafts").add({
        contentBaseId,
        serviceId,
        channel: "x",
        batchId,
        angle: c.angle,
        tone: c.tone,
        format: c.format,
        hook: c.hook,
        body: c.body,
        bodyShort: c.bodyShort ?? null,
        selfReplyText: c.selfReplyText ?? null,
        longFormContent: c.longFormContent ?? null,
        threadParts: c.threadParts ?? null,
        creativeAssetId: null,
        hashtags: c.hashtags,
        estimatedReachScore: score,
        riskFlags,
        status,
        slackMessageTs: null,
        scheduledAt: null,
        freshnessExpiresAt: c.angle === "NEWS"
          ? Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000))
          : null,
        createdAt: now,
        decidedAt: null,
      });
    })
  );

  logger.info(
    { contentBaseId, batchId, draftCount: draftRefs.length, serviceId },
    "Draft batch generated"
  );

  return NextResponse.json({
    batchId,
    draftIds: draftRefs.map((r) => r.id),
    count: draftRefs.length,
  });
}
