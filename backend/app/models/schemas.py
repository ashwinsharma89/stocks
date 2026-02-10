from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Stock schemas
class StockQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float] = None
    sector: Optional[str] = None
    industry: Optional[str] = None


class OHLCData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockDetail(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    dividend_yield: Optional[float] = None
    week_52_high: Optional[float] = None
    week_52_low: Optional[float] = None
    avg_volume: Optional[int] = None
    ohlc: List[OHLCData] = []


# RRG schemas
class RRGPoint(BaseModel):
    symbol: str
    name: str
    rs_ratio: float
    rs_momentum: float
    quadrant: str  # Leading, Weakening, Lagging, Improving
    tail: List[dict] = []


class RRGResponse(BaseModel):
    benchmark: str
    data: List[RRGPoint]
    timestamp: str


# Market Breadth schemas
class BreadthData(BaseModel):
    date: str
    advances: int
    declines: int
    unchanged: int
    ad_ratio: float
    ad_line: float
    new_highs: int
    new_lows: int
    up_volume: float
    down_volume: float


class MarketBreadthResponse(BaseModel):
    index: str
    data: List[BreadthData]
    current_breadth: str  # Bullish, Bearish, Neutral


# Sector schemas
class SectorPerformance(BaseModel):
    sector: str
    change_1d: float
    change_1w: float
    change_1m: float
    change_3m: float
    change_6m: float
    change_1y: float
    top_stocks: List[dict] = []


class SectorHeatmapItem(BaseModel):
    symbol: str
    name: str
    sector: str
    change_percent: float
    market_cap: float


# Scanner schemas
class ScannerResult(BaseModel):
    symbol: str
    name: str
    price: float
    change_percent: float
    volume: int
    signal: str
    details: dict = {}


class ScannerRequest(BaseModel):
    scan_type: str
    parameters: dict = {}
    universe: str = "NIFTY500"


# Journal schemas
class JournalEntryCreate(BaseModel):
    symbol: str
    trade_type: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: int
    entry_date: datetime
    exit_date: Optional[datetime] = None
    strategy: Optional[str] = None
    notes: Optional[str] = None


class JournalEntryResponse(BaseModel):
    id: int
    symbol: str
    trade_type: str
    entry_price: float
    exit_price: Optional[float] = None
    quantity: int
    entry_date: datetime
    exit_date: Optional[datetime] = None
    strategy: Optional[str] = None
    notes: Optional[str] = None
    pnl: Optional[float] = None
    is_open: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Watchlist schemas
class WatchlistCreate(BaseModel):
    name: str
    symbols: List[str] = []


class WatchlistResponse(BaseModel):
    id: int
    name: str
    symbols: List[str]
    created_at: datetime

    class Config:
        from_attributes = True
