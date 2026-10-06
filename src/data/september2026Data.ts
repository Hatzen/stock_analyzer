import type { Candle } from '../types/market';

/**
 * High-Resolution Candlestick Dataset for September 2026 (Noc Trading Benchmark)
 * Spans 2026-09-01 00:00 to 2026-09-30 20:00 in 4-hour intervals (120 bars).
 * Specifically designed to showcase:
 * 1. Structural High/Low mapping & BOS (ignoring sub-noise)
 * 2. Pullbacks with Failed Tests (exhaustion/counterparty weakness)
 * 3. Demand & Supply Zone reactions with 1:2 CRV Target execution
 */
export function getSeptember2026Candles(): Candle[] {
  const candles: Candle[] = [];
  const startDate = new Date('2026-09-01T08:00:00Z');

  // Baseline structure points for September 2026
  // 120 bars (approx 4 bars per trading day)
  const trajectory = [
    // 01.09 - 05.09: Initial Base & Bullish Expansion (BOS #1)
    { base: 180.0, vol: 0.8 },
    { base: 181.5, vol: 0.9 },
    { base: 179.8, vol: 0.7 }, // Strong Low established around 179.8
    { base: 182.4, vol: 1.1 },
    { base: 184.2, vol: 1.3 },
    { base: 186.0, vol: 1.5 },
    { base: 188.5, vol: 1.8 }, // BOS through 186
    { base: 191.0, vol: 2.1 },
    { base: 193.5, vol: 1.9 },
    { base: 195.2, vol: 1.4 }, // Weak High around 195.5

    // 06.09 - 10.09: Pullback & Failed Test #1 (Weakness of Bears)
    { base: 193.0, vol: 0.9 },
    { base: 190.5, vol: 0.8 },
    { base: 188.0, vol: 0.7 },
    { base: 185.5, vol: 0.8 }, // Testing into Demand Zone (184-186)
    { base: 184.2, vol: 0.6 }, // Failed Test of Low: No follow-through selling!
    { base: 184.8, vol: 0.7 }, // Rejection wick
    { base: 186.5, vol: 1.2 }, // Demand absorption
    { base: 189.0, vol: 1.6 }, // Long rally underway!

    // 11.09 - 15.09: Continuation to 1:2 CRV & BOS #2
    { base: 191.5, vol: 1.7 },
    { base: 194.0, vol: 1.9 },
    { base: 196.5, vol: 2.4 }, // Target reached (1:2 CRV) and High broken (BOS #2)
    { base: 199.0, vol: 2.2 },
    { base: 201.5, vol: 2.0 },
    { base: 203.2, vol: 1.8 },
    { base: 204.5, vol: 1.5 }, // New Structural High (Weak High around 205)

    // 16.09 - 20.09: Pullback & Failed Test #2
    { base: 202.0, vol: 1.0 },
    { base: 199.5, vol: 0.9 },
    { base: 197.0, vol: 0.8 },
    { base: 195.2, vol: 0.7 }, // Retest of new Demand Zone (194-196)
    { base: 194.6, vol: 0.6 }, // Failed Test: Sellers cannot break Strong Low (193.5)
    { base: 195.8, vol: 1.1 }, // Bullish confirmation
    { base: 198.5, vol: 1.5 },
    { base: 201.0, vol: 1.8 },
    { base: 204.0, vol: 2.1 },
    { base: 206.8, vol: 2.5 }, // New High (207+)

    // 21.09 - 25.09: Climax & Market Structure Shift (Bearish BOS)
    { base: 207.5, vol: 2.6 }, // Strong High forms at 208.5
    { base: 205.0, vol: 1.4 },
    { base: 202.5, vol: 1.6 },
    { base: 199.0, vol: 2.2 },
    { base: 196.0, vol: 2.8 }, // Bearish BOS: Body closes below 197
    { base: 193.5, vol: 2.5 },

    // 26.09 - 30.09: Pullback into Supply & Failed Test of High
    { base: 195.5, vol: 1.2 },
    { base: 198.0, vol: 1.1 },
    { base: 200.5, vol: 0.9 }, // Supply Zone test (200-202)
    { base: 201.2, vol: 0.6 }, // Failed Test of High: Buyers lack volume!
    { base: 199.5, vol: 1.3 }, // Bearish engulfing
    { base: 196.0, vol: 1.8 }, // Short execution hits 1:2 CRV
    { base: 192.5, vol: 2.0 },
    { base: 189.0, vol: 2.3 }
  ];

  // Interpolate into 120 bars (every 4 hours throughout September 2026)
  const totalBars = 120;
  for (let i = 0; i < totalBars; i++) {
    const progress = i / (totalBars - 1);
    const trajIndex = Math.min(
      trajectory.length - 1,
      Math.floor(progress * (trajectory.length - 1))
    );
    const nextIndex = Math.min(trajectory.length - 1, trajIndex + 1);
    const subProgress = (progress * (trajectory.length - 1)) - trajIndex;

    const basePrice = trajectory[trajIndex].base +
      (trajectory[nextIndex].base - trajectory[trajIndex].base) * subProgress;
    const baseVol = trajectory[trajIndex].vol;

    // Small intra-bar variation
    const noise = Math.sin(i * 1.7) * 0.45 + Math.cos(i * 3.1) * 0.3;
    const open = Number((basePrice + noise * 0.4).toFixed(2));
    const close = Number((basePrice + noise * 0.8 + (trajectory[nextIndex].base > trajectory[trajIndex].base ? 0.3 : -0.3)).toFixed(2));
    const high = Number((Math.max(open, close) + Math.abs(noise) * 0.7 + 0.35).toFixed(2));
    const low = Number((Math.min(open, close) - Math.abs(noise) * 0.6 - 0.3).toFixed(2));

    const currentTimestamp = new Date(startDate.getTime() + i * 4 * 60 * 60 * 1000);
    const dateFormatted = currentTimestamp.toISOString().replace('T', ' ').substring(0, 16);

    candles.push({
      time: dateFormatted,
      open,
      high,
      low,
      close,
      volume: Math.round(baseVol * 450000 + (Math.sin(i) + 1) * 150000)
    });
  }

  return candles;
}
