import { cookies } from "next/headers";
import type { Firestore } from "@google-cloud/firestore";

const COOKIE_NAME = "_sr_uid";

export async function getCurrentUid(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * 現在のユーザーが閲覧可能な serviceId の配列を返す。
 *
 * - NEXT_PUBLIC_OWNER_UIDS に含まれるメインオーナーは全サービスを見られる（後方互換）
 * - それ以外（匿名ユーザー等）は ownerUid が一致するサービスのみ
 */
export async function getServiceIdsForCurrentUser(db: Firestore): Promise<string[]> {
  const uid = await getCurrentUid();
  if (!uid) return [];

  const ownerUids = (process.env.NEXT_PUBLIC_OWNER_UIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ownerUids.includes(uid)) {
    // メインオーナー: ownerUid 未設定のレガシードキュメントも含めて全取得
    const snap = await db.collection("services").limit(20).get();
    return snap.docs.map((d) => d.id);
  }

  // その他ユーザー: 自分が owner のサービスのみ
  const snap = await db
    .collection("services")
    .where("ownerUid", "==", uid)
    .limit(20)
    .get();
  return snap.docs.map((d) => d.id);
}
