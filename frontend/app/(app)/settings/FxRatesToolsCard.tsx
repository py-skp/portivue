"use client";

import { useState } from "react";
import {
  Paper, Box, Typography, TextField, Button,
  Alert, CircularProgress, Stack, Divider, Chip, Collapse, Link
} from "@mui/material";
import { api } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API!;

type FetchForDateResp = { date: string; count: number };
type RefreshResp      = { base: string; date: string; count: number };

export default function FxRatesToolsCard() {
  const [on, setOn] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // nice summary objects (and raw payload if you want to inspect)
  const [summary, setSummary] = useState<{ title: string; items: Array<[string, string]> } | null>(null);
  const [raw, setRaw] = useState<any>(null);
  const [showRaw, setShowRaw] = useState(false);

  function resetUI() {
    setErr(null);
    setMsg(null);
    setSummary(null);
    setRaw(null);
    setShowRaw(false);
  }

  async function fetchForDate() {
    if (!on) { setErr("Pick a date first."); return; }
    setLoading(true); resetUI();
    try {
      const data = await api<FetchForDateResp>(`/fx/fetch_for_date?on=${encodeURIComponent(on)}`, { method: "POST" });
      setMsg("Done — historical FX stored for the selected date.");
      setSummary({
        title: "Historical snapshot",
        items: [
          ["Date (UTC)", data.date],
          ["Pairs upserted", String(data.count)],
        ],
      });
      setRaw(data);
    } catch (e: any) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshLatest() {
    setLoading(true); resetUI();
    try {
      // OXR is USD-based on free plan; we also compute cross rates
      const data = await api<RefreshResp>(`/fx/refresh`, { method: "POST" });
      setMsg("Latest FX refreshed.");
      setSummary({
        title: "Latest snapshot",
        items: [
          ["As-of date (UTC)", data.date],
          ["App base (info)", data.base],
          ["Pairs upserted", String(data.count)],
        ],
      });
      setRaw(data);
    } catch (e: any) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">FX Rates Tools</Typography>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            label="Historical Date (UTC)"
            type="date"
            value={on}
            onChange={(e) => setOn(e.target.value)}
            InputLabelProps={{ shrink: true }}
            size="small"
          />

          <Button variant="contained" onClick={fetchForDate} disabled={loading || !on}>
            Fetch historical for date
          </Button>

          <Divider flexItem orientation="vertical" />

          <Button variant="outlined" onClick={refreshLatest} disabled={loading}>
            Refresh latest (today)
          </Button>

          {loading && (
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={18} /> <span>Working…</span>
            </Box>
          )}
        </Box>

        {err && <Alert severity="error">{err}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}

        {summary && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: "background.paper",
              border: (t) => `1px solid ${t.palette.divider}`,
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              {summary.title}
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {summary.items.map(([label, value]) => (
                <Chip
                  key={label}
                  label={
                    <span>
                      <strong>{label}:</strong> {value}
                    </span>
                  }
                  variant="outlined"
                />
              ))}
            </Box>

            {raw && (
              <Box sx={{ mt: 2 }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setShowRaw((s) => !s)}
                  sx={{ textDecoration: "underline" }}
                >
                  {showRaw ? "Hide details" : "Show details (JSON)"}
                </Link>
                <Collapse in={showRaw}>
                  <Box
                    sx={{
                      mt: 1,
                      p: 1.5,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                      overflowX: "auto",
                      border: (t) => `1px solid ${t.palette.divider}`,
                    }}
                  >
                    {JSON.stringify(raw, null, 2)}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}