import React, { useState } from 'react';
import type { Trade } from '../../types/market';
import { Download, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';

interface TradeLogTableProps {
  trades: Trade[];
}

type FilterType = 'ALL' | 'LONG' | 'SHORT' | 'WIN' | 'LOSS';

export const TradeLogTable: React.FC<TradeLogTableProps> = ({ trades }) => {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [search, setSearch] = useState('');

  const filteredTrades = trades.filter(t => {
    if (filter === 'LONG' && t.type !== 'LONG') return false;
    if (filter === 'SHORT' && t.type !== 'SHORT') return false;
    if (filter === 'WIN' && t.pnl <= 0) return false;
    if (filter === 'LOSS' && t.pnl >= 0) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        t.id.toLowerCase().includes(q) ||
        t.entryTime.includes(q) ||
        t.exitTime.includes(q) ||
        t.exitReason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportCSV = () => {
    if (trades.length === 0) return;
    const header = 'ID,Type,EntryTime,EntryPrice,ExitTime,ExitPrice,Size,InvestedAmount,PnL_Dollar,PnL_Percent,ExitReason,BarsHeld\n';
    const rows = trades.map(t =>
      `${t.id},${t.type},${t.entryTime},${t.entryPrice},${t.exitTime},${t.exitPrice},${t.size},${t.investedAmount},${t.pnl},${t.pnlPercent},${t.exitReason},${t.barsHeld}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest_trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full bg-[#0B0E14] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0F141C] border-b border-[#1E293B] gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Ausführliche Trade-Historie
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1E293B] text-sky-400 font-mono">
            {filteredTrades.length} / {trades.length} Trades
          </span>
        </div>

        {/* Filter Tabs, Search & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="flex items-center bg-[#131924] px-2 py-1 rounded-lg border border-[#1E293B] text-xs">
            <Search size={12} className="text-slate-400 mr-1.5" />
            <input
              type="text"
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-white font-mono text-xs focus:outline-none w-20 sm:w-28"
            />
          </div>

          <div className="flex items-center bg-[#131924] p-0.5 rounded-lg border border-[#1E293B] text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'ALL' ? 'bg-[#1E293B] text-white font-medium shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter('LONG')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'LONG' ? 'bg-[#1E293B] text-emerald-400 font-medium shadow' : 'text-slate-400 hover:text-emerald-400'}`}
            >
              Long
            </button>
            <button
              onClick={() => setFilter('SHORT')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'SHORT' ? 'bg-[#1E293B] text-rose-400 font-medium shadow' : 'text-slate-400 hover:text-rose-400'}`}
            >
              Short
            </button>
            <button
              onClick={() => setFilter('WIN')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'WIN' ? 'bg-emerald-950/60 text-emerald-400 font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Gewinner
            </button>
            <button
              onClick={() => setFilter('LOSS')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'LOSS' ? 'bg-rose-950/60 text-rose-400 font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Verlierer
            </button>
          </div>

          <button
            onClick={exportCSV}
            title="Als CSV herunterladen"
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 hover:text-white transition-colors"
          >
            <Download size={13} />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="w-full overflow-x-auto max-h-[320px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-[#0F141C] text-slate-400 sticky top-0 border-b border-[#1E293B] select-none">
            <tr>
              <th className="py-2.5 px-3 font-semibold">#</th>
              <th className="py-2.5 px-3 font-semibold">Typ</th>
              <th className="py-2.5 px-3 font-semibold">Einstieg</th>
              <th className="py-2.5 px-3 font-semibold">Preis</th>
              <th className="py-2.5 px-3 font-semibold">Ausstieg</th>
              <th className="py-2.5 px-3 font-semibold">Preis</th>
              <th className="py-2.5 px-3 font-semibold">Größe</th>
              <th className="py-2.5 px-3 font-semibold">Gewinn/Verlust ($)</th>
              <th className="py-2.5 px-3 font-semibold">Rendite (%)</th>
              <th className="py-2.5 px-3 font-semibold">Grund</th>
              <th className="py-2.5 px-3 font-semibold text-right">Dauer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/40">
            {filteredTrades.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                  Keine Trades für die aktuellen Filterkriterien gefunden.
                </td>
              </tr>
            ) : (
              filteredTrades.map((trade, idx) => {
                const isWin = trade.pnl > 0;
                return (
                  <tr key={trade.id} className="hover:bg-[#131924]/60 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-medium">{trades.length - idx}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                        trade.type === 'LONG'
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40'
                          : 'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                      }`}>
                        {trade.type === 'LONG' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-300">{trade.entryTime}</td>
                    <td className="py-2 px-3 font-semibold text-white">${trade.entryPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-300">{trade.exitTime}</td>
                    <td className="py-2 px-3 font-semibold text-white">${trade.exitPrice.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-400">{trade.size}</td>
                    <td className="py-2 px-3 font-bold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}${trade.pnl.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold">
                      <span className={`px-1.5 py-0.5 rounded ${isWin ? 'bg-emerald-950/60 text-emerald-400' : 'bg-rose-950/60 text-rose-400'}`}>
                        {isWin ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-sans ${
                        trade.exitReason === 'TAKE_PROFIT'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : trade.exitReason === 'STOP_LOSS'
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          : 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                      }`}>
                        {trade.exitReason === 'TAKE_PROFIT' ? 'Take Profit' : trade.exitReason === 'STOP_LOSS' ? 'Stop Loss' : trade.exitReason}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      {trade.barsHeld} {trade.barsHeld === 1 ? 'Tag' : 'Tage'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
