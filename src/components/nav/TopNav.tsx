"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/auth/firebase-client";
import { useAuth } from "@/contexts/AuthContext";
import { IconCog, IconLogout, IconUserCircle } from "@/components/icons/NavIcons";

export function TopNav() {
  const router = useRouter();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut(getAuth(getFirebaseApp()));
    router.replace("/login");
  }

  function handleSettings() {
    setMenuOpen(false);
    router.push("/settings");
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 200,
      }}
    >
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="設定メニュー"
        style={{
          width: 40,
          height: 40,
          borderRadius: "var(--r-pill)",
          background: menuOpen
            ? "rgba(201,119,87,0.18)"
            : "rgba(255,255,255,0.72)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: menuOpen
            ? "1.5px solid rgba(201,119,87,0.40)"
            : "1px solid rgba(255,255,255,0.60)",
          boxShadow: "0 2px 10px rgba(40,35,30,0.12)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
        }}
      >
        <IconCog size={18} color={menuOpen ? "var(--terracotta)" : "var(--text-muted)"} />
      </button>

      {menuOpen && (
        <div
          className="glass"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
            zIndex: 300,
            padding: "6px",
          }}
        >
          {/* User info */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px 10px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.35)",
            marginBottom: 4,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--terracotta), var(--navy))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
            }}>
              {user?.displayName?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user?.displayName ?? "ユーザー"}
              </p>
              <p style={{
                margin: 0,
                fontSize: 11,
                color: "var(--text-dim)",
                fontFamily: "var(--font-sans)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user?.email ?? ""}
              </p>
            </div>
          </div>

          <MenuButton
            icon={<IconUserCircle size={15} color="var(--text-muted)" />}
            label="アプリ設定"
            onClick={handleSettings}
          />
          <MenuButton
            icon={<IconLogout size={15} color="var(--terracotta)" />}
            label="ログアウト"
            onClick={handleSignOut}
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 9,
        padding: "9px 10px",
        borderRadius: "var(--r-md)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 500,
        color: danger ? "var(--terracotta)" : "var(--text)",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "rgba(201,119,87,0.10)"
          : "rgba(255,255,255,0.55)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}
