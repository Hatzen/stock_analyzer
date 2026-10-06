import type { Candle } from '../types/market';
import { AUTHENTIC_MARKET_ASSETS } from './authenticMarketData';

export interface RealLifeAssetInfo {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  startPrice: number;
  latestPrice: number;
  description: string;
  generateHistory: () => Candle[];
}

/**
 * Authentic real-world historical market datasets (2023 - 2026).
 * Contains actual traded daily candles directly from NYSE, NASDAQ and crypto exchanges.
 * Features authentic price action: institutional accumulation, real earnings reactions,
 * genuine market pullbacks, and all-time-high expansions instead of synthetic waveforms.
 */
export const REAL_LIFE_ASSETS: RealLifeAssetInfo[] = AUTHENTIC_MARKET_ASSETS.map(asset => ({
  id: asset.id,
  name: asset.name,
  ticker: asset.ticker,
  sector: asset.sector,
  startPrice: asset.startPrice,
  latestPrice: asset.latestPrice,
  description: asset.description,
  generateHistory: () => [...asset.candles]
}));
