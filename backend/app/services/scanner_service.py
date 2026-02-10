"""Scanner engine for identifying trading setups."""
import numpy as np
from typing import List, Dict
from datetime import datetime
import logging

from app.services.yahoo_client import fetch_chart_data
from app.utils.nse_symbols import get_nse_suffix, NIFTY_50, NIFTY_SECTORS, ALL_SYMBOLS

logger = logging.getLogger(__name__)


async def gap_scanner(symbols: List[str] = None, min_gap_pct: float = 2.0) -> List[dict]:
    """Find stocks with significant gaps."""
    if symbols is None:
        symbols = NIFTY_50
    results = []
    for symbol in symbols:
        try:
            chart = await fetch_chart_data(get_nse_suffix(symbol), period="1mo")
            ohlc = chart.get("ohlc", [])
            if not ohlc or len(ohlc) < 2:
                continue
            for i in range(-1, max(-6, -len(ohlc)), -1):
                if abs(i - 1) >= len(ohlc):
                    continue
                current_open = ohlc[i]["open"]
                prev_close = ohlc[i - 1]["close"]
                gap_pct = ((current_open - prev_close) / prev_close) * 100
                if abs(gap_pct) >= min_gap_pct:
                    gap_filled = False
                    if gap_pct > 0:
                        gap_filled = any(d["low"] <= prev_close for d in ohlc[i:])
                    else:
                        gap_filled = any(d["high"] >= prev_close for d in ohlc[i:])
                    results.append({
                        "symbol": symbol, "name": symbol,
                        "price": round(ohlc[-1]["close"], 2),
                        "change_percent": round(gap_pct, 2),
                        "volume": ohlc[-1]["volume"],
                        "signal": "Gap Up" if gap_pct > 0 else "Gap Down",
                        "details": {
                            "gap_date": ohlc[i]["date"],
                            "gap_percent": round(gap_pct, 2),
                            "gap_filled": gap_filled,
                            "prev_close": round(prev_close, 2),
                            "open_price": round(current_open, 2),
                        }
                    })
                    break
        except Exception as e:
            logger.error(f"Gap scanner error for {symbol}: {e}")
    return sorted(results, key=lambda x: abs(x["change_percent"]), reverse=True)


async def volume_scanner(symbols: List[str] = None, volume_multiplier: float = 2.0) -> List[dict]:
    """Find stocks with unusual volume."""
    if symbols is None:
        symbols = NIFTY_50
    results = []
    for symbol in symbols:
        try:
            chart = await fetch_chart_data(get_nse_suffix(symbol), period="3mo")
            ohlc = chart.get("ohlc", [])
            if not ohlc or len(ohlc) < 20:
                continue
            volumes = [d["volume"] for d in ohlc[-21:-1]]
            avg_volume = sum(volumes) / len(volumes) if volumes else 1
            current_volume = ohlc[-1]["volume"]
            volume_ratio = current_volume / max(avg_volume, 1)
            if volume_ratio >= volume_multiplier:
                current_price = ohlc[-1]["close"]
                prev_close = ohlc[-2]["close"]
                change_pct = ((current_price - prev_close) / prev_close) * 100
                results.append({
                    "symbol": symbol, "name": symbol,
                    "price": round(current_price, 2),
                    "change_percent": round(change_pct, 2),
                    "volume": current_volume,
                    "signal": "High Volume",
                    "details": {
                        "avg_volume": int(avg_volume),
                        "volume_ratio": round(volume_ratio, 2),
                        "volume_change": f"{round((volume_ratio - 1) * 100)}%",
                    }
                })
        except Exception as e:
            logger.error(f"Volume scanner error for {symbol}: {e}")
    return sorted(results, key=lambda x: x["details"]["volume_ratio"], reverse=True)


async def breakout_scanner(symbols: List[str] = None, lookback: int = 20) -> List[dict]:
    """Find stocks breaking out of consolidation or key levels."""
    if symbols is None:
        symbols = NIFTY_50
    results = []
    for symbol in symbols:
        try:
            chart = await fetch_chart_data(get_nse_suffix(symbol), period="6mo")
            ohlc = chart.get("ohlc", [])
            if not ohlc or len(ohlc) < lookback + 5:
                continue
            current_price = ohlc[-1]["close"]
            current_volume = ohlc[-1]["volume"]
            volumes = [d["volume"] for d in ohlc[-21:-1]]
            avg_volume = sum(volumes) / len(volumes) if volumes else 1
            lookback_data = ohlc[-(lookback + 1):-1]
            high_20 = max(d["high"] for d in lookback_data)
            low_20 = min(d["low"] for d in lookback_data)
            high_52w = max(d["high"] for d in ohlc)
            low_52w = min(d["low"] for d in ohlc)
            prev_close = ohlc[-2]["close"]
            change_pct = ((current_price - prev_close) / prev_close) * 100
            signal = None
            details = {}
            if current_price > high_20 and current_volume > avg_volume * 1.5:
                signal = "Resistance Breakout"
                details = {"breakout_level": round(high_20, 2), "distance_from_52w_high": round(((high_52w - current_price) / high_52w) * 100, 2)}
            elif current_price < low_20 and current_volume > avg_volume * 1.5:
                signal = "Support Breakdown"
                details = {"breakdown_level": round(low_20, 2), "distance_from_52w_low": round(((current_price - low_52w) / max(low_52w, 0.01)) * 100, 2)}
            elif current_price >= high_52w * 0.98:
                signal = "Near 52W High"
                details = {"week_52_high": round(high_52w, 2), "distance_pct": round(((high_52w - current_price) / high_52w) * 100, 2)}
            if signal:
                results.append({
                    "symbol": symbol, "name": symbol,
                    "price": round(current_price, 2), "change_percent": round(change_pct, 2),
                    "volume": current_volume, "signal": signal, "details": details,
                })
        except Exception as e:
            logger.error(f"Breakout scanner error for {symbol}: {e}")
    return results


async def pattern_scanner(symbols: List[str] = None) -> List[dict]:
    """Identify basic chart patterns."""
    if symbols is None:
        symbols = NIFTY_50
    results = []
    for symbol in symbols:
        try:
            chart = await fetch_chart_data(get_nse_suffix(symbol), period="3mo")
            ohlc = chart.get("ohlc", [])
            if not ohlc or len(ohlc) < 30:
                continue
            closes = [d["close"] for d in ohlc]
            current_price = closes[-1]
            prev_close = closes[-2]
            change_pct = ((current_price - prev_close) / prev_close) * 100
            signal = None
            details = {}
            today = ohlc[-1]
            yesterday = ohlc[-2]
            if (yesterday["close"] < yesterday["open"] and today["close"] > today["open"] and
                today["open"] <= yesterday["close"] and today["close"] >= yesterday["open"]):
                signal = "Bullish Engulfing"
                details = {"pattern_type": "reversal", "bias": "bullish"}
            elif (yesterday["close"] > yesterday["open"] and today["close"] < today["open"] and
                  today["open"] >= yesterday["close"] and today["close"] <= yesterday["open"]):
                signal = "Bearish Engulfing"
                details = {"pattern_type": "reversal", "bias": "bearish"}
            if signal is None:
                body = abs(today["close"] - today["open"])
                wick = today["high"] - today["low"]
                if wick > 0 and body / wick < 0.1:
                    signal = "Doji"
                    details = {"pattern_type": "indecision", "bias": "neutral"}
            if signal is None and len(closes) >= 50:
                sma_20 = sum(closes[-20:]) / 20
                sma_50 = sum(closes[-50:]) / 50
                prev_sma_20 = sum(closes[-21:-1]) / 20
                prev_sma_50 = sum(closes[-51:-1]) / 50
                if sma_20 > sma_50 and prev_sma_20 <= prev_sma_50:
                    signal = "Golden Cross (20/50)"
                    details = {"pattern_type": "trend", "bias": "bullish"}
                elif sma_20 < sma_50 and prev_sma_20 >= prev_sma_50:
                    signal = "Death Cross (20/50)"
                    details = {"pattern_type": "trend", "bias": "bearish"}
            if signal is None and len(closes) >= 15:
                deltas = [closes[i] - closes[i - 1] for i in range(len(closes) - 14, len(closes))]
                gains = [d if d > 0 else 0 for d in deltas]
                losses = [-d if d < 0 else 0 for d in deltas]
                avg_gain = sum(gains) / 14
                avg_loss = sum(losses) / 14
                if avg_loss > 0:
                    rs = avg_gain / avg_loss
                    rsi = 100 - (100 / (1 + rs))
                    if rsi < 30:
                        signal = "RSI Oversold"
                        details = {"rsi": round(rsi, 2), "bias": "bullish"}
                    elif rsi > 70:
                        signal = "RSI Overbought"
                        details = {"rsi": round(rsi, 2), "bias": "bearish"}
            if signal:
                results.append({
                    "symbol": symbol, "name": symbol,
                    "price": round(current_price, 2), "change_percent": round(change_pct, 2),
                    "volume": ohlc[-1]["volume"], "signal": signal, "details": details,
                })
        except Exception as e:
            logger.error(f"Pattern scanner error for {symbol}: {e}")
    return results


async def run_scanner(scan_type: str, parameters: dict = None, universe: str = "NIFTY50") -> List[dict]:
    """Run a specific scanner type."""
    if parameters is None:
        parameters = {}
    if universe == "NIFTY50":
        symbols = NIFTY_50
    elif universe in NIFTY_SECTORS:
        symbols = NIFTY_SECTORS[universe]
    else:
        symbols = ALL_SYMBOLS[:100]
    scanners = {
        "gap": lambda: gap_scanner(symbols, parameters.get("min_gap_pct", 2.0)),
        "volume": lambda: volume_scanner(symbols, parameters.get("volume_multiplier", 2.0)),
        "breakout": lambda: breakout_scanner(symbols, parameters.get("lookback", 20)),
        "pattern": lambda: pattern_scanner(symbols),
    }
    scanner_func = scanners.get(scan_type)
    if scanner_func is None:
        return []
    return await scanner_func()
