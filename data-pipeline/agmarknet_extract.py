import logging
import requests
import pandas as pd

from agmarknet_metadata import get_maharashtra_markets

logger = logging.getLogger(__name__)

PRICE_URL = (
    "https://api.agmarknet.gov.in/v1/"
    "prices-and-arrivals/date-wise/specific-commodity"
)

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
}


def extract_agmarknet_data(
    year,
    month,
    state_id,
    commodity_id,
    commodity_name
):
    """
    Extract AGMARKNET price and arrival data
    and return it in MandiPlus pipeline format.
    """

    logger.info(
        f"Extracting AGMARKNET data: "
        f"year={year}, month={month}, "
        f"state_id={state_id}, commodity_id={commodity_id}"
    )

    params = {
        "year": year,
        "month": month,
        "stateId": state_id,
        "commodityId": commodity_id,
        "includeExcel": "false"
    }

    response = requests.get(
        PRICE_URL,
        headers=HEADERS,
        params=params,
        timeout=(10, 30)
    )

    response.raise_for_status()

    result = response.json()

    if not result.get("success"):
        raise ValueError(
            f"AGMARKNET error: {result.get('message')}"
        )

    # --------------------------------------------------
    # GET MARKET METADATA
    # --------------------------------------------------

    logger.info("Fetching market metadata...")

    markets = get_maharashtra_markets()

    market_map = {
        market["market_name"].strip().lower(): market
        for market in markets
    }

    # --------------------------------------------------
    # FLATTEN AGMARKNET RESPONSE
    # --------------------------------------------------

    rows = []

    for market in result.get("markets", []):

        market_name = market.get(
            "marketName", ""
        ).strip()

        market_info = market_map.get(
            market_name.lower()
        )

        if not market_info:
            logger.warning(
                f"Market metadata not found: {market_name}"
            )
            continue

        for date_record in market.get("dates", []):

            arrival_date = date_record.get(
                "arrivalDate"
            )

            for price_record in date_record.get(
                "data", []
            ):

                rows.append({

                    "state": market_info["state_name"],

                    "district": market_info[
                        "district_name"
                    ],

                    "market": market_name,

                    "commodity": commodity_name,

                    "variety": price_record.get(
                        "variety", ""
                    ),

                    "grade": "",

                    "arrival_date": arrival_date,

                    "arrival_quantity": price_record.get(
                        "arrivals"
                    ),

                    "min_price": price_record.get(
                        "minimumPrice"
                    ),

                    "max_price": price_record.get(
                        "maximumPrice"
                    ),

                    "modal_price": price_record.get(
                        "modalPrice"
                    )
                })

    df = pd.DataFrame(rows)

    logger.info(
        f"Successfully extracted {len(df)} records"
    )

    return df