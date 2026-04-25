"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ServiceOption { id: string; name: string }
type Mode = "url" | "text";

const STEPS = [
  { id: 1, label: "コンテンツを取得・解析中", sub: "URLにアクセスして本文を抽出します", time: "〜10秒" },
  { id: 2, label: "Gemini Flash が要約を生成中", sub: "記事の要旨とキーポイントを抽出します", time: "〜15秒" },
  { id: 3, label: "Gemini Pro が 21本を量産中", sub: "7切り口×3トーンのドラフトを生成します", time: "〜40秒" },
];

export function QuickAddForm({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [input, setInput] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setError(null);
    setDone(false);
    setLoading(true);
    setCurrentStep(1);

    // ステップ演出（APIが処理中に段階的に進める）
    const stepTimer1 = setTimeout(() => setCurrentStep(2), 8000);
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 22000);

    try {
      const body = mode === "url"
        ? { url: input.trim(), serviceId: serviceId || undefined }
        : { text: input.trim(), serviceId: serviceId || undefined };

      const res = await fetch("/api/sources/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        setError(
          res.status === 409
            ? "このURLはすでに処理済みです。別のURLを試してください。"
            : (data.error ?? "エラーが発生しました")
        );
        setLoading(false);
        setCurrentStep(0);
        return;
      }

      setDone(true);
      setCurrentStep(0);
      setLoading(false);
      setInput("");

      // 完了後、Drafts ページへ自動遷移（新着バッチをハイライト）
      setTimeout(() => {
        router.push(`/drafts?new=${data.batchId}`);
      }, 1200);

    } catch {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setError("通信エラーが発生しました。再試行してください。");
      setLoading(false);
      setCurrentStep(0);
    }
  }

  const tabStyle = (active: boolean) => ({
    padding: "6px 18px", borderRadius: "var(--r-pill)",
    background: active ? "rgba(255,255,255,0.90)" : "transparent",
    border: "none", cursor: "pointer",
    fontFamily: "var(--font-sans)", fontSize: 12.5,
    fontWeight: active ? 600 : 500,
    color: active ? "var(--text)" : "var(--text-muted)",
    boxShadow: active ? "var(--shadow-soft)" : "none",
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* サービス選択 */}
      {services.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>サービス:</span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.5)",
              background: "rgba(255,255,255,0.6)", fontFamily: "var(--font-sans)",
              fontSize: 13, color: "var(--text)", outline: "none",
            }}
          >
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* モード切替 */}
      <div style={{ display: "inline-flex", padding: 4, borderRadius: "var(--r-pill)", background: "rgba(255,255,255,0.4)", alignSelf: "flex-start", gap: 2 }}>
        <button style={tabStyle(mode === "url")} onClick={() => { setMode("url"); setInput(""); setError(null); }}>🔗 URL 入力</button>
        <button style={tabStyle(mode === "text")} onClick={() => { setMode("text"); setInput(""); setError(null); }}>✏️ フリーテキスト</button>
      </div>

      {/* 入力欄 */}
      {mode === "url" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="url"
            placeholder="https://example.com/article"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
            style={{
              flex: 1, padding: "11px 16px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.70)", backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)", outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{
              padding: "11px 22px", borderRadius: "var(--r-pill)",
              background: loading ? "rgba(201,119,87,0.45)" : "var(--terracotta)",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 12px rgba(201,119,87,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "生成中…" : "ドラフト生成"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            placeholder="ネタのメモ、アイデア、記事の要点など何でも入力してください…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            rows={4}
            style={{
              padding: "12px 16px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.55)",
              background: "rgba(255,255,255,0.70)", backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)",
              resize: "vertical", outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            style={{
              alignSelf: "flex-end", padding: "10px 22px", borderRadius: "var(--r-pill)",
              background: loading ? "rgba(201,119,87,0.45)" : "var(--terracotta)",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 4px 12px rgba(201,119,87,0.35)",
            }}
          >
            {loading ? "生成中…" : "ドラフト生成"}
          </button>
        </div>
      )}

      {/* ─── 生成中プログレス ─── */}
      {loading && (
        <div style={{
          borderRadius: "var(--r-lg)",
          background: "rgba(255,255,255,0.65)",
          border: "1px solid rgba(255,255,255,0.7)",
          padding: "18px 20px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-soft)" }}>
              ドラフトを生成しています
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
              合計 約60秒
            </span>
          </div>

          {STEPS.map((step) => {
            const isDone = currentStep > step.id;
            const isActive = currentStep === step.id;

            return (
              <div key={step.id} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* アイコン */}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: isDone ? "var(--sage)" : isActive ? "#fff" : "rgba(255,255,255,0.5)",
                  border: isActive ? "2px solid var(--terracotta)" : "2px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: isDone ? "0 2px 8px rgba(124,148,130,0.4)" : isActive ? "0 0 0 4px rgba(201,119,87,0.15)" : "none",
                  transition: "all 0.3s",
                }}>
                  {isDone ? (
                    <span style={{ fontSize: 11, color: "#fff" }}>✓</span>
                  ) : isActive ? (
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--terracotta)",
                      animation: "pulse-dot 1.2s ease-in-out infinite",
                    }} />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(100,90,80,0.25)" }} />
                  )}
                </div>

                {/* テキスト */}
                <div style={{ flex: 1, paddingTop: 2 }}>
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: isActive ? 600 : 400,
                    color: isDone ? "var(--sage)" : isActive ? "var(--text)" : "var(--text-muted)",
                    transition: "color 0.3s",
                  }}>
                    {step.label}
                  </p>
                  <p style={{
                    margin: 0,
                    fontFamily: "var(--font-sans)", fontSize: 11.5,
                    color: isActive ? "var(--text-muted)" : "var(--text-dim)",
                  }}>
                    {step.sub} <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{step.time}</span>
                  </p>
                </div>
              </div>
            );
          })}

          <style>{`
            @keyframes pulse-dot {
              0%, 100% { opacity: 0.5; transform: scale(0.9); }
              50% { opacity: 1; transform: scale(1.1); }
            }
          `}</style>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div style={{
          padding: "12px 16px", borderRadius: "var(--r-md)",
          background: "var(--terracotta-glass)", border: "1px solid rgba(201,119,87,0.3)",
          fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--terracotta)",
        }}>
          ❌ {error}
        </div>
      )}

      {/* 完了（遷移前の一瞬表示） */}
      {done && (
        <div style={{
          padding: "14px 18px", borderRadius: "var(--r-md)",
          background: "var(--sage-glass)", border: "1px solid rgba(124,148,130,0.4)",
          fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--sage)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <span>生成完了！Drafts に移動します…</span>
        </div>
      )}

      {/* ヒント */}
      {!loading && !error && !done && (
        <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-dim)" }}>
          ⏱ Gemini が記事を分析して 21本（7切り口 × 3トーン）を生成します。約60秒かかります。
          <br />このページを離れても生成は続きます。完了後 Drafts に自動移動します。
        </p>
      )}
    </div>
  );
}
