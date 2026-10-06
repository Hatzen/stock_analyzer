import type { Candle } from '../types/market';

/**
 * Simple Moving Average (SMA)
 */
export function sma(data: number[] | Candle[], period: number): (number | null)[] {
  const values = typeof data[0] === 'number' ? (data as number[]) : (data as Candle[]).map(c => c.close);
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) {
      sum -= values[i - period];
    }
    if (i >= period - 1) {
      result.push(Number((sum / period).toFixed(4)));
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function ema(data: number[] | Candle[], period: number): (number | null)[] {
  const values = typeof data[0] === 'number' ? (data as number[]) : (data as Candle[]).map(c => c.close);
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  let previousEma: number | null = null;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      const initialSlice = values.slice(0, period);
      const initialAvg = initialSlice.reduce((a, b) => a + b, 0) / period;
      previousEma = initialAvg;
      result.push(Number(initialAvg.toFixed(4)));
    } else {
      if (previousEma !== null) {
        const currentEmaVal: number = (values[i] - previousEma) * multiplier + previousEma;
        previousEma = currentEmaVal;
        result.push(Number(currentEmaVal.toFixed(4)));
      } else {
        result.push(null);
      }
    }
  }
  return result;
}

/**
 * Relative Strength Index (RSI)
 */
export function rsi(data: number[] | Candle[], period: number = 14): (number | null)[] {
  const values = typeof data[0] === 'number' ? (data as number[]) : (data as Candle[]).map(c => c.close);
  const result: (number | null)[] = [];

  if (values.length <= period) {
    return values.map(() => null);
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(Number((100 - (100 / (1 + rs))).toFixed(2)));

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      rs = avgGain / avgLoss;
      result.push(Number((100 - (100 / (1 + rs))).toFixed(2)));
    }
  }

  return result;
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(
  data: number[] | Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const values = typeof data[0] === 'number' ? (data as number[]) : (data as Candle[]).map(c => c.close);
  const fastEma = ema(values, fastPeriod);
  const slowEma = ema(values, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (fastEma[i] !== null && slowEma[i] !== null) {
      macdLine.push(Number((fastEma[i]! - slowEma[i]!).toFixed(4)));
    } else {
      macdLine.push(null);
    }
  }

  const validMacdIndices = macdLine.map((val, idx) => (val !== null ? idx : -1)).filter(idx => idx !== -1);
  const validMacdValues = validMacdIndices.map(idx => macdLine[idx] as number);

  const rawSignal = ema(validMacdValues, signalPeriod);

  const signalLine: (number | null)[] = new Array(values.length).fill(null);
  const histogram: (number | null)[] = new Array(values.length).fill(null);

  for (let j = 0; j < validMacdIndices.length; j++) {
    const origIdx = validMacdIndices[j];
    const sigVal = rawSignal[j];
    signalLine[origIdx] = sigVal;
    if (sigVal !== null && macdLine[origIdx] !== null) {
      histogram[origIdx] = Number((macdLine[origIdx]! - sigVal).toFixed(4));
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  };
}

/**
 * Bollinger Bands
 */
export interface BollingerResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function bollingerBands(
  data: number[] | Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerResult {
  const values = typeof data[0] === 'number' ? (data as number[]) : (data as Candle[]).map(c => c.close);
  const middle = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < values.length; i++) {
    const mid = middle[i];
    if (mid === null || i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    const slice = values.slice(i - period + 1, i + 1);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mid, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push(Number((mid + stdDevMultiplier * stdDev).toFixed(4)));
    lower.push(Number((mid - stdDevMultiplier * stdDev).toFixed(4)));
  }

  return { upper, middle, lower };
}

/**
 * Average True Range (ATR)
 */
export function atr(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length < 2) return candles.map(() => null);

  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prevClose),
      Math.abs(c.low - prevClose)
    );
    trueRanges.push(tr);
  }

  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  let prevAtr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(Number(prevAtr.toFixed(4)));

  for (let i = period; i < trueRanges.length; i++) {
    const currentAtr = (prevAtr * (period - 1) + trueRanges[i]) / period;
    prevAtr = currentAtr;
    result.push(Number(currentAtr.toFixed(4)));
  }

  return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function vwap(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume || 1;

    cumulativeTypicalVolume += typicalPrice * vol;
    cumulativeVolume += vol;

    if (cumulativeVolume > 0) {
      result.push(Number((cumulativeTypicalVolume / cumulativeVolume).toFixed(4)));
    } else {
      result.push(null);
    }
  }

  return result;
}

/**
 * Highest value over period
 */
export function highest(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let maxVal = -Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (candles[j].high > maxVal) maxVal = candles[j].high;
      }
      result.push(maxVal);
    }
  }
  return result;
}

/**
 * Lowest value over period
 */
export function lowest(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let minVal = Infinity;
      for (let j = i - period + 1; j <= i; j++) {
        if (candles[j].low < minVal) minVal = candles[j].low;
      }
      result.push(minVal);
    }
  }
  return result;
}

/**
 * Crossover helper
 */
export function crossover(
  lineA: (number | null)[],
  lineB: (number | null)[] | number,
  index: number
): boolean {
  if (index <= 0) return false;
  const aCurr = lineA[index];
  const aPrev = lineA[index - 1];

  const bCurr = typeof lineB === 'number' ? lineB : lineB[index];
  const bPrev = typeof lineB === 'number' ? lineB : lineB[index - 1];

  if (aCurr === null || aPrev === null || bCurr === null || bPrev === null) return false;
  return aPrev <= bPrev && aCurr > bCurr;
}

/**
 * Crossunder helper
 */
export function crossunder(
  lineA: (number | null)[],
  lineB: (number | null)[] | number,
  index: number
): boolean {
  if (index <= 0) return false;
  const aCurr = lineA[index];
  const aPrev = lineA[index - 1];

  const bCurr = typeof lineB === 'number' ? lineB : lineB[index];
  const bPrev = typeof lineB === 'number' ? lineB : lineB[index - 1];

  if (aCurr === null || aPrev === null || bCurr === null || bPrev === null) return false;
  return aPrev >= bPrev && aCurr < bCurr;
}

export const Indicators = {
  sma,
  ema,
  rsi,
  macd,
  bollingerBands,
  atr,
  vwap,
  highest,
  lowest,
  crossover,
  crossunder
};
