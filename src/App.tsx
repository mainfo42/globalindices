import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarketIndex, TimeFrame } from './types/market';
import { initializeIndices, generateTick, applyMarketShock } from './utils/marketData';
import { soundManager } from './utils/audio';
import { TerminalHeader } from './components/TerminalHeader';
import { MarketControls } from './components/MarketControls';
import { IndexCard } from './components/IndexCard';
import { IndexDetailModal } from './components/IndexDetailModal';
import { Sparkles, Info, RefreshCw } from 'lucide-react';

export default function App() {
  // Theme state: dark terminal default for authentic financial aesthetic
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || true;
    }
    return true;
  });

  // Sound state for auditory tick feedback
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(false);

  // Live streaming states
  const [isLive, setIsLive] = useState<boolean>(true);
  const [tickSpeed, setTickSpeed] = useState<number>(2000); // 2000ms

  // Timeframe state: global and per-card
  // Starts with 'day' (24hours curves as requested)
  const [globalTimeframe, setGlobalTimeframe] = useState<TimeFrame>('day');
  const [cardTimeframes, setCardTimeframes] = useState<Record<string, TimeFrame>>({
    tsx: 'day',
    nasdaq: 'day',
    dow: 'day',
  });

  // Indices state: TSX, Nasdaq, Dow Jones strictly in order
  const [indices, setIndices] = useState<MarketIndex[]>(() => initializeIndices());

  // Modal inspection state
  const [selectedModalIndex, setSelectedModalIndex] = useState<MarketIndex | null>(null);

  // Clock
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Keep dark class synced with html tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Live tick simulation loop
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setIndices((prevIndices) => {
        // Randomly pick 1 or 2 indices to tick per interval to mimic real market activity
        const targetIndices = prevIndices.map((idx) => {
          // 80% chance of updating each index
          if (Math.random() < 0.8) {
            const { newPrice, direction, updatedDayHistory, updatedHigh, updatedLow } =
              generateTick(idx);

            // Optional auditory feedback for live trading
            if (isSoundEnabled) {
              soundManager.playTick(direction);
            }

            return {
              ...idx,
              currentPrice: newPrice,
              lastTickDirection: direction,
              lastTickTime: Date.now(),
              highPrice: updatedHigh,
              lowPrice: updatedLow,
              history: {
                ...idx.history,
                day: updatedDayHistory,
              },
            };
          }
          return idx;
        });

        // If modal is open, also sync the selected index
        if (selectedModalIndex) {
          const updatedSelected = targetIndices.find((i) => i.id === selectedModalIndex.id);
          if (updatedSelected) {
            setSelectedModalIndex(updatedSelected);
          }
        }

        return targetIndices;
      });
    }, tickSpeed);

    return () => clearInterval(interval);
  }, [isLive, tickSpeed, isSoundEnabled, selectedModalIndex]);

  // Handle global timeframe changes
  const handleGlobalTimeframeChange = (tf: TimeFrame) => {
    setGlobalTimeframe(tf);
    setCardTimeframes({
      tsx: tf,
      nasdaq: tf,
      dow: tf,
    });
  };

  // Handle individual card timeframe toggle
  const handleCardTimeframeChange = (id: string, tf: TimeFrame) => {
    setCardTimeframes((prev) => ({
      ...prev,
      [id]: tf,
    }));
  };

  // Handle manual market shocks for testing red/green prompt requirement
  const handleTriggerShock = (id: 'tsx' | 'nasdaq' | 'dow', type: 'rally' | 'dip' | 'flip') => {
    setIndices((prev) =>
      prev.map((idx) => {
        if (idx.id === id) {
          const shocked = applyMarketShock(idx, type);
          if (isSoundEnabled) {
            soundManager.playTick(shocked.lastTickDirection);
          }
          if (selectedModalIndex && selectedModalIndex.id === id) {
            setSelectedModalIndex(shocked);
          }
          return shocked;
        }
        return idx;
      })
    );
  };

  // Handle global rally or dip
  const handleTriggerGlobalShock = (type: 'rally' | 'dip') => {
    setIndices((prev) =>
      prev.map((idx) => {
        const shocked = applyMarketShock(idx, type);
        if (selectedModalIndex && selectedModalIndex.id === idx.id) {
          setSelectedModalIndex(shocked);
        }
        return shocked;
      })
    );
    if (isSoundEnabled) {
      soundManager.playTick(type === 'rally' ? 'up' : 'down');
    }
  };

  // Reset benchmark values
  const handleResetBenchmark = () => {
    const fresh = initializeIndices();
    setIndices(fresh);
    if (selectedModalIndex) {
      const match = fresh.find((i) => i.id === selectedModalIndex.id) || null;
      setSelectedModalIndex(match);
    }
  };

  // Toggle audio
  const handleToggleSound = () => {
    const nextVal = !isSoundEnabled;
    setIsSoundEnabled(nextVal);
    soundManager.setEnabled(nextVal);
  };

  return (
    <div className="h-screen flex flex-col justify-between bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200 overflow-hidden">
      {/* 3-Zone Header Contract (Compact) */}
      <TerminalHeader
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={handleToggleSound}
        isLive={isLive}
        currentTimeStr={currentTimeStr}
      />

      {/* Main Content Workspace - Fitted to Viewport */}
      <main className="flex-1 flex flex-col justify-between max-w-[1720px] w-full mx-auto px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 gap-2 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Interactive Controls & Global Timeframe Switcher (Compact) */}
        <MarketControls
          isLive={isLive}
          onToggleLive={() => setIsLive((prev) => !prev)}
          tickSpeed={tickSpeed}
          onChangeTickSpeed={setTickSpeed}
          globalTimeframe={globalTimeframe}
          onGlobalTimeframeChange={handleGlobalTimeframeChange}
          onResetBenchmark={handleResetBenchmark}
          onTriggerGlobalShock={handleTriggerGlobalShock}
        />

        {/* 
          USER SPECIFICATIONS:
          1. "Make it fit on my screen."
          2. "Make the boxes, rectangle boxes, stacked on on top of the other one, starting with TSX. not side by side."
          3. "Display also as huge numbers the current live value for each index at the left of each graphics."
          4. "Also, make bigger the number of the gain or loss."
          5. "If it falls negative since last closing, make it red, if above and positive, make it green."
          6. "Include toggle switches to switch between day, week, and monthly viewing modes."
        */}
        <section
          aria-label="North American Core Indices"
          className="flex-1 flex flex-col justify-between min-h-0 gap-2 w-full"
        >
          {/* 3 rectangular boxes stacked one on top of the other, starting with TSX */}
          <div className="flex-1 flex flex-col justify-between gap-2 sm:gap-2.5 w-full min-h-0">
            {indices.map((idx) => (
              <IndexCard
                key={idx.id}
                index={idx}
                timeframe={cardTimeframes[idx.id] || 'day'}
                onTimeframeChange={(tf) => handleCardTimeframeChange(idx.id, tf)}
                onOpenDetails={setSelectedModalIndex}
                onTriggerShock={handleTriggerShock}
              />
            ))}
          </div>
        </section>

        {/* Tiny single-line compact footer to fit cleanly on screen */}
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 dark:text-neutral-400 px-2 py-0.5 border-t border-neutral-200/60 dark:border-neutral-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <span>TSX (^GSPTSE)</span>
            <span aria-hidden="true">·</span>
            <span>Nasdaq (^IXIC)</span>
            <span aria-hidden="true">·</span>
            <span>Dow Jones (^DJI)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>&ge; Close: Green</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>&lt; Close: Red</span>
            </span>
            <button
              onClick={() => setSelectedModalIndex(indices[0])}
              className="text-neutral-600 dark:text-neutral-300 hover:underline font-sans"
            >
              Constituent Breakdown →
            </button>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedModalIndex && (
        <IndexDetailModal
          index={selectedModalIndex}
          timeframe={cardTimeframes[selectedModalIndex.id] || 'day'}
          onTimeframeChange={(tf) => handleCardTimeframeChange(selectedModalIndex.id, tf)}
          onClose={() => setSelectedModalIndex(null)}
        />
      )}
    </div>
  );
}
