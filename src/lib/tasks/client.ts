import { CloudTasksClient } from "@google-cloud/tasks";

let _client: CloudTasksClient | null = null;

function getClient(): CloudTasksClient {
  if (_client) return _client;

  const credJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error("GCP_SERVICE_ACCOUNT_JSON is not set");

  _client = new CloudTasksClient({
    credentials: JSON.parse(credJson),
  });
  return _client;
}

export type QueueName =
  | "idea-ingestion"
  | "content-base-generation"
  | "draft-batch-generation"
  | "draft-generation"
  | "creative-generation"
  | "draft-publish"
  | "outcome-measurement"
  | "knowledge-building"
  | "news-fast-track";

interface EnqueueOptions {
  queue: QueueName;
  payload: Record<string, unknown>;
  scheduleAt?: Date;
}

export async function enqueueTask({
  queue,
  payload,
  scheduleAt,
}: EnqueueOptions): Promise<void> {
  const client = getClient();
  const projectId = process.env.GCP_PROJECT_ID;
  const location = process.env.CLOUD_TASKS_QUEUE_LOCATION || "asia-northeast1";
  const baseUrl = process.env.APP_BASE_URL;
  const serviceAccountEmail = JSON.parse(
    process.env.GCP_SERVICE_ACCOUNT_JSON!
  ).client_email as string;

  if (!projectId || !baseUrl) {
    throw new Error("GCP_PROJECT_ID or APP_BASE_URL is not set");
  }

  const queuePath = client.queuePath(projectId, location, queue);

  const urlMap: Record<QueueName, string> = {
    "idea-ingestion": `${baseUrl}/api/tasks/ingest-idea`,
    "content-base-generation": `${baseUrl}/api/tasks/generate-content-base`,
    "draft-batch-generation": `${baseUrl}/api/tasks/generate-draft-batch`,
    "draft-generation": `${baseUrl}/api/tasks/generate-channel-drafts`,
    "creative-generation": `${baseUrl}/api/tasks/generate-creative`,
    "draft-publish": `${baseUrl}/api/tasks/publish-draft`,
    "outcome-measurement": `${baseUrl}/api/tasks/measure-outcome`,
    "knowledge-building": `${baseUrl}/api/tasks/build-knowledge`,
    "news-fast-track": `${baseUrl}/api/tasks/ingest-idea`,
  };

  await client.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url: urlMap[queue],
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify(payload)).toString("base64"),
        oidcToken: {
          serviceAccountEmail,
          audience: baseUrl,
        },
      },
      ...(scheduleAt && {
        scheduleTime: {
          seconds: Math.floor(scheduleAt.getTime() / 1000),
        },
      }),
    },
  });
}
