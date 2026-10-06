import type { Candle, SMCSwingPoint, SMCZone, FailedTestPoint } from '../types/market';
import { atr } from '../indicators/indicators';

export interface NocTradingConfig {
  pivotLength: number; // e.g. 2 or 3 for intraday / swing
  riskRewardRatio: number; // e.g. 2.0 (1:2 CRV)
  atrMultiplierSL: number; // buffer behind relevant structural extreme (e.g. 0.25)
  allowBearishTrendTrades: boolean;
  useLocalPullbackSL?: boolean; // Use local pullback rejection extreme for SL (authentic daytrading rules)
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
 * Noc Trading Strategy Engine (Based on "My Super Simple Trading Strategy" by Noc Trading)
 * 
 * Rules:
 * 1. Market Structure & Mapping:
 *    - Relevante Swings (Hochs und Tiefs) identifizieren, Zwischenrauschen ignorieren.
 *    - Ein strukturrelevanter Punkt ändert sich erst per Strukturbruch (BOS = Candle Body Close).
 * 2. Trendbestimmung:
 *    - Bullish: Sequenz höherer Hochs und geschützter Tiefs.
 *    - Bearish: Sequenz tieferer Tiefs und geschützter Hochs.
 *    - Streng in Trendrichtung handeln!
 * 3. Schwäche-Erkennung (Failed Tests):
 *    - Pullbacks in Demand-/Supply-Zonen (Order Blocks vor dem BOS-Impuls).
 *    - Gegenpartei scheitert daran, ein neues Extremum zu formen (Erschöpfung / Luntensweep).
 * 4. Einstiege & Stops:
 *    - Einstieg bei Rejection / Schwäche der Bären/Bullen.
 *    - Stop-Loss geschützt hinter dem lokalen Schwäche-Tief/Hoch (+ Puffer).
 *    - Take-Profit: Festes 1:2 Chance-Risiko-Verhältnis (CRV).
 */
export function analyzeNocStructure(
  candles: Candle[],
  config: Partial<NocTradingConfig> = {}
): NocAnalysisResult {
  const pivotLength = config.pivotLength ?? 3;
  const rrRatio = config.riskRewardRatio ?? 2.0;
  const atrBufferMult = config.atrMultiplierSL ?? 0.25;
  const allowShorts = config.allowBearishTrendTrades ?? true;
  const useLocalSL = config.useLocalPullbackSL ?? true;

  const atrValues = atr(candles, 14);

  const swingPoints: SMCSwingPoint[] = [];
  const zones: SMCZone[] = [];
  const failedTests: FailedTestPoint[] = [];
  const signals: NocSignal[] = [];

  let currentTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'BULLISH';
  let activeDemandZones: SMCZone[] = [];
  let activeSupplyZones: SMCZone[] = [];

  // 1. Detect Pivots (filtering minor intra-candle noise)
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

  // 2. Bar-by-bar evaluation to avoid lookahead bias
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

      const impulseLows = confirmedLows.filter(l => l.index >= recentHigh.index && l.index <= i);
      let strongLow = impulseLows.length > 0
        ? impulseLows.reduce((min, l) => (l.price < min.price ? l : min), impulseLows[0])
        : recentLow;

      if (strongLow) {
        strongLow.classification = 'STRONG';
        activeStructuralLow = strongLow;
      }

      // Order Block (Demand Zone): Last bearish candle before the impulse
      const originIdx = strongLow ? strongLow.index : Math.max(0, i - 6);
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
          topPrice: Math.max(ob.open, ob.close) + currentAtr * 0.1,
          bottomPrice: ob.low - currentAtr * 0.05,
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

      const originIdx = strongHigh ? strongHigh.index : Math.max(0, i - 6);
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
          topPrice: ob.high + currentAtr * 0.05,
          bottomPrice: Math.min(ob.open, ob.close) - currentAtr * 0.1,
          isMitigated: false,
          label: `Supply (${ob.time})`
        };
        zones.push(newSupply);
        activeSupplyZones.push(newSupply);
      }
    }

    // Keep active zones manageable (max 5 active per side)
    if (activeDemandZones.length > 5) activeDemandZones = activeDemandZones.slice(-5);
    if (activeSupplyZones.length > 5) activeSupplyZones = activeSupplyZones.slice(-5);

    // --- RULE 2 & 3: SCHWÄCHE-ERKENNUNG (FAILED TESTS) & EINSTIEGE ---
    // Bullish Trend: Look for Pullbacks failing to break Strong Low (Weakness of Sellers)
    if (currentTrend === 'BULLISH' && activeStructuralLow && activeDemandZones.length > 0) {
      for (const zone of [...activeDemandZones]) {
        // Price touches into demand zone
        if (candle.low <= zone.topPrice && candle.high >= zone.bottomPrice) {
          // Check for Failed Test: Rejection wick, close stays above low
          const rejectionWick = (candle.close - candle.low) > (candle.high - candle.close) * 0.7;
          const failedLowTest = (candle.close > candle.open || rejectionWick) && candle.low > activeStructuralLow.price;

          if (failedLowTest) {
            failedTests.push({
              index: i,
              time: candle.time,
              price: candle.low,
              testedLevelPrice: activeStructuralLow.price,
              type: 'FAILED_LOW',
              description: `Noc Schwäche-Test: Bären scheitern an Demand-Zone`
            });

            const entryPrice = candle.close;
            // Stop-Loss: Local pullback rejection extreme (+ buffer), as taught in Daytrading
            const slBase = useLocalSL
              ? Math.min(candle.low, zone.bottomPrice)
              : activeStructuralLow.price;
            const stopLoss = Number((slBase - currentAtr * atrBufferMult).toFixed(2));
            const risk = entryPrice - stopLoss;

            // Ensure reasonable risk bounds (between 0.1% and 4% of price)
            if (risk >= entryPrice * 0.001 && risk <= entryPrice * 0.045) {
              const takeProfit = Number((entryPrice + risk * rrRatio).toFixed(2));

              signals.push({
                type: 'BUY',
                time: candle.time,
                index: i,
                price: entryPrice,
                stopLoss,
                takeProfit,
                reason: `Noc Long [Demand Retest & Schwäche Bären, SL: $${stopLoss}, TP: $${takeProfit} (1:${rrRatio} CRV)]`,
                zoneId: zone.id
              });

              zone.isMitigated = true;
              zone.endTime = candle.time;
              activeDemandZones = activeDemandZones.filter(z => z.id !== zone.id);
              break;
            }
          }
        }
      }
    }

    // Bearish Trend: Look for Pullbacks failing to break Strong High (Weakness of Buyers)
    if (currentTrend === 'BEARISH' && allowShorts && activeStructuralHigh && activeSupplyZones.length > 0) {
      for (const zone of [...activeSupplyZones]) {
        if (candle.high >= zone.bottomPrice && candle.low <= zone.topPrice) {
          const rejectionWick = (candle.high - candle.close) > (candle.close - candle.low) * 0.7;
          const failedHighTest = (candle.close < candle.open || rejectionWick) && candle.high < activeStructuralHigh.price;

          if (failedHighTest) {
            failedTests.push({
              index: i,
              time: candle.time,
              price: candle.high,
              testedLevelPrice: activeStructuralHigh.price,
              type: 'FAILED_HIGH',
              description: `Noc Schwäche-Test: Bullen scheitern an Supply-Zone`
            });

            const entryPrice = candle.close;
            const slBase = useLocalSL
              ? Math.max(candle.high, zone.topPrice)
              : activeStructuralHigh.price;
            const stopLoss = Number((slBase + currentAtr * atrBufferMult).toFixed(2));
            const risk = stopLoss - entryPrice;

            if (risk >= entryPrice * 0.001 && risk <= entryPrice * 0.045) {
              const takeProfit = Number((entryPrice - risk * rrRatio).toFixed(2));

              signals.push({
                type: 'SELL',
                time: candle.time,
                index: i,
                price: entryPrice,
                stopLoss,
                takeProfit,
                reason: `Noc Short [Supply Retest & Schwäche Bullen, SL: $${stopLoss}, TP: $${takeProfit} (1:${rrRatio} CRV)]`,
                zoneId: zone.id
              });

              zone.isMitigated = true;
              zone.endTime = candle.time;
              activeSupplyZones = activeSupplyZones.filter(z => z.id !== zone.id);
              break;
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
