import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  PlusCircle,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  Instrument,
  SCENARIOS,
  TradeGrade,
  TradeOutcome,
  TradeRecord,
  TradeStatus,
} from '../../types/trade';

interface HistoryViewProps {
  trades: TradeRecord[];
  onSelectTrade: (trade: TradeRecord) => void;
  onDeleteTrade: (id: string) => void;
  onNewTrade: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  trades,
  onSelectTrade,
  onDeleteTrade,
  onNewTrade,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [instrumentFilter, setInstrumentFilter] = useState<'ALL' | Instrument>('ALL');
  const [gradeFilter, setGradeFilter] = useState<'ALL' | TradeGrade>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | TradeOutcome | 'OPEN'>('ALL');

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // Instrument
      if (instrumentFilter !== 'ALL' && t.instrument !== instrumentFilter) return false;
      // Grade
      if (gradeFilter !== 'ALL' && t.grade !== gradeFilter) return false;
      // Outcome / Status
      if (outcomeFilter === 'OPEN') {
        if (t.status !== 'OPEN') return false;
      } else if (outcomeFilter !== 'ALL') {
        if (t.outcome !== outcomeFilter) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesScenario = t.scenario.toLowerCase().includes(term);
        const matchesNotes = (t.postTradeNotes ?? '').toLowerCase().includes(term);
        const matchesTags = (t.disciplineTags ?? []).some((tag) => tag.toLowerCase().includes(term));
        const matchesDate = t.timestampET.toLowerCase().includes(term);
        if (!matchesScenario && !matchesNotes && !matchesTags && !matchesDate) return false;
      }

      return true;
    });
  }, [trades, instrumentFilter, gradeFilter, outcomeFilter, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-16">
      {/* Top Search & Filter Bar */}
      <div className="bg-[#0e1424] p-3.5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search scenario, discipline tags, notes, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Instrument Filter */}
          <select
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.target.value as 'ALL' | Instrument)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Instruments</option>
            <option value="MNQ">MNQ ($2/pt)</option>
            <option value="MES">MES ($5/pt)</option>
          </select>

          {/* Grade Filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value as 'ALL' | TradeGrade)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="ALL">All Grades</option>
            <option value="A">Grade A (6/6)</option>
            <option value="B">Grade B (5/6)</option>
            <option value="C">Grade C (≤4/6)</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as 'ALL' | TradeOutcome | 'OPEN')}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Winners</option>
            <option value="LOSS">Losses</option>
            <option value="BE">Breakeven</option>
            <option value="OPEN">Open Positions</option>
          </select>

          <span className="text-[11px] font-mono text-slate-500 px-1">
            {filteredTrades.length} of {trades.length}
          </span>
        </div>
      </div>

      {/* High-Density Ledger Table */}
      {filteredTrades.length === 0 ? (
        <div className="bg-[#0e1424] p-12 rounded-xl border border-slate-800 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-300">No trades match your search filters</p>
          <p className="text-xs text-slate-500">
            Try adjusting your search query or reset your filters.
          </p>
          <button
            type="button"
            onClick={onNewTrade}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Log New Trade
          </button>
        </div>
      ) : (
        <div className="bg-[#0e1424] rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-sans text-slate-400">
                  <th className="py-2.5 px-3">Date / Time (ET)</th>
                  <th className="py-2.5 px-3">Contract</th>
                  <th className="py-2.5 px-3">Scenario</th>
                  <th className="py-2.5 px-2 text-center">Grade</th>
                  <th className="py-2.5 px-2 text-right">Risk ($)</th>
                  <th className="py-2.5 px-3 text-right">Realized R</th>
                  <th className="py-2.5 px-3 text-right">Net P&L ($)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-2 text-center">Charts</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTrades.map((t) => {
                  const passedCount = Object.values(t.gates).filter(Boolean).length;
                  const hasCharts = Boolean(t.entryImageId || t.exitImageId);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTrade(t)}
                      className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                        {t.timestampET.split(' ')[0]}
                        <span className="text-[10px] text-slate-500 ml-1.5">
                          {t.timestampET.split(' ')[1]}
                        </span>
                      </td>

                      {/* Contract & Direction */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            t.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {t.direction === 'Long' ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {t.instrument}
                        </span>
                        <span className="text-[10px] text-slate-500 ml-1 font-mono">
                          ({t.actualContracts || t.calculatedContracts}ct)
                        </span>
                      </td>

                      {/* Scenario */}
                      <td className="py-2.5 px-3 font-sans max-w-[160px] truncate text-slate-300">
                        {SCENARIOS.find((s) => s.id === t.scenario)?.label.split(':')[1]?.trim() ??
                          t.scenario}
                      </td>

                      {/* Grade Badge */}
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            t.grade === 'A'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : t.grade === 'B'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {t.grade} ({passedCount}/6)
                        </span>
                      </td>

                      {/* Risk */}
                      <td className="py-2.5 px-2 text-right text-slate-400">
                        ${t.riskDollars}
                      </td>

                      {/* Realized R */}
                      <td className="py-2.5 px-3 text-right font-bold">
                        {t.status === 'OPEN' ? (
                          <span className="text-amber-400 text-[11px]">Active</span>
                        ) : t.realizedR !== undefined ? (
                          <span
                            className={
                              t.realizedR > 0
                                ? 'text-emerald-400'
                                : t.realizedR < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            {t.realizedR > 0 ? `+${t.realizedR}` : t.realizedR} R
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Net P&L */}
                      <td className="py-2.5 px-3 text-right font-bold">
                        {t.status === 'OPEN' ? (
                          <span className="text-amber-400 text-[11px]">In Play</span>
                        ) : t.netPnl !== undefined ? (
                          <span
                            className={
                              t.netPnl > 0
                                ? 'text-emerald-400'
                                : t.netPnl < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }
                          >
                            {t.netPnl >= 0 ? `+$${t.netPnl}` : `-$${Math.abs(t.netPnl)}`}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Status / Outcome */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                            t.status === 'OPEN'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-700/40'
                              : t.outcome === 'WIN'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/40'
                              : t.outcome === 'LOSS'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-700/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {t.status === 'OPEN' ? 'OPEN' : t.outcome}
                        </span>
                      </td>

                      {/* Charts Attached */}
                      <td className="py-2.5 px-2 text-center">
                        {hasCharts ? (
                          <span title="Chart screenshots stored in IndexedDB">
                            <Camera className="w-3.5 h-3.5 text-sky-400 inline" />
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onSelectTrade(t)}
                            title="Inspect Trade"
                            className="p-1 text-slate-400 hover:text-sky-400 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Delete this trade record?')) {
                                onDeleteTrade(t.id);
                              }
                            }}
                            title="Delete"
                            className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
