"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { GlassPanel } from "@/components/glass/GlassPanel";

export default function SettingsPage() {
  const params = useSearchParams();
  const [serviceId, setServiceId] = useState("");
  const [xConnected, setXConnected] = useState(false);

  useEffect(() => {
    if (params.get("x") === "connected") setXConnected(true);
  }, [params]);

  function handleXConnect() {
    if (!serviceId) {
      alert("Service ID を入力してください");
      return;
    }
    window.location.href = `/api/integrations/x/install?serviceId=${serviceId}`;
  }

  return (
    <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <GlassPanel title="X (Twitter) 接続">
        {xConnected && (
          <p style={{
            fontFamily: "var(--font-sans)", fontSize: 13,
            color: "var(--sage)", margin: "0 0 16px",
            padding: "8px 12px", borderRadius: "var(--r-md)",
            background: "var(--sage-glass)",
          }}>
            ✅ X アカウントを接続しました
          </p>
        )}

        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)", margin: "0 0 12px" }}>
          X OAuth 2.0 PKCE で接続します。接続後、ドラフトの配信が可能になります。
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Service ID (Firestore から確認)"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            style={{
              flex: 1, padding: "9px 14px", borderRadius: "var(--r-md)",
              border: "1px solid rgba(255,255,255,0.4)",
              background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)",
              fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text)",
              outline: "none",
            }}
          />
          <button
            onClick={handleXConnect}
            style={{
              padding: "9px 20px", borderRadius: "var(--r-pill)",
              background: "var(--navy)", color: "#fff",
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 12px rgba(58,74,92,0.4)",
            }}
          >
            𝕏 で接続
          </button>
        </div>

        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-dim)", margin: 0 }}>
          必要スコープ: tweet.read / tweet.write / users.read / offline.access
        </p>
      </GlassPanel>

      <GlassPanel title="その他の設定">
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          Sprint C（スケジューラー）以降で実装予定です。
        </p>
      </GlassPanel>
    </div>
  );
}
