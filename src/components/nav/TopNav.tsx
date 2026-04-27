"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import { getFirebaseApp } from "@/lib/auth/firebase-client";
import { useAuth } from "@/contexts/AuthContext";
import { IconCog, IconLogout, IconUserCircle } from "@/components/icons/NavIcons";

export function TopNav() {
  const pathname = usePathname();
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

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav
      className="glass"
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        right: 16,
        height: 56,
        borderRadius: "var(--r-xl)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: "linear-gradient(135deg, var(--terracotta), var(--ochre))",
        }} />
        <span style={{
          fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 600, color: "var(--text)",
        }}>
          SoloReach
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Gear icon + dropdown */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="設定メニュー"
          style={{
            width: 36, height: 36, borderRadius: "var(--r-pill)",
            background: menuOpen ? "rgba(201,119,87,0.15)" : "rgba(255,255,255,0.6)",
            border: menuOpen
              ? "1.5px solid rgba(201,119,87,0.35)"
              : "1px solid rgba(255,255,255,0.5)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
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
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px 10px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.35)",
              marginBottom: 4,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, var(--terracotta), var(--navy))",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}>
                {user?.displayName?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.displayName ?? "ユーザー"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.email ?? ""}
                </p>
              </div>
            </div>

            {/* Settings */}
            <MenuButton
              icon={<IconUserCircle size={15} color="var(--text-muted)" />}
              label="アプリ設定"
              onClick={handleSettings}
              active={isActive("/settings")}
            />

            {/* Sign out */}
            <MenuButton
              icon={<IconLogout size={15} color="var(--terracotta)" />}
              label="ログアウト"
              onClick={handleSignOut}
              danger
            />
          </div>
        )}
      </div>
    </nav>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex", alignItems: "center", gap: 9,
        padding: "9px 10px",
        borderRadius: "var(--r-md)",
        background: active ? "rgba(201,119,87,0.10)" : "transparent",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 500,
        color: danger ? "var(--terracotta)" : "var(--text)",
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = danger
          ? "rgba(201,119,87,0.10)"
          : "rgba(255,255,255,0.55)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = active
          ? "rgba(201,119,87,0.10)"
          : "transparent";
      }}
    >
      {icon}
      {label}
    </button>
  );
}
