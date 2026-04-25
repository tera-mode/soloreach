import type { ReactNode } from "react";

interface GlassPanelProps {
  title: string;
  sub?: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
  style?: React.CSSProperties;
}

export function GlassPanel({
  title,
  sub,
  action,
  onAction,
  children,
  style,
}: GlassPanelProps) {
  return (
    <div
      className="glass"
      style={{ borderRadius: "var(--r-xl)", overflow: "hidden", ...style }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "rgba(255,255,255,0.20)",
          borderBottom: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.015em",
            }}
          >
            {title}
          </span>
          {sub && (
            <span
              style={{
                marginLeft: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 11.5,
                color: "var(--text-muted)",
              }}
            >
              {sub}
            </span>
          )}
        </div>
        {action && (
          <button
            onClick={onAction}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              fontWeight: 500,
              color: "var(--terracotta)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            {action}
          </button>
        )}
      </div>

      {/* Panel body */}
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}
