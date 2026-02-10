"""Trading Journal & Watchlist API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.db_models import JournalEntry, Watchlist, SavedScan
from app.models.schemas import JournalEntryCreate, JournalEntryResponse, WatchlistCreate, WatchlistResponse

router = APIRouter(prefix="/api", tags=["journal"])


# ---- Journal Endpoints ----

@router.get("/journal")
def get_journal_entries(db: Session = Depends(get_db)):
    """Get all journal entries."""
    entries = db.query(JournalEntry).order_by(JournalEntry.entry_date.desc()).all()
    return [_format_journal_entry(e) for e in entries]


@router.post("/journal")
def create_journal_entry(entry: JournalEntryCreate, db: Session = Depends(get_db)):
    """Create a new journal entry."""
    pnl = None
    is_open = True
    if entry.exit_price and entry.exit_price > 0:
        if entry.trade_type.upper() == "BUY":
            pnl = (entry.exit_price - entry.entry_price) * entry.quantity
        else:
            pnl = (entry.entry_price - entry.exit_price) * entry.quantity
        is_open = False

    db_entry = JournalEntry(
        symbol=entry.symbol.upper(),
        trade_type=entry.trade_type.upper(),
        entry_price=entry.entry_price,
        exit_price=entry.exit_price,
        quantity=entry.quantity,
        entry_date=entry.entry_date,
        exit_date=entry.exit_date,
        strategy=entry.strategy,
        notes=entry.notes,
        pnl=pnl,
        is_open=is_open,
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return _format_journal_entry(db_entry)


@router.put("/journal/{entry_id}")
def update_journal_entry(entry_id: int, entry: JournalEntryCreate, db: Session = Depends(get_db)):
    """Update a journal entry."""
    db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db_entry.symbol = entry.symbol.upper()
    db_entry.trade_type = entry.trade_type.upper()
    db_entry.entry_price = entry.entry_price
    db_entry.exit_price = entry.exit_price
    db_entry.quantity = entry.quantity
    db_entry.entry_date = entry.entry_date
    db_entry.exit_date = entry.exit_date
    db_entry.strategy = entry.strategy
    db_entry.notes = entry.notes

    if entry.exit_price and entry.exit_price > 0:
        if entry.trade_type.upper() == "BUY":
            db_entry.pnl = (entry.exit_price - entry.entry_price) * entry.quantity
        else:
            db_entry.pnl = (entry.entry_price - entry.exit_price) * entry.quantity
        db_entry.is_open = False
    else:
        db_entry.pnl = None
        db_entry.is_open = True

    db.commit()
    db.refresh(db_entry)
    return _format_journal_entry(db_entry)


@router.delete("/journal/{entry_id}")
def delete_journal_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a journal entry."""
    db_entry = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(db_entry)
    db.commit()
    return {"message": "Entry deleted"}


@router.get("/journal/stats")
def get_journal_stats(db: Session = Depends(get_db)):
    """Get trading journal statistics."""
    entries = db.query(JournalEntry).filter(JournalEntry.is_open == False).all()

    if not entries:
        return {
            "total_trades": 0, "winning_trades": 0, "losing_trades": 0,
            "win_rate": 0, "total_pnl": 0, "avg_pnl": 0,
            "best_trade": 0, "worst_trade": 0,
        }

    pnls = [e.pnl for e in entries if e.pnl is not None]
    winning = [p for p in pnls if p > 0]
    losing = [p for p in pnls if p < 0]

    return {
        "total_trades": len(entries),
        "winning_trades": len(winning),
        "losing_trades": len(losing),
        "win_rate": round(len(winning) / max(len(entries), 1) * 100, 2),
        "total_pnl": round(sum(pnls), 2),
        "avg_pnl": round(sum(pnls) / max(len(pnls), 1), 2),
        "best_trade": round(max(pnls) if pnls else 0, 2),
        "worst_trade": round(min(pnls) if pnls else 0, 2),
    }


def _format_journal_entry(entry):
    return {
        "id": entry.id,
        "symbol": entry.symbol,
        "trade_type": entry.trade_type,
        "entry_price": entry.entry_price,
        "exit_price": entry.exit_price,
        "quantity": entry.quantity,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
        "exit_date": entry.exit_date.isoformat() if entry.exit_date else None,
        "strategy": entry.strategy,
        "notes": entry.notes,
        "pnl": entry.pnl,
        "is_open": entry.is_open,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    }


# ---- Watchlist Endpoints ----

@router.get("/watchlists")
def get_watchlists(db: Session = Depends(get_db)):
    """Get all watchlists."""
    watchlists = db.query(Watchlist).all()
    return [_format_watchlist(w) for w in watchlists]


@router.post("/watchlists")
def create_watchlist(wl: WatchlistCreate, db: Session = Depends(get_db)):
    """Create a new watchlist."""
    db_wl = Watchlist(
        name=wl.name,
        symbols=",".join(wl.symbols),
    )
    db.add(db_wl)
    db.commit()
    db.refresh(db_wl)
    return _format_watchlist(db_wl)


@router.put("/watchlists/{wl_id}")
def update_watchlist(wl_id: int, wl: WatchlistCreate, db: Session = Depends(get_db)):
    """Update a watchlist."""
    db_wl = db.query(Watchlist).filter(Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    db_wl.name = wl.name
    db_wl.symbols = ",".join(wl.symbols)
    db.commit()
    db.refresh(db_wl)
    return _format_watchlist(db_wl)


@router.delete("/watchlists/{wl_id}")
def delete_watchlist(wl_id: int, db: Session = Depends(get_db)):
    """Delete a watchlist."""
    db_wl = db.query(Watchlist).filter(Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    db.delete(db_wl)
    db.commit()
    return {"message": "Watchlist deleted"}


@router.post("/watchlists/{wl_id}/add/{symbol}")
def add_to_watchlist(wl_id: int, symbol: str, db: Session = Depends(get_db)):
    """Add a symbol to a watchlist."""
    db_wl = db.query(Watchlist).filter(Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    symbols = [s for s in db_wl.symbols.split(",") if s] if db_wl.symbols else []
    if symbol.upper() not in symbols:
        symbols.append(symbol.upper())
        db_wl.symbols = ",".join(symbols)
        db.commit()
    return _format_watchlist(db_wl)


@router.delete("/watchlists/{wl_id}/remove/{symbol}")
def remove_from_watchlist(wl_id: int, symbol: str, db: Session = Depends(get_db)):
    """Remove a symbol from a watchlist."""
    db_wl = db.query(Watchlist).filter(Watchlist.id == wl_id).first()
    if not db_wl:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    symbols = [s for s in db_wl.symbols.split(",") if s]
    symbols = [s for s in symbols if s != symbol.upper()]
    db_wl.symbols = ",".join(symbols)
    db.commit()
    return _format_watchlist(db_wl)


def _format_watchlist(wl):
    return {
        "id": wl.id,
        "name": wl.name,
        "symbols": [s for s in wl.symbols.split(",") if s] if wl.symbols else [],
        "created_at": wl.created_at.isoformat() if wl.created_at else None,
    }
