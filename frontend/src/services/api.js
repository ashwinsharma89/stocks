const BASE_URL = '/api';

async function fetchJson(url) {
  const res = await fetch(`${BASE_URL}${url}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function postJson(url, data) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function putJson(url, data) {
  const res = await fetch(`${BASE_URL}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function deleteReq(url) {
  const res = await fetch(`${BASE_URL}${url}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// Stock APIs
export const stockApi = {
  getQuote: (symbol) => fetchJson(`/stocks/quote/${symbol}`),
  getHistory: (symbol, period = '1y', interval = '1d') =>
    fetchJson(`/stocks/history/${symbol}?period=${period}&interval=${interval}`),
  getDetail: (symbol) => fetchJson(`/stocks/detail/${symbol}`),
  getQuotes: (symbols) => fetchJson(`/stocks/quotes?symbols=${symbols.join(',')}`),
  getMarketOverview: () => fetchJson('/stocks/market-overview'),
  search: (q) => fetchJson(`/stocks/search?q=${q}`),
};

// RRG APIs
export const rrgApi = {
  getSectorRRG: (period = '6mo', tailLength = 8) =>
    fetchJson(`/rrg/sectors?period=${period}&tail_length=${tailLength}`),
  getStockRRG: (symbols, benchmark = '^NSEI', period = '6mo', tailLength = 8) =>
    fetchJson(`/rrg/stocks?symbols=${symbols.join(',')}&benchmark=${benchmark}&period=${period}&tail_length=${tailLength}`),
};

// Market Breadth APIs
export const breadthApi = {
  getBreadth: (period = '3mo') => fetchJson(`/breadth/?period=${period}`),
  getAboveMA: (maPeriod = 200) => fetchJson(`/breadth/above-ma?ma_period=${maPeriod}`),
};

// Sector APIs
export const sectorApi = {
  getPerformance: () => fetchJson('/sectors/performance'),
  getHeatmap: () => fetchJson('/sectors/heatmap'),
  getRotation: (period = '6mo') => fetchJson(`/sectors/rotation?period=${period}`),
};

// Scanner APIs
export const scannerApi = {
  gapScan: (minGapPct = 2.0) => fetchJson(`/scanners/gap?min_gap_pct=${minGapPct}`),
  volumeScan: (multiplier = 2.0) => fetchJson(`/scanners/volume?multiplier=${multiplier}`),
  breakoutScan: (lookback = 20) => fetchJson(`/scanners/breakout?lookback=${lookback}`),
  patternScan: () => fetchJson('/scanners/pattern'),
  runScan: (scanType, universe = 'NIFTY50') =>
    fetchJson(`/scanners/run?scan_type=${scanType}&universe=${universe}`),
};

// Journal APIs
export const journalApi = {
  getEntries: () => fetchJson('/journal'),
  createEntry: (entry) => postJson('/journal', entry),
  updateEntry: (id, entry) => putJson(`/journal/${id}`, entry),
  deleteEntry: (id) => deleteReq(`/journal/${id}`),
  getStats: () => fetchJson('/journal/stats'),
};

// Watchlist APIs
export const watchlistApi = {
  getAll: () => fetchJson('/watchlists'),
  create: (data) => postJson('/watchlists', data),
  update: (id, data) => putJson(`/watchlists/${id}`, data),
  remove: (id) => deleteReq(`/watchlists/${id}`),
  addSymbol: (id, symbol) => postJson(`/watchlists/${id}/add/${symbol}`, {}),
  removeSymbol: (id, symbol) => deleteReq(`/watchlists/${id}/remove/${symbol}`),
};
