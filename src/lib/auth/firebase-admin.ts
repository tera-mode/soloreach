import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let _app: App | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  const apps = getApps();
  if (apps.length > 0) {
    _app = apps[0];
    return _app;
  }

  const credJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  if (!credJson) throw new Error("GCP_SERVICE_ACCOUNT_JSON is not set");

  _app = initializeApp({
    credential: cert(JSON.parse(credJson)),
    projectId: process.env.GCP_PROJECT_ID,
  });

  return _app;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string }> {
  const auth = getAuth(getAdminApp());
  const decoded = await auth.verifyIdToken(idToken);
  return { uid: decoded.uid, email: decoded.email };
}

export function isOwner(uid: string): boolean {
  const ownerUids = (process.env.NEXT_PUBLIC_OWNER_UIDS || "").split(",");
  return ownerUids.includes(uid);
}
