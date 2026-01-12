"use client";

import { useEffect, useState } from "react";
import { Coins, Save, RefreshCw, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const API = API_BASE;

type Currency = { code: string; name?: string | null };

export default function BaseCurrencyCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [base, setBase] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const rc = await fetch(`${API}/currencies`, { credentials: "include" });
      if (!rc.ok) throw new Error(`Currencies ${rc.status}`);
      const list: Currency[] = await rc.json();
      setCurrencies(list);

      const rs = await fetch(`${API}/settings`, { credentials: "include" });
      if (!rs.ok) throw new Error(`Settings ${rs.status}`);
      const s = await rs.json();
      const saved = s.base_currency_code?.trim();

      setBase(saved || "USD");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`${API}/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_currency_code: base || null }),
      });
      const body = await r.text();
      if (!r.ok) throw new Error(`Save ${r.status}: ${body.slice(0, 200)}`);
      setMsg("Base currency updated successfully.");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Coins size={24} className="text-emerald-500" />
          Base Currency
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Set the default currency for your portfolio reporting.</p>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl overflow-visible">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 mb-1.5 block">Portfolio Currency</label>
                <select
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none text-slate-900 dark:text-slate-200"
                >
                  {currencies.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}{c.name ? ` — ${c.name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  onClick={save}
                  disabled={saving || !base}
                  isLoading={saving}
                  className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 px-8"
                >
                  <Save size={18} className="mr-2" />
                  Save Preference
                </Button>

                <Button
                  variant="ghost"
                  onClick={load}
                  disabled={saving}
                  className="text-slate-400"
                >
                  <RefreshCw size={18} />
                </Button>
              </div>
            </div>

            {(err || msg) && (
              <div className="flex items-center gap-3">
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
          </div>
        )}
      </Card>
    </div>
  );
}