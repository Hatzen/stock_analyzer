export interface StrategyPreset {
  id: string;
  name: string;
  description: string;
  category: 'SMC' | 'Trend' | 'Mean Reversion' | 'Momentum' | 'Custom';
  code: string;
  defaultParams: Record<string, number | boolean | string>;
}

export const STRATEGY_PRESETS: StrategyPreset[] = [
  {
    id: 'smc_bot',
    name: 'Algorithmic Market Structure Bot (SMC)',
    category: 'SMC',
    description: 'Flagship: Pivot-Swing-Erkennung (ohne Zwischenrauschen), BOS bei Kerzenschluss, Strong/Weak Highs & Lows, Order-Blöcke (Demand/Supply) mit 1:2 CRV oder Weak-High Liquiditätsziel.',
    defaultParams: {
      pivotLength: 5,
      riskRewardRatio: 2.0,
      atrMultiplierSL: 0.5,
      targetWeakLiquidity: true
    },
    code: `/**
 * SKILL: Algorithmic Market Structure Bot Architect
 * 
 * 1. SWING POINT DETEKTION:
 *    - Ignoriert Zwischenhochs/-tiefs.
 *    - Valides Pivot High / Low über anpassbare Periode (pivotLength = 5).
 *    - Aktualisierung bei Break of Structure (BOS) per Kerzenschlusskurs (Candle Body Close).
 * 
 * 2. STRONG / WEAK REGELN:
 *    - Bullish: Das Tief, das zum BOS geführt hat = "Strong Low" (geschützt). Das Hoch = "Weak High".
 *    - Bearish: Das Hoch, das zum BOS geführt hat = "Strong High" (geschützt). Das Tief = "Weak Low".
 * 
 * 3. ZONEN-DEFINITION (Demand / Supply):
 *    - Bullish: Letzte bärische Kerze (Order Block) vor dem Ausbruchsimpuls.
 *    - Bearish: Letzte bullische Kerze vor dem Abwärtsimpuls.
 * 
 * 4. TRADING EXECUTION:
 *    - Einstieg bei Retracement / Limit-Test der Order Block Zone.
 *    - Stop-Loss: Unter Strong Low (Long) bzw. über Strong High (Short) + ATR Buffer.
 *    - Take-Profit: 1:2 CRV oder Weak High/Low als Liquiditätsziel.
 */
function onStrategy(candles, indicators, smc, params, api) {
  const pivotLength = Number(params.pivotLength) || 5;
  const rrRatio = Number(params.riskRewardRatio) || 2.0;
  const atrBufferMult = Number(params.atrMultiplierSL) || 0.5;
  const targetWeak = Boolean(params.targetWeakLiquidity);

  api.log("Starte SMC Market Structure Analyse mit Pivot-Länge: " + pivotLength);

  // Führe die SMC-Marktstrukturanalyse aus
  const result = smc.analyzeMarketStructure(candles, {
    pivotLength,
    riskRewardRatio: rrRatio,
    atrMultiplierSL: atrBufferMult,
    targetWeakLiquidity: targetWeak
  });

  // Registriere alle generierten SMC-Signale (Limit/Market Eintritte)
  for (const sig of result.signals) {
    if (sig.type === 'BUY' || sig.type === 'BUY_LIMIT') {
      api.buy({
        index: sig.index,
        price: sig.price,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
        reason: sig.reason
      });
    } else if (sig.type === 'SELL' || sig.type === 'SELL_LIMIT') {
      api.sell({
        index: sig.index,
        price: sig.price,
        stopLoss: sig.stopLoss,
        takeProfit: sig.takeProfit,
        reason: sig.reason
      });
    }
  }

  // Zeichne die SMC-Zonen und Strukturpunkte in den Chart
  api.setSMCData(result.zones, result.swingPoints);
  api.log(\`SMC-Ergebnis: \${result.swingPoints.length} Swings, \${result.zones.length} Zonen, \${result.signals.length} Signale.\`);
}
`
  },
  {
    id: 'ema_crossover',
    name: 'EMA Golden Cross + RSI Filter',
    category: 'Trend',
    description: 'Klassische Trendfolgestrategie: Kauf bei bullischem Schnitt des schnellen EMA über den langsamen EMA mit RSI Bestätigung (< 70).',
    defaultParams: {
      fastPeriod: 20,
      slowPeriod: 50,
      rsiPeriod: 14,
      rsiMaxEntry: 65,
      stopLossAtrMult: 1.5,
      takeProfitAtrMult: 3.0
    },
    code: `/**
 * EMA Crossover mit RSI-Filter & dynamischem ATR-Risikomanagement
 */
function onStrategy(candles, indicators, smc, params, api) {
  const fastPeriod = Number(params.fastPeriod) || 20;
  const slowPeriod = Number(params.slowPeriod) || 50;
  const rsiPeriod = Number(params.rsiPeriod) || 14;
  const rsiMaxEntry = Number(params.rsiMaxEntry) || 65;
  const slAtrMult = Number(params.stopLossAtrMult) || 1.5;
  const tpAtrMult = Number(params.takeProfitAtrMult) || 3.0;

  // Berechne technische Indikatoren
  const fastEma = indicators.ema(candles, fastPeriod);
  const slowEma = indicators.ema(candles, slowPeriod);
  const rsiValues = indicators.rsi(candles, rsiPeriod);
  const atrValues = indicators.atr(candles, 14);

  // Füge Overlays zum Candlestick-Chart hinzu
  api.addOverlay({
    name: \`EMA \${fastPeriod}\`,
    color: '#00E5FF',
    type: 'line',
    data: candles.map((c, i) => ({ time: c.time, value: fastEma[i] })).filter(d => d.value !== null)
  });

  api.addOverlay({
    name: \`EMA \${slowPeriod}\`,
    color: '#FF9100',
    type: 'line',
    data: candles.map((c, i) => ({ time: c.time, value: slowEma[i] })).filter(d => d.value !== null)
  });

  // Iteriere durch alle Kerzen und erzeuge Handelssignale
  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const currentAtr = atrValues[i] || (candle.high - candle.low);
    const currentRsi = rsiValues[i];

    // Bullish Crossover: Schneller EMA kreuzt langsamen EMA nach oben
    if (indicators.crossover(fastEma, slowEma, i)) {
      if (currentRsi !== null && currentRsi <= rsiMaxEntry) {
        api.buy({
          index: i,
          stopLoss: Number((candle.close - currentAtr * slAtrMult).toFixed(2)),
          takeProfit: Number((candle.close + currentAtr * tpAtrMult).toFixed(2)),
          reason: \`EMA Cross Long [RSI \${currentRsi.toFixed(1)}]\`
        });
      }
    }

    // Bearish Crossunder: Schneller EMA kreuzt langsamen EMA nach unten
    if (indicators.crossunder(fastEma, slowEma, i)) {
      api.closeAll({
        index: i,
        reason: 'EMA Bearish Cross Exit'
      });
    }
  }
}
`
  },
  {
    id: 'bollinger_reversion',
    name: 'Bollinger Band Mean Reversion',
    category: 'Mean Reversion',
    description: 'Handelt die Rückkehr zum Mittelwert bei Berührung des unteren bzw. oberen Bandes mit RSI Überverkauft-Filter.',
    defaultParams: {
      period: 20,
      stdDev: 2.0,
      rsiOversold: 35,
      rsiOverbought: 65
    },
    code: `/**
 * Bollinger Bands Mean Reversion
 */
function onStrategy(candles, indicators, smc, params, api) {
  const period = Number(params.period) || 20;
  const stdDev = Number(params.stdDev) || 2.0;
  const rsiOversold = Number(params.rsiOversold) || 35;
  const rsiOverbought = Number(params.rsiOverbought) || 65;

  const bb = indicators.bollingerBands(candles, period, stdDev);
  const rsiValues = indicators.rsi(candles, 14);

  // Visualisiere Bollinger Bänder
  api.addOverlay({
    name: 'BB Upper',
    color: 'rgba(255, 82, 82, 0.6)',
    type: 'line',
    data: candles.map((c, i) => ({ time: c.time, value: bb.upper[i] })).filter(d => d.value !== null)
  });
  api.addOverlay({
    name: 'BB Middle (SMA 20)',
    color: 'rgba(120, 144, 156, 0.8)',
    type: 'line',
    data: candles.map((c, i) => ({ time: c.time, value: bb.middle[i] })).filter(d => d.value !== null)
  });
  api.addOverlay({
    name: 'BB Lower',
    color: 'rgba(0, 230, 118, 0.6)',
    type: 'line',
    data: candles.map((c, i) => ({ time: c.time, value: bb.lower[i] })).filter(d => d.value !== null)
  });

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    const lower = bb.lower[i];
    const upper = bb.upper[i];
    const middle = bb.middle[i];
    const rsiVal = rsiValues[i];

    if (lower === null || middle === null || upper === null) continue;

    // Kaufsignal: Kurs sticht unter unteres Band und schließt wieder darüber ein (Reversal)
    if (prevCandle.low < lower && candle.close > lower && (rsiVal === null || rsiVal < rsiOversold)) {
      api.buy({
        index: i,
        stopLoss: Number((candle.low * 0.985).toFixed(2)),
        takeProfit: Number(middle.toFixed(2)), // Ziel ist das mittlere Band
        reason: 'BB Bounce Long'
      });
    }

    // Ausstieg bei Erreichen des mittleren oder oberen Bandes
    if (candle.close >= middle) {
      api.closeAll({
        index: i,
        reason: 'Target Reached (Middle Band)'
      });
    }
  }
}
`
  },
  {
    id: 'custom_template',
    name: 'Eigene Strategie (Template)',
    category: 'Custom',
    description: 'Saubere Vorlage mit Beispielen für eigene Indikatoren, Kaufs-/Verkaufssignale und Visualisierungen.',
    defaultParams: {
      myPeriod: 14,
      threshold: 50
    },
    code: `/**
 * Eigenes Strategie-Template
 * Du hast vollen Zugriff auf:
 * - candles: { time, open, high, low, close, volume }[]
 * - indicators: sma, ema, rsi, macd, bollingerBands, atr, vwap, highest, lowest, crossover, crossunder
 * - smc: analyzeMarketStructure(candles, options)
 * - params: dynamisch konfigurierbare Eingabeparameter
 * - api: buy(), sell(), closeAll(), addOverlay(), log()
 */
function onStrategy(candles, indicators, smc, params, api) {
  api.log("Starte benutzerdefinierte Strategie...");

  const sma20 = indicators.sma(candles, 20);

  // Beispiel-Overlay
  api.addOverlay({
    name: 'SMA 20',
    color: '#00E676',
    type: 'line',
    data: candles.map((c, i) => ({ time: c.time, value: sma20[i] })).filter(d => d.value !== null)
  });

  for (let i = 20; i < candles.length; i++) {
    const c = candles[i];
    const prevC = candles[i - 1];

    // Beispiel-Kaufbedingung: Schlusskurs kreuzt SMA 20 nach oben
    if (prevC.close <= sma20[i - 1] && c.close > sma20[i]) {
      api.buy({
        index: i,
        stopLoss: Number((c.close * 0.97).toFixed(2)), // 3% Stop-Loss
        takeProfit: Number((c.close * 1.06).toFixed(2)), // 6% Take-Profit (1:2 CRV)
        reason: 'SMA Ausbruch Long'
      });
    }
  }
}
`
  }
];
