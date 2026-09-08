/* =========================================================
   MandiPlus — API Service
   Frontend ↔ FastAPI communication layer
========================================================= */

const API_CONFIG = {
    baseUrl: "http://127.0.0.1:8000/api",

    endpoints: {
        dashboard: "/dashboard/",
        latestRates: "/rates/latest/",
        rates: "/rates/",
        commodities: "/commodities/",
        mandis: "/mandis/",
        trends: "/trends/"
    },

    refreshIntervalMs: 60000
};


/* =========================================================
   Generic API Request
========================================================= */

async function apiRequest(endpoint, params = {}) {

    const url = new URL(
        `${API_CONFIG.baseUrl}${endpoint}`
    );

    Object.entries(params).forEach(([key, value]) => {

        if (
            value !== undefined &&
            value !== null &&
            value !== ""
        ) {
            url.searchParams.set(key, value);
        }

    });


    const response = await fetch(url.toString());


    if (!response.ok) {

    let errorMessage =
        `API request failed: ${response.status}`;

    try {

        const errorData =
            await response.json();

        console.error(
            "[MandiPlus API] Error response:",
            errorData
        );

        if (Array.isArray(errorData.detail)) {

            errorMessage =
                errorData.detail
                    .map(error => {

                        const location =
                            Array.isArray(error.loc)
                                ? error.loc.join(".")
                                : "";

                        return `${location}: ${error.msg}`;

                    })
                    .join(" | ");

        } else if (
            typeof errorData.detail === "string"
        ) {

            errorMessage =
                errorData.detail;

        } else if (
            errorData.detail
        ) {

            errorMessage =
                JSON.stringify(
                    errorData.detail
                );
        }

    } catch (error) {

        console.error(
            "[MandiPlus API] Could not parse error:",
            error
        );
    }

    throw new Error(errorMessage);
}


    return response.json();
}


/* =========================================================
   Dashboard
========================================================= */

async function getDashboard(params = {}) {

    return apiRequest(
        API_CONFIG.endpoints.dashboard,
        params
    );
}


/* =========================================================
   Latest Rates
========================================================= */

async function getLatestRates(params = {}) {

    return apiRequest(
        API_CONFIG.endpoints.latestRates,
        params
    );
}


/* =========================================================
   All Rates
========================================================= */

async function getRates(params = {}) {

    return apiRequest(
        API_CONFIG.endpoints.rates,
        params
    );
}


/* =========================================================
   Commodities
========================================================= */

async function getCommodities(params = {}) {

    return apiRequest(
        API_CONFIG.endpoints.commodities,
        params
    );
}


/* =========================================================
   Mandis
========================================================= */

async function getMandis(params = {}) {

    return apiRequest(
        API_CONFIG.endpoints.mandis,
        params
    );
}


/* =========================================================
   Trends
========================================================= */

async function getTrends(params = {}) {

    return apiRequest(
        API_CONFIG.endpoints.trends,
        params
    );
}


/* =========================================================
   API Health Check
========================================================= */

async function checkApiHealth() {

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/health"
        );

        if (!response.ok) {
            throw new Error("API is unavailable");
        }

        return await response.json();

    } catch (error) {

        console.error(
            "[MandiPlus] API health check failed:",
            error
        );

        throw error;
    }
}


/* =========================================================
   Export
========================================================= */

window.MandiPlusAPI = {

    config: API_CONFIG,

    request: apiRequest,

    getDashboard,
    getLatestRates,
    getRates,
    getCommodities,
    getMandis,
    getTrends,

    checkApiHealth
};


console.info(
    "[MandiPlus] API service initialized:",
    API_CONFIG.baseUrl
);