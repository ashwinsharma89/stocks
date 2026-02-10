"""Market Breadth analytics service.

Market breadth measures the overall health of the market by analyzing:
- Advance/Decline ratio
- A/D Line (cumulative)
- New Highs vs New Lows
- Percentage of stocks above moving averages
"""
from typing import List, Dict
from datetime import datetime
import logging

from app.services.yahoo_client import fetch_chart_data
from app.utils.nse_symbols import NIFTY_50, get_nse_suffix

logger = logging.getLogger(__name__)


async def calculate_market_breadth(symbols: List[str] = None, period: str = "3mo") -> dict:
    """Calculate comprehensive market breadth data."""
    if symbols is None:
        symbols = NIFTY_50

    stock_data = {}
    for symbol in symbols:
        try:
            chart = await fetch_chart_data(get_nse_suffix(symbol), period=period)
            ohlc = chart.get("ohlc", [])
            if ohlc and len(ohlc) > 1:
                stock_data[symbol] = ohlc
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}")

    if not stock_data:
        return {"index": "NIFTY", "data": [], "current_breadth": "Neutral"}

    all_dates = set()
    for ohlc in stock_data.values():
        for d in ohlc:
            all_dates.add(d["date"])
    all_dates = sorted(all_dates)

    ad_line_cumulative = 0
    breadth_data = []

    for date in all_dates[-60:]:
        advances = 0
        declines = 0
        unchanged = 0
        new_highs = 0
        new_lows = 0
        up_volume = 0
        down_volume = 0

        for symbol, ohlc in stock_data.items():
            date_map = {d["date"]: d for d in ohlc}
            current = date_map.get(date)
            if not current:
                continue

            prev = None
            for d in ohlc:
                if d["date"] < date:
                    prev = d
                else:
                    break

            if not prev:
                continue

            change = current["close"] - prev["close"]
            if change > 0:
                advances += 1
                up_volume += current["volume"]
            elif change < 0:
                declines += 1
                down_volume += current["volume"]
            else:
                unchanged += 1

            all_highs = [d["high"] for d in ohlc if d["date"] <= date]
            all_lows = [d["low"] for d in ohlc if d["date"] <= date]
            if all_highs and current["close"] >= max(all_highs):
                new_highs += 1
            if all_lows and current["close"] <= min(all_lows):
                new_lows += 1

        ad_ratio = advances / max(declines, 1)
        ad_line_cumulative += (advances - declines)

        breadth_data.append({
            "date": date,
            "advances": advances,
            "declines": declines,
            "unchanged": unchanged,
            "ad_ratio": round(ad_ratio, 2),
            "ad_line": ad_line_cumulative,
            "new_highs": new_highs,
            "new_lows": new_lows,
            "up_volume": round(up_volume / 1e6, 2),
            "down_volume": round(down_volume / 1e6, 2),
        })

    if breadth_data:
        latest = breadth_data[-1]
        if latest["ad_ratio"] > 1.5:
            current_breadth = "Bullish"
        elif latest["ad_ratio"] < 0.67:
            current_breadth = "Bearish"
        else:
            current_breadth = "Neutral"
    else:
        current_breadth = "Neutral"

    return {
        "index": "NIFTY",
        "data": breadth_data,
        "current_breadth": current_breadth,
        "summary": {
            "total_stocks": len(symbols),
            "latest_advances": breadth_data[-1]["advances"] if breadth_data else 0,
            "latest_declines": breadth_data[-1]["declines"] if breadth_data else 0,
            "ad_line": ad_line_cumulative,
        }
    }


async def get_stocks_above_ma(symbols: List[str] = None, ma_period: int = 200) -> dict:
    """Calculate percentage of stocks above their moving average."""
    if symbols is None:
        symbols = NIFTY_50

    above_ma = 0
    below_ma = 0
    stock_details = []

    for symbol in symbols:
        try:
            chart = await fetch_chart_data(get_nse_suffix(symbol), period="1y")
            ohlc = chart.get("ohlc", [])

            if not ohlc or len(ohlc) < ma_period:
                continue

            closes = [d["close"] for d in ohlc]
            current_price = closes[-1]
            ma_values = closes[-ma_period:]
            current_ma = sum(ma_values) / len(ma_values)

            is_above = current_price > current_ma
            if is_above:
                above_ma += 1
            else:
                below_ma += 1

            stock_details.append({
                "symbol": symbol,
                "price": round(current_price, 2),
                "ma": round(current_ma, 2),
                "above_ma": is_above,
                "distance_pct": round(((current_price - current_ma) / current_ma) * 100, 2),
            })
        except Exception as e:
            logger.error(f"Error calculating MA for {symbol}: {e}")

    total = above_ma + below_ma
    return {
        "ma_period": ma_period,
        "above_ma": above_ma,
        "below_ma": below_ma,
        "total": total,
        "percentage_above": round((above_ma / max(total, 1)) * 100, 2),
        "stocks": sorted(stock_details, key=lambda x: x["distance_pct"], reverse=True),
    }
