import React from "react";

function formatPrice(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    return `$${Number(value).toFixed(2)}`;
}

function formatMarketCap(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    const number = Number(value);

    if (number >= 1e12) {
        return `$${(number / 1e12).toFixed(2)}T`;
    }

    if (number >= 1e9) {
        return `$${(number / 1e9).toFixed(2)}B`;
    }

    if (number >= 1e6) {
        return `$${(number / 1e6).toFixed(2)}M`;
    }

    return `$${number.toLocaleString()}`;
}

function formatPE(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    return Number(value).toFixed(2);
}

function formatDividend(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    // yfinance dividendYield is normally returned as decimal
    return `${(Number(value) * 100).toFixed(2)}%`;
}

function StockMetrics({ metrics }) {
    if (!metrics) {
        return null;
    }

    const cards = [
        {
            label: "Current Price",
            value: formatPrice(metrics.current_price),
        },
        {
            label: "Day High",
            value: formatPrice(metrics.day_high),
        },
        {
            label: "Day Low",
            value: formatPrice(metrics.day_low),
        },
        {
            label: "P/E Ratio",
            value: formatPE(metrics.pe_ratio),
        },
        {
            label: "Market Cap",
            value: formatMarketCap(metrics.market_cap),
        },
        {
            label: "Dividend Yield",
            value: formatDividend(metrics.dividend_yield),
        },
    ];

    return (
        <div className="stock-metrics-grid">
            {cards.map((card) => (
                <div
                    className="stock-metric-card"
                    key={card.label}
                >
                    <div className="stock-metric-label">
                        {card.label}
                    </div>

                    <div className="stock-metric-value">
                        {card.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default StockMetrics;