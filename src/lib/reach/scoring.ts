import type { DraftCandidate } from "@/lib/firestore/schemas";

const HOOK_PATTERNS = [
  /^\d+/, // 数字で始まる
  /^【.+】/, // ラベル
  /^「.+」/, // 引用
  /[？?]$/, // 疑問形
  /^(実は|じつは|意外と|知らない人が多い|やってはいけない)/,
];

function hookScore(hook: string): number {
  const matched = HOOK_PATTERNS.filter((r) => r.test(hook)).length;
  return Math.min(100, matched * 40 + 20);
}

function lengthScore(body: string): number {
  const len = body.length;
  if (len >= 100 && len <= 120) return 100;
  if (len >= 121 && len <= 140) return 80;
  if (len >= 80 && len <= 99) return 60;
  if (len > 140) return 40;
  return 20;
}

function formatScore(format: string): number {
  const scores: Record<string, number> = {
    VIDEO: 100, IMAGE: 80, POLL: 70,
    LONGFORM: 60, THREAD: 65, TEXT: 50,
  };
  return scores[format] ?? 50;
}

function endingScore(body: string): number {
  if (/[？?]$/.test(body)) return 100;
  if (/(bioのリンク|詳しくは|コメントで|あなたは|みなさんは)/.test(body)) return 80;
  return 30;
}

function saveValueScore(body: string): number {
  const patterns = [
    /チェックリスト|チェック項目/, /一覧|まとめ/,
    /\d+選|\d+つ|\d+ステップ/, /早見表|対応表/,
    /計算式|シミュレーション/,
  ];
  const matched = patterns.filter((r) => r.test(body)).length;
  return Math.min(100, matched * 25);
}

function hashtagScore(hashtags: string[]): number {
  if (hashtags.length <= 2) return 100;
  if (hashtags.length === 3) return 60;
  return 20;
}

function emojiScore(body: string): number {
  const count = (body.match(/[\u{1F300}-\u{1FFFF}]/gu) ?? []).length;
  if (count === 0) return 80;
  if (count <= 2) return 100;
  if (count <= 4) return 50;
  return 20;
}

export function calculateReachScore(draft: Partial<DraftCandidate>): number {
  const hook = draft.hook ?? "";
  const body = draft.body ?? "";
  const format = draft.format ?? "TEXT";
  const hashtags = draft.hashtags ?? [];

  const score =
    hookScore(hook) * 0.30 +
    lengthScore(body) * 0.20 +
    formatScore(format) * 0.15 +
    endingScore(body) * 0.10 +
    saveValueScore(body) * 0.10 +
    hashtagScore(hashtags) * 0.05 +
    emojiScore(body) * 0.05 +
    50 * 0.05; // knowledge boost placeholder

  return Math.round(Math.min(100, Math.max(0, score)));
}
