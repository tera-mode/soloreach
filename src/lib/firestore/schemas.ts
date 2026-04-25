import { z } from "zod";
import { Timestamp } from "@google-cloud/firestore";

const TimestampSchema = z.custom<Timestamp>((val) => val instanceof Timestamp);

// ─── Shared enums ────────────────────────────────────────────────────────────
export const ChannelSchema = z.enum(["x"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const AngleSchema = z.enum([
  "DATA", "EMOTION", "STORY", "HOWTO",
  "QUESTION", "PARADOX", "NEWS",
]);
export type Angle = z.infer<typeof AngleSchema>;

export const ToneSchema = z.enum(["formal", "friendly", "playful"]);
export type Tone = z.infer<typeof ToneSchema>;

export const FormatSchema = z.enum([
  "TEXT", "IMAGE", "VIDEO", "POLL", "THREAD", "LONGFORM",
]);
export type Format = z.infer<typeof FormatSchema>;

// ─── Service ─────────────────────────────────────────────────────────────────
export const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  domain: z.string().url(),
  category: z.string(),
  defaultTone: ToneSchema,
  defaultAngles: z.array(AngleSchema),
  persona: z.string(),
  ctaText: z.string().nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  benchmarkAccounts: z.array(z.string()),
  riskFilters: z.object({
    forbiddenWords: z.array(z.string()),
    requirePrimarySource: z.boolean(),
  }),
  premiumEnabled: z.boolean(),
  videoGenerationEnabled: z.boolean(),
  hashtagPool: z.string().nullable().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Service = z.infer<typeof ServiceSchema>;

// ─── ContentSource ────────────────────────────────────────────────────────────
export const SourceTypeSchema = z.enum([
  "RSS_FEED",
  "SITEMAP",
  "URL_LIST",
  "MANUAL_IDEA",
  "AI_PROMPT",
  "TREND_WATCH",
  "OFFICIAL_RSS",
]);

export const ContentSourceSchema = z.object({
  serviceId: z.string(),
  type: SourceTypeSchema,
  mode: z.enum(["AUTO_POLL", "ON_DEMAND"]),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
  lastPolledAt: TimestampSchema.nullable().optional(),
  createdAt: TimestampSchema,
});
export type ContentSource = z.infer<typeof ContentSourceSchema>;

// ─── Idea (新規) ──────────────────────────────────────────────────────────────
export const IdeaSchema = z.object({
  serviceId: z.string(),
  sourceId: z.string(),
  kind: z.enum(["URL", "TEXT", "TREND_KEYWORD", "AI_GENERATED"]),
  url: z.string().url().nullable().optional(),
  rawText: z.string().nullable().optional(),
  trendKeyword: z.string().nullable().optional(),
  trendVolume: z.number().nullable().optional(),
  freshnessExpiresAt: TimestampSchema.nullable().optional(),
  status: z.enum(["NEW", "PROCESSED", "ARCHIVED", "STALE"]),
  contentBaseId: z.string().nullable().optional(),
  createdAt: TimestampSchema,
});
export type Idea = z.infer<typeof IdeaSchema>;

// ─── ChannelConnection ───────────────────────────────────────────────────────
export const ChannelConnectionSchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  encryptedCredentials: z.string(),
  credentialsIv: z.string(),
  credentialsTag: z.string(),
  enabled: z.boolean(),
  maxPostsPerDay: z.number().int().positive(),
  maxPostsPerHour: z.number().int().positive(),
  minIntervalMinutes: z.number().int().nonnegative(),
  createdAt: TimestampSchema,
});
export type ChannelConnection = z.infer<typeof ChannelConnectionSchema>;

// ─── ContentBase ──────────────────────────────────────────────────────────────
export const ContentBaseSchema = z.object({
  serviceId: z.string(),
  ideaId: z.string(),
  sourceUrl: z.string().url().nullable().optional(),
  title: z.string(),
  rawContent: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  publishedAt: TimestampSchema.nullable().optional(),
  ingestedAt: TimestampSchema,
});
export type ContentBase = z.infer<typeof ContentBaseSchema>;

// ─── ChannelDraft (大幅拡張) ──────────────────────────────────────────────────
export const DraftStatusSchema = z.enum([
  "PENDING_REVIEW",
  "STOCKED",
  "SCHEDULED",
  "PUBLISHED",
  "REJECTED",
  "FAILED",
  "STALE",
  "BLOCKED",
  // v5 互換
  "APPROVED",
  "QUEUED",
]);
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

export const ChannelDraftSchema = z.object({
  contentBaseId: z.string(),
  serviceId: z.string(),
  channel: ChannelSchema,
  batchId: z.string(),

  angle: AngleSchema,
  tone: ToneSchema,
  format: FormatSchema,

  hook: z.string().max(20),
  body: z.string().max(280),
  bodyShort: z.string().max(140).nullable().optional(),
  selfReplyText: z.string().max(280).nullable().optional(),
  longFormContent: z.string().nullable().optional(),
  threadParts: z.array(z.string()).nullable().optional(),

  creativeAssetId: z.string().nullable().optional(),
  hashtags: z.array(z.string()),
  estimatedReachScore: z.number().min(0).max(100).default(50),
  riskFlags: z.array(z.string()),

  status: DraftStatusSchema,
  slackMessageTs: z.string().nullable().optional(),
  scheduledAt: TimestampSchema.nullable().optional(),
  freshnessExpiresAt: TimestampSchema.nullable().optional(),
  createdAt: TimestampSchema,
  decidedAt: TimestampSchema.nullable().optional(),

  // v5 互換フィールド
  angle_legacy: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
});
export type ChannelDraft = z.infer<typeof ChannelDraftSchema>;

// ─── PublishExecution ─────────────────────────────────────────────────────────
export const PublishExecutionSchema = z.object({
  draftId: z.string(),
  channel: ChannelSchema,
  externalId: z.string(),
  externalUrl: z.string(),
  selfReplyExternalId: z.string().nullable().optional(),
  publishedAt: TimestampSchema,
  errorMessage: z.string().nullable().optional(),
  serviceId: z.string(),
});
export type PublishExecution = z.infer<typeof PublishExecutionSchema>;

// ─── OutcomeSnapshot (拡張) ───────────────────────────────────────────────────
export const OutcomeSnapshotSchema = z.object({
  publishId: z.string(),
  measuredAt: TimestampSchema,
  impressions: z.number().int().nonnegative(),
  engagements: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  likes: z.number().int().nonnegative().default(0),
  reposts: z.number().int().nonnegative().default(0),
  quoteReposts: z.number().int().nonnegative().default(0),
  replies: z.number().int().nonnegative().default(0),
  bookmarks: z.number().int().nonnegative().default(0),
  profileClicks: z.number().int().nonnegative().default(0),
  selfReplyClicks: z.number().int().nonnegative().default(0),
  replyRate: z.number().nonnegative().default(0),
  bookmarkRate: z.number().nonnegative().default(0),
  quoteRate: z.number().nonnegative().default(0),
  reachWeightedScore: z.number().nonnegative().default(0),
  raw: z.record(z.string(), z.unknown()),
});
export type OutcomeSnapshot = z.infer<typeof OutcomeSnapshotSchema>;

// ─── CreativeAsset (imageAssets 統合) ────────────────────────────────────────
export const CreativeAssetSchema = z.object({
  serviceId: z.string(),
  draftId: z.string().nullable().optional(),
  type: z.enum(["IMAGE", "VIDEO_TEXT_OVERLAY"]),
  prompt: z.string(),
  gcsPath: z.string(),
  durationSec: z.number().nullable().optional(),
  textOverlay: z.string().nullable().optional(),
  approved: z.boolean(),
  createdAt: TimestampSchema,
});
export type CreativeAsset = z.infer<typeof CreativeAssetSchema>;

// ─── ScheduleRule (新規) ──────────────────────────────────────────────────────
export const ScheduleRuleSchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  name: z.string(),
  windows: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startHour: z.number().min(0).max(23),
    endHour: z.number().min(0).max(23),
  })),
  preferredAngles: z.array(AngleSchema).nullable().optional(),
  preferredFormats: z.array(FormatSchema).nullable().optional(),
  fillFromStock: z.boolean(),
  maxPerDay: z.number(),
  minIntervalMinutes: z.number(),
  enabled: z.boolean(),
  createdAt: TimestampSchema,
});
export type ScheduleRule = z.infer<typeof ScheduleRuleSchema>;

// ─── SeasonalEvent (新規) ─────────────────────────────────────────────────────
export const SeasonalEventSchema = z.object({
  serviceId: z.string(),
  name: z.string(),
  category: z.string(),
  date: z.string(),
  ramp: z.object({
    startDaysBefore: z.number(),
    endDaysAfter: z.number(),
    boostFactor: z.number(),
  }),
  topicHints: z.array(z.string()),
  enabled: z.boolean(),
  createdAt: TimestampSchema,
});
export type SeasonalEvent = z.infer<typeof SeasonalEventSchema>;

// ─── ChannelHealthSnapshot (新規) ────────────────────────────────────────────
export const ChannelHealthSnapshotSchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  measuredAt: TimestampSchema,
  followers: z.number(),
  following: z.number(),
  ffRatio: z.number(),
  postsLast7d: z.number(),
  avgReachLast7d: z.number(),
  avgReplyRateLast7d: z.number(),
  avgBookmarkRateLast7d: z.number(),
  blockEvents: z.number().nullable().optional(),
  warnings: z.array(z.string()),
});
export type ChannelHealthSnapshot = z.infer<typeof ChannelHealthSnapshotSchema>;

// ─── KnowledgeEntry (構造化) ──────────────────────────────────────────────────
export const KnowledgeEntrySchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  pattern: z.object({
    angle: AngleSchema.nullable().optional(),
    tone: ToneSchema.nullable().optional(),
    format: FormatSchema.nullable().optional(),
    lengthBand: z.enum(["short", "mid", "long"]).nullable().optional(),
    timeSlot: z.string().nullable().optional(),
    hookPattern: z.string().nullable().optional(),
  }),
  evidence: z.object({
    sampleDraftIds: z.array(z.string()),
    avgReachWeightedScore: z.number(),
    sampleCount: z.number(),
  }).optional(),
  insight: z.string(),
  promptDelta: z.string(),
  createdAt: TimestampSchema,
});
export type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>;

// ─── GenerationLog ────────────────────────────────────────────────────────────
export const GenerationLogSchema = z.object({
  contextType: z.string(),
  contextId: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  createdAt: TimestampSchema,
});
export type GenerationLog = z.infer<typeof GenerationLogSchema>;

// ─── DraftCandidate (生成中間型) ─────────────────────────────────────────────
export interface DraftCandidate {
  angle: Angle;
  tone: Tone;
  format: Format;
  hook: string;
  body: string;
  bodyShort?: string;
  selfReplyText?: string;
  longFormContent?: string;
  threadParts?: string[];
  hashtags: string[];
  estimatedReachScore?: number;
}
