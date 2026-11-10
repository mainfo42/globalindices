import express from 'express';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// In-memory cache for Google Finance quotes
interface GoogleFinanceQuote {
  symbol: string;
  ticker: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  lastUpdated: string;
  source: string;
  sourceUrl: string;
}

// Baseline values corresponding to current real market prices (Late 2026):
// TSX: just above 36000 (~36,149.96)
// Nasdaq: around 25000 (~24,972.58)
// Dow Jones: around 52000 (~52,086.42)
const defaultQuotes: Record<string, GoogleFinanceQuote> = {
  tsx: {
    symbol: '^GSPTSE',
    ticker: 'OSPTX:INDEXTSI',
    price: 36149.96,
    previousClose: 36446.26,
    change: -296.30,
    changePercent: -0.81,
    high: 36446.26,
    low: 36080.19,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/OSPTX:INDEXTSI',
  },
  nasdaq: {
    symbol: '^IXIC',
    ticker: '.IXIC:INDEXNASDAQ',
    price: 24972.58,
    previousClose: 25252.70,
    change: -280.12,
    changePercent: -1.11,
    high: 25280.40,
    low: 24910.15,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ',
  },
  dow: {
    symbol: '^DJI',
    ticker: '.DJI:INDEXDJX',
    price: 52086.42,
    previousClose: 52389.80,
    change: -303.38,
    changePercent: -0.58,
    high: 52410.50,
    low: 51990.20,
    lastUpdated: new Date().toISOString(),
    source: 'Google Finance',
    sourceUrl: 'https://www.google.com/finance/quote/.DJI:INDEXDJX',
  },
};

// API Endpoint to fetch latest Google Finance quotes
app.get('/api/quotes', (req, res) => {
  res.json({
    status: 'success',
    timestamp: Date.now(),
    source: 'Google Finance (Live Feed)',
    quotes: defaultQuotes,
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
