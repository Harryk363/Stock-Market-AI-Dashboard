from __future__ import annotations

from typing import Any

from market_data import (
    load_price_features,
    fetch_news_headlines,
)

from models import (
    MODEL_NAMES,
    train_and_evaluate,
)

from sentiment import NewsSentiment
from sentiment import get_sentiment_analyzer


# ============================================================
# Main Stock Analysis Function
# ============================================================

def analyze_stock(
    symbol: str,
    model_choice: str = "1",
    period: str = "5y",
    news_limit: int = 10,
) -> dict[str, Any]:
    """
    Run the complete stock analysis pipeline.

    Pipeline:

        Stock Symbol
             ↓
        Historical Data
             ↓
        Technical Features
             ↓
        ML Model
             ↓
        Prediction Probability
             ↓
        Recent News
             ↓
        FinBERT Sentiment
             ↓
        Combined Score
             ↓
        Final Direction

    Args:
        symbol:
            Stock ticker, e.g. AAPL.

        model_choice:
            "1" = XGBoost
            "2" = LightGBM
            "3" = Random Forest

        period:
            Historical data period, e.g. "1y", "2y", "5y".

        news_limit:
            Number of recent news headlines to analyze.

    Returns:
        Dictionary containing the complete analysis.
    """

    # ========================================================
    # 1. Validate stock symbol
    # ========================================================

    symbol = symbol.upper().strip()

    if not symbol:
        raise ValueError(
            "Stock symbol is required."
        )

    # ========================================================
    # 2. Validate model
    # ========================================================

    if model_choice not in MODEL_NAMES:
        raise ValueError(
            "Invalid model choice. "
            "Use 1 for XGBoost, "
            "2 for LightGBM, "
            "3 for Random Forest."
        )

    # ========================================================
    # 3. Download historical stock data
    # ========================================================

    data = load_price_features(
        symbol=symbol,
        period=period,
    )

    # ========================================================
    # 4. Train and evaluate ML model
    # ========================================================

    trained_model, metrics, probability, prediction = (
        train_and_evaluate(
            data,
            model_choice,
        )
    )

    # ========================================================
    # 5. Latest stock information
    # ========================================================

    latest = data.iloc[-1]

    latest_price = float(
        latest["Close"]
    )

    latest_open = float(
        latest["Open"]
    )

    latest_high = float(
        latest["High"]
    )

    latest_low = float(
        latest["Low"]
    )

    latest_ma10 = float(
        latest["MA10"]
    )

    latest_rsi = float(
        latest["RSI"]
    )

    # ========================================================
    # 6. Fetch recent news
    # ========================================================

    headlines = fetch_news_headlines(
        symbol=symbol,
        limit=news_limit,
    )

    # ========================================================
    # 7. Analyze news with FinBERT
    # ========================================================
    
    sentiment_results = []

    sentiment_score = 0.0

    if headlines:

        sentiment_analyzer = get_sentiment_analyzer()
        

        (
            sentiment_results,
            sentiment_score,
        ) = sentiment_analyzer.analyze(
            headlines
        )

    # ========================================================
    # 8. Convert model probability to signal
    #
    # Probability:
    #
    # 0.00 → strongly DOWN
    # 0.50 → neutral
    # 1.00 → strongly UP
    #
    # Convert:
    #
    # 0.00 → -1
    # 0.50 →  0
    # 1.00 → +1
    # ========================================================

    model_signal = (
        2.0 * probability
    ) - 1.0

    # ========================================================
    # 9. Combine ML prediction + sentiment
    #
    # Current weighting:
    #
    # ML model       = 70%
    # News sentiment = 30%
    # ========================================================

    combined_score = (
        0.7 * model_signal
        + 0.3 * sentiment_score
    )

    # ========================================================
    # 10. Convert predictions into labels
    # ========================================================

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

    # ========================================================
    # 11. Format sentiment results
    # ========================================================

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

    # ========================================================
    # 12. Build final response
    # ========================================================

    result = {

        # ----------------------------------------------------
        # Basic information
        # ----------------------------------------------------

        "symbol": symbol,

        "model": {
            "id": model_choice,
            "name": MODEL_NAMES[
                model_choice
            ],
        },

        # ----------------------------------------------------
        # ML prediction
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Sentiment
        # ----------------------------------------------------

        "sentiment": {

            "score": round(
                sentiment_score,
                4,
            ),

            "score_percentage": round(
                sentiment_score * 100,
                2,
            ),

            "headline_count": len(
                sentiment_results
            ),
        },

        # ----------------------------------------------------
        # Combined prediction
        # ----------------------------------------------------

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

            "model_weight": 0.70,

            "sentiment_weight": 0.30,
        },

        # ----------------------------------------------------
        # Model performance
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # Latest market data
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # News
        # ----------------------------------------------------

        "news": news,

        "news_count": len(news),

        # ----------------------------------------------------
        # Disclaimer
        # ----------------------------------------------------

        "disclaimer": (
            "This is an educational prediction "
            "and is not financial advice."
        ),
    }

    return result


# ============================================================
# Simple helper for testing from Python
# ============================================================

def run_prediction(
    symbol: str,
    model_choice: str = "1",
    period: str = "5y",
    news_limit: int = 10,
) -> dict[str, Any]:
    """
    Run the prediction and print a readable summary.

    This function is useful for testing the backend
    before connecting the React frontend.
    """

    result = analyze_stock(
        symbol=symbol,
        model_choice=model_choice,
        period=period,
        news_limit=news_limit,
    )

    print("\n" + "=" * 60)
    print("STOCK MARKET AI ANALYSIS")
    print("=" * 60)

    print(
        f"Symbol: {result['symbol']}"
    )

    print(
        f"Model: {result['model']['name']}"
    )

    print("\nPrediction")
    print("-" * 60)

    print(
        f"Model direction: "
        f"{result['prediction']['direction']}"
    )

    print(
        f"UP probability: "
        f"{result['prediction']['up_probability'] * 100:.2f}%"
    )

    print(
        f"DOWN probability: "
        f"{result['prediction']['down_probability'] * 100:.2f}%"
    )

    print("\nSentiment")
    print("-" * 60)

    print(
        f"Sentiment score: "
        f"{result['sentiment']['score_percentage']:.2f}%"
    )

    print("\nCombined Prediction")
    print("-" * 60)

    print(
        f"Combined score: "
        f"{result['combined']['score_percentage']:.2f}%"
    )

    print(
        f"Combined direction: "
        f"{result['combined']['direction']}"
    )

    print("\nModel Performance")
    print("-" * 60)

    print(
        f"Accuracy: "
        f"{result['metrics']['accuracy'] * 100:.2f}%"
    )

    print(
        f"Precision: "
        f"{result['metrics']['precision'] * 100:.2f}%"
    )

    print(
        f"Recall: "
        f"{result['metrics']['recall'] * 100:.2f}%"
    )

    print(
        f"F1 Score: "
        f"{result['metrics']['f1_score'] * 100:.2f}%"
    )

    print("\nLatest Price")
    print("-" * 60)

    print(
        f"Close: "
        f"{result['latest_price']['close']:.2f}"
    )

    print(
        f"MA10: "
        f"{result['latest_price']['ma10']:.2f}"
    )

    print(
        f"RSI: "
        f"{result['latest_price']['rsi']:.2f}"
    )

    print("=" * 60)

    return result