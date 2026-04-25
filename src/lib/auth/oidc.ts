import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client();

export async function verifyCloudTasksOidcToken(
  authHeader: string | null
): Promise<void> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);
  const audience =
    process.env.TASKS_OIDC_AUDIENCE || process.env.APP_BASE_URL;

  if (!audience) {
    throw new Error("TASKS_OIDC_AUDIENCE is not set");
  }

  await client.verifyIdToken({ idToken: token, audience });
}

export function verifyCronSecret(authHeader: string | null): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not set");

  const expected = `Bearer ${secret}`;
  if (authHeader !== expected) {
    throw new Error("Invalid CRON_SECRET");
  }
}
