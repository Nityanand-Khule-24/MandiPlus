import requests


BASE_URL = "https://api.agmarknet.gov.in/v1"

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
}


def main():

    print("=" * 60)
    print("🔎 Searching AGMARKNET for Tomato commodity ID")
    print("=" * 60)

    url = f"{BASE_URL}/daily-price-arrival/filters"

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    print("\nMetadata received successfully.")

    # --------------------------------------------------------
    # Inspect top-level structure
    # --------------------------------------------------------

    print("\nTop-level keys:")

    if isinstance(data, dict):

        for key in data.keys():
            print(f"  - {key}")

    # --------------------------------------------------------
    # Find commodity collection
    # --------------------------------------------------------

    commodities = None

    if isinstance(data, dict):

        possible_keys = [
            "commodities",
            "commodity",
            "commodityData",
            "cmdt_data",
            "data"
        ]

        for key in possible_keys:

            value = data.get(key)

            if isinstance(value, list):
                commodities = value
                print(
                    f"\nCommodity collection found under: {key}"
                )
                break

            if isinstance(value, dict):

                for nested_key, nested_value in value.items():

                    if isinstance(nested_value, list):

                        commodities = nested_value

                        print(
                            f"\nCommodity collection found under: "
                            f"{key} -> {nested_key}"
                        )

                        break

                if commodities is not None:
                    break

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    if commodities is None:

        print("\n❌ Could not automatically locate commodities.")

        print("\nFull response structure:")

        print(data)

        return

    # --------------------------------------------------------
    # Search Tomato
    # --------------------------------------------------------

    print(
        f"\nTotal commodity records found: "
        f"{len(commodities)}"
    )

    print("\n🔎 Tomato matches:")
    print("-" * 60)

    found = False

    for item in commodities:

        if not isinstance(item, dict):
            continue

        item_text = " ".join(
            str(value)
            for value in item.values()
        ).lower()

        if "tomato" in item_text:

            found = True

            print(item)

    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    print("-" * 60)

    if not found:

        print("❌ Tomato was not found.")

    else:

        print(
            "\n✅ Tomato found."
        )

        print(
            "\nUse the `id`/commodity-ID field shown above "
            "in config.py."
        )


if __name__ == "__main__":
    main()