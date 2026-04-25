import type { ContentBase, Service, KnowledgeEntry } from "@/lib/firestore/schemas";

export function buildDraftGenerationPrompt(
  base: ContentBase,
  service: Service,
  knowledge: KnowledgeEntry[],
  recentPrefixes: string[]
): string {
  const knowledgeSection =
    knowledge.length > 0
      ? `\n## 過去の学習パターン（高エンゲージメントの傾向）\n${knowledge
          .map((k) => `- ${k.pattern}: ${k.insight}`)
          .join("\n")}`
      : "";

  const prefixBlacklist =
    recentPrefixes.length > 0
      ? `\n## 直近30日で使用済みの冒頭フレーズ（重複禁止）\n${recentPrefixes.map((p) => `- ${p}`).join("\n")}`
      : "";

  return `あなたは${service.persona}として、以下のSEO記事をXに投稿するためのドラフトを3〜5本生成してください。

## サービス情報
- サービス名: ${service.name}
- トーン: ${service.tone}
- CTA: ${service.ctaText || "なし"} ${service.ctaUrl ? `(${service.ctaUrl})` : ""}
- ハッシュタグプール: ${service.hashtagPool || "なし"}

## 記事情報
- タイトル: ${base.title}
- URL: ${base.sourceUrl}
- 要旨: ${base.summary}
- キーポイント:
${base.keyPoints.map((p) => `  - ${p}`).join("\n")}
${knowledgeSection}
${prefixBlacklist}

## 出力形式（JSON のみ、前後に説明文不要）
{
  "drafts": [
    {
      "angle": "切り口の説明（例: 数字で実績を示す）",
      "content": "投稿本文（280文字以内、改行込み）",
      "hashtags": ["ハッシュタグ1", "ハッシュタグ2"]
    }
  ]
}

## 制約
- 各ドラフトの冒頭フレーズは互いに異なること（上記使用済みリストとも重複しないこと）
- 本文は280文字以内（ハッシュタグ含む）
- URLは本文に含めない（Slackで別途付与する）
- 各ドラフトは異なる「切り口」（アングル）を持つこと
- 自然な日本語で、押しつけがましくない表現`;
}
