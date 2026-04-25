# SoloReach 要件定義書 v6（リーチ最大化版）

> Claude Code 向け実装指示書
> プロジェクトルート: `E:\dev\soloreach`
> 配置先: `E:\dev\soloreach\docs\requirements.md`（v5 を置き換え）
> 関連: `docs/requirements_v5.md`（旧版を退避保存）, `docs/x_reach_research.md`（リーチ調査レポート）

---

## 0. プロダクト概要（更新）

**プロダクト名**: SoloReach（ソロリーチ）
**ドメイン**: soloreach.life
**1行説明**: ソロプレナーがX上で**リーチを量産する**ためのドラフト工場 + 配信スケジューラ + 学習エンジン

**3行説明**:
> ネタ（自社SEO記事 / Googleトレンド / 公式RSS / 自由入力 / AI生成）から、
> アルゴリズム最適化済みのX投稿ドラフトを **1ネタにつき21本（7切り口×3トーン）自動量産**。
> 季節カレンダーと時間帯スロットに基づきストックから自動配信し、
> 拡張メトリクス（リプ・ブクマ・引用RT）で勝ちパターンを学習し続ける。

### 0.1 v5 からの主要変更点

| 項目 | v5 | v6 |
|---|---|---|
| KGI | 操作の最小化（Slack 1タップ） | **アカウント単位の月間ユニークリーチ** |
| ネタソース | RSS/Sitemap中心 | RSS/Sitemap + URL一括 + 自由入力 + AI生成 + Googleトレンド + 公式RSS |
| ドラフト生成数 | 1ネタ→3〜5本 | **1ネタ→21本（7切り口×3トーン）** |
| 投稿構造 | 本文+ハッシュタグ | **冒頭15字フック / 本文100〜140字 / URL分離 / セルフリプライ自動連投 / 長文ポスト並行生成** |
| 配信フロー | Slack即時タップ承認 | **ストック型運用 + 季節カレンダー連動 + 4スロット自動配信** |
| 計測指標 | impressions/engagements/clicks | + replies / quoteReposts / bookmarks / profileClicks / 派生指標 / TweepCred代理 |
| Slackの役割 | 唯一の必須操作場所 | 速報通知＋枯渇警告＋ストックレビュー誘導の補助役 |
| 監修フロー | なし | **断定表現フィルタ + 一次ソース引用フラグ + 単一運用者承認** |
| 動画生成 | なし | **静止画+テロップ短尺動画の自動生成**（Premium加入前提） |
| アカウント想定 | 1サービス1チャネル | **2サービス独立運用 + 将来3+サービスへ拡張可能なプリセット機構** |

---

## 1. 設計原則（更新）

### 1.1 究極のUX目標（再定義）

利用者の必須操作は次の **2点** のみ:

1. **週1回の Drafts 画面レビュー**（5〜10分で10〜20本の取捨選択）
2. **速報通知時の30分以内承認**（Slack→Web の動線）

それ以外（ネタ収集・ドラフト生成・配信・計測・学習）は完全自動化。

| 操作 | 担当 |
|---|---|
| 多様なソースからのネタ検知（RSS / Sitemap / 公式RSS / Googleトレンド） | AI（Vercel Cron + Cloud Tasks） |
| 手動ネタ投入（URL貼付 / 自由テキスト / AI生成依頼） | 人間（Web） |
| ネタ解析と要旨化 | AI（Gemini Flash） |
| 21ドラフト量産（7切り口×3トーン） | AI（Gemini Pro） |
| 静止画+テロップ動画生成 | AI（画像生成MCP + 動画組立） |
| **ストックから採用するドラフト選定** | **人間（週1回 / 必要時）** |
| **速報ネタの30分以内採否判断** | **人間（Slack push 経由）** |
| 配信スケジューリング・実行 | AI（Cloud Tasks scheduleTime） |
| 投稿+セルフリプライ自動連投 | AI |
| 拡張メトリクス計測（1h / 24h / 7d） | AI |
| 勝ちパターン抽出と次回プロンプト反映 | AI（週次） |

### 1.2 抽象化された汎用構造（更新）

```
[AI/人間] Idea収集（多様なSource）
   → [AI] ContentBase生成（要旨・キーポイント抽出）
   → [AI] DraftBatch生成（21本 = 7切り口 × 3トーン）★リーチ最適化制約付き
   → [AI/人間] Stock化（自動 or 手動承認、断定フィルタ通過必須）
   → [AI] Schedule配置（季節カレンダー + 時間帯スロット）
   → [AI] PublishExecution（本投稿 + URLセルフリプライ自動連投）
   → [AI] OutcomeMeasurement（拡張メトリクス）
   → [AI] KnowledgeUpdate（勝ちパターン抽出 → プロンプトに自動注入）
```

`ChannelAdapter` インタフェースとして抽象化（v5 から継続）。Sprint 0 では X のみ実装。Service プリセットの抽象化レベルを上げ、**3+サイトへのスケール時にコード変更ゼロで追加可能**な構造にする。

### 1.3 リーチ最大化のための5原則（実装に常時織り込む）

調査レポート（`docs/x_reach_research.md`）の結論を要件として固定化:

1. **会話を起こす設計**（リプ返信1往復 ≒ いいね150回分の重み）→ 末尾を必ず問いかけ/CTAで締める
2. **URLは本文に入れない**（必ずセルフリプライへ）→ スキーマレベルで分離
3. **冒頭15字で勝負、100〜120字で本文完結**（拡散ゾーン）→ バリデーション強制
4. **季節カレンダー駆動の事前ストック + ニュース時の即時対応の二段構え**
5. **「親しみのある専門家」トーンを2アカウント独立で貫く**

---

## 2. システム構成（更新）

### 2.1 全体アーキテクチャ

```
┌────────────────────────────────────────────────────────────────────────┐
│ [Trigger層]                                                             │
│   Vercel Cron 5分毎  → /api/cron/poll-trends   （Googleトレンド・公式RSS）│
│   Vercel Cron 15分毎 → /api/cron/poll-sources  （自社RSS/Sitemap/URLList）│
│   Vercel Cron 1時間毎 → /api/cron/dispatch-schedule（配信キュー消化）     │
│   Vercel Cron 6時間毎 → /api/cron/health-check （ストック残量・健康度）   │
│   Vercel Cron 週次   → /api/cron/build-knowledge                       │
│        │ CRON_SECRET 検証                                                │
│        ↓                                                                 │
│   各 Poller が新規 Idea を Firestore 保存 + Cloud Tasks 投入             │
│                                                                         │
│ [処理層 Cloud Tasks → Vercel API Route, OIDC検証]                       │
│   /api/tasks/generate-content-base   （Idea → ContentBase）             │
│   /api/tasks/generate-draft-batch    （ContentBase → 21 ChannelDraft）   │
│   /api/tasks/generate-creative       （静止画+テロップ動画生成）         │
│   /api/tasks/score-draft             （リーチ予測スコア算出）            │
│   /api/tasks/publish-draft           （本投稿 + セルフリプライ）         │
│   /api/tasks/measure-outcome         （1h/24h/7d 後）                   │
│   /api/tasks/build-knowledge         （週次勝ちパターン抽出）            │
│                                                                         │
│ [人間操作層 Web UI / Slack]                                              │
│   Web (Sources / Drafts / Schedule / Insights / Settings 5タブ)         │
│   Slack（速報push / 枯渇警告 / 週次レビュー誘導）                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Cloud Tasks キュー設計（更新）

| Queue 名 | 用途 | リトライ設定 | 並列度 |
|---|---|---|---|
| `idea-ingestion` | 新規Idea取り込み・要旨生成 | max 5, max 1h | 5 |
| `content-base-generation` | 記事から要旨生成（既存） | max 5, max 1h | 5 |
| `draft-batch-generation` | 21ドラフト生成 | max 3, max 1h | 3 |
| `creative-generation` | 静止画+動画生成 | max 3, max 30m | 2 |
| `draft-publish` | X投稿 + セルフリプライ | max 3, max 30m | 1（直列） |
| `outcome-measurement` | 投稿後計測 | max 3, max 30m | 5 |
| `knowledge-building` | 週次パターン抽出 | max 2, max 2h | 1 |
| `news-fast-track` | 速報ネタ専用（30分鮮度） | max 2, max 10m | 3 |

`draft-publish` を直列1にするのは、同一アカウントの2時間以内連投を防ぐため（後述 §6.5）。

---

## 3. セキュリティ要件

v5 §3 の内容を**全項目そのまま継承**（A. WIF / B. SA Key 暫定 / シークレット管理 / Claude Code 保護 / 依存対策 / GitHub Actions / アプリ層 / トークン保管 / チェックリスト）。v6 で追加するのは以下のみ:

### 3.9 v6 追加要件

- **断定表現フィルタ**（§9.1 参照）を投稿前に強制実行。検出時は `BLOCKED` ステータスで人手承認待ち
- **一次ソース引用フラグ**（§9.2）：`NEWS` 切り口のドラフトはソースURLが selfReplyText に必須
- **動画生成時の著作権チェック**：プロンプトに著名人/ブランド名を含めない（既存ルールを動画にも拡張）
- **Slack速報push時のレート制限**：1時間に最大10件のpushまで（DDoS的な大量プッシュ防止）

---

## 4. 技術スタック（更新）

v5 §4 をベースに以下を追加:

| 領域 | 採用 |
|---|---|
| Googleトレンド取得 | `google-trends-api`（npm）or 自前 fetch |
| 動画生成 | **ffmpeg.wasm** または Cloud Run 上の ffmpeg コンテナ（要選定） |
| 静止画生成 | 既存の画像生成MCP（v5 §9 を継承） |
| X 長文ポスト（Articles） | `twitter-api-v2`（X Premium 加入前提） |
| 形態素解析（フィルタ用） | `kuromoji.js` または `tinysegmenter` |
| キーワードトレンド検知 | 自前ロジック（`google-trends-api` の interestOverTime） |

**X Premium 加入前提**:
- 長文ポスト（Articles）の生成・投稿が可能
- リーチブースト 2〜4 倍を見込んだ KPI 設定
- 月額コストは v5 の月$30上限から **月$60上限** に引き上げ（X Premium $8/月＋ Articles 利用想定）

---

## 5. データモデル（更新）

### 5.1 コレクション構造

```
firestore/
├── services/{serviceId}                      ★拡張
├── contentSources/{sourceId}                 ★拡張
├── ideas/{ideaId}                             ★新規
├── channelConnections/{connectionId}          （継承）
├── contentBases/{baseId}                     ★ideaId 追加
├── channelDrafts/{draftId}                   ★大幅拡張
├── creativeAssets/{assetId}                   ★新規（旧imageAssetsを統合）
├── publishExecutions/{executionId}            （継承）
├── outcomeSnapshots/{snapshotId}             ★拡張
├── knowledgeEntries/{entryId}                ★構造化
├── scheduleRules/{ruleId}                     ★新規
├── seasonalEvents/{eventId}                   ★新規
├── channelHealthSnapshots/{snapshotId}        ★新規
└── generationLogs/{logId}                     （継承）
```

### 5.2 拡張・新規スキーマ

```typescript
// ─── Service（拡張）─────────────────────────────────────────
export const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  domain: z.string().url(),                       // 例: https://www.furusona.jp
  category: z.string(),                            // 例: "ふるさと納税" "税金・節税"
  defaultTone: z.enum(["formal", "friendly", "playful"]),
  defaultAngles: z.array(z.enum([                  // 重視する切り口の優先度順
    "DATA", "EMOTION", "STORY", "HOWTO",
    "QUESTION", "PARADOX", "NEWS"
  ])),
  persona: z.string(),                             // ペルソナ定義（プロンプト注入用）
  ctaText: z.string().nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  benchmarkAccounts: z.array(z.string()),          // 参考にするXアカウント
  riskFilters: z.object({
    forbiddenWords: z.array(z.string()),           // 例: ["絶対", "必ず", "100%"]
    requirePrimarySource: z.boolean(),             // NEWS切り口で一次ソース必須か
  }),
  premiumEnabled: z.boolean(),                     // X Premium 利用フラグ
  videoGenerationEnabled: z.boolean(),             // 動画生成を使うか
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Service = z.infer<typeof ServiceSchema>;

// ─── ContentSource（拡張）─────────────────────────────────────
export const SourceTypeSchema = z.enum([
  "RSS_FEED",        // 既存：自社ブログのRSS
  "SITEMAP",         // 既存：自社ブログのSitemap
  "URL_LIST",        // 新規：URLの一括ペースト
  "MANUAL_IDEA",     // 新規：自由テキスト入力
  "AI_PROMPT",       // 新規：テーマ指定でAIネタ生成
  "TREND_WATCH",     // 新規：Googleトレンド監視
  "OFFICIAL_RSS",    // 新規：総務省・国税庁・主要ポータルRSS
]);

export const ContentSourceSchema = z.object({
  serviceId: z.string(),
  type: SourceTypeSchema,
  mode: z.enum(["AUTO_POLL", "ON_DEMAND"]),
  config: z.record(z.unknown()),                   // type別設定（下記参照）
  enabled: z.boolean(),
  lastPolledAt: TimestampSchema.nullable().optional(),
  createdAt: TimestampSchema,
});

// config フィールドの type別構造（zodで type 分岐 discriminated union 推奨）:
//   RSS_FEED       : { url, etag?, lastModified? }
//   SITEMAP        : { url, includeRegex?, excludeRegex? }
//   URL_LIST       : { urls: string[] }
//   MANUAL_IDEA    : {} （Idea が随時追加される）
//   AI_PROMPT      : { theme, category, frequency: "daily"|"weekly", lastGeneratedAt? }
//   TREND_WATCH    : { keywords: string[], region: "JP", spikeThreshold: number }
//   OFFICIAL_RSS   : { url, ttlMinutes }

// ─── Idea（新規）─────────────────────────────────────────────
export const IdeaSchema = z.object({
  serviceId: z.string(),
  sourceId: z.string(),
  kind: z.enum(["URL", "TEXT", "TREND_KEYWORD", "AI_GENERATED"]),
  url: z.string().url().nullable().optional(),
  rawText: z.string().nullable().optional(),
  trendKeyword: z.string().nullable().optional(),
  trendVolume: z.number().nullable().optional(),    // Googleトレンド値
  freshnessExpiresAt: TimestampSchema.nullable().optional(),  // NEWS系の鮮度期限（30分後）
  status: z.enum(["NEW", "PROCESSED", "ARCHIVED", "STALE"]),
  contentBaseId: z.string().nullable().optional(),
  createdAt: TimestampSchema,
});

// ─── ContentBase（拡張: ideaId追加）────────────────────────
export const ContentBaseSchema = z.object({
  serviceId: z.string(),
  ideaId: z.string(),                              // ★新規
  sourceUrl: z.string().url().nullable().optional(),  // URL系のみ
  title: z.string(),
  rawContent: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  publishedAt: TimestampSchema.nullable().optional(),
  ingestedAt: TimestampSchema,
});

// ─── ChannelDraft（大幅拡張）───────────────────────────────
export const AngleSchema = z.enum([
  "DATA", "EMOTION", "STORY", "HOWTO",
  "QUESTION", "PARADOX", "NEWS"
]);
export const ToneSchema = z.enum(["formal", "friendly", "playful"]);
export const FormatSchema = z.enum([
  "TEXT", "IMAGE", "VIDEO", "POLL", "THREAD", "LONGFORM"
]);

export const DraftStatusSchema = z.enum([
  "PENDING_REVIEW",   // 生成直後・未確認
  "STOCKED",          // 採用済み・配信時刻未定
  "SCHEDULED",        // 配信時刻確定（Cloud Tasks 投入済み）
  "PUBLISHED",        // 配信完了
  "REJECTED",         // 没
  "FAILED",           // 配信失敗
  "STALE",            // NEWS切り口の鮮度切れ
  "BLOCKED",          // 断定表現等で人手承認待ち
]);

export const ChannelDraftSchema = z.object({
  contentBaseId: z.string(),
  serviceId: z.string(),
  channel: ChannelSchema,
  batchId: z.string(),                             // 同一21本セットを束ねるID
  
  // 切り口とトーン
  angle: AngleSchema,
  tone: ToneSchema,
  format: FormatSchema,
  
  // 投稿構造（リーチ最適化）
  hook: z.string().max(15),                        // 冒頭15字（独立フィールド）
  body: z.string().max(140),                       // 本文（URL含まず、最大140字）
  bodyShort: z.string().max(120).nullable(),       // 100〜120字版（拡散ゾーン）
  selfReplyText: z.string().max(280).nullable(),   // セルフリプライ用テキスト+URL
  longFormContent: z.string().nullable(),          // X記事（Articles）用長文版
  threadParts: z.array(z.string()).nullable(),     // スレッド用の各投稿
  
  // クリエイティブ
  creativeAssetId: z.string().nullable().optional(),
  
  // メタ
  hashtags: z.array(z.string()).max(2),            // 最大2個
  estimatedReachScore: z.number().min(0).max(100), // 事前リーチ予測スコア
  riskFlags: z.array(z.string()),                  // 検出された懸念（断定/一次ソース不足等）
  
  // ステータスとライフサイクル
  status: DraftStatusSchema,
  slackMessageTs: z.string().nullable().optional(),
  scheduledAt: TimestampSchema.nullable().optional(),
  freshnessExpiresAt: TimestampSchema.nullable().optional(), // NEWS系の鮮度期限
  createdAt: TimestampSchema,
  decidedAt: TimestampSchema.nullable().optional(),
});

// ─── CreativeAsset（新規 / imageAssets 統合）──────────────
export const CreativeAssetSchema = z.object({
  serviceId: z.string(),
  draftId: z.string().nullable().optional(),
  type: z.enum(["IMAGE", "VIDEO_TEXT_OVERLAY"]),
  prompt: z.string(),                              // 生成プロンプト全文
  gcsPath: z.string(),                             // gs://soloreach-creative-{drafts|public}/...
  durationSec: z.number().nullable().optional(),   // 動画のみ
  textOverlay: z.string().nullable().optional(),   // 動画のテロップ
  approved: z.boolean(),
  createdAt: TimestampSchema,
});

// ─── ScheduleRule（新規）───────────────────────────────────
export const ScheduleRuleSchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  name: z.string(),                                // "MORNING" "LUNCH" "GOLDEN" "WEEKEND" 等
  windows: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),           // 0=日, 1=月...
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
  })),
  preferredAngles: z.array(AngleSchema).nullable(),
  preferredFormats: z.array(FormatSchema).nullable(),
  fillFromStock: z.boolean(),                      // STOCKED から自動で枠を埋めるか
  maxPerDay: z.number(),                           // 1日上限
  minIntervalMinutes: z.number(),                  // 同一アカウントの最小間隔（既定120）
  enabled: z.boolean(),
  createdAt: TimestampSchema,
});

// ─── SeasonalEvent（新規）──────────────────────────────────
export const SeasonalEventSchema = z.object({
  serviceId: z.string(),
  name: z.string(),                                // 例: "ワンストップ特例締切"
  category: z.string(),                            // 例: "ふるさと納税"
  date: z.string(),                                // "MM-DD" 形式（年は毎年）
  ramp: z.object({
    startDaysBefore: z.number(),                   // 例: 14
    endDaysAfter: z.number(),                      // 例: 0
    boostFactor: z.number(),                       // ストック優先度倍率（例: 2.0）
  }),
  topicHints: z.array(z.string()),                 // ドラフト生成時の話題ヒント
  enabled: z.boolean(),
  createdAt: TimestampSchema,
});

// ─── OutcomeSnapshot（拡張）────────────────────────────────
export const OutcomeSnapshotSchema = z.object({
  publishId: z.string(),
  measuredAt: TimestampSchema,
  
  // 既存
  impressions: z.number(),
  engagements: z.number(),
  clicks: z.number(),
  
  // 新規（重要）
  likes: z.number(),
  reposts: z.number(),
  quoteReposts: z.number(),
  replies: z.number(),
  bookmarks: z.number(),
  profileClicks: z.number(),
  selfReplyClicks: z.number(),                     // セルフリプライURLのクリック
  
  // 派生指標（自動計算）
  replyRate: z.number(),                           // replies / impressions
  bookmarkRate: z.number(),
  quoteRate: z.number(),
  reachWeightedScore: z.number(),                  // アルゴリズム重みでの加重スコア
  
  raw: z.record(z.unknown()),                      // X API 生レスポンス
});

// ─── ChannelHealthSnapshot（新規）───────────────────────────
export const ChannelHealthSnapshotSchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  measuredAt: TimestampSchema,
  followers: z.number(),
  following: z.number(),
  ffRatio: z.number(),                             // following / followers
  postsLast7d: z.number(),
  avgReachLast7d: z.number(),
  avgReplyRateLast7d: z.number(),
  avgBookmarkRateLast7d: z.number(),
  blockEvents: z.number().nullable(),              // 取得可能な範囲で
  warnings: z.array(z.string()),                   // 異常検知のメッセージ
});

// ─── KnowledgeEntry（構造化）───────────────────────────────
export const KnowledgeEntrySchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  pattern: z.object({                              // 構造化された特徴
    angle: AngleSchema.nullable(),
    tone: ToneSchema.nullable(),
    format: FormatSchema.nullable(),
    lengthBand: z.enum(["short", "mid", "long"]).nullable(), // <100, 100-140, >140
    timeSlot: z.string().nullable(),               // "MORNING" 等
    hookPattern: z.string().nullable(),            // "数字" "問い" "ラベル" 等
  }),
  evidence: z.object({
    sampleDraftIds: z.array(z.string()),
    avgReachWeightedScore: z.number(),
    sampleCount: z.number(),
  }),
  insight: z.string(),                             // Geminiの自然言語洞察
  promptDelta: z.string(),                         // ドラフト生成プロンプトに注入する追加指示
  createdAt: TimestampSchema,
});
```

### 5.3 インデックス追加

```
ideas/{ideaId}                : serviceId + status + createdAt desc
channelDrafts/{draftId}       : serviceId + status + scheduledAt asc（配信キュー用）
                               serviceId + batchId（21本セット取得用）
                               serviceId + estimatedReachScore desc（高スコア順）
seasonalEvents/{eventId}      : serviceId + date asc
channelHealthSnapshots/...    : serviceId + measuredAt desc
```

### 5.4 Firestore Security Rules

v5 と同じ「認証owner全権」で継続。複数アカウント運用時は `services/{serviceId}` に `ownerId` を付与する設計を維持。

---

## 6. 機能要件（更新）

### 6.1 ChannelAdapter インタフェース（拡張）

```typescript
export interface ChannelAdapter {
  channel: string;
  
  // 21本生成（v5の3-5本から拡張）
  generateDraftBatch(
    base: ContentBase,
    service: Service,
    knowledge: KnowledgeEntry[],
    recentHooks: string[]
  ): Promise<DraftCandidate[]>;
  
  // 事前スコアリング（v6新規）
  scoreReach(draft: DraftCandidate, service: Service): Promise<number>;
  
  // 投稿+セルフリプライ自動連投（v6拡張）
  publish(
    draft: ChannelDraft,
    conn: ChannelConnection,
    creative?: CreativeAsset
  ): Promise<PublishResult>;
  
  // 拡張メトリクス取得
  measureOutcome(
    execution: PublishExecution,
    conn: ChannelConnection
  ): Promise<ExtendedOutcomeData>;
  
  // 長文ポスト対応（v6新規、Premium限定）
  publishLongForm?(
    draft: ChannelDraft,
    conn: ChannelConnection
  ): Promise<PublishResult>;
}
```

### 6.2 ContentSource Poller（更新）

#### 6.2.1 標準ポーラー（15分毎）
v5 と同じ。`RSS_FEED` `SITEMAP` `URL_LIST` を処理し、未処理URLを `idea-ingestion` キューへ投入。

#### 6.2.2 速報ポーラー（5分毎、新規）
- `TREND_WATCH` `OFFICIAL_RSS` を処理
- スパイク検知時に Idea 生成 + `freshnessExpiresAt = now + 30min` を設定
- `news-fast-track` キューへ投入し、即座に Slack へ「速報候補」push

#### 6.2.3 配信ディスパッチャ（1時間毎、新規）
- `STOCKED` 状態のドラフトから、現在時刻 ±30分の `ScheduleRule` 適合枠を探す
- 同一アカウント直近 `minIntervalMinutes` 以内の投稿があればスキップ
- 適合があれば `SCHEDULED` 化し `draft-publish` キューへ schedule_time 付き投入

#### 6.2.4 健康度チェック（6時間毎、新規）
- 各 Service のストック残量を計算（直近の配信ペース ÷ STOCKED本数）
- 3日分を切ったら Slack へ枯渇警告
- TweepCred 代理指標を `channelHealthSnapshots` に記録
- 異常値（FF比急変、エンゲージ率急落）検知で警告

### 6.3 Idea Ingestion（新規 / Cloud Tasks）

`/api/tasks/ingest-idea`:
- URL系: 本文取得 → `content-base-generation` キューへバトン
- TEXT系: そのまま `content-base-generation` へ（rawContent = rawText）
- TREND_KEYWORD系: トレンドキーワード + 関連ニュース上位3件を集約 → `content-base-generation` へ
- AI_GENERATED系: Service.persona + theme から Gemini にネタ案生成 → ContentBase 化

### 6.4 ContentBase Generator（v5 §6.3 を拡張）

入出力は v5 と同等。完了後は **必ず `draft-batch-generation` キューに投入** （v5 では条件付きだったが v6 では原則自動）。

### 6.5 DraftBatch Generator（新規 / v5 §6.4 の置き換え）

`/api/tasks/generate-draft-batch`:

**入力**: ContentBase ID + Service プロファイル + KnowledgeEntries + 直近30日の hook ブラックリスト

**処理**:
1. プロンプトに「**21本必須生成**: 7切り口 × 3トーン」を明示
2. 各ドラフトに対し以下のフィールドを埋める:
   - `hook`（15字以内）
   - `body`（140字以内、URL含まず、改行3〜5箇所推奨）
   - `bodyShort`（100〜120字の拡散ゾーン版、可能な場合）
   - `selfReplyText`（CTA + URL）
   - `hashtags`（0〜2個）
   - `angle`, `tone`, `format`
3. Service.premiumEnabled = true なら、**21本のうち上位3本に対して `longFormContent` も生成**
4. Service.videoGenerationEnabled = true なら、上位5本に対して `creative-generation` キューを別途投入
5. 各ドラフトに対し `score-draft` キューを投入

**出力**: 21 件の `ChannelDraft` を Firestore に保存（status = `PENDING_REVIEW`、batchId で束ねる）

**完了後の通知**:
- `creative-generation` の完了を待たず、まず Slack に「N件の新規ドラフトが Drafts 画面に追加されました」サマリ通知（個別ドラフトの即時タップは行わない）

### 6.6 リーチ予測スコアリング（新規 / Cloud Tasks）

`/api/tasks/score-draft`:

**算出式**（初期実装、Knowledge 蓄積後に係数自動調整）:

```
estimatedReachScore =
    + hookScore     × 0.30   // 冒頭15字の強度（数字/ラベル/問い検出）
    + lengthScore   × 0.20   // 100-120字に近いほど高得点
    + formatScore   × 0.15   // VIDEO=100, IMAGE=80, POLL=70, LONGFORM=60, TEXT=50
    + endingScore   × 0.10   // 質問/CTA終止か
    + saveValue     × 0.10   // チェックリスト/早見表/年表の検出
    + hashtagScore  × 0.05   // 0-2個=満点、3+=減点
    + emojiScore    × 0.05   // 0-2個=満点、3+=減点
    + knowledgeBoost× 0.05   // 過去の高スコアパターン類似度
```

範囲は0〜100に正規化。Drafts画面でこのスコア降順表示。

### 6.7 Creative Generation（新規 / Cloud Tasks）

`/api/tasks/generate-creative`:

**静止画生成**:
- 既存の画像生成MCP（v5 §9）を使用
- プロンプトは Gemini で「ドラフト本文 → 図解/比喩イメージ」へ変換
- 出力先: `gs://soloreach-creative-drafts/{serviceId}/{draftId}/image.png`

**静止画+テロップ動画生成**（v6新規、`videoGenerationEnabled` 時のみ）:
- 静止画（上記）+ テロップテキスト（hook + body の要約12字以内）
- ffmpeg.wasm または Cloud Run 上の ffmpeg で5〜10秒の縦動画（1080×1350）合成
- BGMなし、字幕付き、フェードイン/アウト
- 出力: `gs://soloreach-creative-drafts/{serviceId}/{draftId}/video.mp4`
- **CreativeAsset.type = "VIDEO_TEXT_OVERLAY"** で記録
- 動画は X 投稿時にネイティブ動画としてアップロード（リーチブースト目的）

### 6.8 配信実行（v5 §6.6 を拡張）

`/api/tasks/publish-draft`:

1. ドラフトを Firestore から取得
2. **断定表現フィルタ**を最終チェック（`riskFlags` 検証）
3. **同一アカウント直近2時間以内の投稿チェック**（トランザクションで `publishExecutions` を確認）
4. **頻度制限チェック**（v5 から継承）
5. 本投稿を実行（テキスト + creativeAsset があれば添付）
6. **成功したら即座に `selfReplyText` をリプライとして自動投稿**（同一トランザクション）
7. `PublishExecution` 保存、`outcome-measurement` キューを 1h/24h/7d で投入

### 6.9 OAuth・トークン管理

v5 §6.7 と同じ。X OAuth 2.0 PKCE + リフレッシュ自動更新。

### 6.10 Outcome Measurement Loop（拡張）

X API v2 で取得可能な拡張メトリクス:
- `public_metrics`: like_count, reply_count, retweet_count, quote_count, impression_count, bookmark_count
- `non_public_metrics`: profile_clicks, url_link_clicks（投稿者本人のみ取得可）
- `organic_metrics`: 同上の上位指標

**派生指標の自動計算**:
```
replyRate     = replies / impressions
bookmarkRate  = bookmarks / impressions  
quoteRate     = quoteReposts / impressions
reachWeightedScore = likes×1 + reposts×20 + replies×13.5 
                   + profileClicks×12 + clicks×11 + bookmarks×10
                   + (selfReplyEngaged ? 75 : 0)
```

### 6.11 Knowledge Loop（構造化）

週次で：
1. 直近4週の `(ChannelDraft, OutcomeSnapshot)` ペアを Firestore から取得
2. `reachWeightedScore` 上位10%を抽出
3. 上位群と全体の特徴量分布を比較し、有意な偏りを検出（angle / tone / format / lengthBand / timeSlot / hookPattern）
4. 各偏りを `KnowledgeEntry.pattern`（構造化）+ `insight`（自然言語）+ `promptDelta`（次回プロンプトへの追加指示）として保存
5. 次回の `generate-draft-batch` は `promptDelta` をプロンプトに自動注入

### 6.12 Slack 通知（再定義）

v5 で「唯一の必須操作場所」だった Slack を、v6 では **補助的な通知役** に変更:

| 通知種別 | タイミング | アクション可能 |
|---|---|---|
| 速報候補 | TREND_WATCH/OFFICIAL_RSS で新規検知時、即時 | `[速報を見る]`（Web の Drafts 画面の該当バッチへ）/ `[Skip]` |
| ドラフトバッチ完了 | 21本生成完了時、サマリのみ | `[Drafts を開く]`（個別タップなし） |
| ストック枯渇警告 | 残3日分以下、6時間ごと最大1回 | `[ネタを追加する]`（Sources画面へ） |
| 配信完了 | 投稿成功時 | `[投稿を見る]`（Xリンク） |
| 配信失敗 | 投稿失敗時 | `[再試行]` `[編集]` |
| 健康度警告 | 異常値検知時、24時間ごと最大1回 | `[Insights を開く]` |
| 週次レビューリマインダ | 月曜朝 | `[今週のドラフトを見る]` |

旧 v5 の Block Kit の Approve & Post ボタンは **速報のみ残す**（30分以内対応用）。通常時は Web UI への誘導が主。

---

## 7. UI 構成（更新）

### 7.1 トップタブ（5構成に変更）

```
[Sources]  [Drafts]  [Schedule]  [Insights]  [Settings]
```

旧 `Inbox / Published / Learning / Settings` は廃止。各タブの責務:

#### 7.1.1 Sources（ネタ）
- 登録済みソース一覧（種類別タブまたはフィルタ）
- **クイック追加**: URL1本貼付 / URL一括ペースト / フリーテキスト / AIネタ生成依頼
- 各ソースから生成された Idea / ContentBase の数と最終取得日時
- TREND_WATCH の現在のスパイク状況プレビュー

#### 7.1.2 Drafts（ストック）
- ドラフトカードリスト（フィルタ: アカウント / ステータス / 切り口 / トーン / フォーマット / 期間 / バッチ）
- ソート: **estimatedReachScore 降順がデフォルト**
- 一括操作: 承認（→STOCKED）/ 没（→REJECTED）/ 再生成 / スケジュール指定
- ストックメトリクス: 「現在 N 本、配信ペースで M 日分」をヘッダ常時表示
- バッチ表示モード: 同一 batchId の21本を切り口×トーンの7×3グリッドで一望

#### 7.1.3 Schedule（配信）
- カレンダー or タイムライン表示（週/月切替）
- 今後の予定 + 過去の履歴
- ScheduleRule 編集UI（4スロットの時間帯・曜日設定）
- SeasonalEvent 一覧と次回イベントカウントダウン
- 一時停止 / 再開トグル

#### 7.1.4 Insights（学習）
- パフォーマンス時系列（impressions / replyRate / bookmarkRate / reachWeightedScore）
- アカウント健康度（FF比 / 投稿頻度 / 異常値）
- 勝ちパターン（KnowledgeEntry）一覧と寄与度
- 上位投稿ランキング（reachWeightedScore順）

#### 7.1.5 Settings
- Service / ChannelConnection 管理
- OAuth接続（X / Slack）
- riskFilters / forbiddenWords 設定
- ユーザー設定

### 7.2 デザインシステム

`docs/design_request.md` の Glass Nordic スタイルを継続使用。新たに必要なコンポーネント:

- `BatchGridView`: 7×3 グリッドでドラフトを一覧
- `ReachScoreBadge`: 0-100 のスコアを色分け表示（緑80+/黄60-79/橙40-59/赤<40）
- `ScheduleCalendar`: 週/月ビューの配信カレンダー
- `HealthGauge`: アカウント健康度メーター
- `SeasonalCountdown`: 次回イベントまでのカウントダウン

---

## 8. 配信ルール（新規セクション）

### 8.1 デフォルトの4スロット

各 Service につき以下を初期設定（`ScheduleRule` として登録、ユーザーは自由編集可）:

| ScheduleRule.name | 曜日 | 時間帯 | 適合コンテンツ |
|---|---|---|---|
| `MORNING` | 月-金 | 7:30-8:30 | 短尺Tips、リマインダー |
| `LUNCH` | 月-金 | 12:10-12:50 | ニュース速報、軽い解説 |
| `GOLDEN` | 月-金（特に木） | 20:30-21:30 | 保存型・スレッド・長文・動画 |
| `WEEKEND` | 日 | 14:00-17:00 | 週末のお金見直し系 |

### 8.2 配信時の強制ルール

`publish-draft` 実行前に以下をすべて検証:

1. **同一アカウント直近2時間以内に投稿があれば配信延期**（連続投稿ペナルティ回避）
2. 同一トピック直近24時間以内の投稿があれば警告
3. 1日上限を超えない
4. **`NEWS` 切り口は `freshnessExpiresAt` 超過なら `STALE` 化、配信不可**
5. `STORY` / `HOWTO` / `DATA` 切り口はストック対象、24時間〜30日先の予約配信OK
6. `riskFlags` が空でなければ人手承認必須（`BLOCKED` 状態で停止）

### 8.3 季節カレンダー連動

初期データとして以下を `seasonalEvents` に投入:

| 名称 | 日付 | startDaysBefore | endDaysAfter | boostFactor |
|---|---|---|---|---|
| ワンストップ特例締切 | 01-10 | 14 | 0 | 2.5 |
| 確定申告期限 | 03-15 | 30 | 0 | 2.0 |
| 住民税決定通知配布 | 06-01 | 7 | 14 | 1.8 |
| ふるさと納税駆け込み | 12-31 | 45 | 0 | 3.0 |
| 年末調整書類提出 | 11-30 | 14 | 0 | 1.5 |

`boostFactor` はストック優先度の倍率。SeasonalEvent 期間中は該当 `category` のドラフトを優先配信。

### 8.4 ストック残量モニタリング

`/api/cron/health-check` が6時間毎に実行:

```
ストック残日数 = STOCKED本数 / (直近7日の平均配信本数/日)
```

- 3日分未満 → Slack警告（24時間に1回まで）
- 1日分未満 → Slack緊急警告 + Sources画面で「ネタ追加してください」バナー表示

---

## 9. リスク管理（新規セクション）

### 9.1 断定表現フィルタ

ドラフト生成後、`publish-draft` 実行前に以下のNG表現を kuromoji.js で形態素解析しつつ検出:

**NGリスト（初期）**:
- 「絶対」「必ず」「100%」「保証」（断定）
- 「○円儲かる」「○万円戻る」「○○の節税効果」（個別断定）
- 「最安」「業界No.1」「最強」（景表法リスク）
- 「裏ワザ」「バレない」「グレー」（脱税誘導懸念）

**処理**:
- 検出 → `riskFlags` に追加 → status を `BLOCKED`
- Slack に「監修必要」通知（速報通知と区別）
- 運用者が Web UI で確認・修正・承認

NGリストは `Service.riskFilters.forbiddenWords` でアカウント別に追加可能。

### 9.2 一次ソース引用フラグ

`Service.riskFilters.requirePrimarySource = true` のとき:
- `angle = NEWS` のドラフトは `selfReplyText` に**ホワイトリストドメイン（総務省 / 国税庁 / 主要ポータル）のURL**を含むことを必須化
- 含まなければ `riskFlags` に "missing_primary_source" を追加 → `BLOCKED`

ホワイトリスト初期値:
- `*.soumu.go.jp`, `*.nta.go.jp`
- `furusato-tax.jp`, `satofull.jp`, `furunavi.jp`, `rakuten.co.jp`（ふるさと納税）
- `mhlw.go.jp`, `cao.go.jp`（医療費控除等）

### 9.3 監修者承認フロー（運用者一人の場合）

運用者が単一なので、以下の二段構えで安全網を張る:

1. **自動フィルタ**（§9.1, §9.2）で危険ドラフトは `BLOCKED`
2. **PENDING_REVIEW → STOCKED の遷移時**に、`riskFlags` が非空なら強制的に確認モーダル表示

`Service.requiresHumanApproval` フラグは継続して持つ（将来の監修者追加時の拡張用）。現状は riskFlags 駆動のチェックで運用者一人を支援。

---

## 10. アカウント別プリセット

### 10.1 Service プリセット機構

将来の3+サイト拡張に対応するため、Service の初期データを **JSON プリセットファイル** で管理:

```
src/lib/presets/
├── furusatoNozei.json      // ふるさと納税系のテンプレ
├── taxSaving.json          // 税金・節税系のテンプレ
└── (将来追加分).json
```

新サービス追加時は、Web UIで「カテゴリ選択 → プリセット読込 → 微調整」の3ステップで完了。

### 10.2 furusona.jp プリセット（ふるさと納税）

```json
{
  "name": "ふるソナ",
  "category": "ふるさと納税",
  "domain": "https://www.furusona.jp",
  "defaultTone": "friendly",
  "defaultAngles": ["DATA", "HOWTO", "NEWS", "STORY", "PARADOX", "QUESTION", "EMOTION"],
  "persona": "ふるさと納税の比較サイト『ふるソナ』運営チームの中の人。親しみのある専門家として、お得情報や実践Tipsを発信する。",
  "ctaText": "詳しくはbioのリンクから",
  "benchmarkAccounts": ["@furusatoguide", "@rakutennozei", "@furunavi_pr", "@furusato_tax", "@mifurusato"],
  "riskFilters": {
    "forbiddenWords": ["絶対お得", "確実に儲かる", "100%還元"],
    "requirePrimarySource": true
  },
  "premiumEnabled": true,
  "videoGenerationEnabled": true,
  "seasonalEvents": ["ワンストップ特例締切", "ふるさと納税駆け込み", "住民税決定通知配布"]
}
```

### 10.3 haraisugi.jp プリセット（税金・節税）

```json
{
  "name": "払いすぎ税金ナビ",
  "category": "税金・節税",
  "domain": "https://www.haraisugi.jp",
  "defaultTone": "friendly",
  "defaultAngles": ["HOWTO", "STORY", "PARADOX", "DATA", "QUESTION", "NEWS", "EMOTION"],
  "persona": "税金や節税の知識を、難しくなく実践的に伝える運営チーム。安心感と信頼性を重視。",
  "ctaText": "詳しい解説はbioのリンクから",
  "benchmarkAccounts": ["@zeiri4_com", "@hirotax", "@kento_0724", "@con_tax_", "@merad1984"],
  "riskFilters": {
    "forbiddenWords": ["絶対", "必ず", "100%", "裏ワザ", "バレない", "グレー", "脱税"],
    "requirePrimarySource": true
  },
  "premiumEnabled": true,
  "videoGenerationEnabled": true,
  "seasonalEvents": ["確定申告期限", "住民税決定通知配布", "年末調整書類提出"]
}
```

### 10.4 アカウント独立運用の徹底

- 2つの Service は完全に独立した X / Slack チャネルで運用
- `ChannelHealthSnapshot` も Service 別
- ただし Settings に「相互引用RT候補」機能を将来追加（共通テーマ時のクロスリーチ）

---

## 11. 監視・SLO

### 11.1 重要KPI（Insights画面の必須表示）

| 指標 | 目標値 | 6ヶ月達成目標 |
|---|---|---|
| 月間ユニークリーチ（imp） | 50万以上（2サービス合算） | 必須 |
| リプ率（replyRate） | 0.3%以上 | 維持 |
| ブクマ率（bookmarkRate） | 0.5%以上 | 維持 |
| 引用RT率（quoteRate） | 0.2%以上 | 維持 |
| 記事LPクリック数（月） | 1,000以上 | 必須 |
| ストック残日数の最低値 | 3日以上常時 | 維持 |
| アカウント健康度 | warnings 0件継続 | 維持 |

### 11.2 SLO（システム可用性）

| エンドポイント | SLO |
|---|---|
| `/api/cron/poll-trends`（5分毎） | 成功率99% |
| `/api/cron/poll-sources`（15分毎） | 成功率99% |
| `/api/tasks/publish-draft` | 成功率99.5%、p95 < 30秒 |
| `/api/tasks/measure-outcome` | 成功率95%（X API障害許容） |

### 11.3 コスト監視

月額上限 $60（v5 の $30 から引き上げ）:
- Gemini API: $20
- X Premium: $8
- X API（Articles含む）: $10
- Vercel Pro: $20（必要なら）
- GCP（Firestore + Cloud Tasks + Storage + Run）: $5
- 動画生成（ffmpeg.wasm でVercel上ならコスト増なし）

`generationLogs` でAPI使用量を追跡し、月初予測値が上限を超えたら警告。

---

## 12. API 設計（更新）

```
# Services / Sources / Settings（Firebase Auth 必須）
/api/services           CRUD
/api/sources            CRUD
/api/sources/quick-add  POST  # URL/テキストの即時投入
/api/schedule-rules     CRUD
/api/seasonal-events    CRUD

# Channels & Integrations
/api/channels                            CRUD
/api/integrations/slack/install          GET
/api/integrations/slack/callback         GET
/api/integrations/x/install              GET
/api/integrations/x/callback             GET

# Cron（CRON_SECRET 認証）
/api/cron/poll-sources                   POST  # 15分毎
/api/cron/poll-trends                    POST  # 5分毎（新規）
/api/cron/dispatch-schedule              POST  # 1時間毎（新規）
/api/cron/health-check                   POST  # 6時間毎（新規）
/api/cron/build-knowledge                POST  # 週次

# Cloud Tasks（OIDC 認証）
/api/tasks/ingest-idea                   POST  # 新規
/api/tasks/generate-content-base         POST
/api/tasks/generate-draft-batch          POST  # 21本生成
/api/tasks/generate-creative             POST  # 静止画+動画
/api/tasks/score-draft                   POST  # 新規
/api/tasks/publish-draft                 POST  # 本投稿+セルフリプライ
/api/tasks/measure-outcome               POST
/api/tasks/build-knowledge               POST

# Slack（署名検証）
/api/slack/interact                      POST

# Drafts（Firebase Auth 必須）
/api/drafts                              GET
/api/drafts/:id                          GET PATCH DELETE
/api/drafts/:id/regenerate               POST
/api/drafts/:id/approve                  POST  # → STOCKED
/api/drafts/:id/reject                   POST  # → REJECTED
/api/drafts/:id/schedule                 POST  # → SCHEDULED + 時刻指定
/api/drafts/:id/publish-now              POST  # 即時投稿（保険）
/api/drafts/batch/:batchId               GET
/api/drafts/batch/:batchId/regenerate-all POST

# Insights（Firebase Auth 必須）
/api/insights/overview                   GET
/api/insights/health                     GET
/api/insights/top-posts                  GET
/api/insights/knowledge                  GET
```

---

## 13. プロジェクト構造（差分）

v5 の構造に以下を追加:

```
src/
├── lib/
│   ├── reach/                          # 新規
│   │   ├── scoring.ts                  # estimatedReachScore算出
│   │   ├── filters.ts                  # 断定表現・一次ソースフィルタ
│   │   ├── hooks.ts                    # 冒頭フックパターン検出
│   │   └── format-validator.ts         # 100-140字、ハッシュタグ等の検証
│   ├── creative/                       # 新規
│   │   ├── image-generator.ts          # 既存MCPラッパ
│   │   └── video-composer.ts           # ffmpeg.wasm で動画合成
│   ├── presets/                        # 新規
│   │   ├── furusatoNozei.json
│   │   ├── taxSaving.json
│   │   └── loader.ts
│   ├── trends/                         # 新規
│   │   ├── google-trends.ts
│   │   └── spike-detector.ts
│   └── schedule/                       # 新規
│       ├── dispatcher.ts               # 配信ルール適用
│       ├── seasonal.ts                 # 季節カレンダー処理
│       └── interval-checker.ts         # 2時間ルールチェック
├── prompts/                            # 拡張
│   ├── generate-draft-batch.ts         # 21本生成プロンプト（新規）
│   ├── generate-content-base.ts        # 既存
│   ├── generate-ai-idea.ts             # AIネタ生成（新規）
│   └── build-knowledge.ts              # 構造化抽出（新規）
└── app/(admin)/
    ├── sources/                        # 旧 inbox の一部を移行
    ├── drafts/                         # 旧 inbox を発展
    ├── schedule/                       # 新規
    ├── insights/                       # 旧 learning を発展
    └── settings/                       # 既存
```

---

## 14. 実装順序（v5 §15 の置き換え）

### Sprint 0: v5 で完了済み相当
- 基盤・GCP・認証・Slack・X連携・1記事3-5本生成 → **完了**

### Sprint A: データモデル v6 移行
1. zod スキーマを v6 に拡張（Idea / 拡張 ChannelDraft / ScheduleRule / SeasonalEvent / 拡張 OutcomeSnapshot / ChannelHealthSnapshot / 構造化 KnowledgeEntry）
2. Firestore インデックス追加
3. 既存データの移行スクリプト作成（v5の3-5本ドラフトに angle/tone/format をデフォルト付与）

### Sprint B: ドラフト量産エンジン
4. `generate-draft-batch` 実装（21本生成プロンプト）
5. `score-draft` 実装（リーチ予測スコアリング）
6. `format-validator` / `filters` / `hooks` の実装
7. URL分離・セルフリプライ自動連投の `publish-draft` 改修
8. Drafts 画面の刷新（バッチビュー、スコア降順、フィルタ）

### Sprint C: 配信スケジューラ
9. `ScheduleRule` / `SeasonalEvent` の Firestore 設計と CRUD
10. `dispatch-schedule` Cron 実装
11. 季節カレンダー連動（boostFactor）
12. Schedule タブ実装（カレンダーUI）
13. 2時間ルール / 連投ペナルティチェック

### Sprint D: Sources 多様化
14. `ContentSource.type` 拡張（URL_LIST / MANUAL_IDEA / AI_PROMPT / TREND_WATCH / OFFICIAL_RSS）
15. Sources タブ実装（クイック追加UI）
16. Googleトレンド監視（`poll-trends` 5分毎）
17. 速報モード（`news-fast-track` キュー、30分鮮度、Slack push）

### Sprint E: クリエイティブ生成
18. 静止画生成パイプライン（既存MCP活用）
19. 静止画+テロップ動画合成（ffmpeg）
20. CreativeAsset 管理UI

### Sprint F: 計測と学習の高度化
21. 拡張メトリクス取得（X API v2 public_metrics + non_public_metrics）
22. 派生指標の自動計算（replyRate / bookmarkRate / quoteRate / reachWeightedScore）
23. ChannelHealthSnapshot 記録（6時間毎）
24. KnowledgeEntry 構造化（pattern / evidence / promptDelta）
25. プロンプトへの自動 promptDelta 注入
26. Insights タブ刷新

### Sprint G: 安全網と運用
27. 断定表現フィルタ（kuromoji.js）
28. 一次ソース引用フラグ
29. ホワイトリストドメイン管理
30. ストック残量モニタリング + Slack枯渇警告
31. WIF移行（v5 から繰越）

### Sprint H: スケール準備
32. Service プリセット機構（JSON ローダー）
33. 3+サービス対応の汎用化
34. Insights のサービス横断ビュー

---

## 15. 受け入れ基準（v6 / v5 §16 を完全置き換え）

### 機能面

1. 1ネタから 21 ドラフト（7切り口×3トーン）が `batchId` で束ねて生成される
2. 全ドラフトの `body` が140字以内で、URLが含まれていない
3. すべての本投稿で `selfReplyText` が自動連投される（90%以上の成功率）
4. 同一アカウント直近2時間以内の投稿が自動的にブロックされる
5. `NEWS` 切り口は `freshnessExpiresAt` 超過で `STALE` 化される
6. ストック残3日分以下で Slack 警告が発火する
7. SeasonalEvent 期間中は該当ドラフトの優先度が boostFactor 倍に引き上げられる
8. 投稿後 1h/24h/7d で reply / bookmark / quote / profileClicks 含む拡張メトリクスが記録される
9. 月次で KnowledgeEntry が3件以上抽出され、次回プロンプトに `promptDelta` が注入される
10. 断定表現・一次ソース不足を検出し `BLOCKED` で人手承認を強制する
11. `videoGenerationEnabled` の Service では、上位5本に対して静止画+テロップ動画が生成される
12. `premiumEnabled` の Service では、上位3本に対して長文ポスト版が並行生成される
13. Sources のクイック追加で、URL貼付・自由テキスト・AIネタ生成が動作する
14. 速報候補が検知から1分以内に Slack に push される
15. 速報の30分以内承認で投稿され、超過すると STALE 化する

### 事業面

16. **6ヶ月運用で月間ユニークリーチ50万 imp 以上**（2サービス合算）
17. **リプ率 0.3% 以上、ブクマ率 0.5% 以上**を維持
18. **記事LPへの月間流入 1,000クリック以上**（selfReplyClicks の合計）
19. ストックは常時5日分以上を維持

### セキュリティ面

20-26. v5 §16 の #9-15 をそのまま継承（チェックリスト全項目緑、E2E テスト PASS、シークレット非コミット、npm audit、SHA ピン留め、トークン暗号化、Security Rules）

### コスト面

27. 月間運用コストが合計 $60 以下

---

## 16. やらないこと（v5 §17 からの差分）

v5 §17 の項目は継続して「やらない」リストに含む。v6 で**新たに「やる」に格上げ**:
- ✅ Multi-account（2サービス独立運用、3+への拡張）
- ✅ ブランディング画面（Settings 内に最低限の見た目調整）
- ✅ 動画生成（静止画+テロップに限定）

v6 でも引き続き「やらない」:
- ❌ Auto-reply / Auto-DM / Mass follow/unfollow
- ❌ Real-time trend hijacking（速報乗りはOKだが、全自動の「乗っ取り」はNG）
- ❌ TikTok / Instagram Reels / YouTube Shorts
- ❌ DM マーケティング
- ❌ クラウド SaaS としての公開（自分用の限定運用が継続）
- ❌ 動画の音声・BGM・人物合成

---

## 17. 将来拡張（v5 §18 を更新）

| 拡張 | 必要な変更 |
|---|---|
| 3+サービス追加 | Service プリセット JSON 追加のみ（コード変更不要） |
| LINE 公式アカウント追加 | `LineAdapter` 実装 + Service.channels 拡張 |
| メルマガ追加（Resend等） | `NewsletterAdapter` 実装、ChannelDraft.format に "EMAIL" 追加 |
| note 自動投稿 | `NoteAdapter` を Computer Use 経由で |
| 監修者の追加（複数人運用） | ApprovalFlow エンティティ新設、`Service.requiresHumanApproval` を本格活用 |
| Brand Voice Import | Service 設定に X OAuth、過去ポスト100件→Gemini で文体抽出 |
| Evergreen Recycle | OutcomeSnapshot 上位20%を再ドラフト対象に（KnowledgeEntry の派生として） |
| 複数ユーザー対応（SaaS化） | Firebase Auth マルチテナント、Stripe |
| BigQuery 連携 | OutcomeSnapshot を BigQuery にエクスポート |
| クロス引用RT機能 | 同一運用者の2サービス間で共通テーマ時に互いに引用RT |
| 動画の高度化（音声/BGM） | 別途 SLA・著作権対応のうえで検討 |

---

## 18. v5 → v6 マイグレーション計画

### 18.1 データ移行

**新規エンティティ追加**: `Idea` `ScheduleRule` `SeasonalEvent` `ChannelHealthSnapshot` は新規作成のみ。

**ContentSource 拡張**:
```typescript
// 既存レコードに対するマイグレーション
existing.type = "RSS_FEED";  // または "SITEMAP"
existing.mode = "AUTO_POLL";
existing.config = { url: existing.url };
```

**ContentBase 拡張**:
```typescript
// 既存レコードに「Idea を後付け」する
const idea = await createIdea({
  serviceId: existing.serviceId,
  sourceId: <該当sourceId>,
  kind: "URL",
  url: existing.sourceUrl,
  status: "PROCESSED",
  contentBaseId: existing.id,
});
existing.ideaId = idea.id;
```

**ChannelDraft 拡張**:
```typescript
// 既存3-5本レコードに対し、デフォルト値を付与
existing.batchId = existing.contentBaseId;  // 暫定
existing.tone = "friendly";
existing.format = "TEXT";
existing.hook = existing.content.slice(0, 15);
existing.body = existing.content;
existing.selfReplyText = `詳しくは → ${article.url}`;
existing.estimatedReachScore = 50;  // デフォルト
existing.riskFlags = [];
```

**ChannelDraft.status 拡張**:
- 既存 `APPROVED` を `STOCKED` にリネーム
- 既存 `QUEUED` を `SCHEDULED` にリネーム
- それ以外はそのまま

### 18.2 デプロイ手順

1. Sprint A 完了時に schema migration スクリプトを dev で実行・検証
2. Firestore インデックス先行デプロイ（クエリエラー回避）
3. 段階的に新機能をフィーチャーフラグでON
4. v5 の Slack Block Kit ボタンは Sprint B 完了まで残し、Sprint C で速報通知のみに絞る
5. 旧 `inbox` ルートは Sprint B で `drafts` にリダイレクト

---

## 関連ドキュメント

- `CLAUDE.md` — Claude Code への開発ルール（v5 から継承）
- `docs/requirements_v5.md` — 旧版（参照用）
- `docs/x_reach_research.md` — リーチ最大化のための調査レポート（v6 の根拠）
- `docs/security.md` — セキュリティ運用詳細
- `docs/testing.md` — Playwright MCP テストガイド
- `docs/creative.md` — 画像生成 + 動画合成 ガイド（v6 で動画追記）
- `docs/cloud-tasks-setup.md` — GCP / Cloud Tasks セットアップ
- `docs/wif-setup.md` — Workload Identity Federation セットアップ
- `README.md` — セットアップ手順

---

**バージョン**: v6.0
**作成日**: 2026-04-25
**前提**: X Premium 加入済み、運用者一人、簡易動画自動生成、将来3+サービス拡張、Slack速報30分以内対応可能