import logging

from extract import extract_data
from transform import transform_data


# ============================================================
# LOGGING CONFIGURATION
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)


# ============================================================
# MAIN TEST
# ============================================================

def main():

    print("=" * 60)
    print("MANDIPLUS TRANSFORMATION TEST")
    print("=" * 60)

    try:

        # ----------------------------------------------------
        # STEP 1: EXTRACT
        # ----------------------------------------------------

        print("\n[1] Extracting data...")

        raw_df = extract_data()

        print(
            f"Raw records extracted: "
            f"{len(raw_df)}"
        )

        print("\nRaw columns:")

        print(
            list(raw_df.columns)
        )

        # ----------------------------------------------------
        # STEP 2: TRANSFORM
        # ----------------------------------------------------

        print("\n[2] Transforming data...")

        transformed_df = transform_data(
            raw_df
        )

        print(
            f"\nTransformed records: "
            f"{len(transformed_df)}"
        )

        # ----------------------------------------------------
        # STEP 3: DISPLAY RESULT
        # ----------------------------------------------------

        print("\nTransformed columns:")

        print(
            list(transformed_df.columns)
        )

        print("\nFirst 5 transformed records:")

        print(
            transformed_df.head().to_string(
                index=False
            )
        )

        # ----------------------------------------------------
        # STEP 4: BASIC VALIDATION
        # ----------------------------------------------------

        print("\n[3] Running final checks...")

        if transformed_df.empty:

            raise ValueError(
                "Transformation returned an empty DataFrame"
            )

        required_columns = [
            "state",
            "district",
            "market",
            "commodity",
            "variety",
            "grade",
            "arrival_date",
            "arrival_quantity",
            "min_price",
            "max_price",
            "modal_price"
        ]

        missing_columns = [
            column
            for column in required_columns
            if column not in transformed_df.columns
        ]

        if missing_columns:

            raise ValueError(
                f"Missing columns after transformation: "
                f"{missing_columns}"
            )

        # ----------------------------------------------------
        # STEP 5: SUCCESS
        # ----------------------------------------------------

        print("\n" + "=" * 60)
        print("TRANSFORMATION TEST PASSED")
        print("=" * 60)

        print(
            f"Input records:  {len(raw_df)}"
        )

        print(
            f"Output records: {len(transformed_df)}"
        )

        print(
            f"Commodities: "
            f"{transformed_df['commodity'].nunique()}"
        )

        print(
            f"Markets: "
            f"{transformed_df['market'].nunique()}"
        )

        print("=" * 60)

    except Exception as e:

        print("\n" + "=" * 60)
        print("TRANSFORMATION TEST FAILED")
        print("=" * 60)

        print(
            f"Error: {e}"
        )

        print("=" * 60)

        raise


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()