"use client";

import { useState, useTransition } from "react";
import { DraftCard } from "@/components/glass/DraftCard";
import type { ChannelDraft } from "@/lib/firestore/schemas";

const ACCENT_COLORS = [
  "var(--terracotta)",
  "var(--sage)",
  "var(--ochre)",
  "var(--navy)",
];

interface DraftGroup {
  articleTitle: string;
  articleUrl: string;
  sourceLabel: string;
  minutesAgo: number;
  drafts: (ChannelDraft & { id: string })[];
}

interface InboxClientProps {
  draftGroups: DraftGroup[];
}

export function InboxClient({ draftGroups }: InboxClientProps) {
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentGroup = draftGroups[0];

  async function handleApprove(draftId: string) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/drafts/${draftId}/publish`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(await res.text());
        setFeedback("✅ 投稿しました！Slack に完了通知を送信済みです。");
        setSelectedDraftId(null);
      } catch (e) {
        setFeedback("❌ 投稿に失敗しました。もう一度お試しください。");
      }
    });
  }

  async function handleSkip(draftId: string) {
    startTransition(async () => {
      await fetch(`/api/drafts/${draftId}`, { method: "DELETE" });
      setSelectedDraftId(null);
    });
  }

  if (!currentGroup) {
    return (
      <div
        className="glass"
        style={{
          borderRadius: "var(--r-2xl)",
          padding: "60px 40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 18,
            color: "var(--text-soft)",
            marginBottom: 8,
          }}
        >
          承認待ちのドラフトはありません
        </p>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-muted)" }}>
          RSS フィードに新着記事が来ると、自動でドラフトが生成されます
        </p>
      </div>
    );
  }

  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--r-2xl)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top highlight line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)",
        }}
      />

      {/* Article header */}
      <div style={{ padding: "22px 26px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "var(--r-pill)",
              background: "var(--terracotta)",
              color: "#fff",
              fontFamily: "var(--font-mono)",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            NEW · {currentGroup.minutesAgo}分前
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--text-muted)",
            }}
          >
            {currentGroup.sourceLabel}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.025em",
              lineHeight: 1.3,
              color: "var(--text)",
              margin: 0,
              flex: 1,
            }}
          >
            {currentGroup.articleTitle}
          </h2>

          <a
            href={currentGroup.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "7px 14px",
              borderRadius: "var(--r-pill)",
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.5)",
              backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-soft)",
              textDecoration: "none",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            記事を開く ↗
          </a>
        </div>
      </div>

      {/* Draft list header */}
      <div
        style={{
          padding: "14px 26px",
          borderTop: "1px solid rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          ドラフト候補
        </span>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: "var(--r-pill)",
            background: "var(--terracotta-glass)",
            color: "var(--terracotta)",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {currentGroup.drafts.length}本
        </span>
      </div>

      {/* Draft cards */}
      <div
        style={{
          padding: "14px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {feedback && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: feedback.startsWith("✅")
                ? "var(--sage)"
                : "var(--terracotta)",
              margin: 0,
              padding: "10px 14px",
              background: feedback.startsWith("✅")
                ? "var(--sage-glass)"
                : "var(--terracotta-glass)",
              borderRadius: "var(--r-md)",
            }}
          >
            {feedback}
          </p>
        )}

        {currentGroup.drafts.map((draft, i) => (
          <DraftCard
            key={draft.id}
            id={draft.id}
            angle={draft.angle ?? "DATA"}
            content={draft.content ?? draft.body ?? ""}
            hashtags={draft.hashtags}
            accent={ACCENT_COLORS[i % ACCENT_COLORS.length]}
            selected={selectedDraftId === draft.id}
            index={i}
            onSelect={setSelectedDraftId}
            onApprove={handleApprove}
            onSkip={handleSkip}
          />
        ))}
      </div>

      {/* Bulk footer */}
      <div
        style={{
          padding: "12px 26px",
          borderTop: "1px solid rgba(255,255,255,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          style={{
            padding: "6px 14px",
            borderRadius: "var(--r-pill)",
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.5)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          全部却下
        </button>
        <button
          style={{
            padding: "6px 14px",
            borderRadius: "var(--r-pill)",
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(255,255,255,0.5)",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          ↻ 全部再生成
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          Slack 送信済み
        </span>
      </div>
    </div>
  );
}
