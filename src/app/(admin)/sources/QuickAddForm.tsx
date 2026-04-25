"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

interface ServiceOption { id: string; name: string }
type Mode = "url" | "text";

const STEPS = [
  { label: "コンテンツを取得・解析中",     icon: "mdi:web",              time: "〜10秒" },
  { label: "Gemini Flash が要約を生成中",  icon: "mdi:lightning-bolt",   time: "〜15秒" },
  { label: "Gemini Pro が21本を量産中",    icon: "mdi:creation",         time: "〜40秒" },
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
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="input"
          style={{ padding: "9px 12px" }}
        >
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {/* モード切替 */}
      <div style={{ display: "flex", gap: 6 }}>
        {([["url", "mdi:link-variant", "URLを入力"], ["text", "mdi:pencil", "テキストを入力"]] as const).map(([m, icon, label]) => (
          <button
            key={m}
            onClick={() => { setMode(m); setInput(""); setError(null); }}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "8px", borderRadius: "var(--r-md)", border: "none", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: mode === m ? 700 : 500,
              background: mode === m ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.45)",
              color: mode === m ? "var(--text)" : "var(--text-muted)",
              boxShadow: mode === m ? "var(--shadow-soft)" : "none",
            }}
          >
            <Icon icon={icon} style={{ fontSize: 14 }} /> {label}
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
        {loading ? (
          <>
            <Icon icon="mdi:loading" style={{ fontSize: 16, animation: "spin-icon 1s linear infinite" }} />
            生成中…
          </>
        ) : (
          <>
            <Icon icon="mdi:creation" style={{ fontSize: 16 }} />
            ドラフトを21本生成する
          </>
        )}
      </button>

      <style>{`@keyframes spin-icon { to { transform: rotate(360deg); } }`}</style>

      {/* プログレス */}
      {loading && (
        <div className="card" style={{ borderRadius: "var(--r-md)" }}>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((s, i) => {
              const idx = i + 1;
              const done = step > idx;
              const active = step === idx;
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? "var(--sage)" : active ? "rgba(201,119,87,0.15)" : "rgba(200,190,180,0.20)",
                    border: active ? "2px solid var(--terracotta)" : "2px solid transparent",
                    transition: "all 0.3s",
                  }}>
                    {done
                      ? <Icon icon="mdi:check" style={{ fontSize: 14, color: "#fff" }} />
                      : <Icon icon={s.icon} style={{ fontSize: 14, color: active ? "var(--terracotta)" : "var(--text-dim)" }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0, fontFamily: "var(--font-sans)", fontSize: 12.5,
                      fontWeight: active ? 600 : 400,
                      color: done ? "var(--sage)" : active ? "var(--text)" : "var(--text-muted)",
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

      {/* 完了 */}
      {done && (
        <div style={{
          padding: "12px 14px", borderRadius: "var(--r-md)",
          background: "var(--sage-glass)", color: "var(--sage)",
          fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon icon="mdi:check-circle" style={{ fontSize: 18 }} />
          生成完了！Drafts に移動します…
        </div>
      )}

      {/* ヒント */}
      {!loading && !error && !done && (
        <p className="label" style={{ textAlign: "center" }}>
          約60秒かかります。このページを離れても生成は続きます。
        </p>
      )}
    </div>
  );
}
