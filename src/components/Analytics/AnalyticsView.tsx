import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle,
  Compass,
  Filter,
  Flame,
  Layers,
  Percent,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  GATES_CONFIG,
  GateKey,
  INSTRUMENTS,
  Instrument,
  SCENARIOS,
  TradeRecord,
} from '../../types/trade';

interface AnalyticsViewProps {
  trades: TradeRecord[];
  onSelectTrade?: (trade: TradeRecord) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ trades }) => {
  const [instrumentFilter, setInstrumentFilter] = useState<'ALL' | Instrument>('ALL');

  // Filter only closed trades with outcome
  const closedTrades = useMemo(() => {
    return trades.filter((t) => {
      if (t.status !== 'CLOSED') return false;
      if (instrumentFilter !== 'ALL' && t.instrument !== instrumentFilter) return false;
      return true;
    });
  }, [trades, instrumentFilter]);

  // Executive KPI summary calculations
  const stats = useMemo(() => {
    const total = closedTrades.length;
    if (total === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        bes: 0,
        winRate: 0,
        netPnl: 0,
        totalR: 0,
        avgR: 0,
        profitFactor: 0,
        avgWinPnl: 0,
        avgLossPnl: 0,
        grossWin: 0,
        grossLoss: 0,
      };
    }

    let wins = 0;
    let losses = 0;
    let bes = 0;
    let netPnl = 0;
    let totalR = 0;
    let grossWin = 0;
    let grossLoss = 0;

    closedTrades.forEach((t) => {
      const pnl = t.netPnl ?? 0;
      const r = t.realizedR ?? 0;
      netPnl += pnl;
      totalR += r;

      if (t.outcome === 'WIN') {
        wins++;
        grossWin += pnl;
      } else if (t.outcome === 'LOSS') {
        losses++;
        grossLoss += Math.abs(pnl);
      } else {
        bes++;
      }
    });

    const winRate = Number(((wins / total) * 100).toFixed(1));
    const avgR = Number((totalR / total).toFixed(2));
    const profitFactor =
      grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 99.0 : 0;
    const avgWinPnl = wins > 0 ? Number((grossWin / wins).toFixed(2)) : 0;
    const avgLossPnl = losses > 0 ? Number((grossLoss / losses).toFixed(2)) : 0;

    return {
      total,
      wins,
      losses,
      bes,
      winRate,
      netPnl: Number(netPnl.toFixed(2)),
      totalR: Number(totalR.toFixed(2)),
      avgR,
      profitFactor,
      avgWinPnl,
      avgLossPnl,
      grossWin,
      grossLoss,
    };
  }, [closedTrades]);

  // 1. Gate Edge Attribution Analysis: Does passing Gate N improve Win Rate and R?
  const gateAttribution = useMemo(() => {
    return GATES_CONFIG.map((gate) => {
      const key = gate.id;

      // Group trades where gate passed
      const passedTrades = closedTrades.filter((t) => t.gates[key]);
      const passedTotal = passedTrades.length;
      const passedWins = passedTrades.filter((t) => t.outcome === 'WIN').length;
      const passedWinRate =
        passedTotal > 0 ? Number(((passedWins / passedTotal) * 100).toFixed(1)) : 0;
      const passedTotalR = passedTrades.reduce((acc, t) => acc + (t.realizedR ?? 0), 0);
      const passedAvgR = passedTotal > 0 ? Number((passedTotalR / passedTotal).toFixed(2)) : 0;
      const passedNetPnl = passedTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);

      // Group trades where gate failed
      const failedTrades = closedTrades.filter((t) => !t.gates[key]);
      const failedTotal = failedTrades.length;
      const failedWins = failedTrades.filter((t) => t.outcome === 'WIN').length;
      const failedWinRate =
        failedTotal > 0 ? Number(((failedWins / failedTotal) * 100).toFixed(1)) : 0;
      const failedTotalR = failedTrades.reduce((acc, t) => acc + (t.realizedR ?? 0), 0);
      const failedAvgR = failedTotal > 0 ? Number((failedTotalR / failedTotal).toFixed(2)) : 0;
      const failedNetPnl = failedTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);

      // Win rate delta & R delta (Passed vs Failed)
      const winRateDelta = Number((passedWinRate - failedWinRate).toFixed(1));
      const rDelta = Number((passedAvgR - failedAvgR).toFixed(2));

      return {
        gate,
        passedTotal,
        passedWinRate,
        passedAvgR,
        passedNetPnl: Number(passedNetPnl.toFixed(2)),
        failedTotal,
        failedWinRate,
        failedAvgR,
        failedNetPnl: Number(failedNetPnl.toFixed(2)),
        winRateDelta,
        rDelta,
      };
    });
  }, [closedTrades]);

  // 2. Scenario Performance Matrix (A through G)
  const scenarioMatrix = useMemo(() => {
    return SCENARIOS.map((s) => {
      const scenarioTrades = closedTrades.filter((t) => t.scenario === s.id);
      const count = scenarioTrades.length;
      if (count === 0) {
        return {
          scenario: s,
          count: 0,
          winRate: 0,
          avgR: 0,
          netPnl: 0,
          bestTradeR: 0,
          worstTradeR: 0,
        };
      }

      const wins = scenarioTrades.filter((t) => t.outcome === 'WIN').length;
      const winRate = Number(((wins / count) * 100).toFixed(1));
      const totalR = scenarioTrades.reduce((acc, t) => acc + (t.realizedR ?? 0), 0);
      const avgR = Number((totalR / count).toFixed(2));
      const netPnl = scenarioTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);

      const rList = scenarioTrades.map((t) => t.realizedR ?? 0);
      const bestTradeR = Math.max(...rList);
      const worstTradeR = Math.min(...rList);

      return {
        scenario: s,
        count,
        winRate,
        avgR,
        netPnl: Number(netPnl.toFixed(2)),
        bestTradeR,
        worstTradeR,
      };
    }).filter((item) => item.count > 0 || item.scenario.id === 'SETUP_1_VELOCITY' || item.scenario.id === 'SETUP_2_DEEP_RETEST');
  }, [closedTrades]);

  // 3. Grade Performance Matrix (A vs B vs C)
  const gradeMatrix = useMemo(() => {
    const grades: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    return grades.map((g) => {
      const gradeTrades = closedTrades.filter((t) => t.grade === g);
      const count = gradeTrades.length;
      if (count === 0) {
        return { grade: g, count: 0, winRate: 0, avgR: 0, netPnl: 0 };
      }
      const wins = gradeTrades.filter((t) => t.outcome === 'WIN').length;
      const winRate = Number(((wins / count) * 100).toFixed(1));
      const totalR = gradeTrades.reduce((acc, t) => acc + (t.realizedR ?? 0), 0);
      const avgR = Number((totalR / count).toFixed(2));
      const netPnl = gradeTrades.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);

      return {
        grade: g,
        count,
        winRate,
        avgR,
        netPnl: Number(netPnl.toFixed(2)),
      };
    });
  }, [closedTrades]);

  // 4. Cross-Market Agreement Impact (MNQ vs MES)
  const agreementImpact = useMemo(() => {
    const agreedTrades = closedTrades.filter((t) => !t.chartsDisagree);
    const disagreedTrades = closedTrades.filter((t) => t.chartsDisagree);

    const calcGroup = (list: TradeRecord[]) => {
      const count = list.length;
      if (count === 0) return { count: 0, winRate: 0, avgR: 0, netPnl: 0 };
      const wins = list.filter((t) => t.outcome === 'WIN').length;
      const winRate = Number(((wins / count) * 100).toFixed(1));
      const totalR = list.reduce((acc, t) => acc + (t.realizedR ?? 0), 0);
      const avgR = Number((totalR / count).toFixed(2));
      const netPnl = list.reduce((acc, t) => acc + (t.netPnl ?? 0), 0);
      return { count, winRate, avgR, netPnl: Number(netPnl.toFixed(2)) };
    };

    return {
      agreed: calcGroup(agreedTrades),
      disagreed: calcGroup(disagreedTrades),
    };
  }, [closedTrades]);

  // 5. R-Multiple Distribution Histogram
  const rDistribution = useMemo(() => {
    const bins = [
      { label: '< -1R', count: 0, color: 'bg-rose-700' },
      { label: '-1R to -0.5R', count: 0, color: 'bg-rose-500' },
      { label: '-0.5R to 0R', count: 0, color: 'bg-rose-400' },
      { label: '0R (BE)', count: 0, color: 'bg-slate-500' },
      { label: '0R to +1R', count: 0, color: 'bg-emerald-400' },
      { label: '+1R to +2R', count: 0, color: 'bg-emerald-500' },
      { label: '+2R to +3R', count: 0, color: 'bg-emerald-600' },
      { label: '> +3R', count: 0, color: 'bg-emerald-700' },
    ];

    closedTrades.forEach((t) => {
      const r = t.realizedR ?? 0;
      if (r < -1.0) bins[0].count++;
      else if (r >= -1.0 && r < -0.5) bins[1].count++;
      else if (r >= -0.5 && r < -0.05) bins[2].count++;
      else if (r >= -0.05 && r <= 0.05) bins[3].count++;
      else if (r > 0.05 && r <= 1.0) bins[4].count++;
      else if (r > 1.0 && r <= 2.0) bins[5].count++;
      else if (r > 2.0 && r <= 3.0) bins[6].count++;
      else if (r > 3.0) bins[7].count++;
    });

    const maxCount = Math.max(1, ...bins.map((b) => b.count));
    return { bins, maxCount };
  }, [closedTrades]);

  // 6. Discipline Tags Impact
  const disciplineImpact = useMemo(() => {
    const tagMap = new Map<string, { count: number; totalPnl: number; totalR: number; wins: number }>();

    closedTrades.forEach((t) => {
      (t.disciplineTags || []).forEach((tag) => {
        const cur = tagMap.get(tag) || { count: 0, totalPnl: 0, totalR: 0, wins: 0 };
        cur.count++;
        cur.totalPnl += t.netPnl ?? 0;
        cur.totalR += t.realizedR ?? 0;
        if (t.outcome === 'WIN') cur.wins++;
        tagMap.set(tag, cur);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        winRate: Number(((data.wins / data.count) * 100).toFixed(1)),
        avgR: Number((data.totalR / data.count).toFixed(2)),
        totalPnl: Number(data.totalPnl.toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count);
  }, [closedTrades]);

  if (closedTrades.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
          <BarChart3 className="w-7 h-7 text-sky-400" />
        </div>
        <h3 className="text-base font-bold text-slate-200">No Closed Trades Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Log trades and complete Step B exits to unlock rule attribution analytics, gate win-rate
          comparisons, and scenario matrix analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e1424] p-3.5 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Empirical Rule Attribution & Edge Discovery
          </h2>
          <p className="text-[11px] text-slate-400">
            Revealing which execution rules reliably separate winners from losers
          </p>
        </div>

        {/* Instrument Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setInstrumentFilter('ALL')}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              instrumentFilter === 'ALL'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Micro ({trades.filter((t) => t.status === 'CLOSED').length})
          </button>
          <button
            type="button"
            onClick={() => setInstrumentFilter('MNQ')}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              instrumentFilter === 'MNQ'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MNQ ($2/pt)
          </button>
          <button
            type="button"
            onClick={() => setInstrumentFilter('MES')}
            className={`px-3 py-1 rounded font-semibold transition-colors ${
              instrumentFilter === 'MES'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            MES ($5/pt)
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Win Rate */}
        <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Win Rate
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-mono font-black ${
                stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {stats.winRate}%
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">
            {stats.wins}W / {stats.losses}L / {stats.bes}BE
          </span>
        </div>

        {/* Net P&L */}
        <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Net P&L ($)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-mono font-black ${
                stats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.netPnl >= 0 ? `+$${stats.netPnl}` : `-$${Math.abs(stats.netPnl)}`}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">
            Across {stats.total} trades
          </span>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Profit Factor
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-mono font-black ${
                stats.profitFactor >= 1.5
                  ? 'text-emerald-400'
                  : stats.profitFactor >= 1.0
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {stats.profitFactor}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">
            Gross: ${stats.grossWin} / ${stats.grossLoss}
          </span>
        </div>

        {/* Total R Realized */}
        <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Total R Realized
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-mono font-black ${
                stats.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.totalR >= 0 ? `+${stats.totalR}` : stats.totalR} R
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">Cumulative risk-unit</span>
        </div>

        {/* Expectancy (Avg R) */}
        <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Expectancy
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`text-xl font-mono font-black ${
                stats.avgR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.avgR >= 0 ? `+${stats.avgR}` : stats.avgR} R
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">Average per trade</span>
        </div>

        {/* Win / Loss Ratio */}
        <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">
            Avg Win / Avg Loss
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-mono font-black text-slate-200">
              {stats.avgLossPnl > 0 ? (stats.avgWinPnl / stats.avgLossPnl).toFixed(2) : '—'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">
            +${stats.avgWinPnl} / -${stats.avgLossPnl}
          </span>
        </div>
      </div>

      {/* CORE SECTION: 6-GATE ATTRIBUTION (THE RULES TEST) */}
      <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              The 6 Execution Gates: Pass vs. Fail Edge Comparison
            </h3>
            <p className="text-[11px] text-slate-400">
              Measuring the empirical performance difference when each rule was respected versus broken:
            </p>
          </div>
        </div>

        {/* Gate Comparison Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/90">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-sans text-[11px]">
                <th className="py-2.5 px-3">Gate Rule</th>
                <th className="py-2.5 px-3 text-center">When Passed (WR / Avg R)</th>
                <th className="py-2.5 px-3 text-center">When Failed (WR / Avg R)</th>
                <th className="py-2.5 px-3 text-center">Win Rate Edge (Δ)</th>
                <th className="py-2.5 px-3 text-center">Avg R Edge (Δ)</th>
                <th className="py-2.5 px-3 text-right">Net P&L (Pass / Fail)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {gateAttribution.map((item) => {
                const isSignificantEdge = item.winRateDelta >= 20 || item.rDelta >= 0.8;
                return (
                  <tr key={item.gate.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-sans font-semibold text-slate-200">
                        Gate {item.gate.number}: {item.gate.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans truncate max-w-xs">
                        {item.gate.shortDesc}
                      </div>
                    </td>

                    {/* When Passed */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-emerald-400">
                        {item.passedTotal > 0 ? `${item.passedWinRate}%` : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.passedTotal} trades · {item.passedAvgR > 0 ? `+${item.passedAvgR}` : item.passedAvgR}R
                      </div>
                    </td>

                    {/* When Failed */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-rose-400">
                        {item.failedTotal > 0 ? `${item.failedWinRate}%` : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.failedTotal} trades · {item.failedAvgR > 0 ? `+${item.failedAvgR}` : item.failedAvgR}R
                      </div>
                    </td>

                    {/* Win Rate Delta */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold ${
                          item.winRateDelta > 0
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            : item.winRateDelta < 0
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {item.winRateDelta > 0 ? `+${item.winRateDelta}%` : `${item.winRateDelta}%`}
                      </span>
                    </td>

                    {/* R Delta */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-bold ${
                          item.rDelta > 0
                            ? 'text-emerald-400'
                            : item.rDelta < 0
                            ? 'text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.rDelta > 0 ? `+${item.rDelta}` : item.rDelta} R
                      </span>
                    </td>

                    {/* Net P&L Pass vs Fail */}
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-emerald-400">
                        +${item.passedNetPnl}
                      </div>
                      <div className="text-[10px] text-rose-400">
                        -${Math.abs(item.failedNetPnl)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column Grid: Scenario Matrix & Cross-Market Agreement */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenario Matrix */}
        <div className="lg:col-span-7 bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            Arsenal Setup Scenario Matrix
          </h3>
          <p className="text-[11px] text-slate-400">
            Performance breakdown across trend-pullback patterns (A through G):
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950 text-slate-400 font-sans text-[11px] border-b border-slate-800">
                  <th className="py-2 px-3">Scenario</th>
                  <th className="py-2 px-2 text-center">Trades</th>
                  <th className="py-2 px-2 text-center">Win Rate</th>
                  <th className="py-2 px-2 text-center">Avg R</th>
                  <th className="py-2 px-3 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scenarioMatrix.map((item) => (
                  <tr key={item.scenario.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3">
                      <span className="font-sans font-semibold text-slate-200">
                        {item.scenario.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-300">{item.count}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`font-bold ${
                          item.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {item.count > 0 ? `${item.winRate}%` : '—'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold">
                      {item.count > 0 ? (item.avgR > 0 ? `+${item.avgR}` : item.avgR) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span
                        className={
                          item.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {item.netPnl >= 0 ? `+$${item.netPnl}` : `-$${Math.abs(item.netPnl)}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Grade Sizing & Chart Agreement */}
        <div className="lg:col-span-5 space-y-6">
          {/* Grade A / B / C Breakdown */}
          <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              Pre-Trade Grade Attribution
            </h3>

            <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
              {gradeMatrix.map((item) => (
                <div
                  key={item.grade}
                  className={`p-3 rounded-lg border ${
                    item.grade === 'A'
                      ? 'bg-emerald-950/20 border-emerald-800/40'
                      : item.grade === 'B'
                      ? 'bg-amber-950/20 border-amber-800/40'
                      : 'bg-rose-950/20 border-rose-800/40'
                  }`}
                >
                  <span
                    className={`text-lg font-black block ${
                      item.grade === 'A'
                        ? 'text-emerald-400'
                        : item.grade === 'B'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    Grade {item.grade}
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans block mb-1">
                    {item.grade === 'A'
                      ? 'All 6 Pass'
                      : item.grade === 'B'
                      ? '1 Failed'
                      : '2+ Failed'}
                  </span>
                  <div className="text-xs font-bold text-slate-200">{item.winRate}% WR</div>
                  <div className="text-[10px] text-slate-400">{item.count} trades</div>
                  <div
                    className={`text-xs font-bold pt-1 ${
                      item.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.netPnl >= 0 ? `+$${item.netPnl}` : `-$${Math.abs(item.netPnl)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cross Market Agreement Impact */}
          <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <h3 className="text-sm font-bold text-slate-100 font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              MNQ & MES Divergence Impact
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-lg">
                <span className="text-[11px] font-sans font-semibold text-emerald-300 block mb-1">
                  Charts Agreed
                </span>
                <div className="text-lg font-black text-emerald-400">
                  {agreementImpact.agreed.winRate}% WR
                </div>
                <div className="text-[11px] text-slate-400">
                  {agreementImpact.agreed.count} trades · +{agreementImpact.agreed.avgR}R avg
                </div>
                <div className="text-xs font-bold text-emerald-400 pt-1">
                  +${agreementImpact.agreed.netPnl}
                </div>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-800/40 rounded-lg">
                <span className="text-[11px] font-sans font-semibold text-rose-300 block mb-1">
                  Charts Disagreed
                </span>
                <div className="text-lg font-black text-rose-400">
                  {agreementImpact.disagreed.winRate}% WR
                </div>
                <div className="text-[11px] text-slate-400">
                  {agreementImpact.disagreed.count} trades · {agreementImpact.disagreed.avgR}R avg
                </div>
                <div className="text-xs font-bold text-rose-400 pt-1">
                  ${agreementImpact.disagreed.netPnl}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* R-Distribution Histogram & Discipline Tag Edge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* R-Multiple Distribution */}
        <div className="lg:col-span-6 bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-sky-400" />
            Realized R-Multiple Distribution
          </h3>

          <div className="space-y-2 pt-1 font-mono text-xs">
            {rDistribution.bins.map((bin) => {
              const widthPct = Math.max(6, Math.round((bin.count / rDistribution.maxCount) * 100));
              return (
                <div key={bin.label} className="flex items-center gap-3">
                  <span className="w-24 text-[11px] text-slate-400 text-right shrink-0">
                    {bin.label}
                  </span>
                  <div className="flex-1 bg-slate-900 h-6 rounded-md overflow-hidden relative border border-slate-800/60">
                    <div
                      className={`h-full ${bin.color} transition-all duration-300 flex items-center px-2 text-[10px] font-bold text-white`}
                      style={{ width: `${bin.count > 0 ? widthPct : 0}%` }}
                    >
                      {bin.count > 0 && `${bin.count}`}
                    </div>
                  </div>
                  <span className="w-6 text-[11px] text-slate-500 text-right shrink-0">
                    {bin.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Discipline Tags Impact */}
        <div className="lg:col-span-6 bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            Discipline Behaviors & Execution Drag
          </h3>

          {disciplineImpact.length === 0 ? (
            <p className="text-xs text-slate-500">No discipline tags logged yet.</p>
          ) : (
            <div className="space-y-2">
              {disciplineImpact.slice(0, 6).map((item) => (
                <div
                  key={item.tag}
                  className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-200 block">{item.tag}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.count} trade{item.count > 1 ? 's' : ''} · {item.winRate}% Win Rate
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span
                      className={`font-bold block ${
                        item.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.totalPnl >= 0 ? `+$${item.totalPnl}` : `-$${Math.abs(item.totalPnl)}`}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.avgR > 0 ? `+${item.avgR}` : item.avgR} R avg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
