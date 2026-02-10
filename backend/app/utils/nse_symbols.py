"""NSE/BSE stock symbols and sector mappings for Indian market."""

# Major NSE Indices
NIFTY_50 = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "HINDUNILVR",
    "SBIN", "BHARTIARTL", "KOTAKBANK", "ITC", "LT", "AXISBANK",
    "BAJFINANCE", "ASIANPAINT", "MARUTI", "HCLTECH", "SUNPHARMA",
    "TITAN", "WIPRO", "ULTRACEMCO", "NTPC", "TATAMOTORS", "POWERGRID",
    "M&M", "NESTLEIND", "JSWSTEEL", "TATASTEEL", "ADANIENT", "TECHM",
    "BAJAJFINSV", "INDUSINDBK", "HINDALCO", "APOLLOHOSP", "ONGC",
    "LTIM", "DRREDDY", "COALINDIA", "BAJAJ-AUTO", "CIPLA", "GRASIM",
    "DIVISLAB", "SBILIFE", "BPCL", "EICHERMOT", "TATACONSUM",
    "BRITANNIA", "HEROMOTOCO", "ADANIPORTS", "HDFCLIFE", "WIPRO"
]

# Sector ETFs / Sector Indices mapping
NIFTY_SECTORS = {
    "NIFTY IT": ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM", "MPHASIS",
                 "COFORGE", "PERSISTENT", "LTTS"],
    "NIFTY BANK": ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK",
                   "INDUSINDBK", "BANKBARODA", "PNB", "FEDERALBNK", "IDFCFIRSTB"],
    "NIFTY PHARMA": ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "AUROPHARMA",
                     "BIOCON", "LUPIN", "TORNTPHARM", "ALKEM", "IPCALAB"],
    "NIFTY AUTO": ["MARUTI", "TATAMOTORS", "M&M", "BAJAJ-AUTO", "EICHERMOT",
                   "HEROMOTOCO", "ASHOKLEY", "BALKRISIND", "BHARATFORG", "BOSCHLTD"],
    "NIFTY FMCG": ["HINDUNILVR", "ITC", "NESTLEIND", "BRITANNIA", "TATACONSUM",
                   "GODREJCP", "DABUR", "MARICO", "COLPAL", "VBL"],
    "NIFTY METAL": ["TATASTEEL", "JSWSTEEL", "HINDALCO", "VEDL", "COALINDIA",
                    "NMDC", "NATIONALUM", "SAIL", "JINDALSTEL", "APLAPOLLO"],
    "NIFTY ENERGY": ["RELIANCE", "NTPC", "POWERGRID", "ONGC", "BPCL",
                     "ADANIENT", "ADANIGREEN", "TATAPOWER", "IOC", "GAIL"],
    "NIFTY REALTY": ["DLF", "GODREJPROP", "OBEROIRLTY", "PHOENIXLTD", "PRESTIGE",
                     "BRIGADE", "SOBHA", "LODHA", "SUNTECK", "MAHLIFE"],
    "NIFTY INFRA": ["LT", "ULTRACEMCO", "GRASIM", "ADANIPORTS", "AMBUJACEM",
                    "SHREECEM", "ACC", "SIEMENS", "ABB", "CUMMINSIND"],
    "NIFTY MEDIA": ["ZEEL", "PVR", "SUNTV", "TV18BRDCST", "NETWORK18",
                    "DISHTV", "HATHWAY", "NAZARA", "SAREGAMA", "TIPS"],
    "NIFTY PSU BANK": ["SBIN", "BANKBARODA", "PNB", "CANBK", "UNIONBANK",
                       "IOB", "INDIANB", "CENTRALBK", "BANKINDIA", "MAHABANK"],
}

# All unique symbols
ALL_SYMBOLS = list(set(
    NIFTY_50 +
    [s for stocks in NIFTY_SECTORS.values() for s in stocks]
))

# Sector color mapping for charts
SECTOR_COLORS = {
    "NIFTY IT": "#3B82F6",
    "NIFTY BANK": "#10B981",
    "NIFTY PHARMA": "#EF4444",
    "NIFTY AUTO": "#F59E0B",
    "NIFTY FMCG": "#8B5CF6",
    "NIFTY METAL": "#6B7280",
    "NIFTY ENERGY": "#F97316",
    "NIFTY REALTY": "#EC4899",
    "NIFTY INFRA": "#14B8A6",
    "NIFTY MEDIA": "#A855F7",
    "NIFTY PSU BANK": "#06B6D4",
}


def get_sector_for_symbol(symbol: str) -> str:
    """Return the sector name for a given symbol."""
    for sector, symbols in NIFTY_SECTORS.items():
        if symbol in symbols:
            return sector
    return "OTHER"


def get_nse_suffix(symbol: str) -> str:
    """Add .NS suffix for Yahoo Finance."""
    return f"{symbol}.NS"
