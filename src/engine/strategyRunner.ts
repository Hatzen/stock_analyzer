import type {
  Candle,
  BacktestResult,
  SimulationSettings,
  ChartOverlay,
  SMCZone,
  SMCSwingPoint,
  FailedTestPoint
} from '../types/market';
import { Indicators } from '../indicators/indicators';
import { analyzeMarketStructure } from './smcEngine';
import { analyzeNocStructure } from './nocTradingEngine';
import { runBacktest } from './backtester';
import type { SignalAction } from './backtester';

export interface StrategyExecutionOptions {
  candles: Candle[];
  code: string;
  params: Record<string, any>;
  settings?: Partial<SimulationSettings>;
}

export function executeStrategyCode(options: StrategyExecutionOptions): BacktestResult {
  const { candles, code, params, settings } = options;

  if (!candles || candles.length === 0) {
    throw new Error('Keine Kerzendaten für den Backtest vorhanden.');
  }

  const signalMap = new Map<number, SignalAction>();
  const overlays: ChartOverlay[] = [];
  const logs: string[] = [];
  let detectedZones: SMCZone[] = [];
  let detectedSwingPoints: SMCSwingPoint[] = [];
  let detectedFailedTests: FailedTestPoint[] = [];

  const api = {
    buy: (opts: { index: number; price?: number; stopLoss?: number; takeProfit?: number; reason?: string }) => {
      signalMap.set(opts.index, {
        action: 'BUY',
        price: opts.price,
        stopLoss: opts.stopLoss,
        takeProfit: opts.takeProfit,
        reason: opts.reason || 'Buy Signal'
      });
    },
    sell: (opts: { index: number; price?: number; stopLoss?: number; takeProfit?: number; reason?: string }) => {
      signalMap.set(opts.index, {
        action: 'SELL',
        price: opts.price,
        stopLoss: opts.stopLoss,
        takeProfit: opts.takeProfit,
        reason: opts.reason || 'Sell Signal'
      });
    },
    closeAll: (opts: { index: number; price?: number; reason?: string }) => {
      signalMap.set(opts.index, {
        action: 'CLOSE_ALL',
        price: opts.price,
        reason: opts.reason || 'Close Signal'
      });
    },
    addOverlay: (overlay: ChartOverlay) => {
      overlays.push(overlay);
    },
    setSMCData: (zones?: SMCZone[], swingPoints?: SMCSwingPoint[], failedTests?: FailedTestPoint[]) => {
      if (zones) detectedZones = zones;
      if (swingPoints) detectedSwingPoints = swingPoints;
      if (failedTests) detectedFailedTests = failedTests;
    },
    log: (msg: any) => {
      const text = typeof msg === 'object' ? JSON.stringify(msg) : String(msg);
      logs.push(`[${new Date().toLocaleTimeString()}] ${text}`);
    }
  };

  const smcLib = {
    analyzeMarketStructure,
    analyzeNocStructure
  };

  try {
    const wrappedCode = `
      ${code}
      if (typeof onStrategy === 'function') {
        onStrategy(candles, indicators, smc, params, api);
      } else {
        throw new Error("Funktion 'onStrategy' wurde im Code nicht gefunden. Bitte definiere 'function onStrategy(candles, indicators, smc, params, api) { ... }'");
      }
    `;

    const runner = new Function('candles', 'indicators', 'smc', 'params', 'api', wrappedCode);
    runner(candles, Indicators, smcLib, params, api);
  } catch (err: any) {
    logs.push(`[FEHLER] ${err.message}`);
    throw new Error(`Skriptausführungsfehler: ${err.message}`);
  }

  const result = runBacktest(
    candles,
    signalMap,
    settings,
    overlays,
    detectedZones,
    detectedSwingPoints,
    detectedFailedTests,
    logs
  );

  return result;
}
