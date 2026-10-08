function PredictionCard({ prediction = {}, combined = {}, sentiment = {} }) {
    const label = prediction.label || "N/A";
    const probability = Number(prediction.probability ?? 0);
    const combinedScore = Number(combined.score ?? 0);

    const directionClass =
        label.toUpperCase() === "UP"
            ? "positive"
            : label.toUpperCase() === "DOWN"
            ? "negative"
            : "neutral";

    const directionText =
        label.toUpperCase() === "UP"
            ? "↑ UP"
            : label.toUpperCase() === "DOWN"
            ? "↓ DOWN"
            : "→ NEUTRAL";

    const scoreClass =
        combinedScore > 0
            ? "positive"
            : combinedScore < 0
            ? "negative"
            : "neutral";

    const confidence = Math.abs(probability) * 100;

    return (
        <div className="prediction-grid">
            {/* Main Prediction */}
            <div className="prediction-card highlight">
                <div className="card-label">AI Prediction</div>

                <div className={`prediction-direction ${directionClass}`}>
                    {directionText}
                </div>

                <div className={`score ${scoreClass}`}>
                    {combinedScore >= 0 ? "+" : ""}
                    {combinedScore.toFixed(3)}
                </div>

                <div className="card-label">
                    Combined prediction score
                </div>
            </div>

            {/* Model Probability */}
            <div className="prediction-card">
                <div className="card-label">Model Probability</div>

                <div className="probability">
                    {(probability * 100).toFixed(2)}%
                </div>

                <div className="probability-row">
                    <span>Prediction confidence</span>
                    <span>{confidence.toFixed(1)}%</span>
                </div>

                <div className="progress">
                    <div
                        className={`progress-fill ${directionClass}`}
                        style={{
                            width: `${Math.min(confidence, 100)}%`,
                        }}
                    />
                </div>
            </div>

            {/* Sentiment */}
            <div className="prediction-card">
                <div className="card-label">Market Sentiment</div>

                <div
                    className={`sentiment-badge ${
                        sentiment.label?.toLowerCase() || "neutral"
                    }`}
                >
                    {sentiment.label || "Neutral"}
                </div>

                <div className="confidence">
                    Confidence:{" "}
                    {(
                        Number(sentiment.confidence ?? 0) * 100
                    ).toFixed(1)}
                    %
                </div>

                <div className="card-label">
                    Financial news sentiment
                </div>
            </div>
        </div>
    );
}

export default PredictionCard;