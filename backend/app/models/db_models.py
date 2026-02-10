from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from datetime import datetime
from app.database import Base


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    symbols = Column(Text, default="")  # comma-separated
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False)
    trade_type = Column(String(10), nullable=False)  # BUY / SELL
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Integer, nullable=False)
    entry_date = Column(DateTime, nullable=False)
    exit_date = Column(DateTime, nullable=True)
    strategy = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    pnl = Column(Float, nullable=True)
    is_open = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SavedScan(Base):
    __tablename__ = "saved_scans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    scan_type = Column(String(50), nullable=False)
    parameters = Column(Text, default="{}")  # JSON
    created_at = Column(DateTime, default=datetime.utcnow)
