// app/(app)/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  CircularProgress, Alert, Button, Stack, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Drawer, IconButton, Grid, TableContainer
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const API = process.env.NEXT_PUBLIC_API!;

/** -------- small helper so ALL calls send cookies + JSON -------- */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    credentials: "include",                 // <— ensure auth cookie is sent
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
  type: "Buy" | "Sell" | "Dividend" | "Interest" | "Fee";
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
  // FX preview
  const [tfFxOverride, setTfFxOverride] = useState<string>("");
  const [tfFxAuto, setTfFxAuto] = useState<number | null>(null);
  const [tfLanded, setTfLanded] = useState<number | null>(null);

  // table
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<AccountBalance[]>([]);

  // meta
  const [accountsList, setAccountsList] = useState<{ id: number; name: string; currency_code: string }[]>([]);
  const [brokers, setBrokers] = useState<Record<number, Broker>>({});

  // actions state
  const [refreshing, setRefreshing] = useState(false);

  // Update Balance dialog
  const [ubOpen, setUbOpen] = useState(false);
  const [ubAccount, setUbAccount] = useState<AccountBalance | null>(null);
  const [ubBalance, setUbBalance] = useState<string>("");
  const [ubAsOf, setUbAsOf] = useState<string>("");
  const [ubNote, setUbNote] = useState<string>("");
  const [ubSubmitting, setUbSubmitting] = useState(false);
  const [ubErr, setUbErr] = useState<string | null>(null);

  // Transfer dialog
  const [tfOpen, setTfOpen] = useState(false);
  const [tfFromId, setTfFromId] = useState<number | "">("");
  const [tfToId, setTfToId] = useState<number | "">("");
  const [tfAmount, setTfAmount] = useState<string>("");
  const [tfCurrency, setTfCurrency] = useState<string>("");
  const [tfDate, setTfDate] = useState<string>("");
  const [tfNote, setTfNote] = useState<string>("");
  const [tfSubmitting, setTfSubmitting] = useState(false);
  const [tfErr, setTfErr] = useState<string | null>(null);

  // Activity drawer
  const [actOpen, setActOpen] = useState(false);
  const [actAccount, setActAccount] = useState<AccountBalance | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [actRows, setActRows] = useState<Activity[]>([]);
  const [instMap, setInstMap] = useState<Record<number, Instrument>>({});

  // const baseCcy = rows.length ? (rows[0].base_currency || "BASE") : "BASE";
  const baseCcy = rows[0]?.base_currency ?? "BASE";

  // initial load
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        const [balances, accs, brs] = await Promise.all([
          api<AccountBalance[]>("/accounts/balances"),
          api<{ id: number; name: string; currency_code: string }[]>("/lookups/accounts"),
          // brokers is optional
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

  // ---------- Update Balance ----------
  function openUpdateBalance(row: AccountBalance) {
    setUbErr(null);
    setUbAccount(row);
    setUbBalance(String(row.balance_ccy));
    setUbAsOf(row.as_of || new Date().toISOString().slice(0, 10));
    setUbNote("");
    setUbOpen(true);
  }
  function closeUpdateBalance() {
    setUbOpen(false);
    setUbAccount(null);
    setUbBalance("");
    setUbAsOf("");
    setUbNote("");
  }
  async function submitUpdateBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!ubAccount) return;
    const v = Number.parseFloat(ubBalance);
    if (!Number.isFinite(v)) { setUbErr("Enter a valid number"); return; }
    setUbSubmitting(true);
    setUbErr(null);
    try {
      const body: any = { balance: v };
      if (ubAsOf) body.as_of = ubAsOf;
      if (ubNote) body.note = ubNote;

      await api(`/accounts/${ubAccount.account_id}/set_balance`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      await reload();
      closeUpdateBalance();
    } catch (e: any) {
      setUbErr(e.message || "Update failed");
    } finally {
      setUbSubmitting(false);
    }
  }

  // ---------- Transfer ----------
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
  function closeTransfer() { setTfOpen(false); }

  // default currency to "from" account
  useEffect(() => {
    if (tfFromId && typeof tfFromId === "number") {
      const acc = accountsList.find(a => a.id === tfFromId);
      if (acc) setTfCurrency(acc.currency_code);
    }
  }, [tfFromId, accountsList]);

  // auto-FX + landed preview
  useEffect(() => {
    if (!tfFromId || !tfToId || !tfAmount || !tfCurrency || !tfDate) {
      setTfLanded(null);
      return;
    }
    const amt = Number.parseFloat(tfAmount);
    if (!Number.isFinite(amt) || amt <= 0) { setTfLanded(null); return; }

    const fromAcc = typeof tfFromId === "number" ? accountsList.find(a => a.id === tfFromId) : undefined;
    const toAcc   = typeof tfToId   === "number" ? accountsList.find(a => a.id === tfToId)   : undefined;
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
        const autoRate = typeof fx.rate === "number" ? fx.rate : null;
        if (aborted) return;
        setTfFxAuto(autoRate);
        const effRate = tfFxOverride && Number.isFinite(Number.parseFloat(tfFxOverride))
          ? Number.parseFloat(tfFxOverride)
          : (autoRate ?? null);
        setTfLanded(effRate != null ? amt * effRate : null);
      } catch {
        if (aborted) return;
        setTfFxAuto(null);
        const effRate = tfFxOverride && Number.isFinite(Number.parseFloat(tfFxOverride))
          ? Number.parseFloat(tfFxOverride)
          : null;
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
      if (tfFromId === tfToId) throw new Error("From and To accounts must be different");
      if (!tfCurrency) throw new Error("Currency is required");

      const body: any = {
        from_account_id: Number(tfFromId),
        to_account_id: Number(tfToId),
        amount: amt,
        currency_code: tfCurrency,
        date: tfDate || new Date().toISOString().slice(0,10),
        note: tfNote || undefined,
      };
      if (tfFxOverride && Number.isFinite(Number.parseFloat(tfFxOverride))) {
        body.fx_rate_override = Number.parseFloat(tfFxOverride);
      }

      await api(`/accounts/transfer`, { method: "POST", body: JSON.stringify(body) });
      await reload();
      closeTransfer();
    } catch (e: any) {
      setTfErr(e.message || "Transfer failed");
    } finally {
      setTfSubmitting(false);
    }
  }

  // ---------- Activity Drawer ----------
  async function openActivity(row: AccountBalance) {
    setActAccount(row);
    setActErr(null);
    setActOpen(true);
    setActLoading(true);
    setActRows([]);
    setInstMap({});
    try {
      // Server should already scope to the user; we also hard-filter by account_id here.
      let acts = await api<Activity[]>(`/activities?account_id=${encodeURIComponent(row.account_id)}`);
      acts = acts.filter(a => a.account_id === row.account_id);

      // Enrich instruments
      const ids = Array.from(new Set(acts.map(a => a.instrument_id).filter(Boolean))) as number[];
      const fetched: Record<number, Instrument> = {};
      await Promise.all(ids.map(async (id) => {
        try {
          fetched[id] = await api<Instrument>(`/instruments/${id}`);
        } catch {}
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
    <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
      <Paper elevation={1} sx={{ flex: 1, width: "100%", p: 2, overflow: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6">Accounts (Balances)</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={reload} disabled={loading || refreshing}>Reload</Button>
            <Button size="small" variant="contained" onClick={() => openTransfer()} disabled={loading || refreshing}>
              Transfer
            </Button>
          </Stack>
        </Box>

        {/* Table */}
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} /> Loading…
          </Box>
        ) : err ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err} — check <code>NEXT_PUBLIC_API</code>, CORS, and that <code>/accounts/balances</code> / transfer routes exist.
          </Alert>
        ) : rows.length === 0 ? (
          <Alert severity="info">No accounts found.</Alert>
        ) : (
          <Box component={Paper} variant="outlined" sx={{ width: "100%", overflow: "auto" }}>
            <TableContainer>
              <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>CCY</TableCell>
                    <TableCell align="right">Balance (CCY)</TableCell>
                    <TableCell align="right">FX → {baseCcy}</TableCell>
                    <TableCell align="right">Balance ({baseCcy})</TableCell>
                    <TableCell>As of</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.account_id} hover>
                      <TableCell>{r.account_name}</TableCell>
                      <TableCell>
                        {r.account_type ? (
                          <Chip size="small" label={r.account_type} variant="outlined" sx={{ textTransform: "capitalize" }} />
                        ) : "—"}
                      </TableCell>
                      <TableCell>{r.account_currency}</TableCell>
                      <TableCell align="right">{fmtMoney(r.balance_ccy)}</TableCell>
                      <TableCell align="right">{fmtRate(r.fx_rate)}</TableCell>
                      <TableCell align="right">{fmtMoney(r.balance_base)}</TableCell>
                      <TableCell>{r.as_of}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button size="small" onClick={() => openUpdateBalance(r)}>Update</Button>
                          <Button size="small" onClick={() => openTransfer(r)}>Transfer</Button>
                          <Button size="small" variant="outlined" onClick={() => openActivity(r)}>Activity</Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* Update Balance Dialog */}
      <Dialog open={ubOpen} onClose={closeUpdateBalance} maxWidth="xs" fullWidth>
        <DialogTitle>Update Balance</DialogTitle>
        <DialogContent dividers>
          {!!ubErr && <Alert severity="error" sx={{ mb: 2 }}>{ubErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {ubAccount?.account_name} · {ubAccount?.account_currency}
            </Typography>
            <TextField
              label="New Balance"
              type="number"
              inputProps={{ step: "0.01" }}
              value={ubBalance}
              onChange={(e) => setUbBalance(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="As of (date)"
              type="date"
              value={ubAsOf}
              onChange={(e) => setUbAsOf(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Note (optional)"
              value={ubNote}
              onChange={(e) => setUbNote(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUpdateBalance} disabled={ubSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={submitUpdateBalance} disabled={ubSubmitting || !ubBalance}>
            {ubSubmitting ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={tfOpen} onClose={closeTransfer} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Between Accounts</DialogTitle>
        <DialogContent dividers>
          {!!tfErr && <Alert severity="error" sx={{ mb: 2 }}>{tfErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="From" value={tfFromId}
              onChange={(e) => setTfFromId(e.target.value === "" ? "" : Number(e.target.value))}
              fullWidth required>
              <MenuItem value="">—</MenuItem>
              {accountsList.map(a => (<MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>))}
            </TextField>
            <TextField select label="To" value={tfToId}
              onChange={(e) => setTfToId(e.target.value === "" ? "" : Number(e.target.value))}
              fullWidth required>
              <MenuItem value="">—</MenuItem>
              {accountsList.map(a => (<MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>))}
            </TextField>
            <TextField label="Amount" type="number" inputProps={{ step: "0.01" }}
              value={tfAmount} onChange={(e) => setTfAmount(e.target.value)} required fullWidth />
            <TextField select label="Currency" value={tfCurrency}
              onChange={(e) => setTfCurrency(e.target.value)} helperText="Usually the ‘from’ account currency"
              fullWidth required>
              {[...new Set(accountsList.map(a => a.currency_code))].map(ccy => (
                <MenuItem key={ccy} value={ccy}>{ccy}</MenuItem>
              ))}
            </TextField>
            <TextField label="Date" type="date" value={tfDate}
              onChange={(e) => setTfDate(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField
              label="FX rate override (from → to)"
              type="number"
              inputProps={{ step: "0.000001" }}
              value={tfFxOverride}
              onChange={(e) => setTfFxOverride(e.target.value)}
              disabled={
                (() => {
                  const fromAcc = typeof tfFromId === "number" ? accountsList.find(a => a.id === tfFromId) : undefined;
                  const toAcc   = typeof tfToId   === "number" ? accountsList.find(a => a.id === tfToId)   : undefined;
                  return !!fromAcc && !!toAcc && fromAcc.currency_code === toAcc.currency_code;
                })()
              }
              helperText={tfFxAuto != null ? `Auto FX (server): ${tfFxAuto.toFixed(6)}` : "Leave blank to use server FX"}
              fullWidth
            />
            <TextField
              label="Will receive (target account ccy)"
              value={
                (() => {
                  const toAcc = typeof tfToId === "number" ? accountsList.find(a => a.id === tfToId) : undefined;
                  const ccy = toAcc ? toAcc.currency_code : "";
                  return tfLanded != null ? `${fmtMoney(tfLanded)} ${ccy}` : "—";
                })()
              }
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField label="Note (optional)" value={tfNote} onChange={(e) => setTfNote(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeTransfer} disabled={tfSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={submitTransfer} disabled={tfSubmitting || !tfFromId || !tfToId || !tfAmount || !tfCurrency}>
            {tfSubmitting ? "Transferring…" : "Transfer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Drawer */}
      <Drawer anchor="right" open={actOpen} onClose={closeActivity} PaperProps={{ sx: { width: 900, maxWidth: "100%" } }}>
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6">Account Activity</Typography>
          <IconButton onClick={() => setActOpen(false)}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ px: 2, pb: 2 }}>
          {actAccount && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {actAccount.account_name}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}><b>Type:</b> {actAccount.account_type || "—"}</Grid>
                <Grid size={{ xs: 6, md: 4 }}><b>Currency:</b> {actAccount.account_currency}</Grid>
                <Grid size={{ xs: 6, md: 4 }}><b>As of:</b> {actAccount.as_of}</Grid>
                <Grid size={{ xs: 6, md: 4 }}><b>Balance (CCY):</b> {fmtMoney(actAccount.balance_ccy)}</Grid>
                <Grid size={{ xs: 6, md: 4 }}><b>FX → {actAccount.base_currency}:</b> {fmtRate(actAccount.fx_rate)}</Grid>
                <Grid size={{ xs: 6, md: 4 }}><b>Balance ({actAccount.base_currency}):</b> {fmtMoney(actAccount.balance_base)}</Grid>
              </Grid>
            </Paper>
          )}

          {actLoading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <CircularProgress size={20} /> Loading…
            </Box>
          )}

          {!!actErr && <Alert severity="error" sx={{ mb: 2 }}>{actErr}</Alert>}

          {!actLoading && !actErr && actRows.length === 0 && (
            <Alert severity="info">No activities for this account.</Alert>
          )}

          {!actLoading && !actErr && actRows.length > 0 && (
            <Box component={Paper} variant="outlined" sx={{ width: "100%", overflow: "auto" }}>
              <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Instrument</TableCell>
                    <TableCell>Broker</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Total (CCY)</TableCell>
                    <TableCell>CCY</TableCell>
                    <TableCell align="right">FX → Base</TableCell>
                    <TableCell align="right">Total (Base)</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {actRows
                    .slice()
                    .sort((a,b)=> b.date.localeCompare(a.date))
                    .map((a) => {
                      const inst = a.instrument_id ? instMap[a.instrument_id] : undefined;
                      const instLabel = inst ? (inst.symbol || inst.name) : (a.instrument_id ?? "");
                      const brokerName = a.broker_id ? (brokers[a.broker_id!]?.name ?? a.broker_id) : "";
                      const trade = a.type === "Buy" || a.type === "Sell";
                      const qty = trade ? (a.quantity ?? 0) : 0;
                      const px = trade ? (a.unit_price ?? 0) : 0;
                      const fee = Number(a.fee || 0);
                      const totalCcy = trade ? (qty * px + fee) : (Math.abs(a.unit_price || 0) + fee);

                      const fx = (a as ActivityCalc).fx_rate ?? null;
                      const totalBase = (a as ActivityCalc).net_amount_base ?? (fx != null ? totalCcy * fx : null);

                      return (
                        <TableRow key={a.id} hover>
                          <TableCell>{a.date}</TableCell>
                          <TableCell><Chip size="small" label={a.type} /></TableCell>
                          <TableCell>{instLabel}</TableCell>
                          <TableCell>{brokerName || "—"}</TableCell>
                          <TableCell align="right">{trade ? qty.toLocaleString() : ""}</TableCell>
                          <TableCell align="right">
                            {trade ? px?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:4}) : ""}
                          </TableCell>
                          <TableCell align="right">{fmtMoney(totalCcy)}</TableCell>
                          <TableCell>{a.currency_code}</TableCell>
                          <TableCell align="right">{fmtRate(fx)}</TableCell>
                          <TableCell align="right">{totalBase != null ? fmtMoney(totalBase) : "—"}</TableCell>
                          <TableCell>{a.note || ""}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}