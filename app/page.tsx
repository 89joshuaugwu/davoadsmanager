"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogoMark } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-navy px-4">
      <LogoMark className="h-10 w-auto" />
      <p className="font-display text-sm font-semibold tracking-wide text-white/80">Ads Manager</p>
      <Loader2 className="mt-2 animate-spin text-white/70" size={20} />
    </main>
  );
}
