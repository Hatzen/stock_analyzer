const fs = require('fs');
const path = require('path');
const data = require('../src/data/realMarketData.json');

let tsCode = `import type { Candle } from '../types/market';

export interface AuthenticAssetData {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  startPrice: number;
  latestPrice: number;
  description: string;
  candles: Candle[];
}

function unpack(tuples: [string, number, number, number, number, number][]): Candle[] {
  return tuples.map(t => ({
    time: t[0],
    open: t[1],
    high: t[2],
    low: t[3],
    close: t[4],
    volume: t[5]
  }));
}
`;

data.forEach(a => {
  const tuples = a.candles.map(c => [c.time, c.open, c.high, c.low, c.close, c.volume]);
  const varName = `${a.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TUPLES`;
  tsCode += `\nconst ${varName}: [string, number, number, number, number, number][] = ${JSON.stringify(tuples)};\n`;
});

tsCode += `\nexport const AUTHENTIC_MARKET_ASSETS: AuthenticAssetData[] = [\n`;
data.forEach(a => {
  const varName = `${a.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_TUPLES`;
  tsCode += `  {
    id: ${JSON.stringify(a.id)},
    name: ${JSON.stringify(a.name)},
    ticker: ${JSON.stringify(a.ticker)},
    sector: ${JSON.stringify(a.sector)},
    startPrice: ${a.startPrice},
    latestPrice: ${a.latestPrice},
    description: ${JSON.stringify(a.description)},
    candles: unpack(${varName})
  },\n`;
});
tsCode += `];\n`;

const outPath = path.resolve(__dirname, '../src/data/authenticMarketData.ts');
fs.writeFileSync(outPath, tsCode, 'utf-8');
console.log('Successfully written', outPath, 'Size:', (fs.statSync(outPath).size / 1024).toFixed(1), 'KB');
