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
    initialized: false
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
        .replace(/[()[\]{}.,'"\-_/]/g, "");
}


/*
 * Convert a value safely into a number.
 */
function safeNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : null;
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

        /*
         * Debug coordinate information.
         */
        console.table(
            NearbyState.mandis.map(mandi => ({
                name: mandi.name,
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

async function loadNearbyRates() {

    try {

        const response =
            await window.MandiPlusAPI.getRates({
                district: "Pune",
                commodity: NearbyState.commodity,
                page_size: 50
            });

        NearbyState.rates =
            Array.isArray(response)
                ? response
                : Array.isArray(response?.data)
                    ? response.data
                    : [];

        console.log(
            "[Nearby] Rates loaded:",
            NearbyState.rates.length,
            "for",
            NearbyState.commodity
        );

        /*
         * Debugging table.
         */
        console.table(
            NearbyState.rates.map(rate => ({
                market: rate.market,
                normalizedMarket:
                    normalizeMarketName(rate.market),
                commodity: rate.commodity,
                variety: rate.variety,
                grade: rate.grade,
                min: rate.min_price,
                modal: rate.modal_price,
                max: rate.max_price,
                date: rate.reported_date
            }))
        );

    } catch (error) {

        console.error(
            "[Nearby] Failed to load rates:",
            error
        );

        NearbyState.rates = [];
    }
}


/* ============================================================
   GET BEST RATE FOR MANDI
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
     * Match market names using normalized values.
     */
    const matchingRates =
        NearbyState.rates.filter(rate => {

            const normalizedRateMarket =
                normalizeMarketName(rate.market);

            return (
                normalizedRateMarket ===
                normalizedMandi
            );
        });

    /*
     * No matching market.
     */
    if (!matchingRates.length) {

        console.warn(
            `[Nearby] No rate found for mandi: "${mandiName}"`
        );

        const possibleMarkets =
            NearbyState.rates
                .map(rate => rate.market)
                .filter(Boolean);

        console.warn(
            "[Nearby] Available API markets:",
            possibleMarkets
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
            .map(rate => rate.reported_date)
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
        validDates[validDates.length - 1];

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
                rate.reported_date === latestDate
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
                safeNumber(rate.modal_price);

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

                return (
                    safeNumber(rate.modal_price) >
                    safeNumber(best.modal_price)
                )
                    ? rate
                    : best;
            },
            null
        );


    /*
     * Return a clean price object.
     */
    return {

        modal_price:
            safeNumber(bestRate.modal_price),

        min_price:
            safeNumber(bestRate.min_price),

        max_price:
            safeNumber(bestRate.max_price),

        reported_date:
            bestRate.reported_date,

        variety:
            bestRate.variety || "",

        grade:
            bestRate.grade || "",

        market:
            bestRate.market || mandiName
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
        !Number.isFinite(userLatitude) ||
        !Number.isFinite(userLongitude)
    ) {

        console.error(
            "[Nearby] Invalid user coordinates."
        );

        return [];
    }

    /*
     * Save coordinates so that commodity changes
     * can recalculate nearby mandis later.
     */
    NearbyState.latitude =
        userLatitude;

    NearbyState.longitude =
        userLongitude;

    const mandisWithDistance =
        NearbyState.mandis

            /*
             * Only use mandis with coordinates.
             */
            .filter(mandi => {

                return (
                    Number.isFinite(
                        Number(mandi.latitude)
                    ) &&
                    Number.isFinite(
                        Number(mandi.longitude)
                    )
                );

            })

            /*
             * Calculate distance and price.
             */
            .map(mandi => {

                const distance =
                    calculateDistance(
                        userLatitude,
                        userLongitude,
                        Number(mandi.latitude),
                        Number(mandi.longitude)
                    );

                const rate =
                    getMandiRate(mandi.name);

                return {

                    ...mandi,

                    distance_km:
                        distance,

                    rate:
                        rate

                };

            })

            /*
             * Nearest first.
             */
            .sort(
                (a, b) =>
                    a.distance_km -
                    b.distance_km
            );


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
        mandis.filter(
            mandi =>
                mandi.rate &&
                Number.isFinite(
                    Number(mandi.rate.modal_price)
                ) &&
                Number(mandi.rate.modal_price) > 0
        );

    if (!withRates.length) {
        return null;
    }

    return withRates.reduce(
        (best, mandi) => {

            if (!best) {
                return mandi;
            }

            return Number(
                mandi.rate.modal_price
            ) >
            Number(
                best.rate.modal_price
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

function renderNearbyMandis(mandis = NearbyState.nearbyMandis) {

    const container =
        nearbyElement("nearbyMandis");

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
        getBestNearbyPrice(mandis);

    container.innerHTML =

        mandis.map(
            (mandi, index) => {

                const distance =
                    mandi.distance_km < 1

                        ? `${Math.round(
                            mandi.distance_km * 1000
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
                    bestMandi.name === mandi.name;

                return `

                    <article
                        class="
                            nearby-mandi-card
                            ${isBest ? "best-nearby-mandi" : ""}
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
                                    ${mandi.name || "Unknown Mandi"}
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
                                ${mandi.district || ""}
                                ${
                                    mandi.state
                                        ? `, ${mandi.state}`
                                        : ""
                                }
                            </p>


                            ${
                                hasPrice

                                    ? `

                                        <div class="nearby-price">

                                            <span>
                                                ${NearbyState.commodity}
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
                                            rate?.variety
                                                ? `
                                                    <div class="nearby-price-range">
                                                        Variety: ${rate.variety}
                                                    </div>
                                                `
                                                : ""
                                        }

                                        ${
                                            rate?.reported_date
                                                ? `
                                                    <div class="nearby-price-range">
                                                        Updated: ${rate.reported_date}
                                                    </div>
                                                `
                                                : ""
                                        }

                                      `

                                    : `

                                        <div class="nearby-no-price">
                                            Price unavailable
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

async function handleLocationDetected(event) {

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
        !Number.isFinite(Number(latitude)) ||
        !Number.isFinite(Number(longitude))
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
     * Make sure rates are loaded before
     * calculating nearby prices.
     */
    if (!NearbyState.rates.length) {

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

async function handleCommoditySelected(event) {

    const selectedCommodity =
        event.detail?.commodity;

    if (!selectedCommodity) {

        console.warn(
            "[Nearby] Commodity event received without commodity."
        );

        return;
    }

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

    NearbyState.commodity =
        selectedCommodity;

    updateNearbyCommodityHeading();

    /*
     * Reload prices for the selected commodity.
     */
    await loadNearbyRates();

    console.table(
    NearbyState.rates.map(rate => ({
        market: rate.market,
        commodity: rate.commodity,
        modal: rate.modal_price,
        min: rate.min_price,
        max: rate.max_price,
        date: rate.reported_date
    }))
    );

    /*
     * If user location has already been detected,
     * recalculate nearby mandis with the new prices.
     */
    if (
        Number.isFinite(NearbyState.latitude) &&
        Number.isFinite(NearbyState.longitude)
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

    } else if (NearbyState.nearbyMandis.length) {

        /*
         * Fallback in case nearby mandis exist but
         * coordinates are not currently stored.
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

    if (NearbyState.initialized) {
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
     * Load current commodity prices.
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


    NearbyState.initialized = true;

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