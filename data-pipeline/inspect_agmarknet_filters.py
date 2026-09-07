import requests

URL = "https://api.agmarknet.gov.in/v1/daily-price-arrival/filters"

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "Origin": "https://agmarknet.gov.in",
    "Referer": "https://agmarknet.gov.in/",
}

print("Fetching AGMARKNET filters...")

response = requests.get(
    URL,
    headers=headers,
    timeout=(10, 30)
)

response.raise_for_status()

data = response.json()["data"]

print("\nAvailable filter groups:")
print(data.keys())


# ==================================================
# FIND ONION
# ==================================================

print("\n" + "=" * 60)
print("ONION")
print("=" * 60)

commodities = data.get("cmdt_data", [])

for commodity in commodities:
    if "onion" in commodity["cmdt_name"].lower():
        print(commodity)


# ==================================================
# MAHARASHTRA
# ==================================================

print("\n" + "=" * 60)
print("MAHARASHTRA")
print("=" * 60)

for state in data.get("state_data", []):
    if "maharashtra" in state["state_name"].lower():
        print(state)


# ==================================================
# PUNE / NASHIK DISTRICTS
# ==================================================

print("\n" + "=" * 60)
print("PUNE / NASHIK DISTRICTS")
print("=" * 60)

for district in data.get("district_data", []):

    name = district["district_name"].lower()

    if "pune" in name or "nashik" in name:
        print(district)


# ==================================================
# ONION VARIETIES
# ==================================================

print("\n" + "=" * 60)
print("ONION VARIETIES")
print("=" * 60)

for variety in data.get("variety_data", []):

    cmdt_ids = variety.get("cmdt_id")

    if cmdt_ids and 23 in cmdt_ids:
        print(variety)


# ==================================================
# MAHARASHTRA MARKETS
# ==================================================

print("\n" + "=" * 60)
print("MAHARASHTRA MARKETS")
print("=" * 60)

for market in data.get("market_data", []):

    if market.get("state_id") == 20:
        print(market)


# ==================================================
# SUMMARY
# ==================================================

print("\n" + "=" * 60)
print("FILTER SUMMARY")
print("=" * 60)

for key, value in data.items():

    if isinstance(value, list):
        print(f"{key}: {len(value)} records")

    else:
        print(f"{key}: {value}")