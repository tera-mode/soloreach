export function buildContentBasePrompt(
  rawContent: string,
  title: string
): string {
  return `あなたは優秀なコンテンツアナリストです。以下のSEO記事を分析し、JSON形式で出力してください。

## 記事タイトル
${title}

## 記事本文
${rawContent.slice(0, 8000)}

## 出力形式（JSON のみ、前後に説明文不要）
{
  "summary": "記事の要旨（150字以内、日本語）",
  "keyPoints": [
    "重要なポイント1（50字以内）",
    "重要なポイント2（50字以内）",
    "重要なポイント3（50字以内）",
    "重要なポイント4（50字以内、任意）",
    "重要なポイント5（50字以内、任意）"
  ]
}

## 制約
- keyPoints は最低3つ、最大5つ
- X（Twitter）への投稿を念頭に、バズりやすいアングルを意識して抽出
- 専門用語はできるだけ噛み砕いた表現に`;
}
