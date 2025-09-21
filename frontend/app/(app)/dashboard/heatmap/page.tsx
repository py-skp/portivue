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
      // 1) positions
      const r = await fetch(`${API}/portfolio/closing`);
      if (!r.ok) throw new Error(`GET /portfolio/closing → ${r.status}`);
      const data: Position[] = await r.json();

      // keep only stocks/etfs (adjust if you store differently)
      const stocky = data.filter(
        (p) =>
          (p.asset_class || "").toUpperCase() === "EQUITY" ||
          (p.asset_subclass || "").toUpperCase() === "ETF"
      );

      // 2) fetch sectors for all instruments (1-by-1, cache)
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
    // group by sector
    const bySector: Record<
      string,
      { name: string; children: any[]; total: number }
    > = {};

    for (const r of rows) {
      const inst = instMap[r.instrument_id];
      const sector =
        inst?.sector?.trim() ||
        (r.asset_subclass ? r.asset_subclass : "Other");

      const mv = Number(r.market_value_base || 0);
      const cost = Number(r.avg_cost_base * r.qty || 0);
      const pnl = Number(r.unrealized_base || 0);
      const pnlPct = cost > 0 ? pnl / cost : 0;

      if (!bySector[sector]) {
        bySector[sector] = { name: sector, children: [], total: 0 };
      }
      bySector[sector].children.push({
        name: r.symbol || r.name || String(r.instrument_id),
        value: Math.max(0, mv), // treemap size
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

  // --- color scale: clamp P&L% to [-20%, +20%] and map red → grey → green
  function colorFromPct(p: number) {
    const clamp = Math.max(-0.2, Math.min(0.2, p || 0));
    const t = (clamp + 0.2) / 0.4; // 0..1
    // interpolate between red (#d64f4f), grey (#888), green (#3fb950)
    const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
    const c1 = [214, 79, 79];
    const c2 = [136, 136, 136];
    const c3 = [63, 185, 80];
    // two-step blend via grey
    const mid = t < 0.5
      ? c1.map((a, i) => lerp(a, c2[i], t / 0.5))
      : c2.map((a, i) => lerp(a, c3[i], (t - 0.5) / 0.5));
    return `rgb(${mid[0]},${mid[1]},${mid[2]})`;
  }

  // custom tooltip
  const Tooltip = ({ node }: any) => {
    const d = node.data;
    return (
      <Paper sx={{ p: 1 }}>
        <Typography variant="subtitle2">{d.name}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {d.sector}
        </Typography>
        <Stack spacing={0.3} sx={{ mt: 0.5 }}>
          <div><b>MV:</b> {d.mv?.toLocaleString()} {baseCcy}</div>
          <div>
            <b>P&amp;L%:</b>{" "}
            {typeof d.pnlPct === "number" ? (d.pnlPct * 100).toFixed(2) + "%" : "—"}
          </div>
          <div>
            <b>P&amp;L:</b> {d.pnl?.toLocaleString()} {baseCcy}
          </div>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6">Stocks Heatmap (Treemap)</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={`Base: ${baseCcy}`} size="small" />
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
        <Paper sx={{ flex: 1, minHeight: 520, p: 1 }}>
          <ResponsiveTreeMap
            data={treeData}
            identity="name"
            value="value"
            // padding between boxes
            innerPadding={3}
            outerPadding={3}
            labelSkipSize={12}
            label={(n) => n.data.name}
            orientLabel={false}
            nodeOpacity={1}
            parentLabelPadding={8}
            parentLabelSize={14}
            parentLabelTextColor="#666"
            leavesOnly={false}
            // color per leaf from P&L%
            colors={(node) =>
              colorFromPct((node.data as any).pnlPct ?? 0)
            }
            borderColor="#111"
            borderWidth={1}
            animate={true}
            motionConfig="gentle"
            tooltip={Tooltip as any}
            onClick={(node) => {
              // Optional: drill-through
              // e.g. open your existing Activity Drawer for node.data.instrument_id
              // window.dispatchEvent(new CustomEvent("open-activity-for-instrument", { detail: node.data.instrument_id }));
              // or route to /activities?instrument_id=...
            }}
          />
        </Paper>
      )}
    </Box>
  );
}