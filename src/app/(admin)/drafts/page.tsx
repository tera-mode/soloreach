import { getFirestore } from "@/lib/firestore/client";
import { getServiceIdsForCurrentUser } from "@/lib/auth/server-session";
import { DraftsClient } from "./DraftsClient";
import type { ChannelDraft } from "@/lib/firestore/schemas";

async function fetchDrafts() {
  try {
    const db = getFirestore();
    const serviceIds = await getServiceIdsForCurrentUser(db);
    if (serviceIds.length === 0) return [];

    const snap = await db
      .collection("channelDrafts")
      .where("serviceId", "in", serviceIds)
      .limit(150)
      .get();

    return snap.docs
      .map((d) => ({ ...(d.data() as ChannelDraft), id: d.id }))
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  } catch (e) {
    console.error("Drafts fetch error:", e);
    return [];
  }
}

const ANGLE_LABELS: Record<string, string> = {
  DATA: "📊 数字", EMOTION: "💙 感情", STORY: "📖 体験",
  HOWTO: "🔧 手順", QUESTION: "❓ 問い", PARADOX: "⚡ 逆説", NEWS: "📰 速報",
};

export default async function DraftsPage() {
  const allDrafts = await fetchDrafts();

  const active = allDrafts
    .filter((d) => ["PENDING_REVIEW", "STOCKED", "BLOCKED"].includes(d.status))
    .sort((a, b) => (b.estimatedReachScore ?? 50) - (a.estimatedReachScore ?? 50));

  // 配信OKをアクティブから分離してクライアントに渡す

  const history = allDrafts
    .filter((d) => d.status === "REJECTED")
    .slice(0, 40);

  return (
    <div className="page-wrap">
      <DraftsClient
        activeDrafts={active.map((d) => ({
          id: d.id,
          batchId: d.batchId ?? d.contentBaseId,
          angle: d.angle ?? "DATA",
          angleLabel: ANGLE_LABELS[d.angle ?? "DATA"] ?? (d.angle ?? ""),
          tone: d.tone ?? "friendly",
          hook: d.hook ?? (d.content ?? d.body ?? "").slice(0, 15),
          body: d.body ?? d.content ?? "",
          selfReplyText: d.selfReplyText ?? null,
          hashtags: d.hashtags ?? [],
          estimatedReachScore: d.estimatedReachScore ?? 50,
          status: d.status,
          riskFlags: d.riskFlags ?? [],
          createdAt: d.createdAt?.toMillis() ?? 0,
        }))}
        historyDrafts={history.map((d) => ({
          id: d.id,
          hook: d.hook ?? (d.content ?? d.body ?? "").slice(0, 15),
          body: d.body ?? d.content ?? "",
          angle: d.angle ?? "DATA",
          angleLabel: ANGLE_LABELS[d.angle ?? "DATA"] ?? (d.angle ?? ""),
          createdAt: d.createdAt?.toMillis() ?? 0,
        }))}
      />
    </div>
  );
}
