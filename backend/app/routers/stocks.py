"""Stock data API routes."""
from fastapi import APIRouter, Query
from app.services.stock_service import (
    get_stock_quote, get_stock_history, get_stock_detail,
    get_multiple_quotes, get_market_overview, search_stocks
)

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/quote/{symbol}")
async def stock_quote(symbol: str):
    return await get_stock_quote(symbol.upper())


@router.get("/history/{symbol}")
async def stock_history(
    symbol: str,
    period: str = Query("1y"),
    interval: str = Query("1d"),
):
    return await get_stock_history(symbol.upper(), period, interval)


@router.get("/detail/{symbol}")
async def stock_detail(symbol: str):
    return await get_stock_detail(symbol.upper())


@router.get("/quotes")
async def multiple_quotes(symbols: str = Query(...)):
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    return await get_multiple_quotes(symbol_list)


@router.get("/market-overview")
async def market_overview():
    return await get_market_overview()


@router.get("/search")
def search(q: str = Query(...)):
    return search_stocks(q)
