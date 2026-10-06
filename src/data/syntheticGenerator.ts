import type { Candle } from '../types/market';

export type MarketRegime = 'BULL_TREND' | 'BEAR_CRASH' | 'SIDEWAYS_CHOP' | 'RANDOM_WALK' | 'VOLATILE_MOMENTUM';

export interface GeneratorOptions {
  regime: MarketRegime;
  barsCount: number;
  startPrice: number;
  startDate?: string;
  volatility?: number;
}

/**
 * Generates realistic candlestick data using Geometric Brownian Motion
 * with regime-specific drift, clustering volatility, and realistic intra-bar wicks.
 */
export function generateSyntheticCandles(options: GeneratorOptions): Candle[] {
  const {
    regime,
    barsCount = 250,
    startPrice = 150,
    startDate = '2023-01-01',
    volatility = 0.018
  } = options;

  const candles: Candle[] = [];
  let currentPrice = startPrice;
  const currentDate = new Date(startDate);

  let dailyDrift = 0.0005;
  let volFactor = volatility;
  let meanReversionTarget = startPrice;

  if (regime === 'BULL_TREND') {
    dailyDrift = 0.0018;
    volFactor = volatility * 0.9;
  } else if (regime === 'BEAR_CRASH') {
    dailyDrift = -0.0016;
    volFactor = volatility * 1.6;
  } else if (regime === 'SIDEWAYS_CHOP') {
    dailyDrift = 0;
    volFactor = volatility * 0.8;
  } else if (regime === 'VOLATILE_MOMENTUM') {
    dailyDrift = 0.001;
    volFactor = volatility * 2.0;
  }

  let seed = 42;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const normalRandom = () => {
    let u = 0, v = 0;
    while (u === 0) u = random();
    while (v === 0) v = random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  for (let i = 0; i < barsCount; i++) {
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const dateStr = currentDate.toISOString().split('T')[0];

    let currentDrift = dailyDrift;
    if (regime === 'SIDEWAYS_CHOP') {
      const dist = (currentPrice - meanReversionTarget) / meanReversionTarget;
      currentDrift = -dist * 0.06;
    } else if (regime === 'BEAR_CRASH' && i > barsCount * 0.3 && i < barsCount * 0.5) {
      currentDrift = -0.012;
      volFactor = volatility * 2.8;
    }

    const shock = normalRandom();
    const percentChange = currentDrift + volFactor * shock;

    const open = currentPrice;
    let close = open * (1 + percentChange);
    if (close < 1) close = 1;

    const barSpread = Math.abs(close - open);
    const upperWick = (barSpread * 0.8 + close * volFactor * 0.5) * random();
    const lowerWick = (barSpread * 0.8 + close * volFactor * 0.5) * random();

    const high = Number((Math.max(open, close) + upperWick).toFixed(2));
    const low = Number((Math.max(0.5, Math.min(open, close) - lowerWick)).toFixed(2));
    const finalOpen = Number(open.toFixed(2));
    const finalClose = Number(close.toFixed(2));

    const baseVolume = 1000000;
    const volumeMultiplier = 1 + Math.abs(percentChange) * 40 + random() * 0.5;
    const volume = Math.round(baseVolume * volumeMultiplier);

    candles.push({
      time: dateStr,
      open: finalOpen,
      high,
      low,
      close: finalClose,
      volume
    });

    currentPrice = finalClose;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return candles;
}
