const DEFAULT_FORBIDDEN = [
  "絶対", "必ず", "100%", "保証",
  "○円儲かる", "○万円戻る", "最安", "業界No.1", "最強",
  "裏ワザ", "バレない", "グレー",
];

const PRIMARY_SOURCE_DOMAINS = [
  "soumu.go.jp", "nta.go.jp",
  "furusato-tax.jp", "satofull.jp", "furunavi.jp", "rakuten.co.jp",
  "mhlw.go.jp", "cao.go.jp",
];

export function detectRiskFlags(
  text: string,
  angle: string,
  selfReplyText: string | null | undefined,
  riskFilters: { forbiddenWords: string[]; requirePrimarySource: boolean }
): string[] {
  const flags: string[] = [];
  const allForbidden = [...DEFAULT_FORBIDDEN, ...riskFilters.forbiddenWords];

  for (const word of allForbidden) {
    if (text.includes(word)) {
      flags.push(`forbidden_word:${word}`);
    }
  }

  if (
    angle === "NEWS" &&
    riskFilters.requirePrimarySource &&
    selfReplyText
  ) {
    const hasPrimarySource = PRIMARY_SOURCE_DOMAINS.some((domain) =>
      selfReplyText.includes(domain)
    );
    if (!hasPrimarySource) {
      flags.push("missing_primary_source");
    }
  }

  return flags;
}

export function isBlocked(riskFlags: string[]): boolean {
  return riskFlags.length > 0;
}
