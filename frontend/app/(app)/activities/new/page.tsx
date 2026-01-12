// app/(app)/activities/new/page.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { ChevronLeft, Search, Save, Info, PlusCircle, AlertCircle, CheckCircle2, X } from "lucide-react";

import { apiClient } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/forms/Select";

type Lookup = { id?: number; name?: string; code?: string; type?: string };

type FormValues = {
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee";
  account_id: number | "";
  broker_id?: number | "";
  instrument_search: string;
  instrument_id?: number;
  date: string;
  quantity?: number;
  unit_price?: number;
  currency_code: string | "";
  fee?: number;
  withholding_tax?: number;
  capital_gains_tax?: number;
  securities_transaction_tax?: number;
  stamp_duty?: number;
  note?: string;
};

type Option = {
  source: "yahoo" | "local";
  symbol?: string;
  name?: string;
  currency?: string;
  exchange?: string;
  type?: string;
  id?: number;
};

export default function NewActivityPage() {
  const router = useRouter();
  const today = () => new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    defaultValues: {
      type: "Buy",
      fee: 0,
      withholding_tax: 0,
      capital_gains_tax: 0,
      securities_transaction_tax: 0,
      stamp_duty: 0,
      date: today(),
      instrument_search: "",
      account_id: "",
      broker_id: "",
      currency_code: "",
    },
  });

  const [err, setErr] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<Lookup[]>([]);
  const [accounts, setAccounts] = useState<Lookup[]>([]);
  const [brokers, setBrokers] = useState<Lookup[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [lockCurrency, setLockCurrency] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // success toast state
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // available quantity for sell
  const [availableQty, setAvailableQty] = useState<number | null>(null);
  const [loadingAvailableQty, setLoadingAvailableQty] = useState(false);

  // Lookups
  useEffect(() => {
    (async () => {
      try {
        const [c, acc, br] = await Promise.all([
          apiClient.get<Lookup[]>("/lookups/currencies"),
          apiClient.get<Lookup[]>("/lookups/accounts"),
          apiClient.get<Lookup[]>("/lookups/brokers"),
        ]);

        setCurrencies(Array.isArray(c) ? c : []);
        setAccounts(Array.isArray(acc) ? acc : []);
        setBrokers(Array.isArray(br) ? br : []);

        if (!getValues("currency_code") && c?.[0]?.code) setValue("currency_code", c[0].code);
        if (!getValues("account_id") && acc?.[0]?.id) setValue("account_id", acc[0].id);
      } catch (e: any) {
        setErr(e.message || String(e));
        setCurrencies([]);
        setAccounts([]);
        setBrokers([]);
      }
    })();
  }, [getValues, setValue, router]);

  // Watch all form fields
  const watchedType = watch("type");
  const watchedQuantity = watch("quantity");
  const watchedUnitPrice = watch("unit_price");
  const watchedFee = watch("fee");
  const watchedInstrumentId = watch("instrument_id");
  const watchedAccountId = watch("account_id");
  const watchedDate = watch("date");
  const watchedCurrencyCode = watch("currency_code");
  const watchedBrokerId = watch("broker_id");

  // Unified search (local + Yahoo), debounced
  const searchStr = watch("instrument_search") || "";
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!searchStr.trim()) { setOptions([]); return; }
      const [locR, yR] = await Promise.allSettled([
        apiClient.get<any[]>(`/instruments?q=${encodeURIComponent(searchStr)}&limit=10`),
        apiClient.get<{ items?: any[] }>(`/instruments/suggest?q=${encodeURIComponent(searchStr)}&limit=10`)
      ]);

      const opts: Option[] = [];
      if (locR.status === "fulfilled") {
        const local = locR.value as any[];
        for (const inst of local) {
          opts.push({ source: "local", id: inst.id, name: inst.name, symbol: inst.symbol ?? null, currency: inst.currency_code });
        }
      }
      if (yR.status === "fulfilled") {
        const data = yR.value as { items?: any[] };
        for (const it of (data?.items ?? [])) opts.push({ source: "yahoo", ...it });
      }
      const seen = new Set<string>(); const merged: Option[] = [];
      for (const o of opts) {
        const key = (o.source === "local" ? (o.symbol || `local-${o.id}`) : o.symbol)?.toUpperCase() || "";
        if (key && seen.has(key)) continue;
        if (key) seen.add(key);
        merged.push(o);
      }
      setOptions(merged);
    }, 250);
    return () => clearTimeout(t);
  }, [searchStr]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Fetch available quantity for Sell activities
  useEffect(() => {
    const fetchAvailableQty = async () => {
      // Only fetch for Sell type when we have all required fields
      if (
        watchedType !== "Sell" ||
        !watchedInstrumentId ||
        !watchedAccountId ||
        !watchedDate
      ) {
        setAvailableQty(null);
        return;
      }

      setLoadingAvailableQty(true);
      try {
        const params = new URLSearchParams({
          account_id: String(watchedAccountId),
          instrument_id: String(watchedInstrumentId),
          on: watchedDate,
        });

        // Add broker_id if it's set
        if (watchedBrokerId) {
          params.append("broker_id", String(watchedBrokerId));
        }

        const data = await apiClient.get<{ available_qty: number }>(
          `/activities/positions/available?${params.toString()}`
        );
        setAvailableQty(data.available_qty);
      } catch (e: any) {
        console.error("Failed to fetch available quantity:", e);
        setAvailableQty(null);
      } finally {
        setLoadingAvailableQty(false);
      }
    };

    fetchAvailableQty();
  }, [watchedType, watchedInstrumentId, watchedAccountId, watchedBrokerId, watchedDate]);

  async function handlePickYahoo(picked: Option) {
    const sym = (picked.symbol || "").toUpperCase();
    const subclass =
      picked.type === "ETF" ? "ETF" :
        picked.type === "MUTUALFUND" ? "Mutual Fund" : "Stock";
    try {
      const inst = await apiClient.post<any>(
        `/instruments/upsert_from_yahoo?symbol=${encodeURIComponent(sym)}&asset_subclass=${encodeURIComponent(subclass)}`,
        {}
      );
      setValue("instrument_id", inst.id);
      setValue("instrument_search", inst.symbol || inst.name);
      if (inst.currency_code) {
        setValue("currency_code", inst.currency_code);
        setLockCurrency(true);
      }
      setIsSearchOpen(false);
    } catch (e: any) {
      setErr(`Failed to create instrument: ${e.message}`);
    }
  }

  const isTrade = watchedType === "Buy" || watchedType === "Sell";
  const isDividend = watchedType === "Dividend";
  const isInterest = watchedType === "Interest";
  const isFee = watchedType === "Fee";
  const requiresInstrument = isTrade || isDividend;  // Fee and Interest don't need instrument

  const total = useMemo(() => {
    const qty = Number(watchedQuantity || 0);
    const price = Number(watchedUnitPrice || 0);
    const fee = Number(watchedFee || 0);
    // For Fee type, don't add fee to itself
    if (isFee) return Math.abs(price);
    return isTrade ? qty * price + fee : Math.abs(price) + fee;
  }, [watchedQuantity, watchedUnitPrice, watchedFee, isTrade, isFee]);

  const currencyCode = watchedCurrencyCode || (currencies.length > 0 ? currencies[0]?.code : "") || "";

  const canSave =
    !!watchedAccountId &&
    (requiresInstrument ? !!watchedInstrumentId : true) &&  // Only require instrument for Buy/Sell/Dividend
    !!watchedDate &&
    !!watchedCurrencyCode &&
    (isTrade
      ? (Number(watchedQuantity) || 0) > 0 && (Number(watchedUnitPrice) || 0) > 0
      : (Number(watchedUnitPrice) || 0) > 0);

  const resetToBlankForm = () => {
    setOptions([]);
    setLockCurrency(false);
    reset({
      type: "Buy",
      fee: 0,
      withholding_tax: 0,
      capital_gains_tax: 0,
      securities_transaction_tax: 0,
      stamp_duty: 0,
      date: today(),
      instrument_search: "",
      account_id: getValues("account_id") || "",
      broker_id: "",
      currency_code: (currencies.length > 0 ? currencies[0]?.code : "") || "",
      quantity: undefined,
      unit_price: undefined,
      note: "",
      instrument_id: undefined,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (v: FormValues) => {
    setErr(null);
    // Only require instrument for Buy/Sell/Dividend
    if (requiresInstrument && !v.instrument_id) {
      setErr("Please pick an instrument.");
      return;
    }
    if (isTrade && (!v.quantity || !v.unit_price)) {
      setErr("Quantity and Unit Price are required for Buy/Sell.");
      return;
    }
    if (!isTrade && !(v.unit_price && v.unit_price > 0)) {
      setErr(`${watchedType} requires an Amount.`);
      return;
    }

    const { instrument_search, broker_id, ...rest } = v;
    const payload: any = { ...rest };
    if (broker_id !== "" && broker_id !== undefined) payload.broker_id = Number(broker_id);

    try {
      const data = await apiClient.post<any>("/activities", payload);
      setSuccessMsg(`Activity #${data.id} saved successfully.`);
      resetToBlankForm();
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl mx-auto w-full p-4 md:p-0">
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
            {/* Progress Bar bit */}
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

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Record <span className="text-emerald-500">Activity</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Log trades, dividends, or interest for your portfolio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <Card glass className="p-6 md:p-8">
          {err && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="font-medium">{err}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Type Selection */}
              <Select
                label="Activity Type"
                name="type"
                register={register}
                required
                options={[
                  { value: "Buy", label: "Buy" },
                  { value: "Sell", label: "Sell" },
                  { value: "Dividend", label: "Dividend" },
                  { value: "Interest", label: "Interest" },
                  { value: "Fee", label: "Fee" },
                ]}
              />

              {/* Date Selection */}
              <Input
                type="date"
                label="Date"
                {...register("date", { required: true })}
                className="dark:[color-scheme:dark]"
              />
            </div>

            {/* Instrument Selection with Custom Dropdown */}
            <div className="relative">
              <Controller
                name="instrument_search"
                control={control}
                rules={{ required: requiresInstrument }}  // Only required for Buy/Sell/Dividend
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-secondary ml-1">
                      Instrument{requiresInstrument ? '*' : ' (Optional)'}
                    </label>
                    <div className="relative group">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-brand-500 transition-colors duration-300">
                        <Search size={18} />
                      </div>
                      <input
                        autoComplete="off"
                        className={`
                          w-full bg-surface/50 dark:bg-slate-900/50 border border-border rounded-xl 
                          py-3 pl-11 pr-4 text-sm 
                          focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-background
                          transition-all duration-300 outline-none placeholder:text-text-tertiary
                        `}
                        placeholder="Search by name or symbol..."
                        {...field}
                        onFocus={() => setIsSearchOpen(true)}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setValue("instrument_id", undefined);
                          setLockCurrency(false);
                          setIsSearchOpen(true);
                        }}
                      />
                    </div>
                    {isSearchOpen && (options.length > 0 || searchStr) && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-auto animate-in fade-in zoom-in-95 duration-200">
                        {options.length > 0 ? (
                          options.map((opt, i) => (
                            <button
                              key={`${opt.source}-${opt.id ?? opt.symbol}-${i}`}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col gap-0.5 border-b last:border-0 border-slate-100 dark:border-slate-800"
                              onClick={async () => {
                                if (opt.source === "local") {
                                  setValue("instrument_id", opt.id!);
                                  setValue("instrument_search", opt.symbol || opt.name || "");
                                  if (opt.currency) {
                                    setValue("currency_code", opt.currency);
                                    setLockCurrency(true);
                                  }
                                  setIsSearchOpen(false);
                                } else {
                                  await handlePickYahoo(opt);
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {opt.name || opt.symbol}
                                  {opt.symbol && opt.name ? ` (${opt.symbol})` : ""}
                                </span>
                                {opt.source === "local" && (
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-md">
                                    Local
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2">
                                <span>{opt.currency}</span>
                                {opt.type && <span>• {opt.type}</span>}
                                {opt.exchange && <span>• {opt.exchange}</span>}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-slate-500">
                            <PlusCircle size={24} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm font-medium">No instruments found.</p>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Backdrop to close dropdown */}
                    {isSearchOpen && (
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setIsSearchOpen(false)}
                      />
                    )}
                    <p className="text-[11px] text-slate-500 ml-1 mt-1 flex items-center gap-1.5">
                      <Info size={12} className="shrink-0" />
                      {isDividend
                        ? "Dividends must be tied to a security."
                        : isFee || isInterest
                          ? "Instrument is optional for Fee and Interest activities."
                          : "Start typing to search local or Yahoo database."}
                    </p>
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Selection */}
              <Select
                label="Account"
                name="account_id"
                register={register}
                required
                options={accounts.map(a => ({ value: a.id!, label: a.name! }))}
                onChange={(e) => setValue("account_id", e.target.value === "" ? "" : Number(e.target.value))}
              />

              {/* Broker Selection */}
              <Select
                label="Broker (Optional)"
                name="broker_id"
                register={register}
                options={[
                  { value: "", label: "(None)" },
                  ...brokers.map(b => ({ value: b.id!, label: b.name! }))
                ]}
                onChange={(e) => setValue("broker_id", e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>

            {/* Trade vs Non-trade inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isTrade ? (
                <>
                  <div className="space-y-1.5">
                    <Input
                      label="Quantity"
                      type="number"
                      step="any"
                      {...register("quantity", { valueAsNumber: true })}
                    />
                    {/* Show available quantity for Sell */}
                    {watchedType === "Sell" && watchedInstrumentId && watchedAccountId && (
                      <div className="flex items-center gap-2 ml-1">
                        {loadingAvailableQty ? (
                          <p className="text-xs text-slate-500">
                            <span className="inline-block animate-pulse">Loading available...</span>
                          </p>
                        ) : availableQty !== null ? (
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            Available: <span className="font-bold text-emerald-600 dark:text-emerald-400">{availableQty.toLocaleString()}</span> units
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <Input
                    label="Unit Price"
                    type="number"
                    step="any"
                    {...register("unit_price", { valueAsNumber: true })}
                  />
                </>
              ) : (
                <Input
                  label="Amount"
                  type="number"
                  step="any"
                  {...register("unit_price", { valueAsNumber: true })}
                  placeholder={isDividend ? "Dividend amount" : isInterest ? "Interest amount" : "Fee amount"}
                />
              )}

              {/* Currency */}
              <Select
                label="Currency"
                name="currency_code"
                register={register}
                disabled={lockCurrency}
                options={currencies.map(c => ({ value: c.code!, label: c.code! }))}
              />
            </div>

            {/* Taxes & Fees Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pt-2">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Taxes & Fees</p>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fee - hide for Fee type */}
                {!isFee && (
                  <Input
                    label="Fee"
                    type="number"
                    step="any"
                    {...register("fee", { valueAsNumber: true })}
                  />
                )}

                {/* WHT - show for Dividend and Interest */}
                {(isDividend || isInterest) && (
                  <Input
                    label="Withholding Tax (WHT)"
                    type="number"
                    step="any"
                    {...register("withholding_tax", { valueAsNumber: true })}
                  />
                )}

                {/* CGT - show for Sell */}
                {watchedType === "Sell" && (
                  <Input
                    label="Capital Gains Tax (CGT)"
                    type="number"
                    step="any"
                    {...register("capital_gains_tax", { valueAsNumber: true })}
                  />
                )}

                {/* STT - show for Buy and Sell */}
                {isTrade && (
                  <Input
                    label="Securities Transaction Tax (STT)"
                    type="number"
                    step="any"
                    {...register("securities_transaction_tax", { valueAsNumber: true })}
                  />
                )}

                {/* Stamp Duty - show for Buy and Sell */}
                {isTrade && (
                  <Input
                    label="Stamp Duty"
                    type="number"
                    step="any"
                    {...register("stamp_duty", { valueAsNumber: true })}
                  />
                )}
              </div>
            </div>

            {/* Note Field */}
            <Input
              label="Note"
              placeholder="Optional details..."
              {...register("note")}
            />

            {/* Footer with Total and Actions */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <span className="text-lg font-black">{total > 0 ? "+" : ""}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Impact</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-emerald-500">{currencyCode}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !canSave}
                  isLoading={isSubmitting}
                  className="flex-1 sm:flex-none min-w-[120px]"
                >
                  <Save size={18} className="mr-2" />
                  Save Activity
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}