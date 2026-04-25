import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";
import { Timestamp } from "@google-cloud/firestore";
import { verifyCronSecret } from "@/lib/auth/oidc";
import { getFirestore } from "@/lib/firestore/client";
import { enqueueTask } from "@/lib/tasks/client";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const parser = new Parser({
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; SoloReach/1.0; +https://soloreach.life)",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
  },
});

export async function POST(req: NextRequest) {
  try {
    verifyCronSecret(req.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getFirestore();

  const sourcesSnap = await db
    .collection("contentSources")
    .where("enabled", "==", true)
    .get();

  logger.info({ count: sourcesSnap.size }, "Polling content sources");

  let enqueued = 0;

  for (const sourceDoc of sourcesSnap.docs) {
    const source = sourceDoc.data();

    try {
      const feed = await parser.parseURL(source.url as string);

      for (const item of feed.items.slice(0, 5)) {
        if (!item.link) continue;

        const existing = await db
          .collection("contentBases")
          .where("sourceUrl", "==", item.link)
          .limit(1)
          .get();

        if (!existing.empty) continue;

        await enqueueTask({
          queue: "content-base-generation",
          payload: {
            sourceUrl: item.link,
            title: item.title ?? "",
            serviceId: source.serviceId as string,
            publishedAt: item.pubDate ?? null,
          },
        });
        enqueued++;
      }

      await sourceDoc.ref.update({ lastPolledAt: Timestamp.now() });
    } catch (err) {
      logger.warn({ err, sourceId: sourceDoc.id }, "Failed to poll source");
    }
  }

  return NextResponse.json({ enqueued });
}
