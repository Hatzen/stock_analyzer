import type {
  Candle,
  Trade,
  Position,
  EquityPoint,
  BacktestMetrics,
  BacktestResult,
  SimulationSettings,
  ChartOverlay,
  SMCZone,
  SMCSwingPoint,
  FailedTestPoint
} from '../types/market';

export interface SignalAction {
  action: 'BUY' | 'SELL' | 'CLOSE_ALL';
  stopLoss?: number;
  takeProfit?: number;
  reason?: string;
  price?: number;
}

export type SignalMap = Map<number, SignalAction>;

export const DEFAULT_SETTINGS: SimulationSettings = {
  initialCapital: 10000,
  riskPercentage: 2,
  positionSizeMode: 'PERCENT_CAPITAL',
  fixedPositionSize: 20,
  commissionPercent: 0.05,
  slippagePercent: 0.02,
  allowShorting: true
};

export function runBacktest(
  candles: Candle[],
  signalMap: SignalMap,
  customSettings: Partial<SimulationSettings> = {},
  overlays: ChartOverlay[] = [],
  zones?: SMCZone[],
  swingPoints?: SMCSwingPoint[],
  failedTests?: FailedTestPoint[],
  logs: string[] = []
): BacktestResult {
  const settings: SimulationSettings = { ...DEFAULT_SETTINGS, ...customSettings };

  let capital = settings.initialCapital;
  let activePosition: Position | null = null;
  const closedTrades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  let peakEquity = capital;
  let maxDrawdown = 0;
  let maxDrawdownAmount = 0;

  const benchmarkStartPrice = candles.length > 0 ? candles[0].close : 1;
  const benchmarkShares = capital / benchmarkStartPrice;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentPrice = candle.close;

    // --- 1. INTRA-BAR STOP LOSS & TAKE PROFIT CHECKS ---
    if (activePosition) {
      let exitPrice: number | null = null;
      let exitReason: Trade['exitReason'] | null = null;

      if (activePosition.type === 'LONG') {
        if (activePosition.stopLoss && candle.low <= activePosition.stopLoss) {
          exitPrice = activePosition.stopLoss * (1 - settings.slippagePercent / 100);
          exitReason = 'STOP_LOSS';
        } else if (activePosition.takeProfit && candle.high >= activePosition.takeProfit) {
          exitPrice = activePosition.takeProfit * (1 - settings.slippagePercent / 100);
          exitReason = 'TAKE_PROFIT';
        }
      } else if (activePosition.type === 'SHORT') {
        if (activePosition.stopLoss && candle.high >= activePosition.stopLoss) {
          exitPrice = activePosition.stopLoss * (1 + settings.slippagePercent / 100);
          exitReason = 'STOP_LOSS';
        } else if (activePosition.takeProfit && candle.low <= activePosition.takeProfit) {
          exitPrice = activePosition.takeProfit * (1 + settings.slippagePercent / 100);
          exitReason = 'TAKE_PROFIT';
        }
      }

      if (exitPrice !== null && exitReason !== null) {
        const invested = activePosition.size * activePosition.entryPrice;
        const grossPnl = activePosition.type === 'LONG'
          ? (exitPrice - activePosition.entryPrice) * activePosition.size
          : (activePosition.entryPrice - exitPrice) * activePosition.size;

        const commission = (invested + activePosition.size * exitPrice) * (settings.commissionPercent / 100);
        const netPnl = grossPnl - commission;
        const pnlPercent = (netPnl / invested) * 100;

        capital += invested + netPnl;

        closedTrades.push({
          id: `trade_${closedTrades.length + 1}`,
          type: activePosition.type,
          entryTime: activePosition.entryTime,
          entryPrice: Number(activePosition.entryPrice.toFixed(2)),
          exitTime: candle.time,
          exitPrice: Number(exitPrice.toFixed(2)),
          size: Number(activePosition.size.toFixed(4)),
          investedAmount: Number(invested.toFixed(2)),
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(pnlPercent.toFixed(2)),
          exitReason,
          barsHeld: i - activePosition.entryIndex,
          stopLoss: activePosition.stopLoss,
          takeProfit: activePosition.takeProfit
        });

        activePosition = null;
      }
    }

    // --- 2. EVALUATE STRATEGY SIGNALS AT THIS BAR ---
    const signal = signalMap.get(i);
    if (signal) {
      if (signal.action === 'CLOSE_ALL' && activePosition) {
        const exitPrice = (signal.price || currentPrice) * (activePosition.type === 'LONG' ? (1 - settings.slippagePercent / 100) : (1 + settings.slippagePercent / 100));
        const invested = activePosition.size * activePosition.entryPrice;
        const grossPnl = activePosition.type === 'LONG'
          ? (exitPrice - activePosition.entryPrice) * activePosition.size
          : (activePosition.entryPrice - exitPrice) * activePosition.size;
        const commission = (invested + activePosition.size * exitPrice) * (settings.commissionPercent / 100);
        const netPnl = grossPnl - commission;
        const pnlPercent = (netPnl / invested) * 100;

        capital += invested + netPnl;

        closedTrades.push({
          id: `trade_${closedTrades.length + 1}`,
          type: activePosition.type,
          entryTime: activePosition.entryTime,
          entryPrice: Number(activePosition.entryPrice.toFixed(2)),
          exitTime: candle.time,
          exitPrice: Number(exitPrice.toFixed(2)),
          size: Number(activePosition.size.toFixed(4)),
          investedAmount: Number(invested.toFixed(2)),
          pnl: Number(netPnl.toFixed(2)),
          pnlPercent: Number(pnlPercent.toFixed(2)),
          exitReason: 'SIGNAL_EXIT',
          barsHeld: i - activePosition.entryIndex,
          stopLoss: activePosition.stopLoss,
          takeProfit: activePosition.takeProfit
        });
        activePosition = null;
      } else if (signal.action === 'BUY' && !activePosition) {
        const execPrice = (signal.price || currentPrice) * (1 + settings.slippagePercent / 100);
        let tradeCapital = 0;

        if (settings.positionSizeMode === 'PERCENT_CAPITAL') {
          tradeCapital = capital * (settings.fixedPositionSize / 100);
        } else if (settings.positionSizeMode === 'RISK_PER_TRADE' && signal.stopLoss && signal.stopLoss < execPrice) {
          const maxRiskDollars = capital * (settings.riskPercentage / 100);
          const riskPerShare = execPrice - signal.stopLoss;
          const targetShares = maxRiskDollars / riskPerShare;
          tradeCapital = Math.min(capital * 0.95, targetShares * execPrice);
        } else {
          tradeCapital = capital * 0.25;
        }

        const size = tradeCapital / execPrice;
        const commission = tradeCapital * (settings.commissionPercent / 100);

        if (capital >= tradeCapital + commission && size > 0) {
          capital -= (tradeCapital + commission);
          activePosition = {
            type: 'LONG',
            entryTime: candle.time,
            entryIndex: i,
            entryPrice: execPrice,
            size,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            reason: signal.reason
          };
        }
      } else if (signal.action === 'SELL' && !activePosition && settings.allowShorting) {
        const execPrice = (signal.price || currentPrice) * (1 - settings.slippagePercent / 100);
        let tradeCapital = 0;

        if (settings.positionSizeMode === 'PERCENT_CAPITAL') {
          tradeCapital = capital * (settings.fixedPositionSize / 100);
        } else if (settings.positionSizeMode === 'RISK_PER_TRADE' && signal.stopLoss && signal.stopLoss > execPrice) {
          const maxRiskDollars = capital * (settings.riskPercentage / 100);
          const riskPerShare = signal.stopLoss - execPrice;
          const targetShares = maxRiskDollars / riskPerShare;
          tradeCapital = Math.min(capital * 0.95, targetShares * execPrice);
        } else {
          tradeCapital = capital * 0.25;
        }

        const size = tradeCapital / execPrice;
        const commission = tradeCapital * (settings.commissionPercent / 100);

        if (capital >= tradeCapital + commission && size > 0) {
          capital -= (tradeCapital + commission);
          activePosition = {
            type: 'SHORT',
            entryTime: candle.time,
            entryIndex: i,
            entryPrice: execPrice,
            size,
            stopLoss: signal.stopLoss,
            takeProfit: signal.takeProfit,
            reason: signal.reason
          };
        }
      }
    }

    // --- 3. CALCULATE MARK-TO-MARKET EQUITY ---
    let openPnl = 0;
    if (activePosition) {
      const positionValue = activePosition.type === 'LONG'
        ? activePosition.size * currentPrice
        : activePosition.size * (2 * activePosition.entryPrice - currentPrice);
      openPnl = positionValue;
    }

    const currentTotalEquity = capital + openPnl;

    if (currentTotalEquity > peakEquity) {
      peakEquity = currentTotalEquity;
    }

    const drawdownAmt = peakEquity - currentTotalEquity;
    const drawdownPct = peakEquity > 0 ? (drawdownAmt / peakEquity) * 100 : 0;

    if (drawdownPct > maxDrawdown) {
      maxDrawdown = drawdownPct;
    }
    if (drawdownAmt > maxDrawdownAmount) {
      maxDrawdownAmount = drawdownAmt;
    }

    const benchmarkEquity = benchmarkShares * currentPrice;

    equityCurve.push({
      time: candle.time,
      equity: Number(currentTotalEquity.toFixed(2)),
      benchmarkEquity: Number(benchmarkEquity.toFixed(2)),
      drawdown: Number(drawdownAmt.toFixed(2)),
      drawdownPercent: Number(drawdownPct.toFixed(2))
    });
  }

  // Close any leftover open position at final bar
  if (activePosition && candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const exitPrice = lastCandle.close;
    const invested = activePosition.size * activePosition.entryPrice;
    const grossPnl = activePosition.type === 'LONG'
      ? (exitPrice - activePosition.entryPrice) * activePosition.size
      : (activePosition.entryPrice - exitPrice) * activePosition.size;
    const commission = (invested + activePosition.size * exitPrice) * (settings.commissionPercent / 100);
    const netPnl = grossPnl - commission;
    const pnlPercent = (netPnl / invested) * 100;

    capital += invested + netPnl;

    closedTrades.push({
      id: `trade_${closedTrades.length + 1}`,
      type: activePosition.type,
      entryTime: activePosition.entryTime,
      entryPrice: Number(activePosition.entryPrice.toFixed(2)),
      exitTime: lastCandle.time,
      exitPrice: Number(exitPrice.toFixed(2)),
      size: Number(activePosition.size.toFixed(4)),
      investedAmount: Number(invested.toFixed(2)),
      pnl: Number(netPnl.toFixed(2)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      exitReason: 'END_OF_DATA',
      barsHeld: candles.length - 1 - activePosition.entryIndex,
      stopLoss: activePosition.stopLoss,
      takeProfit: activePosition.takeProfit
    });
    activePosition = null;
  }

  // --- 4. COMPUTE PERFORMANCE METRICS ---
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : capital;
  const totalReturn = Number((((finalEquity - settings.initialCapital) / settings.initialCapital) * 100).toFixed(2));
  const finalBenchmark = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].benchmarkEquity : settings.initialCapital;
  const benchmarkReturn = Number((((finalBenchmark - settings.initialCapital) / settings.initialCapital) * 100).toFixed(2));
  const alpha = Number((totalReturn - benchmarkReturn).toFixed(2));

  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter(t => t.pnl > 0).length;
  const losingTrades = closedTrades.filter(t => t.pnl < 0).length;
  const winRate = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(1)) : 0;

  const totalGains = closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = totalLosses === 0 ? (totalGains > 0 ? 99.9 : 0) : Number((totalGains / totalLosses).toFixed(2));

  const avgWinPnl = winningTrades > 0 ? totalGains / winningTrades : 0;
  const avgLossPnl = losingTrades > 0 ? totalLosses / losingTrades : 0;
  const riskRewardRatio = avgLossPnl > 0 ? Number((avgWinPnl / avgLossPnl).toFixed(2)) : 0;

  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const averageTradePnl = totalTrades > 0 ? Number((totalPnl / totalTrades).toFixed(2)) : 0;
  const averageTradeReturn = totalTrades > 0 ? Number((closedTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / totalTrades).toFixed(2)) : 0;

  let sharpeRatio = 0;
  if (equityCurve.length > 2) {
    const dailyReturns: number[] = [];
    for (let k = 1; k < equityCurve.length; k++) {
      const prev = equityCurve[k - 1].equity;
      const curr = equityCurve[k].equity;
      dailyReturns.push(prev > 0 ? (curr - prev) / prev : 0);
    }
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (dailyReturns.length - 1);
    const stdDev = Math.sqrt(variance);
    if (stdDev > 0) {
      sharpeRatio = Number(((meanReturn / stdDev) * Math.sqrt(252)).toFixed(2));
    }
  }

  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  for (const t of closedTrades) {
    if (t.pnl > 0) {
      currentWins++;
      currentLosses = 0;
      if (currentWins > maxConsecWins) maxConsecWins = currentWins;
    } else if (t.pnl < 0) {
      currentLosses++;
      currentWins = 0;
      if (currentLosses > maxConsecLosses) maxConsecLosses = currentLosses;
    }
  }

  const metrics: BacktestMetrics = {
    initialCapital: settings.initialCapital,
    finalEquity: Number(finalEquity.toFixed(2)),
    totalReturn,
    benchmarkReturn,
    alpha,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    profitFactor,
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    sharpeRatio,
    averageTradeReturn,
    averageTradePnl,
    avgWinPnl: Number(avgWinPnl.toFixed(2)),
    avgLossPnl: Number(avgLossPnl.toFixed(2)),
    riskRewardRatio,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses
  };

  return {
    metrics,
    trades: closedTrades,
    equityCurve,
    overlays,
    zones,
    swingPoints,
    failedTests,
    logs
  };
}
