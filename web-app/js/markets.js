// ============================================================
// MANDIPLUS — MARKETS PAGE
// ============================================================

const MarketsState = {
    district: "Pune",
    search: "",
    mandis: [],
    rates: []
};


// ============================================================
// DOM
// ============================================================

const marketSearch = document.getElementById("marketSearch");
const marketDistrict = document.getElementById("marketDistrict");
const clearMarketSearch = document.getElementById("clearMarketSearch");

const marketsLoading = document.getElementById("marketsLoading");
const marketsError = document.getElementById("marketsError");
const marketsEmpty = document.getElementById("marketsEmpty");
const marketsGrid = document.getElementById("marketsGrid");

const totalMarkets = document.getElementById("totalMarkets");
const totalCommodities = document.getElementById("totalCommodities");
const selectedDistrict = document.getElementById("selectedDistrict");
const latestMarketDate = document.getElementById("latestMarketDate");


// ============================================================
// HELPERS
// ============================================================

function showMarketsLoading(show) {
    marketsLoading.classList.toggle("hidden", !show);
}


function showMarketsError(message) {
    marketsError.textContent = message;
    marketsError.classList.remove("hidden");
}


function hideMarketsError() {
    marketsError.classList.add("hidden");
}


function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
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


// ============================================================
// LOAD MANDIS
// ============================================================

async function loadMarketsData() {

    showMarketsLoading(true);
    hideMarketsError();

    try {

        const response = await getMandis();

        const mandis =
            response?.data ||
            response?.items ||
            response ||
            [];

        if (!Array.isArray(mandis)) {
            throw new Error("Invalid mandi response.");
        }

        MarketsState.mandis = mandis;

        await loadMarketRates();

        renderMarkets();

    } catch (error) {

        console.error("Markets loading failed:", error);

        showMarketsError(
            "Unable to load market information."
        );

    } finally {

        showMarketsLoading(false);
    }
}


// ============================================================
// LOAD RATES
// ============================================================

async function loadMarketRates() {

    try {

        const response = await getRates({
            district: MarketsState.district
        });

        const rates =
            response?.data ||
            response?.items ||
            response ||
            [];

        MarketsState.rates =
            Array.isArray(rates)
                ? rates
                : [];

    } catch (error) {

        console.error("Market rates loading failed:", error);

        MarketsState.rates = [];
    }
}


// ============================================================
// FILTER MARKETS
// ============================================================

function getFilteredMarkets() {

    const search =
        MarketsState.search
            .trim()
            .toLowerCase();

    return MarketsState.mandis.filter(mandi => {

        const district =
            String(mandi.district || "")
                .trim()
                .toLowerCase();

        const name =
            String(mandi.name || "")
                .trim()
                .toLowerCase();

        if (
            MarketsState.district &&
            district !== MarketsState.district.toLowerCase()
        ) {
            return false;
        }

        if (
            search &&
            !name.includes(search)
        ) {
            return false;
        }

        return true;
    });
}


// ============================================================
// FIND MARKET RATES
// ============================================================

function getMarketRates(marketName) {

    return MarketsState.rates.filter(rate => {

        const rateMarket =
            String(rate.market || "")
                .trim()
                .toLowerCase();

        return (
            rateMarket ===
            String(marketName)
                .trim()
                .toLowerCase()
        );
    });
}


// ============================================================
// RENDER
// ============================================================

function renderMarkets() {

    const markets = getFilteredMarkets();

    marketsGrid.innerHTML = "";

    marketsEmpty.classList.toggle(
        "hidden",
        markets.length !== 0
    );

    if (markets.length === 0) {

        updateSummary([]);

        return;
    }

    markets.forEach(market => {

        const rates =
            getMarketRates(market.name);

        const commodities =
            new Set(
                rates
                    .map(rate => rate.commodity)
                    .filter(Boolean)
            );

        const modalPrices =
            rates
                .map(rate => Number(rate.modal_price))
                .filter(value => !Number.isNaN(value));

        const averageModal =
            modalPrices.length
                ? modalPrices.reduce(
                    (sum, value) => sum + value,
                    0
                ) / modalPrices.length
                : null;

        const card =
            document.createElement("article");

        card.className = "market-card";

        card.innerHTML = `

            <div class="market-card-header">

                <div class="market-icon">
                    🏪
                </div>

                <div>

                    <h3>
                        ${escapeHtml(market.name)}
                    </h3>

                    <p>
                        ${escapeHtml(market.district || "Pune")},
                        ${escapeHtml(market.state || "Maharashtra")}
                    </p>

                </div>

            </div>


            <div class="market-card-stats">

                <div>

                    <span>
                        Commodities
                    </span>

                    <strong>
                        ${commodities.size}
                    </strong>

                </div>


                <div>

                    <span>
                        Price Records
                    </span>

                    <strong>
                        ${rates.length}
                    </strong>

                </div>


                <div>

                    <span>
                        Avg Modal
                    </span>

                    <strong>
                        ${formatPrice(averageModal)}
                    </strong>

                </div>

            </div>


            <div class="market-card-footer">

                <span class="market-status">
                    ● Data available
                </span>

                <a
                    href="prices.html"
                    class="market-link"
                >
                    View Prices →
                </a>

            </div>
        `;

        marketsGrid.appendChild(card);
    });

    updateSummary(markets);
}


// ============================================================
// SUMMARY
// ============================================================

function updateSummary(markets) {

    totalMarkets.textContent = markets.length;

    selectedDistrict.textContent =
        MarketsState.district || "All";

    const commoditySet =
        new Set();

    MarketsState.rates.forEach(rate => {

        if (rate.commodity) {
            commoditySet.add(rate.commodity);
        }
    });

    totalCommodities.textContent =
        commoditySet.size;

    const dates =
        MarketsState.rates
            .map(rate => rate.reported_date)
            .filter(Boolean)
            .sort();

    latestMarketDate.textContent =
        dates.length
            ? dates[dates.length - 1]
            : "—";
}


// ============================================================
// SEARCH
// ============================================================

marketSearch.addEventListener(
    "input",
    () => {

        MarketsState.search =
            marketSearch.value;

        renderMarkets();
    }
);


// ============================================================
// DISTRICT
// ============================================================

marketDistrict.addEventListener(
    "change",
    async () => {

        MarketsState.district =
            marketDistrict.value || "Pune";

        selectedDistrict.textContent =
            MarketsState.district;

        await loadMarketRates();

        renderMarkets();
    }
);


// ============================================================
// CLEAR
// ============================================================

clearMarketSearch.addEventListener(
    "click",
    () => {

        marketSearch.value = "";

        MarketsState.search = "";

        renderMarkets();
    }
);


// ============================================================
// INITIALIZE
// ============================================================

async function initializeMarketsPage() {

    await loadMarketsData();
}


document.addEventListener(
    "DOMContentLoaded",
    initializeMarketsPage
);