// app/(app)/activities/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, CircularProgress, Alert, Button, TableContainer, Stack, TextField,
  MenuItem, IconButton, Tooltip, Menu, FormGroup, FormControlLabel, Checkbox,
  Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";

// const API = process.env.NEXT_PUBLIC_API!;
import { api } from "@/lib/api";

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
type Broker  = { id: number; name: string };
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
  return "base_currency" in x && "net_amount_base" in x;
}

// ---------- Component ----------
export default function ActivitiesPage() {
  // data
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Activity[]>([]);
  const [accounts, setAccounts] = useState<Record<number, Account>>({});
  const [brokers,  setBrokers]  = useState<Record<number, Broker>>({});
  const [instMap,  setInstMap]  = useState<Record<number, Instrument>>({});

  // filters
  const [fltType, setFltType] = useState<"" | ActivityCore["type"]>("");
  const [fltAccount, setFltAccount] = useState<number | "">("");
  const [fltBroker, setFltBroker] = useState<number | "">("");
  const [fltFrom, setFltFrom] = useState<string>("");
  const [fltTo, setFltTo] = useState<string>("");
  const [fltText, setFltText] = useState<string>("");

  // columns menu
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [cols, setCols] = useState({
    date: true,
    type: true,
    account: true,
    broker: true,
    instrument: true,
    assetClass: true,
    subClass: true,
    qty: true,
    unitPrice: true,
    totalLocal: true,
    ccy: true,
    fx: true,         // base columns shown only if available
    totalBase: true,
    note: true,
  });

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

  const showBaseCols = useMemo(
    () => rows.length > 0 && isCalc(rows[0]),
    [rows]
  );
  const baseCurrency = useMemo(() => {
    if (!showBaseCols) return undefined;
    return (rows[0] as ActivityCalc).base_currency;
  }, [rows, showBaseCols]);

  // ---------- Load ----------
  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // activities
      // const actRes = await fetch(`${API}/activities`);
      // if (!actRes.ok) throw new Error(`GET /activities → ${actRes.status}`);
      // const acts: Activity[] = await actRes.json();
      const acts = await api<Activity[]>("/activities"); // cookies included

      // lookups
      const [accs, brks] = await Promise.all([
        api<Account[]>("/lookups/accounts"),
        api<Broker[]>("/lookups/brokers").catch(() => []),
      ]);

      const brkMap: Record<number, Broker> = {};
      brks.forEach((b) => (brkMap[b.id] = b));

      const accMap: Record<number, Account> = {};
      accs.forEach(a => accMap[a.id] = a);

      // instruments for visible rows (unique ids)
      const ids = Array.from(new Set(acts.map(a => a.instrument_id).filter(Boolean))) as number[];
      const fetched: Record<number, Instrument> = {};
      await Promise.all(
        ids.map(async (id) => {
          try { fetched[id] = await api<Instrument>(`/instruments/${id}`); } catch {}
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
  const openCols = (e: React.MouseEvent<HTMLElement>) => setColMenuAnchor(e.currentTarget);
  const closeCols = () => setColMenuAnchor(null);

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
      api<Instrument[]>(`/instruments?q=${encodeURIComponent(q)}&limit=10`),
      api<{ items?: any[] }>(`/instruments/suggest?q=${encodeURIComponent(q)}&limit=10`),
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
        opts.push({ source: "yahoo", ...it });
      }
}
      setInstOptions(opts);
    }, 250);
    return () => clearTimeout(t);
  }, [editInstrumentSearch]);

  async function upsertYahoo(sym: string, quoteType?: string) {
    const subclass = quoteType === "ETF" ? "ETF" : quoteType === "MUTUALFUND" ? "Mutual Fund" : "Stock";
    return await api<Instrument>(
      `/instruments/upsert_from_yahoo?symbol=${encodeURIComponent(sym)}&asset_subclass=${encodeURIComponent(subclass)}`,
      { method: "POST" }
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

      // PATCH preferred; fallback to PUT if API requires
      let updated: Activity;
      try {
        updated = await api<Activity>(`/activities/${editRow.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } catch {
        // Fallback if backend only supports PUT
        updated = await api<Activity>(`/activities/${editRow.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      // Update local caches
      setRows(prev => prev.map(x => (x.id === updated.id ? updated : x)));

      // maybe we fetched a different instrument
      if (updated.instrument_id && !instMap[updated.instrument_id]) {
        const rr = await fetch(`${API}/instruments/${updated.instrument_id}`);
        if (rr.ok) {
          const inst = await rr.json();
          setInstMap(prev => ({ ...prev, [inst.id]: inst }));
        }
      }
      closeEdit();
    } catch (e: any) {
      setEditErr(e.message || "Update failed");
    } finally {
      setEditLoading(false);
    }
  }

  // ---------- Render ----------
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"space-between", mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.3 }}>Activities</Typography>
          <Typography variant="body2" color="text.secondary">
            Trades, dividends, interest, and fees. Filter, review, and edit.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Show / hide columns">
            <IconButton onClick={openCols}><ViewColumnIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Reload">
            <IconButton onClick={load} disabled={loading}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center" useFlexGap flexWrap="wrap">
          <TextField
            select size="small" label="Type" value={fltType}
            onChange={(e) => setFltType(e.target.value as any)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {["Buy","Sell","Dividend","Interest","Fee"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>

          <TextField
            select size="small" label="Account" value={fltAccount}
            onChange={(e) => setFltAccount(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            {Object.values(accounts).map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
          </TextField>

          <TextField
            select size="small" label="Broker" value={fltBroker}
            onChange={(e) => setFltBroker(e.target.value === "" ? "" : Number(e.target.value))}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">All</MenuItem>
            {Object.values(brokers).map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
          </TextField>

          <TextField
            size="small" type="date" label="From" value={fltFrom}
            onChange={(e) => setFltFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small" type="date" label="To" value={fltTo}
            onChange={(e) => setFltTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            size="small"
            label="Search (instrument / account / broker / note)"
            value={fltText}
            onChange={(e) => setFltText(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1 }} fontSize="small" /> }}
            sx={{ minWidth: 340, flex: 1 }}
          />
        </Stack>
      </Paper>

      {/* Table */}
      {loading && (
        <Box sx={{ display:"flex", alignItems:"center", gap:2 }}>
          <CircularProgress size={20}/> Loading…
        </Box>
      )}

      {!!err && (
        <Alert severity="error" sx={{ mb:2 }}>
          {err} — check your backend and CORS.
        </Alert>
      )}

      {!loading && !err && filtered.length === 0 && (
        <Alert severity="info">No activities match your filters.</Alert>
      )}

      {!loading && !err && filtered.length > 0 && (
        <Paper sx={{ flex: 1, display: "flex", minHeight: 0 }}>
          <TableContainer sx={{ flex: 1 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {cols.date && <TableCell>Date</TableCell>}
                  {cols.type && <TableCell>Type</TableCell>}
                  {cols.account && <TableCell>Account</TableCell>}
                  {cols.broker && <TableCell>Broker</TableCell>}
                  {cols.instrument && <TableCell>Instrument</TableCell>}
                  {cols.assetClass && <TableCell>Asset Class</TableCell>}
                  {cols.subClass && <TableCell>Sub-Class</TableCell>}
                  {cols.qty && <TableCell align="right">Qty</TableCell>}
                  {cols.unitPrice && <TableCell align="right">Unit Price / Amount</TableCell>}
                  {cols.totalLocal && <TableCell align="right">Total</TableCell>}
                  {cols.ccy && <TableCell>CCY</TableCell>}
                  {showBaseCols && cols.fx && <TableCell align="right">FX → {(rows[0] as ActivityCalc).base_currency}</TableCell>}
                  {showBaseCols && cols.totalBase && <TableCell align="right">Total ({(rows[0] as ActivityCalc).base_currency})</TableCell>}
                  {cols.note && <TableCell>Note</TableCell>}
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered
                  .slice()
                  .sort((a,b)=> b.date.localeCompare(a.date))
                  .map((a) => {
                    const acc = accounts[a.account_id]?.name ?? a.account_id;
                    const brokerName = a.broker_id ? (brokers[a.broker_id]?.name ?? a.broker_id) : "";
                    const inst = a.instrument_id ? instMap[a.instrument_id] : undefined;
                    const instLabel = inst ? (inst.symbol || inst.name) : (a.instrument_id ?? "");

                    const trade = a.type === "Buy" || a.type === "Sell";
                    const qty = trade ? (a.quantity ?? 0) : 0;
                    const unit = a.unit_price ?? 0;
                    const totalLocal = computeTotalLocal(a);

                    const fx = isCalc(a) ? a.fx_rate : null;
                    const totalBase = isCalc(a) ? a.net_amount_base : (fx != null ? totalLocal * fx : null);

                    return (
                      <TableRow key={a.id} hover>
                        {cols.date && <TableCell>{a.date}</TableCell>}
                        {cols.type && <TableCell><Chip size="small" label={a.type}/></TableCell>}
                        {cols.account && <TableCell>{acc}</TableCell>}
                        {cols.broker && <TableCell>{brokerName || "—"}</TableCell>}
                        {cols.instrument && <TableCell>{instLabel}</TableCell>}
                        {cols.assetClass && <TableCell>{inst?.asset_class ?? ""}</TableCell>}
                        {cols.subClass && <TableCell>{inst?.asset_subclass ?? ""}</TableCell>}
                        {cols.qty && <TableCell align="right">{trade ? nf4.format(qty) : ""}</TableCell>}
                        {cols.unitPrice && (
                          <TableCell align="right">
                            {unit != null ? nf4.format(Number(unit)) : ""}
                          </TableCell>
                        )}
                        {cols.totalLocal && <TableCell align="right">{nf2.format(totalLocal)}</TableCell>}
                        {cols.ccy && <TableCell>{a.currency_code}</TableCell>}
                        {showBaseCols && cols.fx && (
                          <TableCell align="right">{fx != null ? nf4.format(fx) : "—"}</TableCell>
                        )}
                        {showBaseCols && cols.totalBase && (
                          <TableCell align="right">{totalBase != null ? nf2.format(totalBase) : "—"}</TableCell>
                        )}
                        {cols.note && <TableCell>{a.note}</TableCell>}
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(a)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Columns menu */}
      <Menu anchorEl={colMenuAnchor} open={!!colMenuAnchor} onClose={closeCols}>
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Columns</Typography>
          <FormGroup>
            {Object.entries(cols).map(([k, v]) => (
              <FormControlLabel
                key={k}
                control={<Checkbox size="small" checked={v} onChange={() => setCols(prev => ({ ...prev, [k]: !prev[k as keyof typeof prev] }))} />}
                label={k
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (c) => c.toUpperCase())
                  .replace("Fx", "FX")}
              />
            ))}
          </FormGroup>
        </Box>
      </Menu>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent dividers>
          {!!editErr && <Alert severity="error" sx={{ mb: 2 }}>{editErr}</Alert>}
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select fullWidth label="Type"
                value={editType}
                onChange={(e) => setEditType(e.target.value as ActivityCore["type"])}
              >
                {["Buy","Sell","Dividend","Interest","Fee"].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>

              <TextField
                select fullWidth label="Account"
                value={editAccountId}
                onChange={(e) => setEditAccountId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                {Object.values(accounts).map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
              </TextField>

              <TextField
                select fullWidth label="Broker (optional)"
                value={editBrokerId}
                onChange={(e) => setEditBrokerId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <MenuItem value="">(None)</MenuItem>
                {Object.values(brokers).map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </TextField>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="date" fullWidth label="Date"
                InputLabelProps={{ shrink: true }}
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
              <TextField
                select fullWidth label="Currency"
                value={editCcy}
                onChange={(e) => setEditCcy(e.target.value)}
                disabled={lockCcy}
              >
                {/* light lookup from accounts map (collect unique) */}
                {[...new Set(Object.values(accounts).map(a => a.currency_code).filter(Boolean))].map(ccy =>
                  <MenuItem key={ccy} value={ccy!}>{ccy}</MenuItem>
                )}
              </TextField>
            </Stack>

            {/* Instrument search (local + yahoo) */}
            <Autocomplete<InstOption, false, false, true>
              freeSolo
              options={instOptions}
              value={
                editInstrumentId
                  ? ({ source: "local", id: editInstrumentId, name: instMap[editInstrumentId]?.name ?? "", symbol: instMap[editInstrumentId]?.symbol ?? null } as InstOption)
                  : (editInstrumentSearch as unknown as InstOption)
              }
              onInputChange={(_, val) => {
                setEditInstrumentSearch(typeof val === "string" ? val : "");
                setLockCcy(false);
              }}
              onChange={async (_, val) => {
                if (!val) { setEditInstrumentId(undefined); return; }
                if (val.source === "local") {
                  setEditInstrumentId(val.id);
                  setEditInstrumentSearch(val.symbol || val.name);
                  if (val.currency) { setEditCcy(val.currency); setLockCcy(true); }
                  return;
                }
                // yahoo upsert
                try {
                  const inst = await upsertYahoo(val.symbol, val.type);
                  setEditInstrumentId(inst.id);
                  setEditInstrumentSearch(inst.symbol || inst.name);
                  if (inst.currency_code) { setEditCcy(inst.currency_code); setLockCcy(true); }
                } catch (e: any) {
                  setEditErr(e.message || "Failed to add instrument");
                }
              }}
              getOptionLabel={(o) =>
                typeof o === "string"
                  ? o
                  : o.name
                    ? `${o.name}${o.symbol ? ` (${o.symbol})` : ""}`
                    : (o.symbol || "")
              }
              renderInput={(p) => <TextField {...p} label="Instrument" />}
              renderOption={(props, option) => (
                <li {...props} key={`${option.source}-${"id" in option ? option.id : option.symbol}`}>
                  <Box>
                    <Typography variant="body2">{("name" in option ? option.name : option.symbol) || ""}{("symbol" in option && option.symbol && "name" in option && option.name) ? ` (${option.symbol})` : ""}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {option.currency ?? ""}{("type" in option && option.type) ? ` · ${option.type}` : ""}{("exchange" in option && option.exchange) ? ` · ${option.exchange}` : ""}{option.source === "local" ? " · local" : ""}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            {/* Trade vs non-trade inputs */}
            {editType === "Buy" || editType === "Sell" ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  fullWidth type="number" label="Quantity"
                  value={editQty} onChange={(e) => setEditQty(e.target.value)}
                  inputProps={{ step: "any" }}
                />
                <TextField
                  fullWidth type="number" label="Unit Price"
                  value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)}
                  inputProps={{ step: "any" }}
                />
              </Stack>
            ) : (
              <TextField
                fullWidth type="number" label="Amount"
                value={editUnitPrice} onChange={(e) => setEditUnitPrice(e.target.value)}
                inputProps={{ step: "any" }}
                helperText={editType === "Dividend" ? "Dividend cash amount" : editType === "Interest" ? "Interest cash amount" : "Fee amount"}
              />
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth type="number" label="Fee"
                value={editFee} onChange={(e) => setEditFee(e.target.value)}
                inputProps={{ step: "any" }}
              />
              <TextField fullWidth label="Note" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
            </Stack>

            {/* quick total preview */}
            <Box sx={{ mt: 0.5, color: "text.secondary" }}>
              {(() => {
                const fee = Number(editFee || 0);
                if (editType === "Buy" || editType === "Sell") {
                  const q = Number(editQty || 0), px = Number(editUnitPrice || 0);
                  return <Typography variant="body2">Total: {nf2.format(q * px + fee)} {editCcy}</Typography>;
                }
                const amt = Math.abs(Number(editUnitPrice || 0));
                return <Typography variant="body2">Total: {nf2.format(amt + fee)} {editCcy}</Typography>;
              })()}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit} disabled={editLoading}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit} disabled={editLoading}>
            {editLoading ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}