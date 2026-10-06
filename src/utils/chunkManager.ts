import type { Candle, DataChunk, ChunkDuration, ChunkComparisonMetric, SimulationSettings } from '../types/market';
import { executeStrategyCode } from '../engine/strategyRunner';

/**
 * Splits a continuous series of candles into standardized, comparable chunks
 * by calendar month ('1M'), quarter ('3M'), half-year ('6M') or year ('1Y').
 */
export function generateChunks(candles: Candle[], duration: ChunkDuration): DataChunk[] {
  if (!candles || candles.length === 0) return [];

  const chunksMap = new Map<string, Candle[]>();

  for (const c of candles) {
    const date = new Date(c.time);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    let chunkKey = '';
    if (duration === '1M') {
      const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
      chunkKey = `${monthNames[month]} ${year}`;
    } else if (duration === '3M') {
      const q = Math.floor(month / 3) + 1;
      chunkKey = `Q${q} ${year}`;
    } else if (duration === '6M') {
      const h = month < 6 ? 'H1' : 'H2';
      chunkKey = `${h} ${year}`;
    } else if (duration === '1Y') {
      chunkKey = `${year}`;
    }

    if (!chunksMap.has(chunkKey)) {
      chunksMap.set(chunkKey, []);
    }
    chunksMap.get(chunkKey)!.push(c);
  }

  const chunks: DataChunk[] = [];
  let index = 1;

  for (const [name, candleList] of chunksMap.entries()) {
    if (candleList.length < 5) continue; // Skip incomplete edge bars

    const startDate = candleList[0].time;
    const endDate = candleList[candleList.length - 1].time;
    const priceChange = ((candleList[candleList.length - 1].close - candleList[0].open) / candleList[0].open) * 100;

    let regimeHint = 'Seitwärtsphase';
    if (priceChange > 8) regimeHint = 'Starker Bull-Trend';
    else if (priceChange > 2) regimeHint = 'Moderater Aufwärtstrend';
    else if (priceChange < -8) regimeHint = 'Starker Abverkauf / Crash';
    else if (priceChange < -2) regimeHint = 'Korrekturphase';

    chunks.push({
      id: `chunk_${index}_${name.replace(/\s+/g, '_')}`,
      name: `${name} (${regimeHint})`,
      startDate,
      endDate,
      candles: candleList,
      regimeHint
    });
    index++;
  }

  return chunks;
}

/**
 * Executes strategy across all chunks to create a comparative performance matrix
 */
export function evaluateAllChunks(
  chunks: DataChunk[],
  code: string,
  params: Record<string, any>,
  settings?: Partial<SimulationSettings>
): ChunkComparisonMetric[] {
  const metrics: ChunkComparisonMetric[] = [];

  for (const chunk of chunks) {
    try {
      const result = executeStrategyCode({
        candles: chunk.candles,
        code,
        params,
        settings
      });

      metrics.push({
        chunkId: chunk.id,
        chunkName: chunk.name,
        startDate: chunk.startDate,
        endDate: chunk.endDate,
        totalReturn: result.metrics.totalReturn,
        benchmarkReturn: result.metrics.benchmarkReturn,
        winRate: result.metrics.winRate,
        profitFactor: result.metrics.profitFactor,
        maxDrawdown: result.metrics.maxDrawdown,
        tradesCount: result.metrics.totalTrades,
        sharpeRatio: result.metrics.sharpeRatio
      });
    } catch {
      // Continue on edge error
    }
  }

  return metrics;
}
