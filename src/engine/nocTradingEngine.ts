import type { Candle, SMCSwingPoint, SMCZone, FailedTestPoint } from '../types/market';
import { atr } from '../indicators/indicators';

export interface NocTradingConfig {
  pivotLength: number; // e.g. 4 or 5 bars lookback for macro swings
  riskRewardRatio: number; // e.g. 2.0 (1:2 CRV)
  atrMultiplierSL: number; // buffer behind relevant structural extreme (e.g. 0.4)
  allowBearishTrendTrades: boolean;
}

export interface NocSignal {
  type: 'BUY' | 'SELL';
  time: string;
  index: number;
  price: number;
  stopLoss: number;
  takeProfit: number;
  reason: string;
  zoneId?: string;
}

export interface NocAnalysisResult {
  swingPoints: SMCSwingPoint[];
  zones: SMCZone[];
  failedTests: FailedTestPoint[];
  signals: NocSignal[];
  currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

/**
 * Noc Trading Strategy Engine
 * 
 * Rules:
 * 1. Market Structure & Mapping: Trend via relevant structural Highs and Lows.
 *    Points only update when previous structural High/Low is broken (BOS).
 *    Intermediate noise candles are strictly ignored.
 * 2. Trend Determination: Bullish or Bearish. Trade strictly in trend direction.
 * 3. Weakness Recognition (Failed Tests): Pullbacks that fail to break previous relevant extreme.
 * 4. Entry & Stops: Entry at Demand/Supply zone of this weakness point.
 *    SL just behind relevant structural extreme. TP fixed at 1:2 CRV (or opposite structure).
 */
export function analyzeNocStructure(
  candles: Candle[],
  config: Partial<NocTradingConfig> = {}
): NocAnalysisResult {
  const pivotLength = config.pivotLength ?? 4;
  const rrRatio = config.riskRewardRatio ?? 2.0;
  const atrBufferMult = config.atrMultiplierSL ?? 0.4;
  const allowShorts = config.allowBearishTrendTrades ?? true;

  const atrValues = atr(candles, 14);

  const swingPoints: SMCSwingPoint[] = [];
  const zones: SMCZone[] = [];
  const failedTests: FailedTestPoint[] = [];
  const signals: NocSignal[] = [];

  let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'BULLISH';
  let activeDemandZones: SMCZone[] = [];
  let activeSupplyZones: SMCZone[] = [];

  // 1. Detect Macro Pivots (ignoring intermediate sub-candles)
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

  // Bar-by-bar evaluation to avoid lookahead bias
  let activeStructuralLow: SMCSwingPoint | null = null;
  let activeStructuralHigh: SMCSwingPoint | null = null;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentAtr = (atrValues[i] as number) || (candle.high - candle.low) || 1.0;

    const confirmedSwings = swingPoints.filter(sp => sp.index <= i - pivotLength);
    const confirmedHighs = confirmedSwings.filter(sp => sp.type === 'HIGH');
    const confirmedLows = confirmedSwings.filter(sp => sp.type === 'LOW');

    const recentHigh = confirmedHighs[confirmedHighs.length - 1] || null;
    const recentLow = confirmedLows[confirmedLows.length - 1] || null;

    // --- RULE 1: BREAK OF STRUCTURE (BOS) MAPPING ---
    // Bullish BOS: Candle Body closes above last relevant Structural High
    if (recentHigh && !recentHigh.isBOS && candle.close > recentHigh.price) {
      recentHigh.isBOS = true;
      recentHigh.bosTime = candle.time;
      recentHigh.bosPrice = candle.close.toString();
      recentHigh.classification = 'WEAK';
      currentTrend = 'BULLISH';

      // The low that triggered this impulse is the protected Structural Low
      const impulseLows = confirmedLows.filter(l => l.index >= recentHigh.index && l.index <= i);
      let strongLow = impulseLows.length > 0
        ? impulseLows.reduce((min, l) => (l.price < min.price ? l : min), impulseLows[0])
        : recentLow;

      if (strongLow) {
        strongLow.classification = 'STRONG';
        activeStructuralLow = strongLow;
      }

      // Order Block (Demand Zone): Last bearish candle before the impulse
      const originIdx = strongLow ? strongLow.index : Math.max(0, i - 8);
      let obIndex = -1;
      for (let s = i - 1; s >= originIdx; s--) {
        if (candles[s].close < candles[s].open) {
          obIndex = s;
          break;
        }
      }
      if (obIndex === -1) obIndex = originIdx;

      if (obIndex >= 0 && obIndex < candles.length) {
        const ob = candles[obIndex];
        const newDemand: SMCZone = {
          id: `noc_demand_${i}`,
          type: 'DEMAND',
          startTime: ob.time,
          topPrice: Math.max(ob.open, ob.close),
          bottomPrice: ob.low,
          isMitigated: false,
          label: `Demand (${ob.time})`
        };
        zones.push(newDemand);
        activeDemandZones.push(newDemand);
      }
    }

    // Bearish BOS: Candle Body closes below last relevant Structural Low
    if (recentLow && !recentLow.isBOS && candle.close < recentLow.price) {
      recentLow.isBOS = true;
      recentLow.bosTime = candle.time;
      recentLow.bosPrice = candle.close.toString();
      recentLow.classification = 'WEAK';
      currentTrend = 'BEARISH';

      const impulseHighs = confirmedHighs.filter(h => h.index >= recentLow.index && h.index <= i);
      let strongHigh = impulseHighs.length > 0
        ? impulseHighs.reduce((max, h) => (h.price > max.price ? h : max), impulseHighs[0])
        : recentHigh;

      if (strongHigh) {
        strongHigh.classification = 'STRONG';
        activeStructuralHigh = strongHigh;
      }

      const originIdx = strongHigh ? strongHigh.index : Math.max(0, i - 8);
      let obIndex = -1;
      for (let s = i - 1; s >= originIdx; s--) {
        if (candles[s].close > candles[s].open) {
          obIndex = s;
          break;
        }
      }
      if (obIndex === -1) obIndex = originIdx;

      if (obIndex >= 0 && obIndex < candles.length) {
        const ob = candles[obIndex];
        const newSupply: SMCZone = {
          id: `noc_supply_${i}`,
          type: 'SUPPLY',
          startTime: ob.time,
          topPrice: ob.high,
          bottomPrice: Math.min(ob.open, ob.close),
          isMitigated: false,
          label: `Supply (${ob.time})`
        };
        zones.push(newSupply);
        activeSupplyZones.push(newSupply);
      }
    }

    // --- RULE 2 & 3: SCHWÄCHE-ERKENNUNG (FAILED TESTS) & EINSTIEGE ---
    // Bullish Trend: Look for Pullbacks failing to break Strong Low (Weakness of Sellers)
    if (currentTrend === 'BULLISH' && activeStructuralLow && activeDemandZones.length > 0) {
      for (const zone of [...activeDemandZones]) {
        // Price touches into demand zone
        if (candle.low <= zone.topPrice && candle.high >= zone.bottomPrice) {
          // Check for Failed Test: Rejection wick, close stays well above Strong Low
          const failedLowTest = candle.low > activeStructuralLow.price && candle.close > candle.open;

          if (failedLowTest) {
            failedTests.push({
              index: i,
              time: candle.time,
              price: candle.low,
              testedLevelPrice: activeStructuralLow.price,
              type: 'FAILED_LOW',
              description: `Noc Schwäche-Test: Bären scheitern an ${activeStructuralLow.price.toFixed(2)}`
            });

            const entryPrice = candle.close;
            const stopLoss = Number((activeStructuralLow.price - currentAtr * atrBufferMult).toFixed(2));
            const risk = entryPrice - stopLoss;

            if (risk > 0) {
              const takeProfit = Number((entryPrice + risk * rrRatio).toFixed(2));

              signals.push({
                type: 'BUY',
                time: candle.time,
                index: i,
                price: entryPrice,
                stopLoss,
                takeProfit,
                reason: `Noc Long [Failed Test an Demand Zone, SL: $${stopLoss}, TP: $${takeProfit} (1:${rrRatio} CRV)]`,
                zoneId: zone.id
              });

              zone.isMitigated = true;
              zone.endTime = candle.time;
              activeDemandZones = activeDemandZones.filter(z => z.id !== zone.id);
            }
          }
        }
      }
    }

    // Bearish Trend: Look for Pullbacks failing to break Strong High (Weakness of Buyers)
    if (currentTrend === 'BEARISH' && allowShorts && activeStructuralHigh && activeSupplyZones.length > 0) {
      for (const zone of [...activeSupplyZones]) {
        if (candle.high >= zone.bottomPrice && candle.low <= zone.topPrice) {
          const failedHighTest = candle.high < activeStructuralHigh.price && candle.close < candle.open;

          if (failedHighTest) {
            failedTests.push({
              index: i,
              time: candle.time,
              price: candle.high,
              testedLevelPrice: activeStructuralHigh.price,
              type: 'FAILED_HIGH',
              description: `Noc Schwäche-Test: Bullen scheitern an ${activeStructuralHigh.price.toFixed(2)}`
            });

            const entryPrice = candle.close;
            const stopLoss = Number((activeStructuralHigh.price + currentAtr * atrBufferMult).toFixed(2));
            const risk = stopLoss - entryPrice;

            if (risk > 0) {
              const takeProfit = Number((entryPrice - risk * rrRatio).toFixed(2));

              signals.push({
                type: 'SELL',
                time: candle.time,
                index: i,
                price: entryPrice,
                stopLoss,
                takeProfit,
                reason: `Noc Short [Failed Test an Supply Zone, SL: $${stopLoss}, TP: $${takeProfit} (1:${rrRatio} CRV)]`,
                zoneId: zone.id
              });

              zone.isMitigated = true;
              zone.endTime = candle.time;
              activeSupplyZones = activeSupplyZones.filter(z => z.id !== zone.id);
            }
          }
        }
      }
    }
  }

  return {
    swingPoints,
    zones,
    failedTests,
    signals,
    currentTrend
  };
}
