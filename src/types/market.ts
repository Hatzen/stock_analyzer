export interface Candle {
  time: string; // 'YYYY-MM-DD' or ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  type: 'LONG' | 'SHORT';
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  size: number; // units/shares
  investedAmount: number; // $ value
  pnl: number; // $ profit/loss
  pnlPercent: number; // % profit/loss
  exitReason: 'TAKE_PROFIT' | 'STOP_LOSS' | 'SIGNAL_EXIT' | 'END_OF_DATA';
  barsHeld: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Position {
  type: 'LONG' | 'SHORT';
  entryTime: string;
  entryIndex: number;
  entryPrice: number;
  size: number;
  stopLoss?: number;
  takeProfit?: number;
  reason?: string;
}

export interface EquityPoint {
  time: string;
  equity: number;
  benchmarkEquity: number;
  drawdown: number;
  drawdownPercent: number;
}

export interface BacktestMetrics {
  initialCapital: number;
  finalEquity: number;
  totalReturn: number; // %
  benchmarkReturn: number; // %
  alpha: number; // %
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  profitFactor: number;
  maxDrawdown: number; // %
  maxDrawdownAmount: number; // $
  sharpeRatio: number;
  averageTradeReturn: number; // %
  averageTradePnl: number; // $
  avgWinPnl: number;
  avgLossPnl: number;
  riskRewardRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

export interface ChartOverlay {
  name: string;
  color: string;
  type: 'line' | 'histogram' | 'dots';
  data: { time: string; value: number }[];
}

// SMC / Market Structure Types
export type SwingType = 'HIGH' | 'LOW';
export type StructureClassification = 'STRONG' | 'WEAK' | 'NEUTRAL';

export interface SMCSwingPoint {
  index: number;
  time: string;
  price: number;
  type: SwingType;
  classification: StructureClassification;
  isBOS: boolean;
  bosTime?: string;
  bosPrice?: string;
}

export interface SMCZone {
  id: string;
  type: 'DEMAND' | 'SUPPLY';
  startTime: string;
  endTime?: string;
  topPrice: number;
  bottomPrice: number;
  isMitigated: boolean;
  label: string;
}

export interface FailedTestPoint {
  index: number;
  time: string;
  price: number;
  testedLevelPrice: number;
  type: 'FAILED_LOW' | 'FAILED_HIGH';
  description: string;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  trades: Trade[];
  equityCurve: EquityPoint[];
  overlays: ChartOverlay[];
  zones?: SMCZone[];
  swingPoints?: SMCSwingPoint[];
  failedTests?: FailedTestPoint[];
  logs: string[];
}

export interface SimulationSettings {
  initialCapital: number;
  riskPercentage: number;
  positionSizeMode: 'PERCENT_CAPITAL' | 'RISK_PER_TRADE' | 'FIXED_AMOUNT';
  fixedPositionSize: number;
  commissionPercent: number;
  slippagePercent: number;
  allowShorting: boolean;
  maxOpenPositions?: number;
}

// Chunking & Comparative Flow Types
export type ChunkDuration = '1M' | '3M' | '6M' | '1Y';

export interface DataChunk {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  candles: Candle[];
  regimeHint?: string;
}

export interface ChunkComparisonMetric {
  chunkId: string;
  chunkName: string;
  startDate: string;
  endDate: string;
  totalReturn: number;
  benchmarkReturn: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  tradesCount: number;
  sharpeRatio: number;
}
