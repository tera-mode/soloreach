"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TopNav } from "@/components/nav/TopNav";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isOwner, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authError) {
      // Firebase not configured yet — let through for dev previewing
      return;
    }
    if (!user) router.replace("/login");
    else if (!isOwner) router.replace("/login");
  }, [user, loading, isOwner, authError, router]);

  // Show nothing while Firebase auth is resolving
  if (loading) return null;

  // Firebase not configured — allow through for local preview without real credentials
  if (authError) return <>{children}</>;

  if (!user || !isOwner) return null;

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="app-bg" style={{ minHeight: "100vh", position: "relative" }}>
        <TopNav />
        <div style={{ paddingTop: 92 }}>
          <AdminGuard>{children}</AdminGuard>
        </div>
      </div>
    </AuthProvider>
  );
}
