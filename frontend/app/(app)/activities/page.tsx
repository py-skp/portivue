"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";


import {
  RefreshCw,
  Columns,
  Edit,
  Search,
  Filter,
  Info,
  Loader2,
  AlertCircle,
  Plus,
  ChevronDown,
  Check,
  Calendar,
  DollarSign,
  Tag,
  Briefcase,
  User,
  X,
  CheckCircle2,
  Hash
} from "lucide-react";

import { apiClient, ApiError } from "@/lib/apiClient";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/forms/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";



// ---------- Types ----------
type ActivityCore = {
  id: number;
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee";
  account_id: number;
  instrument_id: number | null;
  broker_id: number | null;
  date: string; // ISO date
  quantity?: number | null;
  unit_price?: number | null; // for non-trades = amount
  currency_code: string;
  fee?: number | null;
  note?: string | null;
};

type ActivityCalc = ActivityCore & {
  base_currency: string;
  fx_rate: number | null;
  gross_amount: number;              // in activity currency
  net_amount: number;                // in activity currency
  gross_amount_base: number | null;  // converted using tx-date fx
  net_amount_base: number | null;
};

type Activity = ActivityCore | ActivityCalc;

type Account = { id: number; name: string; currency_code?: string };
type Broker = { id: number; name: string };
type Instrument = {
  id: number;
  symbol: string | null;
  name: string;
  currency_code: string;
  asset_class?: string | null;
  asset_subclass?: string | null;
};

// for edit dialog instrument options (local + yahoo suggest)
type InstOption =
  | { source: "local"; id: number; name: string; symbol: string | null; currency?: string }
  | { source: "yahoo"; name: string; symbol: string; currency?: string; exchange?: string; type?: string };

// ---------- Helpers ----------
const nf2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf4 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });

function computeTotalLocal(a: ActivityCore): number {
  const fee = Number(a.fee || 0);
  if (a.type === "Buy" || a.type === "Sell") {
    const qty = Number(a.quantity || 0);
    const px = Number(a.unit_price || 0);
    return qty * px + fee;
  }
  // Dividend / Interest / Fee use absolute amount + fee
  const amt = Math.abs(Number(a.unit_price || 0));
  return amt + fee;
}

function isCalc(x: Activity): x is ActivityCalc {
  return (x as any)?.base_currency !== undefined && (x as any)?.net_amount_base !== undefined;
}

// ---------- Component ----------
export default function ActivitiesPage() {
  // data
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Activity[]>([]);
  const [accounts, setAccounts] = useState<Record<number, Account>>({});
  const [brokers, setBrokers] = useState<Record<number, Broker>>({});
  const [instMap, setInstMap] = useState<Record<number, Instrument>>({});

  // filters
  const [fltType, setFltType] = useState<"" | ActivityCore["type"]>("");
  const [fltAccount, setFltAccount] = useState<number | "">("");
  const [fltBroker, setFltBroker] = useState<number | "">("");
  const [fltFrom, setFltFrom] = useState<string>("");
  const [fltTo, setFltTo] = useState<string>("");
  const [fltText, setFltText] = useState<string>("");

  const [cols, setCols] = useState({
    date: true,
    type: true,
    account: true,
    broker: true,
    instrument: true,
    assetClass: false,
    subClass: false,
    qty: true,
    unitPrice: true,
    totalLocal: true,
    ccy: true,
    fx: false,
    totalBase: true,
    note: false,
  });


  const [colMenuOpen, setColMenuOpen] = useState(false);

  // edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<Activity | null>(null);

  // edit form fields
  const [editType, setEditType] = useState<ActivityCore["type"]>("Buy");
  const [editAccountId, setEditAccountId] = useState<number | "">("");
  const [editBrokerId, setEditBrokerId] = useState<number | "">("");
  const [editDate, setEditDate] = useState<string>("");
  const [editInstrumentSearch, setEditInstrumentSearch] = useState<string>("");
  const [editInstrumentId, setEditInstrumentId] = useState<number | undefined>(undefined);
  const [editQty, setEditQty] = useState<string>("");
  const [editUnitPrice, setEditUnitPrice] = useState<string>("");
  const [editCcy, setEditCcy] = useState<string>("");
  const [editFee, setEditFee] = useState<string>("");
  const [editNote, setEditNote] = useState<string>("");

  const [instOptions, setInstOptions] = useState<InstOption[]>([]);
  const [lockCcy, setLockCcy] = useState(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // base columns visibility & base currency
  const showBaseCols = useMemo(() => {
    const first = rows[0];
    return first !== undefined && isCalc(first);
  }, [rows]);

  const baseCurrency = useMemo(() => {
    if (!showBaseCols) return "BASE";
    return (rows[0] as ActivityCalc).base_currency;
  }, [rows, showBaseCols]);


  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clickOut = (e: MouseEvent) => colMenuRef.current && !colMenuRef.current.contains(e.target as Node) && setColMenuOpen(false);
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);


  // ---------- Load ----------
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const acts = await apiClient.get<Activity[]>("/activities");

      const [accs, brks] = await Promise.all([
        apiClient.get<Account[]>("/lookups/accounts"),
        apiClient.get<Broker[]>("/lookups/brokers").catch(() => []),
      ]);

      const brkMap: Record<number, Broker> = {};
      brks.forEach((b: any) => (brkMap[b.id] = b));

      const accMap: Record<number, Account> = {};
      accs.forEach((a: any) => accMap[a.id] = a);

      // instruments for visible rows (unique ids)
      const ids = Array.from(new Set(acts.map(a => a.instrument_id).filter(Boolean))) as number[];
      const fetched: Record<number, Instrument> = {};
      await Promise.all(
        ids.map(async (id) => {
          try { fetched[id] = await apiClient.get<Instrument>(`/instruments/${id}`); } catch { }
        })
      );

      setAccounts(accMap);
      setBrokers(brkMap);
      setInstMap(fetched);
      setRows(acts);
    } catch (e: any) {
      setErr(e.message || String(e));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  // ---------- Filtering ----------
  const filtered = useMemo(() => {
    const text = fltText.trim().toLowerCase();
    return rows.filter(a => {
      if (fltType && a.type !== fltType) return false;
      if (fltAccount !== "" && a.account_id !== Number(fltAccount)) return false;
      if (fltBroker !== "" && (a.broker_id ?? null) !== Number(fltBroker)) return false;
      if (fltFrom && a.date < fltFrom) return false;
      if (fltTo && a.date > fltTo) return false;

      if (text) {
        const accName = accounts[a.account_id]?.name?.toLowerCase() || "";
        const brokerName = a.broker_id ? (brokers[a.broker_id]?.name?.toLowerCase() || "") : "";
        const inst = a.instrument_id ? instMap[a.instrument_id] : undefined;
        const instText = `${inst?.symbol || ""} ${inst?.name || ""}`.toLowerCase();
        const note = (a.note || "").toLowerCase();
        const hay = `${accName} ${brokerName} ${instText} ${note}`.trim();
        if (!hay.includes(text)) return false;
      }
      return true;
    });
  }, [rows, fltType, fltAccount, fltBroker, fltFrom, fltTo, fltText, accounts, brokers, instMap]);

  // ---------- Columns menu ----------
  const toggleCols = () => setColMenuOpen(!colMenuOpen);
  const closeCols = () => setColMenuOpen(false);


  // ---------- Edit ----------
  function openEdit(a: Activity) {
    setEditErr(null);
    setEditRow(a);
    setEditOpen(true);
    setEditType(a.type);
    setEditAccountId(a.account_id);
    setEditBrokerId(a.broker_id ?? "");
    setEditDate(a.date);
    setEditInstrumentId(a.instrument_id ?? undefined);
    setEditInstrumentSearch(a.instrument_id ? (instMap[a.instrument_id]?.symbol || instMap[a.instrument_id]?.name || "") : "");
    setEditQty(a.quantity != null ? String(a.quantity) : "");
    setEditUnitPrice(a.unit_price != null ? String(a.unit_price) : "");
    setEditCcy(a.currency_code);
    setEditFee(a.fee != null ? String(a.fee) : "0");
    setEditNote(a.note || "");
    setLockCcy(!!(a.instrument_id && instMap[a.instrument_id]?.currency_code));
  }
  function closeEdit() {
    setEditOpen(false);
    setEditRow(null);
    setInstOptions([]);
  }

  // unified instrument search for edit dialog
  useEffect(() => {
    const q = editInstrumentSearch || "";
    const t = setTimeout(async () => {
      if (!q.trim()) { setInstOptions([]); return; }
      const [localRes, yahooRes] = await Promise.allSettled([
        apiClient.get<Instrument[]>(`/instruments?q=${encodeURIComponent(q)}&limit=10`),
        apiClient.get<{ items?: any[] }>(`/instruments/suggest?q=${encodeURIComponent(q)}&limit=10`),
      ]);


      const opts: InstOption[] = [];
      if (localRes.status === "fulfilled") {
        for (const inst of localRes.value) {
          opts.push({
            source: "local",
            id: inst.id,
            name: inst.name,
            symbol: inst.symbol,
            currency: inst.currency_code,
          });
        }
      }
      if (yahooRes.status === "fulfilled") {
        for (const it of yahooRes.value?.items ?? []) {
          // trust backend to normalize to { name, symbol, currency?, exchange?, type? }
          opts.push({ source: "yahoo", ...(it as any) });
        }
      }
      setInstOptions(opts);
    }, 250);
    return () => clearTimeout(t);
  }, [editInstrumentSearch]);

  async function upsertYahoo(sym: string, quoteType?: string) {
    const subclass = quoteType === "ETF" ? "ETF" : quoteType === "MUTUALFUND" ? "Mutual Fund" : "Stock";
    return await apiClient.post<Instrument>(
      `/instruments/upsert_from_yahoo?symbol=${encodeURIComponent(sym)}&asset_subclass=${encodeURIComponent(subclass)}`,
      {}
    );

  }


  async function saveEdit() {
    if (!editRow) return;
    try {
      setEditLoading(true);
      setEditErr(null);

      const isTrade = editType === "Buy" || editType === "Sell";
      const payload: any = {
        type: editType,
        account_id: Number(editAccountId),
        broker_id: editBrokerId === "" ? null : Number(editBrokerId),
        date: editDate,
        instrument_id: editInstrumentId ?? null,
        quantity: isTrade ? (editQty ? Number(editQty) : null) : null,
        unit_price: editUnitPrice ? Number(editUnitPrice) : null,
        currency_code: editCcy,
        fee: editFee ? Number(editFee) : 0,
        note: editNote || "",
      };

      let updated: Activity;
      try {
        updated = await apiClient.patch<Activity>(`/activities/${editRow.id}`, payload);
      } catch {
        updated = await apiClient.put<Activity>(`/activities/${editRow.id}`, payload);
      }


      setRows(prev => prev.map(x => (x.id === updated.id ? updated : x)));

      // fetch instrument if it wasn't in cache
      if (updated.instrument_id && !instMap[updated.instrument_id]) {
        try {
          const inst = await apiClient.get<Instrument>(`/instruments/${updated.instrument_id}`);
          setInstMap(prev => ({ ...prev, [inst.id]: inst }));
        } catch { }
      }

      setSuccessMsg("Activity updated successfully");
      closeEdit();

    } catch (e: any) {
      setEditErr(e.message || "Update failed");
    } finally {
      setEditLoading(false);
    }
  }

  // ---------- Render ----------
  if (loading && rows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <p className="text-slate-400 font-medium">Loading activities...</p>
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <ErrorState error={err} onRetry={load} />
      </div>
    );
  }


  return (
    <div className="flex-1 w-full flex flex-col space-y-6">
      {/* Floating Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl flex items-center gap-4 min-w-[320px]">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-0.5">Success</p>
              <p className="text-sm font-bold text-slate-100">{successMsg}</p>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
            Activities
          </h1>
          <p className="text-slate-400 font-medium mt-1">
            Trades, dividends, interest, and fees. Filter, review, and edit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={colMenuRef}>
            <Button variant="outline" onClick={toggleCols} className="gap-2">
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
                          date: "Date", type: "Type", account: "Account", broker: "Broker",
                          instrument: "Instrument", assetClass: "Asset Class", subClass: "Sub-Class",
                          qty: "Qty", unitPrice: "Unit Price / Amount", totalLocal: "Total",
                          ccy: "CCY", fx: `FX → ${baseCurrency}`, totalBase: `Total (${baseCurrency})`, note: "Note",
                        } as any)[k]}
                      </span>
                      {v && <Check size={14} className="text-brand-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button variant="secondary" onClick={load} disabled={loading} className="gap-2 aspect-square md:aspect-auto">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Reload</span>
          </Button>


          <Button onClick={() => router.push("/activities/new")} className="gap-2">
            <Plus size={18} />
            <span>Add Activity</span>
          </Button>


        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 md:p-6 bg-slate-900/40 border-slate-800/50 backdrop-blur-sm">
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Type"
              value={String(fltType)}
              onChange={(e) => setFltType(e.target.value as any)}
              options={[
                { value: "", label: "All Types" },
                { value: "Buy", label: "Buy" },
                { value: "Sell", label: "Sell" },
                { value: "Dividend", label: "Dividend" },
                { value: "Interest", label: "Interest" },
                { value: "Fee", label: "Fee" },
              ]}
              icon={<Filter className="w-4 h-4" />}
            />

            <Select
              label="Account"
              value={String(fltAccount)}
              onChange={(e) => setFltAccount(e.target.value === "" ? "" : Number(e.target.value))}
              options={[
                { value: "", label: "All Accounts" },
                ...Object.values(accounts).map(a => ({ value: String(a.id), label: a.name }))
              ]}
              icon={<Briefcase className="w-4 h-4" />}
            />

            <Select
              label="Broker"
              value={String(fltBroker)}
              onChange={(e) => setFltBroker(e.target.value === "" ? "" : Number(e.target.value))}
              options={[
                { value: "", label: "All Brokers" },
                ...Object.values(brokers).map(b => ({ value: String(b.id), label: b.name }))
              ]}
              icon={<User className="w-4 h-4" />}
            />

            <Input
              label="From"
              type="date"
              value={fltFrom}
              onChange={(e) => setFltFrom(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            <Input
              label="To"
              type="date"
              value={fltTo}
              onChange={(e) => setFltTo(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>

          <Input
            placeholder="Search (instrument / account / broker / note)..."
            value={fltText}
            onChange={(e) => setFltText(e.target.value)}
            icon={<Search className="w-4 h-4 text-slate-500" />}
            className="bg-slate-950/50 border-slate-800 focus:border-brand-500/50"
          />
        </div>
      </Card>

      {/* Table Container */}
      <Card className="flex-1 overflow-hidden bg-slate-900/40 border-slate-800/50 backdrop-blur-sm min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
              <tr>
                {cols.date && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>}
                {cols.type && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Type</th>}
                {cols.account && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Account</th>}
                {cols.broker && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Broker</th>}
                {cols.instrument && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrument</th>}
                {cols.assetClass && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Class</th>}
                {cols.subClass && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Sub-Class</th>}
                {cols.qty && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Qty</th>}
                {cols.unitPrice && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Unit Price / Amount</th>}
                {cols.totalLocal && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Total</th>}
                {cols.ccy && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">CCY</th>}
                {showBaseCols && cols.fx && (
                  <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                    FX → {baseCurrency}
                  </th>
                )}
                {showBaseCols && cols.totalBase && (
                  <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">
                    Total ({baseCurrency})
                  </th>
                )}
                {cols.note && <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Note</th>}
                <th className="py-4 px-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((a) => {
                  const inst = a.instrument_id ? instMap[a.instrument_id] : undefined;
                  const trade = a.type === "Buy" || a.type === "Sell";
                  const qVal = a.quantity ?? 0;
                  const totalLocal = computeTotalLocal(a);
                  const fx = isCalc(a) ? a.fx_rate : null;
                  const totalBase = isCalc(a) ? a.net_amount_base : (fx != null ? totalLocal * fx : null);

                  return (
                    <tr key={a.id} className="group hover:bg-white/[0.02] transition-colors">
                      {cols.date && <td className="py-4 px-6 text-sm font-bold text-slate-300 tabular-nums">{a.date}</td>}
                      {cols.type && (
                        <td className="py-4 px-6 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${a.type === "Buy" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            a.type === "Sell" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                              a.type === "Dividend" ? "bg-brand-500/10 border-brand-500/20 text-brand-500" :
                                "bg-slate-700/50 border-slate-600/50 text-slate-300"
                            }`}>
                            {a.type}
                          </span>
                        </td>
                      )}
                      {cols.account && <td className="py-4 px-6 text-sm font-medium text-slate-400">{accounts[a.account_id]?.name || a.account_id}</td>}
                      {cols.broker && <td className="py-4 px-6 text-sm font-medium text-slate-500">{a.broker_id ? (brokers[a.broker_id]?.name || "—") : "—"}</td>}
                      {cols.instrument && (
                        <td className="py-4 px-6 font-bold">
                          <span className="text-white">
                            {inst?.symbol ? inst.symbol : (inst?.name || "—")}
                          </span>
                          {inst?.symbol && inst?.name && <span className="text-slate-500 text-xs ml-2 font-medium">{inst.name}</span>}
                        </td>
                      )}
                      {cols.assetClass && <td className="py-4 px-6 text-xs font-bold text-slate-500">{inst?.asset_class || ""}</td>}
                      {cols.subClass && <td className="py-4 px-6 text-xs text-slate-600">{inst?.asset_subclass || ""}</td>}
                      {cols.qty && <td className="py-4 px-6 text-right tabular-nums text-sm font-bold text-slate-300">{trade ? nf2.format(qVal) : "—"}</td>}
                      {cols.unitPrice && (
                        <td className="py-4 px-6 text-right tabular-nums text-sm font-bold text-slate-300">
                          {a.unit_price != null ? nf2.format(Number(a.unit_price)) : "—"}
                        </td>
                      )}
                      {cols.totalLocal && <td className="py-4 px-6 text-right tabular-nums text-sm font-black text-white">{nf2.format(totalLocal)}</td>}
                      {cols.ccy && <td className="py-4 px-6 text-center text-xs font-bold text-slate-500 uppercase">{a.currency_code}</td>}
                      {showBaseCols && cols.fx && (
                        <td className="py-4 px-6 text-right tabular-nums text-sm font-medium text-slate-500">
                          {fx != null ? nf2.format(fx) : "—"}
                        </td>
                      )}
                      {showBaseCols && cols.totalBase && (
                        <td className="py-4 px-6 text-right tabular-nums text-sm font-black text-brand-400">
                          {totalBase != null ? nf2.format(totalBase) : "—"}
                        </td>
                      )}
                      {cols.note && <td className="py-4 px-6 text-sm text-slate-500 italic max-w-xs truncate">{a.note}</td>}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openEdit(a)}
                          className="p-1 px-3 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 rounded-lg transition-colors text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2"
                        >
                          <Edit size={12} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Modal (Standard Modal) */}
      <Modal
        isOpen={editOpen}
        onClose={closeEdit}

        title="Edit Activity"
        footer={(
          <>
            <Button variant="ghost" onClick={closeEdit} disabled={editLoading}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editLoading} className="bg-brand-600 hover:bg-brand-500 text-white min-w-[100px]">
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      >
        <div className="space-y-6">
          {!!editErr && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-medium">
              <AlertCircle size={20} />
              {editErr}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select
              label="Type *"
              value={editType}
              onChange={(e) => setEditType(e.target.value as any)}
              options={["Buy", "Sell", "Dividend", "Interest", "Fee"].map(t => ({ value: t, label: t }))}
              icon={<Tag className="w-4 h-4" />}
            />

            <Select
              label="Account *"
              value={String(editAccountId)}
              onChange={(e) => setEditAccountId(Number(e.target.value))}
              options={Object.values(accounts).map(a => ({ value: String(a.id), label: a.name }))}
              icon={<Briefcase className="w-4 h-4" />}
            />

            <Select
              label="Broker"
              value={String(editBrokerId)}
              onChange={(e) => setEditBrokerId(e.target.value === "" ? "" : Number(e.target.value))}
              options={[
                { value: "", label: "(None)" },
                ...Object.values(brokers).map(b => ({ value: String(b.id), label: b.name }))
              ]}
              icon={<User className="w-4 h-4" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Date *"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            <Select
              label="Currency *"
              value={editCcy}
              onChange={(e) => setEditCcy(e.target.value)}
              disabled={lockCcy}
              options={[...new Set(Object.values(accounts).map(a => a.currency_code).filter(Boolean))].map(ccy => ({ value: ccy!, label: ccy! }))}
              icon={<DollarSign className="w-4 h-4" />}
            />
          </div>

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 px-1">Instrument</p>
            <div className="p-3 bg-slate-900/50 rounded-xl text-slate-100 font-bold border border-slate-800/50 flex items-center justify-between">
              <span>{editInstrumentSearch || "No instrument selected"}</span>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Locked</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 ml-1 italic italic">
              Instrument selection is currently view-only for edited activities.
            </p>
          </div>

          {(editType === "Buy" || editType === "Sell") ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Quantity *"
                type="number"
                step="any"
                value={editQty}
                onChange={(e) => setEditQty(e.target.value)}
                icon={<Hash size={16} className="text-slate-500" />}
              />
              <Input
                label="Unit Price *"
                type="number"
                step="any"
                value={editUnitPrice}
                onChange={(e) => setEditUnitPrice(e.target.value)}
                icon={<DollarSign size={16} className="text-slate-500" />}
              />
            </div>
          ) : (
            <Input
              label="Amount *"
              type="number"
              step="any"
              value={editUnitPrice}
              onChange={(e) => setEditUnitPrice(e.target.value)}
              icon={<DollarSign size={16} className="text-slate-500" />}
              helperText={editType === "Dividend" ? "Dividend cash amount" : editType === "Interest" ? "Interest cash amount" : "Fee amount"}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Fee"
              type="number"
              step="any"
              value={editFee}
              onChange={(e) => setEditFee(e.target.value)}
              icon={<Info size={16} className="text-slate-500" />}
            />
            <Input
              label="Note"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Internal memo..."
            />
          </div>

          <div className="bg-brand-500/5 p-4 rounded-2xl border border-brand-500/10 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-brand-500/70 tracking-widest">Total Transaction Preview</span>
            <span className="text-lg font-black text-white tabular-nums">
              {(() => {
                const fee = Number(editFee || 0);
                const q = Number(editQty || 0);
                const px = Number(editUnitPrice || 0);
                const total = (editType === "Buy" || editType === "Sell") ? (q * px + fee) : (Math.abs(px) + fee);
                return `${nf2.format(total)} ${editCcy}`;
              })()}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}