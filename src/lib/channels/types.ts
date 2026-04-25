import type {
  ContentBase,
  Service,
  KnowledgeEntry,
  ChannelDraft,
  ChannelConnection,
  PublishExecution,
} from "@/lib/firestore/schemas";

export interface DraftCandidate {
  angle: string;
  content: string;
  hashtags: string[];
}

export interface PublishResult {
  externalId: string;
  externalUrl: string;
}

export interface OutcomeData {
  impressions: number;
  engagements: number;
  clicks: number;
  raw: Record<string, unknown>;
}

export interface ChannelAdapter {
  channel: string;
  generateDrafts(
    base: ContentBase,
    service: Service,
    knowledge: KnowledgeEntry[],
    recentDraftPrefixes: string[]
  ): Promise<DraftCandidate[]>;
  publish(
    draft: ChannelDraft,
    conn: ChannelConnection
  ): Promise<PublishResult>;
  measureOutcome(
    execution: PublishExecution,
    conn: ChannelConnection
  ): Promise<OutcomeData>;
}
