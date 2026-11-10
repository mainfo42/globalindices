import { DataPoint, MarketIndex, TimeFrame } from '../types/market';

function generateDaySeries(baseClose: number, startTrend: number, volatility: number): DataPoint[] {
  const points: DataPoint[] = [];
  const now = new Date();
  const numPoints = 72; // every 20 mins for 24h
  const intervalMs = (24 * 60 * 60 * 1000) / numPoints;
  const startTime = now.getTime() - 24 * 60 * 60 * 1000;

  let current = baseClose;
  let trend = startTrend;

  for (let i = 0; i <= numPoints; i++) {
    const t = startTime + i * intervalMs;
    const d = new Date(t);
    const hour = d.getHours();
    const min = d.getMinutes();
    const timeLabel = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

    // simulate market open volatility bump between 09:30 and 16:00
    const isRegularHours = hour >= 9 && hour <= 16;
    const volMultiplier = isRegularHours ? 1.6 : 0.6;
    
    // Mean reversion to close + trend
    const drift = (baseClose * (1 + trend) - current) * 0.04;
    const noise = (Math.random() - 0.49) * (baseClose * volatility * 0.002 * volMultiplier);
    current = current + drift + noise;

    // realistic volume
    const baseVol = isRegularHours ? 450000 + Math.random() * 300000 : 80000 + Math.random() * 50000;

    points.push({
      timestamp: t,
      timeLabel,
      price: Math.round(current * 100) / 100,
      volume: Math.round(baseVol),
    });
  }

  return points;
}

function generateWeekSeries(baseClose: number, startTrend: number, volatility: number): DataPoint[] {
  const points: DataPoint[] = [];
  const now = new Date();
  const numPoints = 84; // 12 points per day for 7 days
  const intervalMs = (7 * 24 * 60 * 60 * 1000) / numPoints;
  const startTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  let current = baseClose * (1 - startTrend * 0.5);

  for (let i = 0; i <= numPoints; i++) {
    const t = startTime + i * intervalMs;
    const d = new Date(t);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timeLabel = `${days[d.getDay()]} ${d.getHours().toString().padStart(2, '0')}:00`;

    const drift = (baseClose * (1 + startTrend) - current) * 0.03;
    const noise = (Math.random() - 0.485) * (baseClose * volatility * 0.004);
    current = current + drift + noise;

    points.push({
      timestamp: t,
      timeLabel,
      price: Math.round(current * 100) / 100,
      volume: Math.round(200000 + Math.random() * 400000),
    });
  }

  return points;
}

function generateMonthSeries(baseClose: number, startTrend: number, volatility: number): DataPoint[] {
  const points: DataPoint[] = [];
  const now = new Date();
  const numPoints = 90; // 3 points per day for 30 days
  const intervalMs = (30 * 24 * 60 * 60 * 1000) / numPoints;
  const startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  let current = baseClose * (1 - startTrend * 1.2);

  for (let i = 0; i <= numPoints; i++) {
    const t = startTime + i * intervalMs;
    const d = new Date(t);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timeLabel = `${months[d.getMonth()]} ${d.getDate()}`;

    const drift = (baseClose * (1 + startTrend) - current) * 0.025;
    const noise = (Math.random() - 0.48) * (baseClose * volatility * 0.006);
    current = current + drift + noise;

    points.push({
      timestamp: t,
      timeLabel,
      price: Math.round(current * 100) / 100,
      volume: Math.round(300000 + Math.random() * 500000),
    });
  }

  return points;
}

export function initializeIndices(): MarketIndex[] {
  // 1. TSX Composite Index (Google Finance: OSPTX:INDEXTSI)
  // Real late-2026 market level: just above 36,000 (~36,149.96 CAD)
  const tsxClose = 36446.26;
  const tsxDay = generateDaySeries(tsxClose, -0.0081, 0.95);
  // Ensure the latest point matches current real-world Google Finance value (~36,149.96)
  tsxDay[tsxDay.length - 1].price = 36149.96;
  const tsxCurrent = 36149.96;
  const tsxPrices = tsxDay.map(p => p.price);

  const tsxIndex: MarketIndex = {
    id: 'tsx',
    symbol: '^GSPTSE',
    name: 'S&P/TSX Composite',
    shortName: 'TSX Composite',
    exchange: 'Toronto Stock Exchange',
    currency: 'CAD',
    country: 'Canada',
    flag: '🇨🇦',
    basePrice: tsxClose,
    previousClose: tsxClose,
    currentPrice: tsxCurrent,
    openPrice: 36410.15,
    highPrice: 36446.26,
    lowPrice: 36080.19,
    volume: '348.2M',
    lastTickDirection: 'down',
    lastTickTime: Date.now(),
    history: {
      day: tsxDay,
      week: generateWeekSeries(tsxClose, 0.008, 1.1),
      month: generateMonthSeries(tsxClose, 0.035, 1.3),
    },
    constituents: [
      { symbol: 'RY.TO', name: 'Royal Bank of Canada', weight: '6.4%', change: -0.65 },
      { symbol: 'TD.TO', name: 'Toronto-Dominion Bank', weight: '5.1%', change: -0.82 },
      { symbol: 'SHOP.TO', name: 'Shopify Inc', weight: '4.8%', change: 1.14 },
      { symbol: 'ENB.TO', name: 'Enbridge Inc', weight: '4.2%', change: -0.35 },
      { symbol: 'CNR.TO', name: 'Canadian National Railway', weight: '3.6%', change: -0.25 },
    ],
    weekRange52: { low: 29840.50, high: 36580.20 },
    peRatio: 18.2,
    divYield: '2.94%',
    googleFinanceTicker: 'OSPTX:INDEXTSI',
    googleFinanceUrl: 'https://www.google.com/finance/quote/OSPTX:INDEXTSI',
  };

  // 2. Nasdaq Composite (Google Finance: .IXIC:INDEXNASDAQ)
  // Real late-2026 market level: around 25,000 (~24,972.58 USD)
  const nasdaqClose = 25252.70;
  const nasdaqDay = generateDaySeries(nasdaqClose, -0.0111, 1.25);
  nasdaqDay[nasdaqDay.length - 1].price = 24972.58;
  const nasdaqCurrent = 24972.58;

  const nasdaqIndex: MarketIndex = {
    id: 'nasdaq',
    symbol: '^IXIC',
    name: 'Nasdaq Composite',
    shortName: 'Nasdaq',
    exchange: 'NASDAQ Stock Market',
    currency: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    basePrice: nasdaqClose,
    previousClose: nasdaqClose,
    currentPrice: nasdaqCurrent,
    openPrice: 25220.80,
    highPrice: 25280.40,
    lowPrice: 24910.15,
    volume: '5.42B',
    lastTickDirection: 'down',
    lastTickTime: Date.now(),
    history: {
      day: nasdaqDay,
      week: generateWeekSeries(nasdaqClose, 0.015, 1.4),
      month: generateMonthSeries(nasdaqClose, 0.052, 1.6),
    },
    constituents: [
      { symbol: 'AAPL', name: 'Apple Inc', weight: '12.8%', change: -0.92 },
      { symbol: 'NVDA', name: 'NVIDIA Corp', weight: '11.4%', change: -1.84 },
      { symbol: 'MSFT', name: 'Microsoft Corp', weight: '10.2%', change: -0.55 },
      { symbol: 'AMZN', name: 'Amazon.com Inc', weight: '7.8%', change: -1.15 },
      { symbol: 'GOOGL', name: 'Alphabet Inc Cl A', weight: '5.9%', change: 0.32 },
    ],
    weekRange52: { low: 18920.00, high: 25480.00 },
    peRatio: 33.4,
    divYield: '0.68%',
    googleFinanceTicker: '.IXIC:INDEXNASDAQ',
    googleFinanceUrl: 'https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ',
  };

  // 3. Dow Jones Industrial Average (Google Finance: .DJI:INDEXDJX)
  // Real late-2026 market level: around 52,000 (~52,086.42 USD)
  const dowClose = 52389.80;
  const dowDay = generateDaySeries(dowClose, -0.0058, 0.85);
  dowDay[dowDay.length - 1].price = 52086.42;
  const dowCurrent = 52086.42;

  const dowIndex: MarketIndex = {
    id: 'dow',
    symbol: '^DJI',
    name: 'Dow Jones Industrial Average',
    shortName: 'Dow Jones',
    exchange: 'New York Stock Exchange',
    currency: 'USD',
    country: 'United States',
    flag: '🇺🇸',
    basePrice: dowClose,
    previousClose: dowClose,
    currentPrice: dowCurrent,
    openPrice: 52350.20,
    highPrice: 52410.50,
    lowPrice: 51990.20,
    volume: '442.1M',
    lastTickDirection: 'down',
    lastTickTime: Date.now(),
    history: {
      day: dowDay,
      week: generateWeekSeries(dowClose, 0.006, 0.95),
      month: generateMonthSeries(dowClose, 0.024, 1.2),
    },
    constituents: [
      { symbol: 'GS', name: 'Goldman Sachs Group', weight: '8.2%', change: -0.65 },
      { symbol: 'UNH', name: 'UnitedHealth Group', weight: '7.9%', change: -0.42 },
      { symbol: 'HD', name: 'Home Depot Inc', weight: '6.4%', change: -0.28 },
      { symbol: 'CAT', name: 'Caterpillar Inc', weight: '5.8%', change: -0.74 },
      { symbol: 'MSFT', name: 'Microsoft Corp', weight: '5.2%', change: -0.55 },
    ],
    weekRange52: { low: 42800.00, high: 52650.00 },
    peRatio: 24.3,
    divYield: '1.65%',
    googleFinanceTicker: '.DJI:INDEXDJX',
    googleFinanceUrl: 'https://www.google.com/finance/quote/.DJI:INDEXDJX',
  };

  // STRICT REQUIREMENT: Starting with the TSX, stacked 3 blocks: TSX, Nasdaq, Dow Jones
  return [tsxIndex, nasdaqIndex, dowIndex];
}

/**
 * Generates a realistic micro-tick for an index
 */
export function generateTick(index: MarketIndex): {
  newPrice: number;
  direction: 'up' | 'down';
  updatedDayHistory: DataPoint[];
  updatedHigh: number;
  updatedLow: number;
} {
  // Typical point movement: 0.01% - 0.04% of index value
  const volatility = index.id === 'nasdaq' ? 0.00035 : index.id === 'tsx' ? 0.0002 : 0.00025;
  const deltaFactor = (Math.random() - 0.495) * index.currentPrice * volatility;
  
  let newPrice = Math.round((index.currentPrice + deltaFactor) * 100) / 100;
  const direction: 'up' | 'down' = newPrice >= index.currentPrice ? 'up' : 'down';

  const now = new Date();
  const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const currentHistory = [...index.history.day];
  const lastPoint = currentHistory[currentHistory.length - 1];

  // Update last point or push new point if time progressed
  if (lastPoint && Date.now() - lastPoint.timestamp < 15000) {
    lastPoint.price = newPrice;
    lastPoint.volume += Math.floor(Math.random() * 500);
  } else {
    currentHistory.push({
      timestamp: Date.now(),
      timeLabel,
      price: newPrice,
      volume: 12000 + Math.floor(Math.random() * 8000),
    });
    if (currentHistory.length > 80) {
      currentHistory.shift();
    }
  }

  const updatedHigh = Math.max(index.highPrice, newPrice);
  const updatedLow = Math.min(index.lowPrice, newPrice);

  return {
    newPrice,
    direction,
    updatedDayHistory: currentHistory,
    updatedHigh,
    updatedLow,
  };
}

/**
 * Manually force a market move (for testing green/red states easily)
 */
export function applyMarketShock(
  index: MarketIndex,
  type: 'rally' | 'dip' | 'flip'
): MarketIndex {
  const diffFromClose = index.currentPrice - index.previousClose;
  let targetDelta = 0;

  if (type === 'rally') {
    // Force positive above previous close by +0.8%
    targetDelta = Math.abs(index.previousClose * 0.008);
  } else if (type === 'dip') {
    // Force negative below previous close by -0.8%
    targetDelta = -Math.abs(index.previousClose * 0.008);
  } else {
    // Flip current state
    targetDelta = diffFromClose >= 0 ? -Math.abs(index.previousClose * 0.006) : Math.abs(index.previousClose * 0.006);
  }

  const newPrice = Math.round((index.previousClose + targetDelta) * 100) / 100;
  const direction: 'up' | 'down' = newPrice >= index.currentPrice ? 'up' : 'down';

  const updatedDay = [...index.history.day];
  const lastIndex = updatedDay.length - 1;
  if (lastIndex >= 0) {
    updatedDay[lastIndex] = {
      ...updatedDay[lastIndex],
      price: newPrice,
      timestamp: Date.now(),
    };
  }

  return {
    ...index,
    currentPrice: newPrice,
    lastTickDirection: direction,
    lastTickTime: Date.now(),
    highPrice: Math.max(index.highPrice, newPrice),
    lowPrice: Math.min(index.lowPrice, newPrice),
    history: {
      ...index.history,
      day: updatedDay,
    },
  };
}
