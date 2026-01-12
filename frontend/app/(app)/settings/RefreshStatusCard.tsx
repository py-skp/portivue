"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Clock, RefreshCw, AlertCircle, CheckCircle, Loader2, Info, Database } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const API = API_BASE;
const SCHED_API = (process.env.NEXT_PUBLIC_SCHEDULER_API || "").trim() || API;

type JobInfo = {
  id: string;
  next_run_time: string | null;
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
    // Only show loader on initial load if we don't have data
    if (!data) setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${SCHED_API}/_scheduler_status`, {
        credentials: "include",
      });
      const body = await safeJson(r);
      if (!r.ok) {
        const msg = typeof body === "string" ? body : (body as any)?.detail || r.statusText;
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
      const hint = SCHED_API !== API ? ` (scheduler at ${SCHED_API} unreachable?)` : "";
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
        const msg = typeof body === "string" ? body : (body as any)?.detail || r.statusText;
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
            <Activity size={24} className="text-emerald-500" />
            System Refresh Health
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Monitor automated price and FX rate update jobs.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all ${data?.enabled
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm shadow-emerald-500/5"
            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
          }`}>
          <span className={`w-2 h-2 rounded-full ${data?.enabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Scheduler: {data?.enabled ? "Active" : "Paused"}
          </span>
        </div>
      </div>

      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {/* Prices Section */}
          <div className="p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-emerald-500">
                    <Database size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white">Market Prices</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Provider</span>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-200 uppercase">{data?.provider ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Last Refresh</span>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{fmt(data?.last_runs?.prices)}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Next Scheduled</span>
                    <p className="text-sm font-semibold text-emerald-500">{fmt(nextPrices)}</p>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  onClick={kickPricesOnce}
                  disabled={kicking}
                  isLoading={kicking}
                  className="w-full lg:w-auto bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 px-8"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Trigger Manual Sync
                </Button>
              </div>
            </div>
          </div>

          {/* FX Rates Section */}
          <div className="p-8 bg-slate-50/50 dark:bg-black/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-blue-500">
                <RefreshCw size={20} />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Currency Conversion</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Exchange Base</span>
                <p className="text-sm font-black text-slate-900 dark:text-slate-200 uppercase">INTERNAL SYSTEM</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Last Update</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{fmt(data?.last_runs?.fx)}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Next Interval</span>
                <p className="text-sm font-semibold text-emerald-500">{fmt(nextFx)}</p>
              </div>
              <div className="hidden lg:flex items-center justify-end">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  Live Rates Active
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Feedback */}
        {(err || kickMsg) && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
            {err && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-in slide-in-from-bottom-2">
                <AlertCircle size={18} />
                {err}
              </div>
            )}
            {kickMsg && (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium animate-in slide-in-from-bottom-2">
                <CheckCircle size={18} />
                {kickMsg}
              </div>
            )}
          </div>
        )}
      </Card>

      {loading && !data && (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="animate-spin text-emerald-500" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">Syncing system status...</p>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        <Info size={18} className="text-slate-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The system automatically refreshes market prices and exchange rates at predefined intervals. Manual sync is only recommended if you notice persistent data staleness or after adding new instruments.
        </p>
      </div>
    </div>
  );
}