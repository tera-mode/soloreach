"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ServiceOption {
  id: string;
  name: string;
}

type Mode = "url" | "text";

interface Result {
  draftCount: number;
  title: string;
  summary: string;
  batchId: string;
}

export function QuickAddForm({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [input, setInput] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string>("");

  async function handleSubmit() {
    if (!input.trim()) return;
    setError(null);
    setResult(null);

    startTransition(async () => {
      setStep("コンテンツを取得中…");

      const body = mode === "url"
        ? { url: input.trim(), serviceId: serviceId || undefined }
        : { text: input.trim(), serviceId: serviceId || undefined };

      try {
        setStep("Gemini が要約を生成中…");
        const res = await fetch("/api/sources/quick-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 409) {
            setError("この URL はすでに処理済みです。別のURLを試してください。");
          } else {
            setError(data.error ?? "エラーが発生しました");
          }
          return;
        }

        setResult(data as Result);
        setInput("");
        setStep("");
      } catch {
        setError("通信エラーが発生しました。再試行してください。");
      }
    });
  }

  const tabStyle = (active: boolean) => ({
    padding: "6px 18px",
    borderRadius: "var(--r-pill)",
    background: active ? "rgba(255,255,255,0.90)" : "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: 12.5,
    fontWeight: active ? 600 : 500,
    color: active ? "var(--text)" : "var(--text-muted)",
    boxShadow: active ? "var(--shadow-soft)" : "none",
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* サービス選択 */}
      {services.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>
            サービス:
          </span>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{
              padding: "6px 12px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.5)",
              fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text)",
              outline: "none",
            }}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* モード切替タブ */}
      <div style={{
        display: "inline-flex", padding: 4,
        borderRadius: "var(--r-pill)", background: "var(--glass-bg-subtle)",
        alignSelf: "flex-start", gap: 2,
      }}>
        <button style={tabStyle(mode === "url")} onClick={() => setMode("url")}>
          🔗 URL
        </button>
        <button style={tabStyle(mode === "text")} onClick={() => setMode("text")}>
          ✏️ フリーテキスト
        </button>
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
            disabled={isPending}
            style={{
              flex: 1, padding: "11px 16px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)",
              outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isPending || !input.trim()}
            style={{
              padding: "11px 22px", borderRadius: "var(--r-pill)",
              background: isPending ? "rgba(201,119,87,0.5)" : "var(--terracotta)",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(201,119,87,0.35)",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "生成中…" : "ドラフト生成"}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea
            placeholder="記事のアイデア、メモ、ネタなど何でも入力してください…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
            rows={4}
            style={{
              padding: "12px 16px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text)",
              resize: "vertical", outline: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isPending || !input.trim()}
            style={{
              alignSelf: "flex-end", padding: "10px 22px", borderRadius: "var(--r-pill)",
              background: isPending ? "rgba(201,119,87,0.5)" : "var(--terracotta)",
              color: "#fff", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: isPending ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(201,119,87,0.35)",
            }}
          >
            {isPending ? "生成中…" : "ドラフト生成"}
          </button>
        </div>
      )}

      {/* プログレス表示 */}
      {isPending && step && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: "var(--r-md)",
          background: "rgba(255,255,255,0.4)",
        }}>
          <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-soft)" }}>
            {step}
          </span>
          <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: "var(--r-md)",
          background: "var(--terracotta-glass)", color: "var(--terracotta)",
          fontFamily: "var(--font-sans)", fontSize: 13,
        }}>
          ❌ {error}
        </div>
      )}

      {/* 成功結果 */}
      {result && (
        <div style={{
          padding: "16px 18px", borderRadius: "var(--r-lg)",
          background: "var(--sage-glass)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <p style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                {result.draftCount}本のドラフトを生成しました
              </p>
              <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-muted)" }}>
                {result.title}
              </p>
            </div>
          </div>

          {result.summary && (
            <p style={{
              margin: 0, fontFamily: "var(--font-sans)", fontSize: 13,
              color: "var(--text-soft)", lineHeight: 1.6,
              padding: "8px 12px", borderRadius: "var(--r-md)",
              background: "rgba(255,255,255,0.4)",
            }}>
              {result.summary}
            </p>
          )}

          <button
            onClick={() => router.push("/drafts")}
            style={{
              alignSelf: "flex-start", padding: "9px 20px", borderRadius: "var(--r-pill)",
              background: "var(--sage)", color: "#fff",
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(124,148,130,0.4)",
            }}
          >
            Drafts で確認する →
          </button>
        </div>
      )}

      {/* ヒント */}
      {!result && !error && !isPending && (
        <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-dim)" }}>
          ⏱ Gemini Pro が記事を分析して 21本（7切り口×3トーン）を生成します。30〜60秒かかります。
        </p>
      )}
    </div>
  );
}
