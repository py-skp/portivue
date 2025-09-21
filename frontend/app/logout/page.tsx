"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Box, CircularProgress, Typography } from "@mui/material";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      await logout();
      router.replace("/login");
    })();
  }, [logout, router]);

  return (
    <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>Signing you out…</Typography>
      </Box>
    </Box>
  );
}