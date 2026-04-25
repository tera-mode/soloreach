"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { IconLogout, IconCog, IconCalendar, IconRss } from "@/components/icons/NavIcons";
import { useAuth } from "@/contexts/AuthContext";

export default function SettingsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [serviceId, setServiceId] = useState("");
  const [xConnected, setXConnected] = useState(false);

  useEffect(() => {
    if (params.get("x") === "connected") setXConnected(true);
  }, [params]);

  async function handleSignOut() {
    const { getAuth, signOut } = await import("firebase/auth");
    const { getFirebaseApp } = await import("@/lib/auth/firebase-client");
    await signOut(getAuth(getFirebaseApp()));
    router.replace("/login");
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-heading">設定</h1>
      </div>

      {/* ユーザー情報 */}
      <div className="card">
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, var(--terracotta), var(--navy))",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 700,
            flexShrink: 0,
          }}>
            {user?.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
              {user?.displayName ?? "ユーザー"}
            </p>
            <p className="label">{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "8px 14px", borderRadius: "var(--r-pill)",
              background: "rgba(200,190,180,0.25)", border: "1px solid rgba(200,190,180,0.40)",
              color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer",
            }}
          >
            <IconLogout size={14} />
            ログアウト
          </button>
        </div>
      </div>

      {/* X 接続 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">X (Twitter) 接続</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)" }}>𝕏</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {xConnected && (
            <div style={{
              padding: "8px 12px", borderRadius: "var(--r-md)",
              background: "var(--sage-glass)", color: "var(--sage)",
              fontFamily: "var(--font-sans)", fontSize: 13, display: "flex", alignItems: "center", gap: 6,
            }}>
              ✅ X アカウントを接続しました
            </div>
          )}
          <p className="label">OAuth 2.0 PKCE で接続します。ドラフト承認後の自動投稿に必要です。</p>
          <input
            className="input"
            placeholder="Service ID（Firestore で確認）"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          />
          <button
            className="btn-primary"
            style={{ justifyContent: "center" }}
            onClick={() => { if (serviceId) window.location.href = `/api/integrations/x/install?serviceId=${serviceId}`; }}
          >
            <span style={{ fontWeight: 700 }}>𝕏</span>
            X で接続する
          </button>
        </div>
      </div>

      {/* その他 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Sprint C 以降で実装予定</span>
        </div>
        <div className="card-body">
          {[
            ["📅", "配信スケジュール設定"],
            ["🛡️", "リスクフィルター管理"],
            ["📡", "RSS ソース追加"],
          ].map(([emoji, label]) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.25)",
              opacity: 0.6,
            }}>
              <span style={{ fontSize: 16 }}>{emoji}</span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
              <span style={{ color: "var(--text-dim)", marginLeft: "auto", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
