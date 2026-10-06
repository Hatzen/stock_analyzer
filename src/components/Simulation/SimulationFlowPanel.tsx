import React from 'react';
import type { ChunkDuration, DataChunk } from '../../types/market';
import { REAL_LIFE_ASSETS } from '../../data/realLifeData';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  BarChart3,
  Clock,
  Zap
} from 'lucide-react';

import type { RealLifeAssetInfo } from '../../data/realLifeData';

interface SimulationFlowPanelProps {
  // Asset state
  selectedAssetId: string;
  onSelectAssetId: (id: string) => void;
  availableAssets?: RealLifeAssetInfo[];
  onOpenDataModal?: () => void;

  // Chunk state
  chunkDuration: ChunkDuration;
  onChangeChunkDuration: (duration: ChunkDuration) => void;
  chunks: DataChunk[];
  selectedChunkIndex: number;
  onSelectChunkIndex: (index: number) => void;

  // Replay & Flow state
  isReplayMode: boolean;
  onToggleReplayMode: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentBarIndex: number;
  totalBarsInChunk: number;
  currentDate: string;
  onStepForward: (bars?: number) => void;
  onResetReplay: () => void;
  onJumpToEnd: () => void;
  onSeek: (index: number) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  autoPauseOnSignal: boolean;
  onToggleAutoPause: () => void;
  onJumpToNextTrade: () => void;

  // Batch comparison
  onRunBatchComparison: () => void;
  isComparing: boolean;
  showComparison: boolean;
  onToggleShowComparison: () => void;
}

export const SimulationFlowPanel: React.FC<SimulationFlowPanelProps> = ({
  selectedAssetId,
  onSelectAssetId,
  availableAssets = REAL_LIFE_ASSETS,
  onOpenDataModal,
  chunkDuration,
  onChangeChunkDuration,
  chunks,
  selectedChunkIndex,
  onSelectChunkIndex,
  isReplayMode,
  onToggleReplayMode,
  isPlaying,
  onTogglePlay,
  currentBarIndex,
  totalBarsInChunk,
  currentDate,
  onStepForward,
  onResetReplay,
  onJumpToEnd,
  onSeek,
  speed,
  onChangeSpeed,
  autoPauseOnSignal,
  onToggleAutoPause,
  onJumpToNextTrade,
  onRunBatchComparison,
  isComparing,
  showComparison,
  onToggleShowComparison
}) => {
  const speeds = [0.5, 1, 2, 5, 10];
  const activeChunk = chunks[selectedChunkIndex] || null;

  return (
    <div className="w-full bg-[#0F141C] border border-[#1E293B] rounded-2xl p-3.5 flex flex-col gap-3 shadow-2xl">
      {/* Row 1: Real-Life Asset Dropdown & Chunk Sizing */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B]/70 pb-3">
        {/* Real Asset Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Calendar size={15} className="text-sky-400" />
            <span>Marktdaten:</span>
          </div>
          <div className="bg-[#131924] px-2.5 py-1.5 rounded-lg border border-[#1E293B] text-xs font-mono">
            <select
              value={selectedAssetId}
              onChange={(e) => onSelectAssetId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id} className="bg-[#0F141C] text-white">
                  {asset.ticker} – {asset.name} ({asset.sector})
                </option>
              ))}
            </select>
          </div>

          {/* Authentic Real-Market Badge */}
          <span className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Echte Börsenkurse (2023–2026)</span>
          </span>

          {onOpenDataModal && (
            <button
              onClick={onOpenDataModal}
              title="Anderen Ticker live von der Börse abrufen (z.B. MSFT, AMZN, COIN)"
              className="px-2 py-1 rounded-lg bg-[#131924] hover:bg-[#1E293B] border border-[#1E293B] hover:border-sky-500/50 text-sky-400 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>+ Ticker suchen</span>
            </button>
          )}

          {/* Chunk Duration Pills (1M, 3M, 6M, 1Y) */}
          <div className="flex items-center bg-[#131924] p-0.5 rounded-lg border border-[#1E293B] text-xs ml-1">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Intervall:</span>
            {(['1M', '3M', '6M', '1Y'] as ChunkDuration[]).map((dur) => (
              <button
                key={dur}
                onClick={() => onChangeChunkDuration(dur)}
                className={`px-2.5 py-1 rounded-md font-mono font-semibold transition-colors ${
                  chunkDuration === dur
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dur === '1M' ? '1 Monat' : dur === '3M' ? '1 Quartal' : dur === '6M' ? '6 Monate' : '1 Jahr'}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Comparison Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRunBatchComparison}
            disabled={isComparing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <BarChart3 size={14} />
            <span>{isComparing ? 'Berechne Scorecard...' : 'Alle Chunks vergleichen'}</span>
          </button>

          {showComparison && (
            <button
              onClick={onToggleShowComparison}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] text-slate-300 hover:text-white text-xs font-medium"
            >
              Schließen
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Chunk Selector & Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131924]/60 p-2.5 rounded-xl border border-[#1E293B]/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">Aktiver Zeitraum:</span>
          {/* Previous / Next Chunk Stepper */}
          <div className="flex items-center bg-[#0B0E14] rounded-lg border border-[#1E293B] overflow-hidden">
            <button
              onClick={() => onSelectChunkIndex(Math.max(0, selectedChunkIndex - 1))}
              disabled={selectedChunkIndex <= 0}
              title="Vorheriger Zeitraum"
              className="p-1.5 hover:bg-[#1E293B] text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>

            <select
              value={selectedChunkIndex}
              onChange={(e) => onSelectChunkIndex(parseInt(e.target.value, 10))}
              className="bg-transparent text-xs text-white font-mono font-bold px-2 py-1 focus:outline-none cursor-pointer"
            >
              {chunks.map((ch, idx) => (
                <option key={ch.id} value={idx} className="bg-[#0F141C] text-white">
                  [{idx + 1}/{chunks.length}] {ch.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => onSelectChunkIndex(Math.min(chunks.length - 1, selectedChunkIndex + 1))}
              disabled={selectedChunkIndex >= chunks.length - 1}
              title="Nächster Zeitraum"
              className="p-1.5 hover:bg-[#1E293B] text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {activeChunk && (
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Von: <strong className="text-white">{activeChunk.startDate}</strong></span>
            <span>Bis: <strong className="text-white">{activeChunk.endDate}</strong></span>
            <span className="px-2 py-0.5 rounded bg-[#1E293B] text-sky-400 font-semibold">
              {activeChunk.candles.length} Kerzen
            </span>
          </div>
        )}
      </div>

      {/* Row 3: Simulation Flow Controller (Replay Mode, Stepping, Speeds) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Mode Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleReplayMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              isReplayMode
                ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                : 'bg-[#1E293B] text-slate-300 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>{isReplayMode ? 'Zeitraffer Replay Aktiv' : 'Zeitraffer Replay Starten'}</span>
          </button>

          {isReplayMode && (
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none ml-2">
              <input
                type="checkbox"
                checked={autoPauseOnSignal}
                onChange={onToggleAutoPause}
                className="rounded border-[#1E293B] text-sky-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-[11px]">Auto-Stopp bei Signal</span>
            </label>
          )}
        </div>

        {/* Playback Controls (when Replay is active) */}
        {isReplayMode ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onResetReplay}
              title="Auf Anfang des Chunks zurücksetzen"
              className="p-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={onTogglePlay}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/30 active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
            </button>

            <button
              onClick={() => onStepForward(1)}
              disabled={currentBarIndex >= totalBarsInChunk - 1}
              title="1 Kerze vorwärts"
              className="px-2 py-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white text-xs font-mono font-medium disabled:opacity-30 transition-colors"
            >
              +1 Kerze
            </button>

            <button
              onClick={() => onStepForward(5)}
              disabled={currentBarIndex >= totalBarsInChunk - 5}
              title="5 Kerzen vorwärts"
              className="px-2 py-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white text-xs font-mono font-medium disabled:opacity-30 transition-colors"
            >
              +5 Kerzen
            </button>

            <button
              onClick={onJumpToNextTrade}
              title="Zum nächsten Trade-Einstieg springen"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#131924] hover:bg-sky-950/60 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-medium transition-colors"
            >
              <Zap size={13} />
              <span>Nächster Trade</span>
            </button>

            <button
              onClick={onJumpToEnd}
              title="Zum Ende des Chunks springen"
              className="p-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white transition-colors"
            >
              <FastForward size={14} />
            </button>

            {/* Speeds */}
            <div className="flex items-center gap-0.5 bg-[#131924] p-0.5 rounded-lg border border-[#1E293B] ml-1">
              {speeds.map((s) => (
                <button
                  key={s}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                    speed === s ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 font-mono">
            Modus: <strong className="text-emerald-400">Vollständiger Backtest für diesen Zeitraum</strong>
          </div>
        )}
      </div>

      {/* Scrubber slider when in Replay Mode */}
      {isReplayMode && (
        <div className="w-full flex items-center gap-3 pt-1 border-t border-[#1E293B]/40">
          <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
            Aktuell: <strong className="text-white">{currentDate}</strong> ({currentBarIndex + 1}/{totalBarsInChunk})
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(1, totalBarsInChunk - 1)}
            value={currentBarIndex}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            className="flex-1 h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>
      )}
    </div>
  );
};
