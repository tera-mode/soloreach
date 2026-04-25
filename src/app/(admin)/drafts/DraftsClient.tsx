"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

const SCORE_COLOR = (score: number) =>
  score >= 80 ? "var(--sage)" :
  score >= 60 ? "var(--ochre)" :
  score >= 40 ? "var(--terracotta)" : "var(--navy)";

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  PENDING_REVIEW: { bg: "var(--terracotta-glass)", color: "var(--terracotta)", label: "承認待ち" },
  STOCKED:        { bg: "var(--sage-glass)",       color: "var(--sage)",       label: "✅ ストック済み" },
  BLOCKED:        { bg: "var(--ochre-glass)",       color: "var(--ochre)",      label: "⚠️ 要確認" },
};

interface DraftItem {
  id: string;
  batchId: string;
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
  createdAt: number;
}

interface DraftsClientProps {
  drafts: DraftItem[];
}

export function DraftsClient({ drafts: initial }: DraftsClientProps) {
  const searchParams = useSearchParams();
  const newBatchId = searchParams.get("new");

  const [drafts, setDrafts] = useState(initial);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const newBatchRef = useRef<HTMLDivElement>(null);

  // 新着バッチがある場合はそこまでスクロール
  useEffect(() => {
    if (newBatchId && newBatchRef.current) {
      setTimeout(() => {
        newBatchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [newBatchId]);

  async function handleApprove(id: string) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/drafts/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setDrafts((ds) => ds.map((d) => d.id === id ? { ...d, status: "STOCKED" } : d));
        setMessage("✅ ストックに追加しました");
        setExpanded(null);
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

  // バッチごとにグループ化
  const batches = drafts.reduce<Record<string, DraftItem[]>>((acc, d) => {
    const key = d.batchId ?? "ungrouped";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const batchIds = Object.keys(batches).sort((a, b) => {
    const timeA = Math.max(...batches[a].map((d) => d.createdAt));
    const timeB = Math.max(...batches[b].map((d) => d.createdAt));
    return timeB - timeA;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {message && (
        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 13,
          color: message.startsWith("✅") ? "var(--sage)" : "var(--terracotta)",
          padding: "10px 14px", borderRadius: "var(--r-md)",
          background: message.startsWith("✅") ? "var(--sage-glass)" : "var(--terracotta-glass)",
          margin: 0,
        }}>
          {message}
        </p>
      )}

      {batchIds.map((batchId) => {
        const batchDrafts = batches[batchId].sort((a, b) => b.estimatedReachScore - a.estimatedReachScore);
        const isNewBatch = batchId === newBatchId;
        const batchDate = new Date(Math.max(...batchDrafts.map((d) => d.createdAt)));
        const pendingInBatch = batchDrafts.filter((d) => d.status === "PENDING_REVIEW").length;
        const stockedInBatch = batchDrafts.filter((d) => d.status === "STOCKED").length;

        return (
          <div
            key={batchId}
            ref={isNewBatch ? newBatchRef : null}
            style={{
              borderRadius: "var(--r-lg)",
              border: isNewBatch ? `2px solid var(--terracotta)` : "2px solid transparent",
              boxShadow: isNewBatch ? `0 0 0 4px rgba(201,119,87,0.15)` : "none",
              overflow: "hidden",
              transition: "all 0.3s",
            }}
          >
            {/* バッチヘッダー */}
            <div style={{
              padding: "10px 16px",
              background: isNewBatch ? "var(--terracotta-glass)" : "rgba(255,255,255,0.35)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {isNewBatch && (
                <span style={{
                  padding: "2px 10px", borderRadius: "var(--r-pill)",
                  background: "var(--terracotta)", color: "#fff",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700,
                }}>
                  NEW
                </span>
              )}
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-soft)" }}>
                {batchDrafts.length}本のバッチ
              </span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                承認待ち {pendingInBatch}本 · ストック済み {stockedInBatch}本
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }}>
                {batchDate.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {/* ドラフトカード群 */}
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {batchDrafts.map((draft) => {
                const isExp = expanded === draft.id;
                const scoreColor = SCORE_COLOR(draft.estimatedReachScore);
                const statusStyle = STATUS_STYLES[draft.status] ?? STATUS_STYLES.PENDING_REVIEW;

                return (
                  <div
                    key={draft.id}
                    onClick={() => setExpanded(isExp ? null : draft.id)}
                    style={{
                      borderRadius: "var(--r-md)",
                      padding: "11px 14px",
                      cursor: "pointer",
                      position: "relative", overflow: "hidden",
                      background: isExp ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.60)",
                      border: isExp ? "1px solid rgba(255,255,255,0.80)" : "1px solid rgba(255,255,255,0.50)",
                      boxShadow: isExp ? "var(--shadow-soft)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {/* 左ストライプ */}
                    <div style={{
                      position: "absolute", left: 0, top: 8, bottom: 8, width: 3,
                      borderRadius: "var(--r-pill)",
                      background: scoreColor, boxShadow: `0 0 6px ${scoreColor}50`,
                    }} />

                    {/* ヘッダー行 */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 10, marginBottom: 5 }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: "var(--r-pill)",
                        background: `${scoreColor}20`, color: scoreColor,
                        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
                      }}>
                        {draft.angleLabel}
                      </span>
                      <span style={{
                        padding: "2px 7px", borderRadius: "var(--r-pill)",
                        background: "rgba(255,255,255,0.5)",
                        fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)",
                      }}>
                        {draft.toneLabel}
                      </span>
                      <span style={{
                        padding: "2px 7px", borderRadius: "var(--r-pill)",
                        background: statusStyle.bg, color: statusStyle.color,
                        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 500,
                      }}>
                        {statusStyle.label}
                      </span>
                      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: scoreColor }}>
                        {draft.estimatedReachScore}
                      </span>
                    </div>

                    {/* フック */}
                    <p style={{
                      fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 600,
                      color: "var(--text)", margin: 0, paddingLeft: 10, marginBottom: 3,
                    }}>
                      {draft.hook}
                    </p>

                    {/* 本文 */}
                    <p style={{
                      fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.65,
                      color: "var(--text-soft)", margin: 0, paddingLeft: 10,
                      display: "-webkit-box",
                      WebkitLineClamp: isExp ? undefined : 2,
                      WebkitBoxOrient: "vertical",
                      overflow: isExp ? "visible" : "hidden",
                      whiteSpace: "pre-wrap",
                    }}>
                      {draft.body}
                      {draft.hashtags.length > 0 && (
                        <span style={{ color: scoreColor, opacity: 0.85 }}>
                          {"\n\n"}{draft.hashtags.map((h) => `#${h}`).join(" ")}
                        </span>
                      )}
                    </p>

                    {/* 展開時のアクション */}
                    {isExp && (
                      <div style={{ paddingLeft: 10, marginTop: 12 }}>
                        {draft.selfReplyText && (
                          <div style={{
                            padding: "8px 12px", borderRadius: "var(--r-md)",
                            background: "rgba(255,255,255,0.5)", marginBottom: 10,
                          }}>
                            <p style={{ margin: "0 0 2px", fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-muted)" }}>
                              セルフリプライ（URL自動連投）
                            </p>
                            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-soft)" }}>
                              {draft.selfReplyText}
                            </p>
                          </div>
                        )}

                        {draft.riskFlags.length > 0 && (
                          <div style={{
                            padding: "6px 10px", borderRadius: "var(--r-md)",
                            background: "var(--ochre-glass)", marginBottom: 10,
                          }}>
                            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ochre)", fontWeight: 600 }}>
                              ⚠️ {draft.riskFlags.join(" / ")}
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
                                border: "none", cursor: "pointer",
                                boxShadow: `0 4px 12px ${scoreColor}40`,
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
                              background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.6)",
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
          </div>
        );
      })}
    </div>
  );
}
