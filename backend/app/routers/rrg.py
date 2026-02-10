"""RRG (Relative Rotation Graph) API routes."""
from fastapi import APIRouter, Query
from app.services.rrg_service import get_sector_rrg, get_stock_rrg

router = APIRouter(prefix="/api/rrg", tags=["rrg"])


@router.get("/sectors")
async def sector_rrg(
    period: str = Query("6mo"),
    tail_length: int = Query(8),
):
    return await get_sector_rrg(period, tail_length)


@router.get("/stocks")
async def stock_rrg(
    symbols: str = Query(...),
    benchmark: str = Query("^NSEI"),
    period: str = Query("6mo"),
    tail_length: int = Query(8),
):
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    return await get_stock_rrg(symbol_list, benchmark, period, tail_length)
