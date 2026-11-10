export type TimeFrame = 'day' | 'week' | 'month';

export interface DataPoint {
  timestamp: number;
  timeLabel: string;
  price: number;
  volume: number;
}

export interface IndexConstituent {
  symbol: string;
  name: string;
  weight: string;
  change: number;
}

export interface MarketIndex {
  id: 'tsx' | 'nasdaq' | 'dow';
  symbol: string;
  name: string;
  shortName: string;
  exchange: string;
  currency: string;
  country: string;
  flag: string;
  basePrice: number;
  previousClose: number;
  currentPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: string;
  lastTickDirection: 'up' | 'down' | 'neutral';
  lastTickTime: number;
  history: {
    day: DataPoint[];
    week: DataPoint[];
    month: DataPoint[];
  };
  constituents: IndexConstituent[];
  weekRange52: {
    low: number;
    high: number;
  };
  peRatio: number;
  divYield: string;
}
