export type Instrument = 'MNQ' | 'MES';
export type Direction = 'Long' | 'Short';
export type Regime = 'TREND' | 'RANGE';
export type MarketBias = 'BULL' | 'BEAR' | 'FLAT';
export type ScenarioId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'Other';
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

export const GATES_CONFIG: GateInfo[] = [
  {
    id: 'permission',
    number: 1,
    name: 'Permission',
    shortDesc: 'Ribbon aligned, ADX ≥ 20, correct VWAP side',
    fullDesc: 'Ribbon (EMA 8/21/55) aligned with direction, ADX at or above 20, and price on the correct side of VWAP.',
    hint: 'Ensures higher-timeframe momentum and institutional trend filter.'
  },
  {
    id: 'location',
    number: 2,
    name: 'Location',
    shortDesc: 'Price is AT the zone, not beyond',
    fullDesc: 'Price is tested right AT the zone (EMA21, VWAP, or key level), not already drifted or extended past it.',
    hint: 'Prevents entering late or chasing away from value.'
  },
  {
    id: 'trigger',
    number: 3,
    name: 'Trigger',
    shortDesc: 'Candle closed back through zone',
    fullDesc: 'A 5m candle has closed back through the zone in the direction of the trend (not entered mid-candle or mid-move).',
    hint: 'Confirms rejection and momentum resumption.'
  },
  {
    id: 'stop',
    number: 4,
    name: 'Stop Placement',
    shortDesc: 'Beyond structure + buffer',
    fullDesc: 'Stop loss is placed safely beyond structural swing high/low plus a buffer (not just 1 tick past a moving average).',
    hint: 'Prevents premature stop-outs from normal micro wick noise.'
  },
  {
    id: 'room',
    number: 5,
    name: 'Room to Obstacle',
    shortDesc: 'First obstacle ≥ 1.5R away',
    fullDesc: 'The first major opposing obstacle (opposing FVG, PDH/PDL, overnight high/low, ±2σ band) is at least 1.5R away.',
    hint: 'Guarantees asymmetric reward-to-risk before encountering friction.'
  },
  {
    id: 'session',
    number: 6,
    name: 'Session Quality',
    shortDesc: 'NY Open or Power Hour window',
    fullDesc: 'Trade entry is inside NY Open (09:30–11:00 ET) or Power Hour (15:00–16:00 ET); avoids the 11:30–14:00 dead zone.',
    hint: 'Volume and institutional follow-through drop sharply during lunch and overnight.'
  }
];

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
    id: 'A',
    code: 'A',
    label: 'A: Shallow pullback',
    description: 'Quick pullback to EMA 8 in strong impulse trend.'
  },
  {
    id: 'B',
    code: 'B',
    label: 'B: Confluence pullback (EMA21 + VWAP)',
    description: 'High-conviction pullback into confluence zone of EMA 21 and session VWAP.'
  },
  {
    id: 'C',
    code: 'C',
    label: 'C: Deep pullback to EMA55',
    description: 'Deeper corrective retest of baseline trend anchor (EMA 55).'
  },
  {
    id: 'D',
    code: 'D',
    label: 'D: Break and retest',
    description: 'Breakout above/below key level (PDH/PDL, range boundary) followed by clean retest.'
  },
  {
    id: 'E',
    code: 'E',
    label: 'E: Sweep and reclaim',
    description: 'Liquidity sweep of prior high/low followed by sharp reclaim back inside structure.'
  },
  {
    id: 'F',
    code: 'F',
    label: 'F: Range fade at ±2σ',
    description: 'Mean reversion fade at the outer ±2σ VWAP band back toward VWAP median.'
  },
  {
    id: 'G',
    code: 'G',
    label: 'G: Short pullback (mirror of B)',
    description: 'Bearish trend confluence pullback into EMA 21 and downward-sloping VWAP.'
  },
  {
    id: 'Other',
    code: 'Other',
    label: 'Other setup',
    description: 'Alternative discretionary scenario (specify in trade notes).'
  }
];

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
