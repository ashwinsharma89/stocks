"""Sector/Industry analytics service."""
import numpy as np
from typing import List, Dict
from datetime import datetime
import logging

from app.services.yahoo_client import fetch_chart_data
from app.utils.nse_symbols import NIFTY_SECTORS, SECTOR_COLORS, get_nse_suffix

logger = logging.getLogger(__name__)


async def get_sector_performance() -> List[dict]:
    """Calculate sector performance across different timeframes."""
    results = []

    for sector_name, symbols in NIFTY_SECTORS.items():
        try:
            sector_changes = {"1d": [], "1w": [], "1m": [], "3m": [], "6m": [], "1y": []}
            top_stocks = []

            for symbol in symbols[:5]:
                try:
                    chart = await fetch_chart_data(get_nse_suffix(symbol), period="1y")
                    ohlc = chart.get("ohlc", [])
                    if not ohlc or len(ohlc) < 2:
                        continue

                    current = ohlc[-1]["close"]
                    periods = {"1d": 1, "1w": 5, "1m": 22, "3m": 66, "6m": 132, "1y": 252}
                    for period_name, days in periods.items():
                        if len(ohlc) > days:
                            prev = ohlc[-(days + 1)]["close"]
                            change = ((current - prev) / prev) * 100
                            sector_changes[period_name].append(change)

                    prev_close = ohlc[-2]["close"]
                    day_change = ((current - prev_close) / prev_close) * 100
                    top_stocks.append({
                        "symbol": symbol,
                        "price": round(current, 2),
                        "change_percent": round(day_change, 2),
                    })
                except Exception as e:
                    logger.error(f"Error processing {symbol}: {e}")

            result = {
                "sector": sector_name,
                "color": SECTOR_COLORS.get(sector_name, "#6B7280"),
                "change_1d": round(float(np.mean(sector_changes["1d"])) if sector_changes["1d"] else 0, 2),
                "change_1w": round(float(np.mean(sector_changes["1w"])) if sector_changes["1w"] else 0, 2),
                "change_1m": round(float(np.mean(sector_changes["1m"])) if sector_changes["1m"] else 0, 2),
                "change_3m": round(float(np.mean(sector_changes["3m"])) if sector_changes["3m"] else 0, 2),
                "change_6m": round(float(np.mean(sector_changes["6m"])) if sector_changes["6m"] else 0, 2),
                "change_1y": round(float(np.mean(sector_changes["1y"])) if sector_changes["1y"] else 0, 2),
                "top_stocks": sorted(top_stocks, key=lambda x: x["change_percent"], reverse=True),
                "stock_count": len(symbols),
            }
            results.append(result)
        except Exception as e:
            logger.error(f"Error calculating sector {sector_name}: {e}")

    return sorted(results, key=lambda x: x["change_1d"], reverse=True)


async def get_sector_heatmap() -> List[dict]:
    """Generate heatmap data for all sectors and their stocks."""
    heatmap_data = []

    for sector_name, symbols in NIFTY_SECTORS.items():
        for symbol in symbols[:8]:
            try:
                chart = await fetch_chart_data(get_nse_suffix(symbol), period="5d")
                ohlc = chart.get("ohlc", [])
                meta = chart.get("meta", {})
                if not ohlc or len(ohlc) < 2:
                    continue

                current = ohlc[-1]["close"]
                prev = ohlc[-2]["close"]
                change_pct = ((current - prev) / prev) * 100

                heatmap_data.append({
                    "symbol": symbol,
                    "name": meta.get("name", symbol),
                    "sector": sector_name,
                    "change_percent": round(change_pct, 2),
                    "market_cap": 0,
                    "price": round(current, 2),
                    "volume": ohlc[-1]["volume"],
                })
            except Exception as e:
                logger.error(f"Error in heatmap for {symbol}: {e}")

    return heatmap_data


async def get_sector_rotation_history(period: str = "6mo") -> dict:
    """Get sector rotation over time."""
    bench_chart = await fetch_chart_data("^NSEI", period=period)
    bench_ohlc = bench_chart.get("ohlc", [])
    if not bench_ohlc:
        return {"sectors": {}, "timestamp": datetime.now().isoformat()}

    bench_dates = {d["date"]: d["close"] for d in bench_ohlc}
    rotation_data = {}

    for sector_name, symbols in NIFTY_SECTORS.items():
        try:
            primary = symbols[0]
            chart = await fetch_chart_data(get_nse_suffix(primary), period=period)
            ohlc = chart.get("ohlc", [])
            if not ohlc or len(ohlc) < 20:
                continue

            stock_dates = {d["date"]: d["close"] for d in ohlc}
            common = sorted(set(stock_dates.keys()) & set(bench_dates.keys()))
            if len(common) < 20:
                continue

            stock_closes = [stock_dates[d] for d in common]
            bench_closes = [bench_dates[d] for d in common]

            window = 20
            rel_perf = []
            for i in range(window, len(common)):
                s_ret = (stock_closes[i] - stock_closes[i - window]) / stock_closes[i - window]
                b_ret = (bench_closes[i] - bench_closes[i - window]) / bench_closes[i - window]
                rel_perf.append({
                    "date": common[i],
                    "relative_performance": round((s_ret - b_ret) * 100, 4),
                })
            rotation_data[sector_name] = rel_perf
        except Exception as e:
            logger.error(f"Error in rotation for {sector_name}: {e}")

    return {"sectors": rotation_data, "timestamp": datetime.now().isoformat()}
