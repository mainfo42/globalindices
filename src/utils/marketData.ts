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
  // 1. TSX Composite Index (Toronto Stock Exchange) - starts positive (+green)
  const tsxClose = 25042.80;
  const tsxDay = generateDaySeries(tsxClose, 0.0065, 1.1);
  const tsxCurrent = tsxDay[tsxDay.length - 1].price;
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
    openPrice: tsxDay[0].price,
    highPrice: Math.max(...tsxPrices),
    lowPrice: Math.min(...tsxPrices),
    volume: '241.8M',
    lastTickDirection: 'up',
    lastTickTime: Date.now(),
    history: {
      day: tsxDay,
      week: generateWeekSeries(tsxClose, 0.012, 1.2),
      month: generateMonthSeries(tsxClose, 0.028, 1.4),
    },
    constituents: [
      { symbol: 'RY.TO', name: 'Royal Bank of Canada', weight: '6.4%', change: 0.85 },
      { symbol: 'TD.TO', name: 'Toronto-Dominion Bank', weight: '5.1%', change: -0.22 },
      { symbol: 'SHOP.TO', name: 'Shopify Inc', weight: '4.8%', change: 2.14 },
      { symbol: 'ENB.TO', name: 'Enbridge Inc', weight: '4.2%', change: 0.45 },
      { symbol: 'CNR.TO', name: 'Canadian National Railway', weight: '3.6%', change: 0.12 },
    ],
    weekRange52: { low: 20680.50, high: 25310.20 },
    peRatio: 16.4,
    divYield: '3.12%',
  };

  // 2. Nasdaq Composite - starts positive (+green)
  const nasdaqClose = 19165.20;
  const nasdaqDay = generateDaySeries(nasdaqClose, 0.0085, 1.5);
  const nasdaqCurrent = nasdaqDay[nasdaqDay.length - 1].price;
  const nasdaqPrices = nasdaqDay.map(p => p.price);

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
    openPrice: nasdaqDay[0].price,
    highPrice: Math.max(...nasdaqPrices),
    lowPrice: Math.min(...nasdaqPrices),
    volume: '4.12B',
    lastTickDirection: 'up',
    lastTickTime: Date.now(),
    history: {
      day: nasdaqDay,
      week: generateWeekSeries(nasdaqClose, 0.021, 1.6),
      month: generateMonthSeries(nasdaqClose, 0.045, 1.8),
    },
    constituents: [
      { symbol: 'AAPL', name: 'Apple Inc', weight: '12.8%', change: 1.15 },
      { symbol: 'NVDA', name: 'NVIDIA Corp', weight: '11.4%', change: 2.45 },
      { symbol: 'MSFT', name: 'Microsoft Corp', weight: '10.2%', change: 0.62 },
      { symbol: 'AMZN', name: 'Amazon.com Inc', weight: '7.8%', change: 1.35 },
      { symbol: 'GOOGL', name: 'Alphabet Inc Cl A', weight: '5.9%', change: 0.48 },
    ],
    weekRange52: { low: 15701.07, high: 19410.80 },
    peRatio: 31.8,
    divYield: '0.74%',
  };

  // 3. Dow Jones Industrial Average - starts negative (-red) to show contrast immediately!
  const dowClose = 44320.10;
  const dowDay = generateDaySeries(dowClose, -0.0045, 0.95);
  const dowCurrent = dowDay[dowDay.length - 1].price;
  const dowPrices = dowDay.map(p => p.price);

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
    openPrice: dowDay[0].price,
    highPrice: Math.max(...dowPrices),
    lowPrice: Math.min(...dowPrices),
    volume: '385.4M',
    lastTickDirection: 'down',
    lastTickTime: Date.now(),
    history: {
      day: dowDay,
      week: generateWeekSeries(dowClose, -0.008, 1.1),
      month: generateMonthSeries(dowClose, 0.015, 1.3),
    },
    constituents: [
      { symbol: 'GS', name: 'Goldman Sachs Group', weight: '8.2%', change: -1.10 },
      { symbol: 'UNH', name: 'UnitedHealth Group', weight: '7.9%', change: -0.85 },
      { symbol: 'HD', name: 'Home Depot Inc', weight: '6.4%', change: 0.15 },
      { symbol: 'CAT', name: 'Caterpillar Inc', weight: '5.8%', change: -0.62 },
      { symbol: 'AMGN', name: 'Amgen Inc', weight: '4.7%', change: -0.40 },
    ],
    weekRange52: { low: 37611.56, high: 44580.30 },
    peRatio: 22.1,
    divYield: '1.78%',
  };

  // STRICT REQUIREMENT: Starting with the TSX, horizontally 3 blocks: TSX, Nasdaq, Dow Jones
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
