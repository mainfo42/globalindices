import React from 'react';
import { Activity, Volume2, VolumeX, Moon, Sun, Clock } from 'lucide-react';

interface TerminalHeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  isLive: boolean;
  currentTimeStr: string;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  isDarkMode,
  onToggleTheme,
  isSoundEnabled,
  onToggleSound,
  isLive,
  currentTimeStr,
}) => {
  return (
    <header className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center text-white dark:text-neutral-900 font-bold text-xs shadow-xs">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap shrink-0">
              Global Indices Terminal
            </span>
          </div>
        </div>

        {/* Zone 2: 4–5 concise single-line navigation tabs */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <span className="text-neutral-900 dark:text-neutral-100 font-semibold cursor-pointer">
            Real-Time Indices
          </span>
          <span className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer">
            North American Equities
          </span>
          <span className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer">
            Macro Sentiment
          </span>
          <span className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer">
            Constituent Heatmap
          </span>
        </nav>

        {/* Zone 3: Functional status & actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Source indicator */}
          <a
            href="https://www.google.com/finance"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono text-neutral-600 dark:text-neutral-300 hover:text-blue-500 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700/60 transition-colors"
            title="Real-time quotes sourced from Google Finance"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span>Google Finance Feed</span>
          </a>

          {/* Live streaming status pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700/60 text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-neutral-700 dark:text-neutral-300 font-medium">
              {isLive ? 'FEED LIVE' : 'FEED PAUSED'}
            </span>
            <span className="text-neutral-400 dark:text-neutral-500">·</span>
            <span className="text-neutral-500 dark:text-neutral-400">{currentTimeStr}</span>
          </div>

          {/* Sound tick toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-lg border transition-colors ${
              isSoundEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
            }`}
            title={isSoundEnabled ? 'Mute Trade Ticks' : 'Enable Trade Tick Sounds'}
            aria-label="Toggle trade sounds"
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
