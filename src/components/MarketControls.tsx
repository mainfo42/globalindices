import React from 'react';
import { Play, Pause, RefreshCw, Zap, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { TimeFrame } from '../types/market';

interface MarketControlsProps {
  isLive: boolean;
  onToggleLive: () => void;
  tickSpeed: number;
  onChangeTickSpeed: (speed: number) => void;
  globalTimeframe: TimeFrame;
  onGlobalTimeframeChange: (tf: TimeFrame) => void;
  onResetBenchmark: () => void;
  onTriggerGlobalShock: (type: 'rally' | 'dip') => void;
}

export const MarketControls: React.FC<MarketControlsProps> = ({
  isLive,
  onToggleLive,
  tickSpeed,
  onChangeTickSpeed,
  globalTimeframe,
  onGlobalTimeframeChange,
  onResetBenchmark,
  onTriggerGlobalShock,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
      {/* Left: Global timeframe master toggle switch */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Timeframe:</span>
        </div>
        <div
          role="group"
          aria-label="Global timeframe"
          className="flex items-center p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-md text-xs font-medium"
        >
          <button
            onClick={() => onGlobalTimeframeChange('day')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              globalTimeframe === 'day'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Day (24h)
          </button>
          <button
            onClick={() => onGlobalTimeframeChange('week')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              globalTimeframe === 'week'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Week (7D)
          </button>
          <button
            onClick={() => onGlobalTimeframeChange('month')}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap text-xs ${
              globalTimeframe === 'month'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Month (30D)
          </button>
        </div>
      </div>

      {/* Middle & Right: Market simulation controls and red/green scenario testers */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Play / Pause live streaming */}
        <button
          onClick={onToggleLive}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isLive
              ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200'
              : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
          }`}
          title={isLive ? 'Pause Live Ticks' : 'Resume Live Streaming'}
        >
          {isLive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isLive ? 'Pause Feed' : 'Resume Feed'}</span>
        </button>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-xs font-mono text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded-lg p-0.5">
          <span className="px-2 text-[11px]">Tick:</span>
          {[1000, 2000, 4000].map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeTickSpeed(speed)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                tickSpeed === speed
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {speed / 1000}s
            </button>
          ))}
        </div>

        {/* Fast Red / Green Scenario triggers */}
        <div className="flex items-center gap-1.5 border-l border-neutral-200 dark:border-neutral-800 pl-2.5">
          <button
            onClick={() => onTriggerGlobalShock('rally')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium transition-colors"
            title="Simulate Market Surge: All indices turn positive (Green)"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Simulate Rally (+Green)</span>
          </button>

          <button
            onClick={() => onTriggerGlobalShock('dip')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
            title="Simulate Market Dip: All indices turn negative (Red)"
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Simulate Dip (-Red)</span>
          </button>

          <button
            onClick={onResetBenchmark}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Reset to default reference values"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
