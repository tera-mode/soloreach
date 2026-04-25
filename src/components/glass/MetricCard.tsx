interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  hot?: boolean;
  progress?: number;
}

export function MetricCard({
  label,
  value,
  sub,
  accent,
  hot,
  progress,
}: MetricCardProps) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--r-xl)",
        padding: 18,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative radial gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 100,
          height: 100,
          background: `radial-gradient(circle at top right, ${accent}30, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Hot indicator */}
      {hot && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 10,
            height: 10,
            borderRadius: "var(--r-pill)",
            background: accent,
            boxShadow: `0 0 0 4px ${accent}25, 0 0 12px ${accent}80`,
          }}
        />
      )}

      {/* Label */}
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 11.5,
          fontWeight: 500,
          color: "var(--text-muted)",
          margin: 0,
          marginBottom: 8,
        }}
      >
        {label}
      </p>

      {/* Value + sub */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            fontWeight: 600,
            color: accent,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 11.5,
              color: "var(--text-muted)",
            }}
          >
            {sub}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div
          style={{
            marginTop: 14,
            height: 4,
            borderRadius: "var(--r-pill)",
            background: "rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, progress * 100))}%`,
              height: "100%",
              borderRadius: "var(--r-pill)",
              background: accent,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}
