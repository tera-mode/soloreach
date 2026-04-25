import { TwitterApi } from "twitter-api-v2";
import { decrypt } from "@/lib/crypto";
import { generateText } from "@/lib/gemini";
import { buildDraftGenerationPrompt } from "@/prompts/generate-drafts";
import type { ChannelAdapter, DraftCandidate, PublishResult, OutcomeData } from "@/lib/channels/types";
import type {
  ContentBase,
  Service,
  KnowledgeEntry,
  ChannelDraft,
  ChannelConnection,
  PublishExecution,
} from "@/lib/firestore/schemas";
import { logger } from "@/lib/logger";

export class XAdapter implements ChannelAdapter {
  channel = "x" as const;

  async generateDrafts(
    base: ContentBase,
    service: Service,
    knowledge: KnowledgeEntry[],
    recentDraftPrefixes: string[]
  ): Promise<DraftCandidate[]> {
    const prompt = buildDraftGenerationPrompt(
      base,
      service,
      knowledge,
      recentDraftPrefixes
    );

    const raw = await generateText(prompt, {
      type: "pro",
      contextType: "draft-generation",
      contextId: base.sourceUrl,
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Gemini returned no JSON");

    const parsed = JSON.parse(jsonMatch[0]) as {
      drafts: DraftCandidate[];
    };

    return parsed.drafts.slice(0, 5);
  }

  async publish(
    draft: ChannelDraft,
    conn: ChannelConnection
  ): Promise<PublishResult> {
    const credentials = JSON.parse(
      decrypt(
        conn.encryptedCredentials,
        conn.credentialsIv,
        conn.credentialsTag
      )
    ) as { accessToken: string; refreshToken: string };

    const client = new TwitterApi({
      clientId: process.env.X_CLIENT_ID!,
      clientSecret: process.env.X_CLIENT_SECRET!,
    });

    let accessToken = credentials.accessToken;

    try {
      const text = [
        draft.content,
        draft.hashtags.map((h) => `#${h}`).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data } = await new TwitterApi(accessToken).v2.tweet(text);

      return {
        externalId: data.id,
        externalUrl: `https://x.com/i/web/status/${data.id}`,
      };
    } catch (err) {
      logger.warn({ err }, "Tweet failed, attempting token refresh");

      const { accessToken: newToken, refreshToken: newRefresh } =
        await client.refreshOAuth2Token(credentials.refreshToken);

      accessToken = newToken;

      logger.info("Token refreshed — caller must persist the new tokens");

      const text = [
        draft.content,
        draft.hashtags.map((h) => `#${h}`).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data } = await new TwitterApi(newToken).v2.tweet(text);

      return {
        externalId: data.id,
        externalUrl: `https://x.com/i/web/status/${data.id}`,
      };
    }
  }

  async measureOutcome(
    execution: PublishExecution,
    conn: ChannelConnection
  ): Promise<OutcomeData> {
    const credentials = JSON.parse(
      decrypt(
        conn.encryptedCredentials,
        conn.credentialsIv,
        conn.credentialsTag
      )
    ) as { accessToken: string };

    const client = new TwitterApi(credentials.accessToken);

    const tweet = await client.v2.singleTweet(execution.externalId, {
      "tweet.fields": ["public_metrics"],
    });

    const metrics = (tweet.data.public_metrics ?? {}) as {
      impression_count?: number;
      like_count?: number;
      retweet_count?: number;
      reply_count?: number;
      url_link_clicks?: number;
    };

    return {
      impressions: metrics.impression_count ?? 0,
      engagements:
        (metrics.like_count ?? 0) +
        (metrics.retweet_count ?? 0) +
        (metrics.reply_count ?? 0),
      clicks: metrics.url_link_clicks ?? 0,
      raw: metrics as Record<string, unknown>,
    };
  }
}
