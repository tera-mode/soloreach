"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  IconLogout,
  IconUserCircle,
  IconCog,
  IconCalendar,
  IconRss,
} from "@/components/icons/NavIcons";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

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
        <div className="card-header">
          <span className="card-title">アカウント</span>
          <IconUserCircle size={16} color="var(--text-dim)" />
        </div>
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

      {/* アプリ設定 */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">アプリ設定</span>
          <IconCog size={16} color="var(--text-dim)" />
        </div>
        <div className="card-body">
          {[
            { Icon: IconCalendar, label: "配信スケジュール設定", note: "Sprint C で実装予定" },
            { Icon: IconRss, label: "リスクフィルター管理", note: "Sprint C で実装予定" },
          ].map(({ Icon, label, note }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.25)",
              opacity: 0.55,
            }}>
              <Icon size={16} color="var(--text-muted)" />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>{label}</p>
                <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-dim)" }}>{note}</p>
              </div>
              <span style={{ color: "var(--text-dim)", fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
