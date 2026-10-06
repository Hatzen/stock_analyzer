import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { PRESET_ASSETS } from './data/historicalPresets';
import type { MarketAssetPreset } from './data/historicalPresets';
import { generateSyntheticCandles } from './data/syntheticGenerator';
import { STRATEGY_PRESETS } from './engine/strategyPresets';
import type { StrategyPreset } from './engine/strategyPresets';
import { executeStrategyCode } from './engine/strategyRunner';
import { DEFAULT_SETTINGS } from './engine/backtester';
import type { Candle, BacktestResult, SimulationSettings } from './types/market';

import { Navbar } from './components/Navbar/Navbar';
import { TradingViewChart } from './components/Chart/TradingViewChart';
import { EquityChart } from './components/Chart/EquityChart';
import { MetricsCards } from './components/Analytics/MetricsCards';
import { TradeLogTable } from './components/Analytics/TradeLogTable';
import { CodeEditor } from './components/Editor/CodeEditor';
import { DataImportModal } from './components/Modal/DataImportModal';

export function App() {
  const [selectedAsset, setSelectedAsset] = useState<MarketAssetPreset>(PRESET_ASSETS[0]);
  const [candles, setCandles] = useState<Candle[]>(PRESET_ASSETS[0].candles);

  const [selectedPreset, setSelectedPreset] = useState<StrategyPreset>(STRATEGY_PRESETS[0]);
  const [code, setCode] = useState<string>(STRATEGY_PRESETS[0].code);
  const [params, setParams] = useState<Record<string, any>>(STRATEGY_PRESETS[0].defaultParams);
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);

  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [showEquityCurve, setShowEquityCurve] = useState<boolean>(true);
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  // Strategy Execution Handler
  const handleRunSimulation = useCallback(() => {
    setIsRunning(true);
    setErrorMessage(null);

    setTimeout(() => {
      try {
        const result = executeStrategyCode({
          candles,
          code,
          params,
          settings
        });
        setBacktestResult(result);

        if (result.metrics.totalReturn > 0) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10B981', '#38BDF8', '#F59E0B']
          });
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Fehler bei der Ausführung.');
      } finally {
        setIsRunning(false);
      }
    }, 50);
  }, [candles, code, params, settings]);

  // Initial Run on Load
  useEffect(() => {
    handleRunSimulation();
  }, [selectedAsset]);

  // Keyboard shortcut: Ctrl + Enter / Cmd + Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunSimulation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunSimulation]);

  // Asset Switcher
  const handleSelectAsset = (asset: MarketAssetPreset) => {
    setSelectedAsset(asset);
    setCandles(asset.candles);
  };

  // Preset Switcher
  const handleSelectPreset = (preset: StrategyPreset) => {
    setSelectedPreset(preset);
    setCode(preset.code);
    setParams(preset.defaultParams);
    setErrorMessage(null);
  };

  const handleParamChange = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Custom Data Load from Modal
  const handleLoadCustomCandles = (name: string, newCandles: Candle[]) => {
    const customAsset: MarketAssetPreset = {
      id: `custom_${Date.now()}`,
      name,
      ticker: name.toUpperCase().slice(0, 8),
      category: 'Synthetic',
      description: 'Benutzerdefinierte Marktdaten',
      candles: newCandles
    };
    setSelectedAsset(customAsset);
    setCandles(newCandles);
  };

  // Quick Regime Buttons
  const handleQuickRegimeChange = (regime: 'BULL_TREND' | 'BEAR_CRASH' | 'SIDEWAYS_CHOP') => {
    const newCandles = generateSyntheticCandles({
      regime,
      barsCount: 280,
      startPrice: 150,
      volatility: regime === 'BEAR_CRASH' ? 0.024 : 0.016
    });

    const labels = {
      BULL_TREND: 'BULL-SIM',
      BEAR_CRASH: 'CRASH-SIM',
      SIDEWAYS_CHOP: 'CHOP-SIM'
    };

    const newAsset: MarketAssetPreset = {
      id: `regime_${regime.toLowerCase()}`,
      name: `${regime.replace('_', ' ')} Simulation`,
      ticker: labels[regime],
      category: 'Synthetic',
      description: `Generierte Marktsimulation: ${regime}`,
      candles: newCandles
    };

    setSelectedAsset(newAsset);
    setCandles(newCandles);
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#080B10] text-[#E2E8F0]">
      {/* Top Navbar */}
      <Navbar
        selectedAsset={selectedAsset}
        onSelectAsset={handleSelectAsset}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onRunSimulation={handleRunSimulation}
        isRunning={isRunning}
        showEditor={showEditor}
        onToggleEditor={() => setShowEditor(!showEditor)}
        showEquityCurve={showEquityCurve}
        onToggleEquityCurve={() => setShowEquityCurve(!showEquityCurve)}
        onQuickRegimeChange={handleQuickRegimeChange}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 w-full p-3 md:p-4 space-y-4 max-w-[1920px] mx-auto">
        {/* KPI Metrics Summary Ribbon */}
        {backtestResult && (
          <MetricsCards metrics={backtestResult.metrics} />
        )}

        {/* Core Workspace Grid: Charts & Code Editor */}
        <div className={`grid gap-4 ${showEditor ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Left Column: Candlestick Chart & Equity Curve */}
          <div className={`${showEditor ? 'lg:col-span-7 xl:col-span-8' : 'w-full'} space-y-4 flex flex-col`}>
            {/* Primary Candlestick Chart */}
            <div className="h-[520px] w-full">
              <TradingViewChart
                candles={candles}
                trades={backtestResult?.trades}
                overlays={backtestResult?.overlays}
                zones={backtestResult?.zones}
                swingPoints={backtestResult?.swingPoints}
                symbolName={selectedAsset.ticker}
              />
            </div>

            {/* Optional Equity Curve Panel */}
            {showEquityCurve && backtestResult && (
              <div className="h-[250px] w-full">
                <EquityChart
                  equityData={backtestResult.equityCurve}
                  initialCapital={settings.initialCapital}
                />
              </div>
            )}
          </div>

          {/* Right Column: Code Editor & Strategy Configuration */}
          {showEditor && (
            <div className="lg:col-span-5 xl:col-span-4 h-[520px] lg:h-auto min-h-[520px] flex flex-col">
              <CodeEditor
                code={code}
                onCodeChange={setCode}
                selectedPreset={selectedPreset}
                onSelectPreset={handleSelectPreset}
                params={params}
                onParamChange={handleParamChange}
                onRunBacktest={handleRunSimulation}
                logs={backtestResult?.logs || []}
                errorMessage={errorMessage}
                isRunning={isRunning}
              />
            </div>
          )}
        </div>

        {/* Detailed Trade History Table */}
        {backtestResult && (
          <div className="w-full pt-1">
            <TradeLogTable trades={backtestResult.trades} />
          </div>
        )}
      </main>

      {/* Data Import & Settings Modal */}
      <DataImportModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        onLoadCustomCandles={handleLoadCustomCandles}
        settings={settings}
        onUpdateSettings={setSettings}
      />
    </div>
  );
}

export default App;
