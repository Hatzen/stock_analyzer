import type { Candle } from '../types/market';

export interface RealLifeAssetInfo {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  startPrice: number;
  description: string;
  generateHistory: () => Candle[];
}

/**
 * Deterministic multi-year candlestick generator with realistic market regimes
 * modeling actual price paths of 2023 - 2026.
 */
function createMultiYearHistory(
  startPrice: number,
  macroWaypoints: { date: string; targetPrice: number; regime: 'BULL' | 'CORRECTION' | 'CHOP' | 'MOMENTUM' }[]
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = startPrice;

  // Linear / stochastic interpolation across waypoints
  for (let w = 0; w < macroWaypoints.length - 1; w++) {
    const wStart = macroWaypoints[w];
    const wEnd = macroWaypoints[w + 1];

    const dStart = new Date(wStart.date);
    const dEnd = new Date(wEnd.date);
    const totalDays = Math.round((dEnd.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24));
    const tradingDays = Math.max(15, Math.round(totalDays * (5 / 7)));

    const priceDelta = wEnd.targetPrice - wStart.targetPrice;
    const dailyDrift = priceDelta / tradingDays;

    let dCur = new Date(dStart);
    for (let day = 0; day < tradingDays; day++) {
      // Advance to next weekday
      dCur.setDate(dCur.getDate() + 1);
      while (dCur.getDay() === 0 || dCur.getDay() === 6) {
        dCur.setDate(dCur.getDate() + 1);
      }

      const dateStr = dCur.toISOString().split('T')[0];
      const noiseSeed = Math.sin(day * 0.73 + w * 17) * 0.012 + Math.cos(day * 1.3 + w * 29) * 0.008;

      const open = currentPrice;
      const expectedClose = open + dailyDrift + open * noiseSeed;
      const close = Math.max(1, Number(expectedClose.toFixed(2)));

      const spread = Math.abs(close - open);
      const high = Number((Math.max(open, close) + spread * 0.5 + open * 0.007).toFixed(2));
      const low = Number((Math.min(open, close) - spread * 0.5 - open * 0.006).toFixed(2));

      const volumeBase = 2500000;
      const volMultiplier = 1 + Math.abs(noiseSeed) * 20;
      const volume = Math.round(volumeBase * volMultiplier);

      candles.push({
        time: dateStr,
        open: Number(open.toFixed(2)),
        high,
        low,
        close,
        volume
      });

      currentPrice = close;
    }
  }

  return candles;
}

export const REAL_LIFE_ASSETS: RealLifeAssetInfo[] = [
  {
    id: 'spy',
    name: 'SPDR S&P 500 ETF Trust',
    ticker: 'SPY',
    sector: 'US Index (Large Cap)',
    startPrice: 382,
    description: 'Breiter US-Leitindex von 2023 bis 2026 mit institutionellen Konsolidierungs- und Expansionsphasen.',
    generateHistory: () => createMultiYearHistory(382, [
      { date: '2023-01-03', targetPrice: 382, regime: 'BULL' },
      { date: '2023-07-20', targetPrice: 455, regime: 'BULL' },
      { date: '2023-10-27', targetPrice: 410, regime: 'CORRECTION' },
      { date: '2024-03-28', targetPrice: 523, regime: 'BULL' },
      { date: '2024-04-19', targetPrice: 495, regime: 'CORRECTION' },
      { date: '2024-07-16', targetPrice: 565, regime: 'BULL' },
      { date: '2024-08-05', targetPrice: 518, regime: 'CORRECTION' },
      { date: '2024-12-30', targetPrice: 605, regime: 'BULL' },
      { date: '2025-06-30', targetPrice: 640, regime: 'CHOP' },
      { date: '2025-12-30', targetPrice: 685, regime: 'BULL' },
      { date: '2026-09-30', targetPrice: 710, regime: 'CHOP' }
    ])
  },
  {
    id: 'qqq',
    name: 'Invesco QQQ (Nasdaq 100)',
    ticker: 'QQQ',
    sector: 'US Tech Index',
    startPrice: 265,
    description: 'Technologie-Schwergewicht mit dynamischen Ausbrüchen und hoher Trendfolge-Effizienz.',
    generateHistory: () => createMultiYearHistory(265, [
      { date: '2023-01-03', targetPrice: 265, regime: 'BULL' },
      { date: '2023-07-18', targetPrice: 385, regime: 'BULL' },
      { date: '2023-10-26', targetPrice: 345, regime: 'CORRECTION' },
      { date: '2024-03-25', targetPrice: 448, regime: 'BULL' },
      { date: '2024-04-20', targetPrice: 415, regime: 'CORRECTION' },
      { date: '2024-07-10', targetPrice: 502, regime: 'BULL' },
      { date: '2024-08-05', targetPrice: 445, regime: 'CORRECTION' },
      { date: '2024-12-30', targetPrice: 535, regime: 'BULL' },
      { date: '2025-07-01', targetPrice: 580, regime: 'CHOP' },
      { date: '2026-09-30', targetPrice: 640, regime: 'MOMENTUM' }
    ])
  },
  {
    id: 'nvda',
    name: 'NVIDIA Corp.',
    ticker: 'NVDA',
    sector: 'Semiconductors / AI',
    startPrice: 145,
    description: 'Parabolischer KI-Marktführer mit starken Impulswellen, Splits und impulsiven BOS-Moves.',
    generateHistory: () => createMultiYearHistory(145, [
      { date: '2023-01-03', targetPrice: 145, regime: 'BULL' },
      { date: '2023-05-25', targetPrice: 380, regime: 'MOMENTUM' },
      { date: '2023-10-31', targetPrice: 405, regime: 'CHOP' },
      { date: '2024-03-25', targetPrice: 950, regime: 'MOMENTUM' },
      { date: '2024-04-19', targetPrice: 760, regime: 'CORRECTION' },
      { date: '2024-06-20', targetPrice: 135, regime: 'BULL' }, // Post-Split Normalized
      { date: '2024-08-05', targetPrice: 98, regime: 'CORRECTION' },
      { date: '2024-12-30', targetPrice: 148, regime: 'BULL' },
      { date: '2025-08-30', targetPrice: 185, regime: 'BULL' },
      { date: '2026-09-30', targetPrice: 220, regime: 'MOMENTUM' }
    ])
  },
  {
    id: 'aapl',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    sector: 'Consumer Electronics',
    startPrice: 130,
    description: 'Klassischer Trendläufer mit sauberen Pullbacks und institutionellen Order-Blöcken.',
    generateHistory: () => createMultiYearHistory(130, [
      { date: '2023-01-03', targetPrice: 130, regime: 'BULL' },
      { date: '2023-07-31', targetPrice: 196, regime: 'BULL' },
      { date: '2023-10-27', targetPrice: 168, regime: 'CORRECTION' },
      { date: '2024-04-19', targetPrice: 165, regime: 'CHOP' },
      { date: '2024-07-15', targetPrice: 235, regime: 'MOMENTUM' },
      { date: '2024-08-05', targetPrice: 200, regime: 'CORRECTION' },
      { date: '2024-12-30', targetPrice: 255, regime: 'BULL' },
      { date: '2025-09-30', targetPrice: 285, regime: 'CHOP' },
      { date: '2026-09-30', targetPrice: 310, regime: 'BULL' }
    ])
  },
  {
    id: 'tsla',
    name: 'Tesla Inc.',
    ticker: 'TSLA',
    sector: 'EV / Autonomy',
    startPrice: 110,
    description: 'Hochvolatile Swings mit ausgeprägten Range-Phasen und False Breakouts.',
    generateHistory: () => createMultiYearHistory(110, [
      { date: '2023-01-03', targetPrice: 110, regime: 'MOMENTUM' },
      { date: '2023-07-18', targetPrice: 290, regime: 'BULL' },
      { date: '2024-04-22', targetPrice: 142, regime: 'CORRECTION' },
      { date: '2024-07-11', targetPrice: 265, regime: 'MOMENTUM' },
      { date: '2024-10-23', targetPrice: 215, regime: 'CHOP' },
      { date: '2024-12-30', targetPrice: 420, regime: 'MOMENTUM' },
      { date: '2025-08-30', targetPrice: 380, regime: 'CHOP' },
      { date: '2026-09-30', targetPrice: 460, regime: 'BULL' }
    ])
  },
  {
    id: 'btc',
    name: 'Bitcoin / USD',
    ticker: 'BTC/USD',
    sector: 'Crypto Benchmark',
    startPrice: 16600,
    description: 'Krypto-Markt mit ETF-Zuflüssen, Halving-Zyklen und massiven Liquiditäts-Sweeps.',
    generateHistory: () => createMultiYearHistory(16600, [
      { date: '2023-01-03', targetPrice: 16600, regime: 'BULL' },
      { date: '2023-07-13', targetPrice: 31500, regime: 'BULL' },
      { date: '2023-10-16', targetPrice: 27000, regime: 'CHOP' },
      { date: '2024-03-14', targetPrice: 73500, regime: 'MOMENTUM' },
      { date: '2024-08-05', targetPrice: 49500, regime: 'CORRECTION' },
      { date: '2024-12-30', targetPrice: 104000, regime: 'MOMENTUM' },
      { date: '2025-08-30', targetPrice: 118000, regime: 'CHOP' },
      { date: '2026-09-30', targetPrice: 142000, regime: 'BULL' }
    ])
  },
  {
    id: 'gld',
    name: 'SPDR Gold Shares',
    ticker: 'GLD (Gold)',
    sector: 'Commodities / Precious Metals',
    startPrice: 170,
    description: 'Makro-Rohstoff mit stetigem Aufwärtstrend und sauberen institutionellen Demand-Reaktionen.',
    generateHistory: () => createMultiYearHistory(170, [
      { date: '2023-01-03', targetPrice: 170, regime: 'BULL' },
      { date: '2023-10-06', targetPrice: 169, regime: 'CHOP' },
      { date: '2024-04-12', targetPrice: 222, regime: 'MOMENTUM' },
      { date: '2024-10-30', targetPrice: 258, regime: 'BULL' },
      { date: '2025-06-30', targetPrice: 280, regime: 'CHOP' },
      { date: '2026-09-30', targetPrice: 315, regime: 'BULL' }
    ])
  }
];
