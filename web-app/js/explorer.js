/* =========================================================
   MandiPlus — Market Explorer
========================================================= */

(function () {

    "use strict";

    const state = {
        mandis: [],
        rates: []
    };


    /* =====================================================
       Helpers
    ===================================================== */

    function $(selector) {
        return document.querySelector(selector);
    }


    function escapeHTML(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
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

        return `₹${number.toLocaleString("en-IN")}`;
    }


    /* =====================================================
       Load Mandis
    ===================================================== */

    async function loadMandis() {

        try {

            console.info(
                "[MandiPlus] Loading mandis..."
            );

            const response =
                await window.MandiPlusAPI.getMandis();


            state.mandis =
                Array.isArray(response.data)
                    ? response.data
                    : [];


            console.info(
                `[MandiPlus] ${state.mandis.length} mandis loaded`
            );


            populateDistricts();


            return state.mandis;

        } catch (error) {

            console.error(
                "[MandiPlus] Mandi loading failed:",
                error
            );

            return [];
        }
    }


    /* =====================================================
       Load Rates
    ===================================================== */

    async function loadRates() {

        try {

            console.info(
                "[MandiPlus] Loading explorer rates..."
            );

            const response =
                await window.MandiPlusAPI.getRates();


            if (Array.isArray(response)) {

                state.rates = response;

            } else if (
                Array.isArray(response.data)
            ) {

                state.rates = response.data;

            } else {

                state.rates = [];
            }


            console.info(
                `[MandiPlus] ${state.rates.length} rates loaded`
            );


            return state.rates;

        } catch (error) {

            console.error(
                "[MandiPlus] Rate loading failed:",
                error
            );

            return [];
        }
    }


    /* =====================================================
       Load Commodities
    ===================================================== */

    async function loadCommodities() {

        const select =
            $("#commodityFilter");


        if (!select) {
            return;
        }


        try {

            const response =
                await window.MandiPlusAPI.getCommodities();


            const commodities =
                Array.isArray(response)
                    ? response
                    : response.data || [];


            select.innerHTML = `
                <option value="">
                    All Commodities
                </option>

                ${commodities
                    .map(commodity => {

                        const name =
                            commodity.name ??
                            commodity.commodity ??
                            "";

                        return `
                            <option value="${escapeHTML(name)}">
                                ${escapeHTML(name)}
                            </option>
                        `;
                    })
                    .join("")
                }
            `;

        } catch (error) {

            console.error(
                "[MandiPlus] Commodity loading failed:",
                error
            );
        }
    }


    /* =====================================================
       Districts
    ===================================================== */

    function populateDistricts() {

        const select =
            $("#districtFilter");


        if (!select) {
            return;
        }


        const districts = [
            ...new Set(
                state.mandis
                    .map(mandi => mandi.district)
                    .filter(Boolean)
            )
        ].sort();


        select.innerHTML = `
            <option value="">
                All Districts
            </option>

            ${districts
                .map(district => `
                    <option value="${escapeHTML(district)}">
                        ${escapeHTML(district)}
                    </option>
                `)
                .join("")
            }
        `;

        populateMarkets("");
    }


    /* =====================================================
       Markets
    ===================================================== */

    function populateMarkets(district = "") {

        const select =
            $("#marketFilter");


        if (!select) {
            return;
        }


        let markets =
            state.mandis;


        if (district) {

            markets =
                markets.filter(
                    mandi =>
                        mandi.district === district
                );
        }


        select.innerHTML = `
            <option value="">
                All Markets
            </option>

            ${markets
                .map(mandi => `
                    <option value="${escapeHTML(mandi.name)}">
                        ${escapeHTML(mandi.name)}
                    </option>
                `)
                .join("")
            }
        `;
    }


    /* =====================================================
       Filter Rates
    ===================================================== */

    function filterRates() {

        const district =
            $("#districtFilter")?.value || "";

        const market =
            $("#marketFilter")?.value || "";

        const commodity =
            $("#commodityFilter")?.value || "";


        return state.rates.filter(rate => {

            const matchesDistrict =
                !district ||
                rate.district === district;


            const matchesMarket =
                !market ||
                rate.market === market;


            const matchesCommodity =
                !commodity ||
                String(rate.commodity)
                    .toLowerCase() ===
                String(commodity)
                    .toLowerCase();


            return (
                matchesDistrict &&
                matchesMarket &&
                matchesCommodity
            );
        });
    }


    /* =====================================================
       Render Results
    ===================================================== */

    function renderResults(rates) {

        const container =
            $("#marketResults");


        if (!container) {
            return;
        }


        if (!rates.length) {

            container.innerHTML = `
                <div class="empty-state">

                    <strong>
                        No market data found
                    </strong>

                    <p>
                        Try changing your
                        district, market,
                        or commodity.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            rates
                .map(createMarketCard)
                .join("");
    }


    /* =====================================================
       Market Card
    ===================================================== */

    function createMarketCard(rate) {

        const market =
            rate.market ||
            "Unknown Market";


        const commodity =
            rate.commodity ||
            "Unknown Commodity";


        const district =
            rate.district ||
            "";


        const variety =
            rate.variety ||
            "";


        const grade =
            rate.grade ||
            "";


        const arrival =
            rate.arrival_quantity;


        return `
            <article class="market-result-card">

                <div class="market-result-header">

                    <div>

                        <span class="market-location">
                            📍 ${escapeHTML(district)}
                        </span>

                        <h3>
                            ${escapeHTML(market)}
                        </h3>

                    </div>

                    <span class="market-badge">
                        ${escapeHTML(commodity)}
                    </span>

                </div>


                ${
                    variety
                        ? `
                            <p class="market-variety">
                                Variety:
                                ${escapeHTML(variety)}
                            </p>
                          `
                        : ""
                }


                ${
                    grade
                        ? `
                            <p class="market-variety">
                                Grade:
                                ${escapeHTML(grade)}
                            </p>
                          `
                        : ""
                }


                <div class="market-price-grid">

                    <div>

                        <small>
                            Minimum
                        </small>

                        <strong>
                            ${formatPrice(
                                rate.min_price
                            )}
                        </strong>

                    </div>


                    <div>

                        <small>
                            Modal
                        </small>

                        <strong class="modal-price">
                            ${formatPrice(
                                rate.modal_price
                            )}
                        </strong>

                    </div>


                    <div>

                        <small>
                            Maximum
                        </small>

                        <strong>
                            ${formatPrice(
                                rate.max_price
                            )}
                        </strong>

                    </div>

                </div>


                <div class="market-result-meta">

                    <span>
                        📦 Arrival:
                        ${arrival ?? "—"}
                    </span>

                    <span>
                        📅
                        ${escapeHTML(
                            rate.reported_date ?? "—"
                        )}
                    </span>

                </div>

            </article>
        `;
    }


    /* =====================================================
       Explorer Button
    ===================================================== */

    function initializeExplorer() {

        const button =
            $("#exploreMarketsButton");


        if (button) {

            button.addEventListener(
                "click",
                () => {

                    const results =
                        filterRates();


                    renderResults(results);


                    const container =
                        $("#marketResults");


                    if (container) {

                        container.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });
                    }
                }
            );
        }


        const districtSelect =
            $("#districtFilter");


        if (districtSelect) {

            districtSelect.addEventListener(
                "change",
                event => {

                    populateMarkets(
                        event.target.value
                    );
                }
            );
        }
    }


    /* =====================================================
       Initialize
    ===================================================== */

    async function initialize() {

        console.info(
            "[MandiPlus] Market Explorer initializing..."
        );


        await Promise.all([
            loadMandis(),
            loadRates(),
            loadCommodities()
        ]);


        initializeExplorer();


        console.info(
            "[MandiPlus] Market Explorer initialized."
        );
    }


    /* =====================================================
       Public API
    ===================================================== */

    window.MandiPlusExplorer = {

        initialize,
        loadMandis,
        loadRates,
        loadCommodities,
        filterRates,
        renderResults
    };

})();