import { getFirestore } from "@/lib/firestore/client";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { DraftsClient } from "./DraftsClient";
import type { ChannelDraft } from "@/lib/firestore/schemas";

async function fetchDrafts(): Promise<(ChannelDraft & { id: string })[]> {
  try {
    const db = getFirestore();
    // インデックス不要: createdAt だけでソート → クライアント側でスコア順に並べ直す
    const snap = await db
      .collection("channelDrafts")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return snap.docs
      .map((d) => ({ ...(d.data() as ChannelDraft), id: d.id }))
      .filter((d) =>
        ["PENDING_REVIEW", "STOCKED", "BLOCKED"].includes(d.status)
      )
      .sort((a, b) => (b.estimatedReachScore ?? 50) - (a.estimatedReachScore ?? 50))
      .slice(0, 60);
  } catch (e) {
    console.error("Drafts fetch error:", e);
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
        {[
          { label: "承認済みストック", value: stockedCount, color: "var(--sage)" },
          { label: "承認待ち", value: pendingCount, color: "var(--terracotta)" },
          { label: "要確認 (BLOCKED)", value: blockedCount, color: "var(--ochre)" },
        ].map((item, i) => (
          <>
            {i > 0 && (
              <div key={`sep-${i}`} style={{ width: 1, height: 36, background: "rgba(255,255,255,0.4)" }} />
            )}
            <div key={item.label}>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-muted)" }}>
                {item.label}
              </p>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700, color: item.color }}>
                {item.value}
              </p>
            </div>
          </>
        ))}
        <p style={{ marginLeft: "auto", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", margin: "0 0 0 auto" }}>
          リーチスコア高い順
        </p>
      </div>

      {/* ドラフトリスト */}
      <GlassPanel title="Drafts" sub={`${drafts.length}本`}>
        {drafts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "var(--text-soft)", margin: "0 0 8px" }}>
              ドラフトがありません
            </p>
            <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
              <a href="/sources" style={{ color: "var(--terracotta)", textDecoration: "none" }}>Sources</a> でURLやテキストを入力してドラフトを生成してください
            </p>
          </div>
        ) : (
          <DraftsClient
            drafts={drafts.map((d) => ({
              id: d.id,
              batchId: d.batchId ?? d.contentBaseId,
              angle: d.angle ?? "DATA",
              angleLabel: ANGLE_LABELS[d.angle ?? "DATA"] ?? d.angle,
              tone: d.tone ?? "friendly",
              toneLabel: TONE_LABELS[d.tone ?? "friendly"] ?? d.tone,
              hook: d.hook ?? (d.content ?? d.body ?? "").slice(0, 15),
              body: d.body ?? d.content ?? "",
              bodyShort: d.bodyShort ?? null,
              selfReplyText: d.selfReplyText ?? null,
              hashtags: d.hashtags ?? [],
              estimatedReachScore: d.estimatedReachScore ?? 50,
              status: d.status,
              riskFlags: d.riskFlags ?? [],
              createdAt: d.createdAt?.toMillis() ?? 0,
            }))}
          />
        )}
      </GlassPanel>
    </div>
  );
}
