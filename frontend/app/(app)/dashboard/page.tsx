"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Search,
  AlertCircle,
  Loader2
} from "lucide-react";
import ReactECharts from "echarts-for-react";
import { apiClient } from "@/lib/apiClient";
import { ErrorState } from "@/components/feedback/ErrorState";

type Position = {
  account_id: number;
  account_name: string | number;
  broker_id?: number | null;
  broker_name?: string | null;
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

type HistoryPoint = {
  date: string;
  market_value: number;
  cash_balance: number;
  net_worth: number;
};

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#06B6D4", "#EF4444", "#8B5CF6", "#22C55E", "#F97316", "#3B82F6", "#A855F7", "#14B8A6", "#84CC16"];
const fmt0 = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

type ChartPaperProps = {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  height?: number | string;
  headerRight?: React.ReactNode;
};

const ChartPaper = ({
  children,
  title,
  subtitle,
  height = 450,
  headerRight,
}: ChartPaperProps) => (
  <div
    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/5 group"
    style={{ height: typeof height === 'number' ? `${height}px` : height }}
  >
    <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {headerRight}
    </div>
    <div className="flex-1 min-h-0 relative p-4">
      {children}
    </div>
  </div>
);

const StatCard = ({ title, value, colorClass = "text-slate-900 dark:text-white" }: { title: string; value: string; colorClass?: string }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 transition-all duration-300 hover:border-emerald-500/50 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 group">
    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 block">
      {title}
    </span>
    <span className={`text-2xl font-black ${colorClass} group-hover:scale-105 transition-transform block`}>
      {value}
    </span>
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<any>(null);

  const [positions, setPositions] = useState<Position[]>([]);
  const [balances, setBalances] = useState<AccountBalance[]>([]);

  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState("1M");
  const [historyLoading, setHistoryLoading] = useState(false);


  const baseCcy =
    positions[0]?.base_currency ||
    balances[0]?.base_currency ||
    "USD";

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const [p, b] = await Promise.all([
        apiClient.get<Position[]>("/portfolio/closing"),
        apiClient.get<AccountBalance[]>("/accounts/balances"),
      ]);
      setPositions(p);
      setBalances(b);
    } catch (e: any) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const data = await apiClient.get<HistoryPoint[]>(`/charts/portfolio_history?period=${historyPeriod}&base=${baseCcy}`);
      setHistoryPoints(data);
    } catch (e) {
      console.error("Failed to load history", e);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (baseCcy) loadHistory();
  }, [historyPeriod, baseCcy]);


  const aggregatedPositions = useMemo(() => {
    const byInstrument: Record<number, {
      instrument_id: number;
      symbol: string | null;
      name: string | null;
      asset_class: string | null;
      totalMv: number;
      totalCost: number;
      totalPnl: number;
    }> = {};

    for (const p of positions) {
      const mv = p.market_value_base;
      const cost = p.avg_cost_base * p.qty;
      const pnl = p.unrealized_base;

      if (!byInstrument[p.instrument_id]) {
        byInstrument[p.instrument_id] = {
          instrument_id: p.instrument_id,
          symbol: p.symbol,
          name: p.name,
          asset_class: p.asset_class,
          totalMv: 0,
          totalCost: 0,
          totalPnl: 0,
        };
      }

      const agg = byInstrument[p.instrument_id]!;
      agg.totalMv += mv;
      agg.totalCost += cost;
      agg.totalPnl += pnl;
    }

    return Object.values(byInstrument);
  }, [positions]);

  const investMV = useMemo(() => positions.reduce((s, r) => s + r.market_value_base, 0), [positions]);
  const investCost = useMemo(() => positions.reduce((s, r) => s + r.avg_cost_base * r.qty, 0), [positions]);
  const unrealized = useMemo(() => positions.reduce((s, r) => s + r.unrealized_base, 0), [positions]);
  const cash = useMemo(() => balances.reduce((s, r) => s + r.balance_base, 0), [balances]);
  const netWorth = investMV + cash;

  // History Chart Option
  const historyOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b' },
        formatter: (params: any) => {
          const idx = params[0].dataIndex;
          const p = historyPoints[idx];
          if (!p) return "";

          const val = (n: number | undefined) => (n === undefined || Number.isNaN(n)) ? 0 : n;

          return `
            <div class="font-bold mb-1">${p.date}</div>
            <div class="flex justify-between gap-4 text-xs">
              <span class="text-slate-500">Net Worth:</span>
              <span class="font-bold text-emerald-600">${fmt0(val(p.net_worth))} ${baseCcy}</span>
            </div>
            <div class="flex justify-between gap-4 text-xs mt-1">
              <span class="text-slate-400">Investments:</span>
              <span>${fmt0(val(p.market_value))}</span>
            </div>
            <div class="flex justify-between gap-4 text-xs">
              <span class="text-slate-400">Cash:</span>
              <span>${fmt0(val(p.cash_balance))}</span>
            </div>
          `;
        }
      },
      grid: { left: '2%', right: '2%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: historyPoints.map(p => p.date),
        axisLabel: { color: '#94a3b8' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#e2e8f0', opacity: 0.1 } }, // subtle grid
        axisLabel: { color: '#94a3b8', formatter: (val: number) => fmt0(val) }
      },
      series: [{
        name: 'Net Worth',
        data: historyPoints.map(p => (p.net_worth === undefined || Number.isNaN(p.net_worth)) ? 0 : p.net_worth),
        type: 'line',
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 3, color: '#10B981' }, // Emerald-500
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.0)' }
            ]
          }
        }
      }]
    };
  }, [historyPoints, baseCcy]);


  // Chart Options
  const topHoldingsOption = useMemo(() => {
    const total = Math.max(investMV, 1);
    const data = aggregatedPositions
      .map(p => ({
        name: (p.symbol || p.name || `#${p.instrument_id}`) as string,
        value: (p.totalMv / total) * 100
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}: <b>${p.value.toFixed(1)}%</b>`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { rotate: 45, interval: 0, fontSize: 10 }
      },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [{
        data: data.map((d, i) => ({
          value: d.value,
          itemStyle: { color: COLORS[i % COLORS.length] }
        })),
        type: 'bar',
        barWidth: '60%',
        itemStyle: { borderRadius: [4, 4, 0, 0] }
      }]
    };
  }, [aggregatedPositions, investMV]);

  const assetAllocationOption = useMemo(() => {
    const by: Record<string, number> = {};
    positions.forEach(p => {
      const k = p.asset_class || "Unclassified";
      by[k] = (by[k] || 0) + p.market_value_base;
    });
    const data = Object.entries(by).map(([name, value]) => ({ name, value }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}: <b>${fmt0(params.value)} ${baseCcy}</b> (${params.percent}%)`
      },
      legend: { bottom: '0%', left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: COLORS[i % COLORS.length] } }))
      }]
    };
  }, [positions, baseCcy]);

  const brokerAllocationOption = useMemo(() => {
    const by: Record<string, number> = {};
    positions
      .filter(p => (p.asset_class || "").toUpperCase() === "EQUITY")
      .forEach(p => {
        const k = p.broker_name || "Other";
        by[k] = (by[k] || 0) + p.market_value_base;
      });

    const data = Object.entries(by).map(([name, value]) => ({ name, value }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => `${params.name}: <b>${fmt0(params.value)} ${baseCcy}</b> (${params.percent}%)`
      },
      legend: { bottom: '0%', left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10 } },
      series: [{
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        labelLine: { show: false },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: COLORS[i % COLORS.length] } }))
      }]
    };
  }, [positions, baseCcy]);

  const pnlByClassOption = useMemo(() => {
    const by: Record<string, number> = {};
    positions.forEach(p => {
      const k = p.asset_class || "Unclassified";
      by[k] = (by[k] || 0) + p.unrealized_base;
    });
    const data = Object.entries(by).sort((a, b) => b[1] - a[1]);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => `${params[0].name}: <b>${fmt0(params[0].value)} ${baseCcy}</b>`
      },
      grid: { left: '3%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: { type: 'value', axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category', data: data.map(d => d[0]), axisLabel: { fontSize: 10 } },
      series: [{
        type: 'bar',
        data: data.map(d => ({
          value: d[1],
          itemStyle: { color: d[1] >= 0 ? "#10B981" : "#EF4444", borderRadius: [0, 4, 4, 0] }
        })),
        barMaxWidth: 30
      }]
    };
  }, [positions, baseCcy]);

  const { topGainers, topLosers } = useMemo(() => {
    const rows = aggregatedPositions.map(p => {
      const pct = p.totalCost > 0 ? (p.totalPnl / p.totalCost) * 100 : 0;
      const label = (p.symbol || p.name || `#${p.instrument_id}`) as string;
      return { label, pct };
    });
    const withCost = rows.filter(r => Number.isFinite(r.pct));
    return {
      topGainers: withCost.filter(r => r.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, 5),
      topLosers: withCost.filter(r => r.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, 5)
    };
  }, [aggregatedPositions]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Portfolio <span className="text-emerald-500">Analytics</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Insightful performance metrics and asset distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 font-bold text-sm shadow-sm shadow-emerald-500/5">
            Base: {baseCcy}
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
          <Loader2 size={48} className="text-emerald-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Acquiring terminal market data...</p>
        </div>
      )}

      {err && (
        <div className="py-12">
          <ErrorState
            error={err}
            onRetry={load}
            title="Dashboard Analytics Error"
          />
        </div>
      )}

      {!loading && !err && (
        <div className="space-y-8">
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <StatCard title="Net Worth" value={`${fmt0(netWorth)} ${baseCcy}`} />
            <StatCard title="Investments (MV)" value={`${fmt0(investMV)} ${baseCcy}`} />
            <StatCard title="Investments (Cost)" value={`${fmt0(investCost)} ${baseCcy}`} />
            <StatCard title="Cash Balance" value={`${fmt0(cash)} ${baseCcy}`} />
            <StatCard
              title="Unrealized P&L"
              value={`${unrealized >= 0 ? "+" : ""}${fmt0(unrealized)} ${baseCcy}`}
              colorClass={unrealized >= 0 ? "text-emerald-500" : "text-red-500"}
            />
          </div>

          {/* Portfolio Growth Chart */}
          <ChartPaper
            title="Portfolio Growth"
            subtitle={`Historic Net Worth (${baseCcy})`}
            height={400}
            headerRight={
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                {["1M", "3M", "6M", "YTD", "1Y", "ALL"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setHistoryPeriod(p)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${historyPeriod === p
                      ? "bg-white dark:bg-slate-700 text-emerald-500 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            }
          >
            {historyLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500 opacity-50" size={32} />
              </div>
            ) : (
              <ReactECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
            )}
          </ChartPaper>


          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChartPaper title="Top Holdings" subtitle="% of Total Market Value">
              <ReactECharts option={topHoldingsOption} style={{ height: '100%', width: '100%' }} />
            </ChartPaper>

            <ChartPaper title="Asset Allocation" subtitle={`Distribution by ${baseCcy}`}>
              <ReactECharts option={assetAllocationOption} style={{ height: '100%', width: '100%' }} />
            </ChartPaper>

            <ChartPaper title="Broker Allocation" subtitle="Equities only">
              <ReactECharts option={brokerAllocationOption} style={{ height: '100%', width: '100%' }} />
            </ChartPaper>
          </div>

          {/* Secondary Charts & Table Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartPaper title="P&L by Asset Class" subtitle={`Performance in ${baseCcy}`} height={420}>
              <ReactECharts option={pnlByClassOption} style={{ height: '100%', width: '100%' }} />
            </ChartPaper>

            <ChartPaper title="Top Performance Movers" subtitle="Highest % change in period" height={420}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full p-2">
                <div className="space-y-4 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 text-emerald-500 font-bold px-2">
                    <TrendingUp size={18} />
                    <span>Top Gainers</span>
                  </div>
                  <div className="flex-1 overflow-auto border dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 font-bold text-slate-500">Asset</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-500">% P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {topGainers.map((r) => (
                          <tr key={r.label} className="hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-colors group">
                            <td className="py-3 px-4 font-medium dark:text-slate-300">{r.label}</td>
                            <td className="py-3 px-4 text-right text-emerald-500 font-black group-hover:scale-105 transition-transform">+{Math.round(r.pct)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4 overflow-hidden flex flex-col">
                  <div className="flex items-center gap-2 text-red-500 font-bold px-2">
                    <TrendingDown size={18} />
                    <span>Top Losers</span>
                  </div>
                  <div className="flex-1 overflow-auto border dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                        <tr>
                          <th className="text-left py-3 px-4 font-bold text-slate-500">Asset</th>
                          <th className="text-right py-3 px-4 font-bold text-slate-500">% P&L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-800">
                        {topLosers.map((r) => (
                          <tr key={r.label} className="hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-colors group">
                            <td className="py-3 px-4 font-medium dark:text-slate-300">{r.label}</td>
                            <td className="py-3 px-4 text-right text-red-500 font-black group-hover:scale-105 transition-transform">{Math.round(r.pct)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </ChartPaper>
          </div>
        </div>
      )}
    </div>
  );
}