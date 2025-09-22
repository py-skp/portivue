// app/2fa/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { Box, Paper, Typography, TextField, Button, Alert, Stack } from "@mui/material";

export const dynamic = "force-dynamic"; // auth pages shouldn't be statically prerendered

function TwoFAInner() {
  const { me, loading, refresh } = useAuth();
  const sp = useSearchParams();
  const router = useRouter();
  const next = sp.get("next") || "/";

  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!me?.authenticated) router.replace(`/login?next=${encodeURIComponent(next)}`);
    if (me?.authenticated && me.twofa_ok) router.replace(next);
  }, [me, loading, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    setErr(null);
    try {
      await api("/2fa/verify", { method: "POST", body: JSON.stringify({ code: code.trim() }) });
      await refresh();
      router.replace(next);
    } catch (e: any) {
      setErr(e.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "70vh", px: 2 }}>
      <Paper elevation={1} sx={{ p: 4, width: 420, maxWidth: "100%" }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          Two-Factor Verification
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Enter your 6-digit authenticator code (or a recovery code).
        </Typography>

        {!!err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        <Box component="form" onSubmit={submit}>
          <Stack spacing={2}>
            <TextField
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              autoFocus
              required
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={submitting || !code}>
              {submitting ? "Verifying…" : "Verify"}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}

export default function TwoFAPage() {
  // Wrap the client component that uses useSearchParams in Suspense
  return (
    <Suspense fallback={null}>
      <TwoFAInner />
    </Suspense>
  );
}