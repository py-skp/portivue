"use client";

import { useEffect, useMemo, useState } from "react";
import { ResponsiveTreeMap } from "@nivo/treemap";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Chip,
} from "@mui/material";

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
  market_value_base: number;
  unrealized_base: number;

  base_currency: string;
};

type Instrument = {
  id: number;
  symbol: string | null;
  name: string;
  sector: string | null;
  currency_code: string;
  asset_class: string | null;
  asset_subclass: string | null;
  country: string | null;
};

export default function StocksHeatmap() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Position[]>([]);
  const [instMap, setInstMap] = useState<Record<number, Instrument>>({});

  const baseCcy = rows[0]?.base_currency || "BASE";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`${API}/portfolio/closing`);
      if (!r.ok) throw new Error(`GET /portfolio/closing → ${r.status}`);
      const data: Position[] = await r.json();

      const stocky = data.filter(
        (p) =>
          (p.asset_class || "").toUpperCase() === "EQUITY" ||
          (p.asset_subclass || "").toUpperCase() === "ETF"
      );

      const ids = Array.from(new Set(stocky.map((p) => p.instrument_id)));
      const fetched: Record<number, Instrument> = {};
      await Promise.all(
        ids.map(async (id) => {
          const rr = await fetch(`${API}/instruments/${id}`);
          if (rr.ok) fetched[id] = await rr.json();
        })
      );

      setInstMap(fetched);
      setRows(stocky);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // --- build treemap data (sector → stock nodes) ---
  const treeData = useMemo(() => {
    const bySector: Record<string, { name: string; children: any[]; total: number }> = {};

    for (const r of rows) {
      const inst = instMap[r.instrument_id];
      const sector = inst?.sector?.trim() || (r.asset_subclass ? r.asset_subclass : "Other");

      const mv = Number(r.market_value_base || 0);
      const cost = Number(r.avg_cost_base * r.qty || 0);
      const pnl = Number(r.unrealized_base || 0);
      const pnlPct = cost > 0 ? pnl / cost : 0;

      if (!bySector[sector]) bySector[sector] = { name: sector, children: [], total: 0 };

      bySector[sector].children.push({
        name: r.symbol || r.name || String(r.instrument_id),
        value: Math.max(0, mv), // size encodes MV
        mv,
        pnl,
        pnlPct,
        sector,
        symbol: r.symbol,
        instrument_id: r.instrument_id,
      });
      bySector[sector].total += mv;
    }

    return {
      name: `Stocks (${baseCcy})`,
      children: Object.values(bySector).sort((a, b) => b.total - a.total),
    };
  }, [rows, instMap, baseCcy]);

  // --- color scale: clamp P&L% to [-30%, +30%] and map red → neutral → green
  type RGB = readonly [number, number, number];

  function colorFromPct(p: number) {
    const clamp = Math.max(-0.3, Math.min(0.3, p || 0));
    const t = (clamp + 0.3) / 0.6; // 0..1

    const red:   RGB = [220, 38, 38];   // #DC2626
    const mid:   RGB = [96, 105, 120];  // slightly blue-grey neutral
    const green: RGB = [16, 185, 129];  // #10B981

    const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
    const mix = (a: RGB, b: RGB, k: number): [number, number, number] => ([
      lerp(a[0], b[0], k),
      lerp(a[1], b[1], k),
      lerp(a[2], b[2], k),
    ]);

    const rgb = t < 0.5 ? mix(red, mid, t / 0.5) : mix(mid, green, (t - 0.5) / 0.5);
    return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  }

  // custom tooltip
  const Tooltip = ({ node }: any) => {
    const d = node.data;
    const pct = typeof d.pnlPct === "number" ? (d.pnlPct * 100).toFixed(2) + "%" : "—";
    return (
      <Paper sx={{ p: 1.25, bgcolor: "#0f172a", color: "#fff", borderRadius: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {d.name}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8 }}>
          {d.sector}
        </Typography>
        <Stack spacing={0.5} sx={{ mt: 0.75, fontSize: 12 }}>
          <div><b>Market Value:</b> {d.mv?.toLocaleString()} {baseCcy}</div>
          <div><b>P&amp;L:</b> {d.pnl?.toLocaleString()} {baseCcy}</div>
          <div><b>P&amp;L%:</b> {pct}</div>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header with explanation + legend */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Stocks Heatmap — <Typography component="span" variant="inherit" sx={{ color: "text.secondary", fontWeight: 600 }}>
              size = Market Value ({baseCcy}), color = P&amp;L% vs cost (green gain, red loss)
            </Typography>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`Base: ${baseCcy}`} size="small" />
          {/* Color scale legend */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">-30%</Typography>
            <Box
              sx={{
                width: 120,
                height: 10,
                borderRadius: 999,
                background: "linear-gradient(90deg, rgb(220,38,38) 0%, rgb(96,105,120) 50%, rgb(16,185,129) 100%)",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.15)",
              }}
            />
            <Typography variant="caption" color="text.secondary">+30%</Typography>
          </Box>
        </Stack>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={20} /> Loading…
        </Box>
      )}

      {!!err && <Alert severity="error">{err}</Alert>}

      {!loading && !err && (!treeData.children || treeData.children.length === 0) && (
        <Alert severity="info">No equity/ETF positions found.</Alert>
      )}

      {!loading && !err && treeData.children && treeData.children.length > 0 && (
        <Paper sx={{ flex: 1, minHeight: 560, p: 1.5 }}>
<ResponsiveTreeMap
  data={treeData}
  identity="name"
  value="value"
  tile="squarify"
  innerPadding={5}
  outerPadding={6}

  // Parent labels: smaller & mute
  enableParentLabel
  parentLabelPadding={10}
  parentLabelSize={12}
  parentLabelTextColor="#FFFFFF" 

  // Leaf labels: conditional by available space
label={(node: any) => {
  const d = node.data;
  const pctStr =
    typeof d.pnlPct === "number" ? `${Math.round(d.pnlPct * 100)}%` : "";

  // ✅ never touch node.label (not typed) — use symbol/name/id
  const rawTicker =
    (typeof d.symbol === "string" && d.symbol) ||
    (typeof d.name === "string" && d.name) ||
    (node.id != null ? String(node.id) : "");

  const ticker = String(rawTicker);
  const w = Number(node.width ?? 0);
  const h = Number(node.height ?? 0);
  const minSide = Math.min(w, h);

  if (minSide < 42) return "";     // too small → no label
  if (minSide < 76) return ticker; // small → ticker only
  return pctStr ? `${ticker} · ${pctStr}` : ticker; // roomy → ticker + %
}}
  labelSkipSize={40}            // don’t even try if either side < 40px
  orientLabel={false}
  labelTextColor="#FFFFFF"      // strong contrast
  nodeOpacity={0.98}

  // vivid borders for readability
  borderWidth={1.25}
  borderColor={{ from: "color", modifiers: [["darker", 1.6]] }}

  // color = P&L% (clamped), with a bit more punch
  colors={(node) => colorFromPct(((node.data as any).pnlPct ?? 0) * 1.0)}

  animate
  motionConfig="gentle"

  // nicer hover
  tooltip={Tooltip as any}
/>
        </Paper>
      )}
    </Box>
  );
}