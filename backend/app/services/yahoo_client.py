"""Yahoo Finance data client using httpx (no yfinance dependency).

This module fetches stock data directly from Yahoo Finance's API endpoints
to avoid the yfinance/multitasking build dependency issues.
"""
import httpx
import pandas as pd
import numpy as np
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import json
import time

logger = logging.getLogger(__name__)

BASE_URL = "https://query1.finance.yahoo.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

# In-memory cache
_cache: Dict[str, dict] = {}
_cache_time: Dict[str, float] = {}
CACHE_TTL = 900  # 15 minutes


def _is_cached(key: str) -> bool:
    return key in _cache and (time.time() - _cache_time.get(key, 0)) < CACHE_TTL


def _set_cache(key: str, value):
    _cache[key] = value
    _cache_time[key] = time.time()


def _period_to_seconds(period: str) -> int:
    """Convert period string to seconds for range calculation."""
    mapping = {
        "1d": 86400, "5d": 5 * 86400, "1mo": 30 * 86400,
        "3mo": 90 * 86400, "6mo": 180 * 86400,
        "1y": 365 * 86400, "2y": 730 * 86400, "5y": 1825 * 86400,
    }
    return mapping.get(period, 365 * 86400)


def _interval_to_yahoo(interval: str) -> str:
    """Map interval to Yahoo Finance API interval."""
    mapping = {
        "1m": "1m", "5m": "5m", "15m": "15m",
        "1h": "1h", "1d": "1d", "1wk": "1wk", "1mo": "1mo",
    }
    return mapping.get(interval, "1d")


async def fetch_chart_data(symbol: str, period: str = "1y", interval: str = "1d") -> Dict:
    """Fetch OHLCV chart data from Yahoo Finance v8 API."""
    cache_key = f"chart_{symbol}_{period}_{interval}"
    if _is_cached(cache_key):
        return _cache[cache_key]

    try:
        range_val = period
        url = f"{BASE_URL}/v8/finance/chart/{symbol}"
        params = {
            "range": range_val,
            "interval": _interval_to_yahoo(interval),
            "includePrePost": "false",
        }

        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                logger.error(f"Yahoo API error {resp.status_code} for {symbol}")
                return {}

            data = resp.json()

        result_data = data.get("chart", {}).get("result", [])
        if not result_data:
            return {}

        result = result_data[0]
        timestamps = result.get("timestamp", [])
        indicators = result.get("indicators", {})
        quotes = indicators.get("quote", [{}])[0]
        meta = result.get("meta", {})

        ohlc = []
        for i, ts in enumerate(timestamps):
            o = quotes.get("open", [None])[i]
            h = quotes.get("high", [None])[i]
            l = quotes.get("low", [None])[i]
            c = quotes.get("close", [None])[i]
            v = quotes.get("volume", [0])[i]

            if o is None or h is None or l is None or c is None:
                continue

            dt = datetime.fromtimestamp(ts)
            ohlc.append({
                "date": dt.strftime("%Y-%m-%d"),
                "open": round(float(o), 2),
                "high": round(float(h), 2),
                "low": round(float(l), 2),
                "close": round(float(c), 2),
                "volume": int(v or 0),
            })

        chart_result = {
            "symbol": symbol,
            "meta": {
                "currency": meta.get("currency", "INR"),
                "exchange": meta.get("exchangeName", ""),
                "name": meta.get("longName", meta.get("shortName", symbol)),
                "regularMarketPrice": meta.get("regularMarketPrice"),
                "previousClose": meta.get("previousClose") or meta.get("chartPreviousClose"),
            },
            "ohlc": ohlc,
        }

        _set_cache(cache_key, chart_result)
        return chart_result

    except Exception as e:
        logger.error(f"Error fetching chart for {symbol}: {e}")
        return {}


async def fetch_quote(symbol: str) -> Dict:
    """Fetch current quote data."""
    cache_key = f"quote_{symbol}"
    if _is_cached(cache_key):
        return _cache[cache_key]

    try:
        url = f"{BASE_URL}/v8/finance/chart/{symbol}"
        params = {"range": "2d", "interval": "1d"}

        async with httpx.AsyncClient(timeout=15, headers=HEADERS) as client:
            resp = await client.get(url, params=params)
            if resp.status_code != 200:
                return {}
            data = resp.json()

        result_data = data.get("chart", {}).get("result", [])
        if not result_data:
            return {}

        result = result_data[0]
        meta = result.get("meta", {})
        quotes = result.get("indicators", {}).get("quote", [{}])[0]
        timestamps = result.get("timestamp", [])

        close_list = [c for c in (quotes.get("close") or []) if c is not None]
        volume_list = [v for v in (quotes.get("volume") or []) if v is not None]

        if not close_list:
            return {}

        current_price = close_list[-1]
        prev_close = close_list[-2] if len(close_list) > 1 else meta.get("chartPreviousClose", current_price)
        change = current_price - (prev_close or current_price)
        change_pct = (change / prev_close * 100) if prev_close else 0

        quote_result = {
            "symbol": symbol.replace(".NS", "").replace(".BO", ""),
            "name": meta.get("longName", meta.get("shortName", symbol)),
            "price": round(float(current_price), 2),
            "change": round(float(change), 2),
            "change_percent": round(float(change_pct), 2),
            "volume": int(volume_list[-1]) if volume_list else 0,
            "market_cap": None,
            "prev_close": round(float(prev_close or 0), 2),
            "open": round(float((quotes.get("open") or [0])[-1] or 0), 2),
            "high": round(float((quotes.get("high") or [0])[-1] or 0), 2),
            "low": round(float((quotes.get("low") or [0])[-1] or 0), 2),
        }

        _set_cache(cache_key, quote_result)
        return quote_result

    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        return {}


async def fetch_quotes_batch(symbols: List[str]) -> List[Dict]:
    """Fetch quotes for multiple symbols."""
    results = []
    for sym in symbols:
        q = await fetch_quote(sym)
        if q:
            results.append(q)
    return results


async def fetch_stock_info(symbol: str) -> Dict:
    """Fetch detailed stock info using quoteSummary."""
    cache_key = f"info_{symbol}"
    if _is_cached(cache_key):
        return _cache[cache_key]

    try:
        # Use v8 chart endpoint for basic info + history
        chart_data = await fetch_chart_data(symbol, period="1y")
        if not chart_data:
            return {}

        meta = chart_data.get("meta", {})
        ohlc = chart_data.get("ohlc", [])

        # Compute 52-week stats from historical data
        if ohlc:
            highs = [d["high"] for d in ohlc]
            lows = [d["low"] for d in ohlc]
            volumes = [d["volume"] for d in ohlc]
            week_52_high = max(highs) if highs else None
            week_52_low = min(lows) if lows else None
            avg_volume = int(sum(volumes) / len(volumes)) if volumes else None
        else:
            week_52_high = week_52_low = avg_volume = None

        clean_symbol = symbol.replace(".NS", "").replace(".BO", "")

        info = {
            "symbol": clean_symbol,
            "name": meta.get("name", clean_symbol),
            "sector": None,
            "industry": None,
            "market_cap": None,
            "pe_ratio": None,
            "pb_ratio": None,
            "dividend_yield": None,
            "eps": None,
            "book_value": None,
            "week_52_high": round(week_52_high, 2) if week_52_high else None,
            "week_52_low": round(week_52_low, 2) if week_52_low else None,
            "avg_volume": avg_volume,
            "description": "",
            "ohlc": ohlc,
        }

        _set_cache(cache_key, info)
        return info

    except Exception as e:
        logger.error(f"Error fetching info for {symbol}: {e}")
        return {}
