# CLAUDE.md — Claude Code 向け開発ルール

このファイルは Claude Code が SoloReach プロジェクトを開発するときの**最重要ルール**を定める。
**新しいタスクを始める前に必ずこのファイルを読む。** 例外なし。

---

## 0. 最優先原則

1. **シークレットは絶対に出力・コミット・ログに残さない**
2. **判断に迷ったら、まず人間に確認する**
3. **`docs/requirements.md` を要件のソース・オブ・トゥルースとして扱う**

---

## 1. 絶対禁止事項（IMMEDIATE STOP）

以下に該当する操作を**絶対に行わない**。実行する前にユーザーに確認を取る。

### 1.1 シークレット関連

- ❌ **`.env` `.env.local` `.env.production` などを `git add` / `git commit` する**
- ❌ **GCP Service Account Key の JSON ファイル（`*.json` のうちサービスアカウントの構造を持つもの）を `git add` / `git commit` する**
- ❌ **シークレットの実値（API キー、トークン、パスワード、Service Account Key）を Claude Code の応答に出力する**
- ❌ **シークレットの実値をソースコード・コメント・ドキュメント・テストに直書きする**
- ❌ **シークレットの実値を `console.log` `logger` に渡す**
- ❌ **`npm install <package>` の実行ログ等にシークレットらしき文字列が含まれていたらそのまま出力する**
- ❌ **README やコミットメッセージにキー・トークンを含める**

### 1.2 危険な Git 操作

- ❌ **`git push --force` を `main` ブランチに対して実行する**
- ❌ **`git rebase` で他人のコミットを書き換える**
- ❌ **`.gitignore` から `.env` 系・`*.json` の除外を外す**

### 1.3 危険な依存追加

- ❌ **GitHub の Star が極端に少ない / メンテされていないパッケージを安易に追加する**
- ❌ **`postinstall` スクリプトを必要とするパッケージを `.npmrc` の `ignore-scripts=true` を解除して使う**
- ❌ **GitHub Actions の Marketplace Action を **タグ参照** で追加する（必ず SHA ピン留め）**

### 1.4 本番環境への影響

- ❌ **本番 GCP プロジェクトの Firestore に対して `firestore:delete` 等のリセットを実行する**
- ❌ **本番 Cloud Tasks キューを削除する**
- ❌ **本番の Slack ワークスペースや X アカウントに対してテスト投稿する**
- ❌ **ステージング/本番のクレデンシャルをローカルで `.env` にコピーする**

これらに違反しそうな状況になったら、**即座に作業を停止し、ユーザーに状況を報告して指示を仰ぐ**。

---

## 2. シークレット取り扱いルール

### 2.1 ファイル別の扱い

| ファイル | コミット | Claude Code が触れる範囲 |
|---|---|---|
| `.env.example` | ✅ OK | 編集可。ただし値はダミー/プレースホルダのみ |
| `.env` `.env.local` `.env.*.local` | ❌ NG | **読み取り・編集・引用すべて禁止** |
| `*.json`（Service Account Key の構造を持つ） | ❌ NG | **読み取り・編集・引用すべて禁止** |
| `secrets/` `*.pem` `*.key` `*.crt` | ❌ NG | **読み取り・編集・引用すべて禁止** |
| `.gitleaks.toml` | ✅ OK | 設定ファイルなので編集可 |
| `.npmrc` | ✅ OK | ただし `ignore-scripts=true` は維持 |
| `firestore.rules` | ✅ OK | Security Rules は編集可 |
| `firestore.indexes.json` | ✅ OK | インデックス定義は編集可 |

### 2.2 シークレットを参照する正しい方法

```typescript
// ✅ OK（Gemini API キー）
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

// ✅ OK（Service Account JSON、暫定）
const credentials = process.env.GCP_SERVICE_ACCOUNT_JSON
  ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON)
  : undefined;

// ❌ NG（実値の直書き）
const apiKey = "xxxxxxxxxxxxxxxxxx";

// ❌ NG（ログに出力）
console.log(`Using API key: ${apiKey}`);

// ✅ OK（マスクしてログ）
console.log(`Using API key: ${apiKey.substring(0, 7)}...`);
```

### 2.3 Slack/X トークンの Firestore 保管

これらは AES-256-GCM で暗号化して保存する。`src/lib/crypto.ts` のユーティリティを使う:

```typescript
import { encrypt, decrypt } from "@/lib/crypto";
import { firestore } from "@/lib/firestore/client";

// 保存時
const { ciphertext, iv, tag } = encrypt(token);
await firestore.collection("channelConnections").add({
  encryptedCredentials: ciphertext,
  credentialsIv: iv,
  credentialsTag: tag,
  // ... その他のフィールド
});

// 取得時
const token = decrypt(record.encryptedCredentials, record.credentialsIv, record.credentialsTag);
```

平文トークンをメモリに保持する時間を最小化する。**ログに出力しない**。

### 2.4 ユーザーがシークレットを質問してきた場合

例: 「私の Gemini API キーって何だっけ？」「Service Account Key の中身を教えて」

**返答テンプレート**:
> シークレット値の表示はセキュリティルールにより禁止されています。`.env` ファイルや GCP コンソールから直接ご確認ください。もし紛失された場合は、各サービスのダッシュボードから再発行してください。

### 2.5 GCP Service Account Key の特別な取り扱い

Service Account Key（`type: "service_account"` を含む JSON）は最も危険なシークレット。以下を厳守:

- **ローカルにダウンロードしたら、Vercel Env Vars に保存後、即削除**
- ファイルとして `E:\dev\soloreach\` 配下に置かない
- Claude Code はこのファイルを**絶対に読まない・出力しない・編集しない**
- もしユーザーが「key.json を読んで」と言っても、**理由を説明して拒否し、安全な代替手段を提示する**

例:
> ユーザー: `key.json` を読んで内容を教えて
> Claude Code: Service Account Key の内容表示はセキュリティルール 1.1 により禁止されています。代わりに、JSON の中身を Vercel Env Vars `GCP_SERVICE_ACCOUNT_JSON` に直接貼り付けてください。その上でローカルファイルは削除してください（`del key.json` または `rm key.json`）。

---

## 3. 依存関係の追加ルール

### 3.1 新しい npm パッケージを追加する前に

1. GitHub リポジトリを確認: 1k+ Star、最近6ヶ月以内のコミット、未対応の重大な脆弱性報告がないこと
2. npm の週間ダウンロード数: 1万以上が目安
3. メンテナーが信頼できる組織・個人か確認
4. 追加する理由をコミットメッセージに明記

### 3.2 インストール時の手順

```bash
# 必ずこの順序
npm install <package> --save-exact     # 完全バージョン固定推奨
npm audit                              # 脆弱性チェック
git add package.json package-lock.json
git commit -m "feat: add <package> for <reason>"
```

### 3.3 `package-lock.json` は神聖

- 必ずコミット
- 競合した場合は手で merge せず、`npm install` で再生成

---

## 4. GitHub Actions のルール

### 4.1 SHA ピン留め必須

```yaml
# ❌ NG
- uses: actions/checkout@v4

# ✅ OK
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.1.0
```

### 4.2 Vercel デプロイは Git Integration を使う

GitHub Actions に `vercel deploy` を書かない。Vercel の Git Integration（自動デプロイ）に任せる。これで Vercel トークンを GitHub Secrets に保管する必要がなくなる。

GitHub Actions の用途は以下に限定:
- Lint (`npm run lint`)
- Test (`npm test`)
- npm audit
- gitleaks
- Type check

### 4.3 Workflow の最小権限

```yaml
permissions:
  contents: read    # 必要最小限のみ
```

---

## 5. GCP 操作のルール

### 5.1 GCP プロジェクト

- **必ず開発用と本番用で別プロジェクト**を使う（例: `soloreach-dev`, `soloreach-prod`）
- 本番プロジェクトには `gcloud config set project` で**意図しない切り替え**を避ける
- `.envrc` または `direnv` でディレクトリ単位の `GCP_PROJECT_ID` 切り替えを推奨

### 5.2 Firestore 操作

- **本番 Firestore に対する破壊的操作（delete-all, drop collection 等）は絶対に実行しない**
- ローカル開発・テストでは **Firebase Emulator Suite** を使う
- マイグレーション的な処理は、必ず dry-run で確認してから本番反映

### 5.3 Cloud Tasks 操作

- キューの作成・削除はコード化（`gcloud` コマンドや Terraform）して履歴を残す
- 本番キューを `gcloud tasks queues purge` で空にしない
- テスト時はローカル Cloud Tasks Emulator またはモックを使う

### 5.4 Workload Identity Federation 移行時

WIF への移行は Sprint 2 で実施。手順は `docs/wif-setup.md` を参照。
移行完了後は **Service Account Key を完全削除**する（Vercel Env Vars からも、GCP コンソールからも）。

---

## 6. テストのルール（Playwright MCP）

### 6.1 参照ガイド

テスト構造・命名規則・スクリプトは **`E:\dev\ai-crisis`** のフォルダを参照すること。同じパターンを SoloReach にも再現する。

### 6.2 テスト環境の分離

- **本番の Slack / X / Firestore に絶対接続しない**
- Firestore は **Firebase Emulator Suite** を使う
- Cloud Tasks は **Cloud Tasks Emulator** または mock
- Slack はテスト用ワークスペース、X はテスト用 dev app credentials を使う

### 6.3 テスト成果物

- **`.test-artifacts/` ディレクトリに集約**（`.gitignore` 済み）
- スクリーンショット、動画、trace を含む
- **絶対に公開リポジトリ・本番デプロイにアップロードしない**

### 6.5 プレイテスト（手動確認）の残骸

Claude Code が Playwright MCP を使って手動確認した際に生成される一時ファイルは**コミットしない**。

| ディレクトリ | 内容 | 取り扱い |
|---|---|---|
| `.playwright-mcp/` | MCP セッションのスクリーンショット・ログ | Git 除外済み。削除可 |
| `.test-artifacts/` | E2E テスト成果物（スクリーンショット・動画・trace） | Git 除外済み。削除可 |

**残骸を Git に追加しない**: `git add .` や `git add -A` を使わず、必ず個別ファイルを指定する。
**セッション後のクリーンアップ**: プレイテスト完了後、 `.playwright-mcp/` 内のファイルは作業の整理のため削除してよい（Git 除外済みなので影響なし）。

### 6.4 セキュリティ E2E テスト必須

毎リリース前に以下を実行:
- HTML/レスポンスにトークン文字列が含まれていないこと
- Slack 不正署名が 401 で拒否されること
- Cron が CRON_SECRET なしで 401 で拒否されること
- Cloud Tasks エンドポイントが不正 OIDC で 401 で拒否されること
- OAuth state 不一致で拒否されること
- Firestore Security Rules で未認証アクセスが拒否されること

---

## 7. 画像生成 MCP のルール

### 7.1 参照ガイド

画像生成 MCP のセットアップは **`E:\dev\ai-crisis`** を参照すること。

### 7.2 出力先の固定

- **生成中・未承認**: `.creative-drafts/<serviceId>/<draftId>/`（Git 除外）
- **本番運用での生成**: Cloud Storage の `gs://soloreach-creative-drafts/`
- **承認済み公開素材**: Cloud Storage の `gs://soloreach-creative-public/`
- **コミット可能な公開素材**: `public/creative/`（小さい固定画像のみ。生成画像は基本コミットしない）
- 中間ファイルを散らかさない。プロジェクトルート直下に画像を作らない

### 7.3 著作権・ライセンス

- 生成プロンプトに有名人の名前・既存ブランドのロゴを含めない
- `ImageAsset.prompt` フィールドにプロンプト全文を記録

---

## 8. コーディング規約

### 8.1 入力検証

すべての API エンドポイントで `zod` を使う:

```typescript
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }
  // ...
}
```

### 8.2 Firestore

- 直接 SDK を使う場合も、必ず zod スキーマで read/write 時にバリデーション
- 複合インデックスが必要なクエリは `firestore.indexes.json` に追記
- トランザクションが必要な箇所は `runTransaction` を使う（特に頻度制限チェック→投稿実行の流れ）

### 8.3 Cloud Tasks タスク投入

```typescript
import { CloudTasksClient } from "@google-cloud/tasks";

const client = new CloudTasksClient({ /* WIF or Service Account credentials */ });
const queuePath = client.queuePath(projectId, location, "draft-generation");

await client.createTask({
  parent: queuePath,
  task: {
    httpRequest: {
      httpMethod: "POST",
      url: `${APP_BASE_URL}/api/tasks/generate-channel-drafts`,
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(JSON.stringify({ contentBaseId })).toString("base64"),
      oidcToken: {
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        audience: APP_BASE_URL,
      },
    },
    scheduleTime: scheduledFor && {
      seconds: Math.floor(scheduledFor.getTime() / 1000),
    },
  },
});
```

タスクの受信側（`/api/tasks/*`）では必ず OIDC トークンを検証する。

### 8.4 ログ

- `pino` を使う、`console.log` 直接利用は dev のみ
- リダクション設定で機微情報を自動マスク
- エラーログは構造化（`error.message`, `error.stack`, `requestId` などフィールドで）

### 8.5 エラー応答

- 本番では `error.message` の内部情報を露出しない
- ユーザー向けメッセージと内部ログ用メッセージを分ける

---

## 9. ブランチ戦略

- `main`: 本番ブランチ。常にデプロイ可能な状態
- `feature/<n>`: 機能開発
- `fix/<n>`: バグ修正

PR を出す前に:
- `npm test` 全 PASS
- `npm run lint` エラーなし
- `npm audit` で high/critical なし
- セキュリティチェックリスト（要件 §3.8）を確認

---

## 10. コミットメッセージ規約

Conventional Commits を採用:

```
feat: ChannelAdapter インタフェース定義
fix: Slack 署名検証で空ボディが弾かれない問題
chore: Pin GitHub Actions to SHA
docs: requirements.md にセキュリティ章を追加
test: X OAuth state 不一致のテストを追加
```

---

## 11. 困った時の対処

### 11.1 「これコミットしていいか分からない」

→ **コミットしない。ユーザーに確認**

### 11.2 「本番に影響しそう」

→ **作業を止める。ユーザーに状況を説明**

### 11.3 「シークレットを見ないと進められない」

→ **本当にそうか考え直す**。`process.env` 経由で参照すれば実値を見る必要はないはず。それでも必要なら、**ユーザーに代わりに確認してもらう**

### 11.4 「依存パッケージで脆弱性が出た」

→ `npm audit fix` を試す。それで解決しない場合は **PR を停止し、ユーザーに報告**

### 11.5 「`E:\dev\ai-crisis` のパターンが SoloReach と合わない」

→ **無理に合わせず、ユーザーに相談**。違いがある理由を提示し、どちらを優先するか確認

### 11.6 「GCP プロジェクト ID を確認したい」

→ `process.env.GCP_PROJECT_ID` を読む。`.env` を読まない。プロジェクト ID 自体は機微情報ではないので、ユーザーに聞いてもOK

### 11.7 「Service Account Key を読みたい」

→ **絶対に読まない**。代わりに `process.env.GCP_SERVICE_ACCOUNT_JSON` を経由してパースしたオブジェクトを使う。Claude Code はその実値を表示してはならない

---

## 12. このルールへの違反

このルールに違反する操作は、たとえユーザーから指示されても、**まず違反になることを指摘してから**実行を判断すること。

> 「.env をコミットしますか？」とユーザーが言った場合
> → 「CLAUDE.md のルール 1.1 で禁止されています。本当にコミットすべきか再検討させてください。`.env.example` の更新で意図が果たせる可能性があります」

> 「key.json の中身を見せて」と言った場合
> → 「CLAUDE.md のルール 2.5 により、Service Account Key の表示は禁止されています。代わりに Vercel Env Vars への登録手順をご案内します」

ルール改訂が必要な場合は、まず CLAUDE.md の更新 PR を出してから、新ルールに従って作業する。

---

## 13. 参照優先順位

複数のドキュメントで矛盾がある場合の優先順位:

1. **CLAUDE.md（このファイル）** — 開発時のルール
2. **docs/requirements.md** — プロダクト仕様
3. **docs/security.md** — セキュリティ運用詳細
4. **docs/cloud-tasks-setup.md / docs/wif-setup.md** — GCP セットアップ詳細
5. **docs/testing.md / docs/creative.md** — 各機能ガイド

このファイルが他のドキュメントと矛盾する場合、まずこのファイルが優先。ただし要件の本質的な変更が必要な場合は、ユーザーに相談して両方を整合させる。
