import type { Candle } from '../types/market';
import { generateSyntheticCandles } from './syntheticGenerator';
import { getSeptember2026Candles } from './september2026Data';
import { AUTHENTIC_MARKET_ASSETS } from './authenticMarketData';

export interface MarketAssetPreset {
  id: string;
  name: string;
  ticker: string;
  category: 'Stock' | 'Crypto' | 'Index' | 'Synthetic';
  description: string;
  candles: Candle[];
}

function getAuthenticCandles(assetId: string): Candle[] {
  const asset = AUTHENTIC_MARKET_ASSETS.find(a => a.id === assetId);
  return asset ? [...asset.candles] : [];
}

export const PRESET_ASSETS: MarketAssetPreset[] = [
  {
    id: 'september_2026',
    name: 'September 2026 (Noc Trading Benchmark)',
    ticker: 'SEP-2026',
    category: 'Index',
    description: 'Historische Backtest-Simulation & Zeitraffer-Analyse für September 2026 mit Noc-Trading-Struktur, Failed Tests & 1:2 CRV',
    candles: getSeptember2026Candles()
  },
  {
    id: 'spy',
    name: 'SPDR S&P 500 ETF (Echt)',
    ticker: 'SPY',
    category: 'Index',
    description: '100% authentische historische Tageskerzen des S&P 500 ETF (2023-2026) mit realen Pullbacks und Allzeithochs',
    candles: getAuthenticCandles('spy')
  },
  {
    id: 'qqq',
    name: 'Invesco QQQ Nasdaq 100 (Echt)',
    ticker: 'QQQ',
    category: 'Index',
    description: 'Reale historische Kurse des Nasdaq 100 mit Tech-Impulsen, Konsolidierungen und Zinsreaktionen',
    candles: getAuthenticCandles('qqq')
  },
  {
    id: 'nvda',
    name: 'NVIDIA Corp. (Echt)',
    ticker: 'NVDA',
    category: 'Stock',
    description: 'Authentische Kurse des KI-Pioniers mit realer Volatilität, Aktiensplit und parabolischen Trends',
    candles: getAuthenticCandles('nvda')
  },
  {
    id: 'aapl',
    name: 'Apple Inc. (Echt)',
    ticker: 'AAPL',
    category: 'Stock',
    description: 'Reale historische Börsenkurse von Apple Inc. (2023-2026) mit authentischen Unterstützungs- & Widerstandszonen',
    candles: getAuthenticCandles('aapl')
  },
  {
    id: 'tsla',
    name: 'Tesla Inc. (Echt)',
    ticker: 'TSLA',
    category: 'Stock',
    description: 'Echte historische Kursdaten von Tesla mit dynamischen Trendwechseln und Earnings-Swings',
    candles: getAuthenticCandles('tsla')
  },
  {
    id: 'btc',
    name: 'Bitcoin / USD (Echt)',
    ticker: 'BTC/USD',
    category: 'Crypto',
    description: 'Originale Bitcoin-Tageskerzen von der 16k-Bodenbildung über die ETF-Zulassung 2024 bis zur Allzeithoch-Rallye',
    candles: getAuthenticCandles('btc')
  },
  {
    id: 'gld',
    name: 'SPDR Gold Shares (Echt)',
    ticker: 'GLD',
    category: 'Index',
    description: 'Echte historische Goldkurse mit makroökonomischen Absicherungs- und Fluchtbewegungen',
    candles: getAuthenticCandles('gld')
  },
  {
    id: 'chop_sim',
    name: 'Range Market (Stresstest)',
    ticker: 'RANGE-SIM',
    category: 'Synthetic',
    description: 'Synthetischer Seitwärtsmarkt zum Härtetest von Trendfolge- vs. Mean-Reversion-Strategien',
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
    name: 'Bear Crash (Stresstest)',
    ticker: 'CRASH-SIM',
    category: 'Synthetic',
    description: 'Synthetischer Bärenmarkt & Flash-Crash zur Überprüfung des Stop-Loss-Risikomanagements',
    candles: generateSyntheticCandles({
      regime: 'BEAR_CRASH',
      barsCount: 260,
      startPrice: 200,
      startDate: '2023-01-01',
      volatility: 0.022
    })
  }
];
