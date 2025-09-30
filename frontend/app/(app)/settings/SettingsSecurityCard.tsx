"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import {
  Box, Paper, Typography, Stack, Button, Alert, TextField, Divider, Chip, IconButton
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";

import { API_BASE } from "@/lib/api";
const API = API_BASE; // resolves to "/api" if unset, no trailing slash

// const API = process.env.NEXT_PUBLIC_API!;

export default function SettingsPage() {
  const { me, refresh } = useAuth();

  // 2FA setup state
  const [starting, setStarting] = useState(false);
  const [qrReady, setQrReady] = useState(false);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);

  const email = me?.user?.email || "";
  const isEnabled = !!me?.user?.totp_enabled;

  async function startSetup() {
    setErr(null);
    setRecoveryCodes(null);
    setStarting(true);
    try {
      await api("/2fa/setup/start", { method: "POST" });
      setQrReady(true);          // image will load from /2fa/setup/qr
    } catch (e: any) {
      setErr(e.message || "Could not start 2FA setup");
    } finally {
      setStarting(false);
    }
  }

  async function verifySetup(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setVerifying(true);
    setErr(null);
    try {
      const res = await api<{ ok: boolean; recovery_codes?: string[] }>("/2fa/setup/verify", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setRecoveryCodes(res.recovery_codes ?? null);
      setCode("");
      setQrReady(false);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function disable2FA() {
    setDisabling(true);
    setErr(null);
    try {
      await api("/2fa/disable", { method: "POST" });
      setRecoveryCodes(null);
      setQrReady(false);
      await refresh();
    } catch (e: any) {
      setErr(e.message || "Failed to disable 2FA");
    } finally {
      setDisabling(false);
    }
  }

  function copyCodes() {
    if (!recoveryCodes?.length) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
  }

  function downloadCodes() {
    if (!recoveryCodes?.length) return;
    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finlytics-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { setErr(null); }, [isEnabled]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Settings</Typography>

      {/* Profile card */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Profile</Typography>
        <Stack direction="row" spacing={3} sx={{ flexWrap: "wrap" }}>
          <Box><b>Email:</b> {email}</Box>
          <Box>
            <b>Two-Factor Auth:</b>{" "}
            {isEnabled ? <Chip size="small" color="success" label="Enabled" /> : <Chip size="small" label="Disabled" />}
          </Box>
        </Stack>
      </Paper>

      {/* 2FA card */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Two-Factor Authentication (TOTP)</Typography>

        {!!err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

        {!isEnabled && (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Add an extra layer of protection to your account using an authenticator app
              (Google Authenticator, 1Password, Authy, etc).
            </Typography>

            {!qrReady ? (
              <Button variant="contained" onClick={startSetup} disabled={starting}>
                {starting ? "Starting…" : "Start 2FA setup"}
              </Button>
            ) : (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Scan this QR with your authenticator app, then enter the 6-digit code:
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                  {/* Cookies are sent automatically to same-origin API for <img> */}
                  <img
                    src={`${API}/2fa/setup/qr`}
                    alt="2FA QR code"
                    width={200}
                    height={200}
                    style={{ border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8 }}
                  />
                  <Box component="form" onSubmit={verifySetup} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <TextField
                      label="Authenticator code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                      required
                      sx={{ width: 260 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button type="submit" variant="contained" disabled={verifying || !code}>
                        {verifying ? "Verifying…" : "Verify & Enable"}
                      </Button>
                      <Button onClick={() => { setQrReady(false); setCode(""); }} disabled={verifying}>
                        Cancel
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              </>
            )}
          </Stack>
        )}

        {isEnabled && (
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Your account is protected with two-factor authentication. Keep your recovery codes safe.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button color="error" variant="outlined" onClick={disable2FA} disabled={disabling}>
                {disabling ? "Disabling…" : "Disable 2FA"}
              </Button>
            </Stack>
          </Stack>
        )}

        {recoveryCodes && recoveryCodes.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Recovery Codes (save these now)
            </Typography>
            <Alert severity="warning" sx={{ mb: 1 }}>
              These codes are shown only once. Store them in a safe place. Each code can be used once.
            </Alert>
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "background.default" }}>
              <Stack spacing={0.5}>
                {recoveryCodes.map((c) => <code key={c} style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>{c}</code>)}
              </Stack>
            </Paper>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Button startIcon={<ContentCopyIcon />} onClick={copyCodes}>Copy</Button>
              <Button startIcon={<DownloadIcon />} onClick={downloadCodes}>Download</Button>
            </Stack>
          </>
        )}
      </Paper>
    </Box>
  );
}