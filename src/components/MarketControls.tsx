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
  onRefreshGoogleFinance?: () => Promise<void>;
  isRefreshingGoogleFinance?: boolean;
  nextPullSeconds?: number;
  isTradingWindow?: boolean;
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
  onRefreshGoogleFinance,
  isRefreshingGoogleFinance = false,
  nextPullSeconds = 60,
  isTradingWindow = true,
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

      {/* Middle & Right: Market status notice, sync button, and color tester */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Trading Hours / Freeze Status Badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
            isTradingWindow
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isTradingWindow ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="font-semibold">
            {isTradingWindow
              ? 'Markets Open (9:00 AM – 5:00 PM EST) · 1m Real-Time Sync'
              : 'Markets Closed (5:00 PM – 9:00 AM EST) · Values Frozen at Last Close'}
          </span>
        </div>

        {/* Google Finance Manual Re-Sync Button */}
        {onRefreshGoogleFinance && (
          <button
            onClick={onRefreshGoogleFinance}
            disabled={isRefreshingGoogleFinance}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
              isRefreshingGoogleFinance
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 cursor-wait'
                : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}
            title="Fetch live quotes from Google Finance website"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingGoogleFinance ? 'animate-spin' : ''}`} />
            <span>Sync Google Finance</span>
            {isTradingWindow && <span className="text-[10px] opacity-75">({nextPullSeconds}s)</span>}
          </button>
        )}

        {/* Fast Red / Green Verification triggers (to easily verify user's color rule) */}
        <div className="flex items-center gap-1.5 border-l border-neutral-200 dark:border-neutral-800 pl-2">
          <span className="text-[11px] text-neutral-400 hidden lg:inline">Test Colors:</span>
          <button
            onClick={() => onTriggerGlobalShock('rally')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium transition-colors"
            title="Simulate Market Surge: All indices turn positive (Green)"
          >
            <TrendingUp className="w-3 h-3" />
            <span>+Green</span>
          </button>

          <button
            onClick={() => onTriggerGlobalShock('dip')}
            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-medium transition-colors"
            title="Simulate Market Dip: All indices turn negative (Red)"
          >
            <TrendingDown className="w-3 h-3" />
            <span>-Red</span>
          </button>

          <button
            onClick={onResetBenchmark}
            className="p-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Reset to exact Google Finance closing figures"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
