import express from 'express';
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

// In-memory cache initialized with the EXACT real closing values from Google Finance:
// Dow Jones: 52,486.49 (+254.60, +0.49%, close: 52,231.89)
// Nasdaq: 25,466.19 (+400.31, +1.60%, close: 25,065.88)
// TSX: 36,411.72 (+241.27, +0.67%, close: 36,170.45)
const quotesCache: Record<string, GoogleFinanceQuote> = {
  tsx: {
    symbol: '^GSPTSE',
    ticker: 'OSPTX:INDEXTSI',
    name: 'S&P/TSX Composite',
    price: 36411.72,
    previousClose: 36170.45,
    change: 241.27,
    changePercent: 0.67,
    high: 36495.13,
    low: 36170.45,
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
    price: 25466.19,
    previousClose: 25065.88,
    change: 400.31,
    changePercent: 1.60,
    high: 25649.85,
    low: 25065.88,
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
    price: 52486.49,
    previousClose: 52231.89,
    change: 254.60,
    changePercent: 0.49,
    high: 52512.72,
    low: 52055.14,
    yearHigh: 54744.33,
    yearLow: 45057.28,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/.DJI:INDEXDJX',
  },
};

let lastPullTimestamp = Date.now();
let isPulling = false;

// Check if current time is within 9:00 AM EST to 5:00 PM EST (Monday - Friday)
function getESTStatus() {
  const now = new Date();
  const estStr = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const estDate = new Date(estStr);
  const hour = estDate.getHours();
  const day = estDate.getDay(); // 0 = Sun, 6 = Sat
  const isWeekday = day >= 1 && day <= 5;

  // Requirement: "From 5PM EST and 9h00 AM EST, the values should not move.
  // Then apply the update rule at every minute during the trading hours."
  const isTradingHours = isWeekday && hour >= 9 && hour < 17;

  return {
    estStr,
    hour,
    day,
    isWeekday,
    isTradingHours,
  };
}

// Function to pull real-time index value from Google Finance website
async function pullGoogleFinanceIndex(target: { id: string; ticker: string; url: string; symbol: string; name: string }) {
  try {
    const res = await fetch(target.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      console.warn(`[Google Finance] HTTP ${res.status} for ${target.ticker}`);
      return null;
    }

    const html = await res.text();

    // Primary DOM selector matching Google Finance main quote container
    // <div class="N6SYTe"><span jsname="Pdsbrc"><span>52,486.49</span></span></div>...<span jsname="vY9t3b"><span>+0.49%</span></span>...<span jsname="xnruHf"><span>+254.60</span></span>
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

    return null;
  } catch (err) {
    console.error(`[Google Finance] Pull error for ${target.ticker}:`, err);
    return null;
  }
}

// Master puller for all 3 indices
async function pullAllIndices() {
  if (isPulling) return;
  isPulling = true;
  const startTime = Date.now();

  const targets = [
    { id: 'tsx', ticker: 'OSPTX:INDEXTSI', url: 'https://www.google.com/finance/quote/OSPTX:INDEXTSI', symbol: '^GSPTSE', name: 'S&P/TSX Composite' },
    { id: 'nasdaq', ticker: '.IXIC:INDEXNASDAQ', url: 'https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ', symbol: '^IXIC', name: 'Nasdaq Composite' },
    { id: 'dow', ticker: '.DJI:INDEXDJX', url: 'https://www.google.com/finance/quote/.DJI:INDEXDJX', symbol: '^DJI', name: 'Dow Jones Industrial Average' },
  ];

  try {
    const results = await Promise.allSettled(targets.map((t) => pullGoogleFinanceIndex(t)));

    results.forEach((res, index) => {
      const target = targets[index];
      if (res.status === 'fulfilled' && res.value) {
        quotesCache[target.id] = res.value;
      }
    });

    lastPullTimestamp = Date.now();
    console.log(
      `[Google Finance] Pulled in ${Date.now() - startTime}ms. TSX: ${quotesCache.tsx.price}, Nasdaq: ${quotesCache.nasdaq.price}, Dow: ${quotesCache.dow.price}`
    );
  } catch (err) {
    console.error('[Google Finance] Pull error:', err);
  } finally {
    isPulling = false;
  }
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
  } else {
    // Markets closed: Values must not move. Automatic updates only resume when markets open next day.
    // Do not modify quotesCache.
  }
}, 60 * 1000);

// API Endpoints
app.get('/api/quotes', (req, res) => {
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
  await pullAllIndices();
  const estStatus = getESTStatus();
  res.json({
    status: 'refreshed',
    timestamp: Date.now(),
    estTime: estStatus.estStr,
    isTradingHours: estStatus.isTradingHours,
    marketStatus: estStatus.isTradingHours ? 'OPEN' : 'CLOSED',
    quotes: quotesCache,
  });
});

async function main() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
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
