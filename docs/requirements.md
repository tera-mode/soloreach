# SoloReach 要件定義書 v5（Google 系スタック版）

> Claude Code 向け実装指示書
> プロジェクトルート: `E:\dev\soloreach`
> 配置: `E:\dev\soloreach\docs\requirements.md`

---

## 0. プロダクト概要

**プロダクト名**: SoloReach（ソロリーチ）
**ドメイン**: soloreach.life
**1行説明**: 複数のB2Cツールを片手間で運営するソロプレナーのための、Slack 1タップで完結するSEO→X 自動展開ツール

**3行説明**:
> SEO記事を書いたら、Slackに「これXに投稿する？」と3〜5案がプッシュされる。
> 1つタップするだけで自動投稿。投稿結果は次回のドラフト品質に自動反映。
> Buffer の手間も、TweetHunter の値段も、Cowork の常時起動も要らない。

---

## 1. 設計原則

### 1.1 究極のUX目標

利用者の操作は**「Slackに届いたドラフトを選ぶ」だけ**。

| 操作 | 担当 |
|---|---|
| 新規SEO記事の検知 | AI（Vercel Cron） |
| 記事内容の理解と要約 | AI（Cloud Tasks 経由 → Gemini） |
| チャネル別ドラフト案の生成（3〜5本） | AI（Cloud Tasks 経由 → Gemini） |
| ドラフトの提示 | AI（Slack push） |
| **どれを採用するか選ぶ** | **人間（1タップ）** |
| 採用ドラフトのX投稿 | AI（API、頻度制限内なら即時／超過時は Cloud Tasks で遅延） |
| 投稿結果の計測・学習 | AI（Cloud Tasks の遅延ジョブで 1h/24h/7d 後に） |
| 次回プロンプト改善への反映 | AI（週次 Cloud Tasks） |

### 1.2 抽象化された汎用構造

```
[AI] ContentSource監視 → [AI] ContentBase生成
   → [AI] ChannelDraft生成 → [人間] ChannelDraft採用判定 ★唯一の必須操作
   → [AI] PublishExecution → [AI] OutcomeMeasurement → [AI] KnowledgeUpdate
```

`ChannelAdapter` インタフェースとして抽象化し、Sprint 0 では X のみ実装。

---

## 2. システム構成

### 2.1 全体アーキテクチャ

```
┌──────────────────────────────────────────────────────────────────┐
│ [Trigger]                                                        │
│   Vercel Cron (15分毎) → /api/cron/poll-sources                  │
│       │ (CRON_SECRET 検証)                                        │
│       ↓                                                           │
│   ContentSource Poller (Next.js API Route on Vercel)             │
│       │ 新規記事を検知                                            │
│       ↓                                                           │
│   Cloud Tasks へジョブ投入                                       │
│                                                                   │
│   ↓                                                              │
│   /api/tasks/generate-content-base (Vercel)                      │
│       │ OIDC token 検証 (Cloud Tasks署名)                         │
│       │ Gemini API で要旨・キーポイント生成                       │
│       │ Firestore に ContentBase 保存                             │
│       ↓                                                           │
│   Cloud Tasks へ次ジョブ投入                                     │
│       ↓                                                           │
│   /api/tasks/generate-channel-drafts (Vercel)                    │
│       │ Gemini API で 3〜5本ドラフト生成                          │
│       │ Firestore に ChannelDraft 保存                            │
│       │ Slack Bolt で Block Kit メッセージ送信                    │
└──────────────────────────────────────────────────────────────────┘
                          ↓
              ユーザーが Slack で 1タップ承認
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│   /api/slack/interact (Vercel)                                   │
│       │ Slack 署名検証                                            │
│       │ 頻度制限チェック                                          │
│       ├─ 即時投稿可 → X API v2 で投稿                            │
│       └─ 超過 → Cloud Tasks (schedule_time) で遅延投稿           │
│              ↓                                                    │
│   /api/tasks/publish-draft (Vercel)                              │
│       │ X API v2 POST /2/tweets                                  │
│       │ Firestore に PublishExecution 保存                        │
│       │ Slack に完了通知                                          │
│       │ Cloud Tasks へ計測ジョブを 1h/24h/7d 後に予約             │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│   /api/tasks/measure-outcome (Vercel)                            │
│       │ X API でインプレッション・エンゲージメント取得            │
│       │ Firestore に OutcomeSnapshot 保存                         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ [Weekly]                                                         │
│   Vercel Cron (週次) → /api/cron/build-knowledge                 │
│       │ Cloud Tasks へジョブ投入                                  │
│       ↓                                                           │
│   /api/tasks/build-knowledge (Vercel)                            │
│       │ Gemini で成功パターン抽出                                 │
│       │ Firestore に KnowledgeEntry 保存                          │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 なぜこの構成か

- **Vercel** = Next.js 実行環境としてのホスティング。開発体験とデプロイ速度を最大化
- **Cloud Tasks** = 非同期ジョブの本体。Vercel Cron は「定期実行のトリガー」専用にし、重い処理は Cloud Tasks → Vercel API Route で受ける形に分離
- **Firestore** = データ層。リレーショナル要求が低い SoloReach のワークロードに適合
- **Gemini API** = LLM。Google エコシステムで完結
- **Cloud Storage** = 画像生成 MCP の出力先（公開承認後）

---

## 3. セキュリティ要件 ★最重要

### 3.1 Vercel × GCP の認証戦略（最重要設計判断）

Vercel から GCP（Firestore, Cloud Tasks, Gemini, Cloud Storage）へアクセスする方式を以下に分ける。**MVP の Sprint 0 は B から始め、Sprint 2 までに A へ移行**することを目標とする。

#### A. 本命: Workload Identity Federation (WIF) — Vercel OIDC

長期 Service Account Key を保管しない設計。

仕組み:
1. GCP 側で Workload Identity Pool を作成し、Vercel の OIDC 発行者を信頼
2. Service Account を作成し、WIF Pool からの impersonation を許可
3. Vercel から `getVercelOidcToken()` で短命 OIDC トークンを取得
4. それを GCP の `iam.googleapis.com/projects/<num>/locations/global/workloadIdentityPools/...` で Service Account の短命アクセストークンに交換
5. その短命トークンで Firestore/Cloud Tasks/Gemini を呼ぶ

利点:
- Vercel に GCP の長期キーを保管しない
- Qiita 記事の OIDC 推奨と完全整合

実装上の注意:
- ライブラリ: `google-auth-library` の `ExternalAccountClient` を使う
- セットアップ手順を `docs/wif-setup.md` に記録

#### B. 暫定: Service Account Key + Vercel Env Vars

WIF の設定が固まるまでの暫定対応。

- Service Account を作成（最小権限：Firestore User、Cloud Tasks Enqueuer、Vertex AI User、Storage Object Admin）
- JSON キーをダウンロード
- **Vercel Env Vars に Encrypted で保存**（環境変数名: `GCP_SERVICE_ACCOUNT_JSON`）
- アプリ起動時に `GoogleAuth({ credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON) })` で読み込む
- Service Account Key の **JSON ファイルをローカルにダウンロードしたら即座に削除**（git や IDE のシンボリックリンクから漏洩する事故の防止）
- 90日に1回キーをローテーション

**遵守事項**:
- Service Account Key の JSON ファイルは `.env` 同等のシークレットとして扱う（ファイルとしてもコミット禁止、Claude Code への入力もしない）
- 必ず Vercel Encrypted Env Var に格納してから、ローカルファイルを削除する

### 3.2 シークレット管理

**原則**: 「コミットされた瞬間に漏洩した」と扱う。

**遵守事項**:

1. `.env` `.env.local` `.env.*.local` `*.json` （Service Account キー）を **絶対にコミットしない**。`.gitignore` で除外
2. すべてのシークレットは環境変数経由。コード・コメント・ドキュメントに直書きしない
3. 本番のシークレットは **Vercel Environment Variables (Encrypted)** で管理。`Production` / `Preview` / `Development` を分離
4. 開発と本番でキー分離:
   - X Developer App: 開発用と本番用を別アプリ
   - Slack App: 開発用と本番用を別アプリ
   - GCP プロジェクト: 開発用と本番用を別プロジェクト（推奨）または別データセット
5. `gitleaks` を pre-commit フックで動作。GCP Service Account Key パターンも検出対象に追加

### 3.3 Claude Code 開発時の追加保護

詳細は `CLAUDE.md` に記載。要点:

- `.env` 系・`*.json`（Service Account Key）を Claude Code は **読み取り・出力・コミット禁止**
- どんな状況でもシークレット値を会話に出力しない
- 自動生成ログ（`*.log`, `tmp/`, `.test-artifacts/`, `.creative-drafts/`）はコミット禁止

### 3.4 依存パッケージのサプライチェーン対策

参考: [Axios サプライチェーン攻撃で改めて考える package.json と GitHub Actions 再点検 (Qiita)](https://qiita.com/Cafebabe_TimeLapse/items/613cfb572a2b9c3da57a)

**遵守事項**:

1. `package-lock.json` を必ずコミット
2. `.npmrc` に `ignore-scripts=true` を設定
3. `npm audit` を CI で毎回実行、high/critical があれば fail
4. Dependabot を有効化

### 3.5 GitHub Actions のセキュリティ

1. すべての Marketplace Action は **コミットSHAでピン留め**
2. **Vercel デプロイには Vercel Git Integration を使う**（GitHub Actions を介さない構成）。GitHub Actions は Lint/Test のみに用途を限定
3. Workflow 権限を最小化（`permissions:` を明示）
4. `pull_request_target` 禁止

### 3.6 アプリケーション層

1. **入力検証**: 全 API エンドポイントで `zod` を使用
2. **Firestore Security Rules**: アプリケーションロジックに加え DB 層でもアクセス制御
3. **Slack 署名検証**: `/api/slack/interact` で `X-Slack-Signature` 検証
4. **X OAuth state 検証**: CSRF 対策で OAuth state パラメータ検証
5. **Cron エンドポイント認証**: Vercel Cron は `Authorization: Bearer <CRON_SECRET>` ヘッダーで認証
6. **Cloud Tasks エンドポイント認証**: Cloud Tasks が付与する OIDC トークンを Vercel API 側で検証（`google-auth-library` の `OAuth2Client.verifyIdToken`）
7. **レート制限**: 公開エンドポイント（OAuth callback、Slack interact）にレート制限
8. **HTTPS 強制**: HSTS ヘッダー設定
9. **CSP ヘッダー**: 外部リソース読み込み制限
10. **ログサニタイズ**: `pino` のリダクション機能で `authorization`, `cookie`, `*token*`, `*secret*`, `*key*` を自動マスク

### 3.7 トークン保管（X / Slack の OAuth トークン）

DB（Firestore）に保管する際:

- **AES-256-GCM で暗号化**してから保存
- `ENCRYPTION_KEY`（32バイト base64）を環境変数で管理
- 読み取り時のみ復号、メモリに長時間保持しない
- ログに出さない

### 3.8 セキュリティチェックリスト（毎リリース前確認）

```
[ ] .env 系および *.json (Service Account Key) が Git 履歴に存在しない
[ ] gitleaks がローカルおよび CI で動作
[ ] package-lock.json がコミットされている
[ ] .npmrc に ignore-scripts=true
[ ] npm audit で high/critical が 0
[ ] GitHub Actions が SHA ピン留め
[ ] Vercel の Production 環境変数が暗号化保存
[ ] Slack 署名検証が動作（テスト済み）
[ ] X OAuth state 検証が動作（テスト済み）
[ ] Cron エンドポイントが CRON_SECRET で保護
[ ] Cloud Tasks エンドポイントが OIDC で保護
[ ] Firestore に保管された OAuth トークンが暗号化されている
[ ] Firestore Security Rules がデプロイされている
[ ] HSTS / CSP ヘッダー設定
```

---

## 4. 技術スタック（確定）

| 領域 | 採用 |
|---|---|
| ランタイム | Node.js 20 LTS |
| パッケージマネージャ | npm（`ignore-scripts=true`） |
| フレームワーク | Next.js 15 (App Router) + TypeScript 5.x |
| ホスティング | **Vercel** |
| DB | **Firestore (Native mode)** |
| 非同期ジョブ | **Cloud Tasks** |
| LLM | **Gemini API**（`gemini-2.5-pro` を主、軽量な要旨生成は `gemini-2.5-flash`）|
| 認証（管理画面） | **Firebase Auth**（Google ログイン、シングルユーザー想定） |
| GCP 認証 | **Workload Identity Federation (Vercel OIDC)**、暫定で Service Account Key |
| 画像保管 | **Cloud Storage** |
| シークレット | Vercel Env Vars（暗号化）。MVP 後期に Secret Manager へ |
| バリデーション | zod |
| RSS | rss-parser |
| HTML 解析 | cheerio |
| Slack | @slack/bolt |
| X API | twitter-api-v2 |
| 暗号化 | node:crypto（組込）AES-256-GCM |
| ログ | pino + リダクション設定 |
| レート制限 | `@upstash/ratelimit`（Upstash Redis） |
| シークレット検出 | gitleaks |
| Cron トリガー | Vercel Cron（軽量、Cloud Tasksへの投入のみ） |
| デプロイ | Vercel Git Integration |
| テスト | Playwright + Playwright MCP |
| 画像生成 | 画像生成 MCP（`E:\dev\ai-crisis` を参照） |

**主要な GCP 用 SDK**:
- `@google-cloud/firestore`
- `@google-cloud/tasks`
- `@google-cloud/storage`
- `@google/generative-ai`（Gemini）
- `google-auth-library`（OIDC、WIF）
- `firebase-admin`（Firebase Auth）

---

## 5. データモデル（Firestore）

Firestore はリレーショナル DB ではないため、**クエリパターン駆動**で設計。型は TypeScript + zod で担保。

### 5.1 コレクション構造

平坦なルートコレクション構造を採用（複合インデックスでクエリ効率を確保）。

```
firestore/
├── services/{serviceId}
│       (フィールド: name, description, tone, persona, ctaText, ctaUrl,
│        hashtagPool, createdAt, updatedAt)
│
├── contentSources/{sourceId}
│       (フィールド: serviceId, type, url, enabled, lastPolledAt, createdAt)
│       インデックス: serviceId + enabled
│
├── channelConnections/{connectionId}
│       (フィールド: serviceId, channel,
│        encryptedCredentials, credentialsIv, credentialsTag,
│        enabled, maxPostsPerDay, maxPostsPerHour, minIntervalMinutes,
│        createdAt)
│       インデックス: serviceId + channel (unique)
│
├── contentBases/{baseId}
│       (フィールド: serviceId, sourceUrl (unique), title, rawContent,
│        summary, keyPoints[], publishedAt, ingestedAt)
│       インデックス: serviceId + ingestedAt desc
│       インデックス: sourceUrl (unique)
│
├── channelDrafts/{draftId}
│       (フィールド: contentBaseId, serviceId, channel, angle,
│        content, hashtags, imageAssetId, status,
│        slackMessageTs, scheduledAt, createdAt, decidedAt)
│       インデックス: serviceId + status + createdAt desc
│       インデックス: contentBaseId + createdAt desc
│       インデックス: status + createdAt asc (QUEUED 処理用)
│
├── publishExecutions/{executionId}
│       (フィールド: draftId, channel, externalId, externalUrl,
│        publishedAt, errorMessage, serviceId)
│       インデックス: serviceId + publishedAt desc (頻度制限用)
│       インデックス: draftId (1:1)
│
├── outcomeSnapshots/{snapshotId}
│       (フィールド: publishId, measuredAt, impressions,
│        engagements, clicks, raw)
│       インデックス: publishId + measuredAt desc
│
├── imageAssets/{assetId}
│       (フィールド: serviceId, prompt, gcsPath, source, approved,
│        createdAt)
│
├── knowledgeEntries/{entryId}
│       (フィールド: serviceId, channel, pattern, evidence,
│        insight, promptDelta, createdAt)
│       インデックス: channel + createdAt desc
│       インデックス: serviceId + createdAt desc
│
└── generationLogs/{logId}
        (フィールド: contextType, contextId, inputTokens, outputTokens,
         costUsd, createdAt)
        インデックス: createdAt desc (コスト集計用)
```

### 5.2 TypeScript 型 + zod スキーマ

`src/lib/firestore/schemas.ts` に集約。例:

```typescript
import { z } from "zod";
import { Timestamp } from "@google-cloud/firestore";

export const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  tone: z.string(),
  persona: z.string(),
  ctaText: z.string().nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  hashtagPool: z.string().nullable().optional(),
  createdAt: z.instanceof(Timestamp),
  updatedAt: z.instanceof(Timestamp),
});
export type Service = z.infer<typeof ServiceSchema>;

export const DraftStatus = z.enum([
  "PENDING_REVIEW",
  "APPROVED",
  "QUEUED",
  "REJECTED",
  "PUBLISHED",
  "FAILED",
]);
// ... ChannelDraft, PublishExecution, etc.
```

Firestore からの読み込み時は必ず zod で parse、書き込み前にも parse。

### 5.3 Firestore Security Rules

シングルユーザー想定の MVP では「認証された owner のみ全アクセス可能」というシンプルな構成。

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner() {
      return request.auth.uid in [
        // 環境変数 NEXT_PUBLIC_OWNER_UIDS から取得した UID
      ];
    }

    match /{collection}/{docId} {
      allow read, write: if isAuthenticated() && isOwner();
    }
  }
}
```

複数ユーザー対応時は `services/{serviceId}` に `ownerId` フィールドを追加し、各ドキュメントへのアクセス制御を強化する。

---

## 6. 機能要件

### 6.1 ChannelAdapter インタフェース（Sprint 0 で X のみ実装）

```typescript
// src/lib/channels/types.ts
export interface ChannelAdapter {
  channel: string;
  generateDrafts(
    base: ContentBase,
    service: Service,
    knowledge: KnowledgeEntry[],
    recentDraftPrefixes: string[]
  ): Promise<DraftCandidate[]>;
  publish(draft: ChannelDraft, conn: ChannelConnection): Promise<PublishResult>;
  measureOutcome(execution: PublishExecution, conn: ChannelConnection): Promise<OutcomeData>;
}
```

### 6.2 ContentSource Poller（Vercel Cron 15分毎）

- `Authorization: Bearer ${CRON_SECRET}` 検証
- 全有効ソースから RSS/Sitemap を取得し、未処理 URL を Cloud Tasks に投入
- ジョブ自体は重い処理を行わず、Cloud Tasks に委譲

### 6.3 ContentBase Generator（Cloud Tasks 経由）

- `/api/tasks/generate-content-base` で受信
- OIDC トークン検証（Cloud Tasks の HTTP target に設定した OIDC token）
- 入力: 記事 URL → 本文取得 → Gemini で要旨・キーポイント生成 → Firestore に保存
- 失敗時は Cloud Tasks のリトライポリシーに任せる（最大5回、指数バックオフ）

### 6.4 ChannelDraft Generator（Cloud Tasks 経由）

- `/api/tasks/generate-channel-drafts` で受信
- 入力: ContentBase ID + Service プロファイル + 過去の KnowledgeEntries + 直近30日の冒頭ブラックリスト
- 出力: Gemini で 3〜5本のXドラフト（異なる切り口、ハッシュタグ含む）
- Firestore に保存後、Slack Bolt で Block Kit メッセージを送信

### 6.5 Slack 通知

Block Kit メッセージで `[Approve & Post]` `[Skip]` `[全部却下]` `[3本とも再生成]` を1タップ操作。

### 6.6 Slack Interaction & Publish

- `/api/slack/interact` が受信
- 署名検証 → Firestore で頻度制限チェック
- 制限内なら即座に X 投稿（同期）
- 制限超過なら Cloud Tasks に schedule_time 付きで投入（次の枠が空くタイミング）

### 6.7 X Adapter 実装

OAuth 2.0 PKCE。`tweet.write`, `tweet.read`, `users.read`, `offline.access`。`twitter-api-v2` 使用。リフレッシュトークン自動更新。

### 6.8 Outcome Measurement Loop

投稿成功時、Cloud Tasks に以下を投入:
- 1時間後の計測ジョブ
- 24時間後の計測ジョブ
- 7日後の計測ジョブ

各ジョブが X API で計測し OutcomeSnapshot を保存。Vercel Cron でポーリングする必要がない。

### 6.9 Knowledge Loop

Vercel Cron（週次）→ Cloud Tasks `/api/tasks/build-knowledge` → 直近4週の (draft, outcome) を Gemini に与えてパターン抽出 → KnowledgeEntry に保存。

---

## 7. Cloud Tasks キュー設計

GCP プロジェクトに以下のキューを作成:

| Queue 名 | 用途 | リトライ設定 |
|---|---|---|
| `content-base-generation` | 記事から要旨生成 | max 5 retries, max 1h |
| `draft-generation` | ChannelDraft 生成 | max 5 retries, max 1h |
| `draft-publish` | X への遅延投稿 | max 3 retries, max 30m |
| `outcome-measurement` | 投稿後計測 | max 3 retries, max 30m |
| `knowledge-building` | 週次パターン抽出 | max 2 retries, max 2h |

各タスクは Vercel API Route を HTTP Target として実行。OIDC トークン認証必須。

詳細手順は `docs/cloud-tasks-setup.md` に記載（実装中に作成）。

---

## 8. テスト戦略（Playwright MCP）

### 8.1 方針

`E:\dev\ai-crisis` フォルダを参照し、同等の Playwright MCP セットアップを再現。

### 8.2 テスト環境分離

- 本番の X / Slack / Firestore に絶対接続しない
- Firestore は **Firebase Emulator Suite** をローカルで起動してテスト
- Cloud Tasks も **Cloud Tasks Emulator** または mock で代替
- Slack はテスト用ワークスペース、X はテスト用 dev app credentials

### 8.3 ディレクトリ構造

```
E:\dev\soloreach\
├── tests/
│   ├── e2e/                    # Playwright MCP テスト
│   ├── unit/                   # Vitest
│   ├── fixtures/               # 固定データ
│   └── helpers/
├── .test-artifacts/            # ★Git除外
└── playwright.config.ts
```

`.test-artifacts/` は `.gitignore` 済み、公開リポジトリ・本番デプロイにアップロードしない。

### 8.4 セキュリティ E2E テスト（必須）

- HTML/レスポンスにトークン文字列が含まれていないこと
- Slack 不正署名で 401
- Cron CRON_SECRET なしで 401
- Cloud Tasks 不正 OIDC で 401
- OAuth state 不一致で拒否
- Firestore Security Rules で未認証アクセスが拒否

---

## 9. 画像生成 MCP

### 9.1 方針

`E:\dev\ai-crisis` を参照し、同じ MCP / 設定を導入。

### 9.2 出力先（Cloud Storage 統合）

```
.creative-drafts/                    # ローカル開発時のみ、★Git除外
└── <serviceId>/<draftId>/<filename>

# Cloud Storage バケット（本番）
gs://soloreach-creative-drafts/      # 未承認、IAM で保護
gs://soloreach-creative-public/      # 承認済み公開アセット
```

ImageAsset.gcsPath で参照を保持。承認時に bucket を移し変える。

### 9.3 著作権

- 著名人の名前・既存ブランドのロゴを生成しない（プロンプトレベルで制約）
- ImageAsset.prompt にプロンプト全文を記録

---

## 10. プロジェクト構造

```
E:\dev\soloreach\
├── CLAUDE.md                       # ★Claude Code 向けルール（最上位、必読）
├── README.md                       # セットアップ手順
├── docs/
│   ├── requirements.md             # ★このファイル
│   ├── security.md                 # セキュリティ運用詳細
│   ├── testing.md                  # Playwright MCP ガイド
│   ├── creative.md                 # 画像生成 MCP ガイド
│   ├── cloud-tasks-setup.md        # GCP セットアップ手順
│   └── wif-setup.md                # Workload Identity Federation セットアップ
├── .env.example                    # ★コミットOK
├── .env                            # ★コミット禁止
├── .gitignore
├── .npmrc                          # ignore-scripts=true
├── .nvmrc                          # 20.x.x
├── .gitleaks.toml
├── .github/
│   └── workflows/                  # SHA ピン留め必須、Lint/Test のみ
├── firestore.rules                 # Firestore Security Rules
├── firestore.indexes.json          # 複合インデックス定義
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (admin)/                # 設定 UI（Firebase Auth 必須）
│   │   ├── api/
│   │   │   ├── cron/               # CRON_SECRET 検証
│   │   │   ├── tasks/              # Cloud Tasks OIDC 検証
│   │   │   ├── slack/              # Slack 署名検証
│   │   │   └── integrations/       # OAuth フロー
│   ├── lib/
│   │   ├── channels/               # ChannelAdapter
│   │   ├── firestore/
│   │   │   ├── client.ts           # Firestore クライアント初期化
│   │   │   └── schemas.ts          # zod スキーマ
│   │   ├── tasks/                  # Cloud Tasks クライアント
│   │   ├── gemini.ts               # Gemini API ラッパー
│   │   ├── crypto.ts               # AES-256-GCM
│   │   ├── auth/
│   │   │   ├── oidc.ts             # Cloud Tasks OIDC 検証
│   │   │   └── wif.ts              # Workload Identity Federation
│   │   ├── logger.ts               # pino + リダクション
│   │   ├── slack.ts
│   │   └── storage.ts              # Cloud Storage クライアント
│   ├── prompts/                    # Gemini プロンプト
│   └── middleware.ts
├── tests/
├── .test-artifacts/                # ★Git除外
├── .creative-drafts/               # ★Git除外
├── public/
├── package.json
├── package-lock.json               # ★必ずコミット
├── tsconfig.json
├── next.config.js
├── playwright.config.ts
└── vercel.json                     # Vercel Cron 定義
```

---

## 11. API 設計

```
# Services
/api/services       (CRUD、Firebase Auth 必須)
/api/sources        (CRUD、Firebase Auth 必須)

# Channels & Integrations
/api/channels                            (Firebase Auth 必須)
/api/integrations/slack/install          GET   # OAuth start
/api/integrations/slack/callback         GET   # state 検証
/api/integrations/x/install              GET
/api/integrations/x/callback             GET   # state 検証

# Cron (CRON_SECRET 認証、Cloud Tasks に投入のみ)
/api/cron/poll-sources                   POST
/api/cron/build-knowledge                POST  # 週次

# Cloud Tasks (OIDC 認証、実処理)
/api/tasks/generate-content-base         POST
/api/tasks/generate-channel-drafts       POST
/api/tasks/publish-draft                 POST
/api/tasks/measure-outcome               POST
/api/tasks/build-knowledge               POST

# Slack (署名検証)
/api/slack/interact                      POST

# Drafts (Firebase Auth 必須)
/api/drafts                              GET
/api/drafts/:id/regenerate               POST
/api/drafts/:id/publish                  POST  # Web からの保険
```

---

## 12. 環境変数（`.env.example`）

```env
# === Firebase / GCP ===========================================
GCP_PROJECT_ID="soloreach-dev"
GCP_LOCATION="asia-northeast1"

# 暫定: Service Account Key (JSON文字列、後にWIFへ移行)
# 生成: gcloud iam service-accounts keys create key.json --iam-account=...
# → JSONの中身を1行にエスケープして貼る
# ⚠️ ファイルとしてはコミット禁止、ローカルからも即削除
GCP_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# WIF 移行後（Sprint 2 以降）
# GCP_WIF_PROVIDER="projects/123/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-oidc"
# GCP_SERVICE_ACCOUNT_EMAIL="soloreach-vercel@...iam.gserviceaccount.com"

FIRESTORE_DATABASE_ID="(default)"
CLOUD_TASKS_QUEUE_LOCATION="asia-northeast1"
GCS_BUCKET_DRAFTS="soloreach-creative-drafts"
GCS_BUCKET_PUBLIC="soloreach-creative-public"

# === LLM ======================================================
GEMINI_API_KEY="xxxxxxxxxxxxxxxxxxxxxxxxxx"

# === Firebase Auth (管理画面アクセス) =========================
NEXT_PUBLIC_FIREBASE_API_KEY="xxxx"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="soloreach-dev.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="soloreach-dev"
NEXT_PUBLIC_OWNER_UIDS="abc123,def456"

# === Slack ====================================================
SLACK_CLIENT_ID="xxxx"
SLACK_CLIENT_SECRET="xxxx"
SLACK_SIGNING_SECRET="xxxx"
SLACK_BOT_TOKEN="xoxb-xxxx"
SLACK_NOTIFICATION_CHANNEL="C0XXXXX"

# === X (Twitter) ==============================================
X_CLIENT_ID="xxxx"
X_CLIENT_SECRET="xxxx"

# === Encryption ===============================================
ENCRYPTION_KEY="<32 bytes base64>"

# === Cron ====================================================
CRON_SECRET="<random hex>"

# === Rate Limit ==============================================
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="xxxx"

# === App =====================================================
APP_BASE_URL="http://localhost:3000"
APP_NAME="SoloReach"
NODE_ENV="development"
```

---

## 13. GCP プロジェクトのセットアップ

実装者は以下を実施:

1. GCP プロジェクトを作成（dev 用と prod 用、それぞれ別プロジェクト推奨）
   - 例: `soloreach-dev`, `soloreach-prod`
2. 必要な API を有効化:
   - Firestore API
   - Cloud Tasks API
   - Cloud Storage API
   - Generative Language API（Gemini）
   - IAM Service Account Credentials API
   - Identity and Access Management (IAM) API
3. Firestore データベースを作成（Native mode、リージョン `asia-northeast1`）
4. Cloud Tasks キューを5つ作成（§7 参照）
5. Cloud Storage バケットを2つ作成（drafts, public）
6. Service Account を作成し、最小権限を付与:
   - `roles/datastore.user`
   - `roles/cloudtasks.enqueuer`
   - `roles/storage.objectAdmin`（drafts バケット）
   - `roles/storage.objectViewer`（public バケット）
   - `roles/aiplatform.user`（Gemini）
7. Sprint 0 では Service Account Key を生成し、Vercel Env Vars に保存
8. Sprint 2 で Workload Identity Federation に移行（手順は `docs/wif-setup.md`）

詳細手順は `docs/cloud-tasks-setup.md` および `docs/wif-setup.md` で（実装中に作成）。

---

## 14. Slack App / X Developer Portal 設定

### 14.1 Slack App

- App名: SoloReach (Dev) / SoloReach (Prod)
- Scopes: `chat:write`
- Interactivity: ON、Request URL = `<DEPLOY_URL>/api/slack/interact`

### 14.2 X Developer Portal

- App名: SoloReach (Dev) / SoloReach (Prod)
- OAuth 2.0 ON、Type of App: Web App
- Redirect URI: `<DEPLOY_URL>/api/integrations/x/callback`
- Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- 課金: pay-per-use、月$10 上限

---

## 15. 実装順序

### Sprint 0: 基盤・GCP セットアップ

1. プロジェクト初期化（Next.js 15 + TypeScript）、`.npmrc` `.gitignore` `.gitleaks.toml` 配置
2. `CLAUDE.md` 配置
3. **GCP プロジェクト作成**、Firestore / Cloud Tasks キュー / Storage バケット作成
4. Service Account 作成、Service Account Key 取得 → Vercel Env Vars に保存
5. Firestore Security Rules 作成、デプロイ
6. zod スキーマ定義（`src/lib/firestore/schemas.ts`）
7. 暗号化ユーティリティ（`src/lib/crypto.ts`）
8. Firestore クライアント、Cloud Tasks クライアント、Gemini クライアント、Storage クライアントの初期化ラッパー作成
9. Cloud Tasks OIDC 検証ミドルウェア（`src/lib/auth/oidc.ts`）
10. ChannelAdapter インタフェース定義
11. Service / ContentSource CRUD（最小 UI、Firebase Auth で保護）
12. ContentBase Generator（Vercel Cron → Cloud Tasks → Gemini → Firestore）
13. **XAdapter.generateDrafts() 実装**（Cloud Tasks 経由）
14. Playwright MCP セットアップ（`E:\dev\ai-crisis` 参照）
15. Sprint 0 までのフローを E2E テストで検証

### Sprint 1: Slack 連携でループ完成

16. Slack OAuth + Bot Token 保存（暗号化込み、Firestore に格納）
17. Slack Block Kit 通知送信
18. `/api/slack/interact` 実装、署名検証
19. X OAuth 2.0 PKCE フロー（state 検証）
20. 頻度制限ロジック + Cloud Tasks 遅延投稿（schedule_time）
21. 画像生成 MCP セットアップ（`E:\dev\ai-crisis` 参照）+ Cloud Storage 連携
22. **エンドツーエンド動作確認**: RSS 更新 → 15分後 Slack 通知 → 1タップ投稿成功
23. セキュリティチェックリスト（§3.8）全項目確認

### Sprint 2: 学習ループ＋WIF移行

24. Outcome 計測ジョブ（Cloud Tasks の遅延ジョブで 1h/24h/7d）
25. Knowledge 生成ジョブ（週次）
26. ドラフト生成プロンプトへの Knowledge 注入
27. **Workload Identity Federation へ移行**（Service Account Key を廃止）
28. 履歴・ナレッジ閲覧 UI
29. 過去記事バックフィル機能

---

## 16. 受け入れ基準（MVP完了条件）

機能面:
1. RSS に新記事を投稿してから 15〜30 分以内に Slack にドラフト 3〜5 本のメッセージが届く
2. Slack 上で `[Approve & Post]` 1タップだけで X に投稿される
3. 投稿が完了したら同じ Slack スレッドに完了通知が来る
4. Web アプリを開かずに運用が完結する
5. 1日3投稿の頻度制限が動作する（4本目以降は Cloud Tasks で翌日に遅延投稿）
6. 同じ記事から複数回ドラフト生成しても、冒頭が被らない
7. 1ヶ月運用すると KnowledgeBase に学習パターンが3つ以上蓄積されている
8. 月間運用コストが Gemini API + X API + Vercel + Slack + GCP で合計 $30 以下

セキュリティ面（**全項目クリア必須**）:
9. セキュリティチェックリスト（§3.8）全項目が緑
10. E2E セキュリティテスト全項目 PASS
11. `.env` および `*.json` (Service Account Key) がコミット履歴にない
12. `npm audit --production` で high/critical が 0 件
13. すべての GitHub Actions が SHA ピン留め
14. ChannelConnection の OAuth トークンが Firestore で暗号化保存
15. Firestore Security Rules がデプロイされ、未認証アクセスが拒否されている

---

## 17. やらないこと

- ❌ Auto-reply / Auto-DM / Mass follow/unfollow / Engagement automation
- ❌ Real-time trend hijacking
- ❌ Multi-user / Team features（Sprint 0-2 範囲）
- ❌ TikTok / Instagram Reels / YouTube Shorts
- ❌ DM マーケティング
- ❌ ブランディング画面
- ❌ クラウド SaaS としての公開（まずは自分用、ドッグフード後に検討）

---

## 18. 将来拡張

| 拡張 | 必要な変更 |
|---|---|
| LINE 公式アカウント追加 | `LineAdapter` 実装 + ChannelConnection 追加 |
| メルマガ追加（Resend等） | `NewsletterAdapter` 実装 |
| note 自動投稿 | `NoteAdapter` を Computer Use 経由で |
| ContentBase の人間承認ステップ | DraftStatus に `BASE_PENDING` 段階を挿入 |
| Brand Voice Import | Service 設定に X OAuth、過去ポスト100件→Gemini で文体抽出 |
| Thread Support | ChannelDraft.threadParts 追加 |
| Evergreen Recycle | OutcomeSnapshotの上位20%を再ドラフト対象に |
| 複数ユーザー対応（SaaS化） | Firebase Auth + Firestore Security Rules でテナント分離、Stripe 連携 |
| BigQuery 連携 | OutcomeSnapshot を BigQuery にエクスポート、複雑な分析 |
| Pub/Sub 連携 | より複雑なイベント駆動が必要になったら |

---

## 19. ドメインと公開設定

- **本番ドメイン**: `soloreach.life`
- **Vercel** に登録、DNS 設定
- **www** サブドメインは 301 リダイレクトで `soloreach.life` に集約
- **TLS**: Vercel 自動発行
- **HSTS**: 有効化

---

## 関連ドキュメント

- `CLAUDE.md` — Claude Code への開発ルール
- `docs/security.md` — セキュリティ運用詳細
- `docs/testing.md` — Playwright MCP テストガイド
- `docs/creative.md` — 画像生成 MCP ガイド
- `docs/cloud-tasks-setup.md` — GCP / Cloud Tasks セットアップ手順
- `docs/wif-setup.md` — Workload Identity Federation セットアップ手順
- `README.md` — セットアップ手順
