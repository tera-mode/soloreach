"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { IconCheck, IconClose, IconChevronDown, IconChevronUp } from "@/components/icons/NavIcons";

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "var(--sage)" : s >= 60 ? "var(--ochre)" : s >= 40 ? "var(--terracotta)" : "var(--navy)";

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  PENDING_REVIEW: { text: "承認待ち", color: "var(--terracotta)", bg: "var(--terracotta-glass)" },
  STOCKED:        { text: "✅ ストック", color: "var(--sage)",       bg: "var(--sage-glass)" },
  BLOCKED:        { text: "⚠️ 要確認",   color: "var(--ochre)",      bg: "var(--ochre-glass)" },
};

interface DraftItem {
  id: string; batchId: string;
  angle: string; angleLabel: string; tone: string;
  hook: string; body: string; selfReplyText: string | null;
  hashtags: string[]; estimatedReachScore: number;
  status: string; riskFlags: string[]; createdAt: number;
}

interface HistoryItem {
  id: string; hook: string; body: string;
  angle: string; angleLabel: string; createdAt: number;
}

type Tab = "active" | "history";

export function DraftsClient({
  activeDrafts,
  historyDrafts,
}: {
  activeDrafts: DraftItem[];
  historyDrafts: HistoryItem[];
}) {
  const searchParams = useSearchParams();
  const newBatchId = searchParams.get("new");

  const [tab, setTab] = useState<Tab>("active");
  const [drafts, setDrafts] = useState(activeDrafts);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const newRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (newBatchId && newRef.current) {
      setTimeout(() => newRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
  }, [newBatchId]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/drafts/${id}/approve`, { method: "POST" });
      if (res.ok) {
        setDrafts((ds) => ds.map((d) => d.id === id ? { ...d, status: "STOCKED" } : d));
        showToast("✅ ストックに追加しました");
      }
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/drafts/${id}/reject`, { method: "POST" });
      if (res.ok) setDrafts((ds) => ds.filter((d) => d.id !== id));
    });
  }

  const pendingCount = drafts.filter((d) => d.status === "PENDING_REVIEW").length;

  // バッチグループ化
  const batches = drafts.reduce<Record<string, DraftItem[]>>((acc, d) => {
    const k = d.batchId ?? "ungrouped";
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {});
  const batchIds = Object.keys(batches).sort((a, b) => {
    const tA = Math.max(...batches[a].map((d) => d.createdAt));
    const tB = Math.max(...batches[b].map((d) => d.createdAt));
    return tB - tA;
  });

  return (
    <>
      {/* ─ トースト ─ */}
      {toast && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 300, padding: "10px 20px", borderRadius: "var(--r-pill)",
          background: "var(--sage)", color: "#fff",
          fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
          boxShadow: "var(--shadow)", whiteSpace: "nowrap",
        }}>
          {toast}
        </div>
      )}

      {/* ─ ヘッダー ─ */}
      <div className="page-header">
        <h1 className="page-heading">Drafts</h1>
        {pendingCount > 0 && (
          <span className="badge" style={{ background: "var(--terracotta)", color: "#fff", fontSize: 12 }}>
            {pendingCount} 件待ち
          </span>
        )}
      </div>

      {/* ─ タブ ─ */}
      <div style={{ display: "flex", gap: 6 }}>
        {([["active", "ドラフト", drafts.length], ["history", "履歴（没）", historyDrafts.length]] as const).map(([t, label, count]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "7px 14px", borderRadius: "var(--r-pill)", border: "none",
              cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: tab === t ? 700 : 500,
              background: tab === t ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.45)",
              color: tab === t ? "var(--text)" : "var(--text-muted)",
              boxShadow: tab === t ? "var(--shadow-soft)" : "none",
            }}
          >
            {label} <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{count}</span>
          </button>
        ))}
      </div>

      {/* ─ アクティブドラフト ─ */}
      {tab === "active" && (
        <>
          {drafts.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <p className="empty-title">ドラフトがありません</p>
                <p className="empty-sub">Sources で URL やテキストを入力して生成してください</p>
                <a href="/sources" className="btn-primary" style={{ textDecoration: "none", marginTop: 8 }}>
                  ソースを追加する
                </a>
              </div>
            </div>
          )}

          {batchIds.map((batchId) => {
            const isNew = batchId === newBatchId;
            const items = batches[batchId].sort((a, b) => b.estimatedReachScore - a.estimatedReachScore);
            const batchDate = new Date(Math.max(...items.map((d) => d.createdAt)));

            return (
              <div
                key={batchId}
                ref={isNew ? newRef : null}
                style={{
                  borderRadius: "var(--r-lg)",
                  overflow: "hidden",
                  border: isNew ? "2px solid var(--terracotta)" : "2px solid transparent",
                  boxShadow: isNew ? "0 0 0 4px rgba(201,119,87,0.12)" : "none",
                }}
              >
                {/* バッチ見出し */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 14px",
                  background: isNew ? "rgba(201,119,87,0.12)" : "rgba(255,255,255,0.45)",
                  backdropFilter: "blur(16px)",
                }}>
                  {isNew && <span className="badge" style={{ background: "var(--terracotta)", color: "#fff" }}>NEW</span>}
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--text-soft)" }}>
                    {items.length}本のバッチ
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-dim)" }}>
                    {batchDate.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {/* カード群 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.30)", backdropFilter: "blur(20px)" }}>
                  {items.map((draft, idx) => (
                    <DraftCard
                      key={draft.id}
                      draft={draft}
                      isLast={idx === items.length - 1}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      disabled={isPending}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ─ 履歴（没） ─ */}
      {tab === "history" && (
        <>
          {historyDrafts.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p className="empty-title">没にしたドラフトはありません</p>
              </div>
            </div>
          )}
          <div className="card">
            {historyDrafts.map((d, i) => (
              <div
                key={d.id}
                style={{
                  padding: "12px 14px",
                  borderBottom: i < historyDrafts.length - 1 ? "1px solid rgba(255,255,255,0.30)" : "none",
                  opacity: 0.75,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span className="badge" style={{ background: "rgba(200,190,180,0.25)", color: "var(--text-muted)" }}>
                    {d.angleLabel}
                  </span>
                  <span className="meta" style={{ marginLeft: "auto" }}>
                    {new Date(d.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--text-soft)" }}>
                  {d.hook}
                </p>
                <p style={{
                  margin: "3px 0 0", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)",
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ─── DraftCard ─────────────────────────────────────────────── */
function DraftCard({ draft, isLast, onApprove, onReject, disabled }: {
  draft: DraftItem;
  isLast: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = SCORE_COLOR(draft.estimatedReachScore);
  const statusInfo = STATUS_LABEL[draft.status] ?? STATUS_LABEL.PENDING_REVIEW;

  return (
    <div style={{
      background: "rgba(255,255,255,0.68)",
      borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.35)",
      position: "relative",
    }}>
      {/* 左アクセントライン */}
      <div style={{
        position: "absolute", left: 0, top: 10, bottom: 10, width: 3,
        borderRadius: "0 var(--r-pill) var(--r-pill) 0",
        background: scoreColor, boxShadow: `0 0 6px ${scoreColor}50`,
      }} />

      {/* メインコンテンツ（タップで展開） */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ padding: "11px 12px 10px 16px", cursor: "pointer" }}
      >
        {/* バッジ行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span className="badge" style={{ background: `${scoreColor}22`, color: scoreColor }}>
            {draft.angleLabel}
          </span>
          <span className="badge" style={{ background: "rgba(255,255,255,0.5)", color: "var(--text-muted)" }}>
            {draft.tone === "formal" ? "丁寧" : draft.tone === "friendly" ? "親しみ" : "軽め"}
          </span>
          <span className="badge" style={{ background: statusInfo.bg, color: statusInfo.color }}>
            {statusInfo.text}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: scoreColor }}>
            {draft.estimatedReachScore}
          </span>
          {expanded
            ? <IconChevronUp size={16} color="var(--text-dim)" />
            : <IconChevronDown size={16} color="var(--text-dim)" />
          }
        </div>

        {/* フック */}
        <p style={{ margin: "0 0 3px", fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
          {draft.hook}
        </p>

        {/* 本文プレビュー */}
        <p style={{
          margin: 0, fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.6,
          color: "var(--text-soft)",
          display: "-webkit-box", WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? undefined : 2,
          overflow: expanded ? "visible" : "hidden",
          whiteSpace: "pre-wrap",
        }}>
          {draft.body}
          {draft.hashtags.length > 0 && (
            <span style={{ color: scoreColor, opacity: 0.8 }}>
              {"\n\n"}{draft.hashtags.map((h) => `#${h}`).join(" ")}
            </span>
          )}
        </p>

        {/* 展開時: selfReplyText */}
        {expanded && draft.selfReplyText && (
          <div style={{
            marginTop: 10, padding: "8px 10px", borderRadius: "var(--r-md)",
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.5)",
          }}>
            <p className="label" style={{ marginBottom: 2 }}>セルフリプライ（投稿後に自動送信）</p>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-soft)" }}>
              {draft.selfReplyText}
            </p>
          </div>
        )}

        {expanded && draft.riskFlags.length > 0 && (
          <div style={{
            marginTop: 8, padding: "6px 10px", borderRadius: "var(--r-md)",
            background: "var(--ochre-glass)",
          }}>
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ochre)", fontWeight: 600 }}>
              ⚠️ {draft.riskFlags.join(" / ")}
            </p>
          </div>
        )}
      </div>

      {/* ─ アクションボタン（常時表示） ─ */}
      {draft.status !== "STOCKED" && (
        <div style={{
          display: "flex", gap: 8, padding: "0 12px 11px 16px",
        }}>
          <button
            className="btn-approve"
            onClick={(e) => { e.stopPropagation(); onApprove(draft.id); }}
            disabled={disabled}
          >
            <IconCheck size={14} color="#fff" />
            ストック
          </button>
          <button
            className="btn-reject"
            onClick={(e) => { e.stopPropagation(); onReject(draft.id); }}
            disabled={disabled}
          >
            <IconClose size={14} />
            没
          </button>
        </div>
      )}
    </div>
  );
}
