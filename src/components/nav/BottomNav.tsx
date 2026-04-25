"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconRss, IconFileDoc, IconCalendar, IconChart, IconCog } from "@/components/icons/NavIcons";

const TABS = [
  { href: "/sources",  label: "ネタ元",   Icon: IconRss },
  { href: "/drafts",   label: "アイデア", Icon: IconFileDoc },
  { href: "/schedule", label: "配信",     Icon: IconCalendar },
  { href: "/insights", label: "分析",     Icon: IconChart },
  { href: "/settings", label: "設定",     Icon: IconCog },
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
        height: 64,
        borderRadius: "20px 20px 0 0",
        zIndex: 200,
        display: "flex",
        alignItems: "stretch",
        borderBottom: "none",
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        const color = active ? "var(--terracotta)" : "var(--text-muted)";

        return (
          <button
            key={href}
            onClick={() => router.push(href)}
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
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* アクティブインジケーター */}
            {active && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 24,
                height: 3,
                borderRadius: "0 0 4px 4px",
                background: "var(--terracotta)",
              }} />
            )}

            <Icon size={22} color={color} />

            <span style={{
              fontFamily: "var(--font-sans)",
              fontSize: 10,
              fontWeight: active ? 700 : 500,
              color,
              letterSpacing: "0.01em",
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
