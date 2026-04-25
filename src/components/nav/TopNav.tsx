"use client";

import { usePathname, useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/auth/firebase-client";
import { useAuth } from "@/contexts/AuthContext";

const NAV_TABS = [
  { label: "Inbox", href: "/inbox" },
  { label: "Published", href: "/published" },
  { label: "Learning", href: "/learning" },
  { label: "Settings", href: "/settings" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut(getAuth(getFirebaseApp()));
    router.replace("/login");
  }

  return (
    <nav
      className="glass"
      style={{
        position: "fixed",
        top: 20,
        left: 24,
        right: 24,
        height: 60,
        borderRadius: "var(--r-xl)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 16,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "linear-gradient(135deg, var(--terracotta), var(--ochre))",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          SoloReach
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-dim)",
          }}
        >
          v0.1
        </span>
      </div>

      {/* Tabs */}
      <div
        className="glass-subtle"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px",
          borderRadius: "var(--r-pill)",
          gap: 2,
          flex: 1,
          maxWidth: 420,
        }}
      >
        {NAV_TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              style={{
                flex: 1,
                padding: "6px 14px",
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
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Notification bell */}
      <button
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--r-pill)",
          background: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(255,255,255,0.5)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          position: "relative",
        }}
        aria-label="通知"
      >
        🔔
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: "var(--r-pill)",
            background: "var(--terracotta)",
          }}
        />
      </button>

      {/* User avatar */}
      <button
        onClick={handleSignOut}
        title="ログアウト"
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--r-pill)",
          background: "linear-gradient(135deg, var(--terracotta), var(--navy))",
          border: "2px solid rgba(255,255,255,0.7)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          flexShrink: 0,
        }}
        aria-label="ユーザーメニュー"
      >
        {user?.displayName?.[0]?.toUpperCase() ?? "U"}
      </button>
    </nav>
  );
}
