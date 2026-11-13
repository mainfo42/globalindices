import React from 'react';
import { MarketIndex, TimeFrame } from '../types/market';
import { IndexChart } from './IndexChart';
import { ArrowUpRight, ArrowDownRight, Maximize2 } from 'lucide-react';

interface IndexCardProps {
  index: MarketIndex;
  timeframe: TimeFrame;
  onTimeframeChange: (tf: TimeFrame) => void;
  onOpenDetails: (index: MarketIndex) => void;
  onTriggerShock: (id: 'tsx' | 'nasdaq' | 'dow', type: 'rally' | 'dip' | 'flip') => void;
}

export const IndexCard: React.FC<IndexCardProps> = ({
  index,
  timeframe,
  onTimeframeChange,
  onOpenDetails,
  onTriggerShock,
}) => {
  // Calculate change vs previous close (prefer exact Google Finance change if provided)
  const changeValue = index.change !== undefined ? index.change : (index.currentPrice - index.previousClose);
  const changePct = index.changePercent !== undefined ? index.changePercent : ((changeValue / index.previousClose) * 100);
  // User requirement: "If it falls negative since last closing, make it red, if above and positive, make it green."
  const isPositive = changeValue >= 0;

  // Active dataset according to selected timeframe (day = 24hours curves)
  const activeData = index.history[timeframe];

  // Dynamic colors for positive (green) and negative (red)
  const accentColorClass = isPositive
    ? 'text-emerald-500 dark:text-emerald-400'
    : 'text-rose-500 dark:text-rose-400';

  const badgeBorderClass = isPositive
    ? 'border-emerald-500/30 bg-emerald-500/10'
    : 'border-rose-500/30 bg-rose-500/10';

  const tickAnimClass =
    index.lastTickDirection === 'up'
      ? 'flash-up'
      : index.lastTickDirection === 'down'
      ? 'flash-down'
      : '';

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-xs transition-all duration-150 ${
        isPositive ? 'hover:border-emerald-500/40' : 'hover:border-rose-500/40'
      }`}
    >
      {/* Slim Header Strip: Flag, Name, Symbol, Exchange & Timeframe Toggle Switches */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-3.5 py-2 sm:py-1.5 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/60 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg leading-none shrink-0" title={index.country} role="img" aria-label={index.country}>
            {index.flag}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
              {index.shortName}
            </h3>
            <span className="text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-400 shrink-0">
              {index.symbol}
            </span>
            <span className="hidden sm:inline text-neutral-400 dark:text-neutral-600 text-xs">·</span>
            <a
              href={index.googleFinanceUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 bg-neutral-100 dark:bg-neutral-800 transition-colors"
              title="Verified Real-Time Source: Google Finance"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Google Finance: {index.googleFinanceTicker}</span>
            </a>
          </div>
        </div>

        {/* Timeframe Toggle Switch (Day, Week, Month) & Maximize Modal */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <div
            role="group"
            aria-label={`${index.shortName} timeframe`}
            className="flex items-center p-0.5 bg-neutral-200/80 dark:bg-neutral-800 rounded-lg text-xs font-medium"
          >
            <button
              onClick={() => onTimeframeChange('day')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                timeframe === 'day'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="24 Hours Intraday Curve"
            >
              Day
            </button>
            <button
              onClick={() => onTimeframeChange('week')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                timeframe === 'week'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="7 Days Curve"
            >
              Week
            </button>
            <button
              onClick={() => onTimeframeChange('month')}
              className={`px-2 sm:px-2.5 py-0.5 rounded-md transition-colors whitespace-nowrap text-[11px] sm:text-xs ${
                timeframe === 'month'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
              title="30 Days Curve"
            >
              Month
            </button>
          </div>

          <button
            onClick={() => onOpenDetails(index)}
            className="p-1 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Inspect Index Deep Dive"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body: Left = Huge Numbers & BIG GAIN/LOSS, Right = Graphical 24h Curve */}
      <div className="p-3 sm:p-3.5 flex flex-col md:flex-row items-stretch gap-3 sm:gap-3.5 justify-between">
        {/* LEFT SECTION: Huge live number AND BIG GAIN/LOSS NUMBER */}
        <div className="flex flex-col justify-between shrink-0 w-full md:w-[340px] lg:w-[380px] min-w-0 pr-0 md:pr-3.5 border-b md:border-b-0 md:border-r border-neutral-100 dark:border-neutral-800/80 pb-2.5 md:pb-0">
          <div className="min-w-0">
            {/* Top row: Label + Live/Frozen Indicator */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Current Value ({index.currency})
              </span>
              <a
                href={index.googleFinanceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 dark:text-neutral-400 hover:text-blue-500 shrink-0"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span className="font-semibold text-neutral-600 dark:text-neutral-300">Google Finance</span>
              </a>
            </div>

            {/* LIVE CURRENT VALUE - HUGE NUMBER */}
            <div
              key={index.lastTickTime}
              className={`text-[32px] sm:text-4xl lg:text-[42px] font-mono font-black tracking-tight tabular-nums transition-colors duration-200 text-neutral-900 dark:text-neutral-100 leading-tight py-0.5 rounded break-words ${tickAnimClass}`}
            >
              {index.currentPrice.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            {/* 
              PROMPT REQUIREMENT: "Also, make bigger the number of the gain or loss.
              If it falls negative since last closing, make it red, if above and positive, make it green."
              Responsive flex-wrap + max-w-full prevents ANY truncation on 360px phones (e.g. Samsung A54)
            */}
            <div className="mt-1.5 w-full min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block mb-1">
                Net Gain / Loss vs Last Close
              </span>
              <div
                className={`inline-flex flex-wrap items-center gap-x-2 gap-y-1 max-w-full px-2.5 sm:px-3 py-1.5 rounded-lg border font-mono font-black tabular-nums tracking-tight ${accentColorClass} ${badgeBorderClass}`}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-5 h-5 sm:w-7 sm:h-7 stroke-[3] shrink-0" />
                ) : (
                  <ArrowDownRight className="w-5 h-5 sm:w-7 sm:h-7 stroke-[3] shrink-0" />
                )}
                {/* VERY BIG GAIN OR LOSS NUMBER */}
                <span className="text-[22px] sm:text-3xl lg:text-[32px] font-black leading-none whitespace-nowrap">
                  {changeValue >= 0 ? '+' : ''}
                  {changeValue.toFixed(2)}
                </span>
                <span className="text-sm sm:text-base lg:text-lg font-bold opacity-90 leading-none whitespace-nowrap">
                  ({changePct >= 0 ? '+' : ''}
                  {changePct.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Compact Reference Metrics & Quick Scenario Tester */}
          <div className="mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span>
                Close: <strong className="text-neutral-700 dark:text-neutral-300">{index.previousClose.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </span>
              <span>
                H: <strong className="text-neutral-700 dark:text-neutral-300">{index.highPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </span>
              <span>
                L: <strong className="text-neutral-700 dark:text-neutral-300">{index.lowPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </span>
            </div>

            {/* Fast color verification buttons */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 pt-1 text-[10px]">
              <span className="text-neutral-400">Test:</span>
              <button
                onClick={() => onTriggerShock(index.id, 'rally')}
                className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium transition-colors"
                title="Force positive (Green)"
              >
                + Green
              </button>
              <button
                onClick={() => onTriggerShock(index.id, 'dip')}
                className="px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium transition-colors"
                title="Force negative (Red)"
              >
                - Red
              </button>
              <button
                onClick={() => onTriggerShock(index.id, 'flip')}
                className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                title="Invert color state"
              >
                Flip
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Wide Graphical 24h / 7d / 30d Curve */}
        <div className="flex-1 min-w-0 flex flex-col justify-between rounded-lg bg-neutral-50/70 dark:bg-neutral-950/60 p-2 sm:p-3 border border-neutral-100 dark:border-neutral-800/70">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 px-1 mb-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs">
                {timeframe === 'day' ? '24H Intraday Curve' : timeframe === 'week' ? '7D Trend Curve' : '30D Historical Curve'}
              </span>
              <span className="text-neutral-400">· {activeData.length} pts</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px]">
                Vol: <strong className="text-neutral-700 dark:text-neutral-300">{index.volume}</strong>
              </span>
            </div>
          </div>

          <IndexChart
            data={activeData}
            previousClose={index.previousClose}
            isPositive={isPositive}
            currency={index.currency}
            timeframe={timeframe}
            height={120}
            showVolume={true}
          />
        </div>
      </div>
    </div>
  );
};
