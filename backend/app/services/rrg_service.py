"""Relative Rotation Graph (RRG) calculation engine.

RRG plots securities on a scatter chart based on:
- RS-Ratio (x-axis): Relative strength ratio vs benchmark
- RS-Momentum (y-axis): Rate of change of RS-Ratio

Quadrants:
- Leading (top-right): Strong and improving
- Weakening (bottom-right): Strong but deteriorating
- Lagging (bottom-left): Weak and deteriorating
- Improving (top-left): Weak but improving
"""
import numpy as np
from typing import List, Dict
from datetime import datetime
import logging

from app.services.yahoo_client import fetch_chart_data
from app.utils.nse_symbols import get_nse_suffix, NIFTY_SECTORS, SECTOR_COLORS

logger = logging.getLogger(__name__)


def _compute_rs(stock_closes: List[float], bench_closes: List[float], window: int = 10):
    """Compute RS-Ratio and RS-Momentum from aligned close arrays."""
    if len(stock_closes) < window * 3 or len(bench_closes) < window * 3:
        return None, None

    stock = np.array(stock_closes, dtype=float)
    bench = np.array(bench_closes, dtype=float)

    rs = stock / bench
    rs_sma = np.convolve(rs, np.ones(window) / window, mode='valid')
    pad = len(rs) - len(rs_sma)
    rs_trimmed = rs[pad:]
    rs_ratio = (rs_trimmed / rs_sma) * 100

    if len(rs_ratio) < window * 2:
        return None, None

    rs_mom_raw = rs_ratio[window:] / rs_ratio[:-window]
    rs_mom_sma = np.convolve(rs_mom_raw, np.ones(window) / window, mode='valid')
    pad2 = len(rs_mom_raw) - len(rs_mom_sma)
    rs_mom_trimmed = rs_mom_raw[pad2:]
    rs_momentum = (rs_mom_trimmed / rs_mom_sma) * 100

    min_len = min(len(rs_ratio), len(rs_momentum))
    rs_ratio = rs_ratio[-min_len:]
    rs_momentum = rs_momentum[-min_len:]

    return rs_ratio.tolist(), rs_momentum.tolist()


def get_quadrant(rs_ratio: float, rs_momentum: float) -> str:
    if rs_ratio >= 100 and rs_momentum >= 100:
        return "Leading"
    elif rs_ratio >= 100 and rs_momentum < 100:
        return "Weakening"
    elif rs_ratio < 100 and rs_momentum < 100:
        return "Lagging"
    else:
        return "Improving"


async def calculate_rrg(
    symbols: List[str],
    benchmark_symbol: str = "^NSEI",
    period: str = "1y",
    tail_length: int = 8,
) -> dict:
    """Calculate RRG data for a list of symbols against a benchmark."""
    try:
        bench_data = await fetch_chart_data(benchmark_symbol, period=period)
        bench_ohlc = bench_data.get("ohlc", [])
        if not bench_ohlc or len(bench_ohlc) < 30:
            return {"benchmark": benchmark_symbol, "data": [], "timestamp": datetime.now().isoformat()}

        bench_dates = {d["date"]: d["close"] for d in bench_ohlc}
        results = []

        for symbol in symbols:
            try:
                nse_sym = get_nse_suffix(symbol) if not symbol.startswith("^") else symbol
                stock_data = await fetch_chart_data(nse_sym, period=period)
                stock_ohlc = stock_data.get("ohlc", [])

                if not stock_ohlc or len(stock_ohlc) < 30:
                    continue

                common_dates = sorted(set(d["date"] for d in stock_ohlc) & set(bench_dates.keys()))
                if len(common_dates) < 30:
                    continue

                stock_map = {d["date"]: d["close"] for d in stock_ohlc}
                stock_closes = [stock_map[d] for d in common_dates]
                bench_closes = [bench_dates[d] for d in common_dates]

                rs_ratio, rs_momentum = _compute_rs(stock_closes, bench_closes)
                if rs_ratio is None or len(rs_ratio) == 0:
                    continue

                current_ratio = round(rs_ratio[-1], 2)
                current_momentum = round(rs_momentum[-1], 2)

                tail = []
                for i in range(max(0, len(rs_ratio) - tail_length), len(rs_ratio)):
                    tail.append({
                        "rs_ratio": round(rs_ratio[i], 2),
                        "rs_momentum": round(rs_momentum[i], 2),
                        "period": i - len(rs_ratio) + 1,
                    })

                results.append({
                    "symbol": symbol,
                    "name": symbol,
                    "rs_ratio": current_ratio,
                    "rs_momentum": current_momentum,
                    "quadrant": get_quadrant(current_ratio, current_momentum),
                    "tail": tail,
                })
            except Exception as e:
                logger.error(f"Error calculating RRG for {symbol}: {e}")

        return {
            "benchmark": benchmark_symbol,
            "data": results,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error in RRG calculation: {e}")
        return {"benchmark": benchmark_symbol, "data": [], "timestamp": datetime.now().isoformat()}


async def get_sector_rrg(period: str = "6mo", tail_length: int = 8) -> dict:
    """Calculate RRG for all NIFTY sectors using primary stock as proxy."""
    sector_proxies = {}
    for sector, stocks in NIFTY_SECTORS.items():
        sector_proxies[stocks[0]] = sector

    result = await calculate_rrg(
        symbols=list(sector_proxies.keys()),
        benchmark_symbol="^NSEI",
        period=period,
        tail_length=tail_length,
    )

    for item in result["data"]:
        if item["symbol"] in sector_proxies:
            sector_name = sector_proxies[item["symbol"]]
            item["name"] = sector_name
            item["color"] = SECTOR_COLORS.get(sector_name, "#6B7280")

    return result


async def get_stock_rrg(symbols: List[str], benchmark: str = "^NSEI",
                        period: str = "6mo", tail_length: int = 8) -> dict:
    """Calculate RRG for specific stocks."""
    return await calculate_rrg(symbols, benchmark, period, tail_length)
