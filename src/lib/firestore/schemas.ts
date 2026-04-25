import { z } from "zod";
import { Timestamp } from "@google-cloud/firestore";

const TimestampSchema = z.custom<Timestamp>((val) => val instanceof Timestamp);

// ─── Service ────────────────────────────────────────────────────────────────
export const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().nullable().optional(),
  tone: z.string(),
  persona: z.string(),
  ctaText: z.string().nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  hashtagPool: z.string().nullable().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type Service = z.infer<typeof ServiceSchema>;

// ─── ContentSource ───────────────────────────────────────────────────────────
export const ContentSourceTypeSchema = z.enum(["rss", "sitemap"]);
export const ContentSourceSchema = z.object({
  serviceId: z.string(),
  type: ContentSourceTypeSchema,
  url: z.string().url(),
  enabled: z.boolean(),
  lastPolledAt: TimestampSchema.nullable().optional(),
  createdAt: TimestampSchema,
});
export type ContentSource = z.infer<typeof ContentSourceSchema>;

// ─── ChannelConnection ───────────────────────────────────────────────────────
export const ChannelSchema = z.enum(["x"]);
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

// ─── ContentBase ─────────────────────────────────────────────────────────────
export const ContentBaseSchema = z.object({
  serviceId: z.string(),
  sourceUrl: z.string().url(),
  title: z.string(),
  rawContent: z.string(),
  summary: z.string(),
  keyPoints: z.array(z.string()),
  publishedAt: TimestampSchema.nullable().optional(),
  ingestedAt: TimestampSchema,
});
export type ContentBase = z.infer<typeof ContentBaseSchema>;

// ─── ChannelDraft ─────────────────────────────────────────────────────────────
export const DraftStatusSchema = z.enum([
  "PENDING_REVIEW",
  "APPROVED",
  "QUEUED",
  "REJECTED",
  "PUBLISHED",
  "FAILED",
]);
export type DraftStatus = z.infer<typeof DraftStatusSchema>;

export const ChannelDraftSchema = z.object({
  contentBaseId: z.string(),
  serviceId: z.string(),
  channel: ChannelSchema,
  angle: z.string(),
  content: z.string(),
  hashtags: z.array(z.string()),
  imageAssetId: z.string().nullable().optional(),
  status: DraftStatusSchema,
  slackMessageTs: z.string().nullable().optional(),
  scheduledAt: TimestampSchema.nullable().optional(),
  createdAt: TimestampSchema,
  decidedAt: TimestampSchema.nullable().optional(),
});
export type ChannelDraft = z.infer<typeof ChannelDraftSchema>;

// ─── PublishExecution ─────────────────────────────────────────────────────────
export const PublishExecutionSchema = z.object({
  draftId: z.string(),
  channel: ChannelSchema,
  externalId: z.string(),
  externalUrl: z.string().url(),
  publishedAt: TimestampSchema,
  errorMessage: z.string().nullable().optional(),
  serviceId: z.string(),
});
export type PublishExecution = z.infer<typeof PublishExecutionSchema>;

// ─── OutcomeSnapshot ──────────────────────────────────────────────────────────
export const OutcomeSnapshotSchema = z.object({
  publishId: z.string(),
  measuredAt: TimestampSchema,
  impressions: z.number().int().nonnegative(),
  engagements: z.number().int().nonnegative(),
  clicks: z.number().int().nonnegative(),
  raw: z.record(z.string(), z.unknown()),
});
export type OutcomeSnapshot = z.infer<typeof OutcomeSnapshotSchema>;

// ─── ImageAsset ───────────────────────────────────────────────────────────────
export const ImageSourceSchema = z.enum(["gemini-image", "upload"]);
export const ImageAssetSchema = z.object({
  serviceId: z.string(),
  prompt: z.string(),
  gcsPath: z.string(),
  source: ImageSourceSchema,
  approved: z.boolean(),
  createdAt: TimestampSchema,
});
export type ImageAsset = z.infer<typeof ImageAssetSchema>;

// ─── KnowledgeEntry ───────────────────────────────────────────────────────────
export const KnowledgeEntrySchema = z.object({
  serviceId: z.string(),
  channel: ChannelSchema,
  pattern: z.string(),
  evidence: z.string(),
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
