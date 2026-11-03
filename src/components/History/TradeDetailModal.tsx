import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Edit2,
  ExternalLink,
  Layers,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
  ZoomIn,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getScreenshot } from '../../lib/screenshotStorage';
import {
  GATES_CONFIG,
  getGatesForScenario,
  INSTRUMENTS,
  SCENARIOS,
  TradeRecord,
} from '../../types/trade';

interface TradeDetailModalProps {
  trade: TradeRecord;
  onClose: () => void;
  onEdit: (trade: TradeRecord) => void;
  onDelete: (id: string) => void;
  onZoomRequested?: (url: string) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  onClose,
  onEdit,
  onDelete,
  onZoomRequested,
}) => {
  const [entryImgUrl, setEntryImgUrl] = useState<string | null>(null);
  const [exitImgUrl, setExitImgUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (trade.entryImageId) {
      getScreenshot(trade.entryImageId).then((url) => {
        if (active) setEntryImgUrl(url);
      });
    } else {
      setEntryImgUrl(null);
    }

    if (trade.exitImageId) {
      getScreenshot(trade.exitImageId).then((url) => {
        if (active) setExitImgUrl(url);
      });
    } else {
      setExitImgUrl(null);
    }

    return () => {
      active = false;
    };
  }, [trade]);

  const scenarioMeta = SCENARIOS.find((s) => s.id === trade.scenario);
  const spec = INSTRUMENTS[trade.instrument];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#0b101d] border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-[#0b101d]/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <span
              className={`px-2.5 py-1 text-xs font-black rounded font-mono ${
                trade.direction === 'Long'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                  : 'bg-rose-950 text-rose-400 border border-rose-800/50'
              }`}
            >
              {trade.instrument} · {trade.direction}
            </span>

            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-100">
                {scenarioMeta?.label ?? trade.scenario}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {trade.timestampET}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm border font-mono ${
                trade.grade === 'A'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : trade.grade === 'B'
                  ? 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                  : 'bg-rose-950/80 text-rose-400 border-rose-500/40'
              }`}
            >
              {trade.grade}
            </div>

            <button
              type="button"
              onClick={() => onEdit(trade)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit trade"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (confirm('Delete this trade permanently?')) {
                  onDelete(trade.id);
                  onClose();
                }
              }}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
              title="Delete trade"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-6 flex-1">
          {/* Outcome & Risk Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Status / Outcome</span>
              <span
                className={`text-sm font-black ${
                  trade.status === 'OPEN'
                    ? 'text-amber-400'
                    : trade.outcome === 'WIN'
                    ? 'text-emerald-400'
                    : trade.outcome === 'LOSS'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {trade.status === 'OPEN' ? 'OPEN POSITION' : trade.outcome}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Realized R</span>
              <span
                className={`text-sm font-black ${
                  (trade.realizedR ?? 0) > 0
                    ? 'text-emerald-400'
                    : (trade.realizedR ?? 0) < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {trade.status === 'OPEN'
                  ? 'Active'
                  : trade.realizedR !== undefined
                  ? trade.realizedR > 0
                    ? `+${trade.realizedR} R`
                    : `${trade.realizedR} R`
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Net P&L</span>
              <span
                className={`text-sm font-black ${
                  (trade.netPnl ?? 0) > 0
                    ? 'text-emerald-400'
                    : (trade.netPnl ?? 0) < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {trade.netPnl !== undefined
                  ? trade.netPnl >= 0
                    ? `+$${trade.netPnl}`
                    : `-$${Math.abs(trade.netPnl)}`
                  : '—'}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase block">Contracts & Risk</span>
              <span className="text-sm font-bold text-slate-200">
                {trade.actualContracts || trade.calculatedContracts} cts · ${trade.riskDollars}
              </span>
            </div>
          </div>

          {/* Execution Levels */}
          <div className="bg-[#0e1424] p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
            <h4 className="text-xs font-bold text-slate-200 font-sans">
              Execution Levels & Planned R
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block">Entry Price</span>
                <span className="text-slate-200 font-bold">{trade.entryPrice}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Stop Loss</span>
                <span className="text-rose-400 font-bold">
                  {trade.stopPrice} ({trade.riskPoints} pts)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Target 1 (T1)</span>
                <span className="text-emerald-400 font-bold">
                  {trade.target1Price} (+{trade.plannedR1}R)
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Target 2 (T2)</span>
                <span className="text-emerald-400 font-bold">
                  {trade.target2Price ? `${trade.target2Price} (+${trade.plannedR2}R)` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">First Obstacle</span>
                <span
                  className={`font-bold ${
                    trade.obstacleWarning ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {trade.obstaclePrice} ({trade.obstacleR}R)
                </span>
              </div>
            </div>
          </div>

          {/* 6 Gates Status */}
          <div className="bg-[#0e1424] p-4 rounded-xl border border-slate-800 space-y-2.5">
            <h4 className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span>Pre-Trade A++ Confluences</span>
              <span className="text-[11px] font-mono text-slate-400">
                Grade {trade.grade} ({trade.suggestedSize.toUpperCase()} size)
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {getGatesForScenario(trade.scenario).map((g) => {
                const passed = trade.gates[g.id];
                return (
                  <div
                    key={g.id}
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      passed
                        ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                        : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    }`}
                  >
                    {passed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold block">
                        Gate {g.number}: {g.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block leading-tight">
                        {g.shortDesc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scale Exits if available */}
          {trade.exits && trade.exits.length > 0 && (
            <div className="bg-[#0e1424] p-4 rounded-xl border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200 font-sans">
                Scale-Out Exit Executions
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 text-[10px]">
                      <th className="py-1">Leg Description</th>
                      <th className="py-1">Contracts</th>
                      <th className="py-1">Exit Price</th>
                      <th className="py-1">Leg R</th>
                      <th className="py-1 text-right">Leg P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {trade.exits.map((ex) => (
                      <tr key={ex.id}>
                        <td className="py-1.5 text-slate-300 font-sans">{ex.label}</td>
                        <td className="py-1.5 text-slate-300">{ex.contracts}</td>
                        <td className="py-1.5 text-slate-300">{ex.exitPrice}</td>
                        <td
                          className={`py-1.5 font-bold ${
                            ex.rMultiple > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {ex.rMultiple > 0 ? `+${ex.rMultiple}` : ex.rMultiple} R
                        </td>
                        <td
                          className={`py-1.5 text-right font-bold ${
                            ex.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {ex.pnl >= 0 ? `+$${ex.pnl}` : `-$${Math.abs(ex.pnl)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Chart Screenshots */}
          {(entryImgUrl || exitImgUrl) && (
            <div className="bg-[#0e1424] p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200">5m Arsenal Chart Screenshots</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entryImgUrl && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">Entry Setup Chart</span>
                    <div
                      onClick={() => onZoomRequested?.(entryImgUrl)}
                      className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 aspect-video cursor-pointer group relative"
                    >
                      <img
                        src={entryImgUrl}
                        alt="Entry setup"
                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1.5">
                        <ZoomIn className="w-4 h-4" /> Expand
                      </div>
                    </div>
                  </div>
                )}

                {exitImgUrl && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">Exit Outcome Chart</span>
                    <div
                      onClick={() => onZoomRequested?.(exitImgUrl)}
                      className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 aspect-video cursor-pointer group relative"
                    >
                      <img
                        src={exitImgUrl}
                        alt="Exit outcome"
                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs text-white gap-1.5">
                        <ZoomIn className="w-4 h-4" /> Expand
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discipline Tags & Retrospective Notes */}
          {(trade.disciplineTags?.length > 0 || trade.postTradeNotes) && (
            <div className="bg-[#0e1424] p-4 rounded-xl border border-slate-800 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-200">Discipline & Notes</h4>

              {trade.disciplineTags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {trade.disciplineTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-300 text-[11px] rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {trade.postTradeNotes && (
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  {trade.postTradeNotes}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
