# ChartsMaze Clone

A full-stack stock market analysis platform inspired by [ChartsMaze.com](https://chartsmaze.com), built with **FastAPI** (Python) backend and **React** frontend. Focused on Indian stock markets (NSE/BSE).

## Features

- **Market Dashboard** - Live market overview with NIFTY indices, top gainers/losers
- **Relative Rotation Graphs (RRG)** - Interactive RRG charts for sector rotation analysis with quadrant visualization (Leading, Weakening, Lagging, Improving)
- **Market Breadth** - Advance/Decline line, A/D ratio, new highs/lows, stocks above moving averages
- **Sector Analysis** - Performance across timeframes (1D to 1Y), sector heatmaps, sector rotation tracking
- **Stock Scanners** - Gap scanner, volume scanner, breakout scanner, pattern scanner (engulfing, doji, MA crossovers, RSI)
- **Multi-Chart Layout** - View multiple candlestick charts side by side (1x1, 2x1, 2x2, 3x1 layouts)
- **Stock Detail Pages** - Full stock info with interactive candlestick charts, fundamentals, and company description
- **Trading Journal** - Track trades with P&L calculation, win rate, and performance statistics
- **Watchlists** - Create and manage multiple watchlists with live quotes

## Tech Stack

### Backend
- **FastAPI** - Async Python web framework
- **Yahoo Finance API** - Direct HTTP client for stock data (NSE/BSE)
- **SQLAlchemy** - ORM for trading journal and watchlists
- **SQLite** - Lightweight database
- **NumPy** - RRG calculations and technical analysis

### Frontend
- **React 18** - UI framework
- **React Router** - Client-side routing
- **Lightweight Charts** - Professional candlestick charts (by TradingView)
- **Lucide React** - Icons
- **Vite** - Build tool

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies API requests to the backend at `http://localhost:8000`.

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── database.py          # SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── db_models.py     # Database models (Journal, Watchlist)
│   │   │   └── schemas.py       # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── stocks.py        # Stock data endpoints
│   │   │   ├── rrg.py           # RRG endpoints
│   │   │   ├── breadth.py       # Market breadth endpoints
│   │   │   ├── sectors.py       # Sector analytics endpoints
│   │   │   ├── scanners.py      # Scanner endpoints
│   │   │   └── journal.py       # Journal & watchlist endpoints
│   │   ├── services/
│   │   │   ├── yahoo_client.py  # Yahoo Finance API client
│   │   │   ├── stock_service.py # Stock data service
│   │   │   ├── rrg_service.py   # RRG calculation engine
│   │   │   ├── breadth_service.py
│   │   │   ├── sector_service.py
│   │   │   └── scanner_service.py
│   │   └── utils/
│   │       └── nse_symbols.py   # NSE stock/sector mappings
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Main app with routing
│   │   ├── pages/               # All page components
│   │   ├── components/          # Reusable components
│   │   ├── services/api.js      # API client
│   │   └── styles/index.css     # Global styles
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/stocks/market-overview` | Market indices + top movers |
| `GET /api/stocks/quote/{symbol}` | Stock quote |
| `GET /api/stocks/history/{symbol}` | OHLCV history |
| `GET /api/stocks/detail/{symbol}` | Full stock info |
| `GET /api/rrg/sectors` | Sector RRG data |
| `GET /api/rrg/stocks?symbols=...` | Custom stock RRG |
| `GET /api/breadth/` | Market breadth data |
| `GET /api/breadth/above-ma` | Stocks above MA |
| `GET /api/sectors/performance` | Sector performance |
| `GET /api/sectors/heatmap` | Market heatmap |
| `GET /api/scanners/gap` | Gap scanner |
| `GET /api/scanners/volume` | Volume scanner |
| `GET /api/scanners/breakout` | Breakout scanner |
| `GET /api/scanners/pattern` | Pattern scanner |
| `GET /api/journal` | Trade journal |
| `GET /api/watchlists` | Watchlists |

## Data

- Stock data is fetched from Yahoo Finance (EOD data)
- Charts update at end of day post-markets
- Covers NSE NIFTY 50, NIFTY sector indices, and 100+ Indian stocks
