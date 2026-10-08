function MetricsCard({ metrics = {} }) {
    const accuracy = Number(metrics.accuracy ?? 0);
    const precision = Number(metrics.precision ?? 0);
    const recall = Number(metrics.recall ?? 0);
    const f1 = Number(metrics.f1 ?? metrics.f1_score ?? 0);

    const formatPercentage = (value) => {
        return `${(value * 100).toFixed(2)}%`;
    };

    const metricItems = [
        {
            label: "Accuracy",
            value: accuracy,
        },
        {
            label: "Precision",
            value: precision,
        },
        {
            label: "Recall",
            value: recall,
        },
        {
            label: "F1 Score",
            value: f1,
        },
    ];

    return (
        <div className="metrics-grid">
            {metricItems.map((metric) => (
                <div className="metric-card" key={metric.label}>
                    <div className="metric-label">
                        {metric.label}
                    </div>

                    <div className="metric-value">
                        {formatPercentage(metric.value)}
                    </div>

                    <div className="progress">
                        <div
                            className="progress-fill"
                            style={{
                                width: `${Math.min(
                                    Math.max(metric.value * 100, 0),
                                    100
                                )}%`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default MetricsCard;