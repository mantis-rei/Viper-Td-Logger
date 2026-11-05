import { TradeRecord } from '../types/trade';
import {
  bulkSaveScreenshots,
  deleteScreenshot,
  getAllScreenshots,
} from './screenshotStorage';

const TRADES_STORAGE_KEY = 'trade_logger_records_v1';

const LEGACY_SCENARIO_MIGRATION: Record<string, TradeRecord['scenario']> = {
  A: 'SETUP_1_VELOCITY',
  B: 'SETUP_1_VELOCITY',
  C: 'SETUP_2_DEEP_RETEST',
  D: 'SETUP_1_VELOCITY',
  E: 'SETUP_1_VELOCITY',
  F: 'SETUP_1_VELOCITY',
  G: 'SETUP_1_VELOCITY',
  Other: 'SETUP_1_VELOCITY',
};

function normalizeTradeRecord(raw: unknown): TradeRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const trade = raw as TradeRecord & { scenario?: string };
  const scenario = trade.scenario && LEGACY_SCENARIO_MIGRATION[trade.scenario]
    ? LEGACY_SCENARIO_MIGRATION[trade.scenario]
    : trade.scenario;
  if (scenario !== 'SETUP_1_VELOCITY' && scenario !== 'SETUP_2_DEEP_RETEST') return null;
  return { ...trade, scenario } as TradeRecord;
}

export function loadTradesFromStorage(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(TRADES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeTradeRecord).filter((t): t is TradeRecord => Boolean(t));
    if (normalized.length !== parsed.length) {
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (err) {
    console.error('Failed reading trades from localStorage', err);
    return [];
  }
}

export function hasStoredTrades(): boolean {
  try {
    return localStorage.getItem(TRADES_STORAGE_KEY) !== null;
  } catch (err) {
    console.error('Failed checking trade storage', err);
    return false;
  }
}

export function saveTradesToStorage(trades: TradeRecord[]): void {
  try {
    localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    console.error('Failed saving trades to localStorage', err);
  }
}

export async function deleteTradeAndAssets(id: string): Promise<TradeRecord[]> {
  const current = loadTradesFromStorage();
  const tradeToDelete = current.find((t) => t.id === id);

  if (tradeToDelete) {
    if (tradeToDelete.entryImageId) {
      await deleteScreenshot(tradeToDelete.entryImageId);
    }
    if (tradeToDelete.exitImageId) {
      await deleteScreenshot(tradeToDelete.exitImageId);
    }
  }

  const updated = current.filter((t) => t.id !== id);
  saveTradesToStorage(updated);
  return updated;
}

/**
 * Exports complete application state including all trades and full resolution screenshots
 */
export async function exportToJSON(): Promise<string> {
  const trades = loadTradesFromStorage();
  const screenshots = await getAllScreenshots();

  const backupPayload = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    tradesCount: trades.length,
    trades,
    screenshots,
  };

  return JSON.stringify(backupPayload, null, 2);
}

/**
 * Imports application state from JSON backup
 */
export async function importFromJSON(jsonString: string): Promise<{ count: number }> {
  const parsed = JSON.parse(jsonString);

  if (!parsed || !Array.isArray(parsed.trades)) {
    throw new Error('Invalid backup file: "trades" array not found.');
  }

  // Restore screenshots to IndexedDB if present
  if (parsed.screenshots && typeof parsed.screenshots === 'object') {
    await bulkSaveScreenshots(parsed.screenshots);
  }

  const existingTrades = loadTradesFromStorage();
  const existingMap = new Map(existingTrades.map((t) => [t.id, t]));

  // Merge or replace
  parsed.trades.forEach((trade: TradeRecord) => {
    existingMap.set(trade.id, trade);
  });

  const merged = Array.from(existingMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  saveTradesToStorage(merged);
  return { count: parsed.trades.length };
}

/**
 * Exports trades to standard CSV format
 */
export function exportToCSV(): string {
  const trades = loadTradesFromStorage();
  if (trades.length === 0) {
    return 'No trades recorded';
  }

  const headers = [
    'ID',
    'Timestamp ET',
    'Instrument',
    'Direction',
    'Scenario',
    'Grade',
    'Status',
    'Outcome',
    'Risk ($)',
    'Entry Price',
    'Stop Price',
    'Target 1',
    'First Obstacle',
    'Risk Points',
    'Contracts',
    'Blended Exit Price',
    'Realized R',
    'Net P&L ($)',
    'Room R to Obstacle',
    'Obstacle Warning',
    'MNQ Regime',
    'MNQ Bias',
    'MES Regime',
    'MES Bias',
    'Charts Disagree',
    'ADX',
    'RSI',
    'Gate 1 (Permission)',
    'Gate 2 (Location)',
    'Gate 3 (Trigger)',
    'Gate 4 (Stop)',
    'Gate 5 (Room)',
    'Gate 6 (Session)',
    'Discipline Tags',
    'Post Trade Notes'
  ];

  const escapeCSV = (val: unknown) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = trades.map((t) => [
    escapeCSV(t.id),
    escapeCSV(t.timestampET),
    escapeCSV(t.instrument),
    escapeCSV(t.direction),
    escapeCSV(t.scenario),
    escapeCSV(t.grade),
    escapeCSV(t.status),
    escapeCSV(t.outcome ?? 'OPEN'),
    escapeCSV(t.riskDollars),
    escapeCSV(t.entryPrice),
    escapeCSV(t.stopPrice),
    escapeCSV(t.target1Price),
    escapeCSV(t.obstaclePrice),
    escapeCSV(t.riskPoints),
    escapeCSV(t.actualContracts || t.calculatedContracts),
    escapeCSV(t.blendedExitPrice ?? ''),
    escapeCSV(t.realizedR ?? ''),
    escapeCSV(t.netPnl ?? ''),
    escapeCSV(t.obstacleR),
    escapeCSV(t.obstacleWarning ? 'YES' : 'NO'),
    escapeCSV(t.mnqRegime),
    escapeCSV(t.mnqBias),
    escapeCSV(t.mesRegime),
    escapeCSV(t.mesBias),
    escapeCSV(t.chartsDisagree ? 'YES' : 'NO'),
    escapeCSV(t.adx),
    escapeCSV(t.rsi),
    escapeCSV(t.gates.permission ? 'PASS' : 'FAIL'),
    escapeCSV(t.gates.location ? 'PASS' : 'FAIL'),
    escapeCSV(t.gates.trigger ? 'PASS' : 'FAIL'),
    escapeCSV(t.gates.stop ? 'PASS' : 'FAIL'),
    escapeCSV(t.gates.room ? 'PASS' : 'FAIL'),
    escapeCSV(t.gates.session ? 'PASS' : 'FAIL'),
    escapeCSV(t.disciplineTags ? t.disciplineTags.join('; ') : ''),
    escapeCSV(t.postTradeNotes ?? '')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates high-quality sample trades for initial demonstration of rule analytics
 */
export function getSampleTrades(): TradeRecord[] {
  return [
    {
      id: 'trade_sample_01',
      createdAt: '2026-10-12T14:42:00.000Z',
      timestampET: '2026-10-12 10:42:00 ET',
      instrument: 'MNQ',
      direction: 'Long',
      scenario: 'B',
      mnqRegime: 'TREND',
      mnqBias: 'BULL',
      mesRegime: 'TREND',
      mesBias: 'BULL',
      chartsDisagree: false,
      adx: 28.4,
      rsi: 54.2,
      gates: {
        permission: true,
        location: true,
        trigger: true,
        stop: true,
        room: true,
        session: true,
      },
      grade: 'A',
      suggestedSize: 'full',
      riskDollars: 150,
      entryPrice: 20450.0,
      stopPrice: 20425.0,
      target1Price: 20500.0,
      target2Price: 20525.0,
      obstaclePrice: 20540.0,
      riskPoints: 25.0,
      plannedR1: 2.0,
      plannedR2: 3.0,
      obstacleR: 3.6,
      obstacleWarning: false,
      calculatedContracts: 3,
      actualContracts: 3,
      status: 'CLOSED',
      exitTimestampET: '2026-10-12 11:25:00 ET',
      exits: [
        { id: 'ex_1', label: 'T1 (2 contracts)', contracts: 2, exitPrice: 20500.0, rMultiple: 2.0, pnl: 200 },
        { id: 'ex_2', label: 'Runner (1 contract)', contracts: 1, exitPrice: 20520.0, rMultiple: 2.8, pnl: 140 },
      ],
      blendedExitPrice: 20506.67,
      realizedR: 2.27,
      netPnl: 340.0,
      outcome: 'WIN',
      disciplineTags: ['Followed plan perfectly', 'Target hit cleanly'],
      postTradeNotes: 'Textbook EMA21 + VWAP bounce during NY Open. MNQ and MES both trending strongly.',
    },
    {
      id: 'trade_sample_02',
      createdAt: '2026-10-12T16:15:00.000Z',
      timestampET: '2026-10-12 12:15:00 ET',
      instrument: 'MNQ',
      direction: 'Long',
      scenario: 'A',
      mnqRegime: 'RANGE',
      mnqBias: 'FLAT',
      mesRegime: 'RANGE',
      mesBias: 'FLAT',
      chartsDisagree: true,
      adx: 16.5,
      rsi: 61.0,
      gates: {
        permission: false, // ADX < 20
        location: true,
        trigger: true,
        stop: true,
        room: false,       // Obstacle < 1.5R
        session: false,    // Dead Zone 12:15 ET!
      },
      grade: 'C',
      suggestedSize: 'skip',
      riskDollars: 150,
      entryPrice: 20490.0,
      stopPrice: 20470.0,
      target1Price: 20520.0,
      obstaclePrice: 20505.0,
      riskPoints: 20.0,
      plannedR1: 1.5,
      obstacleR: 0.75,
      obstacleWarning: true,
      calculatedContracts: 3,
      actualContracts: 3,
      status: 'CLOSED',
      exitTimestampET: '2026-10-12 12:45:00 ET',
      exits: [
        { id: 'ex_1', label: 'Full Stop Out', contracts: 3, exitPrice: 20470.0, rMultiple: -1.0, pnl: -120 },
      ],
      blendedExitPrice: 20470.0,
      realizedR: -1.0,
      netPnl: -120.0,
      outcome: 'LOSS',
      disciplineTags: ['Impatience / Early entry', 'FOMO exit'],
      postTradeNotes: 'Forced trade inside the 12:15 lunch dead zone. Obstacle (PDH) was right above entry with no room.',
    },
    {
      id: 'trade_sample_03',
      createdAt: '2026-10-12T19:20:00.000Z',
      timestampET: '2026-10-12 15:20:00 ET',
      instrument: 'MES',
      direction: 'Short',
      scenario: 'G',
      mnqRegime: 'TREND',
      mnqBias: 'BEAR',
      mesRegime: 'TREND',
      mesBias: 'BEAR',
      chartsDisagree: false,
      adx: 32.1,
      rsi: 41.5,
      gates: {
        permission: true,
        location: true,
        trigger: true,
        stop: true,
        room: true,
        session: true, // Power hour
      },
      grade: 'A',
      suggestedSize: 'full',
      riskDollars: 150,
      entryPrice: 5850.0,
      stopPrice: 5856.0,
      target1Price: 5838.0,
      target2Price: 5830.0,
      obstaclePrice: 5825.0,
      riskPoints: 6.0,
      plannedR1: 2.0,
      plannedR2: 3.33,
      obstacleR: 4.17,
      obstacleWarning: false,
      calculatedContracts: 5,
      actualContracts: 5,
      status: 'CLOSED',
      exitTimestampET: '2026-10-12 15:52:00 ET',
      exits: [
        { id: 'ex_1', label: 'T1 scale (3 contracts)', contracts: 3, exitPrice: 5838.0, rMultiple: 2.0, pnl: 180 },
        { id: 'ex_2', label: 'T2 scale (2 contracts)', contracts: 2, exitPrice: 5832.0, rMultiple: 3.0, pnl: 180 },
      ],
      blendedExitPrice: 5835.6,
      realizedR: 2.4,
      netPnl: 360.0,
      outcome: 'WIN',
      disciplineTags: ['Followed plan perfectly', 'Target hit cleanly'],
      postTradeNotes: 'Power Hour short confluence pullback to EMA21 + downward VWAP. Smooth liquidation into the cash close.',
    },
    {
      id: 'trade_sample_04',
      createdAt: '2026-10-13T13:45:00.000Z',
      timestampET: '2026-10-13 09:45:00 ET',
      instrument: 'MNQ',
      direction: 'Long',
      scenario: 'D',
      mnqRegime: 'TREND',
      mnqBias: 'BULL',
      mesRegime: 'TREND',
      mesBias: 'BULL',
      chartsDisagree: false,
      adx: 34.0,
      rsi: 58.0,
      gates: {
        permission: true,
        location: true,
        trigger: true,
        stop: true,
        room: true,
        session: true,
      },
      grade: 'A',
      suggestedSize: 'full',
      riskDollars: 160,
      entryPrice: 20510.0,
      stopPrice: 20490.0,
      target1Price: 20550.0,
      target2Price: 20580.0,
      obstaclePrice: 20600.0,
      riskPoints: 20.0,
      plannedR1: 2.0,
      plannedR2: 3.5,
      obstacleR: 4.5,
      obstacleWarning: false,
      calculatedContracts: 4,
      actualContracts: 4,
      status: 'CLOSED',
      exitTimestampET: '2026-10-13 10:20:00 ET',
      exits: [
        { id: 'ex_1', label: 'T1 Hit (2 contracts)', contracts: 2, exitPrice: 20550.0, rMultiple: 2.0, pnl: 160 },
        { id: 'ex_2', label: 'Runner Stopped at BE (2 contracts)', contracts: 2, exitPrice: 20510.0, rMultiple: 0.0, pnl: 0 },
      ],
      blendedExitPrice: 20530.0,
      realizedR: 1.0,
      netPnl: 160.0,
      outcome: 'WIN',
      disciplineTags: ['Followed plan perfectly', 'Moved stop to BE properly'],
      postTradeNotes: 'Clean breakout and retest of PDH at 09:45. Took half off at +2R and let runner trail.',
    },
    {
      id: 'trade_sample_05',
      createdAt: '2026-10-13T14:10:00.000Z',
      timestampET: '2026-10-13 10:10:00 ET',
      instrument: 'MES',
      direction: 'Long',
      scenario: 'B',
      mnqRegime: 'TREND',
      mnqBias: 'BULL',
      mesRegime: 'RANGE',
      mesBias: 'FLAT',
      chartsDisagree: true,
      adx: 21.0,
      rsi: 52.0,
      gates: {
        permission: true,
        location: true,
        trigger: false, // Jumped in before candle closed
        stop: true,
        room: true,
        session: true,
      },
      grade: 'B',
      suggestedSize: 'half',
      riskDollars: 150,
      entryPrice: 5860.0,
      stopPrice: 5854.0,
      target1Price: 5872.0,
      obstaclePrice: 5875.0,
      riskPoints: 6.0,
      plannedR1: 2.0,
      obstacleR: 2.5,
      obstacleWarning: false,
      calculatedContracts: 5,
      actualContracts: 2, // Respected half size
      status: 'CLOSED',
      exitTimestampET: '2026-10-13 10:28:00 ET',
      exits: [
        { id: 'ex_1', label: 'Stop Loss', contracts: 2, exitPrice: 5854.0, rMultiple: -1.0, pnl: -60 },
      ],
      blendedExitPrice: 5854.0,
      realizedR: -1.0,
      netPnl: -60.0,
      outcome: 'LOSS',
      disciplineTags: ['Impatience / Early entry', 'Moved stop prematurely'],
      postTradeNotes: 'Entered mid-candle before confirmation trigger. MES was flat while MNQ surged; sizing down on Grade B saved $90.',
    },
    {
      id: 'trade_sample_06',
      createdAt: '2026-10-13T17:30:00.000Z',
      timestampET: '2026-10-13 13:30:00 ET',
      instrument: 'MNQ',
      direction: 'Short',
      scenario: 'F',
      mnqRegime: 'RANGE',
      mnqBias: 'FLAT',
      mesRegime: 'RANGE',
      mesBias: 'FLAT',
      chartsDisagree: false,
      adx: 18.0,
      rsi: 74.0,
      gates: {
        permission: false, // ADX < 20
        location: true,
        trigger: true,
        stop: true,
        room: true,
        session: false, // Dead zone
      },
      grade: 'C',
      suggestedSize: 'skip',
      riskDollars: 150,
      entryPrice: 20560.0,
      stopPrice: 20580.0,
      target1Price: 20520.0,
      obstaclePrice: 20500.0,
      riskPoints: 20.0,
      plannedR1: 2.0,
      obstacleR: 3.0,
      obstacleWarning: false,
      calculatedContracts: 3,
      actualContracts: 1,
      status: 'CLOSED',
      exitTimestampET: '2026-10-13 14:15:00 ET',
      exits: [
        { id: 'ex_1', label: 'Scratch / BE Exit', contracts: 1, exitPrice: 20559.0, rMultiple: 0.05, pnl: 2 },
      ],
      blendedExitPrice: 20559.0,
      realizedR: 0.05,
      netPnl: 2.0,
      outcome: 'BE',
      disciplineTags: ['Held through minor chop'],
      postTradeNotes: '±2σ range fade during dead zone. No momentum follow-through, scratched at breakeven.',
    },
    {
      id: 'trade_sample_07',
      createdAt: '2026-10-13T19:15:00.000Z',
      timestampET: '2026-10-13 15:15:00 ET',
      instrument: 'MNQ',
      direction: 'Long',
      scenario: 'E',
      mnqRegime: 'TREND',
      mnqBias: 'BULL',
      mesRegime: 'TREND',
      mesBias: 'BULL',
      chartsDisagree: false,
      adx: 29.5,
      rsi: 51.0,
      gates: {
        permission: true,
        location: true,
        trigger: true,
        stop: true,
        room: true,
        session: true,
      },
      grade: 'A',
      suggestedSize: 'full',
      riskDollars: 150,
      entryPrice: 20480.0,
      stopPrice: 20455.0,
      target1Price: 20530.0,
      target2Price: 20560.0,
      obstaclePrice: 20570.0,
      riskPoints: 25.0,
      plannedR1: 2.0,
      plannedR2: 3.2,
      obstacleR: 3.6,
      obstacleWarning: false,
      calculatedContracts: 3,
      actualContracts: 3,
      status: 'CLOSED',
      exitTimestampET: '2026-10-13 15:48:00 ET',
      exits: [
        { id: 'ex_1', label: 'T1 scale', contracts: 2, exitPrice: 20530.0, rMultiple: 2.0, pnl: 200 },
        { id: 'ex_2', label: 'T2 scale', contracts: 1, exitPrice: 20555.0, rMultiple: 3.0, pnl: 150 },
      ],
      blendedExitPrice: 20538.33,
      realizedR: 2.33,
      netPnl: 350.0,
      outcome: 'WIN',
      disciplineTags: ['Followed plan perfectly', 'Target hit cleanly'],
      postTradeNotes: 'Clean sweep of the 14:00 low and immediate reclaim with heavy delta into Power Hour.',
    }
  ];
}
