"use client";

import { useState, useTransition } from "react";

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "var(--sage)" :
  score >= 60 ? "var(--ochre)" :
  score >= 40 ? "var(--terracotta)" : "var(--navy)";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_REVIEW: { bg: "var(--terracotta-glass)", color: "var(--terracotta)", label: "承認待ち" },
  STOCKED:        { bg: "var(--sage-glass)",       color: "var(--sage)",       label: "ストック" },
  BLOCKED:        { bg: "var(--ochre-glass)",       color: "var(--ochre)",      label: "要確認" },
};

interface DraftItem {
  id: string;
  angle: string;
  angleLabel: string;
  tone: string;
  toneLabel: string;
  hook: string;
  body: string;
  bodyShort: string | null;
  selfReplyText: string | null;
  hashtags: string[];
  estimatedReachScore: number;
  status: string;
  riskFlags: string[];
}

interface DraftsClientProps {
  drafts: DraftItem[];
}

export function DraftsClient({ drafts: initial }: DraftsClientProps) {
  const [drafts, setDrafts] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function handleApprove(id: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/drafts/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setDrafts((ds) => ds.map((d) => d.id === id ? { ...d, status: "STOCKED" } : d));
        setMessage("✅ ストックに追加しました");
      } else {
        setMessage("❌ エラーが発生しました");
      }
    });
  }

  async function handleReject(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/drafts/${id}/reject`, { method: "POST" });
      if (res.ok) setDrafts((ds) => ds.filter((d) => d.id !== id));
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {message && (
        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 13,
          color: message.startsWith("✅") ? "var(--sage)" : "var(--terracotta)",
          padding: "8px 12px", borderRadius: "var(--r-md)",
          background: message.startsWith("✅") ? "var(--sage-glass)" : "var(--terracotta-glass)",
          margin: 0,
        }}>
          {message}
        </p>
      )}

      {drafts.map((draft) => {
        const isExpanded = expanded === draft.id;
        const scoreColor = SCORE_COLOR(draft.estimatedReachScore);
        const statusStyle = STATUS_STYLES[draft.status] ?? STATUS_STYLES.PENDING_REVIEW;

        return (
          <div
            key={draft.id}
            onClick={() => setExpanded(isExpanded ? null : draft.id)}
            style={{
              borderRadius: "var(--r-lg)",
              padding: "12px 16px",
              cursor: "pointer",
              background: isExpanded ? "var(--glass-bg-strong)" : "var(--glass-bg-subtle)",
              border: isExpanded ? "1px solid rgba(255,255,255,0.70)" : "1px solid rgba(255,255,255,0.35)",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.15s",
            }}
          >
            {/* 左ストライプ */}
            <div style={{
              position: "absolute", left: 0, top: 8, bottom: 8, width: 3,
              borderRadius: "var(--r-pill)", background: scoreColor,
              boxShadow: `0 0 8px ${scoreColor}60`,
            }} />

            {/* ヘッダー行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 12, marginBottom: 6 }}>
              <span style={{
                padding: "2px 8px", borderRadius: "var(--r-pill)",
                background: `${scoreColor}20`, color: scoreColor,
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
              }}>
                {draft.angleLabel}
              </span>
              <span style={{
                padding: "2px 8px", borderRadius: "var(--r-pill)",
                background: "rgba(255,255,255,0.3)",
                fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)",
              }}>
                {draft.toneLabel}
              </span>
              <span style={{
                padding: "2px 8px", borderRadius: "var(--r-pill)",
                background: statusStyle.bg, color: statusStyle.color,
                fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
              }}>
                {statusStyle.label}
              </span>

              {/* スコア */}
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: scoreColor }}>
                {draft.estimatedReachScore}
              </span>
            </div>

            {/* フック */}
            <p style={{
              fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 600,
              color: "var(--text)", margin: 0, paddingLeft: 12, marginBottom: 4,
            }}>
              {draft.hook}
            </p>

            {/* 本文プレビュー */}
            <p style={{
              fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.6,
              color: "var(--text-soft)", margin: 0, paddingLeft: 12,
              display: "-webkit-box", WebkitLineClamp: isExpanded ? undefined : 2,
              WebkitBoxOrient: "vertical", overflow: isExpanded ? "visible" : "hidden",
              whiteSpace: "pre-wrap",
            }}>
              {draft.body}
              {draft.hashtags.length > 0 && (
                <span style={{ color: scoreColor, opacity: 0.8 }}>
                  {"\n\n"}{draft.hashtags.map((h) => `#${h}`).join(" ")}
                </span>
              )}
            </p>

            {/* 展開時: セルフリプライ + アクション */}
            {isExpanded && (
              <div style={{ paddingLeft: 12, marginTop: 12 }}>
                {draft.selfReplyText && (
                  <div style={{
                    padding: "8px 12px", borderRadius: "var(--r-md)",
                    background: "rgba(255,255,255,0.3)", marginBottom: 12,
                  }}>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)", margin: "0 0 2px" }}>
                      セルフリプライ（自動連投）
                    </p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-soft)", margin: 0 }}>
                      {draft.selfReplyText}
                    </p>
                  </div>
                )}

                {draft.riskFlags.length > 0 && (
                  <div style={{ marginBottom: 10, padding: "6px 10px", borderRadius: "var(--r-md)", background: "var(--ochre-glass)" }}>
                    <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ochre)", margin: 0, fontWeight: 600 }}>
                      ⚠️ 要確認: {draft.riskFlags.join(" / ")}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  {draft.status !== "STOCKED" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprove(draft.id); }}
                      disabled={isPending}
                      style={{
                        padding: "7px 16px", borderRadius: "var(--r-pill)",
                        background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)`,
                        color: "#fff", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                        border: "none", cursor: "pointer", boxShadow: `0 4px 12px ${scoreColor}40`,
                      }}
                    >
                      ✅ ストックに追加
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleReject(draft.id); }}
                    disabled={isPending}
                    style={{
                      padding: "7px 14px", borderRadius: "var(--r-pill)",
                      background: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.5)",
                      color: "var(--text-soft)", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    没
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
