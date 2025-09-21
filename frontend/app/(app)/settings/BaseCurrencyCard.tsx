"use client";

import { useEffect, useState } from "react";
import {
  Paper, Stack, Typography, Box, FormControl, InputLabel, Select, MenuItem,
  Button, Alert, CircularProgress
} from "@mui/material";

const API = process.env.NEXT_PUBLIC_API!; // "/api" via Next rewrites

type Currency = { code: string; name?: string | null };

export default function BaseCurrencyCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [base, setBase] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const rc = await fetch(`${API}/currencies`, { credentials: "include" });
      if (!rc.ok) throw new Error(`Currencies ${rc.status}`);
      const list: Currency[] = await rc.json();
      setCurrencies(list);

      const rs = await fetch(`${API}/settings`, { credentials: "include" });
      if (!rs.ok) throw new Error(`Settings ${rs.status}`);
      const s = await rs.json();
      setBase(s.base_currency_code || "");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await fetch(`${API}/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_currency_code: base || null }),
      });
      const body = await r.text();
      if (!r.ok) throw new Error(`Save ${r.status}: ${body.slice(0, 200)}`);
      setMsg("Saved base currency.");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Base Currency</Typography>

        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={18} /> Loading…
          </Box>
        ) : (
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="base-currency-label">Base Currency</InputLabel>
              <Select
                labelId="base-currency-label"
                label="Base Currency"
                value={base}
                onChange={(e) => setBase(e.target.value)}
                displayEmpty
              >
                <MenuItem value=""><em>(none)</em></MenuItem>
                {currencies.map((c) => (
                  <MenuItem key={c.code} value={c.code}>
                    {c.code}{c.name ? ` — ${c.name}` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="text" onClick={load} disabled={saving}>
              Refresh
            </Button>
          </Box>
        )}

        {err && <Alert severity="error">{err}</Alert>}
        {msg && <Alert severity="success">{msg}</Alert>}
      </Stack>
    </Paper>
  );
}