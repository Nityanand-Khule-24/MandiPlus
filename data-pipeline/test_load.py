import logging

from extract import extract_data
from transform import transform_data
from load import load_to_supabase


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


# ============================================================
# MAIN TEST
# ============================================================

def main():

    print("=" * 60)
    print("MANDIPLUS LOAD TEST")
    print("=" * 60)

    # --------------------------------------------------------
    # 1. EXTRACT
    # --------------------------------------------------------

    print("\n[1] Extracting AGMARKNET data...")

    raw_df = extract_data()

    print(
        f"Records extracted: {len(raw_df)}"
    )

    # --------------------------------------------------------
    # 2. TRANSFORM
    # --------------------------------------------------------

    print("\n[2] Transforming data...")

    transformed_df = transform_data(
        raw_df
    )

    print(
        f"Records after transformation: "
        f"{len(transformed_df)}"
    )

    # --------------------------------------------------------
    # 3. TEST WITH FIRST 5 RECORDS
    # --------------------------------------------------------

    test_df = transformed_df.head(5).copy()

    print(
        f"\n[3] Loading {len(test_df)} test records..."
    )

    print(
        test_df[
            [
                "state",
                "district",
                "market",
                "commodity",
                "variety",
                "arrival_date",
                "arrival_quantity",
                "min_price",
                "max_price",
                "modal_price"
            ]
        ].to_string(index=False)
    )

    # --------------------------------------------------------
    # 4. LOAD
    # --------------------------------------------------------

    result = load_to_supabase(
        test_df
    )

    # --------------------------------------------------------
    # 5. RESULT
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("LOAD TEST RESULT")
    print("=" * 60)

    print(
        f"Total:      {result['total']}"
    )

    print(
        f"Successful: {result['successful']}"
    )

    print(
        f"Failed:     {result['failed']}"
    )

    # --------------------------------------------------------
    # 6. FINAL STATUS
    # --------------------------------------------------------

    if result["failed"] == 0:

        print("\n✅ LOAD TEST PASSED")

    else:

        print("\n❌ LOAD TEST FAILED")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()