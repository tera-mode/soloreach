# SoloReach

複数のB2Cツールを片手間で運営するソロプレナーのための、Slack 1タップで完結するSEO→X 自動展開ツール。

> SEO記事を書いたら、Slackに「これXに投稿する？」と3〜5案がプッシュされる。
> 1つタップするだけで自動投稿。投稿結果は次回のドラフト品質に自動反映。

ドメイン: [soloreach.life](https://soloreach.life)

---

## ドキュメント

- **[CLAUDE.md](./CLAUDE.md)** — Claude Code 向け開発ルール ★最初に読む
- **[docs/requirements.md](./docs/requirements.md)** — プロダクト要件定義
- `docs/security.md` — セキュリティ運用詳細（実装中に作成）
- `docs/cloud-tasks-setup.md` — GCP / Cloud Tasks セットアップ手順（実装中に作成）
- `docs/wif-setup.md` — Workload Identity Federation セットアップ手順（実装中に作成）
- `docs/testing.md` — Playwright MCP テストガイド（実装中に作成）
- `docs/creative.md` — 画像生成 MCP ガイド（実装中に作成）

---

## 技術スタック

- **ホスティング**: Vercel (Next.js 15 + TypeScript)
- **DB**: Firestore (Native mode)
- **非同期ジョブ**: Cloud Tasks
- **LLM**: Gemini API (`gemini-2.5-pro`, `gemini-2.5-flash`)
- **認証**: Firebase Auth
- **画像保管**: Cloud Storage
- **GCP 認証**: Workload Identity Federation (Vercel OIDC) ※Sprint 2移行、Sprint 0は Service Account Key 暫定運用

---

## セットアップ

### 前提条件

- Node.js 20 LTS
- npm 10+
- gitleaks (`brew install gitleaks` または [リリース](https://github.com/gitleaks/gitleaks/releases) からダウンロード)
- Vercel CLI (`npm i -g vercel`)
- gcloud CLI (`brew install --cask google-cloud-sdk`)
- Firebase CLI (`npm i -g firebase-tools`) — Firestore Emulator 用

### 1. リポジトリをクローン

```bash
git clone <repo-url>
cd soloreach
```

### 2. 依存をインストール

```bash
npm install
```
※ `.npmrc` で `ignore-scripts=true` のため、postinstall スクリプトは実行されない

### 3. GCP プロジェクトを作成

開発用と本番用の2つを作成（推奨）:

```bash
# Dev
gcloud projects create soloreach-dev --name="SoloReach (Dev)"
gcloud config set project soloreach-dev

# 必要 API を有効化
gcloud services enable \
  firestore.googleapis.com \
  cloudtasks.googleapis.com \
  storage.googleapis.com \
  generativelanguage.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com

# Firestore データベース作成（Native mode、Tokyo リージョン）
gcloud firestore databases create --location=asia-northeast1 --type=firestore-native

# Cloud Tasks キューを作成
for queue in content-base-generation draft-generation draft-publish outcome-measurement knowledge-building; do
  gcloud tasks queues create $queue --location=asia-northeast1
done

# Cloud Storage バケットを作成
gsutil mb -l asia-northeast1 gs://soloreach-creative-drafts
gsutil mb -l asia-northeast1 gs://soloreach-creative-public

# Service Account 作成
gcloud iam service-accounts create soloreach-vercel \
  --display-name="SoloReach Vercel"

# 最小権限を付与
PROJECT_ID=soloreach-dev
SA_EMAIL=soloreach-vercel@${PROJECT_ID}.iam.gserviceaccount.com

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/datastore.user"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudtasks.enqueuer"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"
gsutil iam ch serviceAccount:${SA_EMAIL}:objectAdmin gs://soloreach-creative-drafts
gsutil iam ch serviceAccount:${SA_EMAIL}:objectViewer gs://soloreach-creative-public

# Service Account Key を生成（暫定、Sprint 2 で削除）
gcloud iam service-accounts keys create key.json \
  --iam-account=${SA_EMAIL}

# ★ key.json の中身を読んで Vercel Env Vars と .env に GCP_SERVICE_ACCOUNT_JSON として登録
# ★ 登録後、key.json を即削除
cat key.json  # 内容を Vercel に貼る → 削除
rm key.json
```

### 4. Firebase Auth セットアップ

```bash
firebase login
firebase use soloreach-dev
firebase init auth  # Google Sign-In を有効化
```

Firebase Console から Google Sign-In を有効化し、自分のアカウントでログインして UID を取得。`.env` の `NEXT_PUBLIC_OWNER_UIDS` に登録。

### 5. 環境変数を設定

```bash
cp .env.example .env
# エディタで .env を開いて実値を記入
```

**シークレットの生成**:
```bash
# ENCRYPTION_KEY (32 bytes base64)
openssl rand -base64 32

# CRON_SECRET
openssl rand -hex 32
```

### 6. pre-commit フックをセットアップ

```bash
echo '#!/bin/sh
gitleaks protect --staged -v --config .gitleaks.toml' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 7. Slack App / X App を作成

- [Slack API](https://api.slack.com/apps) で新規 App（**Dev 用**）
- [X Developer Portal](https://developer.x.com/) で新規 App（**Dev 用**）
- それぞれの Client ID / Secret を `.env` に設定
- Redirect URI を `http://localhost:3000/api/integrations/<service>/callback` に設定

### 8. Firestore Security Rules をデプロイ

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 9. 開発サーバ起動

```bash
# Firebase Emulator を起動（別ターミナル）
firebase emulators:start --only firestore

# Next.js 開発サーバ
npm run dev
```

---

## 開発の流れ

詳細は [CLAUDE.md](./CLAUDE.md) を参照。

```bash
git checkout -b feature/xxx
# 開発作業
npm test                    # テスト実行
npm run lint                # Lint
npm audit                   # 依存脆弱性チェック
gitleaks detect --source .  # シークレット混入チェック
git commit -m "feat: ..."
git push -u origin feature/xxx
gh pr create
```

---

## デプロイ

### Vercel Git Integration

1. Vercel ダッシュボードで GitHub リポジトリを連携
2. main ブランチへのプッシュで自動デプロイ
3. Production / Preview / Development の Environment Variables を設定
4. `soloreach.life` ドメインを登録

### 本番 GCP プロジェクトへの切り替え

`soloreach-prod` プロジェクトを上記手順 3 と同様に作成し、Vercel の Production 環境変数のみ本番値に切り替える。Preview / Development は dev プロジェクトを使う。

---

## セキュリティ

このプロジェクトは以下のセキュリティ要件を満たしている必要があります。

- ✅ `.env` および `*.json`（Service Account Key）は Git にコミットされない
- ✅ `package-lock.json` はコミットされる
- ✅ `.npmrc` に `ignore-scripts=true`
- ✅ GitHub Actions は SHA ピン留め
- ✅ Slack/X トークンは AES-256-GCM で Firestore 暗号化
- ✅ Firestore Security Rules で未認証アクセス拒否
- ✅ Slack 署名検証、Cron 認証、Cloud Tasks OIDC 検証、OAuth state 検証
- ✅ pre-commit で gitleaks
- ✅ pino でログのリダクション
- ✅ Sprint 2 で WIF 移行、Service Account Key 廃止

詳細は `docs/requirements.md` の「3. セキュリティ要件」を参照。

セキュリティに関する報告は `[security email]` へ（公開 Issue にしない）。

---

## ライセンス

未定（個人プロジェクト段階）
