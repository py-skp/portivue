//components/RequireAuth.tsx

"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Box, CircularProgress } from "@mui/material";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!me?.authenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    if (me?.authenticated && !me?.twofa_ok) {
      router.replace(`/2fa?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
  }, [loading, me, pathname, router]);

  if (loading || !me?.authenticated || (me?.authenticated && !me?.twofa_ok)) {
    return (
      <Box sx={{ flex: 1, display: "grid", placeItems: "center", minHeight: 240 }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}