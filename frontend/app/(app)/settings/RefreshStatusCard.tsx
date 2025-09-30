"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Paper, Stack, Typography, Box, Chip, Divider, CircularProgress, Alert, Button,
} from "@mui/material";
import { API_BASE } from "@/lib/api";

const API = API_BASE; // "/api" if unset
// Point this to the scheduler container in dev: e.g. http://localhost:8001
const SCHED_API =
  (process.env.NEXT_PUBLIC_SCHEDULER_API || "").trim() || API;

type JobInfo = {
  id: string;
  next_run_time: string | null; // ISO
  trigger: string;
};

type SchedulerStatus = {
  enabled: boolean;
  provider?: string;
  last_runs?: { prices: string | null; fx: string | null };
  jobs: JobInfo[];
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

async function safeJson<T = any>(r: Response): Promise<T | string> {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  return r.text();
}

export default function RefreshStatusCard() {
  const [data, setData] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SCHED_API}/_scheduler_status`, {
        credentials: "include",
      });
      const body = await safeJson(r);
      if (!r.ok) {
        const msg =
          typeof body === "string" ? body : (body as any)?.detail || r.statusText;
        throw new Error(msg);
      }
      const normalized: SchedulerStatus = {
        enabled: !!(body as any).enabled,
        provider: (body as any).provider ?? "auto",
        last_runs: (body as any).last_runs ?? { prices: null, fx: null },
        jobs: Array.isArray((body as any).jobs)
          ? (body as any).jobs.map((j: any) =>
              typeof j === "string"
                ? { id: j, trigger: "", next_run_time: null }
                : j
            )
          : [],
      };
      setData(normalized);
    } catch (e: any) {
      const hint =
        SCHED_API !== API
          ? ` (scheduler at ${SCHED_API} unreachable?)`
          : "";
      setErr((e.message || String(e)) + hint);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const nextPrices = useMemo(() => {
    const j = data?.jobs?.find((j) => j.id.toLowerCase().includes("prices"));
    return j?.next_run_time ?? null;
  }, [data]);

  const nextFx = useMemo(() => {
    const j = data?.jobs?.find((j) => j.id.toLowerCase().includes("fx"));
    return j?.next_run_time ?? null;
  }, [data]);

  const [kicking, setKicking] = useState(false);
  const [kickMsg, setKickMsg] = useState<string | null>(null);
  async function kickPricesOnce() {
    setKicking(true);
    setErr(null);
    setKickMsg(null);
    try {
      const r = await fetch(
        `${API}/instruments/refresh_all_prices?timeout_sec=120`,
        { method: "POST", credentials: "include" }
      );
      const body = await safeJson(r);
      if (!r.ok) {
        const msg =
          typeof body === "string" ? body : (body as any)?.detail || r.statusText;
        throw new Error(msg);
      }
      setKickMsg(
        typeof body === "string"
          ? body
          : `Updated ${(body as any)?.updated ?? 0} / ${(body as any)?.processed ?? 0}`
      );
      setTimeout(load, 1000);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setKicking(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Refresh Status</Typography>
          <Chip
            size="small"
            color={data?.enabled ? "success" : "default"}
            label={data?.enabled ? "Scheduler: ON" : "Scheduler: OFF"}
            title={
              SCHED_API !== API
                ? `Reading status from ${SCHED_API}`
                : "Reading status from main API"
            }
          />
        </Box>

        {loading && <CircularProgress size={18} />}
        {err && <Alert severity="error">{err}</Alert>}
        {kickMsg && <Alert severity="success">{kickMsg}</Alert>}

        <Stack spacing={1.5} divider={<Divider />}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Prices
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Provider
                </Typography>
                <Typography>{data?.provider ?? "—"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Last refresh
                </Typography>
                <Typography>{fmt(data?.last_runs?.prices)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Next run
                </Typography>
                <Typography>{fmt(nextPrices)}</Typography>
              </Box>
            </Stack>
            <Box mt={1.5}>
              <Button
                size="small"
                variant="contained"
                onClick={kickPricesOnce}
                disabled={kicking}
              >
                {kicking ? "Refreshing…" : "Refresh now"}
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              FX Rates
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Last refresh
                </Typography>
                <Typography>{fmt(data?.last_runs?.fx)}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Next run
                </Typography>
                <Typography>{fmt(nextFx)}</Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}