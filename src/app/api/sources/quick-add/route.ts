import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { Timestamp } from "@google-cloud/firestore";
import { v4 as uuid } from "uuid";
import { getFirestore } from "@/lib/firestore/client";
import { generateText } from "@/lib/gemini";
import { buildContentBasePrompt } from "@/prompts/generate-content-base";
import { buildDraftBatchPrompt } from "@/prompts/generate-draft-batch";
import { calculateReachScore } from "@/lib/reach/scoring";
import { detectRiskFlags } from "@/lib/reach/filters";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { Service, KnowledgeEntry, DraftCandidate } from "@/lib/firestore/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  url: z.string().url().optional(),
  text: z.string().min(1).max(2000).optional(),
  serviceId: z.string().optional(),
}).refine((d) => d.url || d.text, { message: "url or text required" });

async function fetchArticleContent(url: string): Promise<{ title: string; rawContent: string }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; SoloReach/1.0; +https://soloreach.life)",
    },
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, .ad, #ad").remove();

  const title =
    $("h1").first().text().trim() ||
    $("title").text().trim() ||
    url;

  const rawContent = $("article, main, .content, body")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10000);

  return { title, rawContent };
}

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { url, text, serviceId: reqServiceId } = parsed.data;
  const db = getFirestore();

  // サービスを取得（指定なければ最初のもの）
  let serviceId = reqServiceId;
  let service: Service;
  if (serviceId) {
    const doc = await db.collection("services").doc(serviceId).get();
    if (!doc.exists) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    service = doc.data() as Service;
  } else {
    const snap = await db.collection("services").limit(1).get();
    if (snap.empty) return NextResponse.json({ error: "サービスが未登録です。先に Firestore に services ドキュメントを作成してください。" }, { status: 400 });
    serviceId = snap.docs[0].id;
    service = snap.docs[0].data() as Service;
  }

  // コンテンツ取得
  let title = "";
  let rawContent = "";
  let sourceUrl: string | null = null;

  if (url) {
    try {
      const fetched = await fetchArticleContent(url);
      title = fetched.title;
      rawContent = fetched.rawContent;
      sourceUrl = url;
    } catch (err) {
      logger.warn({ err, url }, "Failed to fetch URL, using URL as content");
      title = url;
      rawContent = url;
      sourceUrl = url;
    }
  } else if (text) {
    title = text.slice(0, 60) + (text.length > 60 ? "…" : "");
    rawContent = text;
  }

  // 重複チェック
  if (sourceUrl) {
    const existing = await db.collection("contentBases").where("sourceUrl", "==", sourceUrl).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: "この URL はすでに処理済みです。", alreadyExists: true }, { status: 409 });
    }
  }

  // Gemini Flash で要約
  const summaryPrompt = buildContentBasePrompt(rawContent, title);
  const summaryRaw = await generateText(summaryPrompt, {
    type: "flash",
    contextType: "content-base",
    contextId: sourceUrl ?? title,
  });

  let summary = "";
  let keyPoints: string[] = [];
  try {
    const match = summaryRaw.match(/\{[\s\S]*\}/);
    if (match) {
      const p = JSON.parse(match[0]) as { summary: string; keyPoints: string[] };
      summary = p.summary;
      keyPoints = p.keyPoints;
    }
  } catch {
    summary = rawContent.slice(0, 150);
  }

  const baseRef = await db.collection("contentBases").add({
    serviceId,
    ideaId: "quick-add",
    sourceUrl,
    title,
    rawContent,
    summary,
    keyPoints,
    publishedAt: null,
    ingestedAt: Timestamp.now(),
  });

  // KnowledgeEntries 取得
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
    .map((d) => { const dData = d.data(); return dData.hook ?? (dData.content ?? "").slice(0, 15); })
    .filter(Boolean);

  // Gemini Pro で 21本生成
  const base = { serviceId, ideaId: "quick-add", sourceUrl, title, rawContent, summary, keyPoints, ingestedAt: Timestamp.now() };
  const draftPrompt = buildDraftBatchPrompt(base as Parameters<typeof buildDraftBatchPrompt>[0], service, knowledge, recentHooks);

  const draftRaw = await generateText(draftPrompt, {
    type: "pro",
    contextType: "draft-batch",
    contextId: baseRef.id,
  });

  let candidates: DraftCandidate[] = [];
  try {
    const match = draftRaw.match(/\{[\s\S]*\}/);
    if (match) {
      const p = JSON.parse(match[0]) as { drafts: DraftCandidate[] };
      candidates = p.drafts.slice(0, 21);
    }
  } catch {
    logger.warn("Failed to parse draft batch from quick-add");
  }

  const batchId = uuid();
  const now = Timestamp.now();
  const riskFilters = service.riskFilters ?? { forbiddenWords: [], requirePrimarySource: false };

  // selfReplyText はサーバー側で確実に生成（Gemini に任せない）
  const articleUrl = sourceUrl ?? (service as Record<string, unknown>).ctaUrl as string ?? null;
  const buildSelfReply = (articleUrl: string | null) => {
    if (articleUrl) return `詳しくはこちら ↓\n${articleUrl}`;
    return null;
  };
  const selfReplyText = buildSelfReply(articleUrl);

  await Promise.all(
    candidates.map((c) => {
      const score = c.estimatedReachScore ?? calculateReachScore(c);
      const riskFlags = detectRiskFlags(c.body, c.angle, selfReplyText, riskFilters);
      return db.collection("channelDrafts").add({
        contentBaseId: baseRef.id,
        serviceId,
        channel: "x",
        batchId,
        angle: c.angle,
        tone: c.tone,
        format: c.format,
        hook: c.hook,
        body: c.body,
        bodyShort: c.bodyShort ?? null,
        selfReplyText,
        hashtags: c.hashtags,
        estimatedReachScore: score,
        riskFlags,
        status: riskFlags.length > 0 ? "BLOCKED" : "PENDING_REVIEW",
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

  logger.info({ batchId, draftCount: candidates.length, contentBaseId: baseRef.id }, "Quick-add drafts generated");

  return NextResponse.json({
    ok: true,
    contentBaseId: baseRef.id,
    batchId,
    draftCount: candidates.length,
    title,
    summary,
  });
}
