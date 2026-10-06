const https = require('https');
const fs = require('fs');
const path = require('path');

const ASSETS = [
  {
    id: 'spy',
    name: 'SPDR S&P 500 ETF Trust',
    ticker: 'SPY',
    yahooTicker: 'SPY',
    sector: 'US Index (Large Cap)',
    description: 'Offizielle historische Kursdaten des S&P 500 ETF. Zeigt den realen Bullenmarkt, Zinskorrekturen und Allzeithochs.'
  },
  {
    id: 'qqq',
    name: 'Invesco QQQ Trust (Nasdaq 100)',
    ticker: 'QQQ',
    yahooTicker: 'QQQ',
    sector: 'US Tech Index',
    description: 'Echte historische Kurse des Nasdaq 100 mit Tech-Rallies, Zinssensitivität und KI-Boom-Phasen.'
  },
  {
    id: 'nvda',
    name: 'NVIDIA Corporation',
    ticker: 'NVDA',
    yahooTicker: 'NVDA',
    sector: 'Semiconductors / AI',
    description: 'Originale Kursdaten des KI-Marktführers NVIDIA inklusive des 10:1 Aktiensplits im Juni 2024 und realer Volatilität.'
  },
  {
    id: 'aapl',
    name: 'Apple Inc.',
    ticker: 'AAPL',
    yahooTicker: 'AAPL',
    sector: 'Consumer Electronics',
    description: 'Authentische Marktkurse der wertvollsten Technologiemarke mit soliden Konsolidierungszonen und institutionellem Flow.'
  },
  {
    id: 'tsla',
    name: 'Tesla Inc.',
    ticker: 'TSLA',
    yahooTicker: 'TSLA',
    sector: 'EV / Clean Energy',
    description: 'Reale historische Kursdaten von Tesla mit extrem dynamischen Trendwechseln, Earnings-Gaps und starken Range-Ausbrüchen.'
  },
  {
    id: 'btc',
    name: 'Bitcoin / USD',
    ticker: 'BTC/USD',
    yahooTicker: 'BTC-USD',
    sector: 'Cryptocurrency Benchmark',
    description: 'Echte Bitcoin-Tageskerzen von der 16k-Bodenbildung über die ETF-Zulassung 2024 bis zur parabolischen Expansion.'
  },
  {
    id: 'gld',
    name: 'SPDR Gold Shares',
    ticker: 'GLD (Gold)',
    yahooTicker: 'GLD',
    sector: 'Commodities / Precious Metals',
    description: 'Originale Kurshistorie des physisch hinterlegten Gold-ETFs mit realen Makro-Fluchtbewegungen und Allzeithochs.'
  }
];

const now = Math.floor(Date.now() / 1000);
// 2023-01-01 00:00:00 UTC = 1672531200
const startTs = 1672531200;

function fetchYahoo(ticker) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTs}&period2=${now}&interval=1d`;
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          const result = json.chart.result[0];
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Yahoo response for ${ticker}: ${e.message}`));
        }
      });
    }).on('error', err => reject(err));
  });
}

function sanitizeAndFormatCandles(result) {
  const timestamps = result.timestamp || [];
  const quote = result.indicators.quote[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const rawCandles = [];
  const seenDates = new Set();

  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i];

    // Filter out invalid/empty bars (e.g. trading holidays or incomplete ticks)
    if (o === null || o === undefined || isNaN(o) ||
        h === null || h === undefined || isNaN(h) ||
        l === null || l === undefined || isNaN(l) ||
        c === null || c === undefined || isNaN(c)) {
      continue;
    }

    const dateStr = new Date(ts * 1000).toISOString().split('T')[0];
    if (seenDates.has(dateStr)) continue; // Ensure strictly unique
    seenDates.add(dateStr);

    rawCandles.push({
      time: dateStr,
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.round(v || 0)
    });
  }

  // Sort strictly ascending
  rawCandles.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  // Verify monotonicity
  for (let i = 1; i < rawCandles.length; i++) {
    if (rawCandles[i].time <= rawCandles[i - 1].time) {
      throw new Error(`Monotonicity check failed at index ${i}: ${rawCandles[i-1].time} vs ${rawCandles[i].time}`);
    }
  }

  return rawCandles;
}

async function run() {
  console.log('Downloading authentic real-world market datasets...');
  const compiledAssets = [];

  for (const assetMeta of ASSETS) {
    console.log(`Fetching ${assetMeta.ticker} (${assetMeta.yahooTicker})...`);
    try {
      const result = await fetchYahoo(assetMeta.yahooTicker);
      const candles = sanitizeAndFormatCandles(result);
      console.log(`  ✓ ${assetMeta.ticker}: ${candles.length} real trading bars (${candles[0].time} to ${candles[candles.length - 1].time})`);
      compiledAssets.push({
        ...assetMeta,
        startPrice: candles[0].open,
        latestPrice: candles[candles.length - 1].close,
        candles
      });
    } catch (err) {
      console.error(`  ✗ Error fetching ${assetMeta.ticker}:`, err.message);
      process.exit(1);
    }
  }

  // Output as JSON file in src/data/realMarketData.json
  const outJsonPath = path.resolve(__dirname, '../src/data/realMarketData.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(compiledAssets, null, 2), 'utf-8');
  console.log(`Saved authentic real market data to ${outJsonPath} (${(fs.statSync(outJsonPath).size / 1024).toFixed(1)} KB)`);
}

run();
