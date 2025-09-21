"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Hero } from "@/components/auth/Hero";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Stack, Typography } from "@mui/material";

export default function LoginPage() {
  const { me, loading, loginWithGoogle } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/";

  useEffect(() => {
    if (loading) return;
    if (me?.authenticated && me.twofa_ok) {
      router.replace(next);
    } else if (me?.authenticated && !me.twofa_ok) {
      router.replace(`/2fa?next=${encodeURIComponent(next)}`);
    }
  }, [me, loading, next, router]);

  return (
    <AuthLayout
      hero={<Hero />}  // left on md+, below on xs
      card={
        <AuthCard>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Welcome to Protivue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              New here? We’ll create your account. Already with us? We’ll sign
              you in — all with Google.
            </Typography>

            <GoogleButton onClick={loginWithGoogle}>
              Continue with Google
            </GoogleButton>

            <Typography variant="caption" color="text.secondary" align="center">
              We never post to your Google account. You control your data.
            </Typography>
          </Stack>
        </AuthCard>
      }
    />
  );
}