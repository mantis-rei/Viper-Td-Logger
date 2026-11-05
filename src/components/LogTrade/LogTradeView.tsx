import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  HelpCircle,
  Info,
  Maximize2,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  calculateBlendedExits,
  calculatePreTradeMetrics,
  checkChartDisagreement,
  evaluateGates,
  getCurrentDateTimeLocal,
  getEasternTimeInfo,
} from '../../lib/tradeCalculations';
import {
  Direction,
  DISCIPLINE_TAGS,
  getGatesForScenario,
  GateEvaluation,
  INSTRUMENTS,
  Instrument,
  MarketBias,
  Regime,
  ScaleExit,
  ScenarioId,
  TradeGrade,
  TradeRecord,
} from '../../types/trade';
import { ImageUpload } from '../Common/ImageUpload';

interface LogTradeViewProps {
  onSaveTrade: (trade: TradeRecord) => void;
  activeTradeToEdit?: TradeRecord | null;
  onCancelEdit?: () => void;
  onZoomRequested?: (url: string) => void;
}

export const LogTradeView: React.FC<LogTradeViewProps> = ({
  onSaveTrade,
  activeTradeToEdit,
  onCancelEdit,
  onZoomRequested,
}) => {
  // Step navigation
  const [activeStep, setActiveStep] = useState<'A' | 'B'>('A');

  // Step A: Pre-Trade state
  const [tradeId, setTradeId] = useState<string>(() => activeTradeToEdit?.id ?? `trade_${Date.now()}`);
  const [instrument, setInstrument] = useState<Instrument>(activeTradeToEdit?.instrument ?? 'MNQ');
  const [direction, setDirection] = useState<Direction>(activeTradeToEdit?.direction ?? 'Long');
  const [dateTimeLocal, setDateTimeLocal] = useState<string>(() => getCurrentDateTimeLocal());
  const [scenario, setScenario] = useState<ScenarioId>(activeTradeToEdit?.scenario ?? 'SETUP_1_VELOCITY');

  // Cross-market regime context
  const [mnqRegime, setMnqRegime] = useState<Regime>(activeTradeToEdit?.mnqRegime ?? 'TREND');
  const [mnqBias, setMnqBias] = useState<MarketBias>(activeTradeToEdit?.mnqBias ?? 'BULL');
  const [mesRegime, setMesRegime] = useState<Regime>(activeTradeToEdit?.mesRegime ?? 'TREND');
  const [mesBias, setMesBias] = useState<MarketBias>(activeTradeToEdit?.mesBias ?? 'BULL');

  // Indicators
  const [adx, setAdx] = useState<number>(activeTradeToEdit?.adx ?? 25.0);
  const [rsi, setRsi] = useState<number>(activeTradeToEdit?.rsi ?? 50.0);

  // 6 Gates checklist
  const [gates, setGates] = useState<GateEvaluation>(
    activeTradeToEdit?.gates ?? {
      permission: true,
      location: true,
      trigger: true,
      stop: true,
      room: true,
      session: true,
    }
  );

  // Price inputs
  const [riskDollars, setRiskDollars] = useState<number>(activeTradeToEdit?.riskDollars ?? 150);
  const [entryPrice, setEntryPrice] = useState<number>(
    activeTradeToEdit?.entryPrice ?? (instrument === 'MNQ' ? 20500.0 : 5850.0)
  );
  const [stopPrice, setStopPrice] = useState<number>(
    activeTradeToEdit?.stopPrice ?? (instrument === 'MNQ' ? 20480.0 : 5844.0)
  );
  const [target1Price, setTarget1Price] = useState<number>(
    activeTradeToEdit?.target1Price ?? (instrument === 'MNQ' ? 20540.0 : 5862.0)
  );
  const [target2Price, setTarget2Price] = useState<number | undefined>(
    activeTradeToEdit?.target2Price ?? (instrument === 'MNQ' ? 20560.0 : 5868.0)
  );
  const [obstaclePrice, setObstaclePrice] = useState<number>(
    activeTradeToEdit?.obstaclePrice ?? (instrument === 'MNQ' ? 20570.0 : 5872.0)
  );

  const [actualContracts, setActualContracts] = useState<number>(activeTradeToEdit?.actualContracts ?? 0);
  const [entryImageId, setEntryImageId] = useState<string | undefined>(activeTradeToEdit?.entryImageId);

  // Step B: Post-trade / Exit state
  const [status, setStatus] = useState<'OPEN' | 'CLOSED'>(activeTradeToEdit?.status ?? 'CLOSED');
  const [exits, setExits] = useState<ScaleExit[]>(
    activeTradeToEdit?.exits && activeTradeToEdit.exits.length > 0
      ? activeTradeToEdit.exits
      : []
  );
  const [disciplineTags, setDisciplineTags] = useState<string[]>(activeTradeToEdit?.disciplineTags ?? []);
  const [postTradeNotes, setPostTradeNotes] = useState<string>(activeTradeToEdit?.postTradeNotes ?? '');
  const [exitImageId, setExitImageId] = useState<string | undefined>(activeTradeToEdit?.exitImageId);

  // Load activeTradeToEdit if changes
  useEffect(() => {
    if (activeTradeToEdit) {
      setTradeId(activeTradeToEdit.id);
      setInstrument(activeTradeToEdit.instrument);
      setDirection(activeTradeToEdit.direction);
      setScenario(activeTradeToEdit.scenario);
      setMnqRegime(activeTradeToEdit.mnqRegime);
      setMnqBias(activeTradeToEdit.mnqBias);
      setMesRegime(activeTradeToEdit.mesRegime);
      setMesBias(activeTradeToEdit.mesBias);
      setAdx(activeTradeToEdit.adx);
      setRsi(activeTradeToEdit.rsi);
      setGates(activeTradeToEdit.gates);
      setRiskDollars(activeTradeToEdit.riskDollars);
      setEntryPrice(activeTradeToEdit.entryPrice);
      setStopPrice(activeTradeToEdit.stopPrice);
      setTarget1Price(activeTradeToEdit.target1Price);
      setTarget2Price(activeTradeToEdit.target2Price);
      setObstaclePrice(activeTradeToEdit.obstaclePrice);
      setActualContracts(activeTradeToEdit.actualContracts);
      setEntryImageId(activeTradeToEdit.entryImageId);
      setStatus(activeTradeToEdit.status);
      setExits(activeTradeToEdit.exits ?? []);
      setDisciplineTags(activeTradeToEdit.disciplineTags ?? []);
      setPostTradeNotes(activeTradeToEdit.postTradeNotes ?? '');
      setExitImageId(activeTradeToEdit.exitImageId);
    }
  }, [activeTradeToEdit]);

  // Evaluate chart disagreement
  const disagreement = checkChartDisagreement(direction, mnqRegime, mnqBias, mesRegime, mesBias);

  // Evaluate 6 gates
  const gateResult = evaluateGates(gates);

  // Evaluate session status for Gate 6 assistance
  const sessionInfo = getEasternTimeInfo(dateTimeLocal);

  // Calculate pre-trade numbers
  const preMetrics = calculatePreTradeMetrics({
    instrument,
    direction,
    riskDollars,
    entryPrice,
    stopPrice,
    target1Price,
    target2Price,
    obstaclePrice,
  });

  // Keep actual contracts synced with calculated if 0
  const effectiveContracts = actualContracts > 0 ? actualContracts : preMetrics.calculatedContracts;

  // Calculate blended exits
  const blendedOutcome = calculateBlendedExits({
    instrument,
    direction,
    entryPrice,
    riskPoints: preMetrics.riskPoints,
    exits,
  });

  // Populate default scale-out exits if empty and status is closed
  const applyPresetExit = (type: 'T1_ONLY' | 'SCALE_T1_T2' | 'STOP_OUT' | 'SCRATCH') => {
    const total = effectiveContracts;
    if (total <= 0) return;

    if (type === 'T1_ONLY') {
      const pnlPoints = direction === 'Long' ? target1Price - entryPrice : entryPrice - target1Price;
      const r = preMetrics.riskPoints > 0 ? pnlPoints / preMetrics.riskPoints : 0;
      const pnl = pnlPoints * total * INSTRUMENTS[instrument].pointValue;
      setExits([
        {
          id: `ex_${Date.now()}`,
          label: `T1 Target (${total} cts)`,
          contracts: total,
          exitPrice: target1Price,
          rMultiple: Number(r.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
        },
      ]);
    } else if (type === 'SCALE_T1_T2') {
      const half1 = Math.ceil(total / 2);
      const half2 = total - half1;
      const t2 = target2Price ?? target1Price;

      const pnl1Points = direction === 'Long' ? target1Price - entryPrice : entryPrice - target1Price;
      const r1 = preMetrics.riskPoints > 0 ? pnl1Points / preMetrics.riskPoints : 0;
      const pnl1 = pnl1Points * half1 * INSTRUMENTS[instrument].pointValue;

      const pnl2Points = direction === 'Long' ? t2 - entryPrice : entryPrice - t2;
      const r2 = preMetrics.riskPoints > 0 ? pnl2Points / preMetrics.riskPoints : 0;
      const pnl2 = pnl2Points * half2 * INSTRUMENTS[instrument].pointValue;

      setExits([
        {
          id: `ex_${Date.now()}_1`,
          label: `T1 Scale (${half1} cts)`,
          contracts: half1,
          exitPrice: target1Price,
          rMultiple: Number(r1.toFixed(2)),
          pnl: Number(pnl1.toFixed(2)),
        },
        ...(half2 > 0
          ? [
              {
                id: `ex_${Date.now()}_2`,
                label: `T2 / Runner (${half2} cts)`,
                contracts: half2,
                exitPrice: t2,
                rMultiple: Number(r2.toFixed(2)),
                pnl: Number(pnl2.toFixed(2)),
              },
            ]
          : []),
      ]);
    } else if (type === 'STOP_OUT') {
      const pnlPoints = direction === 'Long' ? stopPrice - entryPrice : entryPrice - stopPrice;
      const pnl = pnlPoints * total * INSTRUMENTS[instrument].pointValue;
      setExits([
        {
          id: `ex_${Date.now()}`,
          label: `Full Stop Loss (${total} cts)`,
          contracts: total,
          exitPrice: stopPrice,
          rMultiple: -1.0,
          pnl: Number(pnl.toFixed(2)),
        },
      ]);
    } else if (type === 'SCRATCH') {
      setExits([
        {
          id: `ex_${Date.now()}`,
          label: `Scratch / Breakeven (${total} cts)`,
          contracts: total,
          exitPrice: entryPrice,
          rMultiple: 0.0,
          pnl: 0.0,
        },
      ]);
    }
  };

  const addCustomExitLeg = () => {
    const remainingContracts = Math.max(
      1,
      effectiveContracts - exits.reduce((acc, curr) => acc + curr.contracts, 0)
    );
    const newExitPrice = direction === 'Long' ? entryPrice + preMetrics.riskPoints : entryPrice - preMetrics.riskPoints;
    const pnlPoints = direction === 'Long' ? newExitPrice - entryPrice : entryPrice - newExitPrice;
    const r = preMetrics.riskPoints > 0 ? pnlPoints / preMetrics.riskPoints : 0;
    const pnl = pnlPoints * remainingContracts * INSTRUMENTS[instrument].pointValue;

    setExits([
      ...exits,
      {
        id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        label: `Exit Leg ${exits.length + 1}`,
        contracts: remainingContracts,
        exitPrice: newExitPrice,
        rMultiple: Number(r.toFixed(2)),
        pnl: Number(pnl.toFixed(2)),
      },
    ]);
  };

  const updateExitLeg = (index: number, field: keyof ScaleExit, value: unknown) => {
    const updated = [...exits];
    const leg = { ...updated[index], [field]: value };

    // Recompute R and P&L for this leg
    const price = Number(leg.exitPrice) || entryPrice;
    const contracts = Number(leg.contracts) || 1;
    const pnlPoints = direction === 'Long' ? price - entryPrice : entryPrice - price;
    const r = preMetrics.riskPoints > 0 ? pnlPoints / preMetrics.riskPoints : 0;
    const pnl = pnlPoints * contracts * INSTRUMENTS[instrument].pointValue;

    leg.rMultiple = Number(r.toFixed(2));
    leg.pnl = Number(pnl.toFixed(2));

    updated[index] = leg;
    setExits(updated);
  };

  const removeExitLeg = (index: number) => {
    setExits(exits.filter((_, i) => i !== index));
  };

  const toggleGate = (key: keyof GateEvaluation) => {
    setGates((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleDisciplineTag = (tag: string) => {
    setDisciplineTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = (targetStatus: 'OPEN' | 'CLOSED') => {
    const finalRecord: TradeRecord = {
      id: tradeId,
      createdAt: activeTradeToEdit?.createdAt ?? new Date().toISOString(),
      timestampET: sessionInfo.timeETString,
      instrument,
      direction,
      scenario,
      mnqRegime,
      mnqBias,
      mesRegime,
      mesBias,
      chartsDisagree: disagreement.disagree,
      adx,
      rsi,
      gates,
      grade: gateResult.grade,
      suggestedSize: gateResult.suggestedSize,
      riskDollars,
      entryPrice,
      stopPrice,
      target1Price,
      target2Price,
      obstaclePrice,
      riskPoints: preMetrics.riskPoints,
      plannedR1: preMetrics.plannedR1,
      plannedR2: preMetrics.plannedR2,
      obstacleR: preMetrics.obstacleR,
      obstacleWarning: preMetrics.obstacleWarning,
      calculatedContracts: preMetrics.calculatedContracts,
      actualContracts: effectiveContracts,
      entryImageId,
      status: targetStatus,
      exitTimestampET: targetStatus === 'CLOSED' ? sessionInfo.timeETString : undefined,
      exits: targetStatus === 'CLOSED' ? exits : [],
      blendedExitPrice: targetStatus === 'CLOSED' ? blendedOutcome.blendedExitPrice : undefined,
      realizedR: targetStatus === 'CLOSED' ? blendedOutcome.realizedR : undefined,
      netPnl: targetStatus === 'CLOSED' ? blendedOutcome.netPnl : undefined,
      outcome: targetStatus === 'CLOSED' ? blendedOutcome.outcome : undefined,
      disciplineTags,
      postTradeNotes,
      exitImageId,
    };

    onSaveTrade(finalRecord);
  };

  const handleReset = () => {
    setTradeId(`trade_${Date.now()}`);
    setEntryPrice(instrument === 'MNQ' ? 20500.0 : 5850.0);
    setStopPrice(instrument === 'MNQ' ? 20480.0 : 5844.0);
    setTarget1Price(instrument === 'MNQ' ? 20540.0 : 5862.0);
    setTarget2Price(instrument === 'MNQ' ? 20560.0 : 5868.0);
    setObstaclePrice(instrument === 'MNQ' ? 20570.0 : 5872.0);
    setActualContracts(0);
    setExits([]);
    setDisciplineTags([]);
    setPostTradeNotes('');
    setEntryImageId(undefined);
    setExitImageId(undefined);
    setActiveStep('A');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Step Tabs and Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-3 sm:p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveStep('A')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeStep === 'A'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
            }`}
          >
            <span>Step A: Pre-Trade Checklist</span>
            {gateResult.failedCount > 0 ? (
              <span className="px-1.5 py-0.2 bg-amber-950/80 text-amber-300 text-[10px] rounded font-mono">
                {gateResult.passedCount}/6
              </span>
            ) : (
              <span className="px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 text-[10px] rounded font-mono">
                6/6
              </span>
            )}
          </button>

          <ChevronRight className="w-4 h-4 text-slate-600 hidden sm:block" />

          <button
            type="button"
            onClick={() => setActiveStep('B')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeStep === 'B'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
            }`}
          >
            <span>Step B: Exit & Outcome</span>
            {exits.length > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-700 text-slate-200 text-[10px] rounded font-mono">
                {exits.length} exits
              </span>
            )}
          </button>
        </div>

        {/* Live Grade Preview Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Pre-Trade Grade</span>
            <span className="text-xs font-mono font-medium text-slate-300">
              {gateResult.grade === 'A'
                ? 'Full Size'
                : gateResult.grade === 'B'
                ? 'Half Size'
                : 'Skip Setup'}
            </span>
          </div>

          <div
            className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xl border shadow-md font-mono ${
              gateResult.grade === 'A'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-emerald-950/40'
                : gateResult.grade === 'B'
                ? 'bg-amber-950/60 text-amber-400 border-amber-500/40 shadow-amber-950/40'
                : 'bg-rose-950/60 text-rose-400 border-rose-500/40 shadow-rose-950/40'
            }`}
          >
            {gateResult.grade}
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeStep === 'A' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Context, Setup & 6-Gate Checklist */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Core Trade Profile */}
            <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                1. Trade Setup & Indicator Context
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Instrument */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Instrument
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setInstrument('MNQ');
                        if (entryPrice === 5850.0) setEntryPrice(20500.0);
                        if (stopPrice === 5844.0) setStopPrice(20480.0);
                      }}
                      className={`py-1 text-xs font-bold rounded transition-colors ${
                        instrument === 'MNQ'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      MNQ ($2)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInstrument('MES');
                        if (entryPrice === 20500.0) setEntryPrice(5850.0);
                        if (stopPrice === 20480.0) setStopPrice(5844.0);
                      }}
                      className={`py-1 text-xs font-bold rounded transition-colors ${
                        instrument === 'MES'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      MES ($5)
                    </button>
                  </div>
                </div>

                {/* Direction */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Direction
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDirection('Long')}
                      className={`py-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${
                        direction === 'Long'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Long
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('Short')}
                      className={`py-1 text-xs font-bold rounded flex items-center justify-center gap-1 transition-colors ${
                        direction === 'Short'
                          ? 'bg-rose-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      Short
                    </button>
                  </div>
                </div>

                {/* Date/Time (Defaults to now) */}
                <div className="col-span-2">
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Entry Time (US Eastern)
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      value={dateTimeLocal}
                      onChange={(e) => setDateTimeLocal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Two A++ Setups Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-400 block">
                    Two A++ Trading Setups
                  </label>
                  <span className="text-[10px] font-mono text-sky-400 font-semibold uppercase">
                    Only 2 Valid Entries
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Setup 1 Button */}
                  <button
                    type="button"
                    onClick={() => setScenario('SETUP_1_VELOCITY')}
                    className={`p-3 rounded-lg border text-left transition-all relative ${
                      scenario === 'SETUP_1_VELOCITY'
                        ? 'bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${scenario === 'SETUP_1_VELOCITY' ? 'bg-sky-400' : 'bg-slate-600'}`} />
                        Setup 1 (Type A): 1st Band Rejection
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 border border-sky-800 text-sky-300">
                        1:2 RR
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {direction === 'Long' ? (
                        <>
                          Price is <strong>above 1st Band</strong>. Trend &gt; 24. Rejection/engulfing closes above EMA 8. SL below breakout candle. <strong>TP: 1:2 RR</strong>.
                        </>
                      ) : (
                        <>
                          Price is <strong>below 1st Band</strong>. Trend &gt; 24. Rejection/engulfing closes below EMA 8. SL above breakout candle. <strong>TP: 1:2 RR</strong>.
                        </>
                      )}
                    </p>
                  </button>

                  {/* Setup 2 Button */}
                  <button
                    type="button"
                    onClick={() => setScenario('SETUP_2_DEEP_RETEST')}
                    className={`p-3 rounded-lg border text-left transition-all relative ${
                      scenario === 'SETUP_2_DEEP_RETEST'
                        ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/50'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${scenario === 'SETUP_2_DEEP_RETEST' ? 'bg-amber-400' : 'bg-slate-600'}`} />
                        Setup 2 (Type B): Deep Retest
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 border border-amber-800 text-amber-300">
                        2nd Band
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      {direction === 'Long' ? (
                        <>
                          Price is <strong>below 1st Band</strong>. Trend &gt; 24. Deep pullback into ribbon/EMA 22, closes back above EMA 8. SL below breakout candle. <strong>TP: 2nd Band</strong>.
                        </>
                      ) : (
                        <>
                          Price is <strong>above 1st Band</strong>. Trend &gt; 24. Deep pullback into ribbon/EMA 22, closes back below EMA 8. SL above breakout candle. <strong>TP: 2nd Band</strong>.
                        </>
                      )}
                    </p>
                  </button>
                </div>

              </div>

              {/* Cross-market regime check */}
              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Dual Market Confirmation (MNQ vs MES)
                  </span>
                  {disagreement.disagree ? (
                    <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/50 rounded text-[11px] font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      Disagreement Flagged
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Aligned
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* MNQ */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">MNQ State:</span>
                    <div className="flex gap-1.5">
                      <select
                        value={mnqRegime}
                        onChange={(e) => setMnqRegime(e.target.value as Regime)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 flex-1"
                      >
                        <option value="TREND">TREND</option>
                        <option value="RANGE">RANGE</option>
                      </select>
                      <select
                        value={mnqBias}
                        onChange={(e) => setMnqBias(e.target.value as MarketBias)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 flex-1 font-mono"
                      >
                        <option value="BULL">BULL</option>
                        <option value="BEAR">BEAR</option>
                        <option value="FLAT">FLAT</option>
                      </select>
                    </div>
                  </div>

                  {/* MES */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-mono">MES State:</span>
                    <div className="flex gap-1.5">
                      <select
                        value={mesRegime}
                        onChange={(e) => setMesRegime(e.target.value as Regime)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 flex-1"
                      >
                        <option value="TREND">TREND</option>
                        <option value="RANGE">RANGE</option>
                      </select>
                      <select
                        value={mesBias}
                        onChange={(e) => setMesBias(e.target.value as MarketBias)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 flex-1 font-mono"
                      >
                        <option value="BULL">BULL</option>
                        <option value="BEAR">BEAR</option>
                        <option value="FLAT">FLAT</option>
                      </select>
                    </div>
                  </div>
                </div>

                {disagreement.disagree && (
                  <p className="text-[11px] text-rose-300/90 font-mono pt-1">
                    Caution: {disagreement.reason}
                  </p>
                )}
              </div>

              {/* ADX and RSI Inputs */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-medium text-slate-400">
                        Trend Strength / ADX
                      </label>
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          adx > 24 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {adx > 24 ? 'Trend > 24 (Valid)' : 'Trend ≤ 24 (Invalid)'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={adx}
                      onChange={(e) => setAdx(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-medium text-slate-400">RSI (14)</label>
                      <span
                        className={`text-[10px] font-mono ${
                          (direction === 'Long' && rsi >= 70) || (direction === 'Short' && rsi <= 30)
                            ? 'text-rose-400 font-bold'
                            : 'text-emerald-400'
                        }`}
                      >
                        {rsi >= 70 ? 'Overbought' : rsi <= 30 ? 'Oversold' : 'Safe Range'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={rsi}
                      onChange={(e) => setRsi(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Real-time Trend & Confluence Warnings */}
                {adx <= 24 && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-rose-300">
                        Trend Strength Warning ({adx} ≤ 24):
                      </span>{' '}
                      Both A++ setups require <strong>Trend &gt; 24</strong>. Low ADX indicates chop and flat range conditions where ribbon bounces fail.
                    </div>
                  </div>
                )}

                {scenario === 'SETUP_1_VELOCITY' && (
                  <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-300 flex items-center justify-between">
                    <span>
                      <strong>Setup 1 Rules:</strong>{' '}
                      {direction === 'Long'
                        ? 'Price above 1st Band · Rejection > EMA 8 · SL below breakout'
                        : 'Price below 1st Band · Rejection < EMA 8 · SL above breakout'}
                    </span>
                    <span className="font-mono font-bold text-sky-200 px-1.5 py-0.5 bg-sky-900/60 rounded">
                      TP: 1:2 RR
                    </span>
                  </div>
                )}

                {scenario === 'SETUP_2_DEEP_RETEST' && (
                  <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40 text-[11px] text-amber-300 flex items-center justify-between">
                    <span>
                      <strong>Setup 2 Rules:</strong>{' '}
                      {direction === 'Long'
                        ? 'Price below 1st Band · Deep Retest to EMA 22 > EMA 8 · SL below breakout'
                        : 'Price above 1st Band · Deep Retest to EMA 22 < EMA 8 · SL above breakout'}
                    </span>
                    <span className="font-mono font-bold text-amber-200 px-1.5 py-0.5 bg-amber-900/60 rounded">
                      TP: 2nd Band
                    </span>
                  </div>
                )}

                {direction === 'Long' && rsi >= 70 && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-rose-300">RSI Overbought ({rsi} ≥ 70):</span>{' '}
                      Long entries into overbought RSI face immediate pullback risk.
                    </div>
                  </div>
                )}

                {direction === 'Short' && rsi <= 30 && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-rose-300">RSI Oversold ({rsi} ≤ 30):</span>{' '}
                      Short entries into oversold RSI face bounce/squeeze risk.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. The 6 Execution Gates */}
            <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-sky-400" />
                    2. Pre-Trade A++ Confluences (
                    {scenario === 'SETUP_1_VELOCITY'
                      ? 'Setup 1: Velocity'
                      : scenario === 'SETUP_2_DEEP_RETEST'
                      ? 'Setup 2: Deep Retest'
                      : 'Checklist'}
                    )
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Select setup and confirm all 6 setup-specific confluences (Gate 2 = entry location for the chosen setup/direction)
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {gateResult.passedCount} of 6 Passed
                  </span>
                </div>
              </div>

              {/* Gate items list */}
              <div className="space-y-2 pt-1">
                {getGatesForScenario(scenario, direction).map((gate) => {
                  const passed = gates[gate.id];
                  const isSessionGate = gate.id === 'session';

                  return (
                    <div
                      key={gate.id}
                      onClick={() => toggleGate(gate.id)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        passed
                          ? 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                          : 'bg-rose-950/20 border-rose-900/50 hover:border-rose-700/60'
                      }`}
                    >
                      <button
                        type="button"
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                          passed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {passed ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs font-semibold ${
                              passed ? 'text-slate-200' : 'text-rose-300'
                            }`}
                          >
                            Gate {gate.number}: {gate.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                              passed
                                ? 'bg-emerald-950 text-emerald-300'
                                : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {passed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {gate.fullDesc}
                        </p>
                        {isSessionGate && sessionInfo.warningMessage && !passed && (
                          <p className="text-[10px] text-amber-400 font-mono mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {sessionInfo.warningMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Failed gates notification banner */}
              {gateResult.failedCount > 0 && (
                <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      {gateResult.failedCount} Gate{gateResult.failedCount > 1 ? 's' : ''} Failed:
                    </span>{' '}
                    <span>
                      {gateResult.grade === 'B'
                        ? '1 gate failed (Grade B). Trader rule recommends Half Size.'
                        : '2+ gates failed (Grade C). Trader rule recommends Skipping setup.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Prices, Risk, Contract Sizing & Chart Upload */}
          <div className="lg:col-span-5 space-y-6">
            {/* 3. Price Ladder & Math Engine */}
            <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-sky-400" />
                3. Execution Levels & Sizing
              </h3>

              {/* Risk per trade input */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Risk Per Trade ($)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Max planned loss
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="10"
                    min="10"
                    value={riskDollars}
                    onChange={(e) => setRiskDollars(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-7 pr-3 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Prices Inputs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Entry Price */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Entry Price
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Stop Loss Price */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-medium text-slate-400">
                      Stop Loss Price
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {direction === 'Long' ? 'Below breakout' : 'Above breakout'}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Target 1 */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-medium text-slate-400">
                      Target 1 ({scenario === 'SETUP_1_VELOCITY' ? '1:2 RR' : '2nd Band'})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const risk = Math.abs(entryPrice - stopPrice);
                        if (risk > 0) {
                          const t1 = direction === 'Long' ? entryPrice + risk * 2 : entryPrice - risk * 2;
                          setTarget1Price(Number(t1.toFixed(2)));
                        }
                      }}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-mono font-medium underline"
                      title="Auto-calculate 1:2 RR target price"
                    >
                      Calc 1:2 RR
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    value={target1Price}
                    onChange={(e) => setTarget1Price(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Target 2 */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Target 2 (T2, Runner)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={target2Price ?? ''}
                    placeholder="Optional"
                    onChange={(e) =>
                      setTarget2Price(e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* First Obstacle Price */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-slate-400">
                      First Obstacle Price (FVG / PDH / PDL / ±2σ)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">Gate 5 Check</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    value={obstaclePrice}
                    onChange={(e) => setObstaclePrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Calculated Math Metrics Strip */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/90 space-y-3 font-mono">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Risk Points</span>
                    <span className="text-sm font-bold text-slate-200">
                      {preMetrics.riskPoints} pts
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      ${preMetrics.riskPoints * preMetrics.pointValue}/ct
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Planned T1</span>
                    <span className="text-sm font-bold text-emerald-400">
                      +{preMetrics.plannedR1} R
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {direction === 'Long' ? target1Price - entryPrice : entryPrice - target1Price} pts
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Obstacle Room</span>
                    <span
                      className={`text-sm font-bold ${
                        preMetrics.obstacleWarning ? 'text-rose-400' : 'text-slate-200'
                      }`}
                    >
                      {preMetrics.obstacleR} R
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {preMetrics.obstacleWarning ? '< 1.5R Warn' : 'Adequate'}
                    </span>
                  </div>
                </div>

                {/* Obstacle Warning Alert */}
                {preMetrics.obstacleWarning && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>
                      Warning: Room to obstacle is only {preMetrics.obstacleR}R (less than 1.5R required by Gate 5).
                    </span>
                  </div>
                )}

                {/* Position Size Calculation Result */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">
                      Auto-Calculated Size ({gateResult.suggestedSize.toUpperCase()})
                    </span>
                    <span className="text-base font-black text-sky-400">
                      {preMetrics.calculatedContracts} Contract
                      {preMetrics.calculatedContracts > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Actual:</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={effectiveContracts}
                      onChange={(e) => setActualContracts(parseInt(e.target.value, 10) || 1)}
                      className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-center font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Entry Screenshot */}
              <div className="pt-2 border-t border-slate-800">
                <ImageUpload
                  label="Entry Chart (5m Arsenal Setup)"
                  imageId={entryImageId}
                  onImageSaved={(id) => setEntryImageId(id)}
                  onImageRemoved={() => setEntryImageId(undefined)}
                  onZoomRequested={onZoomRequested}
                  hint="Paste 5m TradingView chart (Ctrl+V) before entry"
                />
              </div>

              {/* Navigation to Step B or Save as Open */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep('B')}
                  className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>Continue to Step B (Exit)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSave('OPEN')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Log as Open Position</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Step B: Post-Trade Review & Multi-Contract Scale Exits */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Scale-out Manager */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    4. Scale-Out & Exit Execution
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Allocate contracts across targets (T1, T2, runners, or stop-outs)
                  </p>
                </div>

                <div className="text-xs font-mono text-slate-400">
                  Total Size:{' '}
                  <span className="font-bold text-white">{effectiveContracts} contracts</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPresetExit('T1_ONLY')}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-center"
                >
                  Full T1 Exit
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetExit('SCALE_T1_T2')}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-center"
                >
                  50% T1 + 50% T2
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetExit('STOP_OUT')}
                  className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-xs rounded text-rose-300 font-medium transition-colors text-center"
                >
                  Full Stop Out
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetExit('SCRATCH')}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-center"
                >
                  Breakeven Scratch
                </button>
              </div>

              {/* Exit Legs List */}
              <div className="space-y-3 pt-2">
                {exits.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-800 rounded-lg text-slate-500 text-xs space-y-2">
                    <p>No exit fills recorded yet.</p>
                    <p className="text-[11px] text-slate-600">
                      Click a preset button above or add custom scale-out fills below.
                    </p>
                    <button
                      type="button"
                      onClick={addCustomExitLeg}
                      className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Exit Leg
                    </button>
                  </div>
                ) : (
                  exits.map((exit, idx) => (
                    <div
                      key={exit.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2 text-xs font-mono"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={exit.label}
                          onChange={(e) => updateExitLeg(idx, 'label', e.target.value)}
                          className="bg-transparent border-b border-slate-700 text-slate-200 font-sans font-semibold text-xs py-0.5 focus:outline-none focus:border-sky-400"
                        />
                        <button
                          type="button"
                          onClick={() => removeExitLeg(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
                        <div>
                          <label className="text-[10px] text-slate-500 block">Contracts</label>
                          <input
                            type="number"
                            min="1"
                            value={exit.contracts}
                            onChange={(e) =>
                              updateExitLeg(idx, 'contracts', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block">Exit Price</label>
                          <input
                            type="number"
                            step="0.25"
                            value={exit.exitPrice}
                            onChange={(e) =>
                              updateExitLeg(idx, 'exitPrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block">Leg R-Mult</label>
                          <span
                            className={`text-xs font-bold block py-1 ${
                              exit.rMultiple > 0
                                ? 'text-emerald-400'
                                : exit.rMultiple < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {exit.rMultiple > 0 ? `+${exit.rMultiple}` : exit.rMultiple} R
                          </span>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 block">Leg Net P&L</label>
                          <span
                            className={`text-xs font-bold block py-1 ${
                              exit.pnl > 0
                                ? 'text-emerald-400'
                                : exit.pnl < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {exit.pnl >= 0 ? `+$${exit.pnl}` : `-$${Math.abs(exit.pnl)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {exits.length > 0 && (
                  <button
                    type="button"
                    onClick={addCustomExitLeg}
                    className="w-full py-1.5 border border-dashed border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Exit Leg</span>
                  </button>
                )}
              </div>

              {/* Blended Realized Outcome Summary */}
              {exits.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Blended Trade Outcome:</span>
                    <span
                      className={`px-2 py-0.5 text-xs font-bold rounded ${
                        blendedOutcome.outcome === 'WIN'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                          : blendedOutcome.outcome === 'LOSS'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {blendedOutcome.outcome}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Blended Exit
                      </span>
                      <span className="text-sm font-bold text-slate-200">
                        {blendedOutcome.blendedExitPrice}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Realized R
                      </span>
                      <span
                        className={`text-base font-black ${
                          blendedOutcome.realizedR > 0
                            ? 'text-emerald-400'
                            : blendedOutcome.realizedR < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {blendedOutcome.realizedR > 0
                          ? `+${blendedOutcome.realizedR}`
                          : blendedOutcome.realizedR}{' '}
                        R
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Net P&L ($)</span>
                      <span
                        className={`text-base font-black ${
                          blendedOutcome.netPnl > 0
                            ? 'text-emerald-400'
                            : blendedOutcome.netPnl < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {blendedOutcome.netPnl >= 0
                          ? `+$${blendedOutcome.netPnl}`
                          : `-$${Math.abs(blendedOutcome.netPnl)}`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Discipline Tags Matrix */}
            <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200">
                5. Discipline & Execution Tags
              </h3>
              <p className="text-[11px] text-slate-400">
                Identify recurring psychological and execution behaviors:
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {DISCIPLINE_TAGS.map((tag) => {
                  const active = disciplineTags.includes(tag);
                  const isPositive =
                    tag.includes('Followed') || tag.includes('Target') || tag.includes('properly') || tag.includes('resisted');

                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleDisciplineTag(tag)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        active
                          ? isPositive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-semibold'
                            : 'bg-rose-950 text-rose-300 border border-rose-700/60 font-semibold'
                          : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Exit Screenshot & Post-Trade Notes */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0e1424] p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">
                6. Exit Screenshot & Trade Notes
              </h3>

              {/* Upload Exit Screenshot */}
              <ImageUpload
                label="Exit Chart (Outcome & Price Action)"
                imageId={exitImageId}
                onImageSaved={(id) => setExitImageId(id)}
                onImageRemoved={() => setExitImageId(undefined)}
                onZoomRequested={onZoomRequested}
                hint="Paste exit chart (Ctrl+V) showing target fill or stop"
              />

              {/* Post Trade Notes */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Retrospective & Lessons Learned
                </label>
                <textarea
                  rows={4}
                  placeholder="Did price react cleanly to the VWAP/EMA level? What did the delta look like? Did you manage emotions according to the plan?"
                  value={postTradeNotes}
                  onChange={(e) => setPostTradeNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 placeholder:text-slate-600"
                />
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleSave('CLOSED')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Trade Record to Ledger</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStep('A')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold transition-colors"
                  >
                    Back to Step A
                  </button>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
