"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";

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
  avg_cost_base: number;
  last_base: number;
  market_value_base: number;
  unrealized_base: number;
  base_currency: string;
};

type AccountBalance = {
  account_id: number;
  account_name: string;
  account_currency: string;
  balance_ccy: number;
  balance_base: number;
  base_currency: string;
};

const COLORS = ["#6366F1","#10B981","#F59E0B","#06B6D4","#EF4444","#8B5CF6","#22C55E","#F97316","#3B82F6","#A855F7","#14B8A6","#84CC16"];
const fmt0 = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ----------------- Reusable Card Shell ----------------- */
type ChartPaperProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  height?: number;
  minWidth?: number | string;   // ← add this
  headerRight?: React.ReactNode;
  bodyPadding?: number;
};

const ChartPaper = ({
  children,
  title,
  subtitle,
  height = 500,
  minWidth = 420,
  headerRight,
  bodyPadding = 3,
}: ChartPaperProps) => (
  <Paper
    elevation={0}
    sx={{
      width: "100%",
      // allow full-bleed/responsive shrink; never clamp
      minWidth,
      height,
      borderRadius: 4,
      display: "flex",
      flexDirection: "column",
      border: "1px solid",
      borderColor: "divider",
      overflow: "hidden",
      transition: "box-shadow .2s ease, border-color .2s ease",
      "&:hover": { borderColor: "primary.main", boxShadow: "0 8px 25px rgba(0,0,0,0.10)" },
      bgcolor: "background.paper",
    }}
  >
    <Box sx={{ px: 3, pt: 3, pb: 2, flexShrink: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary" }}>
            {title}
          </Typography>
          {!!subtitle && (
            <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {headerRight}
      </Stack>
    </Box>
    <Divider />
    <Box sx={{ flex: 1, minHeight: 0, width: "100%", p: bodyPadding }}>
      {children}
    </Box>
  </Paper>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [positions, setPositions] = useState<Position[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);

  const baseCcy =
    positions[0]?.base_currency ||
    balances[0]?.base_currency ||
    "USD";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [pRes, bRes] = await Promise.all([
        fetch(`${API}/portfolio/closing`),
        fetch(`${API}/accounts/balances`),
      ]);
      if (!pRes.ok) throw new Error(`GET /portfolio/closing → ${pRes.status}`);
      if (!bRes.ok) throw new Error(`GET /accounts/balances → ${bRes.status}`);

      const [p, b] = await Promise.all([pRes.json(), bRes.json()]);
      setPositions(p as Position[]);
      setBalances(b as AccountBalance[]);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /* ---------- Core KPIs ---------- */
  const investMV = useMemo(
    () => positions.reduce((s, r) => s + r.market_value_base, 0),
    [positions]
  );
  const investCost = useMemo(
    () => positions.reduce((s, r) => s + r.avg_cost_base * r.qty, 0),
    [positions]
  );
  const unrealized = useMemo(
    () => positions.reduce((s, r) => s + r.unrealized_base, 0),
    [positions]
  );
  const cash = useMemo(
    () => balances.reduce((s, r) => s + r.balance_base, 0),
    [balances]
  );
  const netWorth = investMV + cash;

  /* ---------- Charts Data ---------- */
  // Allocation by class
  const allocByClass = useMemo(() => {
    const by: Record<string, number> = {};
    positions.forEach(p => {
      const k = p.asset_class || "Unclassified";
      by[k] = (by[k] || 0) + p.market_value_base;
    });
    return Object.entries(by)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b)=>b.value-a.value);
  }, [positions]);

  // P&L by class (FIXED: vertical bars – category on Y, value on X)
  const pnlByClass = useMemo(() => {
    const by: Record<string, number> = {};
    positions.forEach(p => {
      const k = p.asset_class || "Unclassified";
      by[k] = (by[k] || 0) + p.unrealized_base;
    });
    return Object.entries(by)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b)=>b.value-a.value);
  }, [positions]);

  // Broker allocation (equities only)
  const allocByBrokerEquities = useMemo(() => {
    const by: Record<string, number> = {};
    positions
      .filter(p => (p.asset_class || "").toUpperCase() === "EQUITY")
      .forEach(p => {
        const k = String(p.account_name ?? p.account_id);
        by[k] = (by[k] || 0) + p.market_value_base;
      });
    return Object.entries(by)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b)=>b.value-a.value);
  }, [positions]);

  // Top holdings contribution (% of MV)
  const topHoldings = useMemo(() => {
    const total = Math.max(investMV, 1);
    return positions
      .map(p => ({
        label: (p.symbol || p.name || `#${p.instrument_id}`) as string,
        mv: p.market_value_base,
        share: (p.market_value_base / total) * 100
      }))
      .sort((a,b)=>b.mv-a.mv)
      .slice(0, 12);
  }, [positions, investMV]);

  // Top movers / losers by % P&L
  const { topGainers, topLosers } = useMemo(() => {
    const rows = positions.map(p => {
      const cost = p.avg_cost_base * p.qty;
      const pct = cost > 0 ? (p.unrealized_base / cost) * 100 : 0;
      const label = (p.symbol || p.name || `#${p.instrument_id}`) as string;
      return { label, pct };
    });
    const withCost = rows.filter(r => Number.isFinite(r.pct));
    const gain = [...withCost].sort((a,b)=>b.pct-a.pct).slice(0, 7);
    const lose = [...withCost].sort((a,b)=>a.pct-b.pct).slice(0, 7);
    return { topGainers: gain, topLosers: lose };
  }, [positions]);

  /* ---------- Small KPI Card ---------- */
  const Card = ({ title, value, color }: { title: string; value: string; color?: string }) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: 110,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderRadius: 4,
        bgcolor: "background.paper",
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
        }
      }}
    >
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Typography>
      <Typography variant="h5" sx={{ color, fontWeight: 700, mt: 0.5 }}>{value}</Typography>
    </Paper>
  );

  const tooltipStyle = {
    fontSize: 13,
    borderRadius: 12,
    border: "none",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    backgroundColor: '#fff',
    color: '#333',
  };

  return (
    <Box
      component="main"
      sx={{
        width: "100%",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        position: "relative",
        isolation: "isolate",

        /* Full-bleed page: remove hard maxWidth */
        mx: "auto",
        maxWidth: "100%",

        /* Single source of truth for gutters */
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 2, md: 3 },

        bgcolor: "background.default",
        color: "text.primary",

        overflowX: "hidden",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Portfolio Analytics
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip 
            size="medium" 
            label={`Base Currency: ${baseCcy}`} 
            sx={{ 
              fontWeight: 600,
              bgcolor: 'primary.50',
              color: 'primary.700',
              border: '1px solid',
              borderColor: 'primary.200'
            }}
          />
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={load} 
              disabled={loading}
              sx={{ 
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { borderColor: 'primary.main' }
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {loading && (
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3, justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} /> 
          <Typography variant="body1" color="text.secondary">Loading portfolio data...</Typography>
        </Stack>
      )}
      {!!err && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{err}</Alert>}

      {!loading && !err && (
        <>
          {/* KPI Cards - exactly 5 per row on lg+ */}
          <Grid container spacing={3} sx={{ mb: 4 }} columns={{ xs: 12, md: 12, lg: 15 }}>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card title="Net Worth" value={`${fmt0(netWorth)} ${baseCcy}`} />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card title="Investments (MV)" value={`${fmt0(investMV)} ${baseCcy}`} />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card title="Investments (Cost)" value={`${fmt0(investCost)} ${baseCcy}`} />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <Card title="Cash Balance" value={`${fmt0(cash)} ${baseCcy}`} />
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              {/* your extra card */}
            </Grid>
              <Card
                title="Unrealized P&L"
                value={`${unrealized >= 0 ? '+' : ''}${fmt0(unrealized)} ${baseCcy}`}
                color={unrealized >= 0 ? "success.main" : "error.main"}
              />
            </Grid>
{/* Row 1 — three equal charts */}
<Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
  {/* Top Holdings FIRST */}
  <Grid size={{ xs: 12, md: 4 }}>
    <ChartPaper title="Top Holdings (% of Total MV)" subtitle="Share of portfolio market value" height={450}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={topHoldings} margin={{ top: 10, right: 16, bottom: 60, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="label" angle={-45} textAnchor="end" height={60} interval={0}
                 tick={{ fontSize: 11, fill: "rgba(0,0,0,0.7)" }} />
          <YAxis tickFormatter={(t) => `${Math.round(Number(t))}%`}
                 tick={{ fontSize: 11, fill: "rgba(0,0,0,0.7)" }} />
          <ReTooltip contentStyle={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 6px 18px rgba(0,0,0,0.08)" }}
                     formatter={(v:any)=>[`${Number(v).toFixed(1)}%`, "Share"]} />
          <Bar dataKey="share" radius={[6,6,0,0]}>
            {topHoldings.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPaper>
  </Grid>

  {/* Asset Allocation */}
  <Grid size={{ xs: 12, md: 4 }}>
    <ChartPaper title={`Asset Allocation (${baseCcy})`} height={450}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={allocByClass}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="45%"
            innerRadius="48%" outerRadius="80%"
            paddingAngle={3}
            label={({ percent }) => {
              const p = typeof percent === "number" ? percent : Number(percent ?? 0);
              return `${Math.round(p * 100)}%`;
            }}
            labelLine={false}
          >
            {allocByClass.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
          </Pie>
          <Legend verticalAlign="bottom" height={36} iconType="circle"
                  wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
          <ReTooltip contentStyle={tooltipStyle} formatter={(v:any)=>[`${fmt0(Number(v))} ${baseCcy}`, 'Value']} />
        </PieChart>
      </ResponsiveContainer>
    </ChartPaper>
  </Grid>

  {/* Broker Allocation */}
  <Grid size={{ xs: 12, md: 4 }}>
    <ChartPaper title="Broker Allocation (Equities)" height={450}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={allocByBrokerEquities}
            dataKey="value"
            nameKey="name"
            cx="50%" cy="45%"
            innerRadius="48%" outerRadius="80%"
            paddingAngle={3}
            label={({ percent }) => {
              const p = typeof percent === "number" ? percent : Number(percent ?? 0);
              return `${Math.round(p * 100)}%`;
            }}
            labelLine={false}
          >
            {allocByBrokerEquities.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
          </Pie>
          <Legend verticalAlign="bottom" height={36} iconType="circle"
                  wrapperStyle={{ fontSize: 12, fontWeight: 500 }} />
          <ReTooltip contentStyle={tooltipStyle} formatter={(v:any)=>[`${fmt0(Number(v))} ${baseCcy}`, 'Value']} />
        </PieChart>
      </ResponsiveContainer>
    </ChartPaper>
  </Grid>
</Grid>

{/* Row 2 — two half-width panels */}
<Grid container spacing={3} sx={{ mb: 4, width: "100%" }}>
  {/* P&L by Asset Class */}
  <Grid size={{ xs: 12, md: 6 }}>
    <ChartPaper title={`P&L by Asset Class (${baseCcy})`} height={420}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={pnlByClass} layout="vertical" margin={{ left: 12, right: 16, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
          <XAxis type="number" tickFormatter={(t)=>fmt0(Number(t))} />
          <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
          <ReTooltip contentStyle={tooltipStyle} formatter={(v:any)=>[`${fmt0(Number(v))} ${baseCcy}`, "P&L"]} />
          <Bar dataKey="value" radius={[0,6,6,0]}>
            {pnlByClass.map((d,i)=><Cell key={i} fill={d.value>=0 ? "#10B981" : "#EF4444"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartPaper>
  </Grid>

  {/* Top Performance Movers */}
  <Grid size={{ xs: 12, md: 6 }}>
    <ChartPaper title="Top Performance Movers" subtitle="Highest % P&L changes in the selected period" height={420}>
      <Grid container spacing={3} sx={{ height: "100%" }}>
        <Grid size={{ xs: 12, sm: 6 }} sx={{ display:"flex", flexDirection:"column", minHeight:0 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
            🔥 Top Gainers
          </Typography>
          <TableContainer sx={{ flex:1, minHeight:0 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Instrument</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>% P&amp;L</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topGainers.map((r)=>(
                  <TableRow key={`g-${r.label}`} hover sx={{ '&:hover': { bgcolor: 'success.50' } }}>
                    <TableCell sx={{ fontWeight: 500 }}>{r.label}</TableCell>
                    <TableCell align="right" sx={{ color: "success.main", fontWeight: 700, fontSize: '0.95rem' }}>
                      +{Math.round(r.pct).toLocaleString()}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }} sx={{ display:"flex", flexDirection:"column", minHeight:0 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'error.main', fontWeight: 600 }}>
            📉 Top Losers
          </Typography>
          <TableContainer sx={{ flex:1, minHeight:0 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Instrument</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>% P&amp;L</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {topLosers.map((r)=>(
                  <TableRow key={`l-${r.label}`} hover sx={{ '&:hover': { bgcolor: 'error.50' } }}>
                    <TableCell sx={{ fontWeight: 500 }}>{r.label}</TableCell>
                    <TableCell align="right" sx={{ color: "error.main", fontWeight: 700, fontSize: '0.95rem' }}>
                      {Math.round(r.pct).toLocaleString()}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </ChartPaper>
  </Grid>
</Grid>
        </>
      )}
    </Box>
  );
}