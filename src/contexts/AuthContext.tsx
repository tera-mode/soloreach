"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isOwner: false,
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey || apiKey === "xxxxxxxxxxxxxxxxxxxxxxxxxxxx") {
      setLoading(false);
      setAuthError("Firebase 環境変数が設定されていません。.env を確認してください。");
      return;
    }

    let unsubscribe: (() => void) | undefined;

    import("firebase/auth")
      .then(({ getAuth, onAuthStateChanged }) => {
        import("@/lib/auth/firebase-client").then(({ getFirebaseApp }) => {
          try {
            const auth = getAuth(getFirebaseApp());
            unsubscribe = onAuthStateChanged(
              auth,
              (u) => {
                setUser(u);
                setLoading(false);
                // セッション Cookie を同期（ページリフレッシュ後も UID をサーバーに伝達）
                if (u) {
                  fetch("/api/auth/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid: u.uid }),
                  }).catch(() => {});
                } else {
                  fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
                }
              },
              (err) => {
                setAuthError(err.message);
                setLoading(false);
              }
            );
          } catch (err) {
            setAuthError(String(err));
            setLoading(false);
          }
        });
      })
      .catch((err) => {
        setAuthError(String(err));
        setLoading(false);
      });

    return () => unsubscribe?.();
  }, []);

  const ownerUids = (process.env.NEXT_PUBLIC_OWNER_UIDS || "").split(",").filter(Boolean);
  // 匿名ユーザーも isOwner として扱う（全機能利用可、セッション消去で失効）
  const isOwner = !!user && (ownerUids.includes(user.uid) || user.isAnonymous);

  return (
    <AuthContext.Provider value={{ user, loading, isOwner, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
