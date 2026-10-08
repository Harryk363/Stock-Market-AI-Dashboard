from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from market_data import load_price_features, fetch_news_headlines
from models import MODEL_NAMES, train_and_evaluate
from sentiment import NewsSentiment
from market_data import get_stock_metrics, get_historical_data



# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="Stock Market AI API",
    description="Stock prediction API using ML models and FinBERT sentiment analysis.",
    version="1.0.0",
)

@app.get("/api/stock/{symbol}/metrics")
def stock_metrics(symbol: str):
    return get_stock_metrics(symbol.upper())

@app.get("/api/stock/{symbol}/history")
def stock_history(
    symbol: str,
    period: str = "1y"
):
    return get_historical_data(
        symbol.upper(),
        period
    )
# ============================================================
# CORS
# ============================================================
# Allows the React/Vite frontend to communicate with FastAPI.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Health Check
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Stock Market AI API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Stock Market AI API",
    }


# ============================================================
# Available Models
# ============================================================

@app.get("/api/models")
def get_models():
    """
    Return the ML models available for prediction.
    """

    return {
        "models": [
            {
                "id": key,
                "name": name,
            }
            for key, name in MODEL_NAMES.items()
        ]
    }


# ============================================================
# Historical Stock Data
# ============================================================

@app.get("/api/stock/{symbol}/history")
def get_stock_history(
    symbol: str,
    period: str = Query(
        default="5y",
        description="Historical period, for example 1y, 2y, 5y",
    ),
):
    """
    Return historical stock data for charts.
    """

    symbol = symbol.upper().strip()

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Stock symbol is required.",
        )

    try:
        data = load_price_features(
            symbol=symbol,
            period=period,
        )

        # Reset index so the date becomes a normal column.
        data = data.reset_index()

        # Find the date column.
        date_column = data.columns[0]

        history = []

        for _, row in data.iterrows():

            history.append(
                {
                    "date": str(row[date_column].date())
                    if hasattr(row[date_column], "date")
                    else str(row[date_column]),

                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),

                    "ma10": round(float(row["MA10"]), 2),
                    "rsi": round(float(row["RSI"]), 2),
                }
            )

        return {
            "symbol": symbol,
            "period": period,
            "count": len(history),
            "data": history,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to retrieve stock data: {str(error)}",
        )


# ============================================================
# News Endpoint
# ============================================================

@app.get("/api/stock/{symbol}/news")
def get_stock_news(
    symbol: str,
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
):
    """
    Return recent news headlines with FinBERT sentiment.
    """

    symbol = symbol.upper().strip()

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Stock symbol is required.",
        )

    try:
        headlines = fetch_news_headlines(
            symbol=symbol,
            limit=limit,
        )

        if not headlines:
            return {
                "symbol": symbol,
                "count": 0,
                "sentiment_score": 0.0,
                "news": [],
            }

        sentiment_analyzer = NewsSentiment()

        sentiment_results, sentiment_score = sentiment_analyzer.analyze(
            headlines
        )

        news = []

        for headline, result in zip(
            headlines,
            sentiment_results,
        ):

            news.append(
                {
                    "headline": headline,
                    "sentiment": result.label,
                    "confidence": round(
                        result.confidence,
                        4,
                    ),
                    "score": round(
                        result.score,
                        4,
                    ),
                }
            )

        return {
            "symbol": symbol,
            "count": len(news),
            "sentiment_score": round(
                sentiment_score,
                4,
            ),
            "news": news,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to analyze news sentiment: {str(error)}",
        )


# ============================================================
# Complete Stock Analysis
# ============================================================

@app.get("/api/stock/{symbol}/analyze")
def analyze_stock(
    symbol: str,

    model: str = Query(
        default="1",
        description="Prediction model: 1=XGBoost, 2=LightGBM, 3=Random Forest",
    ),

    period: str = Query(
        default="5y",
        description="Historical period",
    ),

    news_limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
):
    """
    Run the complete stock prediction pipeline.

    Includes:
    - Historical market data
    - ML model prediction
    - Accuracy
    - Precision
    - Recall
    - F1 score
    - FinBERT sentiment
    - Combined prediction
    - Recent news
    """

    symbol = symbol.upper().strip()

    # --------------------------------------------------------
    # Validate symbol
    # --------------------------------------------------------

    if not symbol:
        raise HTTPException(
            status_code=400,
            detail="Stock symbol is required.",
        )

    # --------------------------------------------------------
    # Validate model
    # --------------------------------------------------------

    if model not in MODEL_NAMES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid model. "
                "Use 1 for XGBoost, "
                "2 for LightGBM, "
                "3 for Random Forest."
            ),
        )

    try:

        # ====================================================
        # 1. Download historical stock data
        # ====================================================

        data = load_price_features(
            symbol=symbol,
            period=period,
        )

        # ====================================================
        # 2. Train and evaluate ML model
        # ====================================================

        trained_model, metrics, probability, prediction = (
            train_and_evaluate(
                data,
                model,
            )
        )

        # ====================================================
        # 3. Get latest stock information
        # ====================================================

        latest_row = data.iloc[-1]

        latest_price = float(latest_row["Close"])

        latest_open = float(latest_row["Open"])

        latest_high = float(latest_row["High"])

        latest_low = float(latest_row["Low"])

        latest_ma10 = float(latest_row["MA10"])

        latest_rsi = float(latest_row["RSI"])

        # ====================================================
        # 4. Get recent news
        # ====================================================

        headlines = fetch_news_headlines(
            symbol,
            limit=news_limit,
        )

        # ====================================================
        # 5. FinBERT sentiment
        # ====================================================

        sentiment_results = []

        sentiment_score = 0.0

        if headlines:

            sentiment_analyzer = NewsSentiment()

            sentiment_results, sentiment_score = (
                sentiment_analyzer.analyze(
                    headlines
                )
            )

        # ====================================================
        # 6. Convert ML probability to signal
        # ====================================================

        model_signal = (
            2.0 * probability
        ) - 1.0

        # ====================================================
        # 7. Combine ML + sentiment
        # ====================================================

        combined_score = (
            0.7 * model_signal
            + 0.3 * sentiment_score
        )

        # ====================================================
        # 8. Final direction
        # ====================================================

        model_label = (
            "UP"
            if prediction
            else "DOWN"
        )

        combined_label = (
            "UP"
            if combined_score >= 0
            else "DOWN"
        )

        # ====================================================
        # 9. Format news
        # ====================================================

        news = []

        for headline, result in zip(
            headlines,
            sentiment_results,
        ):

            news.append(
                {
                    "headline": headline,
                    "sentiment": result.label,
                    "confidence": round(
                        result.confidence,
                        4,
                    ),
                    "score": round(
                        result.score,
                        4,
                    ),
                }
            )

        # ====================================================
        # 10. Return complete response
        # ====================================================

        return {
            "symbol": symbol,

            "model": {
                "id": model,
                "name": MODEL_NAMES[model],
            },

            "prediction": {
                "direction": model_label,
                "up_probability": round(
                    probability,
                    4,
                ),
                "down_probability": round(
                    1.0 - probability,
                    4,
                ),
            },

            "sentiment": {
                "score": round(
                    sentiment_score,
                    4,
                ),
                "score_percentage": round(
                    sentiment_score * 100,
                    2,
                ),
            },

            "combined": {
                "score": round(
                    combined_score,
                    4,
                ),
                "score_percentage": round(
                    combined_score * 100,
                    2,
                ),
                "direction": combined_label,
            },

            "metrics": {
                "accuracy": round(
                    metrics["accuracy"],
                    4,
                ),
                "precision": round(
                    metrics["precision"],
                    4,
                ),
                "recall": round(
                    metrics["recall"],
                    4,
                ),
                "f1_score": round(
                    metrics["f1_score"],
                    4,
                ),
            },

            "latest_price": {
                "close": round(
                    latest_price,
                    2,
                ),
                "open": round(
                    latest_open,
                    2,
                ),
                "high": round(
                    latest_high,
                    2,
                ),
                "low": round(
                    latest_low,
                    2,
                ),
                "ma10": round(
                    latest_ma10,
                    2,
                ),
                "rsi": round(
                    latest_rsi,
                    2,
                ),
            },

            "news": news,

            "news_count": len(news),

            "disclaimer": (
                "This is an educational prediction "
                "and is not financial advice."
            ),
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Stock analysis failed: {str(error)}",
        )


# ============================================================
# Run directly
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )