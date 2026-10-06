import type { Candle } from '../types/market';
import { generateSyntheticCandles } from './syntheticGenerator';
import { getSeptember2026Candles } from './september2026Data';

export interface MarketAssetPreset {
  id: string;
  name: string;
  ticker: string;
  category: 'Stock' | 'Crypto' | 'Index' | 'Synthetic';
  description: string;
  candles: Candle[];
}

export const PRESET_ASSETS: MarketAssetPreset[] = [
  {
    id: 'september_2026',
    name: 'September 2026 (Noc Trading)',
    ticker: 'SEP-2026',
    category: 'Index',
    description: 'Historische Backtest-Simulation & Zeitraffer-Analyse für September 2026 mit Noc-Trading-Struktur, Failed Tests & 1:2 CRV',
    candles: getSeptember2026Candles()
  },
  {
    id: 'aapl',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    category: 'Stock',
    description: 'Tech Mega-Cap mit sauberer Trendstruktur, Rücksetzern und Ausbrüchen',
    candles: generateSyntheticCandles({
      regime: 'BULL_TREND',
      barsCount: 300,
      startPrice: 155,
      startDate: '2023-01-03',
      volatility: 0.015
    })
  },
  {
    id: 'btc',
    name: 'Bitcoin / USDT',
    ticker: 'BTC/USDT',
    category: 'Crypto',
    description: 'Hochvolatiler Krypto-Markt mit ausgeprägten Liquiditäts-Sweeps und Order-Blöcken (ideal für SMC)',
    candles: generateSyntheticCandles({
      regime: 'VOLATILE_MOMENTUM',
      barsCount: 320,
      startPrice: 28500,
      startDate: '2023-03-01',
      volatility: 0.026
    })
  },
  {
    id: 'spy',
    name: 'SPDR S&P 500 ETF',
    ticker: 'SPY',
    category: 'Index',
    description: 'Breiter US-Aktienmarkt mit institutioneller Akkumulation und stetigem Trend',
    candles: generateSyntheticCandles({
      regime: 'BULL_TREND',
      barsCount: 280,
      startPrice: 410,
      startDate: '2023-02-15',
      volatility: 0.011
    })
  },
  {
    id: 'nvda',
    name: 'NVIDIA Corp.',
    ticker: 'NVDA',
    category: 'Stock',
    description: 'Parabolischer KI-Leader mit starken Impulswellen und Breakouts',
    candles: generateSyntheticCandles({
      regime: 'BULL_TREND',
      barsCount: 300,
      startPrice: 240,
      startDate: '2023-01-10',
      volatility: 0.024
    })
  },
  {
    id: 'chop_sim',
    name: 'Range Market (Chop)',
    ticker: 'RANGE-SIM',
    category: 'Synthetic',
    description: 'Seitwärtsmarkt zum Härtetest von Trendfolge- vs. Mean-Reversion-Strategien',
    candles: generateSyntheticCandles({
      regime: 'SIDEWAYS_CHOP',
      barsCount: 260,
      startPrice: 100,
      startDate: '2023-01-01',
      volatility: 0.016
    })
  },
  {
    id: 'crash_sim',
    name: 'Bear Crash Simulation',
    ticker: 'CRASH-SIM',
    category: 'Synthetic',
    description: 'Aggressiver Bärenmarkt & Flash-Crash zur Überprüfung des Risikomanagements und Short-Strategien',
    candles: generateSyntheticCandles({
      regime: 'BEAR_CRASH',
      barsCount: 260,
      startPrice: 200,
      startDate: '2023-01-01',
      volatility: 0.022
    })
  }
];
