import { Firestore } from "@google-cloud/firestore";

let _db: Firestore | null = null;

export function getFirestore(): Firestore {
  if (_db) return _db;

  const isEmulator =
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.NODE_ENV === "test";

  if (isEmulator) {
    _db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || "soloreach-dev",
      databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
    });
  } else {
    const credJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
    if (!credJson) throw new Error("GCP_SERVICE_ACCOUNT_JSON is not set");

    _db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID,
      databaseId: process.env.FIRESTORE_DATABASE_ID || "(default)",
      credentials: JSON.parse(credJson),
    });
  }

  return _db;
}

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return getFirestore()[prop as keyof Firestore];
  },
});
