"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Stack,
  TextField,
  MenuItem,
  InputAdornment,
  IconButton,
  Menu,
  FormGroup,
  FormControlLabel,
  Checkbox,
  TableContainer,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";

const API = process.env.NEXT_PUBLIC_API!;

type Position = {
  account_id: number;
  account_name: string | number;

  instrument_id: number;
  symbol: string | null;
  name: string | null;
  asset_class: string | null;
  asset_subclass: string | null;
  instrument_currency: string | null;

  qty: number;
  avg_cost_ccy: number;
  avg_cost_base: number;

  last_ccy: number;
  last_base: number;

  market_value_ccy: number;
  market_value_base: number;

  unrealized_ccy: number;
  unrealized_base: number;

  base_currency: string;
};

type ConsolidatedRow = {
  // representative instrument fields
  instrument_id: number;
  symbol: string | null;
  name: string | null;
  asset_class: string | null;
  asset_subclass: string | null;
  instrument_currency: string | null;

  // consolidated financials
  qty: number;
  avg_cost_ccy: number;   // weighted
  avg_cost_base: number;  // weighted
  last_ccy: number;
  last_base: number;
  market_value_ccy: number;
  market_value_base: number;
  unrealized_ccy: number;
  unrealized_base: number;
  gain_pct: number;

  base_currency: string;

  // for display: which accounts contributed
  accounts: Array<{ name: string | number; qty: number; cost_base: number; mv_base: number; unrl_base: number }>;
};

// ---------- formatters ----------
const fmtNumber = (n: number, dp = 2) =>
  new Intl.NumberFormat(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(n);

const fmtParens = (n: number, dp = 2) =>
  n < 0 ? `(${fmtNumber(Math.abs(n), dp)})` : fmtNumber(n, dp);

export default function PortfolioPage() {
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Position[]>([]);

  // filters
  const [fltAccount, setFltAccount] = useState<string | "">("");
  const [fltAssetClass, setFltAssetClass] = useState<string | "">("");
  const [fltCcy, setFltCcy] = useState<string | "">("");
  const [fltText, setFltText] = useState("");

  // column selector
  const [colMenuAnchor, setColMenuAnchor] = useState<null | HTMLElement>(null);
  const [cols, setCols] = useState({
    account: true, // will show consolidated account summary
    instrument: true,
    assetClass: true,
    subClass: true,
    ccy: true,
    qty: true,
    avgCcy: true,
    avgBase: true,
    costCcy: true,
    costBase: true,
    lastCcy: true,
    lastBase: true,
    mvCcy: true,
    mvBase: true,
    unrlCcy: true,
    unrlBase: true,
    gainPct: true,
  });

  const baseCcy = rows[0]?.base_currency || "BASE";

  // unified chip styling for P/L values
  const plChipSx = (v: number) => {
    if (v > 0) {
      return {
        bgcolor: alpha(theme.palette.success.main, 0.12),
        color: theme.palette.success.dark,
        borderColor: alpha(theme.palette.success.main, 0.28),
        fontWeight: 600,
      };
    }
    if (v < 0) {
      return {
        bgcolor: alpha(theme.palette.error.main, 0.12),
        color: theme.palette.error.dark,
        borderColor: alpha(theme.palette.error.main, 0.28),
        fontWeight: 600,
      };
    }
    return {
      bgcolor: alpha(theme.palette.grey[600], 0.12),
      color: theme.palette.text.secondary,
      borderColor: alpha(theme.palette.grey[600], 0.28),
      fontWeight: 600,
    };
  };

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API}/portfolio/closing`);
      if (!r.ok) throw new Error(`GET /portfolio/closing → ${r.status}`);
      const data: Position[] = await r.json();
      setRows(data);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function refreshPrices() {
    setRefreshing(true);
    setErr(null);
    try {
      const r = await fetch(`${API}/instruments/refresh_all_prices`, { method: "POST" });
      if (!r.ok) throw new Error(`POST /instruments/refresh_all_prices → ${r.status}`);
      await load();
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  // derived lists for filters (from raw rows so you can still filter before consolidation)
  const accounts = useMemo(
    () => Array.from(new Set(rows.map(r => String(r.account_name)))),
    [rows]
  );
  const assetClasses = useMemo(
    () => Array.from(new Set(rows.map(r => r.asset_class || "").filter(Boolean))),
    [rows]
  );
  const ccys = useMemo(
    () => Array.from(new Set(rows.map(r => r.instrument_currency || "").filter(Boolean))),
    [rows]
  );

  // apply filters first (so "Account" filter narrows the consolidation)
  const filtered = useMemo(() => {
    const q = fltText.trim().toLowerCase();
    return rows.filter(r => {
      if (fltAccount && String(r.account_name) !== fltAccount) return false;
      if (fltAssetClass && (r.asset_class || "") !== fltAssetClass) return false;
      if (fltCcy && (r.instrument_currency || "") !== fltCcy) return false;
      if (q) {
        const inst = (r.symbol || "") + " " + (r.name || "");
        if (!inst.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, fltAccount, fltAssetClass, fltCcy, fltText]);

  // CONSOLIDATE by instrument_id (summing across accounts/brokers)
  const consolidated: ConsolidatedRow[] = useMemo(() => {
    const byId = new Map<number, ConsolidatedRow & { _cost_ccy_sum: number; _cost_base_sum: number }>();

    for (const r of filtered) {
      const id = r.instrument_id;
      let acc = byId.get(id);
      const cost_ccy = r.qty * r.avg_cost_ccy;
      const cost_base = r.qty * r.avg_cost_base;

      if (!acc) {
        acc = {
          instrument_id: id,
          symbol: r.symbol,
          name: r.name,
          asset_class: r.asset_class,
          asset_subclass: r.asset_subclass,
          instrument_currency: r.instrument_currency,

          qty: 0,
          avg_cost_ccy: 0,
          avg_cost_base: 0,
          last_ccy: r.last_ccy,
          last_base: r.last_base,
          market_value_ccy: 0,
          market_value_base: 0,
          unrealized_ccy: 0,
          unrealized_base: 0,
          gain_pct: 0,

          base_currency: r.base_currency,
          accounts: [],

          _cost_ccy_sum: 0,
          _cost_base_sum: 0,
        };
      }

      acc.qty += r.qty;
      acc._cost_ccy_sum += cost_ccy;
      acc._cost_base_sum += cost_base;
      acc.market_value_ccy += r.market_value_ccy;
      acc.market_value_base += r.market_value_base;
      acc.unrealized_ccy += r.unrealized_ccy;
      acc.unrealized_base += r.unrealized_base;

      acc.accounts.push({
        name: r.account_name,
        qty: r.qty,
        cost_base,
        mv_base: r.market_value_base,
        unrl_base: r.unrealized_base,
      });

      // last prices should be same across accounts; if some zero, prefer non-zero
      if (!acc.last_ccy && r.last_ccy) acc.last_ccy = r.last_ccy;
      if (!acc.last_base && r.last_base) acc.last_base = r.last_base;

      byId.set(id, acc);
    }

    // finalize weighted averages and gain %
    const out: ConsolidatedRow[] = [];
    for (const v of byId.values()) {
      const qty = v.qty || 0;
      v.avg_cost_ccy = qty ? v._cost_ccy_sum / qty : 0;
      v.avg_cost_base = qty ? v._cost_base_sum / qty : 0;

      const gain_base = v.market_value_base - v._cost_base_sum;
      v.gain_pct = v._cost_base_sum ? (gain_base / v._cost_base_sum) * 100 : 0;

      // sort account breakdown by name for neat tooltips
      v.accounts.sort((a, b) => String(a.name).localeCompare(String(b.name)));

      // strip internals
      // @ts-ignore
      delete v._cost_ccy_sum;
      // @ts-ignore
      delete v._cost_base_sum;

      out.push(v);
    }

    // sort by Instrument label
    out.sort((a, b) => {
      const la = (a.symbol || a.name || a.instrument_id).toString().toLowerCase();
      const lb = (b.symbol || b.name || b.instrument_id).toString().toLowerCase();
      return la.localeCompare(lb);
    });

    return out;
  }, [filtered]);

  // totals (for visible consolidated rows)
  const totals = useMemo(() => {
    const init = {
      cost_ccy: 0, cost_base: 0,
      mv_ccy: 0, mv_base: 0,
      unrl_ccy: 0, unrl_base: 0,
    };
    return consolidated.reduce((acc, r) => {
      const cost_ccy = r.qty * r.avg_cost_ccy;
      const cost_base = r.qty * r.avg_cost_base;
      acc.cost_ccy += cost_ccy;
      acc.cost_base += cost_base;
      acc.mv_ccy += r.market_value_ccy;
      acc.mv_base += r.market_value_base;
      acc.unrl_ccy += r.unrealized_ccy;
      acc.unrl_base += r.unrealized_base;
      return acc;
    }, init);
  }, [consolidated]);

  const openColMenu = (e: React.MouseEvent<HTMLButtonElement>) => setColMenuAnchor(e.currentTarget);
  const closeColMenu = () => setColMenuAnchor(null);
  const toggleCol = (k: keyof typeof cols) => setCols(s => ({ ...s, [k]: !s[k] }));

  // helper to show a compact account summary + full tooltip
  const accountSummary = (accs: ConsolidatedRow["accounts"]) => {
    const names = Array.from(new Set(accs.map(a => String(a.name))));
    const label = names.length <= 2 ? names.join(", ") : `${names[0]}, ${names[1]} +${names.length - 2}`;
    const tip = accs
      .map(a => `${a.name}: qty ${fmtNumber(a.qty, 4)}, MV ${fmtParens(a.mv_base, 2)}, Unrl ${fmtParens(a.unrl_base, 2)}`)
      .join("\n");
    return { label, tip };
  };

  return (
    <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
      <Paper elevation={1} sx={{ flex: 1, width: "100%", p: 2, overflow: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h6">Portfolio — Closing Positions</Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              placeholder="Search instrument or symbol…"
              value={fltText}
              onChange={(e) => setFltText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 260 }}
            />
            <TextField
              select size="small" label="Account" value={fltAccount}
              onChange={(e) => setFltAccount(e.target.value as string)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {accounts.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="Asset Class" value={fltAssetClass}
              onChange={(e) => setFltAssetClass(e.target.value as string)}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              {assetClasses.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
            <TextField
              select size="small" label="CCY" value={fltCcy}
              onChange={(e) => setFltCcy(e.target.value as string)}
              sx={{ width: 110 }}
            >
              <MenuItem value="">All</MenuItem>
              {ccys.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>

            <IconButton onClick={openColMenu} title="Choose columns">
              <ViewColumnIcon />
            </IconButton>
            <Menu anchorEl={colMenuAnchor} open={!!colMenuAnchor} onClose={closeColMenu}>
              <Box sx={{ px: 2, py: 1 }}>
                <FormGroup sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2 }}>
                  {Object.entries(cols).map(([k, v]) => (
                    <FormControlLabel
                      key={k}
                      control={<Checkbox size="small" checked={v} onChange={() => toggleCol(k as keyof typeof cols)} />}
                      label={
                        ({
                          account: "Accounts",
                          instrument: "Instrument",
                          assetClass: "Asset Class",
                          subClass: "Sub-Class",
                          ccy: "CCY",
                          qty: "Qty",
                          avgCcy: "Avg Cost (CCY)",
                          avgBase: `Avg Cost (${baseCcy})`,
                          costCcy: "Total Cost (CCY)",
                          costBase: `Total Cost (${baseCcy})`,
                          lastCcy: "Last (CCY)",
                          lastBase: `Last (${baseCcy})`,
                          mvCcy: "MV (CCY)",
                          mvBase: `MV (${baseCcy})`,
                          unrlCcy: "Unrealized (CCY)",
                          unrlBase: `Unrealized (${baseCcy})`,
                          gainPct: "Gain %",
                        } as Record<string,string>)[k]
                      }
                    />
                  ))}
                </FormGroup>
              </Box>
            </Menu>

            <Button size="small" onClick={load} disabled={loading || refreshing}>Reload</Button>
            <Button size="small" variant="outlined" onClick={refreshPrices} disabled={loading || refreshing}>
              {refreshing ? "Refreshing…" : "Refresh Prices"}
            </Button>
          </Stack>
        </Box>

        {/* States */}
        {loading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={20} /> Loading…
          </Box>
        )}

        {!!err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err} — check <code>NEXT_PUBLIC_API</code>, CORS, and that
            {" "} <code>/portfolio/closing</code> and <code>/instruments/refresh_all_prices</code> are registered.
          </Alert>
        )}

        {!loading && !err && consolidated.length === 0 && (
          <Alert severity="info">No positions match your filters.</Alert>
        )}

        {/* Table */}
        {!loading && !err && consolidated.length > 0 && (
          <Box component={Paper} variant="outlined" sx={{ width: "100%", overflow: "auto" }}>
            <TableContainer>
              <Table stickyHeader size="small" sx={{ minWidth: 1250 }}>
                <TableHead>
                  <TableRow>
                    {cols.account && <TableCell>Accounts</TableCell>}
                    {cols.instrument && <TableCell>Instrument</TableCell>}
                    {cols.assetClass && <TableCell>Asset Class</TableCell>}
                    {cols.subClass && <TableCell>Sub-Class</TableCell>}
                    {cols.ccy && <TableCell>CCY</TableCell>}

                    {cols.qty && <TableCell align="right">Qty</TableCell>}

                    {cols.avgCcy && <TableCell align="right">Avg Cost (CCY)</TableCell>}
                    {cols.avgBase && <TableCell align="right">Avg Cost ({baseCcy})</TableCell>}

                    {cols.costCcy && <TableCell align="right">Total Cost (CCY)</TableCell>}
                    {cols.costBase && <TableCell align="right">Total Cost ({baseCcy})</TableCell>}

                    {cols.lastCcy && <TableCell align="right">Last (CCY)</TableCell>}
                    {cols.lastBase && <TableCell align="right">Last ({baseCcy})</TableCell>}

                    {cols.mvCcy && <TableCell align="right">MV (CCY)</TableCell>}
                    {cols.mvBase && <TableCell align="right">MV ({baseCcy})</TableCell>}

                    {cols.unrlCcy && <TableCell align="right">Unrealized (CCY)</TableCell>}
                    {cols.unrlBase && <TableCell align="right">Unrealized ({baseCcy})</TableCell>}

                    {cols.gainPct && <TableCell align="right">Gain %</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {consolidated.map((r) => {
                    const instLabel = r.symbol || r.name || r.instrument_id;
                    const { label, tip } = accountSummary(r.accounts);
                    const total_cost_ccy = r.qty * r.avg_cost_ccy;
                    const total_cost_base = r.qty * r.avg_cost_base;

                    return (
                      <TableRow key={`inst_${r.instrument_id}`} hover>
                        {cols.account && (
                          <TableCell>
                            <Tooltip title={<pre style={{ margin: 0 }}>{tip}</pre>} placement="top" arrow>
                              <span>{label}</span>
                            </Tooltip>
                          </TableCell>
                        )}
                        {cols.instrument && <TableCell>{instLabel}</TableCell>}
                        {cols.assetClass && <TableCell>{r.asset_class || ""}</TableCell>}
                        {cols.subClass && <TableCell>{r.asset_subclass || ""}</TableCell>}
                        {cols.ccy && <TableCell>{r.instrument_currency || ""}</TableCell>}

                        {cols.qty && <TableCell align="right">{fmtNumber(r.qty, 4)}</TableCell>}

                        {cols.avgCcy && <TableCell align="right">{fmtNumber(r.avg_cost_ccy, 4)}</TableCell>}
                        {cols.avgBase && <TableCell align="right">{fmtNumber(r.avg_cost_base, 4)}</TableCell>}

                        {cols.costCcy && <TableCell align="right">{fmtParens(total_cost_ccy, 2)}</TableCell>}
                        {cols.costBase && <TableCell align="right">{fmtParens(total_cost_base, 2)}</TableCell>}

                        {cols.lastCcy && <TableCell align="right">{fmtNumber(r.last_ccy, 4)}</TableCell>}
                        {cols.lastBase && <TableCell align="right">{fmtNumber(r.last_base, 4)}</TableCell>}

                        {cols.mvCcy && <TableCell align="right">{fmtParens(r.market_value_ccy, 2)}</TableCell>}
                        {cols.mvBase && <TableCell align="right">{fmtParens(r.market_value_base, 2)}</TableCell>}

                        {cols.unrlCcy && (
                          <TableCell align="right">
                            <Chip size="small" variant="outlined" label={fmtParens(r.unrealized_ccy, 2)} sx={plChipSx(r.unrealized_ccy)} />
                          </TableCell>
                        )}
                        {cols.unrlBase && (
                          <TableCell align="right">
                            <Chip size="small" variant="outlined" label={fmtParens(r.unrealized_base, 2)} sx={plChipSx(r.unrealized_base)} />
                          </TableCell>
                        )}

                        {cols.gainPct && (
                          <TableCell align="right">
                            <Chip size="small" variant="outlined" label={`${fmtNumber(r.gain_pct, 2)}%`} sx={plChipSx(r.unrealized_base)} />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {/* Totals row */}
                  <TableRow sx={{ bgcolor: "action.hover" }}>
                    <TableCell
                      colSpan={
                        Number(cols.account) +
                        Number(cols.instrument) +
                        Number(cols.assetClass) +
                        Number(cols.subClass) +
                        Number(cols.ccy) || 1
                      }
                    >
                      <b>Totals ({consolidated.length} positions)</b>
                    </TableCell>

                    {cols.qty && <TableCell align="right">—</TableCell>}
                    {cols.avgCcy && <TableCell align="right">—</TableCell>}
                    {cols.avgBase && <TableCell align="right">—</TableCell>}

                    {cols.costCcy && <TableCell align="right"><b>{fmtParens(totals.cost_ccy, 2)}</b></TableCell>}
                    {cols.costBase && <TableCell align="right"><b>{fmtParens(totals.cost_base, 2)}</b></TableCell>}

                    {cols.lastCcy && <TableCell align="right">—</TableCell>}
                    {cols.lastBase && <TableCell align="right">—</TableCell>}

                    {cols.mvCcy && <TableCell align="right"><b>{fmtParens(totals.mv_ccy, 2)}</b></TableCell>}
                    {cols.mvBase && <TableCell align="right"><b>{fmtParens(totals.mv_base, 2)}</b></TableCell>}

                    {cols.unrlCcy && (
                      <TableCell align="right">
                        <Chip size="small" variant="outlined" label={fmtParens(totals.unrl_ccy, 2)} sx={plChipSx(totals.unrl_ccy)} />
                      </TableCell>
                    )}
                    {cols.unrlBase && (
                      <TableCell align="right">
                        <Chip size="small" variant="outlined" label={fmtParens(totals.unrl_base, 2)} sx={plChipSx(totals.unrl_base)} />
                      </TableCell>
                    )}

                    {cols.gainPct && <TableCell align="right">—</TableCell>}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
}