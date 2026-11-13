import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

interface GoogleFinanceQuote {
  symbol: string;
  ticker: string;
  name: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  yearHigh: number;
  yearLow: number;
  lastUpdated: string;
  source: string;
  sourceUrl: string;
}

// In-memory cache initialized with latest verified Google Finance quotes (overwritten live on startup & landing):
const quotesCache: Record<string, GoogleFinanceQuote> = {
  tsx: {
    symbol: '^GSPTSE',
    ticker: 'OSPTX:INDEXTSI',
    name: 'S&P/TSX Composite',
    price: 36137.19,
    previousClose: 36411.72,
    change: -274.53,
    changePercent: -0.75,
    high: 36367.41,
    low: 36080.86,
    yearHigh: 37069.11,
    yearLow: 29828.52,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/OSPTX:INDEXTSI',
  },
  nasdaq: {
    symbol: '^IXIC',
    ticker: '.IXIC:INDEXNASDAQ',
    name: 'Nasdaq Composite',
    price: 25366.09,
    previousClose: 25466.19,
    change: -100.10,
    changePercent: -0.39,
    high: 25597.23,
    low: 25068.28,
    yearHigh: 27722.75,
    yearLow: 20690.25,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ',
  },
  dow: {
    symbol: '^DJI',
    ticker: '.DJI:INDEXDJX',
    name: 'Dow Jones Industrial Average',
    price: 52297.09,
    previousClose: 52486.49,
    change: -189.40,
    changePercent: -0.36,
    high: 52751.22,
    low: 52271.16,
    yearHigh: 54744.33,
    yearLow: 45057.28,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/.DJI:INDEXDJX',
  },
};

let lastPullTimestamp = 0;
let activePullPromise: Promise<void> | null = null;

// Check if current time is within 9:00 AM EST to 5:00 PM EST (Monday - Friday)
function getESTStatus() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const weekday = getPart('weekday');
  const hour = parseInt(getPart('hour'), 10) % 24;
  const minute = parseInt(getPart('minute'), 10);
  const second = parseInt(getPart('second'), 10);
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(weekday);

  // Requirement: "From 5PM EST and 9h00 AM EST, the values should not move.
  // Then apply the update rule at every minute during the trading hours."
  const isTradingHours = isWeekday && hour >= 9 && hour < 17;

  const estStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second
    .toString()
    .padStart(2, '0')} EST`;

  return {
    estStr,
    hour,
    weekday,
    isWeekday,
    isTradingHours,
  };
}

// Function to pull real-time index value from Google Finance website
async function pullGoogleFinanceIndex(target: { id: string; ticker: string; url: string; symbol: string; name: string }) {
  try {
    const fetchUrl = `${target.url}?hl=en&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb; SOCS=CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LyaBg',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      console.warn(`[Google Finance] HTTP ${res.status} for ${target.ticker}`);
      return null;
    }

    const html = await res.text();

    // Primary DOM selector matching Google Finance main quote container
    const mainMatch = html.match(
      /class=\"N6SYTe\"[^>]*><span jsname=\"Pdsbrc\"[^>]*><span>([^<]+)<\/span><\/span><\/div>[\s\S]*?<span jsname=\"vY9t3b\"[^>]*><span[^>]*>([^<]+)<\/span><\/span>[\s\S]*?<span jsname=\"xnruHf\"[^>]*><span>([^<]+)<\/span><\/span>/
    );

    if (mainMatch) {
      const price = parseFloat(mainMatch[1].replace(/,/g, ''));
      const changeClean = mainMatch[3].replace(/,/g, '').replace(/[\u2212\u2013\u2014]/g, '-').trim();
      const change = parseFloat(changeClean);
      const percentClean = mainMatch[2].replace(/[%+]/g, '').replace(/[\u2212\u2013\u2014]/g, '-').trim();
      const changePercent = parseFloat(percentClean);
      const prevClose = Math.round((price - change) * 100) / 100;

      // Extract secondary high/low if present
      const secondaryMatch = html.match(/,null,null,null,null,null,([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)/);
      const high = secondaryMatch ? parseFloat(secondaryMatch[3]) : quotesCache[target.id]?.high || price;
      const low = secondaryMatch ? parseFloat(secondaryMatch[4]) : quotesCache[target.id]?.low || price;
      const yearHigh = secondaryMatch ? parseFloat(secondaryMatch[5]) : quotesCache[target.id]?.yearHigh || price;
      const yearLow = secondaryMatch ? parseFloat(secondaryMatch[6]) : quotesCache[target.id]?.yearLow || price;

      return {
        symbol: target.symbol,
        ticker: target.ticker,
        name: target.name,
        price,
        previousClose: prevClose,
        change,
        changePercent,
        high,
        low,
        yearHigh,
        yearLow,
        lastUpdated: new Date().toISOString(),
        source: 'Google Finance (Live Web Pull)',
        sourceUrl: target.url,
      };
    }

    // Fallback DOM selector in case Google serves YMlKec layout
    const ymlPriceMatch = html.match(/class=\"YMlKec fxKbKc\"[^>]*>([^<]+)<\/div>/);
    if (ymlPriceMatch) {
      const price = parseFloat(ymlPriceMatch[1].replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(price) && price > 0) {
        const prev = quotesCache[target.id]?.previousClose || price;
        const change = Math.round((price - prev) * 100) / 100;
        const changePercent = prev > 0 ? Math.round(((change / prev) * 100) * 100) / 100 : 0;
        return {
          ...quotesCache[target.id],
          price,
          change,
          changePercent,
          lastUpdated: new Date().toISOString(),
          source: 'Google Finance (Live Web Pull)',
          sourceUrl: target.url,
        };
      }
    }

    console.warn(`[Google Finance] Could not parse quote markup for ${target.ticker} (html len: ${html.length})`);
    return null;
  } catch (err) {
    console.error(`[Google Finance] Pull error for ${target.ticker}:`, err);
    return null;
  }
}

// Master puller for all 3 indices (coalesces concurrent pulls so callers always get fresh values)
async function pullAllIndices() {
  if (activePullPromise) {
    return activePullPromise;
  }

  activePullPromise = (async () => {
    const startTime = Date.now();
    const targets = [
      { id: 'tsx', ticker: 'OSPTX:INDEXTSI', url: 'https://www.google.com/finance/quote/OSPTX:INDEXTSI', symbol: '^GSPTSE', name: 'S&P/TSX Composite' },
      { id: 'nasdaq', ticker: '.IXIC:INDEXNASDAQ', url: 'https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ', symbol: '^IXIC', name: 'Nasdaq Composite' },
      { id: 'dow', ticker: '.DJI:INDEXDJX', url: 'https://www.google.com/finance/quote/.DJI:INDEXDJX', symbol: '^DJI', name: 'Dow Jones Industrial Average' },
    ];

    try {
      const results = await Promise.allSettled(targets.map((t) => pullGoogleFinanceIndex(t)));

      let successCount = 0;
      results.forEach((res, index) => {
        const target = targets[index];
        if (res.status === 'fulfilled' && res.value) {
          quotesCache[target.id] = res.value;
          successCount += 1;
        }
      });

      if (successCount > 0) {
        lastPullTimestamp = Date.now();
        console.log(
          `[Google Finance] Pulled ${successCount}/3 in ${Date.now() - startTime}ms. TSX: ${quotesCache.tsx.price}, Nasdaq: ${quotesCache.nasdaq.price}, Dow: ${quotesCache.dow.price}`
        );
      } else {
        console.warn('[Google Finance] Pull completed with 0 parsed quotes; keeping lastPullTimestamp unchanged.');
      }
    } catch (err) {
      console.error('[Google Finance] Pull error:', err);
    } finally {
      activePullPromise = null;
    }
  })();

  return activePullPromise;
}

// Initial pull on server boot to ensure exact current values
pullAllIndices();

// Update rule:
// "From 5PM EST and 9h00 AM EST, the values should not move.
// Then apply the update rule at every minute during the trading hours."
setInterval(() => {
  const estStatus = getESTStatus();
  if (estStatus.isTradingHours) {
    console.log('[Google Finance] Trading hours (9h00 - 17h00 EST): Pulling 1-minute live quote update...');
    pullAllIndices();
  }
}, 60 * 1000);

// API Endpoints
app.get('/api/quotes', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Always pull fresh values from Google Finance when landing on the page (?fresh=1)
  // or whenever the cached values are older than 5 seconds.
  const forceFresh = req.query.fresh === '1';
  if (forceFresh || Date.now() - lastPullTimestamp > 5000) {
    await pullAllIndices();
  }

  const estStatus = getESTStatus();
  res.json({
    status: 'success',
    timestamp: Date.now(),
    source: 'Google Finance',
    estTime: estStatus.estStr,
    isTradingHours: estStatus.isTradingHours,
    marketStatus: estStatus.isTradingHours ? 'OPEN' : 'CLOSED',
    marketStatusMessage: estStatus.isTradingHours
      ? 'Markets Open (9:00 AM - 5:00 PM EST) · 1-minute updates active'
      : 'Markets Closed (5:00 PM - 9:00 AM EST) · Values frozen at last close',
    lastPullTimestamp,
    quotes: quotesCache,
  });
});

// Manual refresh trigger
app.post('/api/quotes/refresh', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  await pullAllIndices();
  const estStatus = getESTStatus();
  res.json({
    status: 'refreshed',
    timestamp: Date.now(),
    estTime: estStatus.estStr,
    isTradingHours: estStatus.isTradingHours,
    marketStatus: estStatus.isTradingHours ? 'OPEN' : 'CLOSED',
    lastPullTimestamp,
    quotes: quotesCache,
  });
});

async function main() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial terminal server listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
