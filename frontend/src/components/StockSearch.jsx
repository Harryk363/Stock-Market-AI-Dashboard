function StockSearch({
    symbol,
    setSymbol,
    model,
    setModel,
    period,
    setPeriod,
    models,
    onAnalyze,
    loading,
}) {
    return (
        <section className="search-panel">

            <h2 className="search-title">
                Market Analysis
            </h2>

            <p className="search-subtitle">
                Select a stock and prediction model to generate
                an AI-powered market analysis.
            </p>


            <form
                className="search-form"
                onSubmit={onAnalyze}
            >

                {/* =================================================
                    Stock Symbol
                ================================================= */}

                <div className="field">

                    <label htmlFor="stock-symbol">
                        Stock Symbol
                    </label>

                    <input
                        id="stock-symbol"
                        type="text"
                        value={symbol}
                        onChange={(event) =>
                            setSymbol(
                                event.target.value.toUpperCase()
                            )
                        }
                        placeholder="e.g. AAPL"
                        autoComplete="off"
                    />

                </div>


                {/* =================================================
                    Prediction Model
                ================================================= */}

                <div className="field">

                    <label htmlFor="prediction-model">
                        Prediction Model
                    </label>

                    <select
                        id="prediction-model"
                        value={model}
                        onChange={(event) =>
                            setModel(
                                event.target.value
                            )
                        }
                    >

                        {models.length > 0 ? (

                            models.map((item) => (

                                <option
                                    key={item.id}
                                    value={item.id}
                                >
                                    {item.name}
                                </option>

                            ))

                        ) : (

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

                        )}

                    </select>

                </div>


                {/* =================================================
                    Historical Period
                ================================================= */}

                <div className="field">

                    <label htmlFor="historical-period">
                        Historical Period
                    </label>

                    <select
                        id="historical-period"
                        value={period}
                        onChange={(event) =>
                            setPeriod(
                                event.target.value
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


                {/* =================================================
                    Analyze Button
                ================================================= */}

                <button
                    className="analyze-button"
                    type="submit"
                    disabled={loading}
                >

                    {loading
                        ? "Analyzing..."
                        : "Analyze Stock"}

                </button>

            </form>

        </section>
    );
}

export default StockSearch;
