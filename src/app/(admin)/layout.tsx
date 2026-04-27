"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/nav/BottomNav";
import { TopNav } from "@/components/nav/TopNav";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isOwner, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authError) return;
    if (!user) router.replace("/login");
    else if (!isOwner) router.replace("/login");
  }, [user, loading, isOwner, authError, router]);

  if (loading) return null;
  if (authError) return <>{children}</>;
  if (!user || !isOwner) return null;
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div
        className="app-bg"
        style={{ minHeight: "100dvh" }}
      >
        <TopNav />
        <AdminGuard>{children}</AdminGuard>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
