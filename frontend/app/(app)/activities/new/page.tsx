// app/(app)/activities/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  Paper,
  TextField,
  Typography,
  Alert,
  Stack,
  Chip,
  Snackbar,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { API_BASE } from "@/lib/api";
const API = API_BASE; // resolves to "/api" if unset, no trailing slash

type Lookup = { id?: number; name?: string; code?: string; type?: string };
// const API = process.env.NEXT_PUBLIC_API!;

type FormValues = {
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee";
  account_id: number | "";
  broker_id?: number | "";
  instrument_search: string;
  instrument_id?: number;
  date: string;
  quantity?: number;
  unit_price?: number;          // used as Amount for non-trades
  currency_code: string | "";
  fee?: number;
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
  const today = () => new Date().toISOString().slice(0, 10);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      type: "Buy",
      fee: 0,
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

  // success toast
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Lookups
  useEffect(() => {
    (async () => {
      try {
        const [c, acc, br] = await Promise.all([
          fetch(`${API}/lookups/currencies`).then((r) => r.json()),
          fetch(`${API}/lookups/accounts`).then((r) => r.json()),
          fetch(`${API}/lookups/brokers`).then((r) => r.json()).catch(() => []),
        ]);
        setCurrencies(c || []);
        setAccounts(acc || []);
        setBrokers(br || []);

        if (!getValues("currency_code")) setValue("currency_code", c?.[0]?.code || "");
        if (!getValues("account_id"))    setValue("account_id", acc?.[0]?.id ?? "");
        if (!getValues("broker_id") && br?.length) setValue("broker_id", "");
      } catch (e: any) {
        setErr(e.message || String(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unified search (local + Yahoo), debounced
  const search = watch("instrument_search") || "";
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!search.trim()) { setOptions([]); return; }
      const [locR, yR] = await Promise.allSettled([
        fetch(`${API}/instruments?q=${encodeURIComponent(search)}&limit=10`),
        fetch(`${API}/instruments/suggest?q=${encodeURIComponent(search)}&limit=10`)
      ]);

      const opts: Option[] = [];
      if (locR.status === "fulfilled" && locR.value.ok) {
        const local = await locR.value.json();
        for (const inst of local) {
          opts.push({ source: "local", id: inst.id, name: inst.name, symbol: inst.symbol ?? null, currency: inst.currency_code });
        }
      }
      if (yR.status === "fulfilled" && yR.value.ok) {
        const data = await yR.value.json();
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
  }, [search]);

  async function handlePickYahoo(picked: Option) {
    const sym = (picked.symbol || "").toUpperCase();
    const subclass =
      picked.type === "ETF" ? "ETF" :
      picked.type === "MUTUALFUND" ? "Mutual Fund" : "Stock";
    const r = await fetch(
      `${API}/instruments/upsert_from_yahoo?symbol=${encodeURIComponent(sym)}&asset_subclass=${encodeURIComponent(subclass)}`,
      { method: "POST" }
    );
    if (!r.ok) {
      alert(`Failed to create instrument: ${await r.text()}`);
      return;
    }
    const inst = await r.json();
    setValue("instrument_id", inst.id);
    setValue("instrument_search", inst.symbol || inst.name);
    if (inst.currency_code) {
      setValue("currency_code", inst.currency_code);
      setLockCurrency(true);
    }
  }

  const type = watch("type");
  const isTrade = type === "Buy" || type === "Sell";
  const isDividend = type === "Dividend";
  const isInterest = type === "Interest";

  const total = useMemo(() => {
    const qty = Number(watch("quantity") || 0);
    const price = Number(watch("unit_price") || 0);
    const fee = Number(watch("fee") || 0);
    return isTrade ? qty * price + fee : Math.abs(price) + fee;
  }, [watch("quantity"), watch("unit_price"), watch("fee"), isTrade]);

  const currencyCode = watch("currency_code") || currencies[0]?.code || "";

  const canSave =
    !!watch("account_id") &&
    !!watch("instrument_id") &&
    !!watch("date") &&
    !!watch("currency_code") &&
    (isTrade
      ? (Number(watch("quantity")) || 0) > 0 && (Number(watch("unit_price")) || 0) > 0
      : (Number(watch("unit_price")) || 0) > 0);

  const resetToBlankForm = () => {
    setOptions([]);
    setLockCurrency(false);
    reset({
      type: "Buy",
      fee: 0,
      date: today(),
      instrument_search: "",
      account_id: getValues("account_id") || "",   // keep same account for convenience
      broker_id: "",
      currency_code: currencies?.[0]?.code || "",
      quantity: undefined,
      unit_price: undefined,
      note: "",
      instrument_id: undefined,
    });
    // scroll to top so toast is visible
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (v: FormValues) => {
    if (!v.instrument_id) { alert("Please pick an instrument."); return; }
    if (isTrade && (!v.quantity || !v.unit_price)) {
      alert("Quantity and Unit Price are required for Buy/Sell.");
      return;
    }
    if (!isTrade && !(v.unit_price && v.unit_price > 0)) {
      alert(`${type} requires an Amount.`);
      return;
    }

    const { instrument_search, broker_id, ...rest } = v;
    const payload: any = { ...rest };
    if (broker_id !== "" && broker_id !== undefined) payload.broker_id = Number(broker_id);

    const res = await fetch(`${API}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      alert(`Failed to save activity: ${text}`);
      return;
    }
    const data = await res.json();

    // Professional success message + reset to a fresh, blank form
    setSuccessMsg(`Activity #${data.id} saved successfully.`);
    setSuccessOpen(true);
    resetToBlankForm();
  };

  return (
    <Box sx={{ width: "100%", minHeight: "100%", display: "flex", justifyContent: "center", p: { xs: 2, md: 5 } }}>
      <Paper sx={{ p: { xs: 2.5, md: 4 }, width: "100%", maxWidth: 780 }}>
        {/* Title & context */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.75 }}>
            Record Activity
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Choose the <b>instrument</b> and the <b>account</b> that receives or pays cash. 
            Dividends/Interest are posted to the selected account in the instrument’s currency (unless you change it).
          </Typography>
        </Box>

        {err && <Alert severity="error" sx={{ mb: 2.5 }}>{err}</Alert>}

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}
        >
          {/* Type */}
          <TextField select label="Type" value={watch("type")} {...register("type", { required: true })}>
            {["Buy", "Sell", "Dividend", "Interest", "Fee"].map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </TextField>

          {/* Account & Broker */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
            <TextField
              fullWidth
              select
              label="Account (cash destination/source)"
              value={watch("account_id") ?? ""}
              helperText={
                (isDividend || isInterest)
                  ? "Pick the bank/broker/cash account that receives this cash."
                  : "Where trade cash settles."
              }
              onChange={(e) => setValue("account_id", e.target.value === "" ? "" : Number(e.target.value))}
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id!}>
                  {a.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              select
              label="Broker (optional)"
              value={watch("broker_id") ?? ""}
              onChange={(e) => setValue("broker_id", e.target.value === "" ? "" : Number(e.target.value))}
            >
              <MenuItem value="">(None)</MenuItem>
              {brokers.map((b) => (
                <MenuItem key={b.id} value={b.id!}>{b.name}</MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* Instrument */}
          <Controller
            name="instrument_search"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <Autocomplete<Option, false, false, true>
                freeSolo
                options={options}
                isOptionEqualToValue={(o, v) => {
                  const val = typeof v === "string" ? ({ symbol: v, source: "yahoo" } as Option) : (v as Option);
                  if (o.source === "local" && val.source === "local") return o.id === val.id;
                  return (o.symbol || "").toUpperCase() === (val.symbol || "").toUpperCase() && o.source === val.source;
                }}
                getOptionLabel={(o) =>
                  typeof o === "string"
                    ? o
                    : o.name
                      ? `${o.name}${o.symbol ? ` (${o.symbol})` : ""}`
                      : (o.symbol || "")
                }
                filterOptions={(opts, state) => {
                  const q = (state.inputValue || "").toLowerCase().trim();
                  if (!q) return opts;
                  return opts.filter(o =>
                    (o.name || "").toLowerCase().includes(q) ||
                    (o.symbol || "").toLowerCase().includes(q)
                  );
                }}
                onInputChange={(_, value) => {
                  setValue("instrument_id", undefined);
                  setLockCurrency(false);
                  field.onChange(value);
                }}
                onChange={async (_, value) => {
                  setValue("instrument_id", undefined);
                  setLockCurrency(false);
                  if (!value) return;

                  const picked = value as Option;
                  if (picked.source === "local") {
                    setValue("instrument_id", picked.id!);
                    setValue("instrument_search", picked.symbol || picked.name || "");
                    if (picked.currency) {
                      setValue("currency_code", picked.currency);
                      setLockCurrency(true);
                    }
                    return;
                  }
                  await handlePickYahoo(picked);
                }}
                renderOption={(props, option) => (
                  <li {...props} key={`${option.source}-${option.id ?? option.symbol}`}>
                    <Box>
                      <Typography variant="body2">
                        {option.name || option.symbol}
                        {option.symbol && option.name ? ` (${option.symbol})` : ""}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {option.currency ?? ""}{option.type ? ` · ${option.type}` : ""}{option.exchange ? ` · ${option.exchange}` : ""}{option.source === "local" ? " · local" : ""}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Instrument (required)"
                    helperText={
                      isDividend
                        ? "Dividends must be tied to a security."
                        : isInterest
                        ? "Interest currently also needs an instrument (backend constraint)."
                        : ""
                    }
                    value={watch("instrument_search")}
                  />
                )}
              />
            )}
          />

          {/* Date */}
          <TextField type="date" label="Date" InputLabelProps={{ shrink: true }} {...register("date", { required: true })} />

          {/* Trade vs Non-trade inputs */}
          {isTrade ? (
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
              <TextField fullWidth type="number" label="Quantity" inputProps={{ step: "any" }} {...register("quantity", { valueAsNumber: true })} />
              <TextField fullWidth type="number" label="Unit Price" inputProps={{ step: "any" }} {...register("unit_price", { valueAsNumber: true })} />
            </Stack>
          ) : (
            <TextField
              type="number"
              label="Amount"
              inputProps={{ step: "any" }}
              helperText={isDividend ? "Dividend cash amount." : isInterest ? "Interest cash amount." : "Fee amount."}
              {...register("unit_price", { valueAsNumber: true })}
            />
          )}

          {/* Currency (locked after instrument selection) */}
          <TextField
            select
            label="Currency"
            value={watch("currency_code") || ""}
            onChange={(e) => setValue("currency_code", e.target.value)}
            disabled={lockCurrency}
          >
            {currencies.map((c) => (
              <MenuItem key={c.code} value={c.code!}>{c.code}</MenuItem>
            ))}
          </TextField>

          {/* Fee & Note */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5}>
            <TextField type="number" label="Fee" inputProps={{ step: "any" }} {...register("fee", { valueAsNumber: true })} />
            <TextField label="Note" multiline minRows={1} {...register("note")} fullWidth />
          </Stack>

          {/* Footer */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {total.toFixed(2)} {currencyCode}
            </Typography>
            <Box>
              <Button color="inherit" onClick={() => history.back()} sx={{ mr: 1.5 }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={isSubmitting || !canSave}>Save</Button>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* success toast */}
      <Snackbar
        open={successOpen}
        onClose={() => setSuccessOpen(false)}
        autoHideDuration={3500}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <MuiAlert elevation={6} variant="filled" severity="success" onClose={() => setSuccessOpen(false)}>
          {successMsg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}