import type { BacktestMetrics } from '../../types/market';
import {
  TrendingUp,
  Percent,
  Activity,
  ShieldAlert,
  Award,
  Zap
} from 'lucide-react';

interface MetricsCardsProps {
  metrics: BacktestMetrics;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  const isProfit = metrics.totalReturn >= 0;
  const netPnlDollar = metrics.finalEquity - metrics.initialCapital;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
      {/* 1. Total Return & PnL */}
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Gesamtrendite</span>
          <TrendingUp size={15} className={isProfit ? 'text-emerald-400' : 'text-rose-400'} />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className={`text-xl font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]/60">
          <span>PnL:</span>
          <span className={netPnlDollar >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {netPnlDollar >= 0 ? '+' : ''}${netPnlDollar.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Trefferquote (Win Rate)</span>
          <Percent size={15} className="text-sky-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-sky-400">
            {metrics.winRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]/60">
          <span className="text-emerald-400 font-medium">{metrics.winningTrades}W</span>
          <span className="text-slate-500">/</span>
          <span className="text-rose-400 font-medium">{metrics.losingTrades}L</span>
          <span className="text-slate-500 font-normal">({metrics.totalTrades} Total)</span>
        </div>
      </div>

      {/* 3. Profit Factor */}
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Profit Factor</span>
          <Award size={15} className="text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className={`text-xl font-bold font-mono ${metrics.profitFactor >= 1.5 ? 'text-emerald-400' : metrics.profitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {metrics.profitFactor.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]/60">
          <span>Status:</span>
          <span className="font-semibold text-slate-300">
            {metrics.profitFactor >= 2.0 ? 'Exzellent' : metrics.profitFactor >= 1.3 ? 'Profitabel' : 'Optimierbar'}
          </span>
        </div>
      </div>

      {/* 4. Max Drawdown */}
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Max. Drawdown</span>
          <ShieldAlert size={15} className="text-rose-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className="text-xl font-bold font-mono text-rose-400">
            -{metrics.maxDrawdown.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]/60">
          <span>Verlust max:</span>
          <span className="text-rose-400 font-semibold">-${metrics.maxDrawdownAmount.toFixed(0)}</span>
        </div>
      </div>

      {/* 5. Sharpe Ratio */}
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Sharpe Ratio</span>
          <Activity size={15} className="text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className={`text-xl font-bold font-mono ${metrics.sharpeRatio >= 1.5 ? 'text-emerald-400' : metrics.sharpeRatio >= 0.5 ? 'text-purple-400' : 'text-slate-400'}`}>
            {metrics.sharpeRatio.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]/60">
          <span>Risiko-Adjustiert</span>
          <span className="text-slate-300 font-medium">
            {metrics.sharpeRatio > 1.8 ? 'Sehr gut' : metrics.sharpeRatio > 0.8 ? 'Solide' : 'Niedrig'}
          </span>
        </div>
      </div>

      {/* 6. Alpha vs Buy & Hold */}
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-xl p-3.5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
          <span>Alpha vs Benchmark</span>
          <Zap size={15} className={metrics.alpha >= 0 ? 'text-emerald-400' : 'text-slate-400'} />
        </div>
        <div className="flex items-baseline gap-1.5 my-0.5">
          <span className={`text-xl font-bold font-mono ${metrics.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.alpha >= 0 ? '+' : ''}{metrics.alpha.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-[#1E293B]/60">
          <span>Benchmark:</span>
          <span className="text-slate-400 font-semibold">{metrics.benchmarkReturn.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
