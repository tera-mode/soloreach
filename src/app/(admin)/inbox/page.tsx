import { Timestamp } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { MetricCard } from "@/components/glass/MetricCard";
import { GlassPanel } from "@/components/glass/GlassPanel";
import { PipelineNode } from "@/components/glass/PipelineNode";
import { InboxClient } from "./InboxClient";
import type { ChannelDraft } from "@/lib/firestore/schemas";

interface DraftGroup {
  articleTitle: string;
  articleUrl: string;
  sourceLabel: string;
  minutesAgo: number;
  drafts: (ChannelDraft & { id: string })[];
}

async function fetchInboxData(): Promise<{
  draftGroups: DraftGroup[];
  todayPublished: number;
  pendingCount: number;
}> {
  try {
    const db = getFirestore();
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [pendingSnap, publishedSnap] = await Promise.all([
      db
        .collection("channelDrafts")
        .where("status", "==", "PENDING_REVIEW")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get(),
      db
        .collection("publishExecutions")
        .where("publishedAt", ">=", Timestamp.fromDate(dayStart))
        .get(),
    ]);

    const draftsByBase = new Map<string, (ChannelDraft & { id: string })[]>();

    for (const doc of pendingSnap.docs) {
      const data = doc.data() as ChannelDraft;
      const group = draftsByBase.get(data.contentBaseId) ?? [];
      group.push({ ...data, id: doc.id });
      draftsByBase.set(data.contentBaseId, group);
    }

    const draftGroups: DraftGroup[] = [];
    for (const [baseId, drafts] of Array.from(draftsByBase.entries())) {
      const baseDoc = await db.collection("contentBases").doc(baseId).get();
      if (!baseDoc.exists) continue;
      const base = baseDoc.data()!;
      const createdAt = drafts[0].createdAt;
      const minutesAgo = Math.floor(
        (Date.now() - createdAt.toMillis()) / 60000
      );
      draftGroups.push({
        articleTitle: base.title as string,
        articleUrl: base.sourceUrl as string,
        sourceLabel: new URL(base.sourceUrl as string).hostname,
        minutesAgo,
        drafts,
      });
    }

    return {
      draftGroups,
      todayPublished: publishedSnap.size,
      pendingCount: draftsByBase.size,
    };
  } catch {
    return { draftGroups: [], todayPublished: 0, pendingCount: 0 };
  }
}

export default async function InboxPage() {
  const { draftGroups, todayPublished, pendingCount } =
    await fetchInboxData();

  const pipeline: {
    label: string;
    sub?: string;
    state: "done" | "active" | "pending" | "idle";
  }[] = [
    { label: "RSS 巡回", sub: "15分毎", state: "done" },
    { label: "記事解析", sub: "Gemini Flash", state: "done" },
    { label: "ドラフト生成", sub: "Gemini Pro", state: pendingCount > 0 ? "done" : "idle" },
    { label: "Slack 通知", state: pendingCount > 0 ? "done" : "idle" },
    {
      label: "承認待ち",
      state: pendingCount > 0 ? "active" : "idle",
      sub: pendingCount > 0 ? `${pendingCount}件` : undefined,
    },
    { label: "X 投稿", state: todayPublished > 0 ? "done" : "idle" },
  ];

  return (
    <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <MetricCard
          label="承認待ちドラフト"
          value={String(pendingCount)}
          sub="件"
          accent="var(--terracotta)"
          hot={pendingCount > 0}
        />
        <MetricCard
          label="今日の投稿数"
          value={String(todayPublished)}
          sub={`/ 3`}
          accent="var(--sage)"
          progress={todayPublished / 3}
        />
        <MetricCard
          label="今月の総投稿"
          value="—"
          accent="var(--navy)"
        />
        <MetricCard
          label="X エンゲージメント"
          value="—"
          sub="%"
          accent="var(--ochre)"
        />
      </div>

      {/* Main area */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Draft Inbox */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <InboxClient draftGroups={draftGroups} />
        </div>

        {/* Right Sidebar */}
        <div
          style={{
            width: 360,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Pipeline */}
          <GlassPanel title="Pipeline" sub="リアルタイム" action="管理">
            {pipeline.map((node, i) => (
              <PipelineNode
                key={node.label}
                label={node.label}
                sub={node.sub}
                state={node.state}
                isLast={i === pipeline.length - 1}
              />
            ))}
          </GlassPanel>

          {/* Connections */}
          <GlassPanel title="Connections" action="設定">
            {[
              { icon: "🐦", label: "X (Twitter)", status: "接続中", color: "var(--sage)" },
              { icon: "💬", label: "Slack", status: "接続中", color: "var(--sage)" },
              { icon: "📡", label: "RSS", status: "3件", color: "var(--ochre)" },
            ].map((conn) => (
              <div
                key={conn.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <span style={{ fontSize: 16 }}>{conn.icon}</span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    color: "var(--text-soft)",
                    flex: 1,
                  }}
                >
                  {conn.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 11.5,
                    fontWeight: 500,
                    color: conn.color,
                  }}
                >
                  {conn.status}
                </span>
              </div>
            ))}
          </GlassPanel>

          {/* Learning */}
          <GlassPanel title="Learning" sub="直近4週" action="詳細">
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12.5,
                color: "var(--text-muted)",
                margin: 0,
                textAlign: "center",
                padding: "16px 0",
              }}
            >
              投稿データが蓄積されると<br />パターンが表示されます
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
