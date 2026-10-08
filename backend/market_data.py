from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import yfinance as yf
from ta.momentum import RSIIndicator


# ============================================================
# Features used by the ML models
# ============================================================

FEATURES = [
    "High",
    "Low",
    "Open",
    "Close",
    "MA10",
    "RSI",
]


# ============================================================
# Load historical stock data
# ============================================================

def load_price_features(
    symbol: str,
    period: str = "5y",
) -> pd.DataFrame:

    symbol = symbol.upper().strip()

    if not symbol:
        raise ValueError("Stock symbol is required.")

    # --------------------------------------------------------
    # Download historical data from Yahoo Finance
    # --------------------------------------------------------

    prices = yf.download(
        symbol,
        period=period,
        interval="1d",
        auto_adjust=False,
        progress=False,
    )

    # --------------------------------------------------------
    # Check whether data was returned
    # --------------------------------------------------------

    if prices.empty:
        raise ValueError(
            f"No price data was returned for {symbol!r}."
        )

    # --------------------------------------------------------
    # Handle MultiIndex columns returned by yfinance
    # --------------------------------------------------------

    if isinstance(prices.columns, pd.MultiIndex):
        prices.columns = prices.columns.get_level_values(0)

    # --------------------------------------------------------
    # Check required columns
    # --------------------------------------------------------

    required_columns = {
        "High",
        "Low",
        "Open",
        "Close",
    }

    missing = required_columns - set(prices.columns)

    if missing:
        raise ValueError(
            f"Downloaded data is missing columns: "
            f"{sorted(missing)}"
        )

    # --------------------------------------------------------
    # Select required market columns
    # --------------------------------------------------------

    data = prices[
        [
            "High",
            "Low",
            "Open",
            "Close",
        ]
    ].copy()

    # --------------------------------------------------------
    # Moving Average - MA10
    # --------------------------------------------------------

    data["MA10"] = (
        data["Close"]
        .rolling(window=10)
        .mean()
    )

    # --------------------------------------------------------
    # RSI - 14 periods
    # --------------------------------------------------------

    data["RSI"] = RSIIndicator(
        close=data["Close"],
        window=14,
    ).rsi()

    # --------------------------------------------------------
    # Prediction target
    #
    # 1 = tomorrow's Close > today's Close
    # 0 = otherwise
    # --------------------------------------------------------

    data["Target"] = (
        data["Close"].shift(-1)
        > data["Close"]
    ).astype(int)

    # --------------------------------------------------------
    # Remove rows where indicators cannot be calculated
    # --------------------------------------------------------

    data = data.dropna()

    return data

def get_historical_data(
    symbol: str,
    period: str = "1y"
) -> dict:
    """
    Fetch historical OHLCV data for the frontend charts.

    Supported periods:
        1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max
    """

    allowed_periods = {
        "1d": "1d",
        "5d": "5d",
        "1mo": "1mo",
        "3mo": "3mo",
        "6mo": "6mo",
        "1y": "1y",
        "2y": "2y",
        "5y": "5y",
        "10y": "10y",
        "max": "max",
    }

    requested_period = str(period).lower().strip()

    if requested_period not in allowed_periods:
        requested_period = "1y"

    try:
        ticker = yf.Ticker(symbol.upper())

        history = ticker.history(
            period=allowed_periods[requested_period],
            interval="1d",
            auto_adjust=False
        )

        if history is None or history.empty:
            return {
                "symbol": symbol.upper(),
                "period": requested_period,
                "data": []
            }

        # Handle possible MultiIndex columns
        if isinstance(history.columns, pd.MultiIndex):
            history.columns = history.columns.get_level_values(0)

        history = history.reset_index()

        result = []

        for _, row in history.iterrows():

            date_value = row.get("Date")

            if hasattr(date_value, "strftime"):
                date_value = date_value.strftime("%Y-%m-%d")
            else:
                date_value = str(date_value)[:10]

            result.append({
                "Date": date_value,
                "Open": float(row["Open"]),
                "High": float(row["High"]),
                "Low": float(row["Low"]),
                "Close": float(row["Close"]),
                "Volume": int(row["Volume"])
                    if pd.notna(row["Volume"])
                    else 0,
            })

        return {
            "symbol": symbol.upper(),
            "period": requested_period,
            "data": result
        }

    except Exception as e:
        print(
            f"[HISTORY ERROR] "
            f"{symbol} / {requested_period}: {e}"
        )

        return {
            "symbol": symbol.upper(),
            "period": requested_period,
            "data": []
        }


# ============================================================
# Fetch recent financial news
# ============================================================

def fetch_news_headlines(
    symbol: str,
    limit: int = 10,
) -> list[dict]:

    symbol = symbol.upper().strip()

    if not symbol:
        return []

    try:

        # ----------------------------------------------------
        # Yahoo Finance Search
        #
        # This is used instead of ticker.get_news()
        # because yf.Search() is returning news correctly
        # in your current yfinance 1.6.0 installation.
        # ----------------------------------------------------

        search = yf.Search(
            symbol,
            news_count=limit,
        )

        news = search.news or []

        print(
            f"[NEWS] {symbol}: "
            f"received {len(news)} articles"
        )

        headlines = []

        # ----------------------------------------------------
        # Extract news articles
        # ----------------------------------------------------

        for item in news[:limit]:

            if not isinstance(item, dict):
                continue

            title = item.get("title")

            if not title:
                continue

            # Yahoo Finance article URL
            url = item.get("link")

            # Publisher
            publisher = item.get(
                "publisher",
                "Yahoo Finance",
            )

            # Publication timestamp
            published_time = item.get(
                "providerPublishTime"
            )

            published_at = None

            if published_time:

                try:
                    published_at = (
                        datetime.fromtimestamp(
                            published_time,
                            tz=timezone.utc,
                        ).isoformat()
                    )

                except (TypeError, ValueError, OSError):
                    published_at = None

            # ------------------------------------------------
            # Create clean article object
            # ------------------------------------------------

            headlines.append(
                {
                    "title": str(title),
                    "url": url,
                    "publisher": str(publisher),
                    "published_at": published_at,
                }
            )

        print(
            f"[NEWS] {symbol}: "
            f"returning {len(headlines)} headlines"
        )

        return headlines[:limit]

    except Exception as e:

        print(
            f"[NEWS ERROR] {symbol}: {e}"
        )

        return []

def get_stock_metrics(symbol: str) -> dict:
    """
    Get current stock price and fundamental metrics.
    """

    try:
        ticker = yf.Ticker(symbol)

        # Get current quote information
        info = ticker.info

        # Current price
        current_price = (
            info.get("currentPrice")
            or info.get("regularMarketPrice")
            or info.get("previousClose")
        )

        # Day high / low
        day_high = (
            info.get("dayHigh")
            or info.get("regularMarketDayHigh")
        )

        day_low = (
            info.get("dayLow")
            or info.get("regularMarketDayLow")
        )

        # P/E ratio
        pe_ratio = (
            info.get("trailingPE")
            or info.get("forwardPE")
        )

        # Market cap
        market_cap = info.get("marketCap")

        # Dividend yield
        dividend_yield = info.get("dividendYield")

        return {
            "symbol": symbol.upper(),
            "current_price": current_price,
            "day_high": day_high,
            "day_low": day_low,
            "pe_ratio": pe_ratio,
            "market_cap": market_cap,
            "dividend_yield": dividend_yield,
        }

    except Exception as e:
        print(f"[METRICS ERROR] {symbol}: {e}")

        return {
            "symbol": symbol.upper(),
            "current_price": None,
            "day_high": None,
            "day_low": None,
            "pe_ratio": None,
            "market_cap": None,
            "dividend_yield": None,
        }