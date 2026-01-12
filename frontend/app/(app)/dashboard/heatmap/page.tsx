"use client";

import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import { Info, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { ErrorState } from "@/components/feedback/ErrorState";
import { Button } from "@/components/ui/Button";

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

type TreeMapNode = {
  name: string;
  value: number; // Market Value
  pnl: number;
  pnlPct: number;
  cost: number;
  ticker: string;
  sector: string;
  children?: TreeMapNode[];
  allocPct?: number;
  fullName?: string;
};


export default function StocksHeatmap() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<Position[]>([]);
  const [instMap, setInstMap] = useState<Record<number, Instrument>>({});

  const baseCcy = rows[0]?.base_currency || "GBP";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiClient.get<Position[]>("/portfolio/closing");

      const stocky = data.filter(
        (p) =>
          (p.asset_class || "").toUpperCase() === "EQUITY" ||
          (p.asset_subclass || "").toUpperCase() === "ETF"
      );

      // fetch instrument meta (for sector)
      const ids = Array.from(new Set(stocky.map((p) => p.instrument_id)));
      const fetched: Record<number, Instrument> = {};

      // Batch fetch implies we might need a bulk endpoint, but loop is fine for now
      // Optimally: GET /instruments?ids=...
      await Promise.all(
        ids.map(async (id) => {
          try {
            const inst = await apiClient.get<Instrument>(`/instruments/${id}`);
            fetched[id] = inst;
          } catch (e) { /* ignore */ }
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

  // ---------------- transform data for ECharts ----------------
  const option = useMemo(() => {
    if (!rows.length) return null;

    // 1. Group by Instrument
    type Agg = {
      ticker: string;
      name: string;
      sector: string;
      totalMv: number;
      totalCost: number;
      totalPnl: number;
    };

    const byInst: Record<number, Agg> = {};

    for (const r of rows) {
      const inst = instMap[r.instrument_id];
      const sector = inst?.sector?.trim() || (r.asset_subclass ? r.asset_subclass : "Other");
      const ticker = (inst?.symbol || r.symbol || "UNK").toUpperCase();
      const name = (inst?.name || r.name || "").trim();

      if (!byInst[r.instrument_id]) {
        byInst[r.instrument_id] = {
          ticker,
          name,
          sector,
          totalMv: 0,
          totalCost: 0,
          totalPnl: 0,
        };
      }

      const agg = byInst[r.instrument_id]!;
      agg.totalMv += Number(r.market_value_base || 0);
      agg.totalCost += Number((r.avg_cost_base || 0) * (r.qty || 0));
      agg.totalPnl += Number(r.unrealized_base || 0);
    }

    // Calculate Total Portfolio Value for Allocation %
    const totalPortfolioMv = Object.values(byInst).reduce((acc, curr) => acc + curr.totalMv, 0);


    // 2. Group by Sector
    const bySector: Record<string, TreeMapNode[]> = {};

    for (const agg of Object.values(byInst)) {
      if (agg.totalMv <= 1) continue; // skip tiny

      const pnlPct = agg.totalCost > 0 ? (agg.totalPnl / agg.totalCost) * 100 : 0;
      const allocPct = totalPortfolioMv > 0 ? (agg.totalMv / totalPortfolioMv) * 100 : 0;

      if (!bySector[agg.sector]) bySector[agg.sector] = [];
      bySector[agg.sector]!.push({
        name: agg.ticker,
        value: agg.totalMv, // Size
        pnl: agg.totalPnl,
        pnlPct: pnlPct,
        cost: agg.totalCost,
        ticker: agg.ticker,
        sector: agg.sector,
        allocPct: allocPct, // New field for allocation %
        fullName: agg.name, // Pass name explicitly
      });
    }

    // Color helper
    function getColor(p: number) {
      // Clamp -30 to +30
      const clamp = Math.max(-30, Math.min(30, p));
      const t = (clamp + 30) / 60; // 0..1

      // simple lerp helper
      const lerp = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
      const mix = (c1: [number, number, number], c2: [number, number, number], k: number) =>
        `rgb(${lerp(c1[0], c2[0], k)}, ${lerp(c1[1], c2[1], k)}, ${lerp(c1[2], c2[2], k)})`;

      const red: [number, number, number] = [220, 38, 38];   // #dc2626
      const mid: [number, number, number] = [51, 65, 85];    // #334155 (slate-700)
      const green: [number, number, number] = [16, 185, 129]; // #10b981

      if (t < 0.5) return mix(red, mid, t / 0.5);
      return mix(mid, green, (t - 0.5) / 0.5);
    }


    // 3. Build hierarchy
    const data: TreeMapNode[] = Object.entries(bySector).map(([sector, children]) => ({
      name: sector,
      value: children.reduce((acc, c) => acc + c.value, 0),
      pnl: children.reduce((acc, c) => acc + c.pnl, 0),
      pnlPct: 0, // aggregate color not strictly needed, echarts handles parent color
      cost: 0,
      ticker: sector,
      sector: sector,
      children: children.sort((a, b) => b.value - a.value),
    })).sort((a, b) => b.value - a.value);

    // 4. ECharts Option
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(51, 65, 85, 0.5)',
        borderWidth: 1,
        padding: 0,
        textStyle: { color: '#f1f5f9' },
        formatter: (params: any) => {
          const { data } = params;
          if (!data || !data.ticker) return '';

          const isSector = !!data.children;
          const fmtMv = new Intl.NumberFormat('en-GB', { style: 'currency', currency: baseCcy }).format(data.value);
          const fmtPnl = new Intl.NumberFormat('en-GB', { style: 'currency', currency: baseCcy, signDisplay: "always" }).format(data.pnl);
          const pctColor = data.pnlPct >= 0 ? '#10b981' : '#ef4444';
          const pctStr = data.pnlPct.toFixed(2) + '%';
          const allocStr = data.allocPct ? data.allocPct.toFixed(2) + '%' : '';

          return `
            <div class="px-3 py-2 min-w-[180px]">
              <div class="font-bold text-sm mb-1 text-slate-100">${data.name} ${isSector ? '<span class="text-xs font-normal text-slate-400 ml-1">(Sector)</span>' : ''}</div>
              ${!isSector ? `<div class="text-xs text-slate-400 mb-2 truncate max-w-[200px]">${data.fullName || ''}</div>` : ''}
              
              <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div class="text-slate-400">Market Value</div>
                <div class="text-right font-medium text-slate-200">${fmtMv}</div>
                
                ${!isSector ? `
                <div class="text-slate-400">Allocation</div>
                <div class="text-right font-medium text-blue-400">${allocStr}</div>
                ` : ''}

                <div class="text-slate-400">P&L</div>
                <div class="text-right font-medium" style="color:${pctColor}">${fmtPnl}</div>
                
                <div class="text-slate-400">Return</div>
                <div class="text-right font-bold" style="color:${pctColor}">${pctStr}</div>
              </div>
            </div>
          `;
        }
      },
      // Removed visualMap, using explicit colors
      series: [
        {
          type: 'treemap',
          silent: false,
          roam: false, // zoom
          nodeClick: 'zoomToNode',
          breadcrumb: {
            show: false
          },
          label: {
            show: true,
            formatter: function (params: any) {
              const d = params.data;
              if (!d || !d.allocPct) return params.name;
              return `{bold|${params.name}}\n{normal|${d.allocPct.toFixed(2)}%}`;
            },
            rich: {
              bold: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#fff',
                lineHeight: 20
              },
              normal: {
                fontSize: 12,
                color: 'rgba(255,255,255,0.8)'
              }
            }
          },

          itemStyle: {
            borderColor: '#0f172a',
            borderWidth: 2,
            gapWidth: 2
          },
          upperLabel: {
            show: true,
            height: 30,
            color: '#cbd5e1',
            backgroundColor: 'rgba(0,0,0,0.2)',
            formatter: '{b}'
          },
          // Map pnlPct to visual dimension
          data: data.map(sector => ({
            ...sector,
            // ECharts Treemap: value should be the size (number).
            // We pass extra props (pnl, cost, pnlPct) at the node level, which ECharts preserves in 'data'.
            children: sector.children?.map(child => ({
              ...child,
              value: child.value, // Keep as single number for sizing
              itemStyle: {
                color: getColor(child.pnlPct)
              }
            }))
          })),
          levels: [
            {
              itemStyle: {
                borderColor: '#0f172a',
                borderWidth: 0,
                gapWidth: 4
              },
              upperLabel: {
                show: false
              }
            },
            {
              itemStyle: {
                borderColor: '#1e293b',
                borderWidth: 1,
                gapWidth: 1
              },
              emphasis: {
                itemStyle: {
                  borderColor: '#fff'
                }
              }
            }
          ]
        }
      ]
    };
  }, [rows, instMap, baseCcy]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-100 tracking-tight flex items-center gap-3">
            Stocks Heatmap
          </h1>
          <p className="text-slate-400 font-medium mt-1 ml-1">
            Size represents Market Value, color represents P&L %.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">Performance</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-500">-30%</span>
            <div className="w-32 h-3 rounded-full bg-gradient-to-r from-red-600 via-slate-700 to-emerald-500 shadow-inner ring-1 ring-white/10" />
            <span className="text-xs font-bold text-emerald-500">+30%</span>
          </div>
        </div>

        <Button onClick={load} variant="secondary" className="gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>

      <div className="flex-1 bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm rounded-3xl p-1 relative overflow-hidden shadow-2xl">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
              <Loader2 className="animate-spin text-brand-500" size={48} />
              <p className="text-slate-300 font-medium">Loading Portfolio Data...</p>
            </div>
          </div>
        )}

        {err && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <ErrorState title="Failed to load map" error={err} onRetry={load} />
          </div>
        )}

        {!loading && !err && rows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-slate-800/50 border border-slate-700/50 p-8 rounded-3xl flex flex-col items-center text-center max-w-md">
              <div className="h-16 w-16 bg-slate-700/50 rounded-2xl flex items-center justify-center text-slate-500 mb-4">
                <Info size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-200">No Equity Positions</h3>
              <p className="text-slate-400 mt-2">Add some stock or ETF positions to your portfolio to visualize them here.</p>
            </div>
          </div>
        )}

        {option && (
          <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%', minHeight: '600px', borderRadius: '1.5rem' }}
            theme="dark" // built-in dark theme
            opts={{ renderer: 'canvas' }}
          />
        )}
      </div>
    </div>
  );
}