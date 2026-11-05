export type Instrument = 'MNQ' | 'MES';
export type Direction = 'Long' | 'Short';
export type Regime = 'TREND' | 'RANGE';
export type MarketBias = 'BULL' | 'BEAR' | 'FLAT';
export type ScenarioId =
  | 'SETUP_1_VELOCITY'
  | 'SETUP_2_DEEP_RETEST'
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'Other';
export type TradeGrade = 'A' | 'B' | 'C';
export type TradeStatus = 'OPEN' | 'CLOSED';
export type TradeOutcome = 'WIN' | 'LOSS' | 'BE';

export interface GateEvaluation {
  permission: boolean; // Ribbon aligned with direction, ADX >= 20, price on correct side of VWAP
  location: boolean;   // Price is AT the zone (EMA/VWAP/level), not already beyond it
  trigger: boolean;    // Candle closed back through zone (not entered mid-move)
  stop: boolean;       // Placed beyond structure plus buffer (not just past MA)
  room: boolean;       // First obstacle at least 1.5R away
  session: boolean;    // Inside NY Open (09:30-11:00) or Power Hour (15:00-16:00); not dead zone or overnight
}

export type GateKey = keyof GateEvaluation;

export interface GateInfo {
  id: GateKey;
  number: number;
  name: string;
  shortDesc: string;
  fullDesc: string;
  hint: string;
}

export const SETUP_1_GATES: GateInfo[] = [
  {
    id: 'permission',
    number: 1,
    name: 'Trend Strength > 24',
    shortDesc: 'Trend > 24 & Directional alignment',
    fullDesc: 'Trend strength / ADX is strictly above 24 on both NQ and ES, confirming sustained institutional order flow.',
    hint: 'Never trade when Trend is ≤ 24 (flat chop / whipsaw risk).'
  },
  {
    id: 'location',
    number: 2,
    name: 'Location: Above 1st Band',
    shortDesc: 'Price trading above 1st Band',
    fullDesc: 'Price is established above the 1st Volatility Band (for Long) in the active expansion corridor.',
    hint: 'Confirms price is holding value above the 1st band.'
  },
  {
    id: 'trigger',
    number: 3,
    name: 'Ribbon Rejection & Close > EMA 8',
    shortDesc: 'Rejection or engulfing candle closes above EMA 8',
    fullDesc: 'Price rejects the ribbon with rejection candles or a strong engulfing candle, and closes decisively above EMA 8.',
    hint: 'Never enter mid-candle; wait for the candle to close beyond EMA 8.'
  },
  {
    id: 'stop',
    number: 4,
    name: 'SL Below Breakout Candle',
    shortDesc: 'Stop loss placed below breakout candle',
    fullDesc: 'Stop loss is placed directly below the low of the breakout/rejection candle.',
    hint: 'Structural protection; an immediate breach of the trigger candle invalidates the entry.'
  },
  {
    id: 'room',
    number: 5,
    name: 'Target: 1:2 RR Ratio',
    shortDesc: 'Strict 1:2 Risk-to-Reward target',
    fullDesc: 'Take profit target is set to a 1:2 RR ratio (TP distance = 2 × SL distance).',
    hint: 'Above the 1st band, bank high-probability 1:2 RR returns.'
  },
  {
    id: 'session',
    number: 6,
    name: 'RSI & Session Quality',
    shortDesc: 'RSI not extreme (<70 Long) & Active Session',
    fullDesc: 'RSI is not overbought (< 70 for Longs), and session is active.',
    hint: 'Prevents buying into exhausted momentum impulses.'
  }
];

export const SETUP_2_GATES: GateInfo[] = [
  {
    id: 'permission',
    number: 1,
    name: 'Trend Strength > 24',
    shortDesc: 'Trend > 24 & Directional alignment',
    fullDesc: 'Trend strength / ADX is strictly above 24 on both NQ and ES, confirming underlying directional bias.',
    hint: 'Both A++ setups require Trend > 24.'
  },
  {
    id: 'location',
    number: 2,
    name: 'Location: Below 1st Band (Deep Pullback)',
    shortDesc: 'Price is below 1st Band with deep pullback',
    fullDesc: 'Price is below the 1st Band (for Long) and has pulled back deeply into the ribbon / RED line (EMA 22) or key 4H Gap.',
    hint: 'Deep retest sweeps weak hands before expansion.'
  },
  {
    id: 'trigger',
    number: 3,
    name: 'Deep Rejection & Close > EMA 8',
    shortDesc: 'Deep rejection candle closes back above EMA 8',
    fullDesc: 'Price rejects deeply off ribbon/EMA 22 with rejection candles or a strong engulfing candle closing back above EMA 8.',
    hint: 'Confirms baseline support held and momentum is reclaimed.'
  },
  {
    id: 'stop',
    number: 4,
    name: 'SL Below Breakout Candle',
    shortDesc: 'Stop loss placed below breakout candle',
    fullDesc: 'Stop loss is placed directly below the low of the breakout/rejection candle.',
    hint: 'Structural protection anchored strictly to the breakout trigger.'
  },
  {
    id: 'room',
    number: 5,
    name: 'Target: 2nd Band',
    shortDesc: 'Take profit targets the 2nd Volatility Band',
    fullDesc: 'Take profit is set to target the 2nd Volatility Band, capturing the full expansion move out of the deep retest.',
    hint: 'Deep pullbacks below 1st band offer larger runway to expand all the way to 2nd band.'
  },
  {
    id: 'session',
    number: 6,
    name: 'RSI Reset & Market Alignment',
    shortDesc: 'RSI reset to neutral & NQ/ES in agreement',
    fullDesc: 'RSI cooled off from extremes (reset near 40–60), session is active, and NQ/ES charts agree.',
    hint: 'Ensures deep pullback is an accumulation retest rather than a trend breakdown.'
  }
];

export const SETUP_1_GATES_SHORT: GateInfo[] = [
  {
    id: 'permission',
    number: 1,
    name: 'Trend Strength > 24',
    shortDesc: 'Trend > 24 & Directional alignment',
    fullDesc: 'Trend strength / ADX is strictly above 24 on both NQ and ES, confirming sustained institutional order flow.',
    hint: 'Never trade when Trend is ≤ 24 (flat chop / whipsaw risk).'
  },
  {
    id: 'location',
    number: 2,
    name: 'Location: Below 1st Band',
    shortDesc: 'Price trading below 1st Band',
    fullDesc: 'Price is established below the 1st Volatility Band (for Short) in the active expansion corridor.',
    hint: 'Confirms price is holding value below the 1st band.'
  },
  {
    id: 'trigger',
    number: 3,
    name: 'Ribbon Rejection & Close < EMA 8',
    shortDesc: 'Rejection or engulfing candle closes below EMA 8',
    fullDesc: 'Price rejects the ribbon with rejection candles or a strong engulfing candle, and closes decisively below EMA 8.',
    hint: 'Never enter mid-candle; wait for the candle to close beyond EMA 8.'
  },
  {
    id: 'stop',
    number: 4,
    name: 'SL Above Breakout Candle',
    shortDesc: 'Stop loss placed above breakout candle',
    fullDesc: 'Stop loss is placed directly above the high of the breakout/rejection candle.',
    hint: 'Structural protection; an immediate breach of the trigger candle invalidates the entry.'
  },
  {
    id: 'room',
    number: 5,
    name: 'Target: 1:2 RR Ratio',
    shortDesc: 'Strict 1:2 Risk-to-Reward target',
    fullDesc: 'Take profit target is set to a 1:2 RR ratio (TP distance = 2 × SL distance).',
    hint: 'Below the 1st band, bank high-probability 1:2 RR returns.'
  },
  {
    id: 'session',
    number: 6,
    name: 'RSI & Session Quality',
    shortDesc: 'RSI not extreme (>30 Short) & Active Session',
    fullDesc: 'RSI is not oversold (> 30 for Shorts), and session is active.',
    hint: 'Prevents shorting into exhausted momentum impulses.'
  }
];

export const SETUP_2_GATES_SHORT: GateInfo[] = [
  {
    id: 'permission',
    number: 1,
    name: 'Trend Strength > 24',
    shortDesc: 'Trend > 24 & Directional alignment',
    fullDesc: 'Trend strength / ADX is strictly above 24 on both NQ and ES, confirming underlying directional bias.',
    hint: 'Both A++ setups require Trend > 24.'
  },
  {
    id: 'location',
    number: 2,
    name: 'Location: Above 1st Band (Deep Pullback)',
    shortDesc: 'Price is above 1st Band with deep pullback',
    fullDesc: 'Price is above the 1st Band (for Short) and has pulled back deeply into the ribbon / RED line (EMA 22) or key 4H Gap.',
    hint: 'Deep retest sweeps weak hands before expansion.'
  },
  {
    id: 'trigger',
    number: 3,
    name: 'Deep Rejection & Close < EMA 8',
    shortDesc: 'Deep rejection candle closes back below EMA 8',
    fullDesc: 'Price rejects deeply off ribbon/EMA 22 with rejection candles or a strong engulfing candle closing back below EMA 8.',
    hint: 'Confirms baseline resistance held and momentum is reclaimed.'
  },
  {
    id: 'stop',
    number: 4,
    name: 'SL Above Breakout Candle',
    shortDesc: 'Stop loss placed above breakout candle',
    fullDesc: 'Stop loss is placed directly above the high of the breakout/rejection candle.',
    hint: 'Structural protection anchored strictly to the breakout trigger.'
  },
  {
    id: 'room',
    number: 5,
    name: 'Target: 2nd Band',
    shortDesc: 'Take profit targets the 2nd Volatility Band',
    fullDesc: 'Take profit is set to target the 2nd Volatility Band, capturing the full expansion move out of the deep retest.',
    hint: 'Deep pullbacks above 1st band offer larger runway to expand all the way to 2nd band.'
  },
  {
    id: 'session',
    number: 6,
    name: 'RSI Reset & Market Alignment',
    shortDesc: 'RSI reset to neutral & NQ/ES in agreement',
    fullDesc: 'RSI cooled off from extremes (reset near 40–60), session is active, and NQ/ES charts agree.',
    hint: 'Ensures deep pullback is an accumulation retest rather than a trend breakdown.'
  }
];

export function getGatesForScenario(scenario: ScenarioId, direction: Direction = 'Long'): GateInfo[] {
  if (scenario === 'SETUP_2_DEEP_RETEST') {
    return direction === 'Short' ? SETUP_2_GATES_SHORT : SETUP_2_GATES;
  }
  return direction === 'Short' ? SETUP_1_GATES_SHORT : SETUP_1_GATES;
}

export const GATES_CONFIG: GateInfo[] = SETUP_1_GATES;

export interface InstrumentSpec {
  symbol: Instrument;
  name: string;
  pointValue: number;
  tickSize: number;
  tickValue: number;
  defaultStopPoints: number;
}

export const INSTRUMENTS: Record<Instrument, InstrumentSpec> = {
  MNQ: {
    symbol: 'MNQ',
    name: 'Micro E-mini Nasdaq-100',
    pointValue: 2.0,
    tickSize: 0.25,
    tickValue: 0.5,
    defaultStopPoints: 20
  },
  MES: {
    symbol: 'MES',
    name: 'Micro E-mini S&P 500',
    pointValue: 5.0,
    tickSize: 0.25,
    tickValue: 1.25,
    defaultStopPoints: 5
  }
};

export interface ScenarioInfo {
  id: ScenarioId;
  code: string;
  label: string;
  description: string;
}

export const SCENARIOS: ScenarioInfo[] = [
  {
    id: 'SETUP_1_VELOCITY',
    code: 'Type A',
    label: 'Setup 1 (Type A): 1st Band Ribbon Rejection (1:2 RR)',
    description:
      'Trend > 24. Long: above 1st Band with rejection/engulfing close above EMA 8 (SL below breakout). Short: below 1st Band with rejection/engulfing close below EMA 8 (SL above breakout). TP: 1:2 RR.'
  },
  {
    id: 'SETUP_2_DEEP_RETEST',
    code: 'Type B',
    label: 'Setup 2 (Type B): Deep Retest Across 1st Band (Target: 2nd Band)',
    description:
      'Trend > 24. Long: below 1st Band deep pullback to ribbon/EMA 22, close back above EMA 8 (SL below breakout). Short: above 1st Band deep pullback to ribbon/EMA 22, close back below EMA 8 (SL above breakout). TP: 2nd Band.'
  },
  {
    id: 'Other',
    code: 'Other',
    label: 'Other: Discretionary Setup',
    description: 'Alternative discretionary scenario (specify in trade notes).'
  },
  {
    id: 'A',
    code: 'A',
    label: 'A: Shallow pullback (Legacy)',
    description: 'Quick pullback to EMA 8 in strong impulse trend.'
  },
  {
    id: 'B',
    code: 'B',
    label: 'B: Confluence pullback (Legacy)',
    description: 'High-conviction pullback into confluence zone of EMA 21 and session VWAP.'
  },
  {
    id: 'C',
    code: 'C',
    label: 'C: Deep pullback to EMA55 (Legacy)',
    description: 'Deeper corrective retest of baseline trend anchor (EMA 55).'
  },
  {
    id: 'D',
    code: 'D',
    label: 'D: Break and retest (Legacy)',
    description: 'Breakout above/below key level (PDH/PDL, range boundary) followed by clean retest.'
  },
  {
    id: 'E',
    code: 'E',
    label: 'E: Sweep and reclaim (Legacy)',
    description: 'Liquidity sweep of prior high/low followed by sharp reclaim back inside structure.'
  },
  {
    id: 'F',
    code: 'F',
    label: 'F: Range fade at ±2σ (Legacy)',
    description: 'Mean reversion fade at the outer ±2σ VWAP band back toward VWAP median.'
  },
  {
    id: 'G',
    code: 'G',
    label: 'G: Short pullback (Legacy)',
    description: 'Bearish trend confluence pullback into EMA 21 and downward-sloping VWAP.'
  }
];

export const PRIMARY_SETUPS = SCENARIOS.filter(
  (s) => s.id === 'SETUP_1_VELOCITY' || s.id === 'SETUP_2_DEEP_RETEST'
);

export interface ScaleExit {
  id: string;
  label: string; // T1, T2, Runner, Stop, Breakeven
  contracts: number;
  exitPrice: number;
  rMultiple: number;
  pnl: number;
  timestamp?: string;
}

export const DISCIPLINE_TAGS = [
  'Followed plan perfectly',
  'Target hit cleanly',
  'Moved stop to BE properly',
  'Held through minor chop',
  'Moved stop prematurely',
  'Cut winner too early',
  'FOMO exit',
  'Chased entry',
  'Impatience / Early entry',
  'Over-leveraged',
  'Slipped fill / Execution drag',
  'Revenge trade impulse resisted',
  'Traded through news spike'
];

export interface TradeRecord {
  id: string;
  createdAt: string;       // ISO string
  timestampET: string;     // Formatted ET time e.g. "2026-10-13 10:15:00"
  instrument: Instrument;
  direction: Direction;
  scenario: ScenarioId;
  scenarioCustomNote?: string;

  // Cross-market regime context
  mnqRegime: Regime;
  mnqBias: MarketBias;
  mesRegime: Regime;
  mesBias: MarketBias;
  chartsDisagree: boolean;
  adx: number;
  rsi: number;

  // 6 Pre-trade Gates & Grading
  gates: GateEvaluation;
  grade: TradeGrade;
  suggestedSize: 'full' | 'half' | 'skip';

  // Planned price levels
  riskDollars: number;
  entryPrice: number;
  stopPrice: number;
  target1Price: number;
  target2Price?: number;
  obstaclePrice: number;

  // Computed pre-trade metrics
  riskPoints: number;
  plannedR1: number;
  plannedR2?: number;
  obstacleR: number;
  obstacleWarning: boolean;
  calculatedContracts: number;
  actualContracts: number;

  // Screenshot references in IndexedDB
  entryImageId?: string;
  exitImageId?: string;

  // Post-trade outcome
  status: TradeStatus;
  exitTimestampET?: string;
  exits: ScaleExit[];
  blendedExitPrice?: number;
  realizedR?: number;
  netPnl?: number;
  outcome?: TradeOutcome;
  disciplineTags: string[];
  postTradeNotes?: string;
}
