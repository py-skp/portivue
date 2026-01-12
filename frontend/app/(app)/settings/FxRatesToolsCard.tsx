"use client";

import { useState } from "react";
import { RefreshCw, Calendar, AlertCircle, CheckCircle, Database, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

type FetchForDateResp = { date: string; count: number };
type RefreshResp = { base: string; date: string; count: number };

export default function FxRatesToolsCard() {
  const [on, setOn] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [summary, setSummary] = useState<{ title: string; items: Array<[string, string]> } | null>(null);

  function resetUI() {
    setErr(null);
    setMsg(null);
    setSummary(null);
  }

  async function fetchForDate() {
    if (!on) { setErr("Pick a date first."); return; }
    setLoading(true); resetUI();
    try {
      const data = await api<FetchForDateResp>(`/fx/fetch_for_date?on=${encodeURIComponent(on)}`, { method: "POST" });
      setMsg("Done — historical FX stored for the selected date.");
      setSummary({
        title: "Historical Snapshot",
        items: [
          ["Date (UTC)", data.date],
          ["Pairs Upserted", String(data.count)],
        ],
      });
    } catch (e: any) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function refreshLatest() {
    setLoading(true); resetUI();
    try {
      const data = await api<RefreshResp>(`/fx/refresh`, { method: "POST" });
      setMsg("Latest FX refreshed.");
      setSummary({
        title: "Latest Snapshot",
        items: [
          ["As-of Date (UTC)", data.date],
          ["App Base (info)", data.base],
          ["Pairs Upserted", String(data.count)],
        ],
      });
    } catch (e: any) {
      setErr(e.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <RefreshCw size={24} className="text-emerald-500" />
          FX Rates Tools
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage historical and latest currency exchange rates.</p>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl overflow-visible">
        <div className="flex flex-col lg:flex-row gap-6 items-end">
          <div className="flex-1 w-full lg:w-auto">
            <Input
              label="Historical Date (UTC)"
              type="date"
              value={on}
              onChange={(e) => setOn(e.target.value)}
              className="dark:bg-slate-800/50"
              icon={<Calendar size={18} />}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <Button
              onClick={fetchForDate}
              disabled={loading || !on}
              isLoading={loading}
              className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 whitespace-nowrap"
            >
              Fetch Historical
            </Button>

            <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-slate-800 mx-1" />

            <Button
              variant="outline"
              onClick={refreshLatest}
              disabled={loading}
              className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Latest
            </Button>
          </div>
        </div>

        {(err || msg) && (
          <div className="mt-6 flex items-center gap-3">
            {err && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                <AlertCircle size={16} />
                {err}
              </div>
            )}
            {msg && (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                <CheckCircle size={16} />
                {msg}
              </div>
            )}
          </div>
        )}

        {summary && (
          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
              <Database size={16} className="text-emerald-500" />
              {summary.title}
            </h4>

            <div className="flex flex-wrap gap-3">
              {summary.items.map(([label, value]) => (
                <div
                  key={label}
                  className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-200">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}