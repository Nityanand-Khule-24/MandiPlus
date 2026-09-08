import logging
import math

from supabase import create_client

from config import (
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)


logger = logging.getLogger(__name__)


# ============================================================
# SUPABASE CONNECTION
# ============================================================

def get_supabase_client():
    """
    Create and return a Supabase client.
    """

    try:
        client = create_client(
            SUPABASE_URL,
            SUPABASE_SECRET_KEY
        )

        logger.info(
            "Connected to Supabase successfully"
        )

        return client

    except Exception as e:
        logger.error(
            f"Failed to connect to Supabase: {e}"
        )
        raise


# ============================================================
# SAFE ARRIVAL QUANTITY
# ============================================================

def get_arrival_quantity(value):
    """
    Convert arrival quantity to a database-safe value.
    Returns None for missing/NaN values.
    """

    if value is None:
        return None

    try:
        value = float(value)

        if math.isnan(value):
            return None

        return value

    except (TypeError, ValueError):
        return None


# ============================================================
# LOAD DATA
# ============================================================

def load_to_supabase(df):
    """
    Batch load transformed mandi data into Supabase.

    Process:

        1. Upsert unique mandis
        2. Upsert unique commodities
        3. Build daily-rate records
        4. Batch upsert daily rates
    """

    # ========================================================
    # INPUT VALIDATION
    # ========================================================

    if df is None:
        raise ValueError(
            "Database load failed: DataFrame is None"
        )

    if df.empty:
        raise ValueError(
            "Database load failed: DataFrame is empty"
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
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Database load failed. "
            f"Missing columns: {missing_columns}"
        )

    # ========================================================
    # CONNECTION
    # ========================================================

    supabase = get_supabase_client()

    total_records = len(df)

    logger.info("=" * 60)
    logger.info("STARTING BATCH DATABASE LOAD")
    logger.info("=" * 60)

    logger.info(
        f"Total input records: {total_records}"
    )

    # ========================================================
    # 1. PREPARE UNIQUE MANDIS
    # ========================================================

    logger.info("Preparing unique mandis...")

    unique_mandis = (
        df[
            [
                "market",
                "state",
                "district"
            ]
        ]
        .drop_duplicates()
        .rename(
            columns={
                "market": "name"
            }
        )
        .to_dict(orient="records")
    )

    logger.info(
        f"Unique mandis: {len(unique_mandis)}"
    )

    # ========================================================
    # 2. UPSERT MANDIS IN BATCH
    # ========================================================

    try:

        mandi_response = (
            supabase
            .table("mandis")
            .upsert(
                unique_mandis,
                on_conflict="name,state,district"
            )
            .execute()
        )

        logger.info(
            f"Mandi batch upsert successful: "
            f"{len(mandi_response.data)} records"
        )

    except Exception as e:

        logger.error(
            f"Mandi batch upsert failed: {e}"
        )

        raise

    # ========================================================
    # 3. GET MANDI IDs
    # ========================================================

    logger.info("Building mandi ID mapping...")

    mandi_response = (
        supabase
        .table("mandis")
        .select(
            "id,name,state,district"
        )
        .execute()
    )

    mandi_map = {}

    for mandi in mandi_response.data:

        key = (
            mandi["name"].strip().lower(),
            mandi["state"].strip().lower(),
            mandi["district"].strip().lower()
        )

        mandi_map[key] = mandi["id"]

    logger.info(
        f"Mandi mapping created: "
        f"{len(mandi_map)} entries"
    )

    # ========================================================
    # 4. PREPARE UNIQUE COMMODITIES
    # ========================================================

    logger.info("Preparing unique commodities...")

    unique_commodities = [
        {
            "name": commodity
        }
        for commodity in (
            df["commodity"]
            .dropna()
            .astype(str)
            .str.strip()
            .drop_duplicates()
            .tolist()
        )
    ]

    logger.info(
        f"Unique commodities: "
        f"{len(unique_commodities)}"
    )

    # ========================================================
    # 5. UPSERT COMMODITIES IN BATCH
    # ========================================================

    try:

        commodity_response = (
            supabase
            .table("commodities")
            .upsert(
                unique_commodities,
                on_conflict="name"
            )
            .execute()
        )

        logger.info(
            f"Commodity batch upsert successful: "
            f"{len(commodity_response.data)} records"
        )

    except Exception as e:

        logger.error(
            f"Commodity batch upsert failed: {e}"
        )

        raise

    # ========================================================
    # 6. GET COMMODITY IDS
    # ========================================================

    logger.info(
        "Building commodity ID mapping..."
    )

    commodity_response = (
        supabase
        .table("commodities")
        .select("id,name")
        .execute()
    )

    commodity_map = {
        commodity["name"].strip().lower():
            commodity["id"]
        for commodity in commodity_response.data
    }

    logger.info(
        f"Commodity mapping created: "
        f"{len(commodity_map)} entries"
    )

    # ========================================================
    # 7. BUILD DAILY RATE RECORDS
    # ========================================================

    logger.info(
        "Preparing daily-rate records..."
    )

    daily_rates = []
    skipped_records = 0

    for _, row in df.iterrows():

        mandi_key = (
            str(row["market"]).strip().lower(),
            str(row["state"]).strip().lower(),
            str(row["district"]).strip().lower()
        )

        commodity_key = (
            str(row["commodity"])
            .strip()
            .lower()
        )

        mandi_id = mandi_map.get(mandi_key)
        commodity_id = commodity_map.get(
            commodity_key
        )

        if mandi_id is None:

            logger.warning(
                f"Mandi ID not found: "
                f"{row['market']}"
            )

            skipped_records += 1
            continue

        if commodity_id is None:

            logger.warning(
                f"Commodity ID not found: "
                f"{row['commodity']}"
            )

            skipped_records += 1
            continue

        # ----------------------------------------------------
        # Date conversion
        # ----------------------------------------------------

        reported_date = row["arrival_date"]

        if hasattr(
            reported_date,
            "strftime"
        ):

            reported_date = reported_date.strftime(
                "%Y-%m-%d"
            )

        else:

            reported_date = str(
                reported_date
            )

        # ----------------------------------------------------
        # Build daily-rate record
        # ----------------------------------------------------

        daily_rates.append(
            {
                "mandi_id": mandi_id,

                "commodity_id": commodity_id,

                "variety": str(
                    row["variety"]
                ).strip(),

                "grade": str(
                    row["grade"]
                ).strip(),

                "min_price": float(
                    row["min_price"]
                ),

                "max_price": float(
                    row["max_price"]
                ),

                "modal_price": float(
                    row["modal_price"]
                ),

                "arrival_quantity":
                    get_arrival_quantity(
                        row["arrival_quantity"]
                    ),

                "reported_date":
                    reported_date
            }
        )

    logger.info(
        f"Daily-rate records prepared: "
        f"{len(daily_rates)}"
    )

    logger.info(
        f"Skipped records: {skipped_records}"
    )

    if not daily_rates:

        raise ValueError(
            "No valid daily-rate records "
            "available for loading"
        )

    # ========================================================
    # 8. BATCH UPSERT DAILY RATES
    # ========================================================

    try:

        daily_rate_response = (
            supabase
            .table("daily_rates")
            .upsert(
                daily_rates,
                on_conflict=(
                    "mandi_id,"
                    "commodity_id,"
                    "variety,"
                    "grade,"
                    "reported_date"
                )
            )
            .execute()
        )

        loaded_records = len(
            daily_rate_response.data
        )

        logger.info(
            f"Daily-rate batch upsert successful: "
            f"{loaded_records} records"
        )

    except Exception as e:

        logger.error(
            f"Daily-rate batch upsert failed: {e}"
        )

        raise

    # ========================================================
    # 9. SUMMARY
    # ========================================================

    logger.info("=" * 60)
    logger.info("BATCH DATABASE LOAD COMPLETED")
    logger.info("=" * 60)

    logger.info(
        f"Input records: {total_records}"
    )

    logger.info(
        f"Loaded records: {loaded_records}"
    )

    logger.info(
        f"Skipped records: {skipped_records}"
    )

    logger.info("=" * 60)

    return {
        "total": total_records,
        "successful": loaded_records,
        "failed": (
            total_records - loaded_records
        ),
        "skipped": skipped_records
    }

# ============================================================
# MAIN EXECUTION
# ============================================================

if __name__ == "__main__":

    from extract import extract_data
    from transform import transform_data

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s"
    )

    print("\n" + "=" * 60)
    print("🚀 MandiPlus Database Load Started")
    print("=" * 60)

    try:

        # ----------------------------------------------------
        # STEP 1: EXTRACT
        # ----------------------------------------------------

        print("\n📥 Extracting data...")

        raw_df = extract_data()

        print(
            f"Extracted records: {len(raw_df)}"
        )

        # ----------------------------------------------------
        # STEP 2: TRANSFORM
        # ----------------------------------------------------

        print("\n🔄 Transforming data...")

        transformed_df = transform_data(
            raw_df
        )

        print(
            f"Transformed records: "
            f"{len(transformed_df)}"
        )

        # ----------------------------------------------------
        # STEP 3: LOAD
        # ----------------------------------------------------

        print("\n📤 Loading data into Supabase...")

        result = load_to_supabase(
            transformed_df
        )

        # ----------------------------------------------------
        # FINAL SUMMARY
        # ----------------------------------------------------

        print("\n" + "=" * 60)
        print("✅ DATABASE LOAD COMPLETED")
        print("=" * 60)

        print(
            f"Total records: "
            f"{result['total']}"
        )

        print(
            f"Successfully loaded: "
            f"{result['successful']}"
        )

        print(
            f"Skipped: "
            f"{result['skipped']}"
        )

        print(
            f"Failed: "
            f"{result['failed']}"
        )

        print("=" * 60)

    except Exception as e:

        logger.exception(
            "Database load pipeline failed"
        )

        print("\n" + "=" * 60)
        print("❌ DATABASE LOAD FAILED")
        print("=" * 60)

        print(f"Error: {e}")

        print("=" * 60)

        raise