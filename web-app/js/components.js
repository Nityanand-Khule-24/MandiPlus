/* ============================================================
   MandiPlus UI Components
   ============================================================ */


/* ============================================================
   FORMAT PRICE
   ============================================================ */

function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        value === "" ||
        Number.isNaN(Number(value))
    ) {
        return "—";
    }


    return `₹${Number(value).toLocaleString("en-IN")}`;

}


/* ============================================================
   FORMAT NUMBER
   ============================================================ */

function formatNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }


    return Number(value).toLocaleString("en-IN");

}


/* ============================================================
   FORMAT DATE
   ============================================================ */

function formatDate(value) {

    if (!value) {

        return "—";

    }


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {

        return value;

    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* ============================================================
   FORMAT TREND
   ============================================================ */

function getTrendMarkup(trend) {

    if (!trend) {

        return `
            <span class="trend-neutral">
                —
            </span>
        `;

    }


    const normalized =
        String(trend).toLowerCase();


    if (
        normalized.includes("up") ||
        normalized.includes("increase") ||
        normalized.includes("positive")
    ) {

        return `
            <span class="trend-up">
                ↑ Up
            </span>
        `;

    }


    if (
        normalized.includes("down") ||
        normalized.includes("decrease") ||
        normalized.includes("negative")
    ) {

        return `
            <span class="trend-down">
                ↓ Down
            </span>
        `;

    }


    return `
        <span class="trend-neutral">
            → Stable
        </span>
    `;

}


/* ============================================================
   PRICE TABLE ROW
   ============================================================ */

function createPriceRow(rate) {

    const commodity =
        rate.commodity_name ||
        rate.commodity ||
        "Unknown";


    const mandi =
        rate.mandi_name ||
        rate.market ||
        "Unknown";


    const minPrice =
        rate.min_price;


    const maxPrice =
        rate.max_price;


    const modalPrice =
        rate.modal_price;


    const trend =
        rate.trend ||
        rate.price_trend ||
        "stable";


    return `

        <tr>

            <td>
                ${commodity}
            </td>

            <td>
                ${mandi}
            </td>

            <td>
                ${formatPrice(minPrice)}
            </td>

            <td>
                ${formatPrice(maxPrice)}
            </td>

            <td class="price-modal-price">
                ${formatPrice(modalPrice)}
            </td>

            <td>
                ${getTrendMarkup(trend)}
            </td>

        </tr>

    `;

}


/* ============================================================
   COMPARISON CARD
   ============================================================ */

function createComparisonCard(rate) {

    const commodity =
        rate.commodity_name ||
        rate.commodity ||
        "Unknown";


    const mandi =
        rate.mandi_name ||
        rate.market ||
        "Unknown";


    const modalPrice =
        rate.modal_price;


    const minPrice =
        rate.min_price;


    const maxPrice =
        rate.max_price;


    return `

        <article class="comparison-card">

            <div class="comparison-card-header">

                <div>

                    <div class="comparison-commodity">
                        ${commodity}
                    </div>

                    <div class="comparison-market">
                        ${mandi}
                    </div>

                </div>

                ${getTrendMarkup(rate.trend)}

            </div>


            <div class="comparison-price">

                ${formatPrice(modalPrice)}

                <span class="comparison-unit">
                    / quintal
                </span>

            </div>


            <div class="comparison-meta">

                <span>
                    Min: ${formatPrice(minPrice)}
                </span>

                <span>
                    Max: ${formatPrice(maxPrice)}
                </span>

            </div>

        </article>

    `;

}


/* ============================================================
   GLOBAL COMPONENT API
   ============================================================ */

window.MandiPlusComponents = {

    formatPrice,

    formatNumber,

    formatDate,

    getTrendMarkup,

    createPriceRow,

    createComparisonCard

};