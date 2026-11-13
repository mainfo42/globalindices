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

interface IndexTarget {
  id: 'tsx' | 'nasdaq' | 'dow';
  ticker: string;
  url: string;
  symbol: string;
  name: string;
}

const TARGETS: IndexTarget[] = [
  {
    id: 'tsx',
    ticker: 'OSPTX:INDEXTSI',
    url: 'https://www.google.com/finance/quote/OSPTX:INDEXTSI',
    symbol: '^GSPTSE',
    name: 'S&P/TSX Composite',
  },
  {
    id: 'nasdaq',
    ticker: '.IXIC:INDEXNASDAQ',
    url: 'https://www.google.com/finance/quote/.IXIC:INDEXNASDAQ',
    symbol: '^IXIC',
    name: 'Nasdaq Composite',
  },
  {
    id: 'dow',
    ticker: '.DJI:INDEXDJX',
    url: 'https://www.google.com/finance/quote/.DJI:INDEXDJX',
    symbol: '^DJI',
    name: 'Dow Jones Industrial Average',
  },
];

function getESTStatus() {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
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
    const isTradingHours = isWeekday && hour >= 9 && hour < 17;

    const estStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second
      .toString()
      .padStart(2, '0')} EST`;

    return { estStr, isTradingHours };
  } catch {
    const estDate = new Date(now.getTime() - 5 * 60 * 60 * 1000);
    const day = estDate.getUTCDay();
    const hour = estDate.getUTCHours();
    const minute = estDate.getUTCMinutes();
    const second = estDate.getUTCSeconds();
    const isWeekday = day >= 1 && day <= 5;
    const isTradingHours = isWeekday && hour >= 9 && hour < 17;
    const estStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second
      .toString()
      .padStart(2, '0')} EST`;
    return { estStr, isTradingHours };
  }
}

async function pullGoogleFinanceIndex(target: IndexTarget): Promise<GoogleFinanceQuote | null> {
  try {
    const fetchUrl = `${target.url}?hl=en&_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb; SOCS=CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LyaBg',
        'Cache-Control': 'no-cache, no-store, max-age=0',
        Pragma: 'no-cache',
      },
      signal: AbortSignal.timeout(8500),
    });

    if (!res.ok) {
      return null;
    }

    const html = await res.text();

    // Primary DOM selector matching Google Finance main quote container
    const mainMatch = html.match(
      /class="N6SYTe"[^>]*><span jsname="Pdsbrc"[^>]*><span>([^<]+)<\/span><\/span><\/div>[\s\S]*?<span jsname="vY9t3b"[^>]*><span[^>]*>([^<]+)<\/span><\/span>[\s\S]*?<span jsname="xnruHf"[^>]*><span>([^<]+)<\/span><\/span>/
    );

    const secondaryMatch = html.match(
      /,null,null,null,null,null,([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)/
    );

    if (mainMatch) {
      const price = parseFloat(mainMatch[1].replace(/,/g, ''));
      const changeClean = mainMatch[3].replace(/,/g, '').replace(/[\u2212\u2013\u2014]/g, '-').trim();
      const change = parseFloat(changeClean);
      const percentClean = mainMatch[2].replace(/[%+]/g, '').replace(/[\u2212\u2013\u2014]/g, '-').trim();
      const changePercent = parseFloat(percentClean);
      const prevClose = Math.round((price - change) * 100) / 100;

      const high = secondaryMatch ? parseFloat(secondaryMatch[3]) : price;
      const low = secondaryMatch ? parseFloat(secondaryMatch[4]) : price;
      const yearHigh = secondaryMatch ? parseFloat(secondaryMatch[5]) : price;
      const yearLow = secondaryMatch ? parseFloat(secondaryMatch[6]) : price;

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

    // Fallback DOM selector: YMlKec fxKbKc + P6K39c previous close
    const ymlPriceMatch = html.match(/class="YMlKec fxKbKc"[^>]*>([^<]+)<\/div>/);
    const prevCloseMatch = html.match(/class="P6K39c"[^>]*>([^<]+)<\/div>/);
    if (ymlPriceMatch) {
      const price = parseFloat(ymlPriceMatch[1].replace(/[^0-9.-]/g, ''));
      const parsedPrev = prevCloseMatch
        ? parseFloat(prevCloseMatch[1].replace(/[^0-9.-]/g, ''))
        : Number.NaN;
      if (!Number.isNaN(price) && price > 0) {
        const previousClose = !Number.isNaN(parsedPrev) && parsedPrev > 0 ? parsedPrev : price;
        const change = Math.round((price - previousClose) * 100) / 100;
        const changePercent =
          previousClose > 0 ? Math.round((change / previousClose) * 100 * 100) / 100 : 0;

        return {
          symbol: target.symbol,
          ticker: target.ticker,
          name: target.name,
          price,
          previousClose,
          change,
          changePercent,
          high: secondaryMatch ? parseFloat(secondaryMatch[3]) : price,
          low: secondaryMatch ? parseFloat(secondaryMatch[4]) : price,
          yearHigh: secondaryMatch ? parseFloat(secondaryMatch[5]) : price,
          yearLow: secondaryMatch ? parseFloat(secondaryMatch[6]) : price,
          lastUpdated: new Date().toISOString(),
          source: 'Google Finance (Live Web Pull)',
          sourceUrl: target.url,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export const handler = async (event: { httpMethod?: string }) => {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const results = await Promise.allSettled(TARGETS.map((t) => pullGoogleFinanceIndex(t)));
  const quotes: Record<string, GoogleFinanceQuote> = {};

  results.forEach((res, idx) => {
    const target = TARGETS[idx];
    if (res.status === 'fulfilled' && res.value) {
      quotes[target.id] = res.value;
    }
  });

  if (Object.keys(quotes).length === 0) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        status: 'error',
        message: 'Unable to parse live quotes from Google Finance',
        timestamp: Date.now(),
      }),
    };
  }

  const estStatus = getESTStatus();
  const nowTs = Date.now();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'success',
      timestamp: nowTs,
      source: 'Google Finance',
      estTime: estStatus.estStr,
      isTradingHours: estStatus.isTradingHours,
      marketStatus: estStatus.isTradingHours ? 'OPEN' : 'CLOSED',
      marketStatusMessage: estStatus.isTradingHours
        ? 'Markets Open (9:00 AM - 5:00 PM EST) · 1-minute updates active'
        : 'Markets Closed (5:00 PM - 9:00 AM EST) · Values frozen at last close',
      lastPullTimestamp: nowTs,
      quotes,
    }),
  };
};
