import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
} from "recharts";

function SentimentChart({ sentiment = {} }) {
    const positive = Number(sentiment.positive ?? 0);
    const negative = Number(sentiment.negative ?? 0);
    const neutral = Number(sentiment.neutral ?? 0);

    const data = [
        { name: "Positive", value: positive },
        { name: "Negative", value: negative },
        { name: "Neutral", value: neutral },
    ].filter((item) => item.value > 0);

    const total = positive + negative + neutral;

    if (total === 0) {
        return (
            <div className="chart-container">
                <div className="chart-empty">
                    No sentiment data available.
                </div>
            </div>
        );
    }

    const getPercentage = (value) => {
        return ((value / total) * 100).toFixed(1);
    };

    function CustomTooltip({ active, payload }) {
        if (!active || !payload || payload.length === 0) {
            return null;
        }

        const item = payload[0];

        return (
            <div
                style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    boxShadow: "0 5px 15px rgba(15,23,42,0.10)",
                }}
            >
                <div
                    style={{
                        fontSize: "12px",
                        color: "#64748b",
                        marginBottom: "4px",
                    }}
                >
                    {item.name}
                </div>

                <div
                    style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#172033",
                    }}
                >
                    {Number(item.value).toFixed(3)}
                </div>

                <div
                    style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "2px",
                    }}
                >
                    {getPercentage(item.value)}%
                </div>
            </div>
        );
    }

    const COLORS = {
        Positive: "#16a34a",
        Negative: "#dc2626",
        Neutral: "#94a3b8",
    };

    return (
        <div className="sentiment-chart">
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="75%"
                            paddingAngle={3}
                            stroke="none"
                        >
                            {data.map((entry) => (
                                <Cell
                                    key={entry.name}
                                    fill={COLORS[entry.name]}
                                />
                            ))}
                        </Pie>

                        <Tooltip content={<CustomTooltip />} />

                        <Legend
                            verticalAlign="bottom"
                            height={30}
                            formatter={(value) => (
                                <span
                                    style={{
                                        color: "#475569",
                                        fontSize: "12px",
                                    }}
                                >
                                    {value}
                                </span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                    marginTop: "10px",
                }}
            >
                {data.map((item) => (
                    <div
                        key={item.name}
                        style={{
                            textAlign: "center",
                            padding: "8px",
                            background: "#f8fafc",
                            borderRadius: "8px",
                        }}
                    >
                        <div
                            style={{
                                fontSize: "11px",
                                color: "#64748b",
                                marginBottom: "3px",
                            }}
                        >
                            {item.name}
                        </div>

                        <div
                            style={{
                                fontSize: "16px",
                                fontWeight: 700,
                                color: COLORS[item.name],
                            }}
                        >
                            {getPercentage(item.value)}%
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SentimentChart;
