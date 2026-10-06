import type { Candle } from '../types/market';
import { AUTHENTIC_MARKET_ASSETS } from './authenticMarketData';
import { AUTHENTIC_HOURLY_MARKET_DATA } from './hourlyMarketData';

export type MarketTimeframe = '1H' | '1D';

export interface RealLifeAssetInfo {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  startPrice: number;
  latestPrice: number;
  description: string;
  generateHistory: (timeframe?: MarketTimeframe) => Candle[];
}

/**
 * Authentic real-world historical market datasets (2023 - 2026).
 * Supports both:
 * - '1H': High-resolution 1-Hour intraday candles (~2,000 bars/year) - Ideal for Noc Trading & Daytrading (100+ trades/year)
 * - '1D': Daily candles (~252 bars/year) - For macro structural swing analysis
 */
export const REAL_LIFE_ASSETS: RealLifeAssetInfo[] = AUTHENTIC_MARKET_ASSETS.map(asset => ({
  id: asset.id,
  name: asset.name,
  ticker: asset.ticker,
  sector: asset.sector,
  startPrice: asset.startPrice,
  latestPrice: asset.latestPrice,
  description: asset.description,
  generateHistory: (timeframe: MarketTimeframe = '1H') => {
    if (timeframe === '1H' && AUTHENTIC_HOURLY_MARKET_DATA[asset.id]) {
      return [...AUTHENTIC_HOURLY_MARKET_DATA[asset.id]];
    }
    return [...asset.candles];
  }
}));
