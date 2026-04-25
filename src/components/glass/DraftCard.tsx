"use client";

interface DraftCardProps {
  id: string;
  angle: string;
  content: string;
  hashtags: string[];
  accent: string;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
}

export function DraftCard({
  id,
  angle,
  content,
  hashtags,
  accent,
  selected,
  index,
  onSelect,
  onApprove,
  onSkip,
}: DraftCardProps) {
  const charCount = content.length + hashtags.join(" ").length + 2;
  const charLimit = 280;
  const charRatio = Math.min(1, charCount / charLimit);

  return (
    <div
      onClick={() => onSelect(id)}
      style={{
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s",
        background: selected ? "var(--glass-bg-strong)" : "var(--glass-bg-subtle)",
        backdropFilter: selected ? "var(--glass-blur-strong)" : "blur(12px)",
        WebkitBackdropFilter: selected ? "var(--glass-blur-strong)" : "blur(12px)",
        border: selected
          ? "1px solid rgba(255,255,255,0.70)"
          : "1px solid rgba(255,255,255,0.35)",
        boxShadow: selected ? "var(--shadow)" : "none",
      }}
    >
      {/* Accent left stripe */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 10,
          bottom: 10,
          width: 3,
          borderRadius: "var(--r-pill)",
          background: accent,
          boxShadow: `0 0 8px ${accent}60`,
        }}
      />

      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          paddingLeft: 12,
        }}
      >
        {/* Angle badge */}
        <span
          style={{
            padding: "3px 10px",
            borderRadius: "var(--r-pill)",
            background: `${accent}20`,
            color: accent,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {angle}
        </span>

        {/* Draft number */}
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-dim)",
          }}
        >
          #{index + 1}
        </span>
      </div>

      {/* Content */}
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          lineHeight: 1.75,
          color: "var(--text)",
          margin: 0,
          paddingLeft: 12,
          marginBottom: 10,
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
        {hashtags.length > 0 && (
          <span style={{ color: accent, opacity: 0.8 }}>
            {"\n\n"}{hashtags.map((h) => `#${h}`).join(" ")}
          </span>
        )}
      </p>

      {/* Character count bar */}
      <div style={{ paddingLeft: 12, marginBottom: selected ? 12 : 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: charRatio > 0.9 ? "var(--terracotta)" : "var(--text-muted)",
            }}
          >
            {charCount}/{charLimit}
          </span>
        </div>
        <div
          style={{
            height: 3,
            borderRadius: "var(--r-pill)",
            background: "rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${charRatio * 100}%`,
              height: "100%",
              borderRadius: "var(--r-pill)",
              background: charRatio > 0.9 ? "var(--terracotta)" : accent,
            }}
          />
        </div>
      </div>

      {/* Action buttons (visible only when selected) */}
      {selected && (
        <div
          style={{
            display: "flex",
            gap: 8,
            paddingLeft: 12,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onApprove(id);
            }}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--r-pill)",
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              color: "#fff",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: `0 4px 12px ${accent}50`,
            }}
          >
            ✅ Approve &amp; Post
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSkip(id);
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--r-pill)",
              background: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.5)",
              backdropFilter: "blur(8px)",
              color: "var(--text-soft)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  );
}
