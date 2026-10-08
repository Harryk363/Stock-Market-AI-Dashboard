import React, { useEffect, useState } from "react";
import StockMetrics from "./components/StockMetrics";

import {
    analyzeStock,
    getModels,
    getStockHistory,
    getStockMetrics,
} from "./services/api";

import StockChart from "./components/StockChart";


// ============================================================
// Safe value helpers
// ============================================================

function safeText(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === "string") {
        return value;
    }

    if (
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return String(value);
    }

    // If an unexpected object reaches the frontend,
    // NEVER pass that object directly to React.
    if (typeof value === "object") {

        // Common nested title structure
        if (
            typeof value.title === "string"
        ) {
            return value.title;
        }

        if (
            typeof value.name === "string"
        ) {
            return value.name;
        }

        try {
            return JSON.stringify(value);
        } catch {
            return fallback;
        }
    }

    return fallback;
}


function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function formatPercentage(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "--";
    }

    return `${(
        Number(value) * 100
    ).toFixed(2)}%`;
}


function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "--";
    }

    return Number(value).toFixed(2);
}


function formatMetric(value) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(Number(value))
    ) {
        return "--";
    }

    return `${(
        Number(value) * 100
    ).toFixed(2)}%`;
}


function predictionClass(direction) {

    const value = safeText(
        direction
    ).toUpperCase();

    if (value === "UP") {
        return "positive";
    }

    if (value === "DOWN") {
        return "negative";
    }

    return "neutral";
}


// ============================================================
// News normalization
// ============================================================

function normalizeNews(news) {
    if (!Array.isArray(news)) {
        return [];
    }

    return news.map((item, index) => {

        // Handle old string format
        if (typeof item === "string") {
            return {
                id: index,
                title: item,
                url: null,
                publisher: "Yahoo Finance",
                published_at: null,
                sentiment: null,
                confidence: null,
                score: null,
            };
        }

        // Safety check
        if (!item || typeof item !== "object") {
            return {
                id: index,
                title: "Untitled financial news",
                url: null,
                publisher: "Yahoo Finance",
                published_at: null,
                sentiment: null,
                confidence: null,
                score: null,
            };
        }

        // =====================================================
        // YOUR BACKEND FORMAT
        //
        // {
        //   headline: {
        //      title: "...",
        //      url: "...",
        //      publisher: "...",
        //      published_at: "..."
        //   },
        //   sentiment: "negative",
        //   confidence: 0.9566,
        //   score: -0.9566
        // }
        // =====================================================

        const headline =
            item.headline &&
            typeof item.headline === "object"
                ? item.headline
                : null;

        // Also keep support for raw yfinance format
        const content =
            item.content &&
            typeof item.content === "object"
                ? item.content
                : null;

        // =====================================================
        // TITLE
        // =====================================================

        let title = "Untitled financial news";

        if (
            headline &&
            typeof headline.title === "string" &&
            headline.title.trim()
        ) {
            title = headline.title.trim();

        } else if (
            content &&
            typeof content.title === "string" &&
            content.title.trim()
        ) {
            title = content.title.trim();

        } else if (
            typeof item.title === "string" &&
            item.title.trim()
        ) {
            title = item.title.trim();

        } else if (
            typeof item.headline === "string" &&
            item.headline.trim()
        ) {
            title = item.headline.trim();
        }

        // =====================================================
        // URL
        // =====================================================

        let url = null;

        if (headline?.url) {
            url = headline.url;

        } else if (
            content?.canonicalUrl?.url
        ) {
            url = content.canonicalUrl.url;

        } else if (
            content?.clickThroughUrl?.url
        ) {
            url = content.clickThroughUrl.url;

        } else if (item.url) {
            url = item.url;

        } else if (item.link) {
            url = item.link;
        }

        // =====================================================
        // PUBLISHER
        // =====================================================

        let publisher = "Yahoo Finance";

        if (headline?.publisher) {
            publisher = headline.publisher;

        } else if (
            content?.provider?.displayName
        ) {
            publisher =
                content.provider.displayName;

        } else if (
            content?.provider?.name
        ) {
            publisher =
                content.provider.name;

        } else if (item.publisher) {
            publisher = item.publisher;
        }

        // =====================================================
        // PUBLISHED DATE
        // =====================================================

        let published_at = null;

        if (headline?.published_at) {
            published_at =
                headline.published_at;

        } else if (content?.pubDate) {
            published_at =
                content.pubDate;

        } else if (content?.displayTime) {
            published_at =
                content.displayTime;

        } else if (item.published_at) {
            published_at =
                item.published_at;

        } else if (item.publishedAt) {
            published_at =
                item.publishedAt;

        } else if (item.pubDate) {
            published_at =
                item.pubDate;
        }

        // =====================================================
        // SENTIMENT
        // =====================================================

        let sentiment = null;

        if (
            typeof item.sentiment === "string"
        ) {
            sentiment =
                item.sentiment;

        } else if (
            item.sentiment &&
            typeof item.sentiment === "object"
        ) {
            sentiment =
                item.sentiment.label ||
                item.sentiment.sentiment ||
                null;
        }

        // =====================================================
        // CONFIDENCE
        // =====================================================

        const confidence =
            item.confidence !== undefined &&
            item.confidence !== null
                ? Number(item.confidence)
                : null;

        // =====================================================
        // SCORE
        // =====================================================

        const score =
            item.score !== undefined &&
            item.score !== null
                ? Number(item.score)
                : null;

        // =====================================================
        // NORMALIZED RESULT
        // =====================================================

        return {
            id:
                item.uuid ||
                headline?.uuid ||
                index,

            title,
            url,
            publisher,
            published_at,
            sentiment,
            confidence,
            score,
        };
    });
}




// ============================================================
// App
// ============================================================

function App() {

    // ========================================================
    // State
    // ========================================================

    const [symbol, setSymbol] =
        useState("");

    const [model, setModel] =
        useState("1");

    const [period, setPeriod] =
        useState("5y");

    const [chartPeriod, setChartPeriod] =
    useState("1y");    

    const [models, setModels] =
        useState([]);

    const [analysis, setAnalysis] =
        useState(null);

    const [history, setHistory] =
        useState([]);

    const [recentHistory, setRecentHistory] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [backendOnline, setBackendOnline] =
        useState(true);

    const [metrics, setMetrics] =
        useState(null);


    // ========================================================
    // Load models
    // ========================================================

    useEffect(() => {

        async function loadModels() {

            try {

                const data =
                    await getModels();

                setModels(
                    Array.isArray(data?.models)
                        ? data.models
                        : []
                );

                setBackendOnline(true);

            } catch (err) {

                console.error(
                    "Unable to load models:",
                    err
                );

                setBackendOnline(false);
            }
        }

        loadModels();

    }, []);


    // ========================================================
    // Analyze stock
    // ========================================================
    async function handleChartPeriodChange(newPeriod) {
    const cleanSymbol =
        safeText(symbol)
            .trim()
            .toUpperCase();

    if (!cleanSymbol) {
        return;
    }

    try {
        const historical =
            await getStockHistory(
                cleanSymbol,
                newPeriod
            );

        setHistory(
            Array.isArray(
                historical?.data
            )
                ? historical.data
                : []
        );

        setChartPeriod(newPeriod);

    } catch (err) {
        console.error(
            "Chart history error:",
            err
        );
    }
}


    async function handleAnalyze(event) {

        event.preventDefault();

        const cleanSymbol =
            safeText(symbol)
                .trim()
                .toUpperCase();


        if (!cleanSymbol) {

            setError(
                "Please enter a stock symbol."
            );

            return;
        }


        setLoading(true);
        setError("");


        try {

            // ------------------------------------------------
            // Analysis
            // ------------------------------------------------

            const result =
                await analyzeStock(
                    cleanSymbol,
                    model,
                    period,
                    10
                );


            // ------------------------------------------------
            // Historical data
            // ------------------------------------------------

            const historical =
                await getStockHistory(
                    cleanSymbol,
                    chartPeriod
                );
            const recentHistorical =
                await getStockHistory(
                    cleanSymbol,
                    "1mo"
                );

            const stockMetrics =
                await getStockMetrics(
                    cleanSymbol
                );


            setAnalysis(result);


            setHistory(
                Array.isArray(
                    historical?.data
                )
                    ? historical.data
                    : []
            );

            setRecentHistory(
                Array.isArray(
                    recentHistorical?.data
                )
                    ? recentHistorical.data.slice(-10)
                    : []
            );
            setChartPeriod(chartPeriod);

            setMetrics(stockMetrics);
            


            setBackendOnline(true);

        } catch (err) {

            console.error(
                "Stock analysis error:",
                err
            );

            setError(
                err?.message ??
                "Unable to analyze the stock."
            );

            setAnalysis(null);
            setHistory([]);
            setMetrics(null);

        } finally {

            setLoading(false);
        }
    }

    // ========================================================
    // Render
    // ========================================================

    return (

        <div className="app">

            <style>{`

                * {
                    box-sizing: border-box;
                }

                body {
                    margin: 0;
                    font-family:
                        Inter,
                        -apple-system,
                        BlinkMacSystemFont,
                        "Segoe UI",
                        sans-serif;

                    background: #f4f7fb;
                    color: #172033;
                }

                button,
                input,
                select {
                    font: inherit;
                }

                .app {
                    min-height: 100vh;
                }


                /* ============================================
                   HEADER
                ============================================ */

                .header {
                    background:
                        linear-gradient(
                            135deg,
                            #111827,
                            #1e293b
                        );

                    color: white;

                    padding:
                        22px 40px;

                    display: flex;

                    align-items: center;

                    justify-content:
                        space-between;

                    box-shadow:
                        0 4px 20px
                        rgba(
                            0,
                            0,
                            0,
                            0.12
                        );
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .brand-icon {
                    width: 42px;
                    height: 42px;

                    border-radius: 12px;

                    background:
                        linear-gradient(
                            135deg,
                            #4f46e5,
                            #7c3aed
                        );

                    display: flex;
                    align-items: center;
                    justify-content: center;

                    font-size: 20px;
                    font-weight: 800;
                }

                .brand h1 {
                    margin: 0;
                    font-size: 21px;
                }

                .brand p {
                    margin: 3px 0 0;

                    color: #aeb9ca;

                    font-size: 12px;
                }

                .status {
                    display: flex;
                    align-items: center;

                    gap: 8px;

                    font-size: 13px;

                    color: #cbd5e1;
                }

                .status-dot {
                    width: 9px;
                    height: 9px;

                    border-radius: 50%;

                    background: #22c55e;

                    box-shadow:
                        0 0 10px
                        rgba(
                            34,
                            197,
                            94,
                            0.7
                        );
                }

                .status-dot.offline {
                    background: #ef4444;

                    box-shadow:
                        0 0 10px
                        rgba(
                            239,
                            68,
                            68,
                            0.7
                        );
                }


                /* ============================================
                   CONTAINER
                ============================================ */

                .container {
                    max-width: 1450px;

                    margin: 0 auto;

                    padding:
                        32px 30px 50px;
                }


                /* ============================================
                   SEARCH
                ============================================ */

                .search-panel {
                    background: white;

                    border:
                        1px solid #e5eaf1;

                    border-radius: 16px;

                    padding: 22px;

                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.05
                        );

                    margin-bottom: 24px;
                }

                .search-title {
                    margin:
                        0 0 5px;

                    font-size: 18px;

                    font-weight: 700;
                }

                .search-subtitle {
                    margin:
                        0 0 20px;

                    color: #64748b;

                    font-size: 13px;
                }

                .search-form {
                    display: grid;

                    grid-template-columns:
                        1.4fr
                        1fr
                        1fr
                        auto;

                    gap: 12px;

                    align-items: end;
                }

                .field {
                    display: flex;

                    flex-direction: column;

                    gap: 7px;
                }

                .field label {
                    font-size: 12px;

                    font-weight: 600;

                    color: #475569;
                }

                .field input,
                .field select {
                    width: 100%;

                    height: 44px;

                    border:
                        1px solid #dbe2ea;

                    border-radius: 10px;

                    padding:
                        0 13px;

                    outline: none;

                    background: white;

                    color: #172033;
                }

                .field input:focus,
                .field select:focus {
                    border-color:
                        #6366f1;

                    box-shadow:
                        0 0 0 3px
                        rgba(
                            99,
                            102,
                            241,
                            0.1
                        );
                }

                .analyze-button {
                    height: 44px;

                    border: none;

                    border-radius: 10px;

                    padding:
                        0 25px;

                    background:
                        linear-gradient(
                            135deg,
                            #4f46e5,
                            #7c3aed
                        );

                    color: white;

                    font-weight: 700;

                    cursor: pointer;
                }

                .analyze-button:disabled {
                    opacity: 0.6;

                    cursor: not-allowed;
                }


                /* ============================================
                   ERROR
                ============================================ */

                .error {
                    margin-top: 14px;

                    padding:
                        12px 14px;

                    border-radius: 9px;

                    background:
                        #fef2f2;

                    border:
                        1px solid #fecaca;

                    color: #b91c1c;

                    font-size: 13px;
                }


                /* ============================================
                   EMPTY STATE
                ============================================ */

                .empty-state {
                    background: white;

                    border:
                        1px solid #e5eaf1;

                    border-radius: 16px;

                    padding:
                        70px 30px;

                    text-align: center;

                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .empty-icon {
                    font-size: 42px;

                    margin-bottom: 12px;
                }

                .empty-state h2 {
                    margin:
                        0 0 8px;

                    font-size: 21px;
                }

                .empty-state p {
                    margin: 0;

                    color: #64748b;

                    font-size: 14px;
                }


                /* ============================================
                   SECTION
                ============================================ */

                .section-title {
                    margin:
                        26px 0 14px;

                    font-size: 17px;

                    font-weight: 700;
                }


                /* ============================================
                   OVERVIEW
                ============================================ */

                .overview-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(4, 1fr);

                    gap: 14px;
                }

                .metric-card {
                    background: white;

                    border:
                        1px solid #e5eaf1;

                    border-radius: 14px;

                    padding: 18px;

                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .metric-label {
                    font-size: 12px;

                    color: #64748b;

                    margin-bottom: 9px;
                }

                .metric-value {
                    font-size: 24px;

                    font-weight: 750;

                    color: #172033;
                }

                .metric-small {
                    margin-top: 5px;

                    font-size: 11px;

                    color: #94a3b8;
                }


                /* ============================================
                   PREDICTION
                ============================================ */

                .prediction-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(3, 1fr);

                    gap: 16px;
                }

                .prediction-card {
                    background: white;

                    border:
                        1px solid #e5eaf1;

                    border-radius: 16px;

                    padding: 22px;

                    min-height: 170px;

                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .prediction-card.highlight {
                    border:
                        1px solid #c7d2fe;

                    background:
                        linear-gradient(
                            135deg,
                            #ffffff,
                            #f5f3ff
                        );
                }
                
                .prediction-explanation {
                    margin-top: 14px;

                    background: #ffffff;

                    border:
                        1px solid #e5eaf1;

                    border-radius: 16px;

                    padding: 18px;

    box-shadow:
        0 5px 20px
        rgba(
            15,
            23,
            42,
            0.04
        );
}

.explanation-title {
    font-size: 14px;

    font-weight: 700;

    color: #172033;

    margin-bottom: 7px;

}
    

.explanation-text {
    font-size: 12px;

    line-height: 1.6;

    color: #64748b;

    margin-bottom: 15px;
}

.explanation-breakdown {
    display: grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap: 10px;
}

.explanation-breakdown div {
    background: #f8fafc;

    border-radius: 9px;

    padding: 11px 12px;

    display: flex;

    flex-direction: column;

    gap: 5px;
}

.explanation-breakdown span {
    font-size: 10px;

    color: #94a3b8;
}

.explanation-breakdown strong {
    font-size: 14px;

    color: #172033;
}
                        

                

                .card-label {
                    color: #64748b;

                    font-size: 12px;

                    font-weight: 600;

                    text-transform:
                        uppercase;

                    letter-spacing:
                        0.05em;
                }

                .prediction-direction {
                    font-size: 34px;

                    font-weight: 800;

                    margin:
                        14px 0 5px;
                }

                .prediction-direction.positive {
                    color: #16a34a;
                }

                .prediction-direction.negative {
                    color: #dc2626;
                }

                .prediction-direction.neutral {
                    color: #64748b;
                }

                .prediction-description {
                    font-size: 12px;

                    color: #64748b;
                }

                .score {
                    font-size: 30px;

                    font-weight: 800;

                    margin-top: 14px;
                }

                .score.positive {
                    color: #16a34a;
                }

                .score.negative {
                    color: #dc2626;
                }

                .probability {
                    margin-top: 18px;
                }

                .probability-row {
                    display: flex;

                    justify-content:
                        space-between;

                    font-size: 12px;

                    margin-bottom: 7px;
                }

                .progress {
                    height: 8px;

                    background: #edf1f5;

                    border-radius: 99px;

                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;

                    background:
                        linear-gradient(
                            90deg,
                            #4f46e5,
                            #7c3aed
                        );

                    border-radius: 99px;
                }


                /* ============================================
                   DASHBOARD
                ============================================ */

                .dashboard-grid {
                    display: grid;

                    grid-template-columns:
                        2fr 1fr;

                    gap: 16px;

                    margin-top: 16px;
                }

                .panel {
                    background: white;

                    border:
                        1px solid #e5eaf1;

                    border-radius: 16px;

                    padding: 20px;

                    box-shadow:
                        0 5px 20px
                        rgba(
                            15,
                            23,
                            42,
                            0.04
                        );
                }

                .panel-header {
                    display: flex;

                    justify-content:
                        space-between;

                    align-items: center;

                    margin-bottom: 18px;
                }

                .panel-title {
                    margin: 0;

                    font-size: 15px;

                    font-weight: 700;
                }

                .panel-subtitle {
                    color: #94a3b8;

                    font-size: 11px;
                }


                .historical-data-panel {
                    margin-top: 18px;
                }

                .historical-table-wrapper {
                    width: 100%;
                    overflow-x: auto;
                }

                .historical-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }

                .historical-table th {
                    background: #4f46e5;
                    color: #ffffff;
                    padding: 11px 12px;
                    text-align: right;
                    font-weight: 600;
                }

                .historical-table th:first-child {
                    text-align: left;
                }

                .historical-table td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #eef2f7;
                    color: #475569;
                    text-align: right;
                    white-space: nowrap;
                }

                .historical-table td:first-child {
                    text-align: left;
                    color: #64748b;
                }

                .historical-table tbody tr:hover {
                    background: #f8fafc;
                }


                /* ============================================
                   CHART
                ============================================ */

                .chart-container {
                    height: 300px;

                    position: relative;

                    overflow: hidden;

                    border-radius: 10px;

                    background:
                        linear-gradient(
                            to bottom,
                            #fafbff,
                            #ffffff
                        );
                }

                .chart-empty {
                    height: 100%;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    color: #94a3b8;

                    font-size: 13px;
                }


                /* ============================================
                   STOCK METRICS
                ============================================ */

                .stock-metrics-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(6, minmax(0, 1fr));

                    gap: 12px;

                    margin-top: 16px;

                    margin-bottom: 16px;
                }

                .stock-metric-card {
                    background: #ffffff;

                    border:
                        1px solid #e6eaf0;

                    border-radius: 14px;

                    padding: 18px 16px;

                    min-height: 100px;

                    display: flex;

                    flex-direction: column;

                    justify-content: center;
                }

                .stock-metric-label {
                    font-size: 12px;

                    color: #7b8494;

                    margin-bottom: 8px;
                }

                .stock-metric-value {
                    font-size: 20px;

                    font-weight: 700;

                    color: #18212f;
                }


                /* ============================================
                   METRICS
                ============================================ */

                .metrics-grid {
                    display: grid;

                    grid-template-columns:
                        repeat(2, 1fr);

                    gap: 12px;
                }

                .performance {
                    padding: 14px;

                    border-radius: 10px;

                    background: #f8fafc;
                }

                .performance-label {
                    color: #64748b;

                    font-size: 11px;

                    margin-bottom: 5px;
                }

                .performance-value {
                    font-size: 20px;

                    font-weight: 750;
                }


                /* ============================================
                   NEWS
                   ============================================ */

                .news-list {
                    display: flex;

                    flex-direction: column;

                    gap: 10px;
                }

                .news-item {
                    padding: 13px;

                    border:
                        1px solid #edf1f5;

                    border-radius: 10px;

                    background: #fbfcfe;
                }

                .news-headline {
                    font-size: 13px;

                    line-height: 1.45;

                    color: #273449;

                    margin-bottom: 8px;
                }

                .news-headline a {
                    color: #273449;

                    text-decoration: none;
                }

                .news-headline a:hover {
                    color: #4f46e5;
                }

                .news-meta {
                    display: flex;

                    justify-content:
                        space-between;

                    align-items: center;

                    gap: 10px;

                    flex-wrap: wrap;
                }

                .news-publisher {
                    font-size: 10px;

                    color: #64748b;
                }

                .news-date {
                    font-size: 10px;

                    color: #94a3b8;
                }

                .sentiment-badge {
                    padding:
                        4px 8px;

                    border-radius: 6px;

                    font-size: 10px;

                    font-weight: 700;

                    text-transform:
                        uppercase;
                }

                .sentiment-badge.positive {
                    background: #dcfce7;

                    color: #15803d;
                }

                .sentiment-badge.negative {
                    background: #fee2e2;

                    color: #b91c1c;
                }

                .sentiment-badge.neutral {
                    background: #f1f5f9;

                    color: #475569;
                }

                .confidence {
                    font-size: 10px;

                    color: #94a3b8;
                }




                /* ============================================
                   DISCLAIMER
                ============================================ */

                .disclaimer {
                    margin-top: 25px;

                    text-align: center;

                    color: #94a3b8;

                    font-size: 11px;
                }


                /* ============================================
                   RESPONSIVE
                ============================================ */

                @media (max-width: 1000px) {

                    .search-form {
                        grid-template-columns:
                            1fr 1fr;
                    }

                    .overview-grid {
                        grid-template-columns:
                            repeat(2, 1fr);
                    }

                    .prediction-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .dashboard-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .stock-metrics-grid {
                        grid-template-columns:
                            repeat(3, minmax(0, 1fr));
                    }
                }


                @media (max-width: 650px) {

                    .header {
                        padding:
                            18px 20px;
                    }

                    .container {
                        padding:
                            20px 15px 40px;
                    }

                    .search-form {
                        grid-template-columns:
                            1fr;
                    }

                    .overview-grid {
                        grid-template-columns:
                            1fr;
                    }

                    .stock-metrics-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .status {
                        display: none;
                    }
                }

            `}</style>


            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className="header">

                <div className="brand">

                    <div className="brand-icon">
                        AI
                    </div>

                    <div>

                        <h1>
                            Stock Market AI
                        </h1>

                        <p>
                            ML prediction & financial
                            sentiment analytics
                        </p>

                    </div>

                </div>


                <div className="status">

                    <span
                        className={
                            `status-dot ${
                                !backendOnline
                                    ? "offline"
                                    : ""
                            }`
                        }
                    />

                    {
                        backendOnline
                            ? "Backend connected"
                            : "Backend offline"
                    }

                </div>

            </header>


            {/* =====================================================
                MAIN
            ===================================================== */}

            <main className="container">


                {/* =================================================
                    SEARCH
                ================================================= */}

                <section className="search-panel">

                    <h2 className="search-title">
                        Market Analysis
                    </h2>

                    <p className="search-subtitle">
                        Select a stock and prediction
                        model to generate an AI-powered
                        market analysis.
                    </p>


                    <form
                        className="search-form"
                        onSubmit={handleAnalyze}
                    >

                        <div className="field">

                            <label htmlFor="symbol">
                                Stock Symbol
                            </label>

                            <input
                                id="symbol"
                                type="text"
                                value={symbol}
                                onChange={
                                    (event) =>
                                        setSymbol(
                                            event
                                                .target
                                                .value
                                                .toUpperCase()
                                        )
                                }
                                placeholder="e.g. AAPL, GOOGL, NVDA, TSLA"
                                autoComplete="off"
                            />

                        </div>


                        <div className="field">

                            <label htmlFor="model">
                                Prediction Model
                            </label>

                            <select
                                id="model"
                                value={model}
                                onChange={
                                    (event) =>
                                        setModel(
                                            event
                                                .target
                                                .value
                                        )
                                }
                            >

                                {
                                    models.length > 0

                                        ? models.map(
                                            (item) => (

                                                <option
                                                    key={
                                                        safeText(
                                                            item.id
                                                        )
                                                    }
                                                    value={
                                                        safeText(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    {
                                                        safeText(
                                                            item.name,
                                                            "Model"
                                                        )
                                                    }
                                                </option>

                                            )
                                        )

                                        : (
                                            <>
                                                <option value="1">
                                                    XGBoost
                                                </option>

                                                <option value="2">
                                                    LightGBM
                                                </option>

                                                <option value="3">
                                                    Random Forest
                                                </option>
                                            </>
                                        )
                                }

                            </select>

                        </div>


                        <div className="field">

                            <label htmlFor="period">
                                Historical Period
                            </label>

                            <select
                                id="period"
                                value={period}
                                onChange={
                                    (event) =>
                                        setPeriod(
                                            event
                                                .target
                                                .value
                                        )
                                }
                            >

                                <option value="1y">
                                    1 Year
                                </option>

                                <option value="2y">
                                    2 Years
                                </option>

                                <option value="5y">
                                    5 Years
                                </option>

                                <option value="10y">
                                    10 Years
                                </option>

                            </select>

                        </div>


                        <button
                            className="analyze-button"
                            type="submit"
                            disabled={loading}
                        >

                            {
                                loading
                                    ? "Analyzing..."
                                    : "Analyze Stock"
                            }

                        </button>

                    </form>


                    {
                        error && (

                            <div className="error">
                                {
                                    safeText(
                                        error
                                    )
                                }
                            </div>

                        )
                    }

                </section>


                {/* =================================================
                    EMPTY STATE
                ================================================= */}

                {
                    !analysis &&
                    !loading && (

                        <section className="empty-state">

                            <div className="empty-icon">
                                📈
                            </div>

                            <h2>
                                Ready to analyze the market
                            </h2>

                            <p>
                                Enter a stock symbol above
                                and click Analyze Stock
                                to begin.
                            </p>

                        </section>

                    )
                }


                {/* =================================================
                    LOADING
                ================================================= */}

                {
                    loading && (

                        <section className="empty-state">

                            <div className="empty-icon">
                                ⏳
                            </div>

                            <h2>
                                Analyzing{" "}
                                {
                                    safeText(
                                        symbol
                                    )
                                }...
                            </h2>

                            <p>
                                Downloading market data,
                                running the ML model and
                                analyzing financial news
                                with FinBERT.
                            </p>

                        </section>

                    )
                }


                {/* =================================================
                    RESULTS
                ================================================= */}

                {
                    analysis &&
                    !loading && (

                        <>

                            {/* =====================================
                                MARKET OVERVIEW
                            ===================================== */}

                            <h2 className="section-title">

                                {
                                    safeText(
                                        analysis.symbol,
                                        symbol
                                    )
                                }

                                {" "}Market Overview

                            </h2>


                            <div className="overview-grid">


                                <MetricCard
                                    label="Latest Close"
                                    value={
                                        formatPrice(
                                            analysis
                                                ?.latest_price
                                                ?.close
                                        )
                                    }
                                    small="Latest market price"
                                />


                                <MetricCard
                                    label="MA10"
                                    value={
                                        formatPrice(
                                            analysis
                                                ?.latest_price
                                                ?.ma10
                                        )
                                    }
                                    small="10-day moving average"
                                />


                                <MetricCard
                                    label="RSI"
                                    value={
                                        formatPrice(
                                            analysis
                                                ?.latest_price
                                                ?.rsi
                                        )
                                    }
                                    small="14-period RSI"
                                />


                                <MetricCard
                                    label="Model"
                                    value={
                                        safeText(
                                            analysis
                                                ?.model
                                                ?.name,
                                            "--"
                                        )
                                    }
                                    small="Selected prediction model"
                                />

                            </div>


                            {/* =====================================
                                STOCK FUNDAMENTALS
                            ===================================== */}

                            <StockMetrics
                                metrics={metrics}
                            />


                            {/* =====================================
                                AI PREDICTION
                            ===================================== */}

                            <h2 className="section-title">
                                AI Prediction
                            </h2>


                            <div className="prediction-grid">


                                {/* Model */}

                                <div className="prediction-card">

                                    <div className="card-label">
                                        Model Signal
                                    </div>

                                    <div
                                        className={
                                            `prediction-direction ${
                                                predictionClass(
                                                    analysis
                                                        ?.prediction
                                                        ?.direction
                                                )
                                            }`
                                        }
                                    >
                                        {
                                            safeText(
                                                analysis
                                                    ?.prediction
                                                    ?.direction,
                                                "--"
                                            )
                                        }
                                    </div>

                                    <div className="prediction-description">

                                        {
                                            safeText(
                                                analysis
                                                    ?.model
                                                    ?.name,
                                                "ML model"
                                            )
                                        }

                                        {" "}prediction

                                    </div>


                                    <div className="probability">

                                        <div className="probability-row">

                                            <span>
                                                UP probability
                                            </span>

                                            <strong>

                                                {
                                                    formatPercentage(
                                                        analysis
                                                            ?.prediction
                                                            ?.up_probability
                                                    )
                                                }

                                            </strong>

                                        </div>


                                        <div className="progress">

                                            <div
                                                className="progress-fill"
                                                style={{
                                                    width:
                                                        `${
                                                            Math.max(
                                                                0,
                                                                Math.min(
                                                                    100,
                                                                    safeNumber(
                                                                        analysis
                                                                            ?.prediction
                                                                            ?.up_probability
                                                                    ) * 100
                                                                )
                                                            )
                                                        }%`,
                                                }}
                                            />

                                        </div>

                                    </div>

                                </div>


                                {/* Sentiment */}

                                <div className="prediction-card">

                                    <div className="card-label">
                                        News Sentiment
                                    </div>

                                    <div
                                        className={
                                            `score ${
                                                safeNumber(
                                                    analysis
                                                        ?.sentiment
                                                        ?.score
                                                ) >= 0
                                                    ? "positive"
                                                    : "negative"
                                            }`
                                        }
                                    >

                                        {
                                            safeNumber(
                                                analysis
                                                    ?.sentiment
                                                    ?.score
                                            ) >= 0
                                                ? "+"
                                                : ""
                                        }

                                        {
                                            (
                                                safeNumber(
                                                    analysis
                                                        ?.sentiment
                                                        ?.score
                                                ) * 100
                                            ).toFixed(2)
                                        }%

                                    </div>

                                    <div className="prediction-description">
                                        FinBERT sentiment score
                                    </div>

                                </div>


                                {/* Combined */}

                                <div className="prediction-card highlight">

                                    <div className="card-label">
                                        Combined Signal
                                    </div>

                                    <div
                                        className={
                                            `prediction-direction ${
                                                predictionClass(
                                                    analysis
                                                        ?.combined
                                                        ?.direction
                                                )
                                            }`
                                        }
                                    >
                                        {
                                            safeText(
                                                analysis
                                                    ?.combined
                                                    ?.direction,
                                                "--"
                                            )
                                        }
                                    </div>


                                    <div
                                        className={
                                            `score ${
                                                safeNumber(
                                                    analysis
                                                        ?.combined
                                                        ?.score
                                                ) >= 0
                                                    ? "positive"
                                                    : "negative"
                                            }`
                                        }
                                    >

                                        {
                                            safeNumber(
                                                analysis
                                                    ?.combined
                                                    ?.score
                                            ) >= 0
                                                ? "+"
                                                : ""
                                        }

                                        {
                                            (
                                                safeNumber(
                                                    analysis
                                                        ?.combined
                                                        ?.score
                                                ) * 100
                                            ).toFixed(2)
                                        }%

                                    </div>


                                    <div className="prediction-description">
                                        70% ML model + 30% sentiment
                                    </div>

                                </div>

                            </div>                            


                            {/* =====================================
                                PREDICTION EXPLANATION
                            ===================================== */}

                            <div className="prediction-explanation">

                                <div className="explanation-title">
                                    Why is the final prediction{" "}
                                    {safeText(
                                        analysis?.combined?.direction,
                                        "--"
                                    )}?
                                </div>

                                <div className="explanation-text">

                                    {safeNumber(
                                        analysis?.sentiment?.score
                                    ) >= 0

                                        ? "News sentiment is positive and supports an UP movement, but the ML model has a stronger bearish signal."

                                        : "News sentiment is negative and supports a DOWN movement, strengthening the ML model signal."
                                    }

                                </div>


                                <div className="explanation-breakdown">

                                    <div>
                                        <span>
                                            ML model contribution
                                        </span>

                                        <strong>
                                            {(
                                                (
                                                    safeNumber(
                                                        analysis
                                                            ?.prediction
                                                            ?.up_probability
                                                    ) * 2
                                                ) - 1
                                            ) * 70
                                            }%
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            News contribution
                                        </span>

                                        <strong>
                                            {(
                                                safeNumber(
                                                    analysis
                                                        ?.sentiment
                                                        ?.score
                                                ) * 30
                                            ).toFixed(2)}%
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Combined signal
                                        </span>

                                        <strong>
                                            {(
                                                safeNumber(
                                                    analysis
                                                        ?.combined
                                                        ?.score
                                                ) * 100
                                            ).toFixed(2)}%
                                        </strong>
                                    </div>

                                </div>

                            </div>


                            {/* =====================================
                                CHART + PERFORMANCE
                            ===================================== */}

                            


                            {/* =====================================
                                CHART + PERFORMANCE
                            ===================================== */}

                            <div className="dashboard-grid">


                                {/* Chart */}

                                <div className="panel">

                                    <div className="panel-header">

                                        <div>

                                            <h3 className="panel-title">
                                                
                                            </h3>

                                            <div className="panel-subtitle">

                                                {
                                                    safeText(
                                                        analysis.symbol,
                                                        symbol
                                                    )
                                                }

                                                {" · "}

                                                {
                                                    safeText(
                                                        chartPeriod
                                                    )
                                                }

                                            </div>

                                        </div>


                                        <div className="panel-subtitle">

                                            {history.length}
                                            {" "}data points

                                        </div>

                                    </div>


                                    <StockChart
                                        data={
                                            Array.isArray(history)
                                                ? history
                                                : []
                                        }
                                        symbol={
                                            safeText(
                                                analysis.symbol,
                                                symbol
                                            )
                                        }
                                        chartPeriod={chartPeriod}
                                        onChartPeriodChange={
                                            handleChartPeriodChange
                                        }
                                    />

                                    </div>


                                {/* Performance */}

                                <div className="panel">

                                    <div className="panel-header">

                                        <div>

                                            <h3 className="panel-title">
                                                Model Performance
                                            </h3>

                                            <div className="panel-subtitle">
                                                Historical test data
                                            </div>

                                        </div>

                                    </div>


                                    <div className="metrics-grid">

                                        <PerformanceMetric
                                            label="Accuracy"
                                            value={
                                                analysis
                                                    ?.metrics
                                                    ?.accuracy
                                            }
                                        />

                                        <PerformanceMetric
                                            label="Precision"
                                            value={
                                                analysis
                                                    ?.metrics
                                                    ?.precision
                                            }
                                        />

                                        <PerformanceMetric
                                            label="Recall"
                                            value={
                                                analysis
                                                    ?.metrics
                                                    ?.recall
                                            }
                                        />

                                        <PerformanceMetric
                                            label="F1 Score"
                                            value={
                                                analysis
                                                    ?.metrics
                                                    ?.f1_score
                                            }
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* =====================================
                                RECENT HISTORICAL DATA
                            ===================================== */}

                            <div className="panel historical-data-panel">

                                <div className="panel-header">

                                    <div>

                                        <h3 className="panel-title">
                                            Historical Data
                                        </h3>

                                        <div className="panel-subtitle">
                                            Latest 10 trading days
                                        </div>

                                    </div>

                                </div>


                                <div className="historical-table-wrapper">

                                    <table className="historical-table">

                                        <thead>

                                            <tr>

                                                <th>Date</th>
                                                <th>Open</th>
                                                <th>Close</th>
                                                <th>High</th>
                                                <th>Low</th>
                                                <th>Volume</th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {recentHistory
                                                .slice()
                                                .reverse()
                                                .map((row, index) => (

                                                    <tr key={index}>

                                                        <td>
                                                            {row.Date}
                                                        </td>

                                                        <td>
                                                            ${Number(row.Open).toFixed(2)}
                                                        </td>

                                                        <td>
                                                            ${Number(row.Close).toFixed(2)}
                                                        </td>

                                                        <td>
                                                            ${Number(row.High).toFixed(2)}
                                                        </td>

                                                        <td>
                                                            ${Number(row.Low).toFixed(2)}
                                                        </td>

                                                        <td>
                                                            {Number(
                                                                row.Volume
                                                            ).toLocaleString()}
                                                        </td>

                                                    </tr>

                                                ))}

                                        </tbody>

                                    </table>

                                </div>

                            </div>


                            {/* =====================================
                                NEWS
                            ===================================== */}

                            <NewsSection
                                news={
                                    normalizeNews(
                                        analysis?.news
                                    )
                                }
                                newsCount={
                                    safeNumber(
                                        analysis
                                            ?.news_count,
                                        null
                                    )
                                }
                            />


                            {/* =====================================
                                DISCLAIMER
                            ===================================== */}

                            <div className="disclaimer">

                                {
                                    safeText(
                                        analysis
                                            ?.disclaimer,

                                        "This is an educational prediction and is not financial advice."
                                    )
                                }

                            </div>

                        </>

                    )
                }

            </main>

        </div>
    );
}


// ============================================================
// Metric Card
// ============================================================

function MetricCard({
    label,
    value,
    small,
}) {

    return (

        <div className="metric-card">

            <div className="metric-label">
                {label}
            </div>

            <div className="metric-value">
                {
                    safeText(
                        value,
                        "--"
                    )
                }
            </div>

            <div className="metric-small">
                {small}
            </div>

        </div>
    );
}


// ============================================================
// Performance Metric
// ============================================================

function PerformanceMetric({
    label,
    value,
}) {

    return (

        <div className="performance">

            <div className="performance-label">
                {label}
            </div>

            <div className="performance-value">
                {
                    formatMetric(
                        value
                    )
                }
            </div>

        </div>
    );
}


// ============================================================
// News Section
// ============================================================
function NewsSection({ news = [], newsCount = null }) {
    const safeNews = Array.isArray(news) ? news : [];

    // Extract a text value safely
    const textValue = (value) => {
        if (value === null || value === undefined) {
            return "";
        }

        if (typeof value === "string" || typeof value === "number") {
            return String(value);
        }

        return "";
    };

    // Get the real headline from all possible backend formats
    const getTitle = (item) => {
        if (!item) {
            return "Untitled financial news";
        }

        // If item itself is a string
        if (typeof item === "string") {
            return item;
        }

        // yfinance format:
        // {
        //   content: {
        //      title: "Actual headline"
        //   }
        // }
        if (
            item.content &&
            typeof item.content === "object" &&
            typeof item.content.title === "string" &&
            item.content.title.trim()
        ) {
            return item.content.title.trim();
        }

        // Normal backend format
        if (
            typeof item.title === "string" &&
            item.title.trim()
        ) {
            return item.title.trim();
        }

        // Other possible formats
        if (
            typeof item.headline === "string" &&
            item.headline.trim()
        ) {
            return item.headline.trim();
        }

        if (
            typeof item.news_title === "string" &&
            item.news_title.trim()
        ) {
            return item.news_title.trim();
        }

        if (
            typeof item.article_title === "string" &&
            item.article_title.trim()
        ) {
            return item.article_title.trim();
        }

        // Nested article/news formats
        if (
            item.article &&
            typeof item.article === "object"
        ) {
            if (
                typeof item.article.title === "string" &&
                item.article.title.trim()
            ) {
                return item.article.title.trim();
            }

            if (
                typeof item.article.headline === "string" &&
                item.article.headline.trim()
            ) {
                return item.article.headline.trim();
            }
        }

        if (
            item.news &&
            typeof item.news === "object"
        ) {
            if (
                typeof item.news.title === "string" &&
                item.news.title.trim()
            ) {
                return item.news.title.trim();
            }

            if (
                typeof item.news.headline === "string" &&
                item.news.headline.trim()
            ) {
                return item.news.headline.trim();
            }
        }

        return "Untitled financial news";
    };

    // Get article URL
    const getUrl = (item) => {
        if (!item || typeof item !== "object") {
            return "";
        }

        // yfinance format
        if (
            item.content &&
            typeof item.content === "object"
        ) {
            if (
                item.content.canonicalUrl &&
                typeof item.content.canonicalUrl === "object" &&
                item.content.canonicalUrl.url
            ) {
                return textValue(item.content.canonicalUrl.url);
            }

            if (
                item.content.clickThroughUrl &&
                typeof item.content.clickThroughUrl === "object" &&
                item.content.clickThroughUrl.url
            ) {
                return textValue(item.content.clickThroughUrl.url);
            }
        }

        if (item.url) {
            return textValue(item.url);
        }

        if (item.link) {
            return textValue(item.link);
        }

        return "";
    };

    // Get publisher
    const getPublisher = (item) => {
        if (!item || typeof item !== "object") {
            return "Yahoo Finance";
        }

        // yfinance format
        if (
            item.content &&
            typeof item.content === "object" &&
            item.content.provider &&
            typeof item.content.provider === "object"
        ) {
            if (item.content.provider.displayName) {
                return textValue(
                    item.content.provider.displayName
                );
            }

            if (item.content.provider.name) {
                return textValue(
                    item.content.provider.name
                );
            }
        }

        if (item.publisher) {
            return textValue(item.publisher);
        }

        if (typeof item.provider === "string") {
            return item.provider;
        }

        if (
            item.provider &&
            typeof item.provider === "object"
        ) {
            return textValue(
                item.provider.displayName ||
                item.provider.name
            );
        }

        return "Yahoo Finance";
    };

    // Get publication date
    const getPublishedAt = (item) => {
        if (!item || typeof item !== "object") {
            return "";
        }

        // yfinance format
        if (
            item.content &&
            typeof item.content === "object"
        ) {
            if (item.content.pubDate) {
                return textValue(item.content.pubDate);
            }

            if (item.content.displayTime) {
                return textValue(item.content.displayTime);
            }
        }

        if (item.published_at) {
            return textValue(item.published_at);
        }

        if (item.publishedAt) {
            return textValue(item.publishedAt);
        }

        if (item.pubDate) {
            return textValue(item.pubDate);
        }

        // Older Yahoo Finance format
        if (
            typeof item.providerPublishTime === "number"
        ) {
            return new Date(
                item.providerPublishTime * 1000
            ).toISOString();
        }

        return "";
    };

    // Get sentiment
    const getSentiment = (item) => {
        if (!item || typeof item !== "object") {
            return "";
        }

        if (typeof item.sentiment === "string") {
            return item.sentiment;
        }

        if (
            item.sentiment &&
            typeof item.sentiment === "object"
        ) {
            return textValue(
                item.sentiment.label ||
                item.sentiment.sentiment
            );
        }

        return "";
    };

    return (
        <div
            className="panel"
            style={{
                marginTop: "16px",
            }}
        >
            <div className="panel-header">
                <div>
                    <h3 className="panel-title">
                        Recent Financial News
                    </h3>

                    <div className="panel-subtitle">
                        FinBERT sentiment analysis
                    </div>
                </div>

                <div className="panel-subtitle">
                    {newsCount !== null
                        ? newsCount
                        : safeNews.length}{" "}
                    headlines
                </div>
            </div>

            <div className="news-list">
                {safeNews.length === 0 ? (
                    <div className="chart-empty">
                        No recent news available.
                    </div>
                ) : (
                    safeNews.map((item, index) => {
                        const title = getTitle(item);
                        const url = getUrl(item);
                        const publisher =
                            getPublisher(item);
                        const publishedAt =
                            getPublishedAt(item);

                        const sentiment =
                            getSentiment(item)
                                .toLowerCase();

                        let formattedDate = "";

                        if (publishedAt) {
                            const date =
                                new Date(publishedAt);

                            if (
                                !Number.isNaN(
                                    date.getTime()
                                )
                            ) {
                                formattedDate =
                                    date.toLocaleString(
                                        "en-GB",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }
                                    );
                            }
                        }

                        let sentimentClass =
                            "neutral";

                        if (
                            sentiment === "positive"
                        ) {
                            sentimentClass =
                                "positive";
                        }

                        if (
                            sentiment === "negative"
                        ) {
                            sentimentClass =
                                "negative";
                        }

                        let confidence = null;

                        if (
                            item &&
                            typeof item ===
                                "object" &&
                            item.confidence !==
                                null &&
                            item.confidence !==
                                undefined
                        ) {
                            const number =
                                Number(
                                    item.confidence
                                );

                            if (
                                Number.isFinite(
                                    number
                                )
                            ) {
                                confidence = number;
                            }
                        }

                        return (
                            <div
                                className="news-item"
                                key={`news-${index}`}
                            >
                                <div className="news-headline">
                                    {url ? (
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {title}
                                        </a>
                                    ) : (
                                        title
                                    )}
                                </div>

                                <div className="news-meta">
                                    <div>
                                        <span className="news-publisher">
                                            {publisher}
                                        </span>

                                        {formattedDate && (
                                            <>
                                                <span>
                                                    {" · "}
                                                </span>

                                                <span className="news-date">
                                                    {
                                                        formattedDate
                                                    }
                                                </span>
                                            </>
                                        )}
                                    </div>

                                    {sentiment && (
                                        <span
                                            className={`sentiment-badge ${sentimentClass}`}
                                        >
                                            {sentiment}
                                        </span>
                                    )}

                                    {confidence !==
                                        null && (
                                        <span className="confidence">
                                            Confidence:{" "}
                                            {(
                                                confidence *
                                                100
                                            ).toFixed(2)}
                                            %
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


export default App;