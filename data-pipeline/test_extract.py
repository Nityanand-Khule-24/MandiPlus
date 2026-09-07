import logging

from extract import extract_data


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


df = extract_data()


print("\n" + "=" * 70)
print("EXTRACTION RESULT")
print("=" * 70)

print("Total records:", len(df))

print("\nColumns:")
print(df.columns.tolist())

print("\nFirst 10 records:")
print(df.head(10).to_string(index=False))