"use client";

import { useState, useEffect } from "react";
import {
  Paper, Box, Typography, TextField, Button,
  Alert, CircularProgress, Stack, MenuItem, Divider
} from "@mui/material";

const API = process.env.NEXT_PUBLIC_API!;

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

    // normalize to {code, name}
    const list: Currency[] = (Array.isArray(data) ? data : []).map((c: any) =>
      typeof c === "string" ? { code: c } : { code: c.code ?? c.Code ?? "", name: c.name ?? c.Name }
    ).filter(c => c.code);

    setCurrencies(list);

if (list.length && !list.find(c => c.code === form.currency_code)) {
  const fallback =
    list.find(c => c.code === "USD")?.code   // prefer USD if present
    ?? list[0]?.code                         // else first item if it exists
    ?? "";                                   // else empty string (safe default)

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
          // keep clean payload
          name: form.name.trim(),
          balance: Number(form.balance) || 0,
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
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Accounts</Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            label="Name"
            size="small"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            select
            label="Currency"
            size="small"
            value={form.currency_code}
            onChange={(e) => setForm({ ...form, currency_code: e.target.value })}
            disabled={loadingMeta || currencies.length === 0}
            helperText={
              currencies.length === 0
                ? "No currencies available — seed /lookups/currencies."
                : undefined
            }
            sx={{ minWidth: 180 }}
          >
            {currencies.length === 0 ? (
              <MenuItem value="" disabled>—</MenuItem>
            ) : (
              currencies.map((c) => (
                <MenuItem key={c.code} value={c.code}>
                  {c.code}{c.name ? ` — ${c.name}` : ""}
                </MenuItem>
              ))
            )}
          </TextField>

          <TextField
            select
            label="Type"
            size="small"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            sx={{ minWidth: 180 }}
          >
            {["Current","Savings","Fixed Deposit","Investment","Broker","Other"].map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Balance"
            type="number"
            size="small"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
            sx={{ width: 140 }}
          />

          <Button
            variant="contained"
            disabled={loading || !form.name || !form.currency_code || currencies.length === 0}
            onClick={createAccount}
          >
            Add Account
          </Button>
        </Box>

        {(loading || loadingMeta) && <CircularProgress size={18} />}
        {err && <Alert severity="error">{err}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}

        <Divider />

        <Stack spacing={1}>
          {accounts.map(acc => (
            <Paper key={acc.id} variant="outlined" sx={{ p:1, display:"flex", justifyContent:"space-between" }}>
              <span><b>{acc.name}</b> — {acc.currency_code} ({acc.type})</span>
              <span>{acc.balance ?? 0}</span>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
}