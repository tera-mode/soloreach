import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { Timestamp } from "@google-cloud/firestore";
import { verifyCloudTasksOidcToken } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { generateText } from "@/lib/gemini";
import { enqueueTask } from "@/lib/tasks/client";
import { buildContentBasePrompt } from "@/prompts/generate-content-base";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  sourceUrl: z.string().url(),
  title: z.string(),
  serviceId: z.string(),
  publishedAt: z.string().nullable().optional(),
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

  const { sourceUrl, title, serviceId, publishedAt } = parsed.data;
  const db = getFirestore();

  const existing = await db
    .collection("contentBases")
    .where("sourceUrl", "==", sourceUrl)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ skipped: true });
  }

  let rawContent = "";
  try {
    const html = await fetch(sourceUrl).then((r) => r.text());
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer, aside").remove();
    rawContent = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000);
  } catch (err) {
    logger.warn({ err, sourceUrl }, "Failed to fetch article content");
    rawContent = title;
  }

  const prompt = buildContentBasePrompt(rawContent, title);
  const rawJson = await generateText(prompt, {
    type: "flash",
    contextType: "content-base",
    contextId: sourceUrl,
  });

  let summary = "";
  let keyPoints: string[] = [];
  try {
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        summary: string;
        keyPoints: string[];
      };
      summary = parsed.summary;
      keyPoints = parsed.keyPoints;
    }
  } catch {
    summary = rawContent.slice(0, 150);
    keyPoints = [];
  }

  const ref = await db.collection("contentBases").add({
    serviceId,
    sourceUrl,
    title,
    rawContent,
    summary,
    keyPoints,
    publishedAt: publishedAt ? Timestamp.fromDate(new Date(publishedAt)) : null,
    ingestedAt: Timestamp.now(),
  });

  await enqueueTask({
    queue: "draft-batch-generation",
    payload: { contentBaseId: ref.id, serviceId },
  });

  logger.info({ contentBaseId: ref.id, serviceId }, "ContentBase created");

  return NextResponse.json({ contentBaseId: ref.id });
}
