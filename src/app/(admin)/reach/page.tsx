import { FieldPath } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { getServiceIdsForCurrentUser } from "@/lib/auth/server-session";
import type { ChannelDraft, PublishExecution } from "@/lib/firestore/schemas";
import { ReachClient } from "./ReachClient";

const ANGLE_LABELS: Record<string, string> = {
  DATA: "📊 数字", EMOTION: "💙 感情", STORY: "📖 体験",
  HOWTO: "🔧 手順", QUESTION: "❓ 問い", PARADOX: "⚡ 逆説", NEWS: "📰 速報",
};

async function fetchReachDrafts() {
  try {
    const db = getFirestore();
    const serviceIds = await getServiceIdsForCurrentUser(db);
    if (serviceIds.length === 0) return [];

    const snap = await db
      .collection("channelDrafts")
      .where("serviceId", "in", serviceIds)
      .where("status", "in", ["STOCKED", "SCHEDULED"])
      .limit(100)
      .get();
    return snap.docs
      .map((d) => ({ ...(d.data() as ChannelDraft), id: d.id }))
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  } catch (e) {
    console.error("Reach drafts fetch error:", e);
    return [];
  }
}

async function fetchHistory() {
  try {
    const db = getFirestore();
    const serviceIds = await getServiceIdsForCurrentUser(db);
    if (serviceIds.length === 0) return [];

    // 直近 30 件の配信実績を取得
    const execsSnap = await db
      .collection("publishExecutions")
      .where("serviceId", "in", serviceIds)
      .limit(30)
      .get();
    if (execsSnap.empty) return [];

    const execs = execsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as PublishExecution),
    }));

    // 対応ドラフトを一括取得
    const draftIds = [...new Set(execs.map((e) => e.draftId))];
    const draftsSnap = await db
      .collection("channelDrafts")
      .where(FieldPath.documentId(), "in", draftIds)
      .get();
    const draftsMap = Object.fromEntries(
      draftsSnap.docs.map((d) => [d.id, d.data() as ChannelDraft])
    );

    return execs
      .map((exec) => {
        const draft = draftsMap[exec.draftId];
        return {
          id: exec.id,
          draftId: exec.draftId,
          channel: exec.channel ?? "x",
          externalUrl: exec.externalUrl ?? null,
          publishedAt: exec.publishedAt?.toMillis() ?? 0,
          angle: draft?.angle ?? "DATA",
          angleLabel: ANGLE_LABELS[draft?.angle ?? "DATA"] ?? "",
          hook: draft?.hook ?? (draft?.body ?? "").slice(0, 15),
          body: draft?.body ?? (draft as unknown as Record<string, string>)?.content ?? "",
          estimatedReachScore: draft?.estimatedReachScore ?? 50,
        };
      })
      .sort((a, b) => b.publishedAt - a.publishedAt);
  } catch (e) {
    console.error("History fetch error:", e);
    return [];
  }
}

export default async function ReachPage() {
  const [allDrafts, history] = await Promise.all([fetchReachDrafts(), fetchHistory()]);

  const stocked = allDrafts
    .filter((d) => d.status === "STOCKED")
    .map((d) => ({
      id: d.id,
      channel: d.channel ?? "x",
      angle: d.angle ?? "DATA",
      angleLabel: ANGLE_LABELS[d.angle ?? "DATA"] ?? d.angle ?? "",
      tone: d.tone ?? "friendly",
      hook: d.hook ?? (d.body ?? "").slice(0, 15),
      body: d.body ?? (d as unknown as Record<string, string>).content ?? "",
      selfReplyText: d.selfReplyText ?? null,
      hashtags: d.hashtags ?? [],
      estimatedReachScore: d.estimatedReachScore ?? 50,
      riskFlags: d.riskFlags ?? [],
      createdAt: d.createdAt?.toMillis() ?? 0,
    }));

  const scheduled = allDrafts
    .filter((d) => d.status === "SCHEDULED")
    .map((d) => ({
      id: d.id,
      channel: d.channel ?? "x",
      angle: d.angle ?? "DATA",
      angleLabel: ANGLE_LABELS[d.angle ?? "DATA"] ?? d.angle ?? "",
      hook: d.hook ?? (d.body ?? "").slice(0, 15),
      body: d.body ?? (d as unknown as Record<string, string>).content ?? "",
      estimatedReachScore: d.estimatedReachScore ?? 50,
      scheduledAt: d.scheduledAt?.toMillis() ?? null,
    }));

  return (
    <div className="page-wrap">
      <ReachClient stockedDrafts={stocked} scheduledDrafts={scheduled} historyItems={history} />
    </div>
  );
}
