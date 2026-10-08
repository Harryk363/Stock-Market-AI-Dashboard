from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from transformers import pipeline


# ============================================================
# Sentiment Result
# ============================================================

@dataclass
class SentimentResult:
    """
    Stores the sentiment result for one news headline.
    """

    label: str
    confidence: float
    score: float


# ============================================================
# FinBERT News Sentiment Analyzer
# ============================================================

class NewsSentiment:
    """
    Financial news sentiment analyzer using FinBERT.

    Positive:
        score = +confidence

    Negative:
        score = -confidence

    Neutral:
        score = 0
    """

    def __init__(
        self,
        model_name: str = "ProsusAI/finbert",
    ) -> None:

        self.model_name = model_name

        print(
            f"[SENTIMENT] Loading model: {model_name}"
        )

        self.classifier = pipeline(
            "text-classification",
            model=model_name,
            tokenizer=model_name,
        )

        print(
            "[SENTIMENT] FinBERT loaded successfully."
        )

    # ========================================================
    # Analyze headlines
    # ========================================================

    def analyze(
        self,
        headlines: list[Any],
    ) -> tuple[
        list[SentimentResult],
        float,
    ]:

        # ----------------------------------------------------
        # No headlines
        # ----------------------------------------------------

        if not headlines:
            return [], 0.0

        results: list[SentimentResult] = []

        # ----------------------------------------------------
        # Analyze each headline
        # ----------------------------------------------------

        for headline in headlines:

            # ------------------------------------------------
            # Yahoo Finance returns dictionaries
            # ------------------------------------------------

            if isinstance(headline, dict):

                text = headline.get(
                    "title",
                    headline.get(
                        "headline",
                        "",
                    ),
                )

            else:

                text = str(headline)

            text = str(text).strip()

            if not text:
                continue

            try:

                # IMPORTANT:
                # Pass text as the first positional argument.
                #
                # This is required by the Transformers version
                # installed in your environment.
                # ------------------------------------------------

                raw_result = self.classifier(
                    text,
                    truncation=True,
                    max_length=512,
                )

                if not raw_result:
                    continue

                result = raw_result[0]

                # ------------------------------------------------
                # Extract label
                # ------------------------------------------------

                label = str(
                    result.get(
                        "label",
                        "neutral",
                    )
                ).lower()

                # ------------------------------------------------
                # Extract confidence
                # ------------------------------------------------

                confidence = float(
                    result.get(
                        "score",
                        0.0,
                    )
                )

                # ------------------------------------------------
                # Convert sentiment to directional score
                # ------------------------------------------------

                if label == "positive":

                    score = confidence

                elif label == "negative":

                    score = -confidence

                else:

                    label = "neutral"
                    score = 0.0

                results.append(
                    SentimentResult(
                        label=label,
                        confidence=confidence,
                        score=score,
                    )
                )

            except Exception as exc:

                print(
                    "[SENTIMENT ERROR] "
                    f"Could not analyze headline: {exc}"
                )

        # ----------------------------------------------------
        # If all headlines failed
        # ----------------------------------------------------

        if not results:
            return [], 0.0

        # ----------------------------------------------------
        # Overall sentiment score
        # ----------------------------------------------------

        overall_score = (
            sum(
                item.score
                for item in results
            )
            / len(results)
        )

        return (
            results,
            overall_score,
        )


# ============================================================
# Helper function
# ============================================================

def analyze_news(
    headlines: list[Any],
) -> dict:

    analyzer = NewsSentiment()

    results, overall_score = (
        analyzer.analyze(headlines)
    )

    news = []

    # --------------------------------------------------------
    # Build individual news results
    # --------------------------------------------------------

    for headline, result in zip(
        headlines,
        results,
    ):

        if isinstance(headline, dict):

            headline_text = headline.get(
                "title",
                headline.get(
                    "headline",
                    "",
                ),
            )

        else:

            headline_text = str(headline)

        news.append(
            {
                "headline": headline_text,
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
        "sentiment_score": round(
            overall_score,
            4,
        ),
        "sentiment_percentage": round(
            overall_score * 100,
            2,
        ),
        "news": news,
    }