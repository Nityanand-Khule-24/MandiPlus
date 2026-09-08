/**
 * MandiPlus Trends
 * Dynamic commodity + market + variety trend analysis
 */

const TrendsState = {
    chart: null,
    days: 7,

    commodity: "Onion",
    market: "",
    variety: "",

    initialized: false
};


// ============================================================
// DOM HELPERS
// ============================================================

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}


// ============================================================
// FORMATTERS
// ============================================================

function formatPrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return `₹${number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
}


function formatPercent(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}


function formatDate(dateString) {
    if (!dateString) {
        return "—";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short"
    });
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ============================================================
// LOADING STATE
// ============================================================

function showTrendLoading() {

    const status = $("#trendStatus");

    if (status) {
        status.textContent = "Loading...";
        status.className = "trend-status trend-neutral";
    }

    const currentPrice = $("#trendCurrentPrice");

    if (currentPrice) {
        currentPrice.textContent = "Loading...";
    }

    const currentDate = $("#trendCurrentDate");

    if (currentDate) {
        currentDate.textContent = "—";
    }

    const priceChange = $("#trendPriceChange");

    if (priceChange) {
        priceChange.textContent = "—";
    }

    const direction = $("#trendDirection");

    if (direction) {
        direction.textContent = "—";
    }

    const minPrice = $("#trendMinPrice");

    if (minPrice) {
        minPrice.textContent = "—";
    }

    const maxPrice = $("#trendMaxPrice");

    if (maxPrice) {
        maxPrice.textContent = "—";
    }
}


// ============================================================
// ERROR STATE
// ============================================================

function showTrendError(message) {

    const status = $("#trendStatus");

    if (status) {
        status.textContent = "Unavailable";
        status.className = "trend-status trend-neutral";
    }

    const chartWrapper = document.querySelector(".chart-wrapper");

    if (chartWrapper) {

        chartWrapper.innerHTML = `
            <div class="trend-error">

                <div class="trend-error-icon">
                    ⚠️
                </div>

                <h3>
                    Unable to load trend data
                </h3>

                <p>
                    ${escapeHTML(message)}
                </p>

            </div>
        `;
    }
}


// ============================================================
// RESTORE CHART CANVAS
// ============================================================

function ensureChartCanvas() {

    const chartWrapper = document.querySelector(".chart-wrapper");

    if (!chartWrapper) {
        return null;
    }

    let canvas = $("#priceTrendChart");

    if (!canvas) {

        chartWrapper.innerHTML = `
            <canvas id="priceTrendChart"></canvas>
        `;

        canvas = $("#priceTrendChart");
    }

    return canvas;
}


// ============================================================
// LOAD FILTER DATA
// ============================================================

async function loadTrendFilters() {

    try {

        const [
            commoditiesResponse,
            mandisResponse,
            ratesResponse
        ] = await Promise.all([
            window.MandiPlusAPI.getCommodities(),
            window.MandiPlusAPI.getMandis(),
            window.MandiPlusAPI.getRates({
                district: "Pune",
                commodity: TrendsState.commodity
            })
        ]);


        // ----------------------------------------------------
        // COMMODITY FILTER
        // ----------------------------------------------------

        const commodities =
            Array.isArray(commoditiesResponse)
                ? commoditiesResponse
                : Array.isArray(commoditiesResponse?.data)
                    ? commoditiesResponse.data
                    : [];

        populateCommodityFilter(commodities);


        // ----------------------------------------------------
        // MARKET FILTER
        // ----------------------------------------------------

        const mandis =
            Array.isArray(mandisResponse)
                ? mandisResponse
                : Array.isArray(mandisResponse?.data)
                    ? mandisResponse.data
                    : [];

        populateMarketFilter(mandis);


        // ----------------------------------------------------
        // VARIETY FILTER
        // ----------------------------------------------------

        const rates =
            Array.isArray(ratesResponse)
                ? ratesResponse
                : Array.isArray(ratesResponse?.data)
                    ? ratesResponse.data
                    : [];

        populateVarietyFilter(rates);

    } catch (error) {

        console.error(
            "[MandiPlus Trends] Failed to load filters:",
            error
        );
    }
}


// ============================================================
// COMMODITY FILTER
// ============================================================

function populateCommodityFilter(commodities) {

    const select = $("#trendCommodity");

    if (!select) {
        return;
    }

    select.innerHTML = "";

    commodities.forEach(commodity => {

        const name =
            commodity.name ||
            commodity.commodity;

        if (!name) {
            return;
        }

        const option =
            document.createElement("option");

        option.value = name;
        option.textContent = name;

        if (
            name.toLowerCase() ===
            TrendsState.commodity.toLowerCase()
        ) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    /*
     * If selected commodity isn't available,
     * use the first available commodity.
     */
    if (
        select.options.length &&
        ![...select.options].some(
            option =>
                option.value.toLowerCase() ===
                TrendsState.commodity.toLowerCase()
        )
    ) {

        TrendsState.commodity =
            select.options[0].value;

        select.value =
            TrendsState.commodity;
    }
}


// ============================================================
// MARKET FILTER
// ============================================================

function populateMarketFilter(mandis) {

    const select = $("#trendMarket");

    if (!select) {
        return;
    }

    const currentValue =
        TrendsState.market;

    select.innerHTML = `
        <option value="">
            All Markets
        </option>
    `;

    mandis
        .filter(mandi =>
            !mandi.district ||
            mandi.district === "Pune"
        )
        .sort((a, b) =>
            String(a.name).localeCompare(
                String(b.name)
            )
        )
        .forEach(mandi => {

            const option =
                document.createElement("option");

            option.value = mandi.name;
            option.textContent = mandi.name;

            select.appendChild(option);
        });

    select.value = currentValue;
}


// ============================================================
// VARIETY FILTER
// ============================================================

function populateVarietyFilter(rates) {

    const select = $("#trendVariety");

    if (!select) {
        return;
    }

    const varieties = [
        ...new Set(
            rates
                .map(rate => rate.variety)
                .filter(Boolean)
        )
    ].sort();

    const currentValue =
        TrendsState.variety;

    select.innerHTML = `
        <option value="">
            All Varieties
        </option>
    `;

    varieties.forEach(variety => {

        const option =
            document.createElement("option");

        option.value = variety;
        option.textContent = variety;

        select.appendChild(option);
    });

    select.value = currentValue;
}


// ============================================================
// LOAD TRENDS
// ============================================================

async function loadTrends() {

    showTrendLoading();

    try {

        const params = {
            commodity: TrendsState.commodity,
            district: "Pune",
            days: TrendsState.days
        };

        if (TrendsState.market) {
            params.market =
                TrendsState.market;
        }

        if (TrendsState.variety) {
            params.variety =
                TrendsState.variety;
        }


        console.info(
            "[MandiPlus Trends] Loading:",
            params
        );


        const response =
            await window.MandiPlusAPI.getTrends(
                params
            );


        const trendData =
            Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                    ? response.data
                    : [];


        if (!trendData.length) {

            showTrendError(
                `No trend data is available for ${TrendsState.commodity}.`
            );

            return;
        }


        renderTrendSummary(response, trendData);

        renderTrendChart(
            trendData
        );


    } catch (error) {

        console.error(
            "[MandiPlus Trends] Failed to load trends:",
            error
        );

        showTrendError(
            error.message ||
            "Unable to load trend data."
        );
    }
}


// ============================================================
// TREND SUMMARY
// ============================================================

function renderTrendSummary(response, data) {

    /*
     * Backend returns data sorted by date.
     */

    const latest =
        data[data.length - 1];

    const modalPrices =
        data
            .map(item =>
                Number(item.modal_price)
            )
            .filter(Number.isFinite);


    const minPrices =
        data
            .map(item =>
                Number(item.min_price)
            )
            .filter(Number.isFinite);


    const maxPrices =
        data
            .map(item =>
                Number(item.max_price)
            )
            .filter(Number.isFinite);


    // --------------------------------------------------------
    // CURRENT PRICE
    // --------------------------------------------------------

    const currentPrice =
        $("#trendCurrentPrice");

    if (currentPrice) {

        currentPrice.textContent =
            formatPrice(
                latest.modal_price
            );
    }


    // --------------------------------------------------------
    // CURRENT DATE
    // --------------------------------------------------------

    const currentDate =
        $("#trendCurrentDate");

    if (currentDate) {

        currentDate.textContent =
            formatDate(
                latest.date
            );
    }


    // --------------------------------------------------------
    // PRICE CHANGE
    // --------------------------------------------------------

    const priceChange =
        $("#trendPriceChange");

    if (priceChange) {

        priceChange.textContent =
            formatPercent(
                response.price_change_percent
            );
    }


    // --------------------------------------------------------
    // DIRECTION
    // --------------------------------------------------------

    const direction =
        $("#trendDirection");

    if (direction) {

        const trend =
            String(
                response.trend || "stable"
            ).toLowerCase();

        direction.textContent =
            trend === "up"
                ? "Rising"
                : trend === "down"
                    ? "Falling"
                    : "Stable";
    }


    // --------------------------------------------------------
    // MINIMUM
    // --------------------------------------------------------

    const minPrice =
        $("#trendMinPrice");

    if (minPrice) {

        minPrice.textContent =
            minPrices.length
                ? formatPrice(
                    Math.min(...minPrices)
                )
                : "—";
    }


    // --------------------------------------------------------
    // MAXIMUM
    // --------------------------------------------------------

    const maxPrice =
        $("#trendMaxPrice");

    if (maxPrice) {

        maxPrice.textContent =
            maxPrices.length
                ? formatPrice(
                    Math.max(...maxPrices)
                )
                : "—";
    }


    // --------------------------------------------------------
    // STATUS BADGE
    // --------------------------------------------------------

    const status =
        $("#trendStatus");

    if (status) {

        const trend =
            String(
                response.trend || "stable"
            ).toLowerCase();

        status.className =
            "trend-status";

        if (trend === "up") {

            status.classList.add(
                "trend-up"
            );

            status.textContent =
                "↑ Price Rising";

        } else if (trend === "down") {

            status.classList.add(
                "trend-down"
            );

            status.textContent =
                "↓ Price Falling";

        } else {

            status.classList.add(
                "trend-neutral"
            );

            status.textContent =
                "→ Stable";
        }
    }


    // --------------------------------------------------------
    // UPDATE SECTION HEADING
    // --------------------------------------------------------

    const heading =
        document.querySelector(
            "#trends .section-heading h2"
        );

    if (heading) {

        heading.textContent =
            `${TrendsState.commodity} Price Trends`;
    }


    const description =
        document.querySelector(
            "#trends .section-heading p"
        );

    if (description) {

        description.textContent =
            `Track ${TrendsState.commodity} price movement across Pune mandis.`;
    }
}


// ============================================================
// CHART
// ============================================================

function renderTrendChart(data) {

    const canvas =
        ensureChartCanvas();

    if (!canvas) {
        return;
    }

    if (
        typeof Chart === "undefined"
    ) {

        console.error(
            "[MandiPlus Trends] Chart.js is not loaded."
        );

        return;
    }


    const labels =
        data.map(item =>
            formatDate(item.date)
        );


    const modalPrices =
        data.map(item =>
            Number(item.modal_price)
        );


    const minPrices =
        data.map(item =>
            Number(item.min_price)
        );


    const maxPrices =
        data.map(item =>
            Number(item.max_price)
        );


    /*
     * Destroy previous chart.
     */
    if (TrendsState.chart) {

        TrendsState.chart.destroy();

        TrendsState.chart = null;
    }


    TrendsState.chart =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label: "Modal Price",

                            data: modalPrices,

                            borderWidth: 3,

                            tension: 0.35,

                            pointRadius: 4,

                            pointHoverRadius: 6
                        },

                        {
                            label: "Minimum Price",

                            data: minPrices,

                            borderWidth: 2,

                            borderDash: [6, 5],

                            tension: 0.35,

                            pointRadius: 2
                        },

                        {
                            label: "Maximum Price",

                            data: maxPrices,

                            borderWidth: 2,

                            borderDash: [6, 5],

                            tension: 0.35,

                            pointRadius: 2
                        }

                    ]
                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        mode: "index",
                        intersect: false
                    },

                    plugins: {

                        legend: {
                            position: "top"
                        },

                        tooltip: {

                            callbacks: {

                                label: context => {

                                    return `${context.dataset.label}: ${formatPrice(context.raw)}`;
                                }

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: false,

                            ticks: {

                                callback: value =>
                                    formatPrice(value)

                            }

                        },

                        x: {

                            grid: {
                                display: false
                            }

                        }

                    }
                }
            }
        );
}


// ============================================================
// EVENT: DASHBOARD COMMODITY SELECTED
// ============================================================

function initializeCommodityEvent() {

    document.addEventListener(
        "mandiplus:commodity-selected",
        async event => {

            const commodity =
                event.detail?.commodity;

            if (!commodity) {
                return;
            }

            console.info(
                "[MandiPlus Trends] Commodity changed:",
                commodity
            );


            TrendsState.commodity =
                commodity;

            /*
             * Reset market and variety because
             * they belong to the previous commodity.
             */

            TrendsState.market = "";
            TrendsState.variety = "";


            /*
             * Update commodity selector.
             */

            const commoditySelect =
                $("#trendCommodity");

            if (commoditySelect) {

                const exists =
                    [...commoditySelect.options]
                        .some(
                            option =>
                                option.value.toLowerCase() ===
                                commodity.toLowerCase()
                        );

                if (!exists) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        commodity;

                    option.textContent =
                        commodity;

                    commoditySelect.appendChild(
                        option
                    );
                }

                commoditySelect.value =
                    commodity;
            }


            /*
             * Reload markets and varieties
             * for the selected commodity.
             */

            await loadTrendFilters();


            /*
             * Load new trend data.
             */

            await loadTrends();


            /*
             * Scroll trend section into view
             * only when the user selected a
             * commodity from the dashboard.
             */

            const trendSection =
                document.querySelector("#trends");

            if (trendSection) {

                trendSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        }
    );
}


// ============================================================
// FILTER EVENTS
// ============================================================

function initializeFilterEvents() {

    const commoditySelect =
        $("#trendCommodity");

    if (commoditySelect) {

        commoditySelect.addEventListener(
            "change",
            async event => {

                TrendsState.commodity =
                    event.target.value;

                TrendsState.market = "";
                TrendsState.variety = "";

                await loadTrendFilters();

                await loadTrends();
            }
        );
    }


    const marketSelect =
        $("#trendMarket");

    if (marketSelect) {

        marketSelect.addEventListener(
            "change",
            async event => {

                TrendsState.market =
                    event.target.value;

                await loadTrends();
            }
        );
    }


    const varietySelect =
        $("#trendVariety");

    if (varietySelect) {

        varietySelect.addEventListener(
            "change",
            async event => {

                TrendsState.variety =
                    event.target.value;

                await loadTrends();
            }
        );
    }


    /*
     * 7 / 30 / 90 / 365 days
     */

    $$(".trend-period").forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const days =
                    Number(
                        button.dataset.days
                    );

                if (!days) {
                    return;
                }


                TrendsState.days =
                    days;


                $$(".trend-period").forEach(
                    item =>
                        item.classList.remove(
                            "active"
                        )
                );


                button.classList.add(
                    "active"
                );


                await loadTrends();
            }
        );
    });
}


// ============================================================
// INITIALIZE
// ============================================================

async function initialize() {

    if (TrendsState.initialized) {
        return;
    }

    TrendsState.initialized = true;

    console.info(
        "[MandiPlus Trends] Initializing..."
    );


    /*
     * Set default period button.
     */

    const defaultPeriod =
        document.querySelector(
            `.trend-period[data-days="${TrendsState.days}"]`
        );

    if (defaultPeriod) {
        defaultPeriod.classList.add(
            "active"
        );
    }


    initializeCommodityEvent();
    initializeFilterEvents();


    await loadTrendFilters();

    await loadTrends();


    console.info(
        "[MandiPlus Trends] Initialized successfully."
    );
}


// ============================================================
// EXPORT
// ============================================================

window.MandiPlusTrends = {

    initialize,
    load: loadTrends,
    loadTrends,

    loadTrendFilters,

    state: TrendsState
};


console.info(
    "[MandiPlus Trends] Trends service loaded."
);