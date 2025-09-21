"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

/**
 * Root route: redirect based on authentication state.
 */
export default function HomeGate() {
  const router = useRouter();
  const { me, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (me?.authenticated) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [loading, me, router]);

  // lightweight spinner while deciding
  return <div style={{ padding: 24 }}>Loading…</div>;
}