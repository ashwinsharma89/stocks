"""Stock data service using direct Yahoo Finance API (no yfinance dependency)."""
from typing import List, Dict
from datetime import datetime
import logging

from app.services.yahoo_client import fetch_quote, fetch_chart_data, fetch_quotes_batch, fetch_stock_info
from app.utils.nse_symbols import get_nse_suffix, NIFTY_50, ALL_SYMBOLS

logger = logging.getLogger(__name__)


async def get_stock_quote(symbol: str) -> dict:
    """Get current stock quote."""
    nse_sym = get_nse_suffix(symbol)
    result = await fetch_quote(nse_sym)
    if result:
        result["symbol"] = symbol
    return result


async def get_stock_history(symbol: str, period: str = "1y", interval: str = "1d") -> List[dict]:
    """Get historical OHLCV data."""
    nse_sym = get_nse_suffix(symbol)
    chart = await fetch_chart_data(nse_sym, period, interval)
    return chart.get("ohlc", [])


async def get_stock_detail(symbol: str) -> dict:
    """Get detailed stock information."""
    nse_sym = get_nse_suffix(symbol)
    info = await fetch_stock_info(nse_sym)
    if info:
        info["symbol"] = symbol
    return info


async def get_multiple_quotes(symbols: List[str]) -> List[dict]:
    """Get quotes for multiple symbols."""
    nse_symbols = [get_nse_suffix(s) for s in symbols]
    results = await fetch_quotes_batch(nse_symbols)
    for r in results:
        r["symbol"] = r["symbol"].replace(".NS", "").replace(".BO", "")
    return results


async def get_market_overview() -> dict:
    """Get market overview with indices and top movers."""
    indices_map = {
        "^NSEI": "NIFTY 50",
        "^NSEBANK": "NIFTY BANK",
        "^CNXIT": "NIFTY IT",
    }

    index_data = []
    for idx_symbol, idx_name in indices_map.items():
        q = await fetch_quote(idx_symbol)
        if q:
            index_data.append({
                "symbol": idx_symbol,
                "name": idx_name,
                "value": q.get("price", 0),
                "change": q.get("change", 0),
                "change_percent": q.get("change_percent", 0),
            })

    nifty_quotes = await get_multiple_quotes(NIFTY_50[:20])
    sorted_quotes = sorted(nifty_quotes, key=lambda x: x.get("change_percent", 0), reverse=True)

    return {
        "indices": index_data,
        "top_gainers": sorted_quotes[:5],
        "top_losers": sorted_quotes[-5:][::-1] if len(sorted_quotes) >= 5 else [],
        "timestamp": datetime.now().isoformat(),
    }


def search_stocks(query: str) -> List[dict]:
    """Search for stocks by symbol or name."""
    query = query.upper()
    results = []
    for symbol in ALL_SYMBOLS:
        if query in symbol:
            results.append({"symbol": symbol, "name": symbol})
    return results[:20]
