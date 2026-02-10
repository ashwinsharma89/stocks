"""Scanner API routes."""
from fastapi import APIRouter, Query
from app.services.scanner_service import run_scanner, gap_scanner, volume_scanner, breakout_scanner, pattern_scanner

router = APIRouter(prefix="/api/scanners", tags=["scanners"])


@router.get("/gap")
async def scan_gaps(min_gap_pct: float = Query(2.0)):
    return await gap_scanner(min_gap_pct=min_gap_pct)


@router.get("/volume")
async def scan_volume(multiplier: float = Query(2.0)):
    return await volume_scanner(volume_multiplier=multiplier)


@router.get("/breakout")
async def scan_breakouts(lookback: int = Query(20)):
    return await breakout_scanner(lookback=lookback)


@router.get("/pattern")
async def scan_patterns():
    return await pattern_scanner()


@router.get("/run")
async def run_custom_scanner(
    scan_type: str = Query(...),
    universe: str = Query("NIFTY50"),
):
    return await run_scanner(scan_type, universe=universe)
