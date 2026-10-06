import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
  ColorType
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { Candle, ChartOverlay, Trade, SMCZone, SMCSwingPoint } from '../../types/market';
import { RotateCcw, Layers, Eye, EyeOff } from 'lucide-react';

interface TradingViewChartProps {
  candles: Candle[];
  trades?: Trade[];
  overlays?: ChartOverlay[];
  zones?: SMCZone[];
  swingPoints?: SMCSwingPoint[];
  symbolName: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  trades = [],
  overlays = [],
  zones = [],
  swingPoints = [],
  symbolName
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const overlaySeriesRefs = useRef<ISeriesApi<'Line'>[]>([]);
  const markersRef = useRef<any>(null);

  const [hoveredData, setHoveredData] = useState<Candle | null>(null);
  const [showOverlays, setShowOverlays] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showSMCLevels, setShowSMCLevels] = useState(true);

  // Initialize and update chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 520,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E14' },
        textColor: '#94A3B8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Inter', monospace"
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' }
      },
      crosshair: {
        vertLine: {
          color: '#38BDF8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0284C7'
        },
        horzLine: {
          color: '#38BDF8',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0284C7'
        }
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2
        }
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    // 1. Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444'
    });
    candleSeriesRef.current = candleSeries;

    // 2. Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay inside chart
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      }
    });
    volumeSeriesRef.current = volumeSeries;

    // Subscribe to crosshair move for header stats
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredData(candles[candles.length - 1] || null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as any;
      if (data) {
        setHoveredData({
          time: String(param.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: 0
        });
      }
    });

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update Candles & Volume
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const candleData = candles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    const volumeData = candles.map(c => ({
      time: c.time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    setHoveredData(candles[candles.length - 1]);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candles]);

  // Update Overlays
  useEffect(() => {
    if (!chartRef.current) return;

    overlaySeriesRefs.current.forEach(series => {
      chartRef.current?.removeSeries(series);
    });
    overlaySeriesRefs.current = [];

    if (!showOverlays) return;

    overlays.forEach(ov => {
      if (ov.type === 'line' && ov.data.length > 0) {
        const lineSeries = chartRef.current!.addSeries(LineSeries, {
          color: ov.color,
          lineWidth: 2,
          title: ov.name,
          crosshairMarkerVisible: true
        });
        lineSeries.setData(ov.data);
        overlaySeriesRefs.current.push(lineSeries);
      }
    });
  }, [overlays, showOverlays]);

  // Update Trade Markers & SMC Annotations
  useEffect(() => {
    if (!candleSeriesRef.current || !chartRef.current) return;

    const allMarkers: any[] = [];

    if (showMarkers) {
      trades.forEach(t => {
        allMarkers.push({
          time: t.entryTime,
          position: t.type === 'LONG' ? 'belowBar' : 'aboveBar',
          color: t.type === 'LONG' ? '#10B981' : '#EF4444',
          shape: t.type === 'LONG' ? 'arrowUp' : 'arrowDown',
          text: `${t.type === 'LONG' ? 'BUY' : 'SHORT'} @ $${t.entryPrice}`
        });

        const isWin = t.pnl > 0;
        allMarkers.push({
          time: t.exitTime,
          position: t.type === 'LONG' ? 'aboveBar' : 'belowBar',
          color: isWin ? '#34D399' : '#F87171',
          shape: 'circle',
          text: `${t.exitReason === 'TAKE_PROFIT' ? 'TP' : t.exitReason === 'STOP_LOSS' ? 'SL' : 'EXIT'} (${t.pnl >= 0 ? '+' : ''}$${t.pnl})`
        });
      });
    }

    if (showSMCLevels && swingPoints.length > 0) {
      swingPoints.forEach(sp => {
        if (sp.classification === 'STRONG') {
          allMarkers.push({
            time: sp.time,
            position: sp.type === 'LOW' ? 'belowBar' : 'aboveBar',
            color: '#38BDF8',
            shape: 'square',
            text: `🛡️ Strong ${sp.type === 'LOW' ? 'Low' : 'High'}`
          });
        } else if (sp.classification === 'WEAK') {
          allMarkers.push({
            time: sp.time,
            position: sp.type === 'HIGH' ? 'aboveBar' : 'belowBar',
            color: '#94A3B8',
            shape: 'circle',
            text: `🎯 Weak ${sp.type === 'HIGH' ? 'High' : 'Low'}`
          });
        }
      });
    }

    allMarkers.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    try {
      if (markersRef.current) {
        markersRef.current.setMarkers(allMarkers);
      } else {
        markersRef.current = createSeriesMarkers(candleSeriesRef.current, allMarkers);
      }
    } catch {
      // Ignoriere Fehler wenn Skala noch nicht gerendert ist
    }
  }, [trades, swingPoints, showMarkers, showSMCLevels]);

  const handleResetZoom = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const lastCandle = hoveredData || (candles.length > 0 ? candles[candles.length - 1] : null);
  const priceChange = lastCandle ? lastCandle.close - lastCandle.open : 0;
  const priceChangePct = lastCandle && lastCandle.open > 0 ? (priceChange / lastCandle.open) * 100 : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="relative flex flex-col w-full h-full bg-[#0B0E14] border border-[#1E293B] rounded-xl overflow-hidden shadow-2xl">
      {/* Top Header Bar inside Chart */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0F141C] border-b border-[#1E293B] gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-white tracking-wide">{symbolName}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#1E293B] text-sky-400 font-semibold border border-[#334155]">
              1D
            </span>
          </div>

          {lastCandle && (
            <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-slate-400 pl-3 border-l border-[#1E293B]">
              <span>O: <strong className="text-white">${lastCandle.open.toFixed(2)}</strong></span>
              <span>H: <strong className="text-emerald-400">${lastCandle.high.toFixed(2)}</strong></span>
              <span>L: <strong className="text-rose-400">${lastCandle.low.toFixed(2)}</strong></span>
              <span>C: <strong className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>${lastCandle.close.toFixed(2)}</strong></span>
              <span className={`px-1.5 py-0.5 rounded font-bold ${isPositive ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePct.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Chart View Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            title="Indikator-Overlays an/aus"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-all font-medium ${
              showOverlays ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-[#1E293B] text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>Indikatoren</span>
          </button>

          <button
            onClick={() => setShowMarkers(!showMarkers)}
            title="Trade-Signale an/aus"
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-all font-medium ${
              showMarkers ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-[#1E293B] text-slate-400 hover:text-white'
            }`}
          >
            {showMarkers ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>Trades</span>
          </button>

          {swingPoints.length > 0 && (
            <button
              onClick={() => setShowSMCLevels(!showSMCLevels)}
              title="SMC Strong/Weak Levels"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-all font-medium ${
                showSMCLevels ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-[#1E293B] text-slate-400 hover:text-white'
              }`}
            >
              <span>SMC Struktur</span>
            </button>
          )}

          <button
            onClick={handleResetZoom}
            title="Chart zurücksetzen (Fit)"
            className="p-1.5 rounded bg-[#1E293B] text-slate-300 hover:text-white hover:bg-[#334155] transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* SMC Active Zones Floating Badge */}
      {zones.length > 0 && (
        <div className="absolute top-14 left-4 z-10 flex flex-wrap gap-2 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[#0F141C]/90 border border-emerald-500/40 text-emerald-300 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Demand Zones: {zones.filter(z => z.type === 'DEMAND' && !z.isMitigated).length} aktiv</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-[#0F141C]/90 border border-rose-500/40 text-rose-300 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Supply Zones: {zones.filter(z => z.type === 'SUPPLY' && !z.isMitigated).length} aktiv</span>
          </div>
        </div>
      )}

      {/* Chart Canvas Area */}
      <div ref={chartContainerRef} className="flex-1 w-full min-h-[460px]" />
    </div>
  );
};
