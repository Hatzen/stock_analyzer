import React from 'react';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, FastForward, Clock } from 'lucide-react';

interface ReplayControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentIndex: number;
  totalBars: number;
  currentDate: string;
  onStepForward: () => void;
  onStepBackward: () => void;
  onReset: () => void;
  onJumpToEnd: () => void;
  onSeek: (index: number) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  isReplayMode: boolean;
  onToggleReplayMode: () => void;
  marketTrend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export const ReplayControls: React.FC<ReplayControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentIndex,
  totalBars,
  currentDate,
  onStepForward,
  onStepBackward,
  onReset,
  onJumpToEnd,
  onSeek,
  speed,
  onChangeSpeed,
  isReplayMode,
  onToggleReplayMode,
  marketTrend = 'BULLISH'
}) => {
  const speeds = [0.5, 1, 2, 5, 10];

  return (
    <div className="w-full bg-[#0F141C] border border-[#1E293B] rounded-xl p-3 flex flex-col gap-2.5 shadow-xl">
      {/* Top Bar: Replay Mode Toggle, Date Display, Trend Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B]/60 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleReplayMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-md ${
              isReplayMode
                ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                : 'bg-[#1E293B] text-slate-300 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>{isReplayMode ? 'Zeitraffer Aktiv (Replay)' : 'Zeitraffer-Modus Starten'}</span>
          </button>

          {isReplayMode && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#131924] border border-[#1E293B] text-xs font-mono text-slate-300">
              <span className="text-slate-500">Zeitpunkt:</span>
              <strong className="text-white">{currentDate || '2026-09-01'}</strong>
              <span className="text-slate-500">({currentIndex + 1}/{totalBars} Kerzen)</span>
            </div>
          )}
        </div>

        {/* Live Structure Status */}
        {isReplayMode && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs font-medium">Noc Trend:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
              marketTrend === 'BULLISH'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-400'
                : marketTrend === 'BEARISH'
                ? 'bg-rose-950/70 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-600 text-slate-300'
            }`}>
              {marketTrend === 'BULLISH' ? '📈 AUFWÄRTSTREND' : marketTrend === 'BEARISH' ? '📉 ABWÄRTSTREND' : '⚖️ NEUTRAL'}
            </span>
          </div>
        )}
      </div>

      {/* Control Buttons & Progress Slider */}
      {isReplayMode && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Playback Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onReset}
              title="Auf Anfang September zurücksetzen"
              className="p-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw size={14} />
            </button>

            <button
              onClick={onStepBackward}
              disabled={currentIndex <= 0}
              title="1 Kerze zurück"
              className="p-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white transition-colors disabled:opacity-30"
            >
              <SkipBack size={14} />
            </button>

            <button
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause' : 'Zeitraffer abspielen'}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/30 active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
            </button>

            <button
              onClick={onStepForward}
              disabled={currentIndex >= totalBars - 1}
              title="1 Kerze vorwärts"
              className="p-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white transition-colors disabled:opacity-30"
            >
              <SkipForward size={14} />
            </button>

            <button
              onClick={onJumpToEnd}
              title="Zum Monatsende springen"
              className="p-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] text-slate-300 hover:text-white transition-colors"
            >
              <FastForward size={14} />
            </button>
          </div>

          {/* Timeline Scrubber */}
          <div className="flex-1 w-full flex items-center gap-2 px-2">
            <span className="text-[11px] font-mono text-slate-400">01.09</span>
            <input
              type="range"
              min={0}
              max={totalBars - 1}
              value={currentIndex}
              onChange={(e) => onSeek(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <span className="text-[11px] font-mono text-slate-400">30.09</span>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 bg-[#131924] p-0.5 rounded-lg border border-[#1E293B]">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => onChangeSpeed(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                  speed === s ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
