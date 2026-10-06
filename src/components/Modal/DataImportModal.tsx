import React, { useState } from 'react';
import { parseCSVToCandles } from '../../data/csvParser';
import { generateSyntheticCandles } from '../../data/syntheticGenerator';
import type { MarketRegime } from '../../data/syntheticGenerator';
import type { Candle, SimulationSettings } from '../../types/market';
import { X, Upload, Sliders, Settings2, Sparkles } from 'lucide-react';

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCustomCandles: (name: string, candles: Candle[]) => void;
  settings: SimulationSettings;
  onUpdateSettings: (settings: SimulationSettings) => void;
}

export const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onLoadCustomCandles,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'generator' | 'csv' | 'settings'>('generator');

  // Generator state
  const [regime, setRegime] = useState<MarketRegime>('BULL_TREND');
  const [barCount, setBarCount] = useState<number>(300);
  const [startPrice, setStartPrice] = useState<number>(150);
  const [volatility, setVolatility] = useState<number>(0.02);

  // CSV state
  const [csvText, setCsvText] = useState<string>('');
  const [customAssetName, setCustomAssetName] = useState<string>('Custom Data');
  const [csvError, setCsvError] = useState<string | null>(null);

  // Simulation settings local state
  const [tempSettings, setTempSettings] = useState<SimulationSettings>(settings);

  if (!isOpen) return null;

  const handleGenerateData = () => {
    const candles = generateSyntheticCandles({
      regime,
      barsCount: barCount,
      startPrice,
      volatility
    });
    const regimeNames: Record<MarketRegime, string> = {
      BULL_TREND: 'Bull Trend Sim',
      BEAR_CRASH: 'Bear Crash Sim',
      SIDEWAYS_CHOP: 'Range Chop Sim',
      RANDOM_WALK: 'Random Walk Sim',
      VOLATILE_MOMENTUM: 'Momentum Sim'
    };
    onLoadCustomCandles(regimeNames[regime], candles);
    onClose();
  };

  const handleParseCSV = () => {
    setCsvError(null);
    try {
      if (!csvText.trim()) {
        throw new Error('Bitte füge CSV-Text ein oder lade eine Datei hoch.');
      }
      const candles = parseCSVToCandles(csvText);
      onLoadCustomCandles(customAssetName || 'CSV Data', candles);
      onClose();
    } catch (err: any) {
      setCsvError(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomAssetName(file.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = () => {
    onUpdateSettings(tempSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0F141C] border border-[#1E293B] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#0B0E14]">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Marktdaten & Simulations-Einstellungen
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E293B] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#1E293B] bg-[#131924] px-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'generator' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles size={14} />
            Marktsimulator (GBM)
          </button>
          <button
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'csv' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Upload size={14} />
            CSV-Import
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'settings' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={14} />
            Kapital & Gebühren
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {activeTab === 'generator' && (
            <div className="space-y-4">
              <p className="text-slate-400">
                Erzeuge realistische synthetische Kursdaten basierend auf Geometrischer Brownscher Bewegung mit wählbaren Marktregimen:
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Markt-Regime:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'BULL_TREND', label: '🚀 Bull Trend', desc: 'Stetiger Aufwärtstrend' },
                    { id: 'BEAR_CRASH', label: '💥 Bear Crash', desc: 'Crash & Bärenmarkt' },
                    { id: 'SIDEWAYS_CHOP', label: '⚖️ Range Chop', desc: 'Seitwärtsmarkt' },
                    { id: 'VOLATILE_MOMENTUM', label: '⚡ Krypto Volatilität', desc: 'Hohe Swings & Sweeps' },
                    { id: 'RANDOM_WALK', label: '🎲 Random Walk', desc: 'Reine Wahrscheinlichkeit' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setRegime(item.id as MarketRegime)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        regime === item.id
                          ? 'border-sky-500 bg-sky-500/10 text-white shadow-md'
                          : 'border-[#1E293B] bg-[#0B0E14] text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{item.label}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Anzahl Kerzen:</label>
                  <input
                    type="number"
                    min="50"
                    max="1000"
                    step="50"
                    value={barCount}
                    onChange={(e) => setBarCount(parseInt(e.target.value) || 250)}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Startpreis ($):</label>
                  <input
                    type="number"
                    min="1"
                    value={startPrice}
                    onChange={(e) => setStartPrice(parseFloat(e.target.value) || 100)}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Volatilität:</label>
                  <input
                    type="number"
                    min="0.005"
                    max="0.08"
                    step="0.005"
                    value={volatility}
                    onChange={(e) => setVolatility(parseFloat(e.target.value) || 0.02)}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateData}
                className="w-full mt-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-sky-500/20"
              >
                Synthetische Daten generieren & laden
              </button>
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-4">
              <p className="text-slate-400">
                Importiere eigene Kursdaten (z.B. Export von Yahoo Finance, TradingView, Interactive Brokers):
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Asset-Name / Ticker:</label>
                <input
                  type="text"
                  value={customAssetName}
                  onChange={(e) => setCustomAssetName(e.target.value)}
                  placeholder="z.B. MeineAktie / TSLA"
                  className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">CSV-Datei hochladen:</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg p-2 text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-sky-500 file:text-slate-950 file:font-semibold file:text-xs hover:file:bg-sky-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Oder CSV-Text direkt einfügen:</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Date,Open,High,Low,Close,Volume&#10;2023-01-03,130.28,130.90,124.17,125.07,112117500&#10;..."
                  className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg p-3 text-white font-mono text-[11px] focus:border-sky-500 focus:outline-none"
                />
              </div>

              {csvError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 font-semibold text-xs">
                  {csvError}
                </div>
              )}

              <button
                onClick={handleParseCSV}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
              >
                CSV parsen & in Chart laden
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <p className="text-slate-400">
                Konfiguration des Backtest-Ausführungsmotors für realistische Simulation:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Startkapital ($):</label>
                  <input
                    type="number"
                    value={tempSettings.initialCapital}
                    onChange={(e) => setTempSettings({ ...tempSettings, initialCapital: parseFloat(e.target.value) || 10000 })}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Positionsgröße (% des Kapitals):</label>
                  <input
                    type="number"
                    value={tempSettings.fixedPositionSize}
                    onChange={(e) => setTempSettings({ ...tempSettings, fixedPositionSize: parseFloat(e.target.value) || 20 })}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Ordergebühr / Commission (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tempSettings.commissionPercent}
                    onChange={(e) => setTempSettings({ ...tempSettings, commissionPercent: parseFloat(e.target.value) || 0.05 })}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Slippage (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={tempSettings.slippagePercent}
                    onChange={(e) => setTempSettings({ ...tempSettings, slippagePercent: parseFloat(e.target.value) || 0.02 })}
                    className="w-full bg-[#0B0E14] border border-[#1E293B] rounded-lg px-3 py-2 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempSettings.allowShorting}
                    onChange={(e) => setTempSettings({ ...tempSettings, allowShorting: e.target.checked })}
                    className="rounded border-[#1E293B] text-sky-500 focus:ring-0 w-4 h-4"
                  />
                  <span className="text-slate-300 font-semibold">Short-Positionen erlauben (Leerverkäufe)</span>
                </label>
              </div>

              <button
                onClick={handleSaveSettings}
                className="w-full mt-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-sky-500/20"
              >
                Einstellungen speichern
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
