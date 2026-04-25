"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { IconCheck, IconClose, IconChevronDown, IconChevronUp } from "@/components/icons/NavIcons";

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "var(--sage)" : s >= 60 ? "var(--ochre)" : s >= 40 ? "var(--terracotta)" : "var(--navy)";

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

type Tab = "ideas" | "ok" | "rejected";
type FlyDir = "ok" | "reject";

export function DraftsClient({
  activeDrafts,
  historyDrafts,
}: {
  activeDrafts: DraftItem[];
  historyDrafts: HistoryItem[];
}) {
  const searchParams = useSearchParams();
  const newBatchId = searchParams.get("new");

  const [tab, setTab] = useState<Tab>("ideas");
  const [drafts, setDrafts] = useState(activeDrafts);
  const [okDrafts, setOkDrafts] = useState<DraftItem[]>(
    activeDrafts.filter((d) => d.status === "STOCKED")
  );
  const [flying, setFlying] = useState<Record<string, FlyDir>>({});
  const [tabPulse, setTabPulse] = useState<Tab | null>(null);
  const [isPending, startTransition] = useTransition();
  const newRef = useRef<HTMLDivElement>(null);

  // タブカウント（フライ中のものは除外）
  const ideasCount = drafts.filter(
    (d) => d.status === "PENDING_REVIEW" || d.status === "BLOCKED"
  ).length;
  const okCount = okDrafts.length + activeDrafts.filter((d) => d.status === "STOCKED" && !okDrafts.find((o) => o.id === d.id)).length;
  const rejectedCount = historyDrafts.length;

  useEffect(() => {
    if (newBatchId && newRef.current) {
      setTimeout(() => newRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
  }, [newBatchId]);

  const pulsTab = useCallback((t: Tab) => {
    setTabPulse(t);
    setTimeout(() => setTabPulse(null), 500);
  }, []);

  function handleApprove(id: string) {
    // フライアニメーション開始
    setFlying((f) => ({ ...f, [id]: "ok" }));
    pulsTab("ok");

    // アニメーション完了後にリストから削除
    setTimeout(() => {
      startTransition(async () => {
        await fetch(`/api/drafts/${id}/approve`, { method: "POST" });
        const approved = drafts.find((d) => d.id === id);
        if (approved) {
          setOkDrafts((prev) => [{ ...approved, status: "STOCKED" }, ...prev]);
        }
        setDrafts((ds) => ds.filter((d) => d.id !== id));
        setFlying((f) => { const n = { ...f }; delete n[id]; return n; });
      });
    }, 380);
  }

  function handleReject(id: string) {
    setFlying((f) => ({ ...f, [id]: "reject" }));
    pulsTab("rejected");

    setTimeout(() => {
      startTransition(async () => {
        await fetch(`/api/drafts/${id}/reject`, { method: "POST" });
        setDrafts((ds) => ds.filter((d) => d.id !== id));
        setFlying((f) => { const n = { ...f }; delete n[id]; return n; });
      });
    }, 380);
  }

  // バッチグループ
  const ideaDrafts = drafts.filter((d) => d.status === "PENDING_REVIEW" || d.status === "BLOCKED");
  const batches = ideaDrafts.reduce<Record<string, DraftItem[]>>((acc, d) => {
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

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "ideas",    label: "アイデア", count: ideasCount },
    { key: "ok",       label: "配信OK",   count: okCount },
    { key: "rejected", label: "没",       count: rejectedCount },
  ];

  return (
    <>
      {/* ─ ページ見出し ─ */}
      <div className="page-header">
        <h1 className="page-heading">アイデア</h1>
      </div>

      {/* ─ スティッキータブ ─ */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        background: "rgba(248,244,236,0.85)",
        borderBottom: "1px solid rgba(255,255,255,0.40)",
        margin: "0 -14px",
        padding: "8px 14px",
      }}>
        <div style={{ display: "flex", gap: 6, maxWidth: 520 - 28, margin: "0 auto" }}>
          {TABS.map(({ key, label, count }) => {
            const active = tab === key;
            const isPulsing = tabPulse === key;
            const accentColor =
              key === "ok" ? "var(--sage)" :
              key === "rejected" ? "var(--text-muted)" :
              "var(--terracotta)";

            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={isPulsing ? "tab-pulse" : ""}
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  padding: "8px 6px",
                  borderRadius: "var(--r-md)",
                  border: active ? `1.5px solid ${accentColor}40` : "1.5px solid transparent",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: active ? 700 : 500,
                  background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
                  color: active ? accentColor : "var(--text-muted)",
                  boxShadow: active ? "var(--shadow-soft)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {label}
                <span style={{
                  padding: "1px 6px", borderRadius: "var(--r-pill)",
                  background: active ? `${accentColor}20` : "transparent",
                  fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700,
                  color: active ? accentColor : "var(--text-dim)",
                  transition: "all 0.2s",
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─ アイデアタブ ─ */}
      {tab === "ideas" && (
        <>
          {ideaDrafts.length === 0 && Object.keys(flying).length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">💡</span>
                <p className="empty-title">アイデアがありません</p>
                <p className="empty-sub">ネタ元で URL やテキストを入力して生成してください</p>
                <a href="/sources" className="btn-primary" style={{ textDecoration: "none", marginTop: 8 }}>
                  ネタ元を追加する
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
                  borderRadius: "var(--r-lg)", overflow: "hidden",
                  border: isNew ? "2px solid var(--terracotta)" : "2px solid transparent",
                  boxShadow: isNew ? "0 0 0 4px rgba(201,119,87,0.12)" : "none",
                }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 14px",
                  background: isNew ? "rgba(201,119,87,0.10)" : "rgba(255,255,255,0.45)",
                  backdropFilter: "blur(16px)",
                }}>
                  {isNew && <span className="badge" style={{ background: "var(--terracotta)", color: "#fff" }}>NEW</span>}
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600, color: "var(--text-soft)" }}>
                    {items.length}本のアイデア
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-dim)" }}>
                    {batchDate.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 1, background: "rgba(255,255,255,0.30)", backdropFilter: "blur(20px)" }}>
                  {items.map((draft, idx) => (
                    <IdeaCard
                      key={draft.id}
                      draft={draft}
                      isLast={idx === items.length - 1}
                      flyClass={flying[draft.id] === "ok" ? "flying-ok" : flying[draft.id] === "reject" ? "flying-reject" : ""}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      disabled={isPending || !!flying[draft.id]}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ─ 配信OKタブ ─ */}
      {tab === "ok" && (
        <>
          {okDrafts.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">📤</span>
                <p className="empty-title">配信OKがありません</p>
                <p className="empty-sub">アイデアを承認すると、ここに追加されます</p>
              </div>
            </div>
          )}
          <div className="card">
            {okDrafts.map((d, i) => (
              <div key={d.id} style={{
                padding: "12px 14px",
                borderBottom: i < okDrafts.length - 1 ? "1px solid rgba(255,255,255,0.30)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span className="badge" style={{ background: `${SCORE_COLOR(d.estimatedReachScore)}22`, color: SCORE_COLOR(d.estimatedReachScore) }}>
                    {d.angleLabel}
                  </span>
                  <span className="badge" style={{ background: "var(--sage-glass)", color: "var(--sage)" }}>
                    配信OK
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700, color: SCORE_COLOR(d.estimatedReachScore) }}>
                    {d.estimatedReachScore}
                  </span>
                </div>
                <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>
                  {d.hook}
                </p>
                <p style={{
                  margin: "3px 0 0", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-soft)",
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                }}>
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─ 没タブ ─ */}
      {tab === "rejected" && (
        <>
          {historyDrafts.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p className="empty-title">没にしたアイデアはありません</p>
              </div>
            </div>
          )}
          {historyDrafts.length > 0 && (
            <div className="card">
              {historyDrafts.map((d, i) => (
                <div key={d.id} style={{
                  padding: "11px 14px",
                  borderBottom: i < historyDrafts.length - 1 ? "1px solid rgba(255,255,255,0.30)" : "none",
                  opacity: 0.7,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span className="badge" style={{ background: "rgba(200,190,180,0.25)", color: "var(--text-muted)" }}>
                      {d.angleLabel}
                    </span>
                    <span className="meta" style={{ marginLeft: "auto" }}>
                      {new Date(d.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 13, color: "var(--text-soft)" }}>
                    {d.hook}
                  </p>
                  <p style={{
                    margin: "2px 0 0", fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)",
                    overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                  }}>
                    {d.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

/* ─── IdeaCard ──────────────────────────────────────────────── */
function IdeaCard({
  draft, isLast, flyClass, onApprove, onReject, disabled,
}: {
  draft: DraftItem;
  isLast: boolean;
  flyClass: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  disabled: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = SCORE_COLOR(draft.estimatedReachScore);

  return (
    <div
      className={flyClass}
      style={{
        background: "rgba(255,255,255,0.70)",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.35)",
        position: "relative",
        transformOrigin: "center top",
      }}
    >
      {/* 左アクセント */}
      <div style={{
        position: "absolute", left: 0, top: 10, bottom: 10, width: 3,
        borderRadius: "0 4px 4px 0",
        background: scoreColor, boxShadow: `0 0 6px ${scoreColor}50`,
      }} />

      {/* メインエリア（タップで展開） */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ padding: "11px 12px 8px 16px", cursor: "pointer" }}
      >
        {/* バッジ行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span className="badge" style={{ background: `${scoreColor}20`, color: scoreColor }}>
            {draft.angleLabel}
          </span>
          <span className="badge" style={{ background: "rgba(255,255,255,0.5)", color: "var(--text-muted)" }}>
            {draft.tone === "formal" ? "丁寧" : draft.tone === "friendly" ? "親しみ" : "軽め"}
          </span>
          {draft.riskFlags.length > 0 && (
            <span className="badge" style={{ background: "var(--ochre-glass)", color: "var(--ochre)" }}>⚠️</span>
          )}
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

        {/* 本文 */}
        <p style={{
          margin: 0, fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.65,
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
      </div>

      {/* ─ アクションボタン（常時表示） ─ */}
      <div style={{ display: "flex", gap: 8, padding: "0 12px 11px 16px" }}>
        <button
          className="btn-approve"
          onClick={(e) => { e.stopPropagation(); onApprove(draft.id); }}
          disabled={disabled}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <IconCheck size={13} color="#fff" />
          配信OK
        </button>
        <button
          className="btn-reject"
          onClick={(e) => { e.stopPropagation(); onReject(draft.id); }}
          disabled={disabled}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <IconClose size={13} />
          没
        </button>
      </div>
    </div>
  );
}
