import { Storage } from "@google-cloud/storage";

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (_storage) return _storage;
  const credJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error("GCP_SERVICE_ACCOUNT_JSON is not set");
  _storage = new Storage({ credentials: JSON.parse(credJson) });
  return _storage;
}

export function getDraftsBucket() {
  const name = process.env.GCS_BUCKET_DRAFTS;
  if (!name) throw new Error("GCS_BUCKET_DRAFTS is not set");
  return getStorage().bucket(name);
}

export function getPublicBucket() {
  const name = process.env.GCS_BUCKET_PUBLIC;
  if (!name) throw new Error("GCS_BUCKET_PUBLIC is not set");
  return getStorage().bucket(name);
}

export async function uploadDraft(
  serviceId: string,
  draftId: string,
  filename: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const bucket = getDraftsBucket();
  const gcsPath = `${serviceId}/${draftId}/${filename}`;
  const file = bucket.file(gcsPath);
  await file.save(data, { contentType });
  return gcsPath;
}
