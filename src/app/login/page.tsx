"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { user, loading, authError } = useAuth();
  const router = useRouter();
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/inbox");
  }, [user, loading, router]);

  async function handleGoogleLogin() {
    setSigning(true);
    setError(null);
    try {
      const [{ getAuth, signInWithPopup, GoogleAuthProvider }, { getFirebaseApp }] =
        await Promise.all([
          import("firebase/auth"),
          import("@/lib/auth/firebase-client"),
        ]);
      const auth = getAuth(getFirebaseApp());
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/inbox");
    } catch (e) {
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setSigning(false);
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
          Google アカウントでログインしてください
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
          disabled={signing}
          style={{
            width: "100%",
            padding: "12px 24px",
            borderRadius: "var(--r-pill)",
            background: signing
              ? "rgba(201,119,87,0.6)"
              : "var(--terracotta)",
            color: "#fff",
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            fontWeight: 600,
            border: "none",
            cursor: signing ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(201,119,87,0.4)",
            transition: "opacity 0.2s",
          }}
        >
          {signing ? "ログイン中…" : "Google でログイン"}
        </button>
      </div>
    </div>
  );
}
