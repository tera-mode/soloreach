# SoloReach デザイン実装指示書

> Claude Code 向け · Glassmorphism + 北欧オフィス背景 方向
> 配置先: `E:\dev\soloreach\docs\design-spec.md`
> 参考実装: `variants/glass-nordic.jsx`（このプロジェクト内）

---

## 0. デザインコンセプト

**「明るく、透明感があり、温かみのある作業空間」**

- 北欧オフィスの実写を背景にし、UI はその上に**ガラスのレイヤー**として浮かぶ
- 「Slack 1タップで完結」の余裕と静けさを、装飾ではなく**余白とぼかし**で表現
- データ密度は中程度。情報過多にせず、今やるべきこと（承認待ちドラフト）が一瞬で目に入る

---

## 1. ビジュアル原則

| 原則 | 意味 |
|---|---|
| **背景は写真・UIはガラス** | 重要な要素ほど不透明に、装飾は半透明に。階層をぼかしの強さで作る |
| **角は全部丸める** | 16px / 14px / 10px / 99px (pill) の4段階。直角は使わない |
| **シャドウは黒の薄付き** | 暗色アクセントは置かず、影で立体感を出す |
| **アクセントは温かい4色** | 北欧パレット。1要素1色。混ぜない |
| **タイポは2系統のみ** | 見出し serif × 本文 sans × 数値 mono の三役 |

---

## 2. デザイントークン

### 2.1 背景
```css
--bg-image: url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=2400&q=85&auto=format&fit=crop');
/* 北欧系オフィス内装。背景画像は本番で差し替え可。明るく自然光が入る写真であれば良い */

--bg-overlay: linear-gradient(135deg,
  rgba(255, 250, 240, 0.35) 0%,
  rgba(244, 236, 223, 0.25) 50%,
  rgba(255, 250, 240, 0.40) 100%);
/* 背景写真の上に必ずこの白オーバーレイを敷いて明るさを担保 */
```

### 2.2 ガラスレイヤー
```css
/* 標準ガラス（パネル / カード） */
--glass-bg: rgba(255, 255, 255, 0.55);
--glass-blur: blur(24px) saturate(140%);
--glass-border: 1px solid rgba(255, 255, 255, 0.50);

/* 強ガラス（選択中・最前面） */
--glass-bg-strong: rgba(255, 255, 255, 0.85);
--glass-blur-strong: blur(16px) saturate(140%);

/* 弱ガラス（タブのトラックなど） */
--glass-bg-subtle: rgba(255, 255, 255, 0.35);
```

> **重要**: `backdrop-filter` は `-webkit-` プレフィックス必須（Safari 対応）

### 2.3 テキストカラー
```css
--text:       #1F1A14;                    /* 本文 */
--text-soft:  #3D352B;                    /* セカンダリ */
--text-muted: rgba(50, 42, 32, 0.65);     /* キャプション */
--text-dim:   rgba(50, 42, 32, 0.45);     /* 区切り記号など */
```

### 2.4 アクセント（北欧パレット）

| トークン | HEX | Glass版（border/bg用） | 用途 |
|---|---|---|---|
| `--terracotta` | `#C97757` | `rgba(201, 119, 87, 0.18)` | プライマリ。承認・hot 通知・新着バッジ |
| `--sage` | `#7C9482` | `rgba(124, 148, 130, 0.18)` | 成功・接続中・上昇トレンド |
| `--ochre` | `#D4A864` | `rgba(212, 168, 100, 0.20)` | 待機・QUEUED・注意 |
| `--navy` | `#3A4A5C` | `rgba(58, 74, 92, 0.15)` | 中性的なメトリクス・ハウツー系 |
| `--cream` | `#F4ECDF` | — | ベース寄りの背景 |

**ルール**: 1ドラフト = 1アクセント色を割り当て、ボタン・スコアバッジ・ストライプを統一。

### 2.5 影
```css
--shadow:      0 8px 32px rgba(40, 35, 30, 0.12), 0 2px 8px rgba(40, 35, 30, 0.06);
--shadow-soft: 0 4px 20px rgba(40, 35, 30, 0.08);
--shadow-lg:   0 20px 60px rgba(40, 35, 30, 0.18), 0 4px 16px rgba(40, 35, 30, 0.08);
--shadow-accent: 0 4px 12px {accent}50;  /* ボタンに使う */
```

### 2.6 角丸スケール
| トークン | 値 | 用途 |
|---|---|---|
| `--r-pill` | `9999px` | バッジ・ボタン・タグ |
| `--r-md` | `10px` | 入力・小カード・アバター枠 |
| `--r-lg` | `14px` | ドラフトカード |
| `--r-xl` | `16px` | パネル・メトリクスカード |
| `--r-2xl` | `20px` | 最外コンテナ（左カラム全体） |

### 2.7 スペーシング
4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24 / 28 / 32 px の段階。**奇数pxは使わない**。

---

## 3. タイポグラフィ

### 3.1 フォント

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Noto+Serif+JP:wght@500;600;700&display=swap" rel="stylesheet">
```

| 役割 | フォントスタック |
|---|---|
| **Sans（本文）** | `"Inter", "Noto Sans JP", system-ui, sans-serif` |
| **Serif（見出し・温かみ）** | `"Fraunces", "Noto Serif JP", Georgia, serif` |
| **Mono（数値・タイムスタンプ・ID）** | `"JetBrains Mono", ui-monospace, monospace` |

### 3.2 サイズスケール

| 用途 | size / weight / leading / letter-spacing | font |
|---|---|---|
| H1 ヘッダー記事タイトル | 22 / 600 / 1.3 / -0.025em | Serif |
| パネル見出し | 13.5 / 600 / 1.3 / -0.015em | Serif |
| ドラフト本文 | 14 / 400 / 1.75 / 0 | Sans |
| ナビ・タブ | 12.5 / 500–600 / 1.0 / -0.005em | Sans |
| ラベル・キャプション | 11.5 / 500 / 1.4 / 0 | Sans |
| 数値（メトリクス値） | 28 / 600 / 1.0 / -0.03em | Mono |
| 数値（インライン: chars, tokens） | 11–12 / 500 / 1.0 / 0 | Mono |
| バッジ | 11 / 600 / 1.0 / 0 | Sans |
| アクセント大文字バッジ | 10.5 / 600 / 1.0 / 0.05em | Mono |

**ルール**: 日本語の見出しに Fraunces を直接当てると Noto Serif JP にフォールバックする。混植は許容。letter-spacing は日本語が含まれるところでは 0 か 0.005em 程度に留める。

---

## 4. レイアウト

### 4.1 全体グリッド（1440 × 1024 想定）

```
┌──────────────────────────────────────────────────────┐ 24
│  [Floating Top Nav (h=60, r=16, glass)]              │
├──────────────────────────────────────────────────────┤ 22
│  [Metric] [Metric] [Metric] [Metric]   ← 4 columns   │
├──────────────────────────────────────────────────────┤ 16
│                                  ┌─────────────────┐ │
│  [Draft Inbox section]           │ [Pipeline]      │ │
│   (flex 1, r=20, glass)          │ [Connections]   │ │
│                                  │ [Learning]      │ │
│                                  │  ↑ 360px wide   │ │
└──────────────────────────────────┴─────────────────┘ 24
```

- 外周パディング: **24px**
- カラム間ギャップ: **16px**
- 右サイドバー幅: **360px** 固定
- メトリクスカードは `repeat(4, 1fr)` の等分

### 4.2 Floating Top Nav

- `position: absolute; top: 20px; left: 24px; right: 24px`
- 高さ60、`r-xl` (16px)、glass
- 内訳（左→右）:
  1. ロゴ（32×32 グラデアバター + 「SoloReach」serif + バージョン mono）
  2. タブ群（5項目、内側に弱ガラスのトラックを敷く、選択中は白90% bg）
  3. 検索ボックス（200px、半透明、⌘K ヒント）
  4. 通知ベル（テラコッタの数字バッジ）
  5. ユーザーアバター（36×36、グラデ背景、白2px枠）

### 4.3 メトリクスカード（4枚）

各カードに必ず:
- `r-xl` (16px), 標準 glass, `padding: 18px`
- 右上 100×100 の `radial-gradient(circle at top right, {accent}30, transparent 70%)` を装飾
- ラベル（11.5px muted）→ 値（28px mono accent色）+ サブ（11.5px muted, baseline揃え）
- 下に **進捗バー / スパークライン / 棒グラフ / 通知ドット** のいずれか1種

「Pending decisions」は最も目立たせる: 右上に `box-shadow: 0 0 0 4px {accent}25, 0 0 12px {accent}80` のドットを置く。

### 4.4 ドラフトインボックス（左メイン）

最外:
- `r-2xl` (20px), 標準 glass, 上端に `linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)` の1px光ライン

3段構成:
1. **記事ヘッダー** (padding 22/26)
   - `NEW · 4分前` バッジ（テラコッタ pill）+ ソース表記（mono muted）+ メタ
   - タイトル: serif 22px / 600
   - 右に「記事を開く ↗」outline glass ボタン
2. **ドラフトリストヘッダー** (padding 14/26)
   - 「ドラフト候補」serif + count pill + ベスト投稿時刻 + 全部再生成ボタン
3. **ドラフトカードリスト** (padding 14/22, gap 10)
   - 各カード: `r-lg` (14px), glass-strong (選択中) or glass-subtle, **左に3px幅のアクセント色ストライプ**（box-shadow で発光）
   - 中身: 切り口バッジ（accentGlass）/ candidate番号 / predictedスコアpill / 本文 / 文字数バー / 操作ボタン
   - 選択中のみ操作ボタン群が現れる: `編集` `↻` `Approve & Post`(grad)
4. **Bulk フッター** (padding 12/26)
   - 全部却下 / 3本とも再生成 / Slack送信済みステータス

### 4.5 サイドパネル（右）

各パネル共通:
- `r-xl` (16px), 標準 glass
- ヘッダー部 (padding 12/16): serif タイトル + sub + アクションリンク（テラコッタ）
- 本体 (padding 14): リスト

3つのパネル:
1. **Pipeline** — 6段階の縦リスト、左に縦線で連結、状態ノード
2. **Connections** — X / Slack / RSS の接続状態
3. **Learning** — 4件の学習パターン、上下矢印アイコン + パーセント

### 4.6 状態ノード（Pipeline用）

| state | 描画 |
|---|---|
| `done` | 22×22, sage 円形bg + 白チェック, sage の影 |
| `active` | 22×22, 白bg + テラコッタ2px枠 + 中央テラコッタドット + 外側に拡張する pulse リング |
| `pending` | 22×22, ochre 円形bg + 白小ドット, ochre の影 |
| `idle` / `sched` | 22×22, 半透明白 + グレー枠 + 中央極小ドット |

`@keyframes pulse { 0%,100% { opacity:.4; transform:scale(1) } 50% { opacity:.7; transform:scale(1.15) } }` を必ず定義。

---

## 5. コンポーネント仕様（実装の最小セット）

### 5.1 GlassPanel
```tsx
<GlassPanel title="Pipeline" sub="リアルタイム" action="管理">
  {children}
</GlassPanel>
```
ヘッダーに `background: rgba(255,255,255,0.2)` のサブティント。border-bottom は `rgba(255,255,255,0.25)`。

### 5.2 MetricCard
プロップス: `label, value, sub, accent, hot?, progress?, spark?`
- `hot` のとき右上に発光ドット
- `progress`(0..1) のとき下に4px progressbar
- `spark` のとき下に120×24 viewBox の SVG sparkline + radial fill

### 5.3 DraftCard
プロップス: `angle, accent, content, chars, score, selected, onClick`
- 左ストライプ: 3px width, 角丸99px, `box-shadow: 0 0 8px {accent}60`
- スコア pill: `background: {accent}20; color: {accent}; font-weight: 700`
- Approve ボタン: `background: linear-gradient(135deg, {accent}, {accent}dd); color: white; box-shadow: 0 4px 12px {accent}50`

### 5.4 PillButton
2バリアント:
- ghost: `background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.5); backdrop-filter: blur(8px)`
- primary: `background: var(--text); color: white`

### 5.5 StatusDot
`width: 7px; height: 7px; border-radius: 50%; background: {color}; box-shadow: 0 0 0 3px {color}30`

---

## 6. 実装上の注意

### 6.1 パフォーマンス
- `backdrop-filter` は重い。**1ページあたり 10レイヤー以下**を目安。装飾的なオーブは2〜3個まで
- 大きい背景画像は `<link rel="preload" as="image">` で優先読込
- `will-change: backdrop-filter` は乱用しない（GPUメモリを食う）

### 6.2 アクセシビリティ
- ガラス越しの本文は `color: #1F1A14` 固定（背景明度に関わらずコントラスト確保）
- アクセント色だけで状態を伝えない（必ずアイコン or テキストを併記）
- フォーカスリング: `outline: 2px solid {accent}; outline-offset: 2px` を全インタラクティブ要素に

### 6.3 ダークモード対応（将来）
今回は light only。darkにするなら:
- bg-overlay を `linear-gradient(135deg, rgba(20,18,15,0.5), rgba(30,26,20,0.4))` に
- glass を `rgba(40,35,30,0.4)` ベースに
- text を `#F4ECDF` に反転
- アクセント4色は彩度を10〜15%下げる

### 6.4 背景画像の差し替え
`bgImage` トークンを差し替えるだけ。条件:
- 横長（16:9以上）、2400px以上
- 自然光が入る、暖色系（オーク・白・ベージュ・グリーン）
- 人物が写っていない、文字が写っていない
- ライセンス: Unsplash / Pexels / 自社撮影

---

## 7. 画面別の優先実装順

Sprint 0 で出来上がっていないと「動いている感」が出ない順:

1. **Inbox（ダッシュボード）** ← 本指示書のメイン
2. Service / Source 設定
3. Knowledge 詳細
4. Published 履歴
5. Settings（OAuth 接続管理）

各画面とも上記トークン・コンポーネントの再利用で実装可能。

---

## 8. 参考実装

このプロジェクト内の以下を参照:

```
variants/glass-nordic.jsx     # メインダッシュボードの完全実装（React）
SoloReach Dashboard v2.html   # 4案比較
```

`variants/glass-nordic.jsx` のコンポーネント分割（GlassPanel / MetricCard / PipelineNode / pillBtn）をそのまま `src/components/glass/` に移植して開始するのが最短ルート。

---

## 9. やらないこと

- ❌ ダーク背景・極端な彩度（Cyberpunk回避）
- ❌ 派手なグラデーション全面適用（accent色のみ・狭い範囲で）
- ❌ ネオン光・スキャンライン等の装飾
- ❌ アイコン乱用（情報量を増やすときだけ）
- ❌ 直角の境界線（必ず角丸）
- ❌ 純黒テキスト（`#000` ではなく `#1F1A14`）
- ❌ Material Design 風の elevation / ripple
- ❌ shadcn デフォルト風の青アクセント