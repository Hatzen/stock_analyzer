import type { Candle } from '../types/market';

/**
 * Parses CSV text into Candle array. Supports standard formats from:
 * - Yahoo Finance (Date, Open, High, Low, Close, Adj Close, Volume)
 * - TradingView (time, open, high, low, close, volume)
 * - MetaTrader & Generic CSVs
 */
export function parseCSVToCandles(csvText: string): Candle[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV-Datei enthält keine Datenzeilen.');
  }

  const header = lines[0].split(/[,;\t]/).map(h => h.trim().toLowerCase());
  const dateIdx = header.findIndex(h => h.includes('date') || h.includes('time') || h === 'datum');
  const openIdx = header.findIndex(h => h.includes('open') || h === 'eröffnung');
  const highIdx = header.findIndex(h => h.includes('high') || h === 'hoch');
  const lowIdx = header.findIndex(h => h.includes('low') || h === 'tief');
  const closeIdx = header.findIndex(h => (h.includes('close') && !h.includes('adj')) || h === 'schluss');
  const volIdx = header.findIndex(h => h.includes('vol') || h === 'volumen');

  if (dateIdx === -1 || openIdx === -1 || highIdx === -1 || lowIdx === -1 || closeIdx === -1) {
    throw new Error('Spalten konnten nicht erkannt werden. Bitte stelle sicher, dass Datum, Open, High, Low und Close vorhanden sind.');
  }

  const candles: Candle[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(/[,;\t]/).map(c => c.trim());
    if (cols.length < 5) continue;

    const rawDate = cols[dateIdx];
    const open = parseFloat(cols[openIdx]);
    const high = parseFloat(cols[highIdx]);
    const low = parseFloat(cols[lowIdx]);
    const close = parseFloat(cols[closeIdx]);
    const volume = volIdx !== -1 && cols[volIdx] ? parseFloat(cols[volIdx]) : 100000;

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) continue;

    let formattedDate = rawDate;
    if (rawDate.includes('T')) {
      formattedDate = rawDate.split('T')[0];
    } else if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        if (parts[2].length === 4) {
          formattedDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }
    }

    candles.push({
      time: formattedDate,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: isNaN(volume) ? 100000 : Math.round(volume)
    });
  }

  candles.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  if (candles.length === 0) {
    throw new Error('Keine gültigen Kerzendaten in der CSV-Datei gefunden.');
  }

  return candles;
}
