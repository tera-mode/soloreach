import { FieldPath } from "@google-cloud/firestore";
import { getFirestore } from "@/lib/firestore/client";
import { getServiceIdsForCurrentUser } from "@/lib/auth/server-session";
import { QuickAddForm } from "./QuickAddForm";
import { IconRss, IconLink, IconText } from "@/components/icons/NavIcons";
import type { ContentSource } from "@/lib/firestore/schemas";

async function fetchData() {
  try {
    const db = getFirestore();
    const serviceIds = await getServiceIdsForCurrentUser(db);

    if (serviceIds.length === 0) {
      return { sources: [], services: [], history: [] };
    }

    const [sourcesSnap, servicesSnap, basesSnap] = await Promise.all([
      db.collection("contentSources")
        .where("serviceId", "in", serviceIds)
        .limit(20).get(),
      db.collection("services")
        .where(FieldPath.documentId(), "in", serviceIds).get(),
      db.collection("contentBases")
        .where("serviceId", "in", serviceIds)
        .limit(20).get(),
    ]);
    const sources = sourcesSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as ContentSource) }))
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    const services = servicesSnap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) ?? "未設定" }));
    const history = basesSnap.docs.map((d) => ({
      id: d.id,
      title: d.data().title as string,
      sourceUrl: d.data().sourceUrl as string | null,
      ingestedAt: (d.data().ingestedAt as { toMillis(): number })?.toMillis() ?? 0,
    }));
    const sortedHistory = history.sort((a, b) => b.ingestedAt - a.ingestedAt);
    return { sources, services, history: sortedHistory };
  } catch {
    return { sources: [], services: [], history: [] };
  }
}

export default async function SourcesPage() {
  const { sources, services, history } = await fetchData();
  const hasSources = sources.length > 0;

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-heading">Sources</h1>
      </div>

      {/* ─ クイック追加 ─ */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">ネタを追加して生成</span>
          <span style={{ color: "var(--terracotta)", fontSize: 16 }}>⚡</span>
        </div>
        <div className="card-body">
          <QuickAddForm services={services} />
        </div>
      </div>

      {/* ─ RSS ソース一覧 ─ */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">RSS / Sitemap</span>
          <span className="meta">{sources.length}件</span>
        </div>

        {!hasSources ? (
          <div className="empty-state">
            <IconRss size={40} color="var(--text-dim)" />
            <p className="empty-title">RSSソースが未登録</p>
            <p className="empty-sub">
              ブログの RSS URL を登録すると、新記事が出るたびに自動でドラフトを生成します
            </p>
            <AddRssInline />
          </div>
        ) : (
          <div>
            {sources.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.30)",
                }}
              >
                <span className="badge" style={{
                  background: s.enabled ? "var(--sage-glass)" : "rgba(200,190,180,0.25)",
                  color: s.enabled ? "var(--sage)" : "var(--text-muted)",
                  flexShrink: 0,
                }}>
                  {(s.type as string).replace("_", " ")}
                </span>
                <span style={{
                  fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-soft)",
                  flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {(s.config as Record<string, unknown>)?.url as string ?? s.id}
                </span>
                <span className="meta">
                  {s.lastPolledAt
                    ? new Date(s.lastPolledAt.toMillis()).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
                    : "未"}
                </span>
              </div>
            ))}
            <AddRssInline compact />
          </div>
        )}
      </div>

      {/* ─ 追加履歴 ─ */}
      {history.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">追加履歴</span>
            <span className="meta">{history.length}件</span>
          </div>
          <div>
            {history.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "10px 14px",
                  borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.30)" : "none",
                }}
              >
                {item.sourceUrl
                  ? <IconLink size={15} color="var(--text-muted)" />
                  : <IconText size={15} color="var(--text-muted)" />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-soft)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {item.title}
                  </p>
                  {item.sourceUrl && (
                    <p style={{
                      margin: "1px 0 0", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-dim)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {item.sourceUrl}
                    </p>
                  )}
                </div>
                <span className="meta" style={{ flexShrink: 0 }}>
                  {new Date(item.ingestedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddRssInline({ compact }: { compact?: boolean }) {
  return (
    <div style={{
      padding: compact ? "10px 14px" : "0",
      display: "flex", alignItems: "center", gap: 8,
      borderTop: compact ? "1px solid rgba(255,255,255,0.30)" : "none",
    }}>
      <span style={{ fontSize: 16, color: "var(--terracotta)" }}>＋</span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-muted)" }}>
        RSS URL を登録する（準備中）
      </span>
    </div>
  );
}
