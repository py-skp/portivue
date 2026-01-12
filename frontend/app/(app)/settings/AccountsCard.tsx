"use client";

import { useState, useEffect } from "react";
import { Plus, CreditCard, Building2, AlertCircle, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

const API = API_BASE;

const nf2 = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fmt2 = (v: unknown) => nf2.format(Number(v ?? 0));
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

type Currency = { code: string; name?: string };

export default function AccountsCard() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [form, setForm] = useState({
    name: "",
    currency_code: "USD",
    type: "Broker",
    balance: 0,
  });

  async function loadAccounts() {
    const r = await fetch(`${API}/accounts`, { credentials: "include" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || r.statusText);
    setAccounts(data);
  }

  async function loadCurrencies() {
    const r = await fetch(`${API}/lookups/currencies`, { credentials: "include" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.detail || r.statusText);

    const list: Currency[] = (Array.isArray(data) ? data : [])
      .map((c: any) =>
        typeof c === "string" ? { code: c } : { code: c.code ?? c.Code ?? "", name: c.name ?? c.Name }
      )
      .filter(c => c.code);

    setCurrencies(list);

    if (list.length && !list.find(c => c.code === form.currency_code)) {
      const fallback = list.find(c => c.code === "USD")?.code ?? list[0]?.code ?? "";
      setForm(f => ({ ...f, currency_code: fallback }));
    }
  }

  async function loadAll() {
    setErr(null);
    setLoading(true);
    setLoadingMeta(true);
    try {
      await Promise.all([loadAccounts(), loadCurrencies()]);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
      setLoadingMeta(false);
    }
  }

  async function createAccount() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`${API}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          balance: round2(form.balance),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.detail || r.statusText);

      setMsg("Account created.");
      setForm(f => ({ ...f, name: "", balance: 0 }));
      await loadAccounts();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
          <Building2 size={24} className="text-emerald-500" />
          Accounts
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage your underlying financial accounts.</p>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 shadow-xl overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <Input
            label="Account Name"
            placeholder="e.g. Chase Savings"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="dark:bg-slate-800/50"
          />

          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Currency</label>
            <select
              value={form.currency_code}
              onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
              disabled={loadingMeta || currencies.length === 0}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none text-slate-900 dark:text-slate-200"
            >
              {currencies.length === 0 ? (
                <option value="" disabled>No currencies</option>
              ) : (
                currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}{c.name ? ` — ${c.name}` : ""}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none text-slate-900 dark:text-slate-200"
            >
              {["Current", "Savings", "Fixed Deposit", "Investment", "Broker", "Other"].map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <Input
            label="Initial Balance"
            type="number"
            placeholder="0.00"
            value={form.balance || ""}
            onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
            onBlur={() => setForm(f => ({ ...f, balance: round2(f.balance) }))}
            className="dark:bg-slate-800/50"
          />
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex-1">
            {err && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                <AlertCircle size={16} />
                {err}
              </div>
            )}
            {msg && (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                <Plus size={16} className="rotate-45" />
                {msg}
              </div>
            )}
          </div>
          <Button
            onClick={createAccount}
            isLoading={loading}
            disabled={!form.name || !form.currency_code || currencies.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          >
            Add Account
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Existing Accounts</h4>
        {loading && accounts.length === 0 ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center p-12 bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <p className="text-slate-400 font-medium">No accounts found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl hover:border-emerald-500/30 transition-all shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-200">{acc.name}</h5>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                      {acc.currency_code} <span className="text-slate-300 dark:text-slate-700 mx-1">•</span> {acc.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                    {fmt2(acc.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}