import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import type { StrategyPreset } from '../../engine/strategyPresets';
import { STRATEGY_PRESETS } from '../../engine/strategyPresets';
import { Play, RotateCcw, Sliders, Terminal, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  selectedPreset: StrategyPreset;
  onSelectPreset: (preset: StrategyPreset) => void;
  params: Record<string, any>;
  onParamChange: (key: string, value: any) => void;
  onRunBacktest: () => void;
  logs: string[];
  errorMessage: string | null;
  isRunning: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onCodeChange,
  selectedPreset,
  onSelectPreset,
  params,
  onParamChange,
  onRunBacktest,
  logs,
  errorMessage,
  isRunning
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'params' | 'console'>('editor');

  const handleResetToPreset = () => {
    onCodeChange(selectedPreset.code);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#0B0E14] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2.5 bg-[#0F141C] border-b border-[#1E293B] gap-2">
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-[#131924] px-2.5 py-1 rounded-lg border border-[#1E293B]">
            <FileCode size={14} className="text-sky-400" />
            <select
              value={selectedPreset.id}
              onChange={(e) => {
                const found = STRATEGY_PRESETS.find(p => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
            >
              {STRATEGY_PRESETS.map(preset => (
                <option key={preset.id} value={preset.id} className="bg-[#0F141C] text-white">
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center bg-[#131924] p-0.5 rounded-lg border border-[#1E293B] text-xs">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-2.5 py-1 rounded transition-colors ${activeTab === 'editor' ? 'bg-[#1E293B] text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Code (JS/TS)
            </button>
            <button
              onClick={() => setActiveTab('params')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${activeTab === 'params' ? 'bg-[#1E293B] text-sky-400 font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              <Sliders size={12} />
              <span>Parameter</span>
            </button>
            <button
              onClick={() => setActiveTab('console')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${activeTab === 'console' ? 'bg-[#1E293B] text-amber-400 font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              <Terminal size={12} />
              <span>Konsole ({logs.length})</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToPreset}
            title="Auf Vorlage zurücksetzen"
            className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={onRunBacktest}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <Play size={13} fill="currentColor" />
            <span>{isRunning ? 'Berechne...' : 'Backtest starten'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full h-[360px] relative">
        {activeTab === 'editor' && (
          <div className="w-full h-full">
            <Editor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(val) => onCodeChange(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
                automaticLayout: true,
                wordWrap: 'on'
              }}
            />
          </div>
        )}

        {activeTab === 'params' && (
          <div className="w-full h-full p-4 overflow-y-auto bg-[#0B0E14] text-xs">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="p-3 bg-[#0F141C] border border-[#1E293B] rounded-lg">
                <h4 className="font-semibold text-slate-200 mb-1">Strategie-Parameter</h4>
                <p className="text-slate-400 text-[11px]">
                  Diese Werte werden direkt als <code className="text-sky-300">params</code> an die Strategiefunktion übergeben.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(params).map(([key, val]) => (
                  <div key={key} className="p-3 bg-[#0F141C] border border-[#1E293B] rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-mono text-slate-300 font-medium">{key}</label>
                      <span className="text-sky-400 font-mono font-bold">{String(val)}</span>
                    </div>

                    {typeof val === 'boolean' ? (
                      <button
                        onClick={() => onParamChange(key, !val)}
                        className={`w-full py-1.5 rounded font-semibold transition-colors ${
                          val ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-[#1E293B] text-slate-400'
                        }`}
                      >
                        {val ? 'Aktiviert (true)' : 'Deaktiviert (false)'}
                      </button>
                    ) : typeof val === 'number' ? (
                      <input
                        type="number"
                        step={Number.isInteger(val) ? 1 : 0.1}
                        value={val}
                        onChange={(e) => onParamChange(key, parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#131924] border border-[#1E293B] rounded px-2.5 py-1 text-white font-mono focus:border-sky-500 focus:outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => onParamChange(key, e.target.value)}
                        className="w-full bg-[#131924] border border-[#1E293B] rounded px-2.5 py-1 text-white font-mono focus:border-sky-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="w-full h-full p-4 overflow-y-auto bg-[#0B0E14] font-mono text-xs space-y-1.5">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 flex items-start gap-2 mb-3">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-bold">Ausführungsfehler:</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {logs.length === 0 && !errorMessage ? (
              <div className="text-slate-500 text-center py-8">
                Noch keine Konsolen-Ausgaben. Klicke auf 'Backtest starten' um Logs zu generieren.
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  className={`p-1.5 rounded border border-transparent ${
                    log.includes('FEHLER')
                      ? 'bg-rose-950/40 text-rose-300 border-rose-900/30'
                      : log.includes('SMC')
                      ? 'bg-purple-950/30 text-purple-300'
                      : 'text-slate-300 hover:bg-[#131924]'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Ribbon */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0F141C] border-t border-[#1E293B] text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          {errorMessage ? (
            <span className="flex items-center gap-1 text-rose-400 font-semibold">
              <AlertCircle size={13} />
              Fehler im Code
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 size={13} />
              Bereit zur Ausführung
            </span>
          )}
        </div>
        <div className="text-slate-500">
          Tipp: Tastenkürzel <kbd className="px-1 py-0.5 rounded bg-[#1E293B] text-slate-300">Strg + Enter</kbd>
        </div>
      </div>
    </div>
  );
};
