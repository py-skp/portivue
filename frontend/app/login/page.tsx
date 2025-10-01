// app/login/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Hero } from "@/components/auth/Hero";
import { AuthCard } from "@/components/auth/AuthCard";
import { GoogleButton } from "@/components/auth/GoogleButton";
import {
  Stack, Typography, TextField, Button, Divider, Snackbar, Alert
} from "@mui/material";

export const dynamic = "force-dynamic";

function LoginInner() {
  const { me, loading, loginWithGoogle } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // NEW: success confirmation
  const [successOpen, setSuccessOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (me?.authenticated && me.twofa_ok) router.replace(next);
    else if (me?.authenticated && !me.twofa_ok)
      router.replace(`/2fa?next=${encodeURIComponent(next)}`);
  }, [me, loading, next, router]);

  async function emailLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? "Login failed");
      const data = await r.json();
      if (data.twofa_required)
        router.replace(`/2fa?next=${encodeURIComponent(next)}`);
      else
        router.replace(next);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function emailRegister() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/auth/email/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) throw new Error((await r.json()).detail ?? "Sign up failed");
      const data = await r.json();

      if (data.twofa_required) {
        // 2FA path: go directly to the prompt
        router.replace(`/2fa?next=${encodeURIComponent(next)}`);
      } else {
        // Show confirmation first, then redirect
        setSuccessOpen(true);
        setTimeout(() => router.replace(next), 1200);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      hero={<Hero />}
      card={
        <AuthCard>
          <Stack spacing={2}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Welcome to Protivue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign in with email or continue with Google.
            </Typography>

            <form onSubmit={emailLogin}>
              <Stack spacing={1.5}>
                <TextField
                  label="Email"
                  type="email"
                  size="small"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  size="small"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {err && (
                  <Typography variant="caption" color="error">{err}</Typography>
                )}
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={busy}>Sign in</Button>
                  <Button onClick={emailRegister} disabled={busy}>Create account</Button>
                </Stack>
              </Stack>
            </form>

            <Divider flexItem>or</Divider>

            <GoogleButton onClick={loginWithGoogle}>
              Continue with Google
            </GoogleButton>

            <Typography variant="caption" color="text.secondary" align="center">
              We never post to your Google account. You control your data.
            </Typography>
          </Stack>

          {/* Success toast */}
          <Snackbar
            open={successOpen}
            onClose={() => setSuccessOpen(false)}
            autoHideDuration={1200}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert severity="success" variant="filled">
              Account created — signing you in…
            </Alert>
          </Snackbar>
        </AuthCard>
      }
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}