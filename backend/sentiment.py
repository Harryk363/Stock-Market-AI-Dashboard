
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from statistics import mean
from typing import Any

from transformers import pipeline


@dataclass
class SentimentResult:
    label: str
    confidence: float
    score: float


class NewsSentiment:
    """
    Financial news sentiment using FinBERT.

    Positive: +confidence
    Negative: -confidence
    Neutral: 0
    """

    def __init__(
        self,
        model_name: str = "ProsusAI/finbert",
    ) -> None:
        self.model_name = model_name

        print(f"[SENTIMENT] Loading model: {model_name}")

        self.classifier = pipeline(
            "text-classification",
            model=model_name,
            tokenizer=model_name,
            device=-1,
        )

        print("[SENTIMENT] FinBERT loaded successfully.")

    def analyze(
        self,
        headlines: list[Any],
    ) -> tuple[list[SentimentResult], float]:

        if not headlines:
            return [], 0.0

        # Keep the original headline for each successfully
        # processed result so metadata stays correctly aligned.
        texts: list[str] = []

        for headline in headlines:
            if isinstance(headline, dict):
                text = headline.get(
                    "title",
                    headline.get("headline", ""),
                )
            else:
                text = str(headline)

            text = str(text).strip()

            if text:
                texts.append(text[:2000])

        if not texts:
            return [], 0.0

        results: list[SentimentResult] = []

        # Small batches reduce temporary inference memory.
        for start in range(0, len(texts), 2):
            batch = texts[start:start + 2]

            try:
                raw_results = self.classifier(
                    batch,
                    batch_size=2,
                    truncation=True,
                    max_length=128,
                )

                for result in raw_results:
                    label = str(
                        result.get("label", "neutral")
                    ).lower()

                    confidence = float(
                        result.get("score", 0.0)
                    )

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
                print(f"[SENTIMENT ERROR] {exc}")

                # Preserve result-to-headline alignment by
                # skipping failed batches entirely.
                continue

        if not results:
            return [], 0.0

        return results, mean(item.score for item in results)


@lru_cache(maxsize=1)
def get_sentiment_analyzer() -> NewsSentiment:
    """Reuse one analyzer within this Python process."""
    return NewsSentiment()


def analyze_news(headlines: list[Any]) -> dict:
    analyzer = get_sentiment_analyzer()
    results, overall_score = analyzer.analyze(headlines)

    # Reconstruct the same normalized headline sequence used
    # during analysis, so failed/empty entries don't misalign.
    valid_headlines = []

    for headline in headlines:
        if isinstance(headline, dict):
            text = headline.get(
                "title",
                headline.get("headline", ""),
            )
        else:
            text = str(headline)

        text = str(text).strip()

        if text:
            valid_headlines.append(text[:2000])

    news = []

    for headline_text, result in zip(valid_headlines, results):
        news.append(
            {
                "headline": headline_text,
                "sentiment": result.label,
                "confidence": round(result.confidence, 4),
                "score": round(result.score, 4),
            }
        )

    return {
        "sentiment_score": round(overall_score, 4),
        "sentiment_percentage": round(overall_score * 100, 2),
        "news": news,
    }
