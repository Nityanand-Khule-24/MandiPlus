/**
 * MandiPlus Dashboard
 * Dynamic commodity search + real API prices
 */

const DashboardState = {
    commodities: [],
    rates: [],
    selectedCommodity: "",
    currentCategory: "all",
    searchQuery: "",
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


function formatNumber(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    return number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
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
        month: "short",
        year: "numeric"
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
// LOADING / ERROR STATES
// ============================================================

function showTableLoading() {
    const tableBody = $("#pricesTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Loading mandi prices...</p>
                </div>
            </td>
        </tr>
    `;
}


function showMobileLoading() {
    const container = $("#mobilePriceList");

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading mandi prices...</p>
        </div>
    `;
}


function showTableError(message) {
    const tableBody = $("#pricesTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>${escapeHTML(message)}</p>
                    <button class="retry-button" id="dashboardRetryButton">
                        Try Again
                    </button>
                </div>
            </td>
        </tr>
    `;

    const retryButton = $("#dashboardRetryButton");

    if (retryButton) {
        retryButton.addEventListener("click", refresh);
    }
}


function showEmptyState(message = "No mandi prices found.") {
    const tableBody = $("#pricesTableBody");

    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <div class="empty-icon">🌾</div>
                        <h3>No prices found</h3>
                        <p>${escapeHTML(message)}</p>
                    </div>
                </td>
            </tr>
        `;
    }

    const mobileList = $("#mobilePriceList");

    if (mobileList) {
        mobileList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🌾</div>
                <h3>No prices found</h3>
                <p>${escapeHTML(message)}</p>
            </div>
        `;
    }
}


// ============================================================
// COMMODITIES
// ============================================================

async function loadCommodities() {
    try {
        const response = await window.MandiPlusAPI.getCommodities();

        if (!response) {
            throw new Error("Invalid commodity response.");
        }

        const commodities = Array.isArray(response)
            ? response
            : Array.isArray(response.data)
                ? response.data
                : [];

        DashboardState.commodities = commodities;

        console.info(
            "[MandiPlus Dashboard] Commodities loaded:",
            DashboardState.commodities.length
        );

        renderCommodityChips();
        renderCommodityDatalist();

    } catch (error) {
        console.error(
            "[MandiPlus Dashboard] Failed to load commodities:",
            error
        );

        DashboardState.commodities = [];
    }
}


// ============================================================
// DYNAMIC COMMODITY CHIPS
// ============================================================

function renderCommodityChips() {
    const container = document.querySelector(".commodity-chips");

    if (!container) {
        return;
    }

    if (!DashboardState.commodities.length) {
        return;
    }

    container.innerHTML = DashboardState.commodities
        .map(commodity => {
            const name = commodity.name || commodity.commodity;

            if (!name) {
                return "";
            }

            return `
                <button
                    type="button"
                    class="commodity-chip"
                    data-commodity="${escapeHTML(name)}"
                >
                    ${escapeHTML(name)}
                </button>
            `;
        })
        .join("");

    $$(".commodity-chip").forEach(button => {
        button.addEventListener("click", () => {
            const commodity = button.dataset.commodity;

            selectCommodity(commodity);
        });
    });
}


// ============================================================
// SEARCH SUGGESTIONS
// ============================================================

function renderCommodityDatalist() {
    const datalist = $("#commoditySuggestions");

    if (!datalist) {
        return;
    }

    datalist.innerHTML = DashboardState.commodities
        .map(commodity => {
            const name = commodity.name || commodity.commodity;

            if (!name) {
                return "";
            }

            return `<option value="${escapeHTML(name)}"></option>`;
        })
        .join("");
}


// ============================================================
// SELECT COMMODITY
// ============================================================

async function selectCommodity(commodityName) {
    if (!commodityName) {
        return;
    }

    const matchedCommodity = DashboardState.commodities.find(
        commodity =>
            String(commodity.name || commodity.commodity)
                .toLowerCase() === String(commodityName).toLowerCase()
    );

    const selectedName = matchedCommodity
        ? matchedCommodity.name || matchedCommodity.commodity
        : commodityName;

    DashboardState.selectedCommodity = selectedName;
    DashboardState.searchQuery = selectedName;

    console.info(
        "[MandiPlus Dashboard] Selected commodity:",
        selectedName
    );

    const searchInput = $("#commoditySearchInput");

    if (searchInput) {
        searchInput.value = selectedName;
    }

    updateActiveCommodityChip();

    await loadCommodityRates(selectedName);

    updateCommodityHeading(selectedName);

    /*
     * Tell the Trends module about the selected commodity.
     * trends.js can listen for this event.
     */
    document.dispatchEvent(
        new CustomEvent("mandiplus:commodity-selected", {
            detail: {
                commodity: selectedName
            }
        })
    );

    /*
     * Scroll to today's prices.
     */
    const pricesSection = document.querySelector("#prices");

    if (pricesSection) {
        pricesSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ============================================================
// ACTIVE CHIP
// ============================================================

function updateActiveCommodityChip() {
    $$(".commodity-chip").forEach(button => {
        const commodity = button.dataset.commodity;

        button.classList.toggle(
            "active",
            String(commodity).toLowerCase() ===
            String(DashboardState.selectedCommodity).toLowerCase()
        );
    });
}


// ============================================================
// LOAD COMMODITY RATES
// ============================================================

async function loadCommodityRates(commodityName = "") {
    showTableLoading();
    showMobileLoading();

    try {
        const params = {
            district: "Pune"
        };

        if (commodityName) {
            params.commodity = commodityName;
        }

        const response = await window.MandiPlusAPI.getRates(params);

        const rates = Array.isArray(response)
            ? response
            : Array.isArray(response.data)
                ? response.data
                : [];

        DashboardState.rates = rates;

        console.info(
            "[MandiPlus Dashboard] Rates loaded:",
            rates.length,
            "for",
            commodityName || "all commodities"
        );

        renderPrices();

    } catch (error) {
        console.error(
            "[MandiPlus Dashboard] Failed to load rates:",
            error
        );

        DashboardState.rates = [];

        showTableError(
            "Unable to load mandi prices. Please check that the FastAPI server is running."
        );

        const mobileList = $("#mobilePriceList");

        if (mobileList) {
            mobileList.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <p>Unable to load mandi prices.</p>
                    <button class="retry-button" id="mobileRetryButton">
                        Try Again
                    </button>
                </div>
            `;

            const retry = $("#mobileRetryButton");

            if (retry) {
                retry.addEventListener("click", refresh);
            }
        }
    }
}


// ============================================================
// FILTER RATES
// ============================================================

function getFilteredRates() {
    let rates = [...DashboardState.rates];

    /*
     * Search filter
     */
    if (DashboardState.searchQuery) {
        const query =
            DashboardState.searchQuery.toLowerCase().trim();

        rates = rates.filter(rate => {
            return String(rate.commodity || "")
                .toLowerCase()
                .includes(query);
        });
    }

    /*
     * Category filter
     *
     * Your current API has category=null for commodities,
     * so category filtering is only applied when category
     * information actually exists.
     */
    if (DashboardState.currentCategory !== "all") {
        const category =
            DashboardState.currentCategory.toLowerCase();

        const hasCategoryData = rates.some(
            rate => rate.category
        );

        if (hasCategoryData) {
            rates = rates.filter(rate =>
                String(rate.category || "")
                    .toLowerCase() === category
            );
        }
    }

    return rates;
}


// ============================================================
// RENDER PRICES
// ============================================================

function renderPrices() {
    const filteredRates = getFilteredRates();

    if (!filteredRates.length) {
        showEmptyState(
            DashboardState.selectedCommodity
                ? `No prices are currently available for ${DashboardState.selectedCommodity} in Pune.`
                : "No mandi prices are currently available."
        );

        updateSummaryFromRates([]);

        return;
    }

    renderPriceTable(filteredRates);
    renderMobilePrices(filteredRates);
    renderComparison(filteredRates);
    updateSummaryFromRates(filteredRates);
}


// ============================================================
// PRICE TABLE
// ============================================================

function renderPriceTable(rates) {
    const tableBody = $("#pricesTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = rates
        .map(createPriceRow)
        .join("");
}


function createPriceRow(rate) {
    const commodity = rate.commodity || "—";
    const market = rate.market || "—";
    const minPrice = formatPrice(rate.min_price);
    const maxPrice = formatPrice(rate.max_price);
    const modalPrice = formatPrice(rate.modal_price);
    const date = formatDate(rate.reported_date);

    return `
        <tr>
            <td>
                <div class="commodity-name">
                    ${escapeHTML(commodity)}
                </div>
                ${
                    rate.variety
                        ? `<small>${escapeHTML(rate.variety)}</small>`
                        : ""
                }
            </td>

            <td>
                <div class="market-name">
                    ${escapeHTML(market)}
                </div>

                <small>
                    ${escapeHTML(rate.district || "Pune")}
                </small>
            </td>

            <td>${minPrice}</td>

            <td>${maxPrice}</td>

            <td>
                <strong class="modal-price">
                    ${modalPrice}
                </strong>
            </td>

            <td>
                <div class="price-date">
                    ${date}
                </div>
            </td>
        </tr>
    `;
}


// ============================================================
// MOBILE PRICE CARDS
// ============================================================

function renderMobilePrices(rates) {
    const container = $("#mobilePriceList");

    if (!container) {
        return;
    }

    container.innerHTML = rates
        .map(createMobilePriceCard)
        .join("");
}


function createMobilePriceCard(rate) {
    const commodity = rate.commodity || "—";
    const market = rate.market || "—";

    return `
        <article class="mobile-price-card">

            <div class="mobile-price-header">

                <div>
                    <h3>
                        ${escapeHTML(commodity)}
                    </h3>

                    <p>
                        📍 ${escapeHTML(market)}
                    </p>
                </div>

                <strong>
                    ${formatPrice(rate.modal_price)}
                </strong>

            </div>

            <div class="mobile-price-grid">

                <div>
                    <span>Minimum</span>
                    <strong>
                        ${formatPrice(rate.min_price)}
                    </strong>
                </div>

                <div>
                    <span>Modal</span>
                    <strong>
                        ${formatPrice(rate.modal_price)}
                    </strong>
                </div>

                <div>
                    <span>Maximum</span>
                    <strong>
                        ${formatPrice(rate.max_price)}
                    </strong>
                </div>

            </div>

            <div class="mobile-price-footer">

                <span>
                    ${
                        rate.variety
                            ? escapeHTML(rate.variety)
                            : "Standard"
                    }
                </span>

                <span>
                    ${formatDate(rate.reported_date)}
                </span>

            </div>

        </article>
    `;
}


// ============================================================
// COMPARISON
// ============================================================

function renderComparison(rates) {
    const container = $("#comparisonGrid");

    if (!container) {
        return;
    }

    if (!rates.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No market comparison available.</p>
            </div>
        `;

        return;
    }

    /*
     * Group by market.
     */
    const marketRates = {};

    rates.forEach(rate => {
        const market = rate.market || "Unknown Market";

        if (!marketRates[market]) {
            marketRates[market] = [];
        }

        marketRates[market].push(rate);
    });

    /*
     * Calculate average modal price for each market.
     */
    const comparison = Object.entries(marketRates)
        .map(([market, marketRateList]) => {

            const modalPrices = marketRateList
                .map(rate => Number(rate.modal_price))
                .filter(Number.isFinite);

            const average =
                modalPrices.length
                    ? modalPrices.reduce(
                        (sum, value) => sum + value,
                        0
                    ) / modalPrices.length
                    : null;

            return {
                market,
                district: marketRateList[0]?.district || "Pune",
                average,
                rate: marketRateList[0]
            };
        })
        .filter(item => item.average !== null)
        .sort((a, b) => b.average - a.average)
        .slice(0, 6);

    if (!comparison.length) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No comparable modal prices available.</p>
            </div>
        `;

        return;
    }

    const highestPrice = comparison[0].average;

    container.innerHTML = comparison
        .map(item => {

            const isHighest =
                item.average === highestPrice;

            return `
                <article class="comparison-card ${
                    isHighest ? "comparison-best" : ""
                }">

                    <div class="comparison-card-header">

                        <div>
                            <h3>
                                ${escapeHTML(item.market)}
                            </h3>

                            <p>
                                📍 ${escapeHTML(item.district)}
                            </p>
                        </div>

                        ${
                            isHighest
                                ? `<span class="comparison-badge">
                                    Highest Modal
                                   </span>`
                                : ""
                        }

                    </div>

                    <div class="comparison-price">
                        ${formatPrice(item.average)}
                    </div>

                    <p class="comparison-note">
                        Average modal price
                    </p>

                </article>
            `;
        })
        .join("");
}


// ============================================================
// SUMMARY
// ============================================================

function updateSummaryFromRates(rates) {
    const markets = new Set(
        rates
            .map(rate => rate.market)
            .filter(Boolean)
    );

    const commodities = new Set(
        rates
            .map(rate => rate.commodity)
            .filter(Boolean)
    );

    const dates = rates
        .map(rate => rate.reported_date)
        .filter(Boolean)
        .sort();

    const modalPrices = rates
        .map(rate => Number(rate.modal_price))
        .filter(Number.isFinite);

    /*
     * Markets
     */
    const marketCount = $("#marketCount");

    if (marketCount) {
        marketCount.textContent = markets.size;
    }

    /*
     * Commodities
     */
    const commodityCount = $("#commodityCount");

    if (commodityCount) {
        commodityCount.textContent =
            DashboardState.selectedCommodity
                ? DashboardState.selectedCommodity
                : commodities.size;
    }

    /*
     * Latest update
     */
    const latestUpdate = $("#latestUpdate");

    if (latestUpdate) {
        latestUpdate.textContent =
            dates.length
                ? formatDate(dates[dates.length - 1])
                : "—";
    }

    /*
     * Price movement
     */
    const priceMovement = $("#priceMovement");

    if (priceMovement) {

        if (modalPrices.length >= 2) {

            const min = Math.min(...modalPrices);
            const max = Math.max(...modalPrices);

            if (min > 0) {
                const movement =
                    ((max - min) / min) * 100;

                priceMovement.textContent =
                    `${movement >= 0 ? "+" : ""}${movement.toFixed(1)}%`;
            } else {
                priceMovement.textContent = "—";
            }

        } else {
            priceMovement.textContent = "—";
        }
    }
}


// ============================================================
// UPDATE HEADING
// ============================================================

function updateCommodityHeading(commodity) {
    /*
     * Update common heading patterns without requiring
     * a specific HTML structure.
     */

    const heading = document.querySelector(
        "#prices .section-heading h2"
    );

    if (heading && commodity) {
        heading.textContent =
            `Today's ${commodity} Prices`;
    }
}


// ============================================================
// SEARCH
// ============================================================

function initializeSearch() {
    const input = $("#commoditySearchInput");
    const searchButton = $("#searchButton");
    const clearButton = $("#clearSearchBtn");

    if (!input) {
        return;
    }

    /*
     * Search button
     */
    if (searchButton) {
        searchButton.addEventListener("click", () => {
            performSearch(input.value);
        });
    }

    /*
     * Enter key
     */
    input.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();

            performSearch(input.value);
        }
    });

    /*
     * Clear button
     */
    if (clearButton) {
        clearButton.addEventListener("click", () => {

            input.value = "";

            DashboardState.searchQuery = "";
            DashboardState.selectedCommodity = "";

            updateActiveCommodityChip();

            loadCommodityRates("");

            updateCommodityHeading("");

        });
    }
}


async function performSearch(query) {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
        return;
    }

    /*
     * Find exact match first.
     */
    let commodity = DashboardState.commodities.find(
        item =>
            String(item.name || item.commodity)
                .toLowerCase() === cleanQuery.toLowerCase()
    );

    /*
     * If no exact match, try partial match.
     */
    if (!commodity) {
        commodity = DashboardState.commodities.find(
            item =>
                String(item.name || item.commodity)
                    .toLowerCase()
                    .includes(cleanQuery.toLowerCase())
        );
    }

    if (commodity) {
        await selectCommodity(
            commodity.name || commodity.commodity
        );

        return;
    }

    /*
     * No known commodity.
     */
    DashboardState.selectedCommodity = "";
    DashboardState.searchQuery = cleanQuery;

    showEmptyState(
        `We couldn't find a commodity matching "${cleanQuery}".`
    );
}


// ============================================================
// CATEGORY FILTERS
// ============================================================

function initializeCategoryFilters() {
    $$(".filter-pill").forEach(button => {

        button.addEventListener("click", () => {

            $$(".filter-pill").forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");

            DashboardState.currentCategory =
                button.dataset.category || "all";

            renderPrices();
        });

    });
}


// ============================================================
// MOBILE MENU
// ============================================================

function initializeMobileMenu() {
    const button = $("#mobileMenuButton");
    const nav = $("#mobileNav");

    if (!button || !nav) {
        return;
    }

    button.addEventListener("click", () => {

        const isOpen =
            nav.classList.toggle("open");

        button.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

    });
}


// ============================================================
// LOAD INITIAL DATA
// ============================================================

async function initialize() {

    if (DashboardState.initialized) {
        return;
    }

    DashboardState.initialized = true;

    console.info(
        "[MandiPlus Dashboard] Initializing..."
    );

    try {

        /*
         * First load the commodity list.
         */
        await loadCommodities();

        /*
         * Default commodity.
         *
         * Onion is the primary commodity currently
         * used by the dashboard/trends UI.
         */
        const onion = DashboardState.commodities.find(
            commodity =>
                String(commodity.name || commodity.commodity)
                    .toLowerCase() === "onion"
        );

        if (onion) {

            DashboardState.selectedCommodity =
                onion.name || onion.commodity;

            DashboardState.searchQuery =
                DashboardState.selectedCommodity;

            const input = $("#commoditySearchInput");

            if (input) {
                input.value =
                    DashboardState.selectedCommodity;
            }

            updateActiveCommodityChip();
        }

        /*
         * Load prices.
         */
        await loadCommodityRates(
            DashboardState.selectedCommodity
        );

        initializeSearch();
        initializeCategoryFilters();
        initializeMobileMenu();

        console.info(
            "[MandiPlus Dashboard] Initialized successfully."
        );

    } catch (error) {

        console.error(
            "[MandiPlus Dashboard] Initialization failed:",
            error
        );

        showTableError(
            "MandiPlus could not load the dashboard data."
        );
    }
}


// ============================================================
// REFRESH
// ============================================================

async function refresh() {

    console.info(
        "[MandiPlus Dashboard] Refreshing data..."
    );

    try {

        await loadCommodities();

        await loadCommodityRates(
            DashboardState.selectedCommodity
        );

    } catch (error) {

        console.error(
            "[MandiPlus Dashboard] Refresh failed:",
            error
        );
    }
}


// ============================================================
// AUTO REFRESH
// ============================================================

function initializeAutoRefresh() {

    const interval =
        window.MandiPlusAPI?.config?.refreshIntervalMs ||
        60000;

    setInterval(() => {

        refresh();

    }, interval);

}


// ============================================================
// START
// ============================================================

window.MandiPlusDashboard = {

    initialize,
    refresh,

    loadCommodities,
    loadCommodityRates,

    selectCommodity,
    performSearch,

    renderPrices,
    renderPriceTable,
    renderMobilePrices,
    renderComparison,

    getFilteredRates
};


console.info(
    "[MandiPlus Dashboard] Dashboard service loaded."
);