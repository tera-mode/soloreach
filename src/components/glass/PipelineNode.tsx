type NodeState = "done" | "active" | "pending" | "idle";

interface PipelineNodeProps {
  label: string;
  sub?: string;
  state: NodeState;
  isLast?: boolean;
}

const STATE_STYLES: Record<
  NodeState,
  { bg: string; border: string; dot: string }
> = {
  done: {
    bg: "var(--sage)",
    border: "var(--sage)",
    dot: "#fff",
  },
  active: {
    bg: "#fff",
    border: "var(--terracotta)",
    dot: "var(--terracotta)",
  },
  pending: {
    bg: "var(--ochre)",
    border: "var(--ochre)",
    dot: "#fff",
  },
  idle: {
    bg: "rgba(255,255,255,0.5)",
    border: "rgba(150,140,130,0.4)",
    dot: "rgba(150,140,130,0.4)",
  },
};

export function PipelineNode({
  label,
  sub,
  state,
  isLast,
}: PipelineNodeProps) {
  const s = STATE_STYLES[state];

  return (
    <div style={{ display: "flex", gap: 12, position: "relative" }}>
      {/* Connector line */}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: 11,
            top: 22,
            bottom: -8,
            width: 1,
            background: "rgba(150,140,130,0.25)",
          }}
        />
      )}

      {/* Node circle */}
      <div style={{ flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "var(--r-pill)",
            background: s.bg,
            border: `2px solid ${s.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              state === "done"
                ? `0 2px 8px ${STATE_STYLES.done.bg}50`
                : state === "pending"
                ? `0 2px 8px ${STATE_STYLES.pending.bg}50`
                : "none",
          }}
        >
          {state === "done" ? (
            <span style={{ fontSize: 10, color: "#fff" }}>✓</span>
          ) : (
            <div
              style={{
                width: state === "active" ? 8 : 6,
                height: state === "active" ? 8 : 6,
                borderRadius: "var(--r-pill)",
                background: s.dot,
              }}
            />
          )}
        </div>

        {/* Active pulse ring */}
        {state === "active" && (
          <div
            className="pulse-ring"
            style={{
              position: "absolute",
              inset: -4,
              borderRadius: "var(--r-pill)",
              border: `2px solid var(--terracotta)`,
              opacity: 0.5,
            }}
          />
        )}
      </div>

      {/* Label */}
      <div style={{ paddingTop: 2, paddingBottom: 16 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sans)",
            fontSize: 12.5,
            fontWeight: 500,
            color: state === "idle" ? "var(--text-muted)" : "var(--text-soft)",
          }}
        >
          {label}
        </p>
        {sub && (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-dim)",
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
