"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  IconX,
  IconRss,
  IconSlack,
  IconBluesky,
  IconInstagram,
  IconLinkedIn,
  IconThreads,
  IconYouTube,
  IconNote,
  IconWebhook,
  IconCheck,
} from "@/components/icons/NavIcons";

type ServiceStatus = "connected" | "available" | "coming_soon";

interface ServiceDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: ServiceStatus;
  color: string;
  action?: () => void;
}

export default function ConnectPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [xConnected, setXConnected] = useState(false);
  const [showXForm, setShowXForm] = useState(false);

  useEffect(() => {
    if (params.get("x") === "connected") setXConnected(true);
  }, [params]);

  const services: ServiceDef[] = [
    {
      id: "x",
      label: "X (Twitter)",
      description: "OAuth 2.0 PKCE で接続。ドラフト承認後の自動投稿に使用します。",
      icon: <IconX size={20} color="#000" />,
      status: xConnected ? "connected" : "available",
      color: "#000000",
    },
    {
      id: "rss",
      label: "RSS フィード",
      description: "ネタ元の RSS フィードを追加して自動収集します。",
      icon: <IconRss size={20} color="#F26522" />,
      status: "available",
      color: "#F26522",
    },
    {
      id: "slack",
      label: "Slack",
      description: "ドラフトを Slack に通知し、ボタンで承認・却下できます。",
      icon: <IconSlack size={20} color="#4A154B" />,
      status: "coming_soon",
      color: "#4A154B",
    },
    {
      id: "bluesky",
      label: "Bluesky",
      description: "AT Protocol 経由でクロス投稿します。",
      icon: <IconBluesky size={20} color="#0085FF" />,
      status: "coming_soon",
      color: "#0085FF",
    },
    {
      id: "instagram",
      label: "Instagram",
      description: "Meta Graph API 経由でリール・フィードに投稿します。",
      icon: <IconInstagram size={20} color="#E1306C" />,
      status: "coming_soon",
      color: "#E1306C",
    },
    {
      id: "threads",
      label: "Threads",
      description: "Meta Threads API 経由でテキスト投稿します。",
      icon: <IconThreads size={20} color="#000000" />,
      status: "coming_soon",
      color: "#000000",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      description: "プロフェッショナル向けコンテンツをシェアします。",
      icon: <IconLinkedIn size={20} color="#0A66C2" />,
      status: "coming_soon",
      color: "#0A66C2",
    },
    {
      id: "youtube",
      label: "YouTube",
      description: "動画の説明文・コミュニティ投稿を自動生成します。",
      icon: <IconYouTube size={20} color="#FF0000" />,
      status: "coming_soon",
      color: "#FF0000",
    },
    {
      id: "note",
      label: "note",
      description: "長文記事を自動生成・投稿します。",
      icon: <IconNote size={20} color="#41C9B4" />,
      status: "coming_soon",
      color: "#41C9B4",
    },
    {
      id: "webhook",
      label: "Webhook",
      description: "任意のエンドポイントにイベントを送信します。",
      icon: <IconWebhook size={20} color="var(--navy)" />,
      status: "coming_soon",
      color: "var(--navy)",
    },
  ];

  const connected = services.filter((s) => s.status === "connected");
  const available = services.filter((s) => s.status === "available");
  const coming = services.filter((s) => s.status === "coming_soon");

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-heading">コネクト</h1>
      </div>
      <p style={{ margin: "-4px 0 4px", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-muted)" }}>
        各サービスと連携して自動投稿・通知を設定します
      </p>

      {/* Connected */}
      {connected.length > 0 && (
        <Section title="接続済み">
          {connected.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </Section>
      )}

      {/* Available */}
      <Section title="接続可能">
        {available.map((s) => {
          if (s.id === "rss") {
            return (
              <ServiceCard
                key={s.id}
                service={s}
                actionLabel="ネタ元へ"
                onAction={() => router.push("/sources")}
              >
                <RssConnectInfo />
              </ServiceCard>
            );
          }
          return (
            <ServiceCard
              key={s.id}
              service={s}
              expandedId={showXForm ? "x" : null}
              onExpand={(id) => setShowXForm(id === "x")}
            >
              {s.id === "x" && showXForm && (
                <XConnectForm serviceId={serviceId} setServiceId={setServiceId} />
              )}
            </ServiceCard>
          );
        })}
      </Section>

      {/* Coming soon */}
      <Section title="近日対応予定">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {coming.map((s) => (
            <ComingSoonCard key={s.id} service={s} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{
        margin: "0 0 8px 4px",
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        color: "var(--text-dim)",
        textTransform: "uppercase",
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  if (status === "connected") {
    return (
      <span style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: "var(--r-pill)",
        background: "var(--sage-glass)", color: "var(--sage)",
        fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600,
      }}>
        <IconCheck size={10} color="var(--sage)" />
        接続済み
      </span>
    );
  }
  return null;
}

function ServiceCard({
  service,
  expandedId,
  onExpand,
  actionLabel,
  onAction,
  children,
}: {
  service: ServiceDef;
  expandedId?: string | null;
  onExpand?: (id: string) => void;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}) {
  const isExpanded = expandedId === service.id;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div className="card-body">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          {/* Icon circle */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: `${service.color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${service.color}30`,
          }}>
            {service.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                {service.label}
              </span>
              <StatusBadge status={service.status} />
            </div>
            <p className="label" style={{ margin: 0 }}>{service.description}</p>
          </div>

          {service.status !== "connected" && onAction && (
            <button
              onClick={onAction}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "var(--r-pill)",
                background: "rgba(200,190,180,0.25)",
                color: "var(--text-muted)",
                border: "1px solid rgba(200,190,180,0.40)",
                fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {actionLabel ?? "開く"}
            </button>
          )}

          {service.status !== "connected" && onExpand && (
            <button
              onClick={() => onExpand(service.id)}
              style={{
                flexShrink: 0,
                padding: "6px 14px",
                borderRadius: "var(--r-pill)",
                background: isExpanded ? "rgba(200,190,180,0.25)" : "var(--terracotta)",
                color: isExpanded ? "var(--text-muted)" : "#fff",
                border: isExpanded ? "1px solid rgba(200,190,180,0.40)" : "none",
                fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isExpanded ? "閉じる" : "接続する"}
            </button>
          )}
        </div>

        {children && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.35)" }}>
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

function ComingSoonCard({ service }: { service: ServiceDef }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: "var(--r-lg)",
      background: "rgba(255,255,255,0.45)",
      border: "1px solid rgba(255,255,255,0.55)",
      display: "flex", alignItems: "center", gap: 10,
      opacity: 0.65,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: `${service.color}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {service.icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
          {service.label}
        </p>
        <p style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--text-dim)" }}>
          近日対応予定
        </p>
      </div>
    </div>
  );
}

function XConnectForm({ serviceId, setServiceId }: { serviceId: string; setServiceId: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p className="label" style={{ margin: 0 }}>
        Firestore の <code style={{ fontSize: 11, background: "rgba(0,0,0,0.06)", padding: "1px 4px", borderRadius: 4 }}>channelConnections</code> で Service ID を確認してください。
      </p>
      <input
        className="input"
        placeholder="Service ID"
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
      />
      <button
        className="btn-primary"
        style={{ justifyContent: "center" }}
        onClick={() => {
          if (serviceId) window.location.href = `/api/integrations/x/install?serviceId=${serviceId}`;
        }}
      >
        <IconX size={14} color="#fff" />
        X で認証する
      </button>
    </div>
  );
}

function RssConnectInfo() {
  return (
    <div style={{
      padding: "10px 12px", borderRadius: "var(--r-md)",
      background: "rgba(242,101,34,0.08)",
      fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-muted)",
      lineHeight: 1.6,
    }}>
      RSS フィードの追加は <strong>ネタ元</strong> タブの「クイック追加」から行えます。
    </div>
  );
}
