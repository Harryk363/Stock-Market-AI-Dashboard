import React, { useEffect, useRef, useState } from "react";

import {
    createChart,
    CandlestickSeries,
    LineSeries,
    BarSeries,
} from "lightweight-charts";


// ============================================================
// HELPERS
// ============================================================

function getValue(row, keys, fallback = null) {
    for (const key of keys) {
        if (
            row?.[key] !== undefined &&
            row?.[key] !== null &&
            row?.[key] !== ""
        ) {
            const value = Number(row[key]);

            if (Number.isFinite(value)) {
                return value;
            }
        }
    }

    return fallback;
}


function getDate(row) {
    const value =
        row?.Date ??
        row?.date ??
        row?.Datetime ??
        row?.datetime ??
        row?.time;

    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString().slice(0, 10);
}


function normalizeData(data) {
    if (!Array.isArray(data)) {
        return [];
    }

    return data
        .map((row) => {
            const time = getDate(row);

            const open = getValue(row, [
                "Open",
                "open",
            ]);

            const high = getValue(row, [
                "High",
                "high",
            ]);

            const low = getValue(row, [
                "Low",
                "low",
            ]);

            const close = getValue(row, [
                "Close",
                "close",
            ]);

            const volume = getValue(
                row,
                ["Volume", "volume"],
                0
            );

            if (
                !time ||
                open === null ||
                high === null ||
                low === null ||
                close === null
            ) {
                return null;
            }

            return {
                time,
                open,
                high,
                low,
                close,
                volume,
            };
        })
        .filter(Boolean);
}


// ============================================================
// STOCK CHART
// ============================================================

function StockChart({
    data = [],
    symbol = "",
    chartPeriod = "1y",
    onChartPeriodChange,
}) {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);

    const [chartType, setChartType] =
        useState("candlestick");

    const normalizedData =
        normalizeData(data);


    // ========================================================
    // CREATE / UPDATE CHART
    // ========================================================

    useEffect(() => {
        if (!chartContainerRef.current) {
            return;
        }

        if (normalizedData.length === 0) {
            return;
        }

        const container =
            chartContainerRef.current;


        // ----------------------------------------------------
        // CREATE CHART
        // ----------------------------------------------------

        const chart = createChart(
            container,
            {
                width: container.clientWidth,
                height: 430,

                layout: {
                    background: {
                        color: "#ffffff",
                    },

                    textColor: "#64748b",
                },

                grid: {
                    vertLines: {
                        color: "#eef2f7",
                    },

                    horzLines: {
                        color: "#eef2f7",
                    },
                },

                crosshair: {
                    mode: 1,
                },

                rightPriceScale: {
                    borderColor: "#e5eaf1",
                },

                timeScale: {
                    borderColor: "#e5eaf1",

                    timeVisible: true,

                    secondsVisible: false,
                },
            }
        );


        chartRef.current = chart;


        // ====================================================
        // PRICE DATA
        // ====================================================

        const priceData =
            normalizedData.map(
                (item) => ({
                    time: item.time,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                })
            );


        // ====================================================
        // CANDLESTICK
        // ====================================================

        if (chartType === "candlestick") {
            const series =
                chart.addSeries(
                    CandlestickSeries,
                    {
                        upColor: "#16a34a",
                        downColor: "#dc2626",

                        borderVisible: false,

                        wickUpColor:
                            "#16a34a",

                        wickDownColor:
                            "#dc2626",
                    }
                );

            series.setData(priceData);
        }


        // ====================================================
        // LINE
        // ====================================================

        if (chartType === "line") {
            const series =
                chart.addSeries(
                    LineSeries,
                    {
                        lineWidth: 2,

                        priceLineVisible: true,

                        lastValueVisible: true,
                    }
                );

            series.setData(
                normalizedData.map(
                    (item) => ({
                        time: item.time,
                        value: item.close,
                    })
                )
            );
        }


        // ====================================================
        // OHLC
        // ====================================================

        if (chartType === "ohlc") {
            const series =
                chart.addSeries(
                    BarSeries,
                    {
                        thinBars: false,
                    }
                );

            series.setData(priceData);
        }


        // ====================================================
        // VOLUME
        // ====================================================

        // const volumeSeries =
        //     chart.addSeries(
        //         HistogramSeries,
        //         {
        //             priceFormat: {
        //                 type: "volume",
        //             },

        //             priceScaleId: "",
        //         }
        //     );


        // volumeSeries.setData(
        //     normalizedData.map(
        //         (item) => ({
        //             time: item.time,

        //             value: item.volume,

        //             color:
        //                 item.close >=
        //                 item.open
        //                     ? "#86efac"
        //                     : "#fca5a5",
        //         })
        //     )
        // );


        // ====================================================
        // FIT CONTENT
        // ====================================================

        chart.timeScale().fitContent();


        // ====================================================
        // RESPONSIVE RESIZE
        // ====================================================

        const resizeObserver =
            new ResizeObserver(() => {
                if (
                    chartContainerRef.current
                ) {
                    chart.applyOptions({
                        width:
                            chartContainerRef
                                .current
                                .clientWidth,
                    });
                }
            });


        resizeObserver.observe(
            container
        );


        // ====================================================
        // CLEANUP
        // ====================================================

        return () => {
            resizeObserver.disconnect();

            chart.remove();

            chartRef.current = null;
        };

        // IMPORTANT:
        // `data` changes when a new range is loaded.
        // This makes the chart redraw correctly.
    }, [data, chartType]);


    // ========================================================
    // EMPTY STATE
    // ========================================================

    if (normalizedData.length === 0) {
        return (
            <div className="chart-empty">
                No historical market data
                available.
            </div>
        );
    }


    // ========================================================
    // RANGE BUTTONS
    // ========================================================

    const ranges = [
        ["1d", "1D"],
        ["5d", "5D"],
        ["1mo", "1M"],
        ["3mo", "3M"],
        ["6mo", "6M"],
        ["1y", "1Y"],
        ["5y", "5Y"],
        ["max", "MAX"],
    ];


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <div>

            {/* =================================================
                HEADER
            ================================================== */}

            <div
                style={{
                    display: "flex",

                    justifyContent:
                        "space-between",

                    alignItems: "center",

                    marginBottom: "12px",

                    gap: "10px",

                    flexWrap: "wrap",
                }}
            >

                {/* ---------------------------------------------
                    TITLE
                ---------------------------------------------- */}

                <div>

                    <strong
                        style={{
                            fontSize: "14px",

                            color: "#172033",
                        }}
                    >
                        {symbol || "Stock"}{" "}
                        Price 
                    </strong>


                    <div
                        style={{
                            fontSize: "11px",

                            color: "#94a3b8",

                            marginTop: "3px",
                        }}
                    >
                        Interactive historical
                        market data
                    </div>

                </div>


                {/* ---------------------------------------------
                    CHART TYPE BUTTONS
                ---------------------------------------------- */}

                <div
                    style={{
                        display: "flex",

                        gap: "6px",

                        flexWrap: "wrap",
                    }}
                >

                    {/* CANDLESTICK */}

                    <button
                        type="button"
                        onClick={() =>
                            setChartType(
                                "candlestick"
                            )
                        }
                        style={{
                            padding:
                                "7px 11px",

                            borderRadius:
                                "7px",

                            border:
                                "1px solid #dbe2ea",

                            background:
                                chartType ===
                                "candlestick"
                                    ? "#4f46e5"
                                    : "#ffffff",

                            color:
                                chartType ===
                                "candlestick"
                                    ? "#ffffff"
                                    : "#475569",

                            cursor: "pointer",

                            fontSize: "11px",

                            fontWeight: 600,
                        }}
                    >
                        Candlestick
                    </button>


                    {/* LINE */}

                    <button
                        type="button"
                        onClick={() =>
                            setChartType(
                                "line"
                            )
                        }
                        style={{
                            padding:
                                "7px 11px",

                            borderRadius:
                                "7px",

                            border:
                                "1px solid #dbe2ea",

                            background:
                                chartType ===
                                "line"
                                    ? "#4f46e5"
                                    : "#ffffff",

                            color:
                                chartType ===
                                "line"
                                    ? "#ffffff"
                                    : "#475569",

                            cursor: "pointer",

                            fontSize: "11px",

                            fontWeight: 600,
                        }}
                    >
                        Line
                    </button>


                    {/* OHLC */}

                    <button
                        type="button"
                        onClick={() =>
                            setChartType(
                                "ohlc"
                            )
                        }
                        style={{
                            padding:
                                "7px 11px",

                            borderRadius:
                                "7px",

                            border:
                                "1px solid #dbe2ea",

                            background:
                                chartType ===
                                "ohlc"
                                    ? "#4f46e5"
                                    : "#ffffff",

                            color:
                                chartType ===
                                "ohlc"
                                    ? "#ffffff"
                                    : "#475569",

                            cursor: "pointer",

                            fontSize: "11px",

                            fontWeight: 600,
                        }}
                    >
                        OHLC
                    </button>

                </div>

            </div>


            {/* =================================================
                TIME RANGE BUTTONS
            ================================================== */}

            <div
                style={{
                    display: "flex",

                    gap: "6px",

                    flexWrap: "wrap",

                    marginBottom: "12px",
                }}
            >

                {ranges.map(
                    ([value, label]) => (
                        <button
                            key={value}
                            type="button"

                            disabled={
                                !onChartPeriodChange
                            }

                            onClick={() => {
                                if (
                                    onChartPeriodChange
                                ) {
                                    onChartPeriodChange(
                                        value
                                    );
                                }
                            }}

                            style={{
                                padding:
                                    "6px 10px",

                                borderRadius:
                                    "7px",

                                border:
                                    "1px solid #dbe2ea",

                                background:
                                    chartPeriod ===
                                    value
                                        ? "#172033"
                                        : "#ffffff",

                                color:
                                    chartPeriod ===
                                    value
                                        ? "#ffffff"
                                        : "#64748b",

                                cursor:
                                    onChartPeriodChange
                                        ? "pointer"
                                        : "not-allowed",

                                fontSize:
                                    "10px",

                                fontWeight: 600,

                                opacity:
                                    onChartPeriodChange
                                        ? 1
                                        : 0.6,

                                transition:
                                    "all 0.15s ease",
                            }}
                        >
                            {label}
                        </button>
                    )
                )}

            </div>


            {/* =================================================
                CHART
            ================================================== */}

            <div
                ref={chartContainerRef}

                style={{
                    width: "100%",

                    minHeight: "430px",
                }}
            />

        </div>
    );
}


export default StockChart;