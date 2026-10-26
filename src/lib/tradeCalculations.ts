import {
  Direction,
  GateEvaluation,
  GateKey,
  INSTRUMENTS,
  Instrument,
  MarketBias,
  Regime,
  ScaleExit,
  TradeGrade,
  TradeOutcome
} from '../types/trade';

export interface SessionStatus {
  timeETString: string;
  hourET: number;
  minuteET: number;
  sessionName: string;
  isHighQuality: boolean;
  isDeadZone: boolean;
  isOvernight: boolean;
  warningMessage?: string;
}

/**
 * Parses or formats date/time into US Eastern Time
 */
export function getEasternTimeInfo(dateInput?: Date | string | number): SessionStatus {
  const date = dateInput ? new Date(dateInput) : new Date();

  // Extract hours and minutes in America/New_York
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';

  const hour = parseInt(getPart('hour'), 10);
  const minute = parseInt(getPart('minute'), 10);
  const totalMinutes = hour * 60 + minute;

  const yyyy = getPart('year');
  const mm = getPart('month');
  const dd = getPart('day');
  const hh = getPart('hour').padStart(2, '0');
  const min = getPart('minute').padStart(2, '0');
  const ss = getPart('second').padStart(2, '0');

  const timeETString = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} ET`;

  // Sessions in minutes:
  // NY Open: 09:30 (570) to 11:00 (660)
  // Mid Morning: 11:00 (660) to 11:30 (690)
  // Dead Zone (Lunch): 11:30 (690) to 14:00 (840)
  // Afternoon: 14:00 (840) to 15:00 (900)
  // Power Hour: 15:00 (900) to 16:00 (960)
  // Overnight: < 570 or > 960

  const isNyOpen = totalMinutes >= 570 && totalMinutes <= 660;
  const isPowerHour = totalMinutes >= 900 && totalMinutes <= 960;
  const isDeadZone = totalMinutes >= 690 && totalMinutes < 840;
  const isRegular = (totalMinutes > 660 && totalMinutes < 690) || (totalMinutes >= 840 && totalMinutes < 900);
  const isOvernight = totalMinutes < 570 || totalMinutes > 960;

  let sessionName = 'Regular Trading';
  let isHighQuality = false;
  let warningMessage: string | undefined;

  if (isNyOpen) {
    sessionName = 'NY Open (09:30 - 11:00)';
    isHighQuality = true;
  } else if (isPowerHour) {
    sessionName = 'Power Hour (15:00 - 16:00)';
    isHighQuality = true;
  } else if (isDeadZone) {
    sessionName = 'Dead Zone / Lunch (11:30 - 14:00)';
    isHighQuality = false;
    warningMessage = 'Dead Zone (11:30-14:00 ET): Low liquidity & chop risk';
  } else if (isOvernight) {
    sessionName = 'Overnight / Globex';
    isHighQuality = false;
    warningMessage = 'Overnight session: Lower volume & wider spreads';
  } else if (isRegular) {
    sessionName = 'Mid-day Window';
    isHighQuality = true;
  }

  return {
    timeETString,
    hourET: hour,
    minuteET: minute,
    sessionName,
    isHighQuality,
    isDeadZone,
    isOvernight,
    warningMessage,
  };
}

/**
 * Returns current local ISO string formatted for input datetime-local
 */
export function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/**
 * Determines whether MNQ and MES charts disagree
 */
export function checkChartDisagreement(
  tradeDirection: Direction,
  mnqRegime: Regime,
  mnqBias: MarketBias,
  mesRegime: Regime,
  mesBias: MarketBias
): { disagree: boolean; reason: string } {
  // If direction biases oppose (e.g. BULL vs BEAR)
  if ((mnqBias === 'BULL' && mesBias === 'BEAR') || (mnqBias === 'BEAR' && mesBias === 'BULL')) {
    return {
      disagree: true,
      reason: `Direct divergence: MNQ is ${mnqBias} while MES is ${mesBias}.`,
    };
  }

  // If trade is Long but one is BEAR
  if (tradeDirection === 'Long' && (mnqBias === 'BEAR' || mesBias === 'BEAR')) {
    return {
      disagree: true,
      reason: `Trade is Long, but ${mnqBias === 'BEAR' ? 'MNQ' : 'MES'} is BEAR.`,
    };
  }

  // If trade is Short but one is BULL
  if (tradeDirection === 'Short' && (mnqBias === 'BULL' || mesBias === 'BULL')) {
    return {
      disagree: true,
      reason: `Trade is Short, but ${mnqBias === 'BULL' ? 'MNQ' : 'MES'} is BULL.`,
    };
  }

  // If regimes clash (one TREND, one RANGE)
  if (mnqRegime !== mesRegime) {
    return {
      disagree: true,
      reason: `Regime clash: MNQ is in ${mnqRegime} while MES is in ${mesRegime}.`,
    };
  }

  // If taking a trend trade while both are RANGE
  if (mnqRegime === 'RANGE' && mesRegime === 'RANGE') {
    return {
      disagree: true,
      reason: 'Both MNQ and MES are in RANGE mode (trend pullback may get chopped).',
    };
  }

  return { disagree: false, reason: 'MNQ and MES are aligned.' };
}

/**
 * Evaluates the 6 Gates to compute Grade and suggested position sizing
 */
export function evaluateGates(gates: GateEvaluation): {
  grade: TradeGrade;
  failedCount: number;
  passedCount: number;
  failedGates: GateKey[];
  suggestedSize: 'full' | 'half' | 'skip';
} {
  const keys: GateKey[] = ['permission', 'location', 'trigger', 'stop', 'room', 'session'];
  const failedGates = keys.filter((k) => !gates[k]);
  const failedCount = failedGates.length;
  const passedCount = 6 - failedCount;

  let grade: TradeGrade = 'A';
  let suggestedSize: 'full' | 'half' | 'skip' = 'full';

  if (failedCount === 0) {
    grade = 'A';
    suggestedSize = 'full';
  } else if (failedCount === 1) {
    grade = 'B';
    suggestedSize = 'half';
  } else {
    grade = 'C';
    suggestedSize = 'skip';
  }

  return {
    grade,
    failedCount,
    passedCount,
    failedGates,
    suggestedSize,
  };
}

/**
 * Calculates risk points, planned R-multiples, obstacle room, and contract sizing
 */
export function calculatePreTradeMetrics(params: {
  instrument: Instrument;
  direction: Direction;
  riskDollars: number;
  entryPrice: number;
  stopPrice: number;
  target1Price: number;
  target2Price?: number;
  obstaclePrice: number;
}) {
  const {
    instrument,
    direction,
    riskDollars,
    entryPrice,
    stopPrice,
    target1Price,
    target2Price,
    obstaclePrice,
  } = params;

  const spec = INSTRUMENTS[instrument];

  // Stop distance in points
  const riskPoints =
    direction === 'Long'
      ? Math.max(0, entryPrice - stopPrice)
      : Math.max(0, stopPrice - entryPrice);

  // Planned R to T1
  const t1Points =
    direction === 'Long'
      ? target1Price - entryPrice
      : entryPrice - target1Price;

  const plannedR1 = riskPoints > 0 ? Number((t1Points / riskPoints).toFixed(2)) : 0;

  // Planned R to T2
  let plannedR2: number | undefined;
  if (target2Price && target2Price > 0) {
    const t2Points =
      direction === 'Long'
        ? target2Price - entryPrice
        : entryPrice - target2Price;
    plannedR2 = riskPoints > 0 ? Number((t2Points / riskPoints).toFixed(2)) : 0;
  }

  // Room to first obstacle
  const obstaclePoints =
    direction === 'Long'
      ? obstaclePrice - entryPrice
      : entryPrice - obstaclePrice;

  const obstacleR = riskPoints > 0 ? Number((obstaclePoints / riskPoints).toFixed(2)) : 0;
  const obstacleWarning = obstacleR < 1.5;

  // Position sizing: floor(risk$ / (stop distance in points * point value))
  let calculatedContracts = 0;
  if (riskPoints > 0 && riskDollars > 0) {
    const dollarPerContract = riskPoints * spec.pointValue;
    calculatedContracts = Math.max(1, Math.floor(riskDollars / dollarPerContract));
  }

  return {
    riskPoints: Number(riskPoints.toFixed(2)),
    plannedR1,
    plannedR2,
    obstacleR,
    obstacleWarning,
    calculatedContracts,
    pointValue: spec.pointValue,
  };
}

/**
 * Calculates blended exit price, net P&L, realized R-multiple, and trade outcome
 */
export function calculateBlendedExits(params: {
  instrument: Instrument;
  direction: Direction;
  entryPrice: number;
  riskPoints: number;
  exits: ScaleExit[];
}): {
  totalContracts: number;
  blendedExitPrice: number;
  netPnl: number;
  realizedR: number;
  outcome: TradeOutcome;
} {
  const { instrument, direction, entryPrice, riskPoints, exits } = params;
  const spec = INSTRUMENTS[instrument];

  if (!exits || exits.length === 0) {
    return {
      totalContracts: 0,
      blendedExitPrice: entryPrice,
      netPnl: 0,
      realizedR: 0,
      outcome: 'BE',
    };
  }

  let totalContracts = 0;
  let weightedPriceSum = 0;
  let netPnl = 0;

  exits.forEach((exit) => {
    const contracts = Number(exit.contracts) || 0;
    const price = Number(exit.exitPrice) || 0;
    totalContracts += contracts;
    weightedPriceSum += price * contracts;

    const pointDelta = direction === 'Long' ? price - entryPrice : entryPrice - price;
    const exitPnl = pointDelta * contracts * spec.pointValue;
    netPnl += exitPnl;
  });

  const blendedExitPrice = totalContracts > 0 ? weightedPriceSum / totalContracts : entryPrice;

  // Realized R = Total P&L / (totalContracts * riskPoints * pointValue)
  const initialDollarRisk = totalContracts * riskPoints * spec.pointValue;
  const realizedR =
    initialDollarRisk > 0 ? Number((netPnl / initialDollarRisk).toFixed(2)) : 0;

  let outcome: TradeOutcome = 'BE';
  if (realizedR > 0.1) {
    outcome = 'WIN';
  } else if (realizedR < -0.1) {
    outcome = 'LOSS';
  } else {
    outcome = 'BE';
  }

  return {
    totalContracts,
    blendedExitPrice: Number(blendedExitPrice.toFixed(2)),
    netPnl: Number(netPnl.toFixed(2)),
    realizedR,
    outcome,
  };
}
