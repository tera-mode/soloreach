import type { ContentBase, Service, KnowledgeEntry } from "@/lib/firestore/schemas";

const ANGLE_DESCRIPTIONS: Record<string, string> = {
  DATA:     "数字・統計・具体的な金額で訴求（例: 年収500万円の人は○○円得する）",
  EMOTION:  "損失回避・後悔・共感で動かす（例: やらなかった人が後悔する理由）",
  STORY:    "体験談・失敗談・実例（例: 私が○○でやらかした3つのこと）",
  HOWTO:    "手順・やり方・チェックリスト（例: 5分でできる○○の方法）",
  QUESTION: "リプ誘発型の問いかけ（例: あなたは○○派？）",
  PARADOX:  "常識への逆説・神話破壊（例: ○○は実は損だという事実）",
  NEWS:     "最新情報・速報・制度改正（例: 【速報】○○が変わった理由）",
};

const TONE_DESCRIPTIONS: Record<string, string> = {
  formal:   "丁寧語・信頼感重視（〜ます・〜です）",
  friendly: "親しみやすい専門家（〜ですよ・〜なんです、時々絵文字）",
  playful:  "軽め・親近感・ユーモア適度（体言止め・口語）",
};

export function buildDraftBatchPrompt(
  base: ContentBase,
  service: Service,
  knowledge: KnowledgeEntry[],
  recentHooks: string[]
): string {
  const knowledgeSection =
    knowledge.length > 0
      ? `\n## 過去の学習（プロンプト調整指示）\n${knowledge.map((k) => `- ${k.promptDelta}`).join("\n")}`
      : "";

  const hookBlacklist =
    recentHooks.length > 0
      ? `\n## 直近30日使用済みの冒頭フレーズ（完全禁止）\n${recentHooks.map((h) => `- ${h}`).join("\n")}`
      : "";

  const angles = Object.entries(ANGLE_DESCRIPTIONS)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");

  const tones = Object.entries(TONE_DESCRIPTIONS)
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");

  const svc = service as Record<string, unknown>;

  return `あなたは${service.persona}として、以下のネタから X（旧Twitter）投稿ドラフトを **21本（7切り口 × 3トーン）** 生成してください。

## サービス情報
- サービス名: ${service.name}
- カテゴリ: ${(svc.category as string) ?? service.name}
- CTA: 「${service.ctaText ?? "詳しくはbioのリンクから"}」
- 禁止ワード: ${(service.riskFilters?.forbiddenWords ?? []).join("・") || "なし"}

## ネタ情報
- タイトル: ${base.title}
- 要旨: ${base.summary}
- キーポイント:
${base.keyPoints.map((p) => `  - ${p}`).join("\n")}
${knowledgeSection}
${hookBlacklist}

## 7つの切り口（angle）
${angles}

## 3つのトーン（tone）
${tones}

## 投稿の構造ルール（厳守）
1. **hook**: 冒頭15字以内。数字・【ラベル】・逆説・問いかけのいずれかで始める
2. **body**: 本文100〜140字。URLを絶対に含めない。改行3〜5箇所。末尾は問いかけまたはCTA
3. **bodyShort**: body を100〜120字に短縮した「拡散ゾーン版」（省略可）
4. **selfReplyText**: 「詳しくは → [URL]」形式でCTA+記事URLを置く（URLは "${base.sourceUrl ?? service.ctaText ?? "bioのリンク"}" を使用）
5. **hashtags**: 0〜2個まで（多すぎるとリーチが落ちる）
6. 絵文字は0〜2個まで（functionall なもの限定: 🔍📅💰⚠️など）

## 出力形式（JSON のみ、前後に説明文不要）
{
  "drafts": [
    {
      "angle": "DATA",
      "tone": "formal",
      "format": "TEXT",
      "hook": "冒頭15字以内",
      "body": "本文100〜140字",
      "bodyShort": "100〜120字版（作れる場合）",
      "selfReplyText": "詳しくは → URL",
      "hashtags": ["ハッシュタグ1"],
      "estimatedReachScore": 75
    }
  ]
}

## 制約
- 必ず **21本すべて** を出力すること（7切り口 × 3トーン の組み合わせ網羅）
- 各 hook は互いに重複しないこと、禁止リストとも重複しないこと
- NEWS切り口は news-fast-track 向けなので鮮度を重視した表現に
- ${(service.riskFilters?.forbiddenWords ?? []).join("・")} の表現は絶対に使わない
- estimatedReachScore は 0〜100 の自己評価（DATA+チェックリストは高め、URLのみは低め）`;
}
