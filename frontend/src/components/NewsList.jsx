import React from "react";


// ============================================================
// Convert any value to safe text
// ============================================================

function toText(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        return String(value);
    }

    return fallback;
}


// ============================================================
// Extract title from ALL supported Yahoo formats
// ============================================================

function getTitle(item) {

    if (!item || typeof item !== "object") {
        return "Untitled financial news";
    }


    // New yfinance format
    if (
        item.content &&
        typeof item.content === "object"
    ) {

        const content = item.content;

        if (content.title) {
            return toText(
                content.title,
                "Untitled financial news"
            );
        }
    }


    // Backend-normalized formats
    if (item.title) {
        return toText(
            item.title,
            "Untitled financial news"
        );
    }


    if (item.headline) {
        return toText(
            item.headline,
            "Untitled financial news"
        );
    }


    if (item.name) {
        return toText(
            item.name,
            "Untitled financial news"
        );
    }


    return "Untitled financial news";
}


// ============================================================
// Extract URL
// ============================================================

function getUrl(item) {

    if (!item || typeof item !== "object") {
        return "";
    }


    // New yfinance format
    if (
        item.content &&
        typeof item.content === "object"
    ) {

        const content = item.content;


        if (
            content.canonicalUrl &&
            typeof content.canonicalUrl === "object"
        ) {

            if (content.canonicalUrl.url) {
                return toText(
                    content.canonicalUrl.url
                );
            }
        }


        if (
            content.clickThroughUrl &&
            typeof content.clickThroughUrl === "object"
        ) {

            if (content.clickThroughUrl.url) {
                return toText(
                    content.clickThroughUrl.url
                );
            }
        }
    }


    // Normalized backend format

    if (item.url) {
        return toText(item.url);
    }


    if (item.link) {
        return toText(item.link);
    }


    return "";
}


// ============================================================
// Extract publisher
// ============================================================

function getPublisher(item) {

    if (!item || typeof item !== "object") {
        return "Yahoo Finance";
    }


    // New yfinance format

    if (
        item.content &&
        typeof item.content === "object"
    ) {

        const content =
            item.content;


        if (
            content.provider &&
            typeof content.provider === "object"
        ) {

            if (
                content.provider.displayName
            ) {

                return toText(
                    content
                        .provider
                        .displayName,
                    "Yahoo Finance"
                );
            }


            if (
                content.provider.name
            ) {

                return toText(
                    content
                        .provider
                        .name,
                    "Yahoo Finance"
                );
            }
        }
    }


    // Normalized backend format

    if (item.publisher) {
        return toText(
            item.publisher,
            "Yahoo Finance"
        );
    }


    if (item.provider) {

        if (
            typeof item.provider ===
            "string"
        ) {
            return item.provider;
        }


        if (
            typeof item.provider ===
            "object"
        ) {

            return toText(
                item.provider.displayName ??
                item.provider.name,
                "Yahoo Finance"
            );
        }
    }


    return "Yahoo Finance";
}


// ============================================================
// Extract publication date
// ============================================================

function getPublishedAt(item) {

    if (!item || typeof item !== "object") {
        return "";
    }


    // New yfinance format

    if (
        item.content &&
        typeof item.content === "object"
    ) {

        if (
            item.content.pubDate
        ) {

            return toText(
                item.content.pubDate
            );
        }

        if (
            item.content.displayTime
        ) {

            return toText(
                item.content.displayTime
            );
        }
    }


    // Normalized format

    if (item.published_at) {
        return toText(
            item.published_at
        );
    }


    if (item.publishedAt) {
        return toText(
            item.publishedAt
        );
    }


    if (item.pubDate) {
        return toText(
            item.pubDate
        );
    }


    // Old yfinance format

    if (
        typeof item.providerPublishTime ===
        "number"
    ) {

        return new Date(
            item.providerPublishTime *
            1000
        ).toISOString();
    }


    return "";
}


// ============================================================
// Extract sentiment
// ============================================================

function getSentiment(item) {

    if (!item || typeof item !== "object") {
        return "";
    }


    if (item.sentiment) {

        if (
            typeof item.sentiment ===
            "string"
        ) {
            return item.sentiment;
        }


        if (
            typeof item.sentiment ===
            "object"
        ) {

            return toText(
                item.sentiment.label ??
                item.sentiment.sentiment,
                ""
            );
        }
    }


    return "";
}


// ============================================================
// NewsList
// ============================================================

function NewsList({ news = [] }) {

    if (
        !Array.isArray(news) ||
        news.length === 0
    ) {

        return (
            <div className="news-list">

                <div className="chart-empty">
                    No recent news available.
                </div>

            </div>
        );
    }


    return (

        <div className="news-list">

            {news.map(
                (item, index) => {

                    // ========================================
                    // Extract real article information
                    // ========================================

                    const title =
                        getTitle(item);

                    const url =
                        getUrl(item);

                    const publisher =
                        getPublisher(item);

                    const publishedAt =
                        getPublishedAt(item);

                    const sentiment =
                        getSentiment(item)
                            .toLowerCase();


                    // ========================================
                    // Confidence
                    // ========================================

                    let confidence =
                        null;


                    if (
                        item &&
                        typeof item ===
                        "object" &&
                        item.confidence !==
                        undefined &&
                        item.confidence !==
                        null
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

                            confidence =
                                number;
                        }
                    }


                    // ========================================
                    // Format date
                    // ========================================

                    let formattedDate =
                        "";


                    if (publishedAt) {

                        const date =
                            new Date(
                                publishedAt
                            );


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


                    // ========================================
                    // Sentiment class
                    // ========================================

                    let sentimentClass =
                        "neutral";


                    if (
                        sentiment ===
                        "positive"
                    ) {

                        sentimentClass =
                            "positive";
                    }


                    if (
                        sentiment ===
                        "negative"
                    ) {

                        sentimentClass =
                            "negative";
                    }


                    // ========================================
                    // Render article
                    // ========================================

                    return (

                        <article
                            className="news-item"
                            key={
                                `news-${index}`
                            }
                        >

                            {/* ==================================
                                REAL HEADLINE
                            ================================== */}

                            <div className="news-headline">

                                {
                                    url
                                        ? (

                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {title}
                                            </a>

                                        )
                                        : (

                                            title

                                        )
                                }

                            </div>


                            {/* ==================================
                                NEWS META
                            ================================== */}

                            <div className="news-meta">

                                <div>

                                    <span className="news-publisher">

                                        {publisher}

                                    </span>


                                    {
                                        formattedDate && (

                                            <>

                                                {" · "}

                                                <span className="news-date">

                                                    {
                                                        formattedDate
                                                    }

                                                </span>

                                            </>

                                        )
                                    }

                                </div>


                                {/* Sentiment */}

                                {
                                    sentiment && (

                                        <span
                                            className={
                                                `sentiment-badge ${
                                                    sentimentClass
                                                }`
                                            }
                                        >

                                            {
                                                sentiment
                                            }

                                        </span>

                                    )
                                }


                                {/* Confidence */}

                                {
                                    confidence !==
                                    null && (

                                        <span className="confidence">

                                            Confidence:{" "}

                                            {
                                                (
                                                    confidence *
                                                    100
                                                ).toFixed(
                                                    2
                                                )
                                            }%

                                        </span>

                                    )
                                }

                            </div>

                        </article>
                    );
                }
            )}

        </div>
    );
}


export default NewsList;