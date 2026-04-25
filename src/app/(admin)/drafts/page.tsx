import { getFirestore } from "@/lib/firestore/client";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { DraftsClient } from "./DraftsClient";
import type { ChannelDraft } from "@/lib/firestore/schemas";

async function fetchDrafts(): Promise<(ChannelDraft & { id: string })[]> {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("channelDrafts")
      .where("status", "in", ["PENDING_REVIEW", "STOCKED", "BLOCKED"])
      .orderBy("estimatedReachScore", "desc")
      .limit(50)
      .get();

    return snap.docs.map((d) => ({ ...(d.data() as ChannelDraft), id: d.id }));
  } catch {
    return [];
  }
}

const ANGLE_LABELS: Record<string, string> = {
  DATA: "📊 数字", EMOTION: "💙 感情", STORY: "📖 体験",
  HOWTO: "🔧 手順", QUESTION: "❓ 問い", PARADOX: "⚡ 逆説", NEWS: "📰 速報",
};

const TONE_LABELS: Record<string, string> = {
  formal: "丁寧", friendly: "親しみ", playful: "軽め",
};

export default async function DraftsPage() {
  const drafts = await fetchDrafts();

  const stockedCount = drafts.filter((d) => d.status === "STOCKED").length;
  const pendingCount = drafts.filter((d) => d.status === "PENDING_REVIEW").length;
  const blockedCount = drafts.filter((d) => d.status === "BLOCKED").length;

  return (
    <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ストック残量ヘッダー */}
      <div
        className="glass"
        style={{
          borderRadius: "var(--r-xl)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>
            ストック（承認済み）
          </span>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 600, color: "var(--sage)", margin: 0 }}>
            {stockedCount}
          </p>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.3)" }} />
        <div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>承認待ち</span>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 600, color: "var(--terracotta)", margin: 0 }}>
            {pendingCount}
          </p>
        </div>
        <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.3)" }} />
        <div>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>要確認</span>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 28, fontWeight: 600, color: "var(--ochre)", margin: 0 }}>
            {blockedCount}
          </p>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>
          リーチスコア高い順に表示
        </div>
      </div>

      {/* ドラフトリスト */}
      <GlassPanel title="Drafts" sub={`${drafts.length}本`}>
        {drafts.length === 0 ? (
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-muted)", textAlign: "center", padding: "32px 0", margin: 0 }}>
            ドラフトがありません。Sources にネタを追加してください。
          </p>
        ) : (
          <DraftsClient
            drafts={drafts.map((d) => ({
              id: d.id,
              angle: d.angle ?? "DATA",
              angleLabel: ANGLE_LABELS[d.angle ?? "DATA"] ?? d.angle,
              tone: d.tone ?? "friendly",
              toneLabel: TONE_LABELS[d.tone ?? "friendly"] ?? d.tone,
              hook: d.hook ?? d.content?.slice(0, 15) ?? "",
              body: d.body ?? d.content ?? "",
              bodyShort: d.bodyShort ?? null,
              selfReplyText: d.selfReplyText ?? null,
              hashtags: d.hashtags ?? [],
              estimatedReachScore: d.estimatedReachScore ?? 50,
              status: d.status,
              riskFlags: d.riskFlags ?? [],
            }))}
          />
        )}
      </GlassPanel>
    </div>
  );
}
