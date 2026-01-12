"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Plus,
  RefreshCw,
  Edit,
  Globe,
  Coins,
  Filter,
  Database,
  TrendingUp,
  Calendar,
  Hash,
  Tag,
  FileText,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/forms/Select";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

export type Instrument = {
  id: number;
  symbol: string | null;
  name: string;
  sector: string | null;
  currency_code: string;
  asset_class: string | null;
  asset_subclass: string | null;
  country: string | null;
  latest_price: number | null;
  latest_price_at: string | null;
  data_source: "yahoo" | "manual" | string;
};

type CurrencyOpt = { code: string; name?: string };
type AssetClassOpt = { name: string };
type AssetSubclassOpt = { name: string };
type SectorOpt = { name: string };

const nf2 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf4 = new Intl.NumberFormat(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const fmtNum = (v: number | null | undefined, digits = 4) =>
  typeof v === "number" ? (digits === 2 ? nf2.format(v) : nf4.format(v)) : "—";
const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString() : "—";

export default function InstrumentsListPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Instrument[]>([]);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const [dataSource, setDataSource] = useState<string | "">("");

  // success toast state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // add
  const [addOpen, setAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addErr, setAddErr] = useState<string | null>(null);

  // dropdown meta
  const [currencies, setCurrencies] = useState<CurrencyOpt[]>([]);
  const [assetClasses, setAssetClasses] = useState<AssetClassOpt[]>([]);
  const [assetSubclasses, setAssetSubclasses] = useState<AssetSubclassOpt[]>([]);
  const [sectors, setSectors] = useState<SectorOpt[]>([]);
  const [metaLoading, setMetaLoading] = useState(false);

  // add form
  const [addForm, setAddForm] = useState({
    symbol: "",
    name: "",
    sector: "",
    currency_code: "",
    asset_class: "",
    asset_subclass: "",
    country: "",
    latest_price: "",
  });

  // edit
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Instrument | null>(null);

  // price
  const [priceOpen, setPriceOpen] = useState(false);
  const [priceRow, setPriceRow] = useState<Instrument | null>(null);
  const [priceVal, setPriceVal] = useState<string>("");
  const [priceDate, setPriceDate] = useState<string>("");
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceErr, setPriceErr] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (limit) params.set("limit", String(limit));
      if (dataSource) params.set("data_source", dataSource);
      const data = await apiClient.get<Instrument[]>(`/instruments?${params.toString()}`);
      setRows(data);
    } catch (e: any) {
      if (e?.name !== "AbortError") setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadMeta() {
    setMetaLoading(true);
    setAddErr(null);

    try {
      const [rc, rAc, rSub, rSec] = await Promise.all([
        apiClient.get<any[]>("/lookups/currencies"),
        apiClient.get<any[]>("/asset-classes"),
        apiClient.get<any[]>("/asset-subclasses"),
        apiClient.get<any[]>("/sectors"),
      ]);

      const uniqBy = <T extends Record<string, string>>(arr: T[], k: keyof T) =>
        Array.from(new Map(arr.map(o => [String(o[k]), o])).values());

      const cRaw: CurrencyOpt[] = Array.isArray(rc)
        ? rc.map((x: any) => ({
          code: x?.code ?? String(x?.label ?? x?.name ?? "").toUpperCase(),
          name: x?.name ?? (x?.label && x?.label !== x?.code ? x.label : undefined),
        }))
        : [];

      const cNorm = uniqBy(cRaw.filter(c => !!c.code), "code").sort((a, b) => a.code.localeCompare(b.code));
      const preferredCurrency = cNorm.find(c => c.code === "USD")?.code ?? cNorm[0]?.code ?? "";

      const toNames = (raw: any[]): { name: string }[] =>
        Array.isArray(raw)
          ? raw.map((x: any) => ({ name: typeof x === "string" ? x : (x?.name ?? x?.label ?? String(x)) }))
          : [];

      const aNorm = uniqBy(toNames(rAc), "name").sort((a, b) => a.name.localeCompare(b.name));
      const subNorm = uniqBy(toNames(rSub), "name").sort((a, b) => a.name.localeCompare(b.name));
      const secNorm = uniqBy(toNames(rSec), "name").sort((a, b) => a.name.localeCompare(b.name));

      setCurrencies(cNorm);
      setAssetClasses(aNorm);
      setAssetSubclasses(subNorm);
      setSectors(secNorm);

      setAddForm(prev => ({
        ...prev,
        currency_code: prev.currency_code || preferredCurrency,
      }));
    } catch (e: any) {
      setAddErr(e.message || String(e));
    } finally {
      setMetaLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, limit, dataSource]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const openAdd = async () => { setAddErr(null); await loadMeta(); setAddOpen(true); };
  const closeAdd = () => setAddOpen(false);
  const onAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setAddForm(prev => ({ ...prev, [name]: value }));
  };

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddSubmitting(true);
    setAddErr(null);
    try {
      const payload: any = {
        symbol: addForm.symbol.trim() || null,
        name: addForm.name.trim(),
        sector: addForm.sector.trim() || null,
        currency_code: addForm.currency_code,
        asset_class: addForm.asset_class || null,
        asset_subclass: addForm.asset_subclass.trim() || null,
        country: addForm.country.trim() || null,
        data_source: "manual",
        ...(addForm.latest_price ? { latest_price: parseFloat(addForm.latest_price) } : {}),
      };

      let created: Instrument;
      try {
        created = await apiClient.post<Instrument>("/instruments/manual", payload);
      } catch {
        created = await apiClient.post<Instrument>("/instruments", payload);
      }

      setRows(prev => [created, ...prev]);
      setAddForm(f => ({ ...f, symbol: "", name: "", latest_price: "" }));
      setAddOpen(false);
      setSuccessMsg(`Instrument "${created.name}" added successfully.`);
    } catch (e: any) {
      setAddErr(e.message || "Create failed");
    } finally {
      setAddSubmitting(false);
    }
  }

  // --------- Edit (Manual only) ----------
  async function openEditInstrument(row: Instrument) {
    if (row.data_source !== "manual") return;
    setEditErr(null);
    await loadMeta();
    setEditForm({ ...row });
    setEditOpen(true);
  }
  function closeEditInstrument() { setEditOpen(false); setEditForm(null); }
  const onEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setEditForm(prev => (prev ? { ...prev, [name]: value } : prev));
  };
  async function submitEditInstrument(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    if (editForm.data_source !== "manual") return;
    setEditSubmitting(true);
    setEditErr(null);
    try {
      try {
        await apiClient.patch(`/instruments/${editForm.id}`, {
          symbol: editForm.symbol,
          name: editForm.name,
          sector: editForm.sector,
          currency_code: editForm.currency_code,
          asset_class: editForm.asset_class,
          asset_subclass: editForm.asset_subclass,
          country: editForm.country,
        });
      } catch {
        await apiClient.put(`/instruments/${editForm.id}`, editForm);
      }
      await load();
      closeEditInstrument();
      setSuccessMsg(`Instrument "${editForm.name}" updated successfully.`);
    } catch (e: any) {
      setEditErr(e.message || "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  }

  // price (already manual-only in button)
  function openEditPrice(row: Instrument) {
    setPriceErr(null);
    setPriceRow(row);
    setPriceVal(row.latest_price != null ? String(row.latest_price) : "");
    setPriceDate("");
    setPriceOpen(true);
  }
  function closeEditPrice() { setPriceOpen(false); setPriceRow(null); setPriceVal(""); setPriceDate(""); }
  async function submitEditPrice(e: React.FormEvent) {
    e.preventDefault();
    if (!priceRow) return;
    const close = parseFloat(priceVal);
    if (!isFinite(close)) { setPriceErr("Enter a valid number"); return; }
    setPriceSubmitting(true);
    setPriceErr(null);
    try {
      const body = { close, date: priceDate ? new Date(priceDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) };
      await apiClient.post(`/instruments/${priceRow.id}/price_manual`, body);
      await load();
      closeEditPrice();
      setSuccessMsg(`Price for "${priceRow.name}" updated to ${close.toFixed(4)}.`);
    } catch (e: any) {
      setPriceErr(e.message || "Update failed");
    } finally {
      setPriceSubmitting(false);
    }
  }

  const isYahooEdit = editForm && editForm.data_source !== "manual";

  return (
    <div className="flex-1 w-full flex flex-col space-y-6">
      {/* Floating Success Toast */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-[9999] animate-in slide-in-from-right-10 fade-in duration-500">
          <div className="bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(16,185,129,0.1)] flex items-center gap-4 min-w-[320px] group relative overflow-hidden">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-0.5">Success</p>
              <p className="text-sm font-bold text-slate-100">{successMsg}</p>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
            <div
              className="absolute bottom-0 left-0 h-1 bg-emerald-500/50"
              style={{
                width: '100%',
                animation: 'shrink 5s linear forwards'
              }}
            />
          </div>
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
          `}} />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Globe className="w-8 h-8 text-brand-500" />
            Instruments
          </h1>
          <p className="text-slate-400 mt-1">Manage symbols, asset classes, and manual price tracking.</p>
        </div>
        <Button onClick={openAdd} className="bg-brand-600 hover:bg-brand-500 text-white gap-2 py-6 px-8 rounded-2xl shadow-xl shadow-brand-600/20">
          <Plus className="w-5 h-5" />
          Add Instrument
        </Button>
      </div>

      <Card className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-slate-800 flex flex-col lg:flex-row items-center gap-6 bg-slate-900/50">
          <div className="w-full lg:max-w-md">
            <Input
              placeholder="Search name or symbol…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="w-40">
              <Select
                label="Source"
                name="data_source"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                register={() => { }} // simple select
                options={[
                  { value: "", label: "All Sources" },
                  { value: "manual", label: "Manual" },
                  { value: "yahoo", label: "Yahoo" },
                ]}
              />
            </div>

            <div className="w-32">
              <Select
                label="Limit"
                name="limit"
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                register={() => { }} // simple select
                options={[50, 100, 200, 500, 1000].map(n => ({ value: n, label: String(n) }))}
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => load()}
              disabled={loading}
              className="gap-2 h-11"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        <div className="px-6">
          {loading && !rows.length && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
              <p className="font-medium">Loading instruments...</p>
            </div>
          )}

          {!!err && (
            <div className="my-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Error loading instruments</p>
                <p className="text-sm opacity-90">{err}</p>
              </div>
            </div>
          )}

          {!loading && !err && rows.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-4">
              <Info className="w-8 h-8 text-slate-600" />
              <p className="font-medium">No instruments found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Table Content */}
        {!loading && rows.length > 0 && (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">ID</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Symbol</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Name</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Sector</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Currency</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Asset Class</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Subclass</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Country</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Latest Price</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Updated At</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500">Source</th>
                  <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map((r) => (
                  <tr key={r.id} className="group hover:bg-emerald-500/[0.02] transition-colors duration-150">
                    <td className="p-4 text-sm font-medium text-slate-400">#{r.id}</td>
                    <td className="p-4">
                      <span className="text-sm font-black text-white bg-slate-800 px-2 py-1 rounded-lg">
                        {r.symbol || "—"}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-200">{r.name}</td>
                    <td className="p-4 text-sm text-slate-400">{r.sector || "—"}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                        <Coins className="w-3.5 h-3.5 text-brand-500/60" />
                        {r.currency_code}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-400">{r.asset_class || "—"}</td>
                    <td className="p-4 text-sm text-slate-400">{r.asset_subclass || "—"}</td>
                    <td className="p-4 text-sm text-slate-400">
                      {r.country ? (
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          {r.country}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-sm font-black text-white">
                        {fmtNum(r.latest_price, 2)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-300">{fmtDateTime(r.latest_price_at).split(',')[0]}</span>
                        <span className="text-[10px] text-slate-500 uppercase font-bold">{fmtDateTime(r.latest_price_at).split(',')[1]}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`
                        px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${r.data_source === 'manual'
                          ? 'bg-slate-800 border-slate-700 text-slate-400'
                          : 'bg-brand-500/10 border-brand-500/20 text-brand-500'}
                      `}>
                        {r.data_source}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditInstrument(r)}
                          disabled={r.data_source !== "manual"}
                          className="h-9 w-9 p-0 rounded-xl"
                          title={r.data_source !== "manual" ? "Editing is disabled for Yahoo instruments" : "Edit Details"}
                        >
                          <Edit className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditPrice(r)}
                          disabled={r.data_source !== "manual"}
                          className="h-9 w-9 p-0 rounded-xl"
                          title={r.data_source !== "manual" ? "Manual price only for manual instruments" : "Update Price"}
                        >
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---------- Modals ---------- */}

      {/* Add Instrument Modal */}
      <Modal
        isOpen={addOpen}
        onClose={closeAdd}
        title="Add Instrument (Manual)"
        footer={(
          <>
            <Button variant="ghost" onClick={closeAdd} disabled={addSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitAdd}
              disabled={addSubmitting || metaLoading || !addForm.name || !addForm.currency_code}
              className="bg-brand-600 hover:bg-brand-500 text-white min-w-[100px]"
            >
              {addSubmitting ? "Saving..." : "Save Instrument"}
            </Button>
          </>
        )}
      >
        <div className="space-y-6">
          {!!addErr && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {addErr}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Name *" name="name" value={addForm.name} onChange={onAddChange} required placeholder="e.g. Bitcoin" icon={<Tag className="w-4 h-4" />} />
            <Input label="Symbol (optional)" name="symbol" value={addForm.symbol} onChange={onAddChange} placeholder="e.g. BTC" icon={<Hash className="w-4 h-4" />} />
          </div>

          <Select
            label="Currency *"
            name="currency_code"
            value={addForm.currency_code}
            onChange={onAddChange}
            register={() => { }} // custom handling
            required
            disabled={metaLoading}
            options={[
              { value: "", label: "Choose currency" },
              ...currencies.map((c) => ({ value: c.code, label: `${c.code}${c.name ? ` — ${c.name}` : ""}` }))
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Asset Class"
              name="asset_class"
              value={addForm.asset_class}
              onChange={onAddChange}
              register={() => { }}
              disabled={metaLoading}
              options={[
                { value: "", label: "—" },
                ...assetClasses.map((a) => ({ value: a.name, label: a.name }))
              ]}
            />
            <Select
              label="Asset Subclass"
              name="asset_subclass"
              value={addForm.asset_subclass}
              onChange={onAddChange}
              register={() => { }}
              disabled={metaLoading || assetSubclasses.length === 0}
              options={[
                { value: "", label: "—" },
                ...assetSubclasses.map((s) => ({ value: s.name, label: s.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Sector"
              name="sector"
              value={addForm.sector}
              onChange={onAddChange}
              register={() => { }}
              disabled={metaLoading || sectors.length === 0}
              options={[
                { value: "", label: "—" },
                ...sectors.map((s) => ({ value: s.name, label: s.name }))
              ]}
            />
            <Input label="Country" name="country" value={addForm.country} onChange={onAddChange} placeholder="e.g. United States" icon={<Globe className="w-4 h-4" />} />
          </div>

          <Input
            type="number"
            label="Latest Price (optional)"
            name="latest_price"
            value={addForm.latest_price}
            onChange={onAddChange}
            placeholder="0.00"
            step="0.0001"
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>
      </Modal>

      {/* Edit Instrument Modal */}
      <Modal
        isOpen={editOpen}
        onClose={closeEditInstrument}
        title="Edit Instrument"
        footer={(
          <>
            <Button variant="ghost" onClick={closeEditInstrument} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitEditInstrument}
              disabled={editSubmitting || !!isYahooEdit}
              className="bg-brand-600 hover:bg-brand-500 text-white min-w-[100px]"
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </>
        )}
      >
        <div className="space-y-6">
          {!!editErr && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {editErr}
            </div>
          )}

          {isYahooEdit && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3 text-blue-400 text-sm font-medium">
              <Info className="w-5 h-5 shrink-0" />
              Editing is disabled for Yahoo/public instruments.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Name *" name="name" value={editForm?.name || ""} onChange={onEditChange} required disabled={!!isYahooEdit} icon={<Tag className="w-4 h-4" />} />
            <Input label="Symbol (optional)" name="symbol" value={editForm?.symbol || ""} onChange={onEditChange} disabled={!!isYahooEdit} icon={<Hash className="w-4 h-4" />} />
          </div>

          <Select
            label="Currency *"
            name="currency_code"
            value={editForm?.currency_code || ""}
            onChange={onEditChange}
            register={() => { }}
            required
            disabled={!!isYahooEdit}
            options={[
              { value: "", label: "Choose currency" },
              ...currencies.map((c) => ({ value: c.code, label: `${c.code}${c.name ? ` — ${c.name}` : ""}` }))
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Asset Class"
              name="asset_class"
              value={editForm?.asset_class || ""}
              onChange={onEditChange}
              register={() => { }}
              disabled={!!isYahooEdit}
              options={[
                { value: "", label: "—" },
                ...assetClasses.map((a) => ({ value: a.name, label: a.name }))
              ]}
            />
            <Select
              label="Asset Subclass"
              name="asset_subclass"
              value={editForm?.asset_subclass || ""}
              onChange={onEditChange}
              register={() => { }}
              disabled={!!isYahooEdit}
              options={[
                { value: "", label: "—" },
                ...assetSubclasses.map((s) => ({ value: s.name, label: s.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Sector"
              name="sector"
              value={editForm?.sector || ""}
              onChange={onEditChange}
              register={() => { }}
              disabled={!!isYahooEdit}
              options={[
                { value: "", label: "—" },
                ...sectors.map((s) => ({ value: s.name, label: s.name }))
              ]}
            />
            <Input label="Country" name="country" value={editForm?.country || ""} onChange={onEditChange} disabled={!!isYahooEdit} icon={<Globe className="w-4 h-4" />} />
          </div>
        </div>
      </Modal>

      {/* Update Price Modal */}
      <Modal
        isOpen={priceOpen}
        onClose={closeEditPrice}
        title="Update Price (Manual)"
        maxWidth="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={closeEditPrice} disabled={priceSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={submitEditPrice}
              disabled={priceSubmitting || !priceVal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[100px]"
            >
              {priceSubmitting ? "Updating..." : "Update Price"}
            </Button>
          </>
        )}
      >
        <div className="space-y-6">
          {!!priceErr && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {priceErr}
            </div>
          )}

          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Instrument</p>
            <p className="text-lg font-bold text-white">
              {priceRow?.name} <span className="text-brand-400 font-black">{priceRow?.symbol ? `(${priceRow.symbol})` : ""}</span>
            </p>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <Coins className="w-3.5 h-3.5" />
              {priceRow?.currency_code} Balance Currency
            </p>
          </div>

          <Input
            label="New Price *"
            type="number"
            step="0.0001"
            value={priceVal}
            onChange={(e) => setPriceVal(e.target.value)}
            autoFocus
            required
            icon={<TrendingUp className="w-4 h-4" />}
          />

          <Input
            label="Date (optional)"
            type="date"
            value={priceDate}
            onChange={(e) => setPriceDate(e.target.value)}
            placeholder="Choose date"
            icon={<Calendar className="w-4 h-4" />}
          />
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1 -mt-4">
            If blank, server will use today's date.
          </p>
        </div>
      </Modal>
    </div>
  );
}