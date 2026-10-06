import type { Candle, SMCSwingPoint, SMCZone } from '../types/market';
import { atr } from '../indicators/indicators';

export interface SMCConfig {
  pivotLength: number; // e.g. 5
  riskRewardRatio: number; // e.g. 2.0 (1:2 CRV)
  targetWeakLiquidity: boolean;
  atrMultiplierSL: number;
  demandSupplyMitigation: boolean;
}

export interface SMCSignal {
  type: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY' | 'SELL';
  time: string;
  index: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  zoneId?: string;
}

export interface SMCAnalysisResult {
  swingPoints: SMCSwingPoint[];
  zones: SMCZone[];
  signals: SMCSignal[];
  marketStructure: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * Algorithmic Market Structure Engine (Smart Money Concepts)
 * Identifies institutional market structure, Swing Highs/Lows, BOS,
 * Strong vs Weak levels, and Demand/Supply Order Blocks.
 */
export function analyzeMarketStructure(
  candles: Candle[],
  config: Partial<SMCConfig> = {}
): SMCAnalysisResult {
  const pivotLength = config.pivotLength ?? 5;
  const rrRatio = config.riskRewardRatio ?? 2.0;
  const atrBufferMult = config.atrMultiplierSL ?? 0.5;
  const targetWeak = config.targetWeakLiquidity ?? true;

  const atrValues = atr(candles, 14);

  const swingPoints: SMCSwingPoint[] = [];
  const zones: SMCZone[] = [];
  const signals: SMCSignal[] = [];

  let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let activeDemandZones: SMCZone[] = [];
  let activeSupplyZones: SMCZone[] = [];

  // Track potential pivots
  for (let i = pivotLength; i < candles.length - pivotLength; i++) {
    const current = candles[i];

    let isPivotHigh = true;
    for (let p = 1; p <= pivotLength; p++) {
      if (candles[i - p].high >= current.high || candles[i + p].high > current.high) {
        isPivotHigh = false;
        break;
      }
    }

    let isPivotLow = true;
    for (let p = 1; p <= pivotLength; p++) {
      if (candles[i - p].low <= current.low || candles[i + p].low < current.low) {
        isPivotLow = false;
        break;
      }
    }

    if (isPivotHigh) {
      swingPoints.push({
        index: i,
        time: current.time,
        price: current.high,
        type: 'HIGH',
        classification: 'NEUTRAL',
        isBOS: false
      });
    }

    if (isPivotLow) {
      swingPoints.push({
        index: i,
        time: current.time,
        price: current.low,
        type: 'LOW',
        classification: 'NEUTRAL',
        isBOS: false
      });
    }
  }

  let activeStrongLow: SMCSwingPoint | null = null;
  let activeStrongHigh: SMCSwingPoint | null = null;
  let activeWeakHigh: SMCSwingPoint | null = null;
  let activeWeakLow: SMCSwingPoint | null = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentAtr = (atrValues[i] as number) || (candle.high - candle.low);

    const confirmedSwings = swingPoints.filter(sp => sp.index <= i - pivotLength);
    const confirmedHighs = confirmedSwings.filter(sp => sp.type === 'HIGH');
    const confirmedLows = confirmedSwings.filter(sp => sp.type === 'LOW');

    const recentHigh = confirmedHighs[confirmedHighs.length - 1] || null;
    const recentLow = confirmedLows[confirmedLows.length - 1] || null;

    // --- 1. BOS DETECTION (CANDLE BODY CLOSE ONLY) ---
    if (recentHigh && !recentHigh.isBOS && candle.close > recentHigh.price) {
      recentHigh.isBOS = true;
      recentHigh.bosTime = candle.time;
      recentHigh.bosPrice = candle.close.toString();
      recentHigh.classification = 'WEAK';
      activeWeakHigh = recentHigh;
      currentTrend = 'BULLISH';

      const impulseLows = confirmedLows.filter(l => l.index >= recentHigh.index && l.index <= i);
      let strongLow: SMCSwingPoint | null = null;
      if (impulseLows.length > 0) {
        strongLow = impulseLows.reduce((min, l) => (l.price < min.price ? l : min), impulseLows[0]);
      } else if (recentLow) {
        strongLow = recentLow;
      }

      if (strongLow) {
        strongLow.classification = 'STRONG';
        activeStrongLow = strongLow;
      }

      // --- 2. DEMAND ORDER BLOCK ---
      let originIndex = strongLow ? strongLow.index : Math.max(0, i - 10);
      let orderBlockIndex = -1;

      for (let scan = i - 1; scan >= originIndex; scan--) {
        if (candles[scan].close < candles[scan].open) {
          orderBlockIndex = scan;
          break;
        }
      }

      if (orderBlockIndex === -1 && originIndex >= 0) {
        orderBlockIndex = originIndex;
      }

      if (orderBlockIndex >= 0 && orderBlockIndex < candles.length) {
        const obCandle = candles[orderBlockIndex];
        const newDemandZone: SMCZone = {
          id: `demand_${i}_${orderBlockIndex}`,
          type: 'DEMAND',
          startTime: obCandle.time,
          topPrice: Math.max(obCandle.open, obCandle.close),
          bottomPrice: obCandle.low,
          isMitigated: false,
          label: `Demand OB (${obCandle.time})`
        };
        zones.push(newDemandZone);
        activeDemandZones.push(newDemandZone);
      }
    }

    if (recentLow && !recentLow.isBOS && candle.close < recentLow.price) {
      recentLow.isBOS = true;
      recentLow.bosTime = candle.time;
      recentLow.bosPrice = candle.close.toString();
      recentLow.classification = 'WEAK';
      activeWeakLow = recentLow;
      currentTrend = 'BEARISH';

      const impulseHighs = confirmedHighs.filter(h => h.index >= recentLow.index && h.index <= i);
      let strongHigh: SMCSwingPoint | null = null;
      if (impulseHighs.length > 0) {
        strongHigh = impulseHighs.reduce((max, h) => (h.price > max.price ? h : max), impulseHighs[0]);
      } else if (recentHigh) {
        strongHigh = recentHigh;
      }

      if (strongHigh) {
        strongHigh.classification = 'STRONG';
        activeStrongHigh = strongHigh;
      }

      // --- 2. SUPPLY ORDER BLOCK ---
      let originIndex = strongHigh ? strongHigh.index : Math.max(0, i - 10);
      let orderBlockIndex = -1;

      for (let scan = i - 1; scan >= originIndex; scan--) {
        if (candles[scan].close > candles[scan].open) {
          orderBlockIndex = scan;
          break;
        }
      }

      if (orderBlockIndex === -1 && originIndex >= 0) {
        orderBlockIndex = originIndex;
      }

      if (orderBlockIndex >= 0 && orderBlockIndex < candles.length) {
        const obCandle = candles[orderBlockIndex];
        const newSupplyZone: SMCZone = {
          id: `supply_${i}_${orderBlockIndex}`,
          type: 'SUPPLY',
          startTime: obCandle.time,
          topPrice: obCandle.high,
          bottomPrice: Math.min(obCandle.open, obCandle.close),
          isMitigated: false,
          label: `Supply OB (${obCandle.time})`
        };
        zones.push(newSupplyZone);
        activeSupplyZones.push(newSupplyZone);
      }
    }

    // --- 3. RETRACEMENT EXECUTION (ENTRY ON DEMAND/SUPPLY TEST) ---
    if (currentTrend === 'BULLISH' && activeDemandZones.length > 0) {
      for (const demandZone of [...activeDemandZones]) {
        if (candle.low <= demandZone.topPrice && candle.high >= demandZone.bottomPrice) {
          const entryPrice = Math.min(candle.open, demandZone.topPrice);
          const strongLowLevel = activeStrongLow ? activeStrongLow.price : demandZone.bottomPrice;
          const stopLoss = Number((strongLowLevel - currentAtr * atrBufferMult).toFixed(2));
          const riskDistance = entryPrice - stopLoss;

          if (riskDistance > 0) {
            let takeProfit = Number((entryPrice + riskDistance * rrRatio).toFixed(2));
            if (targetWeak && activeWeakHigh && activeWeakHigh.price > entryPrice) {
              const weakTarget = activeWeakHigh.price;
              if (weakTarget > takeProfit) {
                takeProfit = weakTarget;
              }
            }

            signals.push({
              type: 'BUY',
              time: candle.time,
              index: i,
              price: entryPrice,
              stopLoss,
              takeProfit,
              reason: `SMC Demand Tap: Retest of Order Block [SL @ $${stopLoss}, TP @ $${takeProfit}]`,
              zoneId: demandZone.id
            });

            demandZone.isMitigated = true;
            demandZone.endTime = candle.time;
            activeDemandZones = activeDemandZones.filter(z => z.id !== demandZone.id);
          }
        }
      }
    }

    if (currentTrend === 'BEARISH' && activeSupplyZones.length > 0) {
      for (const supplyZone of [...activeSupplyZones]) {
        if (candle.high >= supplyZone.bottomPrice && candle.low <= supplyZone.topPrice) {
          const entryPrice = Math.max(candle.open, supplyZone.bottomPrice);
          const strongHighLevel = activeStrongHigh ? activeStrongHigh.price : supplyZone.topPrice;
          const stopLoss = Number((strongHighLevel + currentAtr * atrBufferMult).toFixed(2));
          const riskDistance = stopLoss - entryPrice;

          if (riskDistance > 0) {
            let takeProfit = Number((entryPrice - riskDistance * rrRatio).toFixed(2));
            if (targetWeak && activeWeakLow && activeWeakLow.price < entryPrice) {
              const weakTarget = activeWeakLow.price;
              if (weakTarget < takeProfit) {
                takeProfit = weakTarget;
              }
            }

            signals.push({
              type: 'SELL',
              time: candle.time,
              index: i,
              price: entryPrice,
              stopLoss,
              takeProfit,
              reason: `SMC Supply Tap: Retest of Order Block [SL @ $${stopLoss}, TP @ $${takeProfit}]`,
              zoneId: supplyZone.id
            });

            supplyZone.isMitigated = true;
            supplyZone.endTime = candle.time;
            activeSupplyZones = activeSupplyZones.filter(z => z.id !== supplyZone.id);
          }
        }
      }
    }
  }

  return {
    swingPoints,
    zones,
    signals,
    marketStructure: currentTrend
  };
}
