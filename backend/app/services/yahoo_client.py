"""Yahoo Finance data client using yfinance library.

Replaces the broken direct HTTP v8 API calls with the yfinance library,
which handles crumb/cookie authentication automatically.
"""
import yfinance as yf
import pandas as pd
import numpy as np
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging
import time

logger = logging.getLogger(__name__)

# In-memory cache
_cache: Dict[str, dict] = {}
_cache_time: Dict[str, float] = {}
CACHE_TTL = 900  # 15 minutes


def _is_cached(key: str) -> bool:
    return key in _cache and (time.time() - _cache_time.get(key, 0)) < CACHE_TTL


def _set_cache(key: str, value):
    _cache[key] = value
    _cache_time[key] = time.time()


def _fetch_chart_sync(symbol: str, period: str, interval: str) -> Dict:
    """Synchronous yfinance chart fetch (runs in thread)."""
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval, timeout=15)

    if df.empty:
        logger.warning(f"No chart data returned for {symbol} (period={period}, interval={interval})")
        return {}

    ohlc = []
    for idx, row in df.iterrows():
        date_str = idx.strftime("%Y-%m-%d") if interval in ("1d", "1wk", "1mo") else idx.strftime("%Y-%m-%d %H:%M")
        o = row.get("Open")
        h = row.get("High")
        l = row.get("Low")
        c = row.get("Close")
        v = row.get("Volume", 0)

        if pd.isna(o) or pd.isna(h) or pd.isna(l) or pd.isna(c):
            continue

        ohlc.append({
            "date": date_str,
            "open": round(float(o), 2),
            "high": round(float(h), 2),
            "low": round(float(l), 2),
            "close": round(float(c), 2),
            "volume": int(v or 0),
        })

    if not ohlc:
        logger.warning(f"All OHLC rows were NaN for {symbol}")
        return {}

    if all(d["close"] == 0 for d in ohlc):
        logger.error(f"Data validation failed for {symbol}: all close prices are zero")
        return {}

    # Get metadata
    clean_symbol = symbol.replace(".NS", "").replace(".BO", "")
    meta = {
        "currency": "INR",
        "exchange": "NSE",
        "name": clean_symbol,
        "regularMarketPrice": ohlc[-1]["close"],
        "previousClose": ohlc[-2]["close"] if len(ohlc) > 1 else ohlc[-1]["close"],
    }

    try:
        fi = ticker.fast_info
        meta["regularMarketPrice"] = getattr(fi, "last_price", None) or ohlc[-1]["close"]
        meta["previousClose"] = getattr(fi, "previous_close", None) or meta["previousClose"]
        meta["currency"] = getattr(fi, "currency", "INR") or "INR"
        meta["exchange"] = getattr(fi, "exchange", "NSE") or "NSE"
    except Exception:
        pass

    try:
        info = ticker.info
        meta["name"] = info.get("longName") or info.get("shortName") or clean_symbol
    except Exception:
        pass

    return {
        "symbol": symbol,
        "meta": meta,
        "ohlc": ohlc,
    }


async def fetch_chart_data(symbol: str, period: str = "1y", interval: str = "1d") -> Dict:
    """Fetch OHLCV chart data using yfinance."""
    cache_key = f"chart_{symbol}_{period}_{interval}"
    if _is_cached(cache_key):
        return _cache[cache_key]

    try:
        result = await asyncio.to_thread(_fetch_chart_sync, symbol, period, interval)
        if result:
            _set_cache(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Error fetching chart for {symbol}: {e}")
        return {}


def _fetch_quote_sync(symbol: str) -> Dict:
    """Synchronous yfinance quote fetch."""
    ticker = yf.Ticker(symbol)

    # Get recent history for price data
    df = ticker.history(period="5d", interval="1d", timeout=15)
    if df.empty:
        logger.warning(f"No quote data for {symbol}")
        return {}

    last_row = df.iloc[-1]
    price = round(float(last_row["Close"]), 2)
    open_price = round(float(last_row["Open"]), 2)
    high_price = round(float(last_row["High"]), 2)
    low_price = round(float(last_row["Low"]), 2)
    volume = int(last_row["Volume"])

    if len(df) > 1:
        prev_close = round(float(df.iloc[-2]["Close"]), 2)
    else:
        prev_close = price

    if price == 0:
        logger.warning(f"Zero price for {symbol}")
        return {}

    change = round(price - prev_close, 2)
    change_pct = round((change / prev_close * 100), 2) if prev_close else 0

    clean_symbol = symbol.replace(".NS", "").replace(".BO", "")
    name = clean_symbol

    # Try to get market cap from fast_info
    market_cap = None
    try:
        fi = ticker.fast_info
        market_cap = getattr(fi, "market_cap", None)
        if market_cap:
            market_cap = int(market_cap)
    except Exception:
        pass

    # Try to get name from info
    try:
        info = ticker.info
        name = info.get("longName") or info.get("shortName") or clean_symbol
    except Exception:
        pass

    return {
        "symbol": clean_symbol,
        "name": name,
        "price": price,
        "change": change,
        "change_percent": change_pct,
        "volume": volume,
        "market_cap": market_cap,
        "prev_close": prev_close,
        "open": open_price,
        "high": high_price,
        "low": low_price,
    }


async def fetch_quote(symbol: str) -> Dict:
    """Fetch current quote data using yfinance."""
    cache_key = f"quote_{symbol}"
    if _is_cached(cache_key):
        return _cache[cache_key]

    try:
        result = await asyncio.to_thread(_fetch_quote_sync, symbol)
        if result:
            _set_cache(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        return {}


async def fetch_quotes_batch(symbols: List[str]) -> List[Dict]:
    """Fetch quotes for multiple symbols concurrently."""
    tasks = [fetch_quote(sym) for sym in symbols]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    quotes = []
    for r in results:
        if isinstance(r, dict) and r:
            quotes.append(r)
        elif isinstance(r, Exception):
            logger.error(f"Batch quote error: {r}")
    return quotes


def _fetch_info_sync(symbol: str) -> Dict:
    """Synchronous yfinance info fetch."""
    ticker = yf.Ticker(symbol)

    df = ticker.history(period="1y", interval="1d", timeout=15)
    if df.empty:
        logger.warning(f"No history data for stock info: {symbol}")
        return {}

    ohlc = []
    for idx, row in df.iterrows():
        o = row.get("Open")
        h = row.get("High")
        l = row.get("Low")
        c = row.get("Close")
        v = row.get("Volume", 0)
        if pd.isna(o) or pd.isna(h) or pd.isna(l) or pd.isna(c):
            continue
        ohlc.append({
            "date": idx.strftime("%Y-%m-%d"),
            "open": round(float(o), 2),
            "high": round(float(h), 2),
            "low": round(float(l), 2),
            "close": round(float(c), 2),
            "volume": int(v or 0),
        })

    if not ohlc:
        return {}

    highs = [d["high"] for d in ohlc]
    lows = [d["low"] for d in ohlc]
    volumes = [d["volume"] for d in ohlc]
    week_52_high = max(highs) if highs else None
    week_52_low = min(lows) if lows else None
    avg_volume = int(sum(volumes) / len(volumes)) if volumes else None

    clean_symbol = symbol.replace(".NS", "").replace(".BO", "")

    info_dict = {}
    try:
        info_dict = ticker.info or {}
    except Exception as e:
        logger.warning(f"Could not fetch info for {symbol}: {e}")

    return {
        "symbol": clean_symbol,
        "name": info_dict.get("longName") or info_dict.get("shortName") or clean_symbol,
        "sector": info_dict.get("sector"),
        "industry": info_dict.get("industry"),
        "market_cap": info_dict.get("marketCap"),
        "pe_ratio": info_dict.get("trailingPE"),
        "pb_ratio": info_dict.get("priceToBook"),
        "dividend_yield": info_dict.get("dividendYield"),
        "eps": info_dict.get("trailingEps"),
        "book_value": info_dict.get("bookValue"),
        "week_52_high": round(week_52_high, 2) if week_52_high else None,
        "week_52_low": round(week_52_low, 2) if week_52_low else None,
        "avg_volume": avg_volume,
        "description": info_dict.get("longBusinessSummary", ""),
        "ohlc": ohlc,
    }


async def fetch_stock_info(symbol: str) -> Dict:
    """Fetch detailed stock info using yfinance."""
    cache_key = f"info_{symbol}"
    if _is_cached(cache_key):
        return _cache[cache_key]

    try:
        result = await asyncio.to_thread(_fetch_info_sync, symbol)
        if result:
            _set_cache(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Error fetching info for {symbol}: {e}")
        return {}
