import { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { REAL_LIFE_ASSETS } from './data/realLifeData';
import { generateChunks, evaluateAllChunks } from './utils/chunkManager';
import { STRATEGY_PRESETS } from './engine/strategyPresets';
import type { StrategyPreset } from './engine/strategyPresets';
import { executeStrategyCode } from './engine/strategyRunner';
import { DEFAULT_SETTINGS } from './engine/backtester';
import type {
  Candle,
  BacktestResult,
  SimulationSettings,
  ChunkDuration,
  ChunkComparisonMetric
} from './types/market';
import type { MarketAssetPreset } from './data/historicalPresets';

import { Navbar } from './components/Navbar/Navbar';
import { TradingViewChart } from './components/Chart/TradingViewChart';
import { EquityChart } from './components/Chart/EquityChart';
import { MetricsCards } from './components/Analytics/MetricsCards';
import { TradeLogTable } from './components/Analytics/TradeLogTable';
import { CodeEditor } from './components/Editor/CodeEditor';
import { DataImportModal } from './components/Modal/DataImportModal';
import { SimulationFlowPanel } from './components/Simulation/SimulationFlowPanel';
import { ChunkComparisonTable } from './components/Analytics/ChunkComparisonTable';

export function App() {
  // 1. Multi-Year Real-Life Assets & Chunking State
  const [selectedAssetId, setSelectedAssetId] = useState<string>('spy');
  const [chunkDuration, setChunkDuration] = useState<ChunkDuration>('3M'); // 1 Quarter default

  // Generate full multi-year history for current asset
  const fullCandles = useMemo(() => {
    const asset = REAL_LIFE_ASSETS.find(a => a.id === selectedAssetId) || REAL_LIFE_ASSETS[0];
    return asset.generateHistory();
  }, [selectedAssetId]);

  // Compute chunks
  const chunks = useMemo(() => {
    return generateChunks(fullCandles, chunkDuration);
  }, [fullCandles, chunkDuration]);

  // Active Chunk selection (default to a rich mid-to-recent chunk)
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number>(0);

  // Keep index within bounds if chunks length changes
  const activeChunkIndex = Math.min(Math.max(0, selectedChunkIndex), Math.max(0, chunks.length - 1));
  const activeChunk = chunks[activeChunkIndex] || null;
  const chunkCandles = useMemo(() => activeChunk ? activeChunk.candles : [], [activeChunk]);

  // 2. Simulation Flow & Replay State
  const [isReplayMode, setIsReplayMode] = useState<boolean>(false);
  const [currentBarIndex, setCurrentBarIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [autoPauseOnSignal, setAutoPauseOnSignal] = useState<boolean>(true);

  // 3. Strategy & Backtest State
  const [selectedPreset, setSelectedPreset] = useState<StrategyPreset>(STRATEGY_PRESETS[0]);
  const [code, setCode] = useState<string>(STRATEGY_PRESETS[0].code);
  const [params, setParams] = useState<Record<string, any>>(STRATEGY_PRESETS[0].defaultParams);
  const [settings, setSettings] = useState<SimulationSettings>(DEFAULT_SETTINGS);

  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // UI Panels
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const [showEquityCurve, setShowEquityCurve] = useState<boolean>(true);
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  // Multi-Chunk Comparison Scorecard State
  const [chunkMetrics, setChunkMetrics] = useState<ChunkComparisonMetric[]>([]);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Compute visible candle slice for current chunk
  const displayedCandles = useMemo(() => {
    if (!chunkCandles || chunkCandles.length === 0) return [];
    if (!isReplayMode) return chunkCandles;
    const safeIndex = Math.min(chunkCandles.length, Math.max(5, currentBarIndex + 1));
    return chunkCandles.slice(0, safeIndex);
  }, [chunkCandles, isReplayMode, currentBarIndex]);

  // Execute Backtest on current visible candle slice
  const handleRunSimulation = useCallback((candlesToUse = displayedCandles) => {
    if (!candlesToUse || candlesToUse.length === 0) return;
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

        // Auto-pause check: did a new trade execute on the very last bar?
        if (isReplayMode && autoPauseOnSignal && isPlaying && result.trades.length > 0) {
          const lastTrade = result.trades[result.trades.length - 1];
          const lastCandle = candlesToUse[candlesToUse.length - 1];
          if (lastTrade.entryTime === lastCandle.time || lastTrade.exitTime === lastCandle.time) {
            setIsPlaying(false);
          }
        }

        if (result.metrics.totalReturn > 0 && !isReplayMode) {
          confetti({
            particleCount: 40,
            spread: 55,
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
  }, [displayedCandles, code, params, settings, isReplayMode, autoPauseOnSignal, isPlaying]);

  // Run backtest whenever visible candles change
  useEffect(() => {
    handleRunSimulation(displayedCandles);
  }, [displayedCandles, handleRunSimulation]);

  // Reset replay progress when active chunk changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentBarIndex(chunkCandles.length > 0 ? Math.min(15, chunkCandles.length - 1) : 0);
  }, [activeChunkIndex, chunkDuration, selectedAssetId, chunkCandles.length]);

  // Replay Timer Loop
  useEffect(() => {
    if (!isPlaying || !isReplayMode) return;

    const delay = Math.max(25, 450 / replaySpeed);
    const interval = setInterval(() => {
      setCurrentBarIndex(prev => {
        if (prev >= chunkCandles.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [isPlaying, isReplayMode, replaySpeed, chunkCandles.length]);

  // Jump to Next Trade Action
  const handleJumpToNextTrade = () => {
    if (!backtestResult || chunkCandles.length === 0) return;
    // Run full chunk backtest once to locate all trade times
    const fullResult = executeStrategyCode({
      candles: chunkCandles,
      code,
      params,
      settings
    });

    const nextTrade = fullResult.trades.find(t => {
      const entryIdx = chunkCandles.findIndex(c => c.time === t.entryTime);
      return entryIdx > currentBarIndex;
    });

    if (nextTrade) {
      const targetIdx = chunkCandles.findIndex(c => c.time === nextTrade.entryTime);
      if (targetIdx !== -1) {
        setIsPlaying(false);
        setCurrentBarIndex(targetIdx);
      }
    } else {
      // Jump to end if no further trades
      setCurrentBarIndex(chunkCandles.length - 1);
    }
  };

  // Run Multi-Chunk Comparison Scorecard
  const handleRunBatchComparison = () => {
    setIsComparing(true);
    setTimeout(() => {
      try {
        const metrics = evaluateAllChunks(chunks, code, params, settings);
        setChunkMetrics(metrics);
        setShowComparison(true);
      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setIsComparing(false);
      }
    }, 50);
  };

  // Strategy Presets
  const handleSelectPreset = (preset: StrategyPreset) => {
    setSelectedPreset(preset);
    setCode(preset.code);
    setParams(preset.defaultParams);
    setErrorMessage(null);
  };

  const handleParamChange = (key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Custom data from modal
  const handleLoadCustomCandles = (_name: string, newCandles: Candle[]) => {
    // Allows loading custom candles
    if (newCandles.length > 0) {
      setIsReplayMode(false);
      handleRunSimulation(newCandles);
    }
  };

  const currentBarDate = displayedCandles.length > 0 ? displayedCandles[displayedCandles.length - 1].time : '';

  // Active asset descriptor for Navbar
  const currentAsset = REAL_LIFE_ASSETS.find(a => a.id === selectedAssetId) || REAL_LIFE_ASSETS[0];
  const navbarAssetMock: MarketAssetPreset = {
    id: currentAsset.id,
    name: currentAsset.name,
    ticker: currentAsset.ticker,
    category: 'Stock',
    description: currentAsset.description,
    candles: chunkCandles
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#080B10] text-[#E2E8F0]">
      {/* Top Navbar */}
      <Navbar
        selectedAsset={navbarAssetMock}
        onSelectAsset={(a) => setSelectedAssetId(a.id)}
        onOpenDataModal={() => setIsDataModalOpen(true)}
        onRunSimulation={() => handleRunSimulation()}
        isRunning={isRunning}
        showEditor={showEditor}
        onToggleEditor={() => setShowEditor(!showEditor)}
        showEquityCurve={showEquityCurve}
        onToggleEquityCurve={() => setShowEquityCurve(!showEquityCurve)}
        onQuickRegimeChange={() => {}}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 w-full p-3 md:p-4 space-y-4 max-w-[1920px] mx-auto">
        {/* Simulation Flow Controller: Real Life Assets, Intervals, Chunks & Replay */}
        <SimulationFlowPanel
          selectedAssetId={selectedAssetId}
          onSelectAssetId={setSelectedAssetId}
          chunkDuration={chunkDuration}
          onChangeChunkDuration={setChunkDuration}
          chunks={chunks}
          selectedChunkIndex={activeChunkIndex}
          onSelectChunkIndex={setSelectedChunkIndex}
          isReplayMode={isReplayMode}
          onToggleReplayMode={() => {
            setIsPlaying(false);
            setIsReplayMode(!isReplayMode);
            if (!isReplayMode) setCurrentBarIndex(Math.min(20, chunkCandles.length - 1));
          }}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentBarIndex={currentBarIndex}
          totalBarsInChunk={chunkCandles.length}
          currentDate={currentBarDate}
          onStepForward={(step = 1) => setCurrentBarIndex(prev => Math.min(chunkCandles.length - 1, prev + step))}
          onResetReplay={() => {
            setIsPlaying(false);
            setCurrentBarIndex(5);
          }}
          onJumpToEnd={() => {
            setIsPlaying(false);
            setCurrentBarIndex(chunkCandles.length - 1);
          }}
          onSeek={(idx) => {
            setIsPlaying(false);
            setCurrentBarIndex(idx);
          }}
          speed={replaySpeed}
          onChangeSpeed={setReplaySpeed}
          autoPauseOnSignal={autoPauseOnSignal}
          onToggleAutoPause={() => setAutoPauseOnSignal(!autoPauseOnSignal)}
          onJumpToNextTrade={handleJumpToNextTrade}
          onRunBatchComparison={handleRunBatchComparison}
          isComparing={isComparing}
          showComparison={showComparison}
          onToggleShowComparison={() => setShowComparison(!showComparison)}
        />

        {/* Multi-Chunk Comparative Scorecard Table */}
        {showComparison && (
          <ChunkComparisonTable
            metrics={chunkMetrics}
            selectedChunkIndex={activeChunkIndex}
            onSelectChunk={(idx) => {
              setSelectedChunkIndex(idx);
              setIsPlaying(false);
            }}
            onClose={() => setShowComparison(false)}
          />
        )}

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
                candles={displayedCandles}
                trades={backtestResult?.trades}
                overlays={backtestResult?.overlays}
                zones={backtestResult?.zones}
                swingPoints={backtestResult?.swingPoints}
                failedTests={backtestResult?.failedTests}
                symbolName={`${currentAsset.ticker} [${activeChunk ? activeChunk.name : ''}]`}
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
