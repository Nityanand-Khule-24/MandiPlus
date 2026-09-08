// ============================================================
// MANDIPLUS — PRICES PAGE
// ============================================================

const PricesState = {
    commodity: "Onion",
    district: "Pune",
    market: ""
};


// ============================================================
// DOM ELEMENTS
// ============================================================

const commodityFilter = document.getElementById("commodityFilter");
const districtFilter = document.getElementById("districtFilter");
const marketFilter = document.getElementById("marketFilter");

const applyFiltersButton = document.getElementById("applyFilters");

const pricesLoading = document.getElementById("pricesLoading");
const pricesError = document.getElementById("pricesError");
const pricesEmpty = document.getElementById("pricesEmpty");

const priceSummary = document.getElementById("priceSummary");
const pricesTableBody = document.getElementById("pricesTableBody");

const marketCount = document.getElementById("marketCount");
const lowestPrice = document.getElementById("lowestPrice");
const highestPrice = document.getElementById("highestPrice");
const averageModal = document.getElementById("averageModal");


// ============================================================
// HELPERS
// ============================================================

function showLoading(show) {
    pricesLoading.classList.toggle("hidden", !show);
}


function showError(message) {
    pricesError.textContent = message;
    pricesError.classList.remove("hidden");
}


function hideError() {
    pricesError.classList.add("hidden");
}


function formatPrice(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "—";
    }

    return `₹${number.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    })}`;
}


function formatQuantity(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "—";
    }

    return number.toLocaleString("en-IN");
}


// ============================================================
// LOAD COMMODITIES
// ============================================================

async function loadPriceCommodities() {

    try {

        const response = await getCommodities();

        const commodities =
            response?.data ||
            response?.items ||
            response ||
            [];

        commodityFilter.innerHTML =
            '<option value="">Select commodity</option>';

        commodities.forEach((commodity) => {

            const option = document.createElement("option");

            option.value = commodity.name;
            option.textContent = commodity.name;

            if (
                commodity.name.toLowerCase() ===
                PricesState.commodity.toLowerCase()
            ) {
                option.selected = true;
            }

            commodityFilter.appendChild(option);
        });

    } catch (error) {

        console.error("Commodity loading failed:", error);

        showError("Unable to load commodities.");
    }
}


// ============================================================
// LOAD MARKETS
// ============================================================

async function loadPriceMarkets() {

    try {

        const response = await getMandis();

        const mandis =
            response?.data ||
            response?.items ||
            response ||
            [];

        const puneMarkets = mandis.filter(
            mandi =>
                String(mandi.district || "").toLowerCase() ===
                PricesState.district.toLowerCase()
        );

        marketFilter.innerHTML =
            '<option value="">All Markets</option>';

        puneMarkets.forEach((mandi) => {

            const option = document.createElement("option");

            option.value = mandi.name;
            option.textContent = mandi.name;

            marketFilter.appendChild(option);
        });

    } catch (error) {

        console.error("Market loading failed:", error);
    }
}


// ============================================================
// LOAD PRICES
// ============================================================

async function loadPrices() {

    showLoading(true);
    hideError();

    pricesEmpty.classList.add("hidden");
    priceSummary.classList.add("hidden");

    pricesTableBody.innerHTML = "";

    try {

        const params = {
            district: PricesState.district,
            commodity: PricesState.commodity
        };

        if (PricesState.market) {
            params.market = PricesState.market;
        }

        const response = await getRates(params);

        const rates =
            response?.data ||
            response?.items ||
            response ||
            [];

        if (!Array.isArray(rates) || rates.length === 0) {

            pricesEmpty.classList.remove("hidden");

            showLoading(false);

            return;
        }

        renderPriceSummary(rates);

        renderPriceTable(rates);

        priceSummary.classList.remove("hidden");

    } catch (error) {

        console.error("Price loading failed:", error);

        showError(
            "Unable to load prices. Please check the backend connection."
        );

    } finally {

        showLoading(false);
    }
}


// ============================================================
// SUMMARY
// ============================================================

function renderPriceSummary(rates) {

    const markets = new Set();

    const minPrices = [];
    const maxPrices = [];
    const modalPrices = [];

    rates.forEach(rate => {

        if (rate.market) {
            markets.add(rate.market);
        }

        if (rate.min_price !== null) {
            minPrices.push(Number(rate.min_price));
        }

        if (rate.max_price !== null) {
            maxPrices.push(Number(rate.max_price));
        }

        if (rate.modal_price !== null) {
            modalPrices.push(Number(rate.modal_price));
        }
    });


    marketCount.textContent = markets.size;

    lowestPrice.textContent =
        minPrices.length
            ? formatPrice(Math.min(...minPrices))
            : "—";

    highestPrice.textContent =
        maxPrices.length
            ? formatPrice(Math.max(...maxPrices))
            : "—";

    const modalAverage =
        modalPrices.length
            ? modalPrices.reduce((a, b) => a + b, 0) /
              modalPrices.length
            : null;

    averageModal.textContent =
        modalAverage !== null
            ? formatPrice(modalAverage)
            : "—";
}


// ============================================================
// TABLE
// ============================================================

function renderPriceTable(rates) {

    pricesTableBody.innerHTML = "";

    rates.forEach(rate => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeHtml(rate.market || "—")}</strong>
            </td>

            <td>
                ${escapeHtml(rate.commodity || "—")}
            </td>

            <td>
                ${escapeHtml(rate.variety || "—")}
            </td>

            <td>
                ${formatPrice(rate.min_price)}
            </td>

            <td>
                ${formatPrice(rate.max_price)}
            </td>

            <td>
                <strong>
                    ${formatPrice(rate.modal_price)}
                </strong>
            </td>

            <td>
                ${formatQuantity(rate.arrival_quantity)}
            </td>

            <td>
                ${escapeHtml(rate.reported_date || "—")}
            </td>
        `;

        pricesTableBody.appendChild(row);
    });
}


// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// FILTER EVENTS
// ============================================================

applyFiltersButton.addEventListener("click", async () => {

    PricesState.commodity =
        commodityFilter.value || "Onion";

    PricesState.district =
        districtFilter.value || "Pune";

    PricesState.market =
        marketFilter.value || "";

    await loadPrices();
});


commodityFilter.addEventListener("change", () => {

    PricesState.commodity =
        commodityFilter.value || "Onion";

});


districtFilter.addEventListener("change", async () => {

    PricesState.district =
        districtFilter.value || "Pune";

    await loadPriceMarkets();
});


// ============================================================
// INITIALIZE
// ============================================================

async function initializePricesPage() {

    await loadPriceCommodities();

    await loadPriceMarkets();

    await loadPrices();
}


document.addEventListener(
    "DOMContentLoaded",
    initializePricesPage
);