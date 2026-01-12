"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  RefreshCw,
  ArrowRightLeft,
  History,
  Info,
  X,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Building2,
  Calendar,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  TrendingUp,
  Search,
  MoreVertical
} from "lucide-react";
import { API_BASE } from "@/lib/api";

const API = API_BASE;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const txt = await r.text();
  let body: any = null;
  try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  if (!r.ok) throw new Error((body && body.detail) || `${r.status} ${r.statusText}`);
  return body as T;
}

type AccountBalance = {
  account_id: number;
  account_name: string;
  account_currency: string;
  account_type?: string | null;
  balance_ccy: number;
  balance_base: number;
  fx_rate?: number | null;
  as_of: string;
  base_currency: string;
};

type ActivityCore = {
  id: number;
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee" | "Transfer";
  account_id: number;
  instrument_id: number | null;
  date: string;
  quantity?: number | null;
  unit_price?: number | null;
  currency_code: string;
  fee?: number | null;
  note?: string | null;
  broker_id?: number | null;
};

type ActivityCalc = ActivityCore & {
  base_currency: string;
  fx_rate: number | null;
  gross_amount: number;
  net_amount: number;
  gross_amount_base: number | null;
  net_amount_base: number | null;
};

type Activity = ActivityCore | ActivityCalc;

type Broker = { id: number; name: string };
type Instrument = { id: number; symbol: string | null; name: string; currency_code: string };

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRate = (r: number | null | undefined) => (r == null ? "—" : r.toFixed(6));

export default function AccountsBalancesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<AccountBalance[]>([]);

  const [accountsList, setAccountsList] = useState<{ id: number; name: string; currency_code: string }[]>([]);
  const [brokers, setBrokers] = useState<Record<number, Broker>>({});

  // Update Balance Dialog
  const [ubOpen, setUbOpen] = useState(false);
  const [ubAccount, setUbAccount] = useState<AccountBalance | null>(null);
  const [ubBalance, setUbBalance] = useState("");
  const [ubAsOf, setUbAsOf] = useState("");
  const [ubNote, setUbNote] = useState("");
  const [ubSubmitting, setUbSubmitting] = useState(false);
  const [ubErr, setUbErr] = useState<string | null>(null);

  // Transfer Dialog
  const [tfOpen, setTfOpen] = useState(false);
  const [tfFromId, setTfFromId] = useState<number | "">("");
  const [tfToId, setTfToId] = useState<number | "">("");
  const [tfAmount, setTfAmount] = useState("");
  const [tfCurrency, setTfCurrency] = useState("");
  const [tfDate, setTfDate] = useState("");
  const [tfNote, setTfNote] = useState("");
  const [tfFxOverride, setTfFxOverride] = useState("");
  const [tfFxAuto, setTfFxAuto] = useState<number | null>(null);
  const [tfLanded, setTfLanded] = useState<number | null>(null);
  const [tfSubmitting, setTfSubmitting] = useState(false);
  const [tfErr, setTfErr] = useState<string | null>(null);

  // Activity Drawer
  const [actOpen, setActOpen] = useState(false);
  const [actAccount, setActAccount] = useState<AccountBalance | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [actRows, setActRows] = useState<Activity[]>([]);
  const [instMap, setInstMap] = useState<Record<number, Instrument>>({});

  const baseCcy = rows[0]?.base_currency ?? "BASE";

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        const [balances, accs, brs] = await Promise.all([
          api<AccountBalance[]>("/accounts/balances"),
          api<{ id: number; name: string; currency_code: string }[]>("/lookups/accounts"),
          api<Broker[]>("/lookups/brokers").catch(() => [] as Broker[]),
        ]);
        setRows(balances);
        setAccountsList(accs);
        const map: Record<number, Broker> = {};
        for (const b of brs) map[b.id] = b;
        setBrokers(map);
      } catch (e: any) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  async function reload() {
    setRefreshing(true);
    try {
      const data = await api<AccountBalance[]>("/accounts/balances");
      setRows(data);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }

  // Update Balance
  function openUpdateBalance(row: AccountBalance) {
    setUbErr(null);
    setUbAccount(row);
    setUbBalance(String(row.balance_ccy));
    setUbAsOf(row.as_of || new Date().toISOString().slice(0, 10));
    setUbNote("");
    setUbOpen(true);
  }

  async function submitUpdateBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!ubAccount) return;
    const v = Number.parseFloat(ubBalance);
    if (!Number.isFinite(v)) { setUbErr("Enter a valid number"); return; }
    setUbSubmitting(true);
    setUbErr(null);
    try {
      const body: any = { balance: v, as_of: ubAsOf, note: ubNote };
      await api(`/accounts/${ubAccount.account_id}/set_balance`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await reload();
      setUbOpen(false);
    } catch (e: any) {
      setUbErr(e.message || "Update failed");
    } finally {
      setUbSubmitting(false);
    }
  }

  // Transfer
  function openTransfer(from?: AccountBalance) {
    setTfErr(null);
    setTfFxOverride("");
    setTfFxAuto(null);
    setTfLanded(null);
    setTfOpen(true);
    if (from) {
      setTfFromId(from.account_id);
      setTfCurrency(from.account_currency);
    } else {
      setTfFromId("");
      setTfCurrency("");
    }
    setTfToId("");
    setTfAmount("");
    setTfDate(new Date().toISOString().slice(0, 10));
    setTfNote("");
  }

  useEffect(() => {
    if (tfFromId && typeof tfFromId === "number") {
      const acc = accountsList.find(a => a.id === tfFromId);
      if (acc) setTfCurrency(acc.currency_code);
    }
  }, [tfFromId, accountsList]);

  useEffect(() => {
    if (!tfFromId || !tfToId || !tfAmount || !tfCurrency || !tfDate) {
      setTfLanded(null);
      return;
    }
    const amt = Number.parseFloat(tfAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setTfLanded(null); return; }

    const fromAcc = accountsList.find(a => a.id === tfFromId);
    const toAcc = accountsList.find(a => a.id === tfToId);
    if (!fromAcc || !toAcc) { setTfLanded(null); return; }

    if (fromAcc.currency_code === toAcc.currency_code) {
      const effRate = tfFxOverride ? Number.parseFloat(tfFxOverride) : 1;
      setTfFxAuto(1);
      setTfLanded(Number.isFinite(effRate) ? amt * effRate : amt);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        const fx = await api<{ rate: number | null }>(
          `/fx/latest?base=${encodeURIComponent(tfCurrency)}&quote=${encodeURIComponent(toAcc.currency_code)}&on=${encodeURIComponent(tfDate)}`
        );
        if (aborted) return;
        setTfFxAuto(fx.rate);
        const effRate = tfFxOverride && Number.isFinite(Number.parseFloat(tfFxOverride))
          ? Number.parseFloat(tfFxOverride)
          : fx.rate;
        setTfLanded(effRate != null ? amt * effRate : null);
      } catch {
        if (aborted) return;
        setTfFxAuto(null);
        const effRate = tfFxOverride && Number.isFinite(Number.parseFloat(tfFxOverride)) ? Number.parseFloat(tfFxOverride) : null;
        setTfLanded(effRate != null ? amt * effRate : null);
      }
    })();
    return () => { aborted = true; };
  }, [tfFromId, tfToId, tfAmount, tfCurrency, tfDate, tfFxOverride, accountsList]);

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    setTfSubmitting(true);
    setTfErr(null);
    try {
      if (!tfFromId || !tfToId) throw new Error("Choose both From and To accounts");
      const amt = Number.parseFloat(tfAmount);
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount > 0");
      if (tfFromId === tfToId) throw new Error("Accounts must be different");

      const body: any = {
        from_account_id: Number(tfFromId),
        to_account_id: Number(tfToId),
        amount: amt,
        currency_code: tfCurrency,
        date: tfDate,
        note: tfNote || undefined,
      };
      if (tfFxOverride && Number.isFinite(Number.parseFloat(tfFxOverride))) {
        body.fx_rate_override = Number.parseFloat(tfFxOverride);
      }
      await api(`/accounts/transfer`, { method: "POST", body: JSON.stringify(body) });
      await reload();
      setTfOpen(false);
    } catch (e: any) {
      setTfErr(e.message || "Transfer failed");
    } finally {
      setTfSubmitting(false);
    }
  }

  // Activity Drawer
  async function openActivity(row: AccountBalance) {
    setActAccount(row);
    setActErr(null);
    setActOpen(true);
    setActLoading(true);
    setActRows([]);
    try {
      let acts = await api<Activity[]>(`/activities?account_id=${encodeURIComponent(row.account_id)}`);
      acts = acts.filter(a => a.account_id === row.account_id);
      const ids = Array.from(new Set(acts.map(a => a.instrument_id).filter(Boolean))) as number[];
      const fetched: Record<number, Instrument> = {};
      await Promise.all(ids.map(async (id) => {
        try { fetched[id] = await api<Instrument>(`/instruments/${id}`); } catch { }
      }));
      setInstMap(fetched);
      setActRows(acts);
    } catch (e: any) {
      setActErr(e.message || String(e));
    } finally {
      setActLoading(false);
    }
  }
  function closeActivity() { setActOpen(false); setActAccount(null); }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Accounts <span className="text-emerald-500">& Balances</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your financial accounts and liquid positions.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={reload}
              disabled={loading || refreshing}
              className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-500 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Reload
            </button>
            <button
              onClick={() => openTransfer()}
              disabled={loading || refreshing}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <ArrowRightLeft size={16} />
              Transfer
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex-1 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse h-full">
            <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">Synchronizing account balances...</p>
          </div>
        ) : err ? (
          <div className="p-8 h-full">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-6 rounded-3xl flex items-center gap-4 text-red-600 dark:text-red-400">
              <AlertCircle size={24} />
              <p className="font-semibold">{err}</p>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center h-full flex flex-col items-center justify-center">
            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold text-lg">No accounts discovered.</p>
          </div>
        ) : (
          <div className="overflow-x-auto h-full">
            <table className="w-full text-sm border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                  <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Account</th>
                  <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Type</th>
                  <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">CCY</th>
                  <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Balance (CCY)</th>
                  <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">FX → {baseCcy}</th>
                  <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Balance ({baseCcy})</th>
                  <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">As Of</th>
                  <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.account_id} className="hover:bg-slate-50 dark:hover:bg-emerald-500/5 transition-colors group">
                    <td className="py-4 px-6 font-bold text-slate-900 dark:text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                          <CreditCard size={16} />
                        </div>
                        {r.account_name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {r.account_type ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          {r.account_type}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-400">{r.account_currency}</td>
                    <td className="py-4 px-6 text-right font-mono font-medium text-slate-900 dark:text-slate-200">{fmtMoney(r.balance_ccy)}</td>
                    <td className="py-4 px-6 text-right font-mono text-slate-500">{fmtRate(r.fx_rate)}</td>
                    <td className="py-4 px-6 text-right font-mono font-black text-slate-900 dark:text-white">{fmtMoney(r.balance_base)}</td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-300" />
                        {r.as_of}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openUpdateBalance(r)}
                          className="p-2 text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                          title="Update Balance"
                        >
                          <Plus size={18} />
                        </button>
                        <button
                          onClick={() => openTransfer(r)}
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Transfer"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                        <button
                          onClick={() => openActivity(r)}
                          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          title="View Activity"
                        >
                          <History size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Balance Modal */}
      {ubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setUbOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Update <span className="text-emerald-500">Balance</span></h3>
              <button onClick={() => setUbOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitUpdateBalance} className="p-6 space-y-4">
              {ubErr && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {ubErr}
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{ubAccount?.account_name}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">{ubAccount?.account_currency}</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">New Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={ubBalance}
                  onChange={(e) => setUbBalance(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-lg font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">As Of Date</label>
                <input
                  type="date"
                  value={ubAsOf}
                  onChange={(e) => setUbAsOf(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Note (Optional)</label>
                <input
                  type="text"
                  value={ubNote}
                  onChange={(e) => setUbNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                  placeholder="Monthly reconciliation..."
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setUbOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ubSubmitting}
                  className="flex-1 px-6 py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {ubSubmitting ? "Saving..." : "Save Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {tfOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setTfOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Internal <span className="text-blue-500">Transfer</span></h3>
              <button onClick={() => setTfOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitTransfer} className="p-6 space-y-6">
              {tfErr && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} />
                  {tfErr}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">From Account</label>
                  <select
                    value={tfFromId}
                    onChange={(e) => setTfFromId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                    required
                  >
                    <option value="">Choose Account</option>
                    {accountsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">To Account</label>
                  <select
                    value={tfToId}
                    onChange={(e) => setTfToId(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                    required
                  >
                    <option value="">Choose Account</option>
                    {accountsList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tfAmount}
                    onChange={(e) => setTfAmount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all font-black text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Currency</label>
                  <select
                    value={tfCurrency}
                    onChange={(e) => setTfCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all font-bold appearance-none"
                    required
                  >
                    {[...new Set(accountsList.map(a => a.currency_code))].map(ccy => (
                      <option key={ccy} value={ccy}>{ccy}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Date</label>
                  <input
                    type="date"
                    value={tfDate}
                    onChange={(e) => setTfDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 flex items-center justify-between">
                    FX Rate Override
                    {tfFxAuto != null && <span className="text-[10px] normal-case opacity-50">Auto: {tfFxAuto.toFixed(4)}</span>}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={tfFxOverride}
                    onChange={(e) => setTfFxOverride(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm disabled:opacity-30"
                    placeholder="Auto"
                    disabled={
                      accountsList.find(a => a.id === tfFromId)?.currency_code === accountsList.find(a => a.id === tfToId)?.currency_code
                    }
                  />
                </div>
              </div>

              {tfLanded != null && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest italic">Recipient will receive:</span>
                  <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                    {fmtMoney(tfLanded)} {accountsList.find(a => a.id === tfToId)?.currency_code}
                  </span>
                </div>
              )}

              <div className="pt-2 flex gap-3 font-medium">
                <button
                  type="button"
                  onClick={() => setTfOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tfSubmitting || !tfFromId || !tfToId || !tfAmount}
                  className="flex-1 px-6 py-4 bg-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50"
                >
                  {tfSubmitting ? "Processing..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Drawer Overlay */}
      {actOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setActOpen(false)} />
          <div className="relative w-full max-w-3xl bg-white dark:bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col border-l border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-md">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-slate-900 shadow-lg">
                    <History size={20} />
                  </div>
                  Account <span className="text-slate-400 font-normal">History</span>
                </h3>
              </div>
              <button onClick={() => setActOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actAccount && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
                  <div className="col-span-full mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Account Entity</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{actAccount.account_name}</span>
                  </div>
                  {[
                    { label: "Type", value: actAccount.account_type || "—" },
                    { label: "Currency", value: actAccount.account_currency },
                    { label: "Balance (CCY)", value: fmtMoney(actAccount.balance_ccy), bold: true },
                    { label: `Balance (${actAccount.base_currency})`, value: fmtMoney(actAccount.balance_base), accent: true },
                    { label: "Updated", value: actAccount.as_of },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</span>
                      <p className={`text-sm ${item.accent ? "text-emerald-500 font-bold" : "text-slate-700 dark:text-slate-300 font-semibold"} ${item.bold ? "font-black" : ""} ${item.accent ? "text-emerald-500 font-black" : ""}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {actLoading ? (
                <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                  <Loader2 size={32} className="text-slate-300 animate-spin mb-3" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching transactional data...</p>
                </div>
              ) : actErr ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="font-semibold text-sm">{actErr}</p>
                </div>
              ) : actRows.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                  <MoreVertical size={40} className="mx-auto text-slate-200 mb-4 rotate-90" />
                  <p className="text-slate-500 font-bold tracking-tight">No activity logs found for this period.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-xs-plus">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                          <th className="text-left py-3 px-4 font-black text-slate-400 uppercase tracking-widest">Date</th>
                          <th className="text-left py-3 px-4 font-black text-slate-400 uppercase tracking-widest">Type</th>
                          <th className="text-left py-3 px-4 font-black text-slate-400 uppercase tracking-widest">Description</th>
                          <th className="text-right py-3 px-4 font-black text-slate-400 uppercase tracking-widest">Amount</th>
                          <th className="text-right py-3 px-4 font-black text-slate-400 uppercase tracking-widest">Total ({baseCcy})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {actRows
                          .slice()
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map((a) => {
                            const inst = a.instrument_id ? instMap[a.instrument_id] : undefined;
                            const instLabel = inst ? (inst.symbol || inst.name) : (a.instrument_id ?? "");
                            const trade = a.type === "Buy" || a.type === "Sell";
                            const fee = Number(a.fee || 0);
                            const totalCcy = trade ? ((a.quantity ?? 0) * (a.unit_price ?? 0) + fee) : (Math.abs(a.unit_price || 0) + fee);
                            const fx = (a as ActivityCalc).fx_rate ?? null;
                            const totalBase = (a as ActivityCalc).net_amount_base ?? (fx != null ? totalCcy * fx : null);

                            return (
                              <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-4 font-medium text-slate-500">{a.date}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${a.type === 'Buy' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                    a.type === 'Sell' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                      a.type === 'Dividend' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                    }`}>
                                    {a.type}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 dark:text-slate-200">{instLabel}</div>
                                  {a.note && <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{a.note}</div>}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-200 whitespace-nowrap">
                                  {fmtMoney(totalCcy)} <span className="text-[9px] text-slate-400">{a.currency_code}</span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-black text-slate-900 dark:text-white whitespace-nowrap">
                                  {totalBase != null ? fmtMoney(totalBase) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
              <button
                onClick={() => setActOpen(false)}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl hover:opacity-90 transition-opacity"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}