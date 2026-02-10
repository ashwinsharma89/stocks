"""Sector Analytics API routes."""
from fastapi import APIRouter, Query
from app.services.sector_service import (
    get_sector_performance, get_sector_heatmap, get_sector_rotation_history
)

router = APIRouter(prefix="/api/sectors", tags=["sectors"])


@router.get("/performance")
async def sector_performance():
    return await get_sector_performance()


@router.get("/heatmap")
async def sector_heatmap():
    return await get_sector_heatmap()


@router.get("/rotation")
async def sector_rotation(period: str = Query("6mo")):
    return await get_sector_rotation_history(period)
