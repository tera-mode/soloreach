"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading, authError } = useAuth();
  const router = useRouter();
  const [signing, setSigning] = useState<"google" | "guest" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/drafts");
  }, [user, loading, router]);

  async function setSessionCookie(uid: string) {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    });
  }

  async function handleGoogleLogin() {
    setSigning("google");
    setError(null);
    try {
      const [{ getAuth, signInWithPopup, GoogleAuthProvider }, { getFirebaseApp }] =
        await Promise.all([
          import("firebase/auth"),
          import("@/lib/auth/firebase-client"),
        ]);
      const auth = getAuth(getFirebaseApp());
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      await setSessionCookie(result.user.uid);
      router.replace("/drafts");
    } catch {
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setSigning(null);
    }
  }

  async function handleGuestLogin() {
    setSigning("guest");
    setError(null);
    try {
      const [{ getAuth, signInAnonymously }, { getFirebaseApp }] =
        await Promise.all([
          import("firebase/auth"),
          import("@/lib/auth/firebase-client"),
        ]);
      const auth = getAuth(getFirebaseApp());
      const result = await signInAnonymously(auth);
      await setSessionCookie(result.user.uid);
      router.replace("/drafts");
    } catch {
      setError("ゲストログインに失敗しました。もう一度お試しください。");
    } finally {
      setSigning(null);
    }
  }

  const displayError = error || authError;

  return (
    <div
      className="app-bg"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      }}
    >
      <div
        className="glass"
        style={{
          padding: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          borderRadius: "var(--r-xl)",
          maxWidth: 360,
          width: "100%",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "linear-gradient(135deg, var(--terracotta), var(--ochre))",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            SoloReach
          </span>
        </div>

        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--text-muted)",
            textAlign: "center",
            margin: 0,
          }}
        >
          管理画面にアクセスするには
          <br />
          ログインしてください
        </p>

        {displayError && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12.5,
              color: "var(--terracotta)",
              textAlign: "center",
              margin: 0,
              padding: "8px 12px",
              background: "var(--terracotta-glass)",
              borderRadius: "var(--r-md)",
              width: "100%",
            }}
          >
            {displayError}
          </p>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={signing !== null}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: "var(--r-pill)",
            background: signing === "google" ? "rgba(201,119,87,0.6)" : "var(--terracotta)",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: signing !== null ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(201,119,87,0.4)",
            transition: "opacity 0.2s",
          }}
        >
          {signing === "google" ? "ログイン中…" : "Google でログイン"}
        </button>

        {/* 区切り */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(40,34,26,0.12)" }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-dim)" }}>または</span>
          <div style={{ flex: 1, height: 1, background: "rgba(40,34,26,0.12)" }} />
        </div>

        <button
          onClick={handleGuestLogin}
          disabled={signing !== null}
          style={{
            width: "100%",
            padding: "11px 24px",
            borderRadius: "var(--r-pill)",
            background: signing === "guest" ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.72)",
            color: "var(--text-muted)",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            border: "1.5px solid rgba(40,34,26,0.12)",
            cursor: signing !== null ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {signing === "guest" ? "入室中…" : "ゲストとして試す"}
        </button>

        <p style={{
          fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-dim)",
          textAlign: "center", margin: 0, lineHeight: 1.6,
        }}>
          ゲストセッションはブラウザのデータを消去すると
          <br />
          失効し、再ログインはできません
        </p>
      </div>
    </div>
  );
}
