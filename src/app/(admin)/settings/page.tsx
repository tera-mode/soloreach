export default function SettingsPage() {
  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          border: "var(--glass-border)",
          borderRadius: "var(--r-xl)",
          padding: 32,
          boxShadow: "var(--shadow)",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--text)",
            margin: "0 0 8px",
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          サービス・接続設定はここで管理します。Sprint 1 で実装予定です。
        </p>
      </div>
    </div>
  );
}
