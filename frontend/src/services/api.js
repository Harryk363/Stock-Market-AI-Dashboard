const API_BASE_URL = "http://127.0.0.1:8000";


// ============================================================
// Generic API request
// ============================================================

async function apiRequest(url) {
    const response = await fetch(url);

    if (!response.ok) {
        let errorMessage = "Something went wrong.";

        try {
            const errorData = await response.json();

            if (errorData.detail) {
                errorMessage = errorData.detail;
            }
        } catch {
            // Ignore JSON parsing error
        }

        throw new Error(errorMessage);
    }

    return response.json();
}


// ============================================================
// Get available ML models
// ============================================================

export async function getModels() {
    return apiRequest(
        `${API_BASE_URL}/api/models`
    );
}


// ============================================================
// Get complete stock analysis
// ============================================================

export async function analyzeStock(
    symbol,
    model = "1",
    period = "5y",
    newsLimit = 10
) {
    const params = new URLSearchParams({
        model,
        period,
        news_limit: newsLimit,
    });

    return apiRequest(
        `${API_BASE_URL}/api/stock/${encodeURIComponent(symbol)}/analyze?${params.toString()}`
    );
}


// ============================================================
// Get historical stock data
// ============================================================

export async function getStockHistory(symbol, period = "1y") {
    return apiRequest(
        `${API_BASE_URL}/api/stock/${encodeURIComponent(
            symbol
        )}/history?period=${encodeURIComponent(period)}`
    );
}
// ============================================================
// Get stock news
// ============================================================

export async function getStockNews(
    symbol,
    limit = 10
) {
    const params = new URLSearchParams({
        limit,
    });

    return apiRequest(
        `${API_BASE_URL}/api/stock/${encodeURIComponent(symbol)}/news?${params.toString()}`
    );
}


// ============================================================
// Health check
// ============================================================

export async function checkBackendHealth() {
    return apiRequest(
        `${API_BASE_URL}/api/health`
    );
}

export async function getStockMetrics(symbol) {
    return apiRequest(
        `${API_BASE_URL}/api/stock/${encodeURIComponent(symbol)}/metrics`
    );
}