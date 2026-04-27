"use client";

import { usePathname, useRouter } from "next/navigation";
import { IconRss, IconFileDoc, IconCalendar, IconChart, IconPlug } from "@/components/icons/NavIcons";

const TABS = [
  { href: "/sources",  label: "ネタ元",     Icon: IconRss },
  { href: "/drafts",   label: "アイデア",   Icon: IconFileDoc },
  { href: "/reach",    label: "配信",       Icon: IconCalendar },
  { href: "/insights", label: "分析",       Icon: IconChart },
  { href: "/connect",  label: "コネクト",   Icon: IconPlug },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav
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
        background: "rgba(68, 34, 18, 0.94)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderTop: "1px solid rgba(180, 110, 70, 0.30)",
        boxShadow: "0 -4px 24px rgba(40, 20, 10, 0.30)",
      }}
    >
      {TABS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        const color = active ? "#FFCBA4" : "rgba(255, 200, 165, 0.52)";

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
                width: 28,
                height: 3,
                borderRadius: "0 0 4px 4px",
                background: "#FFCBA4",
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
