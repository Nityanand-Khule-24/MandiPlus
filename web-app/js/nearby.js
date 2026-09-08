/* ============================================================
   MANDIPLUS - NEARBY MANDIS
   ============================================================ */

const NearbyState = {
    mandis: [],
    nearbyMandis: [],
    rates: [],

    commodity: "Onion",

    latitude: null,
    longitude: null,

    initialized: false,
    loadingRates: false
};


/* ============================================================
   HELPERS
   ============================================================ */

function nearbyElement(id) {
    return document.getElementById(id);
}


/*
 * Normalize mandi/market names so that small formatting
 * differences do not prevent matching.
 *
 * Examples:
 * "Pune(Pimpri)"
 * "Pune (Pimpri)"
 * "pune(pimpri)"
 *
 * All become:
 * "punepimpri"
 */
function normalizeMarketName(name) {

    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[()[\]{}.,'"_\/\\-]/g, "");
}


/*
 * Safe number conversion.
 */
function safeNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
}


/*
 * Escape HTML before inserting API/database values
 * into innerHTML.
 */
function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/*
 * Calculate distance between two coordinates
 * using the Haversine formula.
 */
function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const earthRadiusKm = 6371;

    const toRadians = degrees =>
        degrees * Math.PI / 180;

    const dLat =
        toRadians(lat2 - lat1);

    const dLon =
        toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return earthRadiusKm * c;
}


/* ============================================================
   COMMODITY HEADING
   ============================================================ */

function updateNearbyCommodityHeading() {

    const heading =
        nearbyElement("nearbyCommodityName");

    if (!heading) {
        return;
    }

    heading.textContent =
        NearbyState.commodity;
}


/* ============================================================
   LOAD MANDIS
   ============================================================ */

async function loadNearbyMandis() {

    try {

        const response =
            await window.MandiPlusAPI.getMandis();

        NearbyState.mandis =
            Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                    ? response.data
                    : [];

        console.log(
            "[Nearby] Mandis loaded:",
            NearbyState.mandis.length
        );

        console.table(
            NearbyState.mandis.map(mandi => ({
                name: mandi.name,
                state: mandi.state,
                district: mandi.district,
                latitude: mandi.latitude,
                longitude: mandi.longitude
            }))
        );

    } catch (error) {

        console.error(
            "[Nearby] Failed to load mandis:",
            error
        );

        NearbyState.mandis = [];
    }
}


/* ============================================================
   LOAD COMMODITY RATES
   ============================================================ */

/*
 * IMPORTANT:
 *
 * Nearby Mandis are not restricted to Pune.
 *
 * Therefore we DO NOT send:
 *
 *     district: "Pune"
 *
 * Instead we load the selected commodity across all available
 * markets.
 *
 * We intentionally keep page_size at 50 because this value is
 * already accepted by the current backend.
 *
 * Multiple pages are loaded when necessary.
 */

async function loadNearbyRates() {

    if (NearbyState.loadingRates) {
        console.warn(
            "[Nearby] Rate loading already in progress."
        );

        return;
    }

    NearbyState.loadingRates = true;

    try {

        const pageSize = 50;

        /*
         * Safety limit.
         *
         * 20 pages x 50 = maximum 1000 records.
         *
         * This prevents an accidental infinite loop.
         */
        const maxPages = 20;

        let allRates = [];

        let currentPage = 1;

        let totalCount = null;


        while (currentPage <= maxPages) {

            console.log(
                `[Nearby] Loading ${NearbyState.commodity} rates - page ${currentPage}`
            );


            const response =
                await window.MandiPlusAPI.getRates({

                    commodity:
                        NearbyState.commodity,

                    page:
                        currentPage,

                    page_size:
                        pageSize
                });


            const pageRates =
                Array.isArray(response)
                    ? response
                    : Array.isArray(response?.data)
                        ? response.data
                        : [];


            /*
             * Backend may provide total count.
             */
            if (
                totalCount === null &&
                response &&
                Number.isFinite(
                    Number(response.count)
                )
            ) {

                totalCount =
                    Number(response.count);
            }


            /*
             * Add current page.
             */
            allRates.push(
                ...pageRates
            );


            console.log(
                `[Nearby] Page ${currentPage} loaded: ${pageRates.length} records`
            );


            /*
             * Stop conditions.
             */

            if (!pageRates.length) {
                break;
            }


            /*
             * If backend tells us total count,
             * stop when everything is loaded.
             */
            if (
                totalCount !== null &&
                allRates.length >= totalCount
            ) {

                break;
            }


            /*
             * If fewer than pageSize were returned,
             * there is no next page.
             */
            if (
                pageRates.length < pageSize
            ) {

                break;
            }


            currentPage++;
        }


        /*
         * Remove duplicate rate records.
         *
         * Key:
         * market + commodity + variety + grade + date
         */
        const uniqueRates = [];

        const seenRates = new Set();


        allRates.forEach(rate => {

            const key = [
                normalizeMarketName(rate.market),

                String(
                    rate.commodity || ""
                )
                    .trim()
                    .toLowerCase(),

                String(
                    rate.variety || ""
                )
                    .trim()
                    .toLowerCase(),

                String(
                    rate.grade || ""
                )
                    .trim()
                    .toLowerCase(),

                String(
                    rate.reported_date || ""
                )

            ].join("|");


            if (!seenRates.has(key)) {

                seenRates.add(key);

                uniqueRates.push(rate);
            }
        });


        NearbyState.rates =
            uniqueRates;


        console.log(
            "[Nearby] Rates loaded:",
            NearbyState.rates.length
        );

        console.log(
            "[Nearby] Commodity:",
            NearbyState.commodity
        );

        console.log(
            "[Nearby] API total count:",
            totalCount
        );


        /*
         * Show available API markets.
         */
        const availableMarkets = [
            ...new Set(
                NearbyState.rates
                    .map(rate => rate.market)
                    .filter(Boolean)
            )
        ];


        console.log(
            "[Nearby] Available API markets:",
            availableMarkets
        );


        /*
         * Useful debugging table.
         */
        console.table(
            NearbyState.rates.map(rate => ({

                market:
                    rate.market,

                district:
                    rate.district,

                state:
                    rate.state,

                commodity:
                    rate.commodity,

                variety:
                    rate.variety,

                grade:
                    rate.grade,

                min:
                    rate.min_price,

                modal:
                    rate.modal_price,

                max:
                    rate.max_price,

                date:
                    rate.reported_date
            }))
        );


    } catch (error) {

        console.error(
            "[Nearby] Failed to load rates:",
            error
        );

        NearbyState.rates = [];

    } finally {

        NearbyState.loadingRates = false;
    }
}


/* ============================================================
   FIND BEST RATE FOR MANDI
   ============================================================ */

function getMandiRate(mandiName) {

    const normalizedMandi =
        normalizeMarketName(mandiName);


    console.log(
        `[Nearby] Searching rate for: "${mandiName}"`,
        "→",
        normalizedMandi
    );


    /*
     * --------------------------------------------------------
     * 1. EXACT MATCH
     * --------------------------------------------------------
     */

    let matchingRates =
        NearbyState.rates.filter(rate => {

            const normalizedRateMarket =
                normalizeMarketName(
                    rate.market
                );

            return (
                normalizedRateMarket ===
                normalizedMandi
            );
        });


    /*
     * --------------------------------------------------------
     * 2. SAFE FALLBACK MATCH
     * --------------------------------------------------------
     *
     * Handles small differences where one market name contains
     * the other.
     *
     * Example:
     *
     * Mandi:
     * "Pune(Pimpri)"
     *
     * API:
     * "Pune (Pimpri) "
     *
     * Exact normalization already handles this.
     *
     * This fallback is only used when exact matching fails.
     */

    if (
        !matchingRates.length &&
        normalizedMandi.length >= 6
    ) {

        const fallbackMatches =
            NearbyState.rates.filter(rate => {

                const normalizedRateMarket =
                    normalizeMarketName(
                        rate.market
                    );

                if (
                    !normalizedRateMarket ||
                    normalizedRateMarket.length < 6
                ) {
                    return false;
                }

                return (
                    normalizedRateMarket.includes(
                        normalizedMandi
                    ) ||
                    normalizedMandi.includes(
                        normalizedRateMarket
                    )
                );
            });


        /*
         * Only accept fallback when there is
         * exactly one unique market candidate.
         */
        const uniqueMarkets = [
            ...new Set(
                fallbackMatches.map(
                    rate =>
                        normalizeMarketName(
                            rate.market
                        )
                )
            )
        ];


        if (
            uniqueMarkets.length === 1
        ) {

            matchingRates =
                fallbackMatches;

            console.warn(
                `[Nearby] Fallback market match: "${mandiName}" → "${fallbackMatches[0]?.market}"`
            );
        }
    }


    /*
     * --------------------------------------------------------
     * 3. NO MATCH
     * --------------------------------------------------------
     */

    if (!matchingRates.length) {

        console.warn(
            `[Nearby] No rate found for mandi: "${mandiName}"`
        );

        return null;
    }


    console.log(
        `[Nearby] Found ${matchingRates.length} rate(s) for "${mandiName}"`,
        matchingRates
    );


    /* ========================================================
       FIND LATEST DATE
       ======================================================== */

    const validDates =
        matchingRates
            .map(
                rate =>
                    rate.reported_date
            )
            .filter(Boolean)
            .sort(
                (a, b) =>
                    new Date(a) -
                    new Date(b)
            );


    if (!validDates.length) {

        console.warn(
            `[Nearby] No reported date for "${mandiName}"`
        );

        return null;
    }


    const latestDate =
        validDates[
            validDates.length - 1
        ];


    console.log(
        `[Nearby] Latest date for "${mandiName}":`,
        latestDate
    );


    /* ========================================================
       KEEP ONLY LATEST-DAY RATES
       ======================================================== */

    const latestRates =
        matchingRates.filter(
            rate =>
                rate.reported_date ===
                latestDate
        );


    if (!latestRates.length) {
        return null;
    }


    /* ========================================================
       REMOVE INVALID PRICES
       ======================================================== */

    const validRates =
        latestRates.filter(rate => {

            const modal =
                safeNumber(
                    rate.modal_price
                );

            return (
                modal !== null &&
                modal > 0
            );
        });


    if (!validRates.length) {

        console.warn(
            `[Nearby] No valid modal price for "${mandiName}"`
        );

        return null;
    }


    /* ========================================================
       SELECT BEST MODAL PRICE
       ======================================================== */

    const bestRate =
        validRates.reduce(
            (best, rate) => {

                if (!best) {
                    return rate;
                }


                const currentModal =
                    safeNumber(
                        rate.modal_price
                    );

                const bestModal =
                    safeNumber(
                        best.modal_price
                    );


                return (
                    currentModal >
                    bestModal
                )
                    ? rate
                    : best;

            },
            null
        );


    /*
     * Return clean price object.
     */

    return {

        modal_price:
            safeNumber(
                bestRate.modal_price
            ),

        min_price:
            safeNumber(
                bestRate.min_price
            ),

        max_price:
            safeNumber(
                bestRate.max_price
            ),

        reported_date:
            bestRate.reported_date,

        variety:
            bestRate.variety || "",

        grade:
            bestRate.grade || "",

        market:
            bestRate.market ||
            mandiName
    };
}


/* ============================================================
   FIND NEARBY MANDIS
   ============================================================ */

function findNearbyMandis(
    latitude,
    longitude,
    limit = 5
) {

    if (!NearbyState.mandis.length) {

        console.warn(
            "[Nearby] No mandi data available."
        );

        return [];
    }


    const userLatitude =
        Number(latitude);

    const userLongitude =
        Number(longitude);


    if (
        !Number.isFinite(
            userLatitude
        ) ||
        !Number.isFinite(
            userLongitude
        )
    ) {

        console.error(
            "[Nearby] Invalid user coordinates."
        );

        return [];
    }


    /*
     * Save coordinates.
     */

    NearbyState.latitude =
        userLatitude;

    NearbyState.longitude =
        userLongitude;


    /*
     * Calculate distance for every mandi
     * that has valid coordinates.
     */

    const mandisWithDistance =
        NearbyState.mandis

            .filter(mandi => {

                return (
                    Number.isFinite(
                        Number(
                            mandi.latitude
                        )
                    ) &&
                    Number.isFinite(
                        Number(
                            mandi.longitude
                        )
                    )
                );

            })

            .map(mandi => {

                const distance =
                    calculateDistance(

                        userLatitude,

                        userLongitude,

                        Number(
                            mandi.latitude
                        ),

                        Number(
                            mandi.longitude
                        )
                    );


                const rate =
                    getMandiRate(
                        mandi.name
                    );


                return {

                    ...mandi,

                    distance_km:
                        distance,

                    rate:
                        rate
                };

            })

            .sort(
                (a, b) =>
                    a.distance_km -
                    b.distance_km
            );


    /*
     * Keep only requested number.
     */

    NearbyState.nearbyMandis =
        mandisWithDistance.slice(
            0,
            limit
        );


    console.log(
        "[Nearby] Nearest mandis:",
        NearbyState.nearbyMandis
    );


    return NearbyState.nearbyMandis;
}


/* ============================================================
   FIND BEST PRICE
   ============================================================ */

function getBestNearbyPrice(mandis) {

    const withRates =
        mandis.filter(mandi => {

            if (!mandi.rate) {
                return false;
            }


            const modal =
                safeNumber(
                    mandi.rate.modal_price
                );


            return (
                modal !== null &&
                modal > 0
            );
        });


    if (!withRates.length) {
        return null;
    }


    return withRates.reduce(
        (best, mandi) => {

            if (!best) {
                return mandi;
            }


            const currentPrice =
                safeNumber(
                    mandi.rate.modal_price
                );

            const bestPrice =
                safeNumber(
                    best.rate.modal_price
                );


            return (
                currentPrice >
                bestPrice
            )
                ? mandi
                : best;

        },
        null
    );
}


/* ============================================================
   RENDER NEARBY MANDIS
   ============================================================ */

function renderNearbyMandis(
    mandis = NearbyState.nearbyMandis
) {

    const container =
        nearbyElement(
            "nearbyMandis"
        );


    if (!container) {

        console.warn(
            "[Nearby] #nearbyMandis not found."
        );

        return;
    }


    if (!mandis.length) {

        container.innerHTML = `

            <div class="nearby-empty">

                <div class="nearby-empty-icon">
                    📍
                </div>

                <h3>
                    No nearby mandi found
                </h3>

                <p>
                    We couldn't find mandi locations
                    with available coordinates.
                </p>

            </div>

        `;

        return;
    }


    const bestMandi =
        getBestNearbyPrice(
            mandis
        );


    container.innerHTML =

        mandis.map(
            (mandi, index) => {

                const distance =
                    mandi.distance_km < 1

                        ? `${Math.round(
                            mandi.distance_km *
                            1000
                        )} m`

                        : `${mandi.distance_km.toFixed(
                            1
                        )} km`;


                const rate =
                    mandi.rate;


                const modalPrice =
                    safeNumber(
                        rate?.modal_price
                    );


                const minPrice =
                    safeNumber(
                        rate?.min_price
                    );


                const maxPrice =
                    safeNumber(
                        rate?.max_price
                    );


                const hasPrice =
                    modalPrice !== null &&
                    modalPrice > 0;


                const isBest =
                    bestMandi &&
                    bestMandi.name ===
                        mandi.name;


                const mandiName =
                    escapeHtml(
                        mandi.name ||
                        "Unknown Mandi"
                    );


                const district =
                    escapeHtml(
                        mandi.district ||
                        ""
                    );


                const state =
                    escapeHtml(
                        mandi.state ||
                        ""
                    );


                const commodity =
                    escapeHtml(
                        NearbyState.commodity
                    );


                const variety =
                    escapeHtml(
                        rate?.variety ||
                        ""
                    );


                const reportedDate =
                    escapeHtml(
                        rate?.reported_date ||
                        ""
                    );


                return `

                    <article
                        class="
                            nearby-mandi-card
                            ${isBest
                                ? "best-nearby-mandi"
                                : ""
                            }
                        "
                    >

                        <!-- RANK -->

                        <div class="nearby-rank">
                            ${index + 1}
                        </div>


                        <!-- MANDI INFORMATION -->

                        <div class="nearby-mandi-info">

                            <div class="nearby-mandi-title-row">

                                <h3>
                                    ${mandiName}
                                </h3>


                                ${
                                    isBest

                                        ? `

                                            <span class="nearby-best-badge">
                                                Best Price
                                            </span>

                                          `

                                        : ""
                                }

                            </div>


                            <p>
                                ${district}

                                ${
                                    state
                                        ? `, ${state}`
                                        : ""
                                }
                            </p>


                            ${
                                hasPrice

                                    ? `

                                        <div class="nearby-price">

                                            <span>
                                                ${commodity}
                                            </span>

                                            <strong>
                                                ₹${modalPrice.toLocaleString(
                                                    "en-IN"
                                                )}
                                            </strong>

                                            <small>
                                                / quintal
                                            </small>

                                        </div>


                                        ${
                                            minPrice !== null &&
                                            maxPrice !== null

                                                ? `

                                                    <div class="nearby-price-range">

                                                        ₹${minPrice.toLocaleString(
                                                            "en-IN"
                                                        )}

                                                        —

                                                        ₹${maxPrice.toLocaleString(
                                                            "en-IN"
                                                        )}

                                                    </div>

                                                  `

                                                : ""
                                        }


                                        ${
                                            variety

                                                ? `

                                                    <div class="nearby-price-range">
                                                        Variety: ${variety}
                                                    </div>

                                                  `

                                                : ""
                                        }


                                        ${
                                            reportedDate

                                                ? `

                                                    <div class="nearby-price-range">
                                                        Updated: ${reportedDate}
                                                    </div>

                                                  `

                                                : ""
                                        }

                                      `

                                    : `

                                        <div class="nearby-no-price">
                                            Price unavailable for ${commodity}
                                        </div>

                                      `
                            }

                        </div>


                        <!-- DISTANCE -->

                        <div class="nearby-distance">

                            <strong>
                                📍 ${distance}
                            </strong>

                            <span>
                                away
                            </span>

                        </div>

                    </article>

                `;
            }
        ).join("");
}


/* ============================================================
   HANDLE LOCATION
   ============================================================ */

async function handleLocationDetected(
    event
) {

    const {
        latitude,
        longitude
    } = event.detail || {};


    console.log(
        "[Nearby] User coordinates:",
        latitude,
        longitude
    );


    if (
        !Number.isFinite(
            Number(latitude)
        ) ||
        !Number.isFinite(
            Number(longitude)
        )
    ) {

        console.error(
            "[Nearby] Location event contains invalid coordinates."
        );

        return;
    }


    NearbyState.latitude =
        Number(latitude);

    NearbyState.longitude =
        Number(longitude);


    /*
     * Make sure rates exist.
     */

    if (
        !NearbyState.rates.length
    ) {

        console.log(
            "[Nearby] Rates empty. Reloading..."
        );

        await loadNearbyRates();
    }


    const nearby =
        findNearbyMandis(

            NearbyState.latitude,

            NearbyState.longitude,

            5
        );


    renderNearbyMandis(
        nearby
    );
}


/* ============================================================
   HANDLE COMMODITY CHANGE
   ============================================================ */

async function handleCommoditySelected(
    event
) {

    const selectedCommodity =
        event.detail?.commodity;


    if (!selectedCommodity) {

        console.warn(
            "[Nearby] Commodity event received without commodity."
        );

        return;
    }


    /*
     * Avoid unnecessary reload.
     */

    if (
        selectedCommodity ===
        NearbyState.commodity
    ) {

        console.log(
            `[Nearby] Commodity already selected: ${selectedCommodity}`
        );

        updateNearbyCommodityHeading();

        return;
    }


    console.log(
        `[Nearby] Commodity changed: ${NearbyState.commodity} → ${selectedCommodity}`
    );


    /*
     * Update commodity.
     */

    NearbyState.commodity =
        selectedCommodity;


    updateNearbyCommodityHeading();


    /*
     * Load selected commodity rates
     * across all available markets.
     */

    await loadNearbyRates();


    /*
     * If location is available,
     * recalculate nearby mandis.
     */

    if (
        Number.isFinite(
            NearbyState.latitude
        ) &&
        Number.isFinite(
            NearbyState.longitude
        )
    ) {

        const nearby =
            findNearbyMandis(

                NearbyState.latitude,

                NearbyState.longitude,

                5
            );


        renderNearbyMandis(
            nearby
        );


    } else if (
        NearbyState.nearbyMandis.length
    ) {

        /*
         * Fallback:
         * update existing mandi prices.
         */

        NearbyState.nearbyMandis =
            NearbyState.nearbyMandis.map(
                mandi => ({

                    ...mandi,

                    rate:
                        getMandiRate(
                            mandi.name
                        )

                })
            );


        renderNearbyMandis(
            NearbyState.nearbyMandis
        );
    }


    console.log(
        `[Nearby] Updated nearby prices for ${selectedCommodity}`
    );
}


/* ============================================================
   INITIALIZE
   ============================================================ */

async function initialize() {

    if (
        NearbyState.initialized
    ) {
        return;
    }


    console.log(
        "[Nearby] Initializing nearby mandi service..."
    );


    /*
     * Set initial heading.
     */

    updateNearbyCommodityHeading();


    /*
     * Load mandi locations.
     */

    await loadNearbyMandis();


    /*
     * Load initial commodity rates.
     */

    await loadNearbyRates();


    /*
     * Listen for location detection.
     */

    document.addEventListener(
        "mandiplus:location-detected",
        handleLocationDetected
    );


    /*
     * Listen for commodity changes.
     */

    document.addEventListener(
        "mandiplus:commodity-selected",
        handleCommoditySelected
    );


    NearbyState.initialized =
        true;


    console.log(
        "[MandiPlus] Nearby mandi service initialized."
    );
}


/* ============================================================
   PUBLIC API
   ============================================================ */

window.MandiPlusNearby = {

    initialize,

    calculateDistance,

    findNearbyMandis,

    renderNearbyMandis,

    getMandiRate,

    getBestNearbyPrice,

    getState: () => ({
        ...NearbyState
    })
};