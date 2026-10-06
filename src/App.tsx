import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ReplayControls } from './components/Replay/ReplayControls';

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

  // Zeitraffer / Replay State
  const [isReplayMode, setIsReplayMode] = useState<boolean>(true);
  const [replayIndex, setReplayIndex] = useState<number>(35);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);

  // Compute active candle slice (either full dataset or up to current replay bar)
  const activeCandles = useMemo(() => {
    if (!isReplayMode) return candles;
    const count = Math.min(candles.length, Math.max(10, replayIndex + 1));
    return candles.slice(0, count);
  }, [candles, isReplayMode, replayIndex]);

  // Strategy Execution Handler
  const handleRunSimulation = useCallback((candlesToUse = activeCandles) => {
    setIsRunning(true);
    setErrorMessage(null);

    setTimeout(() => {
      try {
        const result = executeStrategyCode({
          candles: candlesToUse,
          code,
          params,
          settings
        });
        setBacktestResult(result);

        if (result.metrics.totalReturn > 0 && !isReplayMode) {
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
    }, 20);
  }, [activeCandles, code, params, settings, isReplayMode]);

  // Run on mount or when active candles change
  useEffect(() => {
    handleRunSimulation(activeCandles);
  }, [activeCandles, handleRunSimulation]);

  // Replay Timer Loop
  useEffect(() => {
    if (!isPlaying || !isReplayMode) return;

    const delay = Math.max(25, 450 / replaySpeed);
    const interval = setInterval(() => {
      setReplayIndex(prev => {
        if (prev >= candles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [isPlaying, isReplayMode, replaySpeed, candles.length]);

  // Keyboard shortcut: Ctrl + Enter
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
    setIsPlaying(false);
    if (asset.id === 'september_2026') {
      setIsReplayMode(true);
      setReplayIndex(35);
    } else {
      setIsReplayMode(false);
      setReplayIndex(asset.candles.length - 1);
    }
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
    setIsReplayMode(false);
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
    setIsReplayMode(false);
  };

  const currentBarDate = activeCandles.length > 0 ? activeCandles[activeCandles.length - 1].time : '';

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#080B10] text-[#E2E8F0]">
      {/* Top Navbar */}
      <Navbar
        selectedAsset={selectedAsset}
        onSelectAsset={handleSelectAsset}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onRunSimulation={() => handleRunSimulation()}
        isRunning={isRunning}
        showEditor={showEditor}
        onToggleEditor={() => setShowEditor(!showEditor)}
        showEquityCurve={showEquityCurve}
        onToggleEquityCurve={() => setShowEquityCurve(!showEquityCurve)}
        onQuickRegimeChange={handleQuickRegimeChange}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 w-full p-3 md:p-4 space-y-4 max-w-[1920px] mx-auto">
        {/* Zeitraffer / Replay Controller Bar */}
        <ReplayControls
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentIndex={isReplayMode ? Math.min(replayIndex, candles.length - 1) : candles.length - 1}
          totalBars={candles.length}
          currentDate={currentBarDate}
          onStepForward={() => setReplayIndex(prev => Math.min(candles.length - 1, prev + 1))}
          onStepBackward={() => setReplayIndex(prev => Math.max(5, prev - 1))}
          onReset={() => {
            setIsPlaying(false);
            setReplayIndex(10);
          }}
          onJumpToEnd={() => {
            setIsPlaying(false);
            setReplayIndex(candles.length - 1);
          }}
          onSeek={(idx) => {
            setIsPlaying(false);
            setReplayIndex(idx);
          }}
          speed={replaySpeed}
          onChangeSpeed={setReplaySpeed}
          isReplayMode={isReplayMode}
          onToggleReplayMode={() => {
            setIsPlaying(false);
            setIsReplayMode(!isReplayMode);
            if (!isReplayMode) setReplayIndex(35);
          }}
          marketTrend={backtestResult?.zones && backtestResult.zones.length > 0 ? 'BULLISH' : 'NEUTRAL'}
        />

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
                candles={activeCandles}
                trades={backtestResult?.trades}
                overlays={backtestResult?.overlays}
                zones={backtestResult?.zones}
                swingPoints={backtestResult?.swingPoints}
                failedTests={backtestResult?.failedTests}
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
                onRunBacktest={() => handleRunSimulation()}
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
