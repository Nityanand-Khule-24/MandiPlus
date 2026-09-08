/* ============================================================
   MandiPlus Application
   ============================================================ */

(function () {

    "use strict";


    /* ========================================================
       APPLICATION STATE
    ======================================================== */

    const state = {

        searchQuery: "",

        location: {
            state: "Maharashtra",
            district: "Pune"
        },

        refreshTimer: null

    };


    /* ========================================================
       INITIALIZATION
    ======================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );


    async function initializeApp() {

        console.log(
            "🌾 MandiPlus application starting..."
        );


        console.log(
            "[MandiPlus] API:",
            window.MandiPlusAPI.config.baseUrl
        );


        setupMobileMenu();

        setupSearch();

        setupCommodityChips();

        setupLocationButtons();


        await loadApplicationData();


        startAutoRefresh();


        console.log(
            "🌾 MandiPlus application initialized."
        );

    }


    /* ========================================================
       LOAD APPLICATION DATA
    ======================================================== */

    async function loadApplicationData() {

        console.info(
            "[MandiPlus] Starting data refresh..."
        );


        await Promise.allSettled([

            window.MandiPlusDashboard
                .loadDashboard(),

            window.MandiPlusDashboard
                .loadLatestRates()

        ]);


        window.MandiPlusDashboard
            .updateLastUpdated();


        console.info(
            "[MandiPlus] Data refresh completed."
        );

    }


    /* ========================================================
       AUTO REFRESH
    ======================================================== */

    function startAutoRefresh() {

        const interval =
            window.MandiPlusAPI.config
                .refreshIntervalMs;


        state.refreshTimer =
            setInterval(
                async () => {

                    console.info(
                        "[MandiPlus] Auto refreshing data..."
                    );


                    await loadApplicationData();

                },
                interval
            );

    }


    /* ========================================================
       MOBILE MENU
    ======================================================== */

    function setupMobileMenu() {

        const button =
            document.getElementById(
                "mobileMenuButton"
            );


        const menu =
            document.getElementById(
                "mobileNav"
            );


        if (!button || !menu) {

            return;

        }


        button.addEventListener(
            "click",
            () => {

                menu.classList.toggle("open");


                const icon =
                    button.querySelector(
                        ".material-symbols-outlined"
                    );


                if (icon) {

                    icon.textContent =
                        menu.classList.contains("open")
                            ? "close"
                            : "menu";

                }

            }
        );

    }


    /* ========================================================
       SEARCH
    ======================================================== */

    function setupSearch() {

        const input =
            document.getElementById(
                "commoditySearchInput"
            );


        const button =
            document.getElementById(
                "searchButton"
            );


        if (!input) {

            return;

        }


        input.addEventListener(
            "input",
            event => {

                state.searchQuery =
                    event.target.value.trim();

            }
        );


        input.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {

                    performSearch();

                }

            }
        );


        button?.addEventListener(
            "click",
            performSearch
        );

    }


    /* ========================================================
       PERFORM SEARCH
    ======================================================== */

    function performSearch() {

        const input =
            document.getElementById(
                "commoditySearchInput"
            );


        const query =
            input?.value.trim();


        if (!query) {

            input?.focus();

            return;

        }


        state.searchQuery = query;


        console.info(
            "[MandiPlus] Commodity search:",
            query
        );


        /*
         * Full commodity search page will be implemented
         * after the core dashboard is connected.
         */


        const pricesSection =
            document.querySelector(
                ".prices-card"
            );


        pricesSection?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }


    /* ========================================================
       COMMODITY CHIPS
    ======================================================== */

    function setupCommodityChips() {

        const chips =
            document.querySelectorAll(
                ".commodity-chip"
            );


        chips.forEach(chip => {

            chip.addEventListener(
                "click",
                () => {

                    const commodity =
                        chip.dataset.commodity;


                    const input =
                        document.getElementById(
                            "commoditySearchInput"
                        );


                    if (input) {

                        input.value =
                            commodity;

                    }


                    state.searchQuery =
                        commodity;


                    performSearch();

                }
            );

        });

    }


    /* ========================================================
       LOCATION
    ======================================================== */

    function setupLocationButtons() {

        const changeButton =
            document.getElementById(
                "changeLocationButton"
            );


        const locationButton =
            document.getElementById(
                "locationButton"
            );


        changeButton?.addEventListener(
            "click",
            () => {

                alert(
                    "Location selection will be added in the next phase."
                );

            }
        );


        locationButton?.addEventListener(
            "click",
            () => {

                alert(
                    "Location selection will be added in the next phase."
                );

            }
        );

    }


    /* ========================================================
       PUBLIC APPLICATION API
    ======================================================== */

    window.MandiPlusApp = {

        state,

        refresh: loadApplicationData

    };

})();