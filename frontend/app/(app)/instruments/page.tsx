"use client";

import { useEffect, useState } from "react";
import {
  Box, Paper, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, CircularProgress, Alert, Button, Stack, TextField, InputAdornment,
  MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { api } from "@/lib/api";

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

type CurrencyOpt      = { code: string; name?: string };
type AssetClassOpt    = { name: string };
type AssetSubclassOpt = { name: string };
type SectorOpt        = { name: string };

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
      const data = await api<Instrument[]>(`/instruments?${params.toString()}`, { signal });
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
    const toList = (raw: any, key: "code" | "name") => {
      if (Array.isArray(raw)) {
        return raw.map((x: any) => (typeof x === "string" ? { [key]: x } : { [key]: x?.name ?? x?.label ?? x?.code ?? String(x) }));
      }
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed.map((x: any) => (typeof x === "string" ? { [key]: x } : { [key]: x?.name ?? x?.label ?? x?.code ?? String(x) }));
        } catch {}
        return raw.split(/[\n,|]+/).map((s: string) => s.trim()).filter(Boolean).map((s: string) => ({ [key]: s }));
      }
      return [];
    };
    try {
      const [rc, rAc, rSub, rSec] = await Promise.all([
        api<any[]>("/lookups/currencies"),
        api<any[]>("/asset-classes"),
        api<any[]>("/asset-subclasses"),
        api<any[]>("/sectors"),
      ]);
      const uniqBy = <T extends { [k: string]: string }>(arr: T[], k: keyof T) =>
        Array.from(new Map(arr.map(o => [String(o[k]).toLowerCase(), o])).values());
      const cNorm = uniqBy(toList(rc, "code") as CurrencyOpt[], "code").sort((a, b) => a.code.localeCompare(b.code));
      const aNorm = uniqBy(toList(rAc, "name") as AssetClassOpt[], "name").sort((a, b) => a.name.localeCompare(b.name));
      const subNorm = uniqBy(toList(rSub, "name") as AssetSubclassOpt[], "name").sort((a, b) => a.name.localeCompare(b.name));
      const secNorm = uniqBy(toList(rSec, "name") as SectorOpt[], "name").sort((a, b) => a.name.localeCompare(b.name));
      setCurrencies(cNorm); setAssetClasses(aNorm); setAssetSubclasses(subNorm); setSectors(secNorm);
      setAddForm(prev => ({ ...prev, currency_code: prev.currency_code || cNorm[0]?.code || "" }));
    } catch (e: any) {
      setAddErr(e.message || String(e));
    } finally {
      setMetaLoading(false);
    }
  }

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => load(ctrl.signal), 250);
    return () => { ctrl.abort(); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, limit, dataSource]);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        created = await api<Instrument>("/instruments/manual", { method: "POST", body: JSON.stringify(payload) });
      } catch {
        created = await api<Instrument>("/instruments", { method: "POST", body: JSON.stringify(payload) });
      }
      setRows(prev => [created, ...prev]);
      setAddForm(f => ({ ...f, symbol: "", name: "", latest_price: "" }));
      setAddOpen(false);
    } catch (e: any) {
      setAddErr(e.message || "Create failed");
    } finally {
      setAddSubmitting(false);
    }
  }

  // --------- Edit (Manual only) ----------
  async function openEditInstrument(row: Instrument) {
    // 🔒 Disable editing for Yahoo/public instruments (leave code in place for future enable)
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
    if (editForm.data_source !== "manual") return; // extra guard
    setEditSubmitting(true);
    setEditErr(null);
    try {
      try {
        await api(`/instruments/${editForm.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            symbol: editForm.symbol,
            name: editForm.name,
            sector: editForm.sector,
            currency_code: editForm.currency_code,
            asset_class: editForm.asset_class,
            asset_subclass: editForm.asset_subclass,
            country: editForm.country,
          }),
        });
      } catch {
        await api(`/instruments/${editForm.id}`, { method: "PUT", body: JSON.stringify(editForm) });
      }
      await load();
      closeEditInstrument();
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
      await api(`/instruments/${priceRow.id}/price_manual`, { method: "POST", body: JSON.stringify(body) });
      await load();
      closeEditPrice();
    } catch (e: any) {
      setPriceErr(e.message || "Update failed");
    } finally {
      setPriceSubmitting(false);
    }
  }

  const isYahooEdit = editForm && editForm.data_source !== "manual";

  return (
    <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
      <Paper elevation={1} sx={{ flex: 1, width: "100%", p: 2, overflow: "auto" }}>
        {/* Toolbar */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h6">Instruments</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search name or symbol…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
              sx={{ minWidth: 260 }}
            />
            <TextField select size="small" label="Source" value={dataSource} onChange={(e) => setDataSource(e.target.value)} sx={{ width: 140 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="manual">manual</MenuItem>
              <MenuItem value="yahoo">yahoo</MenuItem>
            </TextField>
            <TextField select size="small" label="Limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))} sx={{ width: 110 }}>
              {[50, 100, 200, 500, 1000].map(n => (<MenuItem key={n} value={n}>{n}</MenuItem>))}
            </TextField>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => load()} disabled={loading}>Reload</Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAdd}>Add Instrument</Button>
          </Stack>
        </Box>

        {loading && (<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}><CircularProgress size={20} /> Loading…</Box>)}

        {!!err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err} — check <code>NEXT_PUBLIC_API</code>, CORS, and that <code>/instruments</code> supports the filters.
          </Alert>
        )}

        {!loading && !err && rows.length === 0 && <Alert severity="info">No instruments found.</Alert>}

        {!loading && !err && rows.length > 0 && (
          <Box component={Paper} variant="outlined" sx={{ width: "100%", overflow: "auto" }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1300 }}>
              <TableHead>
                <TableRow>
                  <TableCell width={70}>ID</TableCell>
                  <TableCell width={140}>Symbol</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell width={160}>Sector</TableCell>
                  <TableCell width={110}>Currency</TableCell>
                  <TableCell width={160}>Asset Class</TableCell>
                  <TableCell width={180}>Asset Subclass</TableCell>
                  <TableCell width={140}>Country</TableCell>
                  <TableCell align="right" width={160}>Latest Price</TableCell>
                  <TableCell width={190}>Updated At</TableCell>
                  <TableCell width={120}>Source</TableCell>
                  <TableCell width={220}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>{r.symbol || "—"}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.sector || "—"}</TableCell>
                    <TableCell>{r.currency_code}</TableCell>
                    <TableCell>{r.asset_class || "—"}</TableCell>
                    <TableCell>{r.asset_subclass || "—"}</TableCell>
                    <TableCell>{r.country || "—"}</TableCell>
                    <TableCell align="right">{fmtNum(r.latest_price, 4)}</TableCell>
                    <TableCell>{fmtDateTime(r.latest_price_at)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={r.data_source} color={r.data_source === "manual" ? "default" : "primary"} variant="outlined" sx={{ textTransform: "capitalize" }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EditIcon />}
                          onClick={() => openEditInstrument(r)}
                          disabled={r.data_source !== "manual"}
                          title={r.data_source !== "manual" ? "Editing is disabled for Yahoo instruments" : ""}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditPrice(r)}
                          disabled={r.data_source !== "manual"}
                          title={r.data_source !== "manual" ? "Manual price only for manual instruments" : ""}
                        >
                          Update Price
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* ---------- Add Instrument Dialog ---------- */}
        <Dialog open={addOpen} onClose={closeAdd} maxWidth="sm" fullWidth>
          <DialogTitle>Add Instrument (Manual)</DialogTitle>
          <DialogContent dividers>
            {!!addErr && <Alert severity="error" sx={{ mb: 2 }}>{addErr}</Alert>}
            {metaLoading && (<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}><CircularProgress size={18} /> Loading options…</Box>)}
            <Box component="form" id="add-instrument-form" onSubmit={submitAdd}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Name" name="name" value={addForm.name} onChange={onAddChange} required fullWidth />
                <TextField label="Symbol (optional)" name="symbol" value={addForm.symbol} onChange={onAddChange} fullWidth />
                <TextField select label="Currency" name="currency_code" value={addForm.currency_code} onChange={onAddChange} required fullWidth disabled={metaLoading}>
                  <MenuItem value="" disabled>Choose currency</MenuItem>
                  {currencies.map((c) => (<MenuItem key={c.code} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ""}</MenuItem>))}
                </TextField>
                <TextField select label="Asset Class" name="asset_class" value={addForm.asset_class} onChange={onAddChange} fullWidth disabled={metaLoading}>
                  <MenuItem value="">—</MenuItem>
                  {assetClasses.map((a) => (<MenuItem key={a.name} value={a.name}>{a.name}</MenuItem>))}
                </TextField>
                <TextField select label="Asset Subclass" name="asset_subclass" value={addForm.asset_subclass} onChange={onAddChange} fullWidth disabled={metaLoading || assetSubclasses.length === 0}>
                  <MenuItem value="">—</MenuItem>
                  {assetSubclasses.map((s) => (<MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>))}
                </TextField>
                <TextField select label="Sector" name="sector" value={addForm.sector} onChange={onAddChange} fullWidth disabled={metaLoading || sectors.length === 0}>
                  <MenuItem value="">—</MenuItem>
                  {sectors.map((s) => (<MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>))}
                </TextField>
                <TextField label="Country" name="country" value={addForm.country} onChange={onAddChange} fullWidth />
                <TextField type="number" inputProps={{ step: "0.0001" }} label="Latest Price (optional)" name="latest_price" value={addForm.latest_price} onChange={onAddChange} fullWidth />
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeAdd} disabled={addSubmitting}>Cancel</Button>
            <Button type="submit" form="add-instrument-form" variant="contained" disabled={addSubmitting || metaLoading || !addForm.name || !addForm.currency_code}>
              {addSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ---------- Edit Instrument Dialog (Manual only) ---------- */}
        <Dialog open={editOpen} onClose={closeEditInstrument} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Instrument</DialogTitle>
          <DialogContent dividers>
            {!!editErr && <Alert severity="error" sx={{ mb: 2 }}>{editErr}</Alert>}
            {isYahooEdit && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Editing is currently disabled for Yahoo/public instruments. (Manual instruments only)
              </Alert>
            )}
            <Box component="form" id="edit-instrument-form" onSubmit={submitEditInstrument}>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <TextField label="Name" name="name" value={editForm?.name || ""} onChange={onEditChange} required fullWidth disabled={!!isYahooEdit} />
                <TextField label="Symbol (optional)" name="symbol" value={editForm?.symbol || ""} onChange={onEditChange} fullWidth disabled={!!isYahooEdit} />
                <TextField select label="Currency" name="currency_code" value={editForm?.currency_code || ""} onChange={onEditChange} required fullWidth disabled={!!isYahooEdit}>
                  <MenuItem value="" disabled>Choose currency</MenuItem>
                  {currencies.map((c) => (<MenuItem key={c.code} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ""}</MenuItem>))}
                </TextField>
                <TextField select label="Asset Class" name="asset_class" value={editForm?.asset_class || ""} onChange={onEditChange} fullWidth disabled={!!isYahooEdit}>
                  <MenuItem value="">—</MenuItem>
                  {assetClasses.map((a) => (<MenuItem key={a.name} value={a.name}>{a.name}</MenuItem>))}
                </TextField>
                <TextField select label="Asset Subclass" name="asset_subclass" value={editForm?.asset_subclass || ""} onChange={onEditChange} fullWidth disabled={!!isYahooEdit}>
                  <MenuItem value="">—</MenuItem>
                  {assetSubclasses.map((s) => (<MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>))}
                </TextField>
                <TextField select label="Sector" name="sector" value={editForm?.sector || ""} onChange={onEditChange} fullWidth disabled={!!isYahooEdit}>
                  <MenuItem value="">—</MenuItem>
                  {sectors.map((s) => (<MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>))}
                </TextField>
                <TextField label="Country" name="country" value={editForm?.country || ""} onChange={onEditChange} fullWidth disabled={!!isYahooEdit} />
              </Stack>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditInstrument} disabled={editSubmitting}>Cancel</Button>
            <Button type="submit" form="edit-instrument-form" variant="contained" disabled={editSubmitting || !!isYahooEdit}>
              {editSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* ---------- Update Price (Manual) ---------- */}
        <Dialog open={priceOpen} onClose={closeEditPrice} maxWidth="xs" fullWidth>
          <DialogTitle>Update Price (Manual)</DialogTitle>
          <DialogContent dividers>
            {!!priceErr && <Alert severity="error" sx={{ mb: 2 }}>{priceErr}</Alert>}
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {priceRow?.name} {priceRow?.symbol ? `(${priceRow.symbol})` : ""} · {priceRow?.currency_code}
              </Typography>
              <TextField label="New Price" type="number" inputProps={{ step: "0.0001" }} value={priceVal} onChange={(e) => setPriceVal(e.target.value)} autoFocus required fullWidth />
              <TextField label="Date (optional)" type="date" value={priceDate} onChange={(e) => setPriceDate(e.target.value)} helperText="If blank, server will use today." fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeEditPrice} disabled={priceSubmitting}>Cancel</Button>
            <Button variant="contained" onClick={submitEditPrice} disabled={priceSubmitting || !priceVal}>
              {priceSubmitting ? "Updating…" : "Update"}
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}