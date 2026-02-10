"""Market Breadth API routes."""
from fastapi import APIRouter, Query
from app.services.breadth_service import calculate_market_breadth, get_stocks_above_ma

router = APIRouter(prefix="/api/breadth", tags=["breadth"])


@router.get("/")
async def market_breadth(period: str = Query("3mo")):
    return await calculate_market_breadth(period=period)


@router.get("/above-ma")
async def stocks_above_ma(ma_period: int = Query(200)):
    return await get_stocks_above_ma(ma_period=ma_period)
