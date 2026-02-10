"""ChartsMaze Clone - FastAPI Backend Application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os
import logging

from app.database import init_db
from app.routers import stocks, rrg, breadth, sectors, scanners, journal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting ChartsMaze API...")
    os.makedirs("data", exist_ok=True)
    init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down ChartsMaze API...")


app = FastAPI(
    title="ChartsMaze Clone API",
    description="Stock market analysis platform with RRG, Market Breadth, Sector Analytics, and Scanners",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(stocks.router)
app.include_router(rrg.router)
app.include_router(breadth.router)
app.include_router(sectors.router)
app.include_router(scanners.router)
app.include_router(journal.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "ChartsMaze Clone"}


# Serve static frontend files in production
frontend_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "build")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
