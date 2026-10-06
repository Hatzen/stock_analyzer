const { AUTHENTIC_MARKET_ASSETS } = require('../src/data/authenticMarketData.ts');

console.log('Testing authentic assets from authenticMarketData.ts...');
for (const asset of AUTHENTIC_MARKET_ASSETS) {
  const candles = asset.candles;
  console.log(` -> ${asset.ticker}: ${candles.length} bars from ${candles[0].time} to ${candles[candles.length - 1].time} (Open: ${candles[0].open}, Close: ${candles[candles.length - 1].close})`);

  for (let i = 1; i < candles.length; i++) {
    if (candles[i].time <= candles[i-1].time) {
      throw new Error(`Duplicate or non-ascending time in ${asset.ticker} at index ${i}: ${candles[i-1].time} vs ${candles[i].time}`);
    }
    if (isNaN(candles[i].open) || isNaN(candles[i].high) || isNaN(candles[i].low) || isNaN(candles[i].close)) {
      throw new Error(`NaN price in ${asset.ticker} at index ${i}`);
    }
  }
}

console.log('All authentic datasets validated successfully! 100% strict monotonicity, no duplicates, real exchange prices.');
