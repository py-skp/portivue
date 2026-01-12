"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  Search,
  Columns,
  RefreshCw,
  ChevronDown,
  Check,
  Filter,
  Info,
  Loader2,
  AlertCircle,
  TrendingUp
} from "lucide-react";

import { apiClient, ApiError } from "@/lib/apiClient";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";


type Position = {
  account_id: number;
  account_name: string | number;
  instrument_id: number;
  symbol: string | null;
  name: string | null;
  asset_class: string | null;
  asset_subclass: string | null;
  instrument_currency: string | null;
  qty: number;
  avg_cost_ccy: number;
  avg_cost_base: number;
  last_ccy: number;
  last_base: number;
  market_value_ccy: number;
  market_value_base: number;
  unrealized_ccy: number;
  unrealized_base: number;
  base_currency: string;
};

type ConsolidatedRow = {
  instrument_id: number;
  symbol: string | null;
  name: string | null;
  asset_class: string | null;
  asset_subclass: string | null;
  instrument_currency: string | null;
  qty: number;
  avg_cost_ccy: number;
  avg_cost_base: number;
  last_ccy: number;
  last_base: number;
  market_value_ccy: number;
  market_value_base: number;
  unrealized_ccy: number;
  unrealized_base: number;
  gain_pct: number;
  base_currency: string;
  accounts: Array<{ name: string | number; qty: number; cost_base: number; mv_base: number; unrl_base: number }>;
};

const fmtNumber = (n: number, dp = 2) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

const fmtParens = (n: number, dp = 2) =>
  n < 0 ? `(${fmtNumber(Math.abs(n), dp)})` : fmtNumber(n, dp);

const Select = ({ label, value, options, onChange, className = "" }: any) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOut = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 z-10">
        {label}
      </label>
      <button
        onClick={() => setOpen(!open)}
        className="w-full h-11 px-4 flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium hover:border-emerald-500 transition-colors"
      >
        <span className="truncate">{value || "All"}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[100] max-h-60 overflow-y-auto py-2">
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors ${!value ? "text-emerald-500 font-bold" : "text-slate-600 dark:text-slate-300"}`}
          >
            All
          </button>
          {options.map((opt: string) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors ${value === opt ? "text-emerald-500 font-bold" : "text-slate-600 dark:text-slate-300"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default function PortfolioPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Position[]>([]);

  // filters
  const [fltAccount, setFltAccount] = useState("");
  const [fltAssetClass, setFltAssetClass] = useState("");
  const [fltCcy, setFltCcy] = useState("");
  const [fltText, setFltText] = useState("");

  // column selector
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  const [cols, setCols] = useState({
    account: true,
    instrument: true,
    assetClass: true,
    subClass: false,
    ccy: false,
    qty: true,
    avgCcy: false,
    avgBase: true,
    costCcy: false,
    costBase: true,
    lastCcy: false,
    lastBase: true,
    mvCcy: false,
    mvBase: true,
    unrlCcy: false,
    unrlBase: true,
    gainPct: true,
  });

  const baseCcy = rows[0]?.base_currency || "BASE";

  useEffect(() => {
    const clickOut = (e: MouseEvent) => colMenuRef.current && !colMenuRef.current.contains(e.target as Node) && setColMenuOpen(false);
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiClient.get<Position[]>("/portfolio/closing");
      setRows(data);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshPrices() {
    setRefreshing(true);
    setErr(null);
    try {
      await apiClient.post("/instruments/refresh_all_prices", {});
      await load();
    } catch (e: any) {
      // If it's a timeout/connection error, the backend is likely still processing
      if (e.message?.includes("fetch") || e.message?.includes("timeout") || e.message?.includes("network")) {
        setErr("Price refresh is taking longer than expected. The backend is still updating prices. Reloading data in 5 seconds...");
        // Wait a bit and reload to get the updated prices
        setTimeout(async () => {
          setErr(null);
          await load();
          setRefreshing(false);
        }, 5000);
        return;
      }
      setErr(e.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const accounts = useMemo(() => Array.from(new Set(rows.map(r => String(r.account_name)))), [rows]);
  const assetClasses = useMemo(() => Array.from(new Set(rows.map(r => r.asset_class || "").filter(Boolean))), [rows]);
  const ccys = useMemo(() => Array.from(new Set(rows.map(r => r.instrument_currency || "").filter(Boolean))), [rows]);

  const filtered = useMemo(() => {
    const q = fltText.trim().toLowerCase();
    return rows.filter(r => {
      if (fltAccount && String(r.account_name) !== fltAccount) return false;
      if (fltAssetClass && (r.asset_class || "") !== fltAssetClass) return false;
      if (fltCcy && (r.instrument_currency || "") !== fltCcy) return false;
      if (q) {
        const inst = (r.symbol || "") + " " + (r.name || "");
        if (!inst.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, fltAccount, fltAssetClass, fltCcy, fltText]);

  const consolidated: ConsolidatedRow[] = useMemo(() => {
    const byId = new Map<number, ConsolidatedRow & { _cost_ccy_sum: number; _cost_base_sum: number }>();
    for (const r of filtered) {
      const id = r.instrument_id;
      let acc = byId.get(id);
      const cost_ccy = r.qty * r.avg_cost_ccy;
      const cost_base = r.qty * r.avg_cost_base;
      if (!acc) {
        acc = {
          instrument_id: id, symbol: r.symbol, name: r.name, asset_class: r.asset_class,
          asset_subclass: r.asset_subclass, instrument_currency: r.instrument_currency,
          qty: 0, avg_cost_ccy: 0, avg_cost_base: 0, last_ccy: r.last_ccy, last_base: r.last_base,
          market_value_ccy: 0, market_value_base: 0, unrealized_ccy: 0, unrealized_base: 0,
          gain_pct: 0, base_currency: r.base_currency, accounts: [],
          _cost_ccy_sum: 0, _cost_base_sum: 0,
        };
      }
      acc.qty += r.qty;
      acc._cost_ccy_sum += cost_ccy;
      acc._cost_base_sum += cost_base;
      acc.market_value_ccy += r.market_value_ccy;
      acc.market_value_base += r.market_value_base;
      acc.unrealized_ccy += r.unrealized_ccy;
      acc.unrealized_base += r.unrealized_base;
      acc.accounts.push({ name: r.account_name, qty: r.qty, cost_base, mv_base: r.market_value_base, unrl_base: r.unrealized_base });
      if (!acc.last_ccy && r.last_ccy) acc.last_ccy = r.last_ccy;
      if (!acc.last_base && r.last_base) acc.last_base = r.last_base;
      byId.set(id, acc);
    }
    const out: ConsolidatedRow[] = [];
    for (const v of byId.values()) {
      const qty = v.qty || 0;
      v.avg_cost_ccy = qty ? v._cost_ccy_sum / qty : 0;
      v.avg_cost_base = qty ? v._cost_base_sum / qty : 0;
      const gain_base = v.market_value_base - v._cost_base_sum;
      v.gain_pct = v._cost_base_sum ? (gain_base / v._cost_base_sum) * 100 : 0;
      v.accounts.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      delete (v as any)._cost_ccy_sum;
      delete (v as any)._cost_base_sum;
      out.push(v);
    }
    out.sort((a, b) => {
      const la = (a.symbol || a.name || a.instrument_id).toString().toLowerCase();
      const lb = (b.symbol || b.name || b.instrument_id).toString().toLowerCase();
      return la.localeCompare(lb);
    });
    return out;
  }, [filtered]);

  const totals = useMemo(() => {
    const init = { cost_ccy: 0, cost_base: 0, mv_ccy: 0, mv_base: 0, unrl_ccy: 0, unrl_base: 0 };
    return consolidated.reduce((acc, r) => {
      acc.cost_ccy += r.qty * r.avg_cost_ccy;
      acc.cost_base += r.qty * r.avg_cost_base;
      acc.mv_ccy += r.market_value_ccy;
      acc.mv_base += r.market_value_base;
      acc.unrl_ccy += r.unrealized_ccy;
      acc.unrl_base += r.unrealized_base;
      return acc;
    }, init);
  }, [consolidated]);

  const plColorClass = (v: number) => {
    if (v > 0) return "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20";
    if (v < 0) return "text-red-500 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-900/20";
    return "text-slate-500 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
  };

  const accountSummary = (accs: ConsolidatedRow["accounts"]) => {
    const names = Array.from(new Set(accs.map(a => String(a.name))));
    const label = names.length <= 2 ? names.join(", ") : `${names[0]}, ${names[1]} +${names.length - 2}`;
    const tip = accs.map(a => `${a.name}: qty ${fmtNumber(a.qty, 2)}, MV ${fmtParens(a.mv_base, 2)}, Unrl ${fmtParens(a.unrl_base, 2)}`).join("\n");
    return { label, tip };
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex-1">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Portfolio <span className="text-emerald-500">Holdings</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Consolidated positions across all accounts.</p>
            </div>

          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={colMenuRef}>
              <Button
                variant="outline"
                onClick={() => setColMenuOpen(!colMenuOpen)}
                className="gap-2"
              >
                <Columns size={18} />
                <span className="hidden sm:inline">Columns</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${colMenuOpen ? "rotate-180" : ""}`} />
              </Button>

              {colMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] p-4 animate-in fade-in zoom-in-95 duration-200">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Visible Columns</h4>
                  <div className="space-y-1">
                    {Object.entries(cols).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => setCols(s => ({ ...s, [k]: !v }))}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group text-left"
                      >
                        <span className={`text-xs font-bold transition-colors ${v ? "text-slate-200" : "text-slate-500 group-hover:text-slate-300"}`}>
                          {({
                            account: "Accounts", instrument: "Instrument", assetClass: "Asset Class", subClass: "Sub-Class",
                            ccy: "CCY", qty: "Qty", avgCcy: "Avg Cost (CCY)", avgBase: `Avg Cost (${baseCcy})`,
                            costCcy: "Total Cost (CCY)", costBase: `Total Cost (${baseCcy})`, lastCcy: "Last (CCY)",
                            lastBase: `Last (${baseCcy})`, mvCcy: "MV (CCY)", mvBase: `MV (${baseCcy})`,
                            unrlCcy: "Unrealized (CCY)", unrlBase: `Unrealized (${baseCcy})`, gainPct: "Gain %",
                          } as any)[k]}
                        </span>
                        {v && <Check size={14} className="text-brand-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={load}
              disabled={loading || refreshing}
              className="gap-2"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Reload</span>
            </Button>

            <Button
              onClick={refreshPrices}
              disabled={loading || refreshing}
              className="gap-2 min-w-[140px]"
            >

              {refreshing ? <Loader2 size={18} className="animate-spin" /> : <TrendingUp size={18} />}
              <span className="hidden sm:inline">{refreshing ? "Refreshing..." : "Refresh Prices"}</span>
            </Button>
          </div>

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative col-span-1 lg:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest absolute -top-2 left-3 bg-white dark:bg-slate-900 px-1 z-10">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Instrument or symbol..."
                value={fltText}
                onChange={(e) => setFltText(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:border-emerald-500 focus:ring-0 transition-colors"
              />
            </div>
          </div>
          <Select label="Account" value={fltAccount} options={accounts} onChange={setFltAccount} />
          <Select label="Asset Class" value={fltAssetClass} options={assetClasses} onChange={setFltAssetClass} />
          <Select label="CCY" value={fltCcy} options={ccys} onChange={setFltCcy} />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Filter size={14} />
            Showing {consolidated.length} of {rows.length} entries
          </div>
        </div>

      </div>

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">Acquiring terminal market data...</p>
        </div>
      )}

      {err && (
        <div className="py-8">
          <ErrorState
            error={err}
            onRetry={load}
            title="Portfolio Data Error"
          />
        </div>
      )}

      {!loading && !err && consolidated.length === 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-12 rounded-3xl text-center">
          <Search size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold text-lg">No positions match your filters.</p>
          <button onClick={() => { setFltText(""); setFltAccount(""); setFltAssetClass(""); setFltCcy(""); }} className="text-emerald-500 text-sm font-bold mt-2 hover:underline">Clear all filters</button>
        </div>
      )}

      {/* Table */}
      {!loading && !err && consolidated.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  {cols.account && <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Accounts</th>}
                  {cols.instrument && <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Instrument</th>}
                  {cols.assetClass && <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Asset Class</th>}
                  {cols.subClass && <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Sub-Class</th>}
                  {cols.ccy && <th className="text-left py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">CCY</th>}
                  {cols.qty && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Qty</th>}
                  {cols.avgCcy && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Avg Cost (CCY)</th>}
                  {cols.avgBase && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Avg Cost ({baseCcy})</th>}
                  {cols.costCcy && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Total Cost (CCY)</th>}
                  {cols.costBase && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Total Cost ({baseCcy})</th>}
                  {cols.lastCcy && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Last (CCY)</th>}
                  {cols.lastBase && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Last ({baseCcy})</th>}
                  {cols.mvCcy && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">MV (CCY)</th>}
                  {cols.mvBase && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">MV ({baseCcy})</th>}
                  {cols.unrlCcy && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Unrl (CCY)</th>}
                  {cols.unrlBase && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Unrl ({baseCcy})</th>}
                  {cols.gainPct && <th className="text-right py-4 px-6 font-black text-slate-500 uppercase tracking-widest text-[10px]">Gain %</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {consolidated.map((r) => {
                  const instLabel = r.symbol || r.name || r.instrument_id;
                  const { label, tip } = accountSummary(r.accounts);
                  const total_cost_ccy = r.qty * r.avg_cost_ccy;
                  const total_cost_base = r.qty * r.avg_cost_base;

                  return (
                    <tr key={`inst_${r.instrument_id}`} className="hover:bg-slate-50 dark:hover:bg-emerald-500/5 transition-colors group">
                      {cols.account && (
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 group/tip relative">
                            <span className="font-medium text-slate-600 dark:text-slate-400">{label}</span>
                            <Info size={14} className="text-slate-300 cursor-help" />
                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tip:block z-[200] w-max max-w-xs bg-slate-900 text-slate-200 text-[10px] p-3 rounded-xl shadow-2xl whitespace-pre font-mono leading-relaxed ring-1 ring-white/10">
                              {tip}
                            </div>
                          </div>
                        </td>
                      )}
                      {cols.instrument && <td className="py-4 px-6 font-bold text-slate-900 dark:text-slate-200">{instLabel}</td>}
                      {cols.assetClass && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">{r.asset_class || ""}</td>}
                      {cols.subClass && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 text-xs italic">{r.asset_subclass || ""}</td>}
                      {cols.ccy && <td className="py-4 px-6 font-bold text-slate-400">{r.instrument_currency || ""}</td>}
                      {cols.qty && <td className="py-4 px-6 text-right font-mono font-medium text-slate-900 dark:text-slate-200">{fmtNumber(r.qty, 2)}</td>}
                      {cols.avgCcy && <td className="py-4 px-6 text-right font-mono text-slate-600 dark:text-slate-400">{fmtNumber(r.avg_cost_ccy, 2)}</td>}
                      {cols.avgBase && <td className="py-4 px-6 text-right font-mono text-slate-600 dark:text-slate-400">{fmtNumber(r.avg_cost_base, 2)}</td>}
                      {cols.costCcy && <td className="py-4 px-6 text-right font-mono text-slate-900 dark:text-slate-200">{fmtParens(total_cost_ccy, 2)}</td>}
                      {cols.costBase && <td className="py-4 px-6 text-right font-mono text-slate-900 dark:text-slate-200">{fmtParens(total_cost_base, 2)}</td>}
                      {cols.lastCcy && <td className="py-4 px-6 text-right font-mono text-slate-600 dark:text-slate-400">{fmtNumber(r.last_ccy, 2)}</td>}
                      {cols.lastBase && <td className="py-4 px-6 text-right font-mono text-slate-600 dark:text-slate-400">{fmtNumber(r.last_base, 2)}</td>}
                      {cols.mvCcy && <td className="py-4 px-6 text-right font-mono font-black text-slate-900 dark:text-slate-200">{fmtParens(r.market_value_ccy, 2)}</td>}
                      {cols.mvBase && <td className="py-4 px-6 text-right font-mono font-black text-slate-900 dark:text-slate-200">{fmtParens(r.market_value_base, 2)}</td>}
                      {cols.unrlCcy && (
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black border ${plColorClass(r.unrealized_ccy)}`}>
                            {fmtParens(r.unrealized_ccy, 2)}
                          </span>
                        </td>
                      )}
                      {cols.unrlBase && (
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-black border ${plColorClass(r.unrealized_base)}`}>
                            {fmtParens(r.unrealized_base, 2)}
                          </span>
                        </td>
                      )}
                      {cols.gainPct && (
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black border ${plColorClass(r.unrealized_base)}`}>
                            {fmtNumber(r.gain_pct, 2)}%
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {/* Totals Row */}
                <tr className="bg-slate-50/80 dark:bg-slate-800/80 font-bold border-t-2 border-slate-200 dark:border-slate-700">
                  <td
                    colSpan={
                      Number(cols.account) + Number(cols.instrument) + Number(cols.assetClass) + Number(cols.subClass) + Number(cols.ccy) || 1
                    }
                    className="py-5 px-6 text-slate-500 uppercase tracking-widest text-[10px] font-black"
                  >
                    Totals ({consolidated.length} positions)
                  </td>
                  {cols.qty && <td className="py-5 px-6 text-right"></td>}
                  {cols.avgCcy && <td className="py-5 px-6 text-right"></td>}
                  {cols.avgBase && <td className="py-5 px-6 text-right"></td>}
                  {cols.costCcy && <td className="py-5 px-6 text-right font-mono text-slate-900 dark:text-white">{fmtParens(totals.cost_ccy, 2)}</td>}
                  {cols.costBase && <td className="py-5 px-6 text-right font-mono text-slate-900 dark:text-white">{fmtParens(totals.cost_base, 2)}</td>}
                  {cols.lastCcy && <td className="py-5 px-6 text-right"></td>}
                  {cols.lastBase && <td className="py-5 px-6 text-right"></td>}
                  {cols.mvCcy && <td className="py-5 px-6 text-right font-mono font-black text-slate-900 dark:text-white">{fmtParens(totals.mv_ccy, 2)}</td>}
                  {cols.mvBase && <td className="py-5 px-6 text-right font-mono font-black text-slate-900 dark:text-white">{fmtParens(totals.mv_base, 2)}</td>}
                  {cols.unrlCcy && (
                    <td className="py-5 px-6 text-right">
                      <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-black border ${plColorClass(totals.unrl_ccy)}`}>
                        {fmtParens(totals.unrl_ccy, 2)}
                      </span>
                    </td>
                  )}
                  {cols.unrlBase && (
                    <td className="py-5 px-6 text-right">
                      <span className={`inline-flex px-3 py-1.5 rounded-xl text-xs font-black border ${plColorClass(totals.unrl_base)}`}>
                        {fmtParens(totals.unrl_base, 2)}
                      </span>
                    </td>
                  )}
                  {cols.gainPct && <td className="py-5 px-6 text-right"></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}