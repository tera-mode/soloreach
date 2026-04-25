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

/* ─────────────────────────────────────────────────────────────
   統一カード — 3タブすべてで同じ構造・スタイルを使用
   status: "idea" | "ok" | "rejected" で外観を切り替え
───────────────────────────────────────────────────────────── */
function UnifiedCard({
  id,
  angleLabel,
  tone,
  hook,
  body,
  hashtags = [],
  selfReplyText,
  estimatedReachScore,
  riskFlags = [],
  cardStatus,
  isLast,
  flyClass = "",
  onApprove,
  onReject,
  disabled,
}: {
  id: string;
  angleLabel: string;
  tone?: string;
  hook: string;
  body: string;
  hashtags?: string[];
  selfReplyText?: string | null;
  estimatedReachScore?: number;
  riskFlags?: string[];
  cardStatus: "idea" | "ok" | "rejected";
  isLast: boolean;
  flyClass?: string;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const score = estimatedReachScore ?? 50;
  const scoreColor = SCORE_COLOR(score);
  const accentColor =
    cardStatus === "ok" ? "var(--sage)" :
    cardStatus === "rejected" ? "rgba(150,140,130,0.5)" :
    scoreColor;

  const statusBadge =
    cardStatus === "ok"
      ? { text: "配信OK", bg: "var(--sage-glass)", color: "var(--sage)" }
      : cardStatus === "rejected"
      ? { text: "没", bg: "rgba(200,190,180,0.25)", color: "var(--text-muted)" }
      : null;

  return (
    <div
      className={flyClass}
      style={{
        background: cardStatus === "rejected" ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.70)",
        opacity: cardStatus === "rejected" ? 0.72 : 1,
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.35)",
        position: "relative",
        transformOrigin: "center top",
      }}
    >
      {/* 左アクセントライン（全タブ共通） */}
      <div style={{
        position: "absolute", left: 0, top: 10, bottom: 10, width: 3,
        borderRadius: "0 4px 4px 0",
        background: accentColor,
        boxShadow: cardStatus === "idea" ? `0 0 6px ${scoreColor}50` : "none",
      }} />

      {/* タップエリア */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{ padding: "11px 12px 8px 16px", cursor: "pointer" }}
      >
        {/* バッジ行 */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span className="badge" style={{ background: `${accentColor}22`, color: accentColor }}>
            {angleLabel}
          </span>
          {tone && cardStatus === "idea" && (
            <span className="badge" style={{ background: "rgba(255,255,255,0.5)", color: "var(--text-muted)" }}>
              {tone === "formal" ? "丁寧" : tone === "friendly" ? "親しみ" : "軽め"}
            </span>
          )}
          {statusBadge && (
            <span className="badge" style={{ background: statusBadge.bg, color: statusBadge.color }}>
              {statusBadge.text}
            </span>
          )}
          {riskFlags.length > 0 && cardStatus === "idea" && (
            <span className="badge" style={{ background: "var(--ochre-glass)", color: "var(--ochre)" }}>⚠️</span>
          )}
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: accentColor }}>
            {score}
          </span>
          {expanded
            ? <IconChevronUp size={15} color="var(--text-dim)" />
            : <IconChevronDown size={15} color="var(--text-dim)" />
          }
        </div>

        {/* フック（全タブ同一） */}
        <p style={{
          margin: "0 0 3px",
          fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 600,
          color: "var(--text)", lineHeight: 1.4,
        }}>
          {hook}
        </p>

        {/* 本文（全タブ同一） */}
        <p style={{
          margin: 0,
          fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.65,
          color: "var(--text-soft)",
          display: "-webkit-box", WebkitBoxOrient: "vertical",
          WebkitLineClamp: expanded ? undefined : 2,
          overflow: expanded ? "visible" : "hidden",
          whiteSpace: "pre-wrap",
        }}>
          {body}
          {hashtags.length > 0 && (
            <span style={{ color: accentColor, opacity: 0.8 }}>
              {"\n\n"}{hashtags.map((h) => `#${h}`).join(" ")}
            </span>
          )}
        </p>

        {/* 展開時のみ: セルフリプライ */}
        {expanded && selfReplyText && (
          <div style={{
            marginTop: 10, padding: "8px 10px", borderRadius: "var(--r-md)",
            background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.5)",
          }}>
            <p className="label" style={{ marginBottom: 2 }}>セルフリプライ（投稿後に自動送信）</p>
            <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-soft)" }}>
              {selfReplyText}
            </p>
          </div>
        )}
        {expanded && riskFlags.length > 0 && (
          <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: "var(--r-md)", background: "var(--ochre-glass)" }}>
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--ochre)", fontWeight: 600 }}>
              ⚠️ {riskFlags.join(" / ")}
            </p>
          </div>
        )}
      </div>

      {/* アクションボタン（アイデアタブのみ） */}
      {cardStatus === "idea" && onApprove && onReject && (
        <div style={{ display: "flex", gap: 8, padding: "0 12px 11px 16px" }}>
          <button
            className="btn-approve"
            onClick={(e) => { e.stopPropagation(); onApprove(id); }}
            disabled={disabled}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <IconCheck size={13} color="#fff" />
            配信OK
          </button>
          <button
            className="btn-reject"
            onClick={(e) => { e.stopPropagation(); onReject(id); }}
            disabled={disabled}
            style={{ flex: 1, justifyContent: "center" }}
          >
            <IconClose size={13} />
            没
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   メイン: DraftsClient
───────────────────────────────────────────────────────────── */
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
    setFlying((f) => ({ ...f, [id]: "ok" }));
    pulsTab("ok");
    setTimeout(() => {
      startTransition(async () => {
        await fetch(`/api/drafts/${id}/approve`, { method: "POST" });
        const approved = drafts.find((d) => d.id === id);
        if (approved) setOkDrafts((prev) => [{ ...approved, status: "STOCKED" }, ...prev]);
        setDrafts((ds) => ds.filter((d) => d.id !== id));
        setFlying((f) => { const n = { ...f }; delete n[id]; return n; });
      });
    }, 200);
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
    }, 200);
  }

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
    { key: "ideas",    label: "アイデア", count: ideaDrafts.length },
    { key: "ok",       label: "配信OK",   count: okDrafts.length },
    { key: "rejected", label: "没",       count: historyDrafts.length },
  ];

  return (
    <>
      {/* ─ ページ見出し ─ */}
      <div className="page-header">
        <h1 className="page-heading">アイデア</h1>
      </div>

      {/* ─ スティッキータブ ─ */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "transparent", padding: "8px 0 6px" }}>
        <div style={{ display: "flex", gap: 6 }}>
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
                  padding: "8px 6px", borderRadius: "var(--r-md)",
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
                {/* バッチヘッダー */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 14px",
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
                {/* カード群 */}
                <div style={{ background: "rgba(255,255,255,0.30)", backdropFilter: "blur(20px)" }}>
                  {items.map((d, idx) => (
                    <UnifiedCard
                      key={d.id}
                      id={d.id}
                      angleLabel={d.angleLabel}
                      tone={d.tone}
                      hook={d.hook}
                      body={d.body}
                      hashtags={d.hashtags}
                      selfReplyText={d.selfReplyText}
                      estimatedReachScore={d.estimatedReachScore}
                      riskFlags={d.riskFlags}
                      cardStatus="idea"
                      isLast={idx === items.length - 1}
                      flyClass={flying[d.id] === "ok" ? "flying-ok" : flying[d.id] === "reject" ? "flying-reject" : ""}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      disabled={isPending || !!flying[d.id]}
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
          {okDrafts.length > 0 && (
            <div className="card">
              {okDrafts.map((d, i) => (
                <UnifiedCard
                  key={d.id}
                  id={d.id}
                  angleLabel={d.angleLabel}
                  hook={d.hook}
                  body={d.body}
                  hashtags={d.hashtags}
                  selfReplyText={d.selfReplyText}
                  estimatedReachScore={d.estimatedReachScore}
                  cardStatus="ok"
                  isLast={i === okDrafts.length - 1}
                />
              ))}
            </div>
          )}
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
                <UnifiedCard
                  key={d.id}
                  id={d.id}
                  angleLabel={d.angleLabel}
                  hook={d.hook}
                  body={d.body}
                  estimatedReachScore={50}
                  cardStatus="rejected"
                  isLast={i === historyDrafts.length - 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
