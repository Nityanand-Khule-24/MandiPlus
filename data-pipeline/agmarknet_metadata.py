import logging
import requests

logger = logging.getLogger(__name__)

FILTER_URL = "https://api.agmarknet.gov.in/v1/daily-price-arrival/filters"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
}


def get_agmarknet_filters():

    logger.info("Fetching AGMARKNET filter metadata...")

    response = requests.get(
        FILTER_URL,
        headers=HEADERS,
        timeout=(10, 30)
    )

    response.raise_for_status()

    result = response.json()

    if result.get("status") is not True:
        raise ValueError(
            f"AGMARKNET filter request failed: "
            f"{result.get('message')}"
        )

    return result["data"]


def get_maharashtra_markets():

    data = get_agmarknet_filters()

    states = data.get("state_data", [])
    districts = data.get("district_data", [])
    markets = data.get("market_data", [])

    maharashtra = next(
        (
            state for state in states
            if state["state_name"].strip().lower() == "maharashtra"
        ),
        None
    )

    if not maharashtra:
        raise ValueError("Maharashtra not found")

    state_id = maharashtra["state_id"]

    district_map = {
        district["id"]: district["district_name"].strip()
        for district in districts
        if district["state_id"] == state_id
    }

    result = []

    for market in markets:

        if market.get("state_id") != state_id:
            continue

        district_id = market.get("district_id")

        result.append({
            "market_id": market.get("id"),
            "market_name": market.get("mkt_name", "").strip(),
            "state_id": state_id,
            "state_name": "Maharashtra",
            "district_id": district_id,
            "district_name": district_map.get(district_id, "")
        })

    return result