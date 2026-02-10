"""ChartsMaze Clone - FastAPI Backend Application."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os
import logging

from app.database import init_db
from app.routers import stocks, rrg, breadth, sectors, scanners, journal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

frontend_path = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "build")
frontend_path = os.path.realpath(frontend_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting ChartsMaze API...")
    os.makedirs("data", exist_ok=True)
    init_db()
    logger.info("Database initialized.")
    logger.info(f"Frontend path: {frontend_path} (exists: {os.path.exists(frontend_path)})")
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
    allow_origins=["*"],
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


# Serve static frontend files with SPA fallback
if os.path.exists(frontend_path):
    # Mount static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_path, "assets")), name="assets")

    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(os.path.join(frontend_path, "favicon.svg"))

    # SPA fallback: serve index.html for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Try to serve a static file first
        file_path = os.path.join(frontend_path, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise return index.html for client-side routing
        return FileResponse(os.path.join(frontend_path, "index.html"))
