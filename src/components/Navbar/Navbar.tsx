import React from 'react';
import type { MarketAssetPreset } from '../../data/historicalPresets';
import { PRESET_ASSETS } from '../../data/historicalPresets';
import {
  TrendingUp,
  Sliders,
  Play,
  Code2,
  LineChart,
  ShieldAlert,
  Flame,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  selectedAsset: MarketAssetPreset;
  onSelectAsset: (asset: MarketAssetPreset) => void;
  onOpenDataModal: () => void;
  onRunSimulation: () => void;
  isRunning: boolean;
  showEditor: boolean;
  onToggleEditor: () => void;
  showEquityCurve: boolean;
  onToggleEquityCurve: () => void;
  onQuickRegimeChange: (regime: 'BULL_TREND' | 'BEAR_CRASH' | 'SIDEWAYS_CHOP') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  selectedAsset,
  onSelectAsset,
  onOpenDataModal,
  onRunSimulation,
  isRunning,
  showEditor,
  onToggleEditor,
  showEquityCurve,
  onToggleEquityCurve,
  onQuickRegimeChange
}) => {
  return (
    <header className="w-full bg-[#080B10] border-b border-[#1E293B] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40 backdrop-blur-md">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-emerald-400 p-[1.5px] shadow-[0_0_15px_rgba(56,189,248,0.4)]">
            <div className="w-full h-full bg-[#0B0E14] rounded-[7px] flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold tracking-wider text-white">NEXUS<span className="text-sky-400">QUANT</span></h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
                SMC PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight hidden sm:block">Market Structure & Backtesting Studio</p>
          </div>
        </div>

        {/* Asset Selector */}
        <div className="hidden md:flex items-center ml-4 pl-4 border-l border-[#1E293B] gap-2">
          <label className="text-xs text-slate-400 font-medium">Asset:</label>
          <div className="flex items-center bg-[#131924] px-2.5 py-1 rounded-lg border border-[#1E293B] hover:border-slate-700 transition-colors">
            <select
              value={selectedAsset.id}
              onChange={(e) => {
                const found = PRESET_ASSETS.find(a => a.id === e.target.value);
                if (found) onSelectAsset(found);
              }}
              className="bg-transparent text-xs text-white font-mono font-semibold focus:outline-none cursor-pointer"
            >
              {PRESET_ASSETS.map((asset) => (
                <option key={asset.id} value={asset.id} className="bg-[#0F141C] text-white">
                  {asset.ticker} ({asset.name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Center Quick Regime Scenario Toggles */}
      <div className="hidden lg:flex items-center gap-1.5 bg-[#0F141C] p-1 rounded-xl border border-[#1E293B] text-xs">
        <span className="text-slate-400 text-[11px] px-2 font-medium">Szenarien:</span>
        <button
          onClick={() => onQuickRegimeChange('BULL_TREND')}
          className="px-2.5 py-1 rounded-lg bg-[#131924] hover:bg-emerald-950/50 text-slate-300 hover:text-emerald-400 border border-transparent hover:border-emerald-500/40 transition-all font-medium text-[11px] flex items-center gap-1"
        >
          <Flame size={12} className="text-emerald-400" />
          <span>Bull Trend</span>
        </button>
        <button
          onClick={() => onQuickRegimeChange('BEAR_CRASH')}
          className="px-2.5 py-1 rounded-lg bg-[#131924] hover:bg-rose-950/50 text-slate-300 hover:text-rose-400 border border-transparent hover:border-rose-500/40 transition-all font-medium text-[11px] flex items-center gap-1"
        >
          <ShieldAlert size={12} className="text-rose-400" />
          <span>Crash / Bear</span>
        </button>
        <button
          onClick={() => onQuickRegimeChange('SIDEWAYS_CHOP')}
          className="px-2.5 py-1 rounded-lg bg-[#131924] hover:bg-amber-950/50 text-slate-300 hover:text-amber-400 border border-transparent hover:border-amber-500/40 transition-all font-medium text-[11px] flex items-center gap-1"
        >
          <Sparkles size={12} className="text-amber-400" />
          <span>Range Chop</span>
        </button>
      </div>

      {/* Right Action Tools */}
      <div className="flex items-center gap-2">
        {/* Toggle Editor & Equity Panes */}
        <div className="flex items-center bg-[#0F141C] p-0.5 rounded-lg border border-[#1E293B]">
          <button
            onClick={onToggleEditor}
            title="Code Editor Panel umschalten"
            className={`p-1.5 rounded-md transition-colors ${
              showEditor ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 size={15} />
          </button>
          <button
            onClick={onToggleEquityCurve}
            title="Equity Curve Panel umschalten"
            className={`p-1.5 rounded-md transition-colors ${
              showEquityCurve ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart size={15} />
          </button>
        </div>

        {/* Data & Settings Button */}
        <button
          onClick={onOpenDataModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131924] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
        >
          <Sliders size={13} />
          <span className="hidden sm:inline">Daten & Settings</span>
        </button>

        {/* Run Simulation Glow Button */}
        <button
          onClick={onRunSimulation}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.7)] cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Play size={13} fill="currentColor" />
          <span>{isRunning ? 'Simulation läuft...' : 'Simulation ausführen'}</span>
        </button>
      </div>
    </header>
  );
};
