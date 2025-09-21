"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAccounts, useAssetClasses, useCurrencies } from "@/features/lookups/hooks";
import InstrumentSearch from "@/features/instruments/InstrumentSearch";
import { postJSON } from "@/app/api";

type FormValues = {
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee";
  account_id: number;
  asset_class_id?: number;
  instrument_id?: number;
  instrument_search: string;
  date: string;
  quantity?: number;
  unit_price?: number;
  currency_code: string;
  fee?: number;
  note?: string;
};

export default function ActivityForm() {
  const { register, handleSubmit, setValue, watch, formState:{isSubmitting} } =
    useForm<FormValues>({ defaultValues:{ type:"Buy", fee:0, date:new Date().toISOString().slice(0,10) } });

  const { data: currencies }   = useCurrencies();
  const { data: assetClasses } = useAssetClasses();
  const { data: accounts }     = useAccounts();

  useEffect(() => {
    if (currencies?.length) setValue("currency_code", currencies[0].code);
    if (accounts?.length) setValue("account_id", accounts[0].id);
  }, [currencies, accounts, setValue]);

  const type = watch("type");
  const requires = type === "Buy" || type === "Sell";
  const assetClassId = watch("asset_class_id");

  async function onSubmit(v: FormValues){
    if (!v.instrument_id) return alert("Pick an instrument");
    if (requires && (!v.quantity || !v.unit_price)) return alert("Quantity & Unit Price required");
    const saved = await postJSON("/activities", v);
    alert(`Saved #${saved.id}`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type */}
      <label className="block">
        <div className="text-sm">Type*</div>
        <select {...register("type", { required:true })} className="w-full rounded border p-2">
          {["Buy","Sell","Dividend","Interest","Fee"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      {/* Account */}
      <label className="block">
        <div className="text-sm">Account*</div>
        <select {...register("account_id", { required:true, valueAsNumber:true })} className="w-full rounded border p-2">
          {(accounts ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>

      {/* Asset Class */}
      <label className="block">
        <div className="text-sm">Asset Class</div>
        <select {...register("asset_class_id", { valueAsNumber:true })} className="w-full rounded border p-2">
          <option value="">(Optional)</option>
          {(assetClasses ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>

      {/* Instrument */}
      <InstrumentSearch
        assetClassId={assetClassId}
        onPick={(created) => {
          setValue("instrument_id", created.id);
          setValue("instrument_search", created.name);
          if (created.currency_code) setValue("currency_code", created.currency_code);
        }}
      />

      {/* Date */}
      <label className="block">
        <div className="text-sm">Date*</div>
        <input type="date" {...register("date", { required:true })} className="w-full rounded border p-2" />
      </label>

      {/* Qty/Price */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <div className="text-sm">Quantity{requires ? "*" : ""}</div>
          <input type="number" step="any" {...register("quantity", { valueAsNumber:true })} className="w-full rounded border p-2" disabled={!requires} />
        </label>
        <label className="block">
          <div className="text-sm">Unit Price{requires ? "*" : ""}</div>
          <input type="number" step="any" {...register("unit_price", { valueAsNumber:true })} className="w-full rounded border p-2" disabled={!requires} />
        </label>
      </div>

      {/* Currency */}
      <label className="block">
        <div className="text-sm">Currency*</div>
        <select {...register("currency_code", { required:true })} className="w-full rounded border p-2">
          {(currencies ?? []).map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
        </select>
      </label>

      {/* Fee & Notes */}
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <div className="text-sm">Fee</div>
          <input type="number" step="any" {...register("fee", { valueAsNumber:true })} className="w-full rounded border p-2" />
        </label>
        <label className="block">
          <div className="text-sm">Notes</div>
          <input {...register("note")} className="w-full rounded border p-2" />
        </label>
      </div>

      <button disabled={isSubmitting} className="rounded-md bg-black text-white px-4 py-2">
        {isSubmitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}