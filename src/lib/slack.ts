import { WebClient } from "@slack/web-api";
import type { ChannelDraft } from "@/lib/firestore/schemas";

let _client: WebClient | null = null;

function getWebClient(): WebClient {
  if (_client) return _client;
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
  _client = new WebClient(token);
  return _client;
}

export async function sendDraftNotification(
  drafts: (ChannelDraft & { id: string })[],
  articleTitle: string,
  articleUrl: string
): Promise<string> {
  const client = getWebClient();
  const channel =
    process.env.SLACK_NOTIFICATION_CHANNEL || "#general";

  const draftBlocks = drafts.flatMap((draft, i) => [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${i + 1}. ${draft.angle}*\n${draft.content}`,
      },
    },
    {
      type: "actions",
      block_id: `draft_actions_${draft.id}`,
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "✅ Approve & Post" },
          style: "primary",
          action_id: "approve_draft",
          value: draft.id,
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Skip" },
          action_id: "skip_draft",
          value: draft.id,
        },
      ],
    },
    { type: "divider" },
  ]);

  const response = await client.chat.postMessage({
    channel,
    text: `新規ドラフト候補: ${articleTitle}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "📝 新しいドラフト候補" },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<${articleUrl}|${articleTitle}>*\n${drafts.length}本のドラフトを生成しました。1本を選んで承認してください。`,
        },
      },
      { type: "divider" },
      ...draftBlocks,
      {
        type: "actions",
        block_id: "bulk_actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "全部却下" },
            action_id: "reject_all_drafts",
            value: drafts.map((d) => d.id).join(","),
          },
          {
            type: "button",
            text: { type: "plain_text", text: "↻ 全部再生成" },
            action_id: "regenerate_all_drafts",
            value: drafts[0]?.contentBaseId || "",
          },
        ],
      },
    ],
  });

  return response.ts as string;
}
