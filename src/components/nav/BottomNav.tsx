"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";

const TABS = [
  { href: "/sources",  label: "ソース",    icon: "mdi:rss",                     activeIcon: "mdi:rss" },
  { href: "/drafts",   label: "ドラフト",  icon: "mdi:file-document-outline",    activeIcon: "mdi:file-document" },
  { href: "/schedule", label: "配信",      icon: "mdi:calendar-month-outline",   activeIcon: "mdi:calendar-month" },
  { href: "/insights", label: "分析",      icon: "mdi:chart-areaspline",         activeIcon: "mdi:chart-areaspline" },
  { href: "/settings", label: "設定",      icon: "mdi:cog-outline",              activeIcon: "mdi:cog" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
      className="glass"
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 520,
        height: 68,
        borderRadius: "var(--r-xl) var(--r-xl) 0 0",
        zIndex: 200,
        display: "flex",
        alignItems: "stretch",
        borderBottom: "none",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 4px",
              position: "relative",
            }}
          >
            {active && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 28,
                height: 3,
                borderRadius: "0 0 var(--r-pill) var(--r-pill)",
                background: "var(--terracotta)",
              }} />
            )}
            <Icon
              icon={active ? tab.activeIcon : tab.icon}
              style={{
                fontSize: 22,
                color: active ? "var(--terracotta)" : "var(--text-muted)",
                transition: "color 0.15s",
              }}
            />
            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              color: active ? "var(--terracotta)" : "var(--text-muted)",
              letterSpacing: "-0.01em",
              transition: "color 0.15s",
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
