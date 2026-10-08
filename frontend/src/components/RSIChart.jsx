import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from "recharts";

function RSIChart({ data = [] }) {
    if (!data || data.length === 0) {
        return (
            <div className="chart-container">
                <div className="chart-empty">
                    No RSI data available.
                </div>
            </div>
        );
    }

    const chartData = data
        .filter((item) => item.rsi !== null && item.rsi !== undefined)
        .map((item) => ({
            date: item.date,
            rsi: Number(item.rsi),
        }));

    if (chartData.length === 0) {
        return (
            <div className="chart-container">
                <div className="chart-empty">
                    No RSI data available.
                </div>
            </div>
        );
    }

    function formatDate(value) {
        if (!value) return "";

        const date = new Date(value);

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
        });
    }

    function CustomTooltip({ active, payload, label }) {
        if (!active || !payload || payload.length === 0) {
            return null;
        }

        const rsi = payload[0]?.value;

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
                        fontSize: "11px",
                        color: "#64748b",
                        marginBottom: "4px",
                    }}
                >
                    {label}
                </div>

                <div
                    style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#172033",
                    }}
                >
                    RSI: {Number(rsi).toFixed(2)}
                </div>

                <div
                    style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        marginTop: "3px",
                    }}
                >
                    {Number(rsi) >= 70
                        ? "Overbought"
                        : Number(rsi) <= 30
                        ? "Oversold"
                        : "Neutral"}
                </div>
            </div>
        );
    }

    return (
        <div className="rsi-chart">
            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{
                            top: 10,
                            right: 15,
                            left: 5,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e9edf3"
                            vertical={false}
                        />

                        <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={{
                                fontSize: 10,
                                fill: "#94a3b8",
                            }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={35}
                        />

                        <YAxis
                            domain={[0, 100]}
                            ticks={[0, 30, 50, 70, 100]}
                            tick={{
                                fontSize: 10,
                                fill: "#94a3b8",
                            }}
                            tickLine={false}
                            axisLine={false}
                            width={35}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <ReferenceLine
                            y={70}
                            stroke="#dc2626"
                            strokeDasharray="5 5"
                        />

                        <ReferenceLine
                            y={30}
                            stroke="#16a34a"
                            strokeDasharray="5 5"
                        />

                        <ReferenceLine
                            y={50}
                            stroke="#94a3b8"
                            strokeDasharray="3 3"
                        />

                        <Line
                            type="monotone"
                            dataKey="rsi"
                            name="RSI"
                            stroke="#7c3aed"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "#64748b",
                }}
            >
                <span>Oversold &lt; 30</span>
                <span>Neutral 30–70</span>
                <span>Overbought &gt; 70</span>
            </div>
        </div>
    );
}

export default RSIChart;
