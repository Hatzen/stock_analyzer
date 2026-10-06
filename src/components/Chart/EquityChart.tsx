import React, { useEffect, useRef } from 'react';
import {
  createChart,
  LineSeries,
  ColorType
} from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { EquityPoint } from '../../types/market';
import { TrendingUp } from 'lucide-react';

interface EquityChartProps {
  equityData: EquityPoint[];
  initialCapital: number;
}

export const EquityChart: React.FC<EquityChartProps> = ({ equityData, initialCapital }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || equityData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 240,
      layout: {
        background: { type: ColorType.Solid, color: '#0B0E14' },
        textColor: '#94A3B8',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', 'Inter', monospace"
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' }
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1
        }
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true
      }
    });

    chartRef.current = chart;

    // Strategy Equity Line
    const strategySeries = chart.addSeries(LineSeries, {
      color: '#10B981',
      lineWidth: 2,
      title: 'Strategie Equity'
    });

    // Benchmark (Buy & Hold) Line
    const benchmarkSeries = chart.addSeries(LineSeries, {
      color: '#64748B',
      lineWidth: 1,
      lineStyle: 2, // Dashed
      title: 'Buy & Hold'
    });

    const strategyData = equityData.map(d => ({
      time: d.time,
      value: d.equity
    }));

    const benchmarkData = equityData.map(d => ({
      time: d.time,
      value: d.benchmarkEquity
    }));

    strategySeries.setData(strategyData);
    benchmarkSeries.setData(benchmarkData);

    chart.timeScale().fitContent();

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
  }, [equityData]);

  const latestEquity = equityData.length > 0 ? equityData[equityData.length - 1].equity : initialCapital;
  const latestBenchmark = equityData.length > 0 ? equityData[equityData.length - 1].benchmarkEquity : initialCapital;
  const returnDollar = latestEquity - initialCapital;
  const returnPct = initialCapital > 0 ? (returnDollar / initialCapital) * 100 : 0;
  const isPositive = returnDollar >= 0;

  return (
    <div className="flex flex-col w-full h-full bg-[#0B0E14] border border-[#1E293B] rounded-xl overflow-hidden shadow-xl">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F141C] border-b border-[#1E293B]">
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Kapitalverlauf (Equity Curve vs. Buy & Hold)
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span>
            <span className="text-slate-400">Strategie:</span>
            <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${latestEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositive ? '+' : ''}{returnPct.toFixed(2)}%)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-slate-500 border-dashed inline-block"></span>
            <span className="text-slate-400">Buy & Hold:</span>
            <span className="text-slate-300 font-medium">
              ${latestBenchmark.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full flex-1 min-h-[190px]" />
    </div>
  );
};
