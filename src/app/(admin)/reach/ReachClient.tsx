"use client";

import { useState, useTransition } from "react";
import { IconChevronDown, IconChevronUp, IconCheck } from "@/components/icons/NavIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockedDraft {
  id: string; channel: string; angle: string; angleLabel: string;
  tone: string; hook: string; body: string; selfReplyText: string | null;
  hashtags: string[]; estimatedReachScore: number; riskFlags: string[];
  createdAt: number;
}

export interface ScheduledDraftItem {
  id: string; channel: string; angle: string; angleLabel: string;
  hook: string; body: string; estimatedReachScore: number; scheduledAt: number | null;
}

type Mode = "now" | "schedule";

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "var(--sage)" : s >= 60 ? "var(--ochre)" : s >= 40 ? "var(--terracotta)" : "var(--navy)";

// ─── Channel Badge ─────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "x") {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 19, height: 19, borderRadius: 5,
        background: "rgba(0,0,0,0.82)", color: "#fff",
        fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800,
        letterSpacing: "-0.03em", flexShrink: 0,
      }}>
        𝕏
      </span>
    );
  }
  return (
    <span className="badge" style={{ background: "var(--navy-glass)", color: "var(--navy)", flexShrink: 0 }}>
      {channel}
    </span>
  );
}

// ─── NowCard: 今すぐ配信カード ────────────────────────────────────────────────

function NowCard({
  draft,
  expanded,
  onToggle,
  onPublish,
  publishing,
}: {
  draft: StockedDraft;
  expanded: boolean;
  onToggle: () => void;
  onPublish: (id: string, hook: string, body: string) => void;
  publishing: boolean;
}) {
  const [hook, setHook] = useState(draft.hook);
  const [body, setBody] = useState(draft.body);
  const [confirming, setConfirming] = useState(false);
  const score = draft.estimatedReachScore;
  const scoreColor = SCORE_COLOR(score);

  function handlePublishClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    onPublish(draft.id, hook, body);
  }

  return (
    <div style={{
      background: "rgba(255,255,255,0.76)",
      borderRadius: "var(--r-md)",
      border: "1px solid rgba(255,255,255,0.60)",
      boxShadow: "0 2px 10px rgba(40,35,30,0.07)",
      position: "relative", overflow: "hidden",
    }}>
      {/* 左アクセントライン */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: scoreColor,
        boxShadow: `0 0 8px ${scoreColor}50`,
      }} />

      {/* ヘッダー（常に表示） */}
      <div onClick={onToggle} style={{ padding: "11px 12px 8px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <ChannelBadge channel={draft.channel} />
          <span className="badge" style={{ background: `${scoreColor}22`, color: scoreColor }}>
            {draft.angleLabel}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: scoreColor }}>
            {score}
          </span>
          {expanded
            ? <IconChevronUp size={15} color="var(--text-dim)" />
            : <IconChevronDown size={15} color="var(--text-dim)" />
          }
        </div>

        {/* 折りたたみ時プレビュー */}
        {!expanded && (
          <>
            <p style={{ margin: "0 0 3px", fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
              {draft.hook}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.65,
              display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>
              {draft.body}
            </p>
          </>
        )}
      </div>

      {/* 展開時エディタ */}
      {expanded && (
        <div style={{ padding: "0 12px 12px 16px" }}>
          <p className="label" style={{ marginBottom: 3 }}>冒頭フック</p>
          <input
            value={hook}
            onChange={(e) => { setHook(e.target.value); setConfirming(false); }}
            maxLength={20}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", padding: "7px 10px", borderRadius: "var(--r-md)",
              border: "1.5px solid rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.9)",
              fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 600,
              color: "var(--text)", marginBottom: 8, boxSizing: "border-box",
            }}
          />

          <p className="label" style={{ marginBottom: 3 }}>
            本文 <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>{body.length}/280</span>
          </p>
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setConfirming(false); }}
            maxLength={280}
            rows={5}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: "var(--r-md)",
              border: "1.5px solid rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.9)",
              fontFamily: "var(--font-sans)", fontSize: 12.5,
              color: "var(--text)", lineHeight: 1.65,
              resize: "none", boxSizing: "border-box",
              marginBottom: draft.selfReplyText ? 8 : 12,
            }}
          />

          {draft.selfReplyText && (
            <div style={{
              marginBottom: 12, padding: "7px 10px", borderRadius: "var(--r-md)",
              background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.5)",
            }}>
              <p className="label" style={{ marginBottom: 2 }}>セルフリプライ（投稿後に自動送信）</p>
              <p style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-soft)" }}>
                {draft.selfReplyText}
              </p>
            </div>
          )}

          <button
            onClick={handlePublishClick}
            disabled={publishing || body.trim().length === 0}
            style={{
              width: "100%", padding: "10px", borderRadius: "var(--r-md)",
              border: "none", cursor: publishing ? "not-allowed" : "pointer",
              background: confirming ? "var(--sage)" : "var(--terracotta)",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "background 0.15s",
              opacity: publishing ? 0.7 : 1,
            }}
          >
            {publishing ? (
              "配信中..."
            ) : confirming ? (
              <><IconCheck size={14} color="#fff" /> タップで配信確定</>
            ) : (
              "▶ 今すぐ配信"
            )}
          </button>

          {confirming && !publishing && (
            <p style={{ margin: "5px 0 0", textAlign: "center", fontSize: 11, color: "var(--text-dim)" }}>
              もう一度タップで配信します・
              <span style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => setConfirming(false)}>
                取消
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SchedulePickCard: 予定配信用選択カード ───────────────────────────────────

function SchedulePickCard({
  draft,
  expanded,
  onToggle,
  onSchedule,
  scheduling,
}: {
  draft: StockedDraft;
  expanded: boolean;
  onToggle: () => void;
  onSchedule: (id: string, scheduledAt: string) => void;
  scheduling: boolean;
}) {
  const minDatetime = (() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  })();
  const [scheduleTime, setScheduleTime] = useState("");
  const score = draft.estimatedReachScore;
  const scoreColor = SCORE_COLOR(score);

  return (
    <div style={{
      background: expanded ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.72)",
      borderRadius: "var(--r-md)",
      border: expanded ? `1.5px solid ${scoreColor}30` : "1px solid rgba(255,255,255,0.60)",
      boxShadow: expanded ? `0 4px 20px rgba(40,35,30,0.10)` : "0 2px 10px rgba(40,35,30,0.07)",
      position: "relative", overflow: "hidden",
      transition: "all 0.15s",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: scoreColor,
      }} />

      <div onClick={onToggle} style={{ padding: "11px 12px 8px 16px", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <ChannelBadge channel={draft.channel} />
          <span className="badge" style={{ background: `${scoreColor}22`, color: scoreColor }}>
            {draft.angleLabel}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: scoreColor }}>
            {score}
          </span>
          {expanded
            ? <IconChevronUp size={15} color="var(--text-dim)" />
            : <IconChevronDown size={15} color="var(--text-dim)" />
          }
        </div>
        <p style={{ margin: "0 0 3px", fontFamily: "var(--font-serif)", fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.4 }}>
          {draft.hook}
        </p>
        {!expanded && (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.65,
            display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>
            {draft.body}
          </p>
        )}
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 12px 16px" }}>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--text-soft)", lineHeight: 1.65 }}>
            {draft.body}
          </p>

          <p className="label" style={{ marginBottom: 5 }}>配信日時</p>
          <input
            type="datetime-local"
            value={scheduleTime}
            min={minDatetime}
            onChange={(e) => setScheduleTime(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", padding: "9px 10px", borderRadius: "var(--r-md)",
              border: "1.5px solid rgba(255,255,255,0.65)",
              background: "rgba(255,255,255,0.9)",
              fontFamily: "var(--font-mono)", fontSize: 13,
              color: "var(--text)", marginBottom: 10, boxSizing: "border-box",
            }}
          />

          <button
            onClick={(e) => { e.stopPropagation(); onSchedule(draft.id, scheduleTime); }}
            disabled={!scheduleTime || scheduling}
            style={{
              width: "100%", padding: "10px", borderRadius: "var(--r-md)",
              border: "none", cursor: (!scheduleTime || scheduling) ? "not-allowed" : "pointer",
              background: "var(--ochre)", color: "#fff",
              fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 700,
              opacity: (!scheduleTime || scheduling) ? 0.55 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {scheduling ? "予定中..." : "📅 予定に追加"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ScheduledCard: 予定済みカード ───────────────────────────────────────────

function ScheduledCard({
  draft,
  onCancel,
  cancelling,
}: {
  draft: ScheduledDraftItem;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const score = draft.estimatedReachScore;
  const scoreColor = SCORE_COLOR(score);
  const dateStr = draft.scheduledAt
    ? new Date(draft.scheduledAt).toLocaleString("ja-JP", {
        month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <div style={{
      background: "rgba(255,255,255,0.68)",
      borderRadius: "var(--r-md)",
      border: "1px solid rgba(255,255,255,0.60)",
      boxShadow: "0 2px 8px rgba(40,35,30,0.06)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: "var(--ochre)",
      }} />

      <div style={{ padding: "10px 12px 10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
            <ChannelBadge channel={draft.channel} />
            <span className="badge" style={{ background: `${scoreColor}22`, color: scoreColor }}>
              {draft.angleLabel}
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ochre)" }}>
              📅 {dateStr}
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 13.5, fontWeight: 600, color: "var(--text)",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
            {draft.hook}
          </p>
        </div>
        <button
          onClick={() => onCancel(draft.id)}
          disabled={cancelling}
          style={{
            padding: "5px 10px", borderRadius: "var(--r-md)",
            border: "1px solid rgba(150,140,130,0.4)",
            background: "rgba(255,255,255,0.6)", color: "var(--text-muted)",
            fontFamily: "var(--font-sans)", fontSize: 11.5, fontWeight: 600,
            cursor: "pointer", flexShrink: 0,
          }}
        >
          取消
        </button>
      </div>
    </div>
  );
}

// ─── ReachClient: メインコンポーネント ────────────────────────────────────────

export function ReachClient({
  stockedDrafts,
  scheduledDrafts,
}: {
  stockedDrafts: StockedDraft[];
  scheduledDrafts: ScheduledDraftItem[];
}) {
  const [mode, setMode] = useState<Mode>("now");
  const [stocked, setStocked] = useState(stockedDrafts);
  const [scheduled, setScheduled] = useState(scheduledDrafts);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handlePublishNow(id: string, hook: string, body: string) {
    setPublishingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/drafts/${id}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hook, body }),
        });
        if (res.ok) {
          setTimeout(() => {
            setStocked((prev) => prev.filter((d) => d.id !== id));
            setPublishingId(null);
            setExpandedId(null);
          }, 1000);
        } else {
          setPublishingId(null);
        }
      } catch {
        setPublishingId(null);
      }
    });
  }

  async function handleSchedule(id: string, scheduleTimeStr: string) {
    if (!scheduleTimeStr) return;
    setSchedulingId(id);
    const scheduledAt = new Date(scheduleTimeStr).toISOString();
    startTransition(async () => {
      try {
        const res = await fetch(`/api/drafts/${id}/schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduledAt }),
        });
        if (res.ok) {
          const draft = stocked.find((d) => d.id === id)!;
          setScheduled((prev) => [
            { ...draft, scheduledAt: new Date(scheduleTimeStr).getTime() },
            ...prev,
          ]);
          setStocked((prev) => prev.filter((d) => d.id !== id));
          setExpandedId(null);
        }
      } finally {
        setSchedulingId(null);
      }
    });
  }

  async function handleCancelSchedule(id: string) {
    setCancellingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/drafts/${id}/cancel-schedule`, { method: "POST" });
        if (res.ok) {
          // キャンセルしたドラフトはリストから除去（次回ページロードで STOCKED に戻る）
          setScheduled((prev) => prev.filter((d) => d.id !== id));
        }
      } finally {
        setCancellingId(null);
      }
    });
  }

  return (
    <>
      {/* ─ ページ見出し ─ */}
      <div className="page-header">
        <h1 className="page-heading">配信</h1>
      </div>

      {/* ─ モード切替タブ ─ */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "transparent", padding: "8px 0 6px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {([
            { key: "now" as Mode, label: "⚡ 今すぐ配信", color: "var(--terracotta)" },
            { key: "schedule" as Mode, label: "📅 予定配信", color: "var(--ochre)" },
          ] as const).map(({ key, label, color }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                onClick={() => { setMode(key); setExpandedId(null); }}
                style={{
                  flex: 1, padding: "9px 6px", borderRadius: "var(--r-md)",
                  border: active ? `1.5px solid ${color}40` : "1.5px solid transparent",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: active ? 700 : 500,
                  background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
                  color: active ? color : "var(--text-muted)",
                  boxShadow: active ? "var(--shadow-soft)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─ 今すぐ配信タブ ─ */}
      {mode === "now" && (
        <>
          {stocked.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">📤</span>
                <p className="empty-title">配信OKのアイデアがありません</p>
                <p className="empty-sub">アイデア画面でドラフトを承認してください</p>
                <a href="/drafts" className="btn-primary" style={{ textDecoration: "none", marginTop: 8 }}>
                  アイデアを確認する
                </a>
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {stocked.map((draft) => (
              <NowCard
                key={draft.id}
                draft={draft}
                expanded={expandedId === draft.id}
                onToggle={() => toggleExpand(draft.id)}
                onPublish={handlePublishNow}
                publishing={publishingId === draft.id}
              />
            ))}
          </div>
        </>
      )}

      {/* ─ 予定配信タブ ─ */}
      {mode === "schedule" && (
        <>
          {stocked.length === 0 && scheduled.length === 0 && (
            <div className="card">
              <div className="empty-state">
                <span className="empty-icon">📅</span>
                <p className="empty-title">配信OKのアイデアがありません</p>
                <p className="empty-sub">アイデア画面でドラフトを承認してください</p>
                <a href="/drafts" className="btn-primary" style={{ textDecoration: "none", marginTop: 8 }}>
                  アイデアを確認する
                </a>
              </div>
            </div>
          )}

          {/* 配信OKリスト */}
          {stocked.length > 0 && (
            <>
              <p className="label" style={{ paddingLeft: 2 }}>
                配信OKストック <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>({stocked.length})</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stocked.map((draft) => (
                  <SchedulePickCard
                    key={draft.id}
                    draft={draft}
                    expanded={expandedId === draft.id}
                    onToggle={() => toggleExpand(draft.id)}
                    onSchedule={handleSchedule}
                    scheduling={schedulingId === draft.id}
                  />
                ))}
              </div>
            </>
          )}

          {/* 予定済みリスト */}
          {scheduled.length > 0 && (
            <>
              <p className="label" style={{ paddingLeft: 2, marginTop: stocked.length > 0 ? 6 : 0 }}>
                予定済み <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>({scheduled.length})</span>
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {scheduled
                  .slice()
                  .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))
                  .map((draft) => (
                    <ScheduledCard
                      key={draft.id}
                      draft={draft}
                      onCancel={handleCancelSchedule}
                      cancelling={cancellingId === draft.id}
                    />
                  ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
