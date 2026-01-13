"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  useAccounts,
  useAssetClasses,
  useCurrencies,
} from "@/features/lookups/hooks";
import InstrumentSearch from "@/features/instruments/InstrumentSearch";
import { post } from "@/lib/api";

// ---- Local types for lookups ----
type Account = { id: number; name: string };
type AssetClass = { id: number; name: string };
type Currency = { code: string };

// ---- Form types ----
type FormValues = {
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee";
  account_id: number;
  asset_class_id?: number;
  instrument_id?: number;
  instrument_search: string;
  date: string;
  quantity?: number;
  unit_price?: number; // also "amount" for non-trades
  currency_code: string;
  fee?: number;
  note?: string;
};

type ActivitySaved = { id: number };

export default function ActivityForm() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      type: "Buy",
      fee: 0,
      date: new Date().toISOString().slice(0, 10),
      instrument_search: "",
    },
  });

  // Lookups (hooks without generics)
  const { data: currenciesData } = useCurrencies();
  const { data: assetClassesData } = useAssetClasses();
  const { data: accountsData } = useAccounts();

  // Narrow shapes used by this form
  const currencies = (currenciesData ?? []) as Currency[];
  const assetClasses = (assetClassesData ?? []) as AssetClass[];
  const accounts = (accountsData ?? []) as Account[];

  // Prefill first options on load (safe with noUncheckedIndexedAccess)
  useEffect(() => {
    const currentCcy = watch("currency_code");
    if (!currentCcy) {
      const firstCode = currencies[0]?.code;
      if (firstCode) setValue("currency_code", firstCode);
    }

    const currentAcc = watch("account_id");
    if (!currentAcc) {
      const firstAccId = accounts[0]?.id;
      if (typeof firstAccId === "number") setValue("account_id", firstAccId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencies, accounts]);

  const type = watch("type");
  const requires = type === "Buy" || type === "Sell";
  const assetClassId = watch("asset_class_id");

  async function onSubmit(v: FormValues) {
    if (!v.instrument_id) {
      alert("Pick an instrument");
      return;
    }
    if (requires && (!v.quantity || !v.unit_price)) {
      alert("Quantity & Unit Price required for Buy/Sell");
      return;
    }

    const saved = await post<ActivitySaved>("/activities", v);
    alert(`Saved #${saved.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type */}
      <label className="block">
        <div className="text-sm">Type*</div>
        <select
          {...register("type", { required: true })}
          className="w-full rounded border p-2"
        >
          {["Buy", "Sell", "Dividend", "Interest", "Fee"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      {/* Account */}
      <label className="block">
        <div className="text-sm">Account*</div>
        <select
          {...register("account_id", { required: true, valueAsNumber: true })}
          className="w-full rounded border p-2"
        >
          {accounts.map((a: Account) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {/* Asset Class */}
      <label className="block">
        <div className="text-sm">Asset Class</div>
        <select
          {...register("asset_class_id", { valueAsNumber: true })}
          className="w-full rounded border p-2"
        >
          <option value="">(Optional)</option>
          {assetClasses.map((a: AssetClass) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {/* Instrument */}
      <InstrumentSearch
        assetClassId={assetClassId}
        onPick={(created: {
          id: number;
          name: string;
          currency_code?: string;
        }) => {
          setValue("instrument_id", created.id);
          setValue("instrument_search", created.name);
          if (created.currency_code) {
            setValue("currency_code", created.currency_code);
          }
        }}
      />

      {/* Date */}
      <label className="block">
        <div className="text-sm">Date*</div>
        <input
          type="date"
          {...register("date", { required: true })}
          className="w-full rounded border p-2"
        />
      </label>

      {/* Qty/Price */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <div className="text-sm">Quantity{requires ? "*" : ""}</div>
          <input
            type="number"
            step="any"
            {...register("quantity", { valueAsNumber: true })}
            className="w-full rounded border p-2"
            disabled={!requires}
          />
        </label>
        <label className="block">
          <div className="text-sm">
            Unit Price{requires ? "*" : ""} / Amount
          </div>
          <input
            type="number"
            step="any"
            {...register("unit_price", { valueAsNumber: true })}
            className="w-full rounded border p-2"
          />
        </label>
      </div>

      {/* Currency */}
      <label className="block">
        <div className="text-sm">Currency*</div>
        <select
          {...register("currency_code", { required: true })}
          className="w-full rounded border p-2"
        >
          {/* Ensure GBp is always available if needed for LSE stocks */}
          {Array.from(new Set([...currencies.map(c => c.code), "GBp", "USD", "EUR", "GBP"])).sort().map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      {/* Fee & Notes */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <div className="text-sm">Fee</div>
          <input
            type="number"
            step="any"
            {...register("fee", { valueAsNumber: true })}
            className="w-full rounded border p-2"
          />
        </label>
        <label className="block">
          <div className="text-sm">Notes</div>
          <input {...register("note")} className="w-full rounded border p-2" />
        </label>
      </div>

      <button
        disabled={isSubmitting}
        className="rounded-md bg-black text-white px-4 py-2"
      >
        {isSubmitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}