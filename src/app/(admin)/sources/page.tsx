import { getFirestore } from "@/lib/firestore/client";
import { QuickAddForm } from "./QuickAddForm";
import { GlassPanel } from "@/components/glass/GlassPanel";
import type { ContentSource } from "@/lib/firestore/schemas";

async function fetchData() {
  try {
    const db = getFirestore();
    const [sourcesSnap, servicesSnap] = await Promise.all([
      db.collection("contentSources").orderBy("createdAt", "desc").limit(20).get(),
      db.collection("services").limit(5).get(),
    ]);
    const sources = sourcesSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as ContentSource),
    }));
    const services = servicesSnap.docs.map((d) => ({
      id: d.id,
      name: (d.data().name as string) ?? "（名前未設定）",
    }));
    return { sources, services };
  } catch {
    return { sources: [], services: [] };
  }
}

export default async function SourcesPage() {
  const { sources, services } = await fetchData();

  return (
    <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

      {/* クイック追加フォーム */}
      <GlassPanel title="ネタを追加してドラフト生成" sub="URL または フリーテキスト">
        <QuickAddForm services={services} />
      </GlassPanel>

      {/* 登録済みソース一覧 */}
      <GlassPanel
        title="登録済み RSS / Sitemap ソース"
        sub={`${sources.length}件`}
        action="追加"
      >
        {sources.length === 0 ? (
          <p style={{
            fontFamily: "var(--font-sans)", fontSize: 14,
            color: "var(--text-muted)", textAlign: "center", padding: "24px 0", margin: 0,
          }}>
            登録済みのソースはありません。
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sources.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", borderRadius: "var(--r-md)",
                  background: "rgba(255,255,255,0.3)",
                }}
              >
                <span style={{
                  padding: "2px 8px", borderRadius: "var(--r-pill)",
                  background: s.enabled ? "var(--sage-glass)" : "rgba(255,255,255,0.2)",
                  color: s.enabled ? "var(--sage)" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600,
                }}>
                  {s.type}
                </span>
                <span style={{
                  fontFamily: "var(--font-sans)", fontSize: 13,
                  color: "var(--text-soft)", flex: 1,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {(s.config as Record<string, unknown>)?.url as string ?? s.id}
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: "var(--text-dim)", flexShrink: 0,
                }}>
                  {s.lastPolledAt
                    ? new Date(s.lastPolledAt.toMillis()).toLocaleDateString("ja-JP")
                    : "未取得"}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
