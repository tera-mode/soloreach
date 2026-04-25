"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck } from "@/components/icons/NavIcons";

interface ServiceOption { id: string; name: string }
type Mode = "url" | "text";

const STEPS = [
  { label: "コンテンツを取得・解析中",    emoji: "🌐", time: "〜10秒" },
  { label: "Gemini Flash が要約を生成中", emoji: "⚡", time: "〜15秒" },
  { label: "Gemini Pro が21本を量産中",   emoji: "✨", time: "〜40秒" },
];

export function QuickAddForm({ services }: { services: ServiceOption[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("url");
  const [input, setInput] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!input.trim() || loading) return;
    setError(null); setDone(false); setLoading(true); setStep(1);

    const t1 = setTimeout(() => setStep(2), 8000);
    const t2 = setTimeout(() => setStep(3), 22000);

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
      clearTimeout(t1); clearTimeout(t2);

      if (!res.ok) {
        setError(res.status === 409 ? "このURLはすでに処理済みです" : (data.error ?? "エラーが発生しました"));
        setLoading(false); setStep(0);
        return;
      }

      setDone(true); setLoading(false); setStep(0); setInput("");
      setTimeout(() => router.push(`/drafts?new=${data.batchId}`), 1000);
    } catch {
      clearTimeout(t1); clearTimeout(t2);
      setError("通信エラーが発生しました");
      setLoading(false); setStep(0);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* サービス選択 */}
      {services.length > 1 && (
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="input" style={{ padding: "9px 12px" }}>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* モード切替 */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["url", "text"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setInput(""); setError(null); }}
            style={{
              flex: 1, padding: "8px", borderRadius: "var(--r-md)", border: "none", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: mode === m ? 700 : 500,
              background: mode === m ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.45)",
              color: mode === m ? "var(--text)" : "var(--text-muted)",
              boxShadow: mode === m ? "var(--shadow-soft)" : "none",
            }}
          >
            {m === "url" ? "🔗 URLを入力" : "✏️ テキストを入力"}
          </button>
        ))}
      </div>

      {/* 入力欄 */}
      {mode === "url" ? (
        <input
          type="url"
          placeholder="https://example.com/article"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={loading}
          className="input"
        />
      ) : (
        <textarea
          placeholder="ネタのメモ、アイデア、記事の要点など…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          rows={3}
          className="input"
        />
      )}

      {/* 生成ボタン */}
      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading || !input.trim()}
        style={{ width: "100%", justifyContent: "center", opacity: loading || !input.trim() ? 0.55 : 1 }}
      >
        {loading ? "✨ 生成中…" : "✨ ドラフトを21本生成する"}
      </button>

      {/* プログレス */}
      {loading && (
        <div className="card" style={{ borderRadius: "var(--r-md)" }}>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((s, i) => {
              const idx = i + 1;
              const isDone = step > idx;
              const isActive = step === idx;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isDone ? "var(--sage)" : isActive ? "rgba(201,119,87,0.15)" : "rgba(200,190,180,0.20)",
                    border: isActive ? "2px solid var(--terracotta)" : "2px solid transparent",
                    transition: "all 0.3s",
                    fontSize: 14,
                  }}>
                    {isDone ? <IconCheck size={14} color="#fff" /> : s.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0, fontFamily: "var(--font-sans)", fontSize: 12.5,
                      fontWeight: isActive ? 600 : 400,
                      color: isDone ? "var(--sage)" : isActive ? "var(--text)" : "var(--text-muted)",
                    }}>
                      {s.label}
                    </p>
                    <span className="meta">{s.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: "var(--r-md)", background: "var(--terracotta-glass)", color: "var(--terracotta)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {done && (
        <div style={{ padding: "12px 14px", borderRadius: "var(--r-md)", background: "var(--sage-glass)", color: "var(--sage)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          ✅ 生成完了！Drafts に移動します…
        </div>
      )}

      {!loading && !error && !done && (
        <p className="label" style={{ textAlign: "center" }}>約60秒かかります。このページを離れても生成は続きます。</p>
      )}
    </div>
  );
}
