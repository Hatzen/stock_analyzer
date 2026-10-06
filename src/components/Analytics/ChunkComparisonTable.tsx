import React from 'react';
import type { ChunkComparisonMetric } from '../../types/market';
import { ArrowUpRight, ArrowDownRight, Award, CheckCircle2, X } from 'lucide-react';

interface ChunkComparisonTableProps {
  metrics: ChunkComparisonMetric[];
  selectedChunkIndex: number;
  onSelectChunk: (index: number) => void;
  onClose: () => void;
}

export const ChunkComparisonTable: React.FC<ChunkComparisonTableProps> = ({
  metrics,
  selectedChunkIndex,
  onSelectChunk,
  onClose
}) => {
  if (metrics.length === 0) return null;

  const totalChunks = metrics.length;
  const profitableChunks = metrics.filter(m => m.totalReturn > 0).length;
  const consistencyRate = ((profitableChunks / totalChunks) * 100).toFixed(0);

  const avgReturn = (metrics.reduce((acc, m) => acc + m.totalReturn, 0) / totalChunks).toFixed(2);
  const avgWinRate = (metrics.reduce((acc, m) => acc + m.winRate, 0) / totalChunks).toFixed(1);
  const avgProfitFactor = (metrics.reduce((acc, m) => acc + m.profitFactor, 0) / totalChunks).toFixed(2);

  return (
    <div className="w-full bg-[#0F141C] border border-[#1E293B] rounded-2xl p-4 shadow-2xl flex flex-col gap-3 animate-in fade-in duration-200">
      {/* Header with KPI Consistency Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B]/70 pb-3">
        <div className="flex items-center gap-2">
          <Award size={18} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Multi-Chunk Performance Scorecard (Vergleichsanalyse)
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Consistency Badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
            <CheckCircle2 size={13} />
            <span>Profitabel in <strong>{profitableChunks}/{totalChunks}</strong> Zeiträumen ({consistencyRate}% Konsistenz)</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Summary Averages Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#131924]/60 p-2.5 rounded-xl border border-[#1E293B]/40 text-xs font-mono">
        <div>
          <span className="text-slate-400 block text-[11px]">Ø Rendite / Chunk:</span>
          <strong className={Number(avgReturn) >= 0 ? 'text-emerald-400 text-sm' : 'text-rose-400 text-sm'}>
            {Number(avgReturn) >= 0 ? '+' : ''}{avgReturn}%
          </strong>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Ø Win-Rate:</span>
          <strong className="text-sky-400 text-sm">{avgWinRate}%</strong>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Ø Profit Factor:</span>
          <strong className="text-amber-400 text-sm">{avgProfitFactor}</strong>
        </div>
        <div>
          <span className="text-slate-400 block text-[11px]">Gesamte Zeiträume:</span>
          <strong className="text-white text-sm">{totalChunks} Chunks getestet</strong>
        </div>
      </div>

      {/* Table of all Chunks */}
      <div className="w-full overflow-x-auto max-h-[360px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-[#0B0E14] text-slate-400 sticky top-0 border-b border-[#1E293B] select-none">
            <tr>
              <th className="py-2 px-3">Zeitraum / Chunk</th>
              <th className="py-2 px-3">Datum</th>
              <th className="py-2 px-3">Strategie Rendite</th>
              <th className="py-2 px-3">Benchmark</th>
              <th className="py-2 px-3">Win Rate</th>
              <th className="py-2 px-3">Profit Factor</th>
              <th className="py-2 px-3">Max DD</th>
              <th className="py-2 px-3">Trades</th>
              <th className="py-2 px-3 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/40">
            {metrics.map((m, idx) => {
              const isWin = m.totalReturn > 0;
              const isSelected = idx === selectedChunkIndex;

              return (
                <tr
                  key={m.chunkId}
                  className={`hover:bg-[#131924] transition-colors cursor-pointer ${
                    isSelected ? 'bg-sky-950/40 border-l-2 border-sky-400' : ''
                  }`}
                  onClick={() => onSelectChunk(idx)}
                >
                  <td className="py-2 px-3 font-semibold text-white">
                    {m.chunkName}
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    {m.startDate} – {m.endDate}
                  </td>
                  <td className="py-2 px-3 font-bold">
                    <span className={`inline-flex items-center gap-1 ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWin ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {isWin ? '+' : ''}{m.totalReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {m.benchmarkReturn.toFixed(2)}%
                  </td>
                  <td className="py-2 px-3 font-semibold text-sky-400">
                    {m.winRate.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 font-semibold text-amber-400">
                    {m.profitFactor.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-rose-400 font-semibold">
                    -{m.maxDrawdown.toFixed(2)}%
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {m.tradesCount}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectChunk(idx);
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-[#1E293B] text-slate-300 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'Aktiv' : 'Laden'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
