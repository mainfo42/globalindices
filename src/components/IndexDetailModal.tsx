import React from 'react';
import { MarketIndex, TimeFrame } from '../types/market';
import { IndexChart } from './IndexChart';
import { X, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface IndexDetailModalProps {
  index: MarketIndex | null;
  timeframe: TimeFrame;
  onTimeframeChange: (tf: TimeFrame) => void;
  onClose: () => void;
}

export const IndexDetailModal: React.FC<IndexDetailModalProps> = ({
  index,
  timeframe,
  onTimeframeChange,
  onClose,
}) => {
  if (!index) return null;

  const changeValue = index.currentPrice - index.previousClose;
  const changePct = (changeValue / index.previousClose) * 100;
  const isPositive = changeValue >= 0;

  const activeData = index.history[timeframe];

  // 52-week range progression percentage
  const range52Diff = index.weekRange52.high - index.weekRange52.low || 1;
  const range52Pct = Math.max(
    0,
    Math.min(100, ((index.currentPrice - index.weekRange52.low) / range52Diff) * 100)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${index.name} Detailed Inspection`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-6 sm:p-8">
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl" role="img" aria-label={index.country}>
              {index.flag}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">
                  {index.name}
                </h2>
                <span className="text-sm font-mono font-semibold px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                  {index.symbol}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>{index.exchange} ({index.currency})</span>
                <span aria-hidden="true">·</span>
                <a
                  href={index.googleFinanceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-500 hover:underline font-mono inline-flex items-center gap-1 font-semibold"
                >
                  Google Finance: {index.googleFinanceTicker} ↗
                </a>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Value & Chart Area */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left: Huge Live Value + Primary Stats */}
          <div className="flex flex-col justify-between p-5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800/80">
            <div>
              <span className="text-xs uppercase font-medium text-neutral-500 dark:text-neutral-400 tracking-wider">
                Current Index Value
              </span>
              <div
                className={`text-4xl sm:text-5xl font-mono font-extrabold tracking-tight tabular-nums mt-1 ${
                  isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                }`}
              >
                {index.currentPrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-sm font-mono font-bold border ${
                    isPositive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}
                >
                  {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>
                    {changeValue >= 0 ? '+' : ''}
                    {changeValue.toFixed(2)} ({changePct >= 0 ? '+' : ''}
                    {changePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 52-Week Range Bar */}
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-1.5">
                <span>52W L: {index.weekRange52.low.toLocaleString()}</span>
                <span>52W H: {index.weekRange52.high.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden relative">
                <div
                  className={`h-full rounded-full ${
                    isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${range52Pct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Expanded Interactive Curve */}
          <div className="lg:col-span-2 flex flex-col justify-between p-5 rounded-xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {timeframe === 'day' ? 'Last 24 Hours High-Definition Curve' : timeframe === 'week' ? 'Past 7 Days Trading Action' : 'Past 30 Days Trend'}
              </span>

              {/* Timeframe switch */}
              <div className="flex items-center p-0.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg text-xs font-medium">
                <button
                  onClick={() => onTimeframeChange('day')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    timeframe === 'day'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Day
                </button>
                <button
                  onClick={() => onTimeframeChange('week')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    timeframe === 'week'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => onTimeframeChange('month')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    timeframe === 'month'
                      ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            <IndexChart
              data={activeData}
              previousClose={index.previousClose}
              isPositive={isPositive}
              currency={index.currency}
              timeframe={timeframe}
              height={220}
              showVolume={true}
            />
          </div>
        </div>

        {/* Detailed Statistics Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/40 text-xs font-mono">
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">PREV CLOSE</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.previousClose.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">DAY'S OPEN</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.openPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">DAY'S HIGH</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.highPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">DAY'S LOW</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.lowPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">VOLUME</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.volume}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">P/E MULTIPLE</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.peRatio}x
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">DIVIDEND YIELD</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.divYield}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 dark:text-neutral-400 block text-[11px]">CURRENCY</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm">
              {index.currency} ({index.country})
            </span>
          </div>
        </div>

        {/* Top Weighted Constituents */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mb-3">
            Top Index Constituents & Today's Performance
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {index.constituents.map((item) => (
              <div
                key={item.symbol}
                className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                    {item.symbol}
                  </span>
                  <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[140px]">
                    {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block font-mono">
                    {item.weight}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      item.change >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {item.change >= 0 ? '+' : ''}
                    {item.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
