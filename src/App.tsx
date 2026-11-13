import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketIndex, TimeFrame } from './types/market';
import {
  initializeIndices,
  applyMarketShock,
  isESTTradingHours,
  buildDaySeriesForQuote,
} from './utils/marketData';
import { soundManager } from './utils/audio';
import { TerminalHeader } from './components/TerminalHeader';
import { MarketControls } from './components/MarketControls';
import { IndexCard } from './components/IndexCard';
import { IndexDetailModal } from './components/IndexDetailModal';

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

  // Google Finance Live Pull & EST state
  const initialEST = isESTTradingHours();
  const [estTimeStr, setEstTimeStr] = useState<string>(initialEST.estTimeStr);
  const [isTradingWindow, setIsTradingWindow] = useState<boolean>(initialEST.isTradingHours);
  const [nextPullSeconds, setNextPullSeconds] = useState<number>(60);
  const [isRefreshingGoogleFinance, setIsRefreshingGoogleFinance] = useState<boolean>(false);

  const hasInitialSyncRef = useRef<boolean>(false);
  const isSyncInFlightRef = useRef<boolean>(false);
  const syncRequestIdRef = useRef<number>(0);
  const prevTradingRef = useRef<boolean>(initialEST.isTradingHours);
  const nextPullAtRef = useRef<number>(Date.now() + 60_000);
  const lastSuccessfulPullAtRef = useRef<number>(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSyncedLabel, setLastSyncedLabel] = useState<string>('');
  const [isInitialSyncing, setIsInitialSyncing] = useState<boolean>(true);

  // Synchronize with Google Finance API endpoint
  // - On landing (fresh=1&_t=Date.now()): ALWAYS fetches latest values straight from Google Finance website (even when closed)
  // - During 9:00 AM - 5:00 PM EST: Pulls fresh quotes every 60 seconds using real wall-clock time
  const syncGoogleFinance = useCallback(async (forceFresh = false, showSpinner = false) => {
    if (isSyncInFlightRef.current && !showSpinner) return;
    const requestId = ++syncRequestIdRef.current;
    isSyncInFlightRef.current = true;
    if (showSpinner) setIsRefreshingGoogleFinance(true);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 12000) : null;

    try {
      const endpoint = forceFresh
        ? `/api/quotes?fresh=1&_t=${Date.now()}`
        : `/api/quotes?_t=${Date.now()}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        cache: 'no-store',
        signal: controller?.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (requestId !== syncRequestIdRef.current) return;
      if (data && data.quotes) {
        if (data.estTime) {
          setEstTimeStr(data.estTime);
          setLastSyncedLabel(data.estTime);
        }
        const isTrading = typeof data.isTradingHours === 'boolean'
          ? data.isTradingHours
          : isESTTradingHours().isTradingHours;
        setIsTradingWindow(isTrading);
        lastSuccessfulPullAtRef.current = Date.now();
        nextPullAtRef.current = Date.now() + 60_000;
        setNextPullSeconds(60);

        const isFirstSync = !hasInitialSyncRef.current;
        hasInitialSyncRef.current = true;
        setIsInitialSyncing(false);

        setIndices((prev) => {
          const updated = prev.map((idx) => {
            const q = data.quotes[idx.id];
            if (!q) return idx;

            const dir: 'up' | 'down' | 'neutral' =
              q.price > idx.currentPrice ? 'up' : q.price < idx.currentPrice ? 'down' : 'neutral';

            // On first page load or if previousClose changed (new trading day), align the 24h curve to real Google Finance close & price
            let updatedDay: MarketIndex['history']['day'];
            if (isFirstSync || Math.abs(idx.previousClose - q.previousClose) > 0.01) {
              updatedDay = buildDaySeriesForQuote(q.previousClose, q.price);
            } else {
              updatedDay = [...idx.history.day];
              const estNow = isESTTradingHours();
              const timeLabel = estNow.estTimeStr.slice(0, 5);
              const lastPt = updatedDay[updatedDay.length - 1];

              if (lastPt && Date.now() - lastPt.timestamp >= 50_000) {
                updatedDay.push({
                  timestamp: Date.now(),
                  timeLabel,
                  price: q.price,
                  volume: Math.floor(Math.random() * 8000) + 15000,
                });
                if (updatedDay.length > 90) updatedDay.shift();
              } else if (lastPt) {
                updatedDay[updatedDay.length - 1] = {
                  ...lastPt,
                  price: q.price,
                };
              }
            }

            const updatedWeek = [...idx.history.week];
            if (updatedWeek.length > 0) {
              updatedWeek[updatedWeek.length - 1] = {
                ...updatedWeek[updatedWeek.length - 1],
                price: q.price,
              };
            }

            const updatedMonth = [...idx.history.month];
            if (updatedMonth.length > 0) {
              updatedMonth[updatedMonth.length - 1] = {
                ...updatedMonth[updatedMonth.length - 1],
                price: q.price,
              };
            }

            return {
              ...idx,
              currentPrice: q.price,
              change: q.change,
              changePercent: q.changePercent,
              previousClose: q.previousClose,
              highPrice: isFirstSync ? q.high || q.price : Math.max(idx.highPrice, q.high || q.price),
              lowPrice: isFirstSync ? q.low || q.price : Math.min(idx.lowPrice, q.low || q.price),
              lastTickDirection: dir,
              lastTickTime: Date.now(),
              googleFinanceTicker: q.ticker,
              googleFinanceUrl: q.sourceUrl,
              history: {
                ...idx.history,
                day: updatedDay,
                week: updatedWeek,
                month: updatedMonth,
              },
            };
          });

          setSelectedModalIndex((currentModal) => {
            if (!currentModal) return null;
            return updated.find((i) => i.id === currentModal.id) || currentModal;
          });

          return updated;
        });
      }
    } catch (err) {
      if (requestId !== syncRequestIdRef.current) return;
      console.warn('Google Finance sync error:', err);
      // Retry quickly if initial landing sync fails OR if a cellular/Wi-Fi hiccup occurs during open market hours
      const { isTradingHours } = isESTTradingHours();
      if (!hasInitialSyncRef.current || isTradingHours) {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = setTimeout(() => {
          syncGoogleFinance(true, false);
        }, !hasInitialSyncRef.current ? 2500 : 5000);
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (requestId === syncRequestIdRef.current) {
        isSyncInFlightRef.current = false;
        if (showSpinner) setIsRefreshingGoogleFinance(false);
      }
    }
  }, []);

  // Trading Hours & Update Rule:
  // 1. Always sync live from Google Finance website immediately when a user lands on the page (even if markets are closed).
  // 2. From 9:00 AM EST to 5:00 PM EST (open market window), automatically update every minute using wall-clock time.
  // 3. Re-sync immediately if the mobile browser tab/app resumes from sleep, bfcache, focus, or network recovery.
  // 4. From 5:00 PM EST to 9:00 AM EST (and weekends), values remain frozen at last close after initial sync.
  useEffect(() => {
    // Immediate live pull on page load
    nextPullAtRef.current = Date.now() + 60_000;
    syncGoogleFinance(true, false);

    const checkAndTick = () => {
      const nowMs = Date.now();
      const { isTradingHours, estTimeStr: currentEst } = isESTTradingHours();
      setEstTimeStr(currentEst);
      setIsTradingWindow(isTradingHours);

      // If we just entered the open market window (09:00 AM EST), pull immediately
      if (!prevTradingRef.current && isTradingHours) {
        prevTradingRef.current = true;
        nextPullAtRef.current = nowMs + 60_000;
        setNextPullSeconds(60);
        syncGoogleFinance(true, false);
        return;
      }

      prevTradingRef.current = isTradingHours;

      if (isTradingHours) {
        const remainingMs = nextPullAtRef.current - nowMs;
        if (remainingMs <= 0) {
          nextPullAtRef.current = nowMs + 60_000;
          setNextPullSeconds(60);
          syncGoogleFinance(true, false);
        } else {
          setNextPullSeconds(Math.max(1, Math.ceil(remainingMs / 1000)));
        }
      } else {
        // Frozen outside trading hours
        nextPullAtRef.current = nowMs + 60_000;
        setNextPullSeconds(60);
      }
    };

    const secondInterval = setInterval(checkAndTick, 1000);

    // Handle mobile/background tab wake-up & iOS/Android bfcache restore:
    // Re-sync right away if >55s elapsed so returning users see current live or latest closing figures.
    const handleResume = (event?: Event) => {
      if (document.visibilityState === 'hidden') return;
      const isPageShowPersisted =
        event && 'persisted' in event && Boolean((event as PageTransitionEvent).persisted);
      const elapsedSinceLast = Date.now() - lastSuccessfulPullAtRef.current;
      if (!hasInitialSyncRef.current || isPageShowPersisted || elapsedSinceLast >= 55_000) {
        nextPullAtRef.current = Date.now() + 60_000;
        setNextPullSeconds(60);
        syncGoogleFinance(true, false);
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('focus', handleResume);
    window.addEventListener('online', handleResume);
    window.addEventListener('pageshow', handleResume);

    return () => {
      clearInterval(secondInterval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('online', handleResume);
      window.removeEventListener('pageshow', handleResume);
    };
  }, [syncGoogleFinance]);

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
          const nextChange = Math.round((shocked.currentPrice - shocked.previousClose) * 100) / 100;
          const nextPct = Math.round(((nextChange / shocked.previousClose) * 100) * 100) / 100;
          const updatedShocked: MarketIndex = {
            ...shocked,
            change: nextChange,
            changePercent: nextPct,
          };
          if (isSoundEnabled) {
            soundManager.playTick(updatedShocked.lastTickDirection);
          }
          if (selectedModalIndex && selectedModalIndex.id === id) {
            setSelectedModalIndex(updatedShocked);
          }
          return updatedShocked;
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
        const nextChange = Math.round((shocked.currentPrice - shocked.previousClose) * 100) / 100;
        const nextPct = Math.round(((nextChange / shocked.previousClose) * 100) * 100) / 100;
        const updatedShocked: MarketIndex = {
          ...shocked,
          change: nextChange,
          changePercent: nextPct,
        };
        if (selectedModalIndex && selectedModalIndex.id === idx.id) {
          setSelectedModalIndex(updatedShocked);
        }
        return updatedShocked;
      })
    );
    if (isSoundEnabled) {
      soundManager.playTick(type === 'rally' ? 'up' : 'down');
    }
  };

  // Reset back to live Google Finance values
  const handleResetBenchmark = () => {
    hasInitialSyncRef.current = false;
    syncGoogleFinance(true, true);
  };

  // Toggle audio
  const handleToggleSound = () => {
    const nextVal = !isSoundEnabled;
    setIsSoundEnabled(nextVal);
    soundManager.setEnabled(nextVal);
  };

  return (
    <div className="min-h-dvh lg:h-dvh flex flex-col justify-between bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-200 overflow-x-hidden lg:overflow-hidden">
      {/* 3-Zone Header Contract (Compact) */}
      <TerminalHeader
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={handleToggleSound}
        isLive={isLive}
        currentTimeStr={currentTimeStr}
        estTimeStr={estTimeStr}
        isTradingWindow={isTradingWindow}
      />

      {/* Main Content Workspace - Responsive on mobile, fitted to viewport on desktop */}
      <main className="flex-1 flex flex-col lg:justify-between max-w-[1720px] w-full mx-auto px-2.5 sm:px-5 lg:px-6 py-2 sm:py-2.5 gap-2.5 lg:gap-2 min-h-0 lg:overflow-hidden">
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
          onRefreshGoogleFinance={() => syncGoogleFinance(true, true)}
          isRefreshingGoogleFinance={isRefreshingGoogleFinance || isInitialSyncing}
          nextPullSeconds={nextPullSeconds}
          isTradingWindow={isTradingWindow}
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
          className="flex-1 flex flex-col lg:justify-between lg:min-h-0 gap-2.5 lg:gap-2 w-full"
        >
          {/* 3 rectangular boxes stacked one on top of the other, starting with TSX */}
          <div className="flex-1 flex flex-col lg:justify-between gap-3 sm:gap-2.5 w-full lg:min-h-0">
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

        {/* Compact footer - wraps cleanly on mobile */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-500 dark:text-neutral-400 px-1.5 sm:px-2 py-1.5 lg:py-0.5 border-t border-neutral-200/60 dark:border-neutral-800/60 shrink-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-blue-500 font-semibold">Google Finance:</span>
            <span>Real-time pull 1m (9:00 AM – 5:00 PM EST)</span>
            <span aria-hidden="true">·</span>
            <span className="text-neutral-600 dark:text-neutral-300">
              {lastSyncedLabel ? `Synced ${lastSyncedLabel}` : 'Syncing live quotes...'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
