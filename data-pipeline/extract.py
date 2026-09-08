import logging
import pandas as pd
from datetime import datetime

from agmarknet_extract import extract_agmarknet_data

from config import (
    SAMPLE_CSV_FILE,
    AGMARKNET_STATE_ID,
    AGMARKNET_COMMODITIES
)


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)


# ============================================================
# SETTINGS
# ============================================================

TARGET_DISTRICT = "Pune"


# ============================================================
# CSV FALLBACK
# ============================================================

def extract_from_csv():
    """
    Extract data from the local CSV fallback.

    The fallback is also filtered to Pune district so that
    the pipeline keeps the same geographic scope as AGMARKNET.
    """

    logger.info("=" * 60)
    logger.info("READING CSV FALLBACK")
    logger.info("=" * 60)

    try:
        df = pd.read_csv(SAMPLE_CSV_FILE)

        logger.info(
            f"Successfully extracted {len(df)} records from CSV"
        )

        # ----------------------------------------------------
        # Normalize column names
        # ----------------------------------------------------

        df.columns = (
            df.columns
            .str.strip()
            .str.lower()
        )

        # ----------------------------------------------------
        # Filter Pune district
        # ----------------------------------------------------

        if "district" in df.columns:

            before_count = len(df)

            df = df[
                df["district"]
                .astype(str)
                .str.strip()
                .str.lower()
                == TARGET_DISTRICT.lower()
            ].copy()

            logger.info(
                f"Pune district filter: "
                f"{before_count} → {len(df)} records"
            )

        else:

            logger.warning(
                "District column not found in CSV. "
                "Pune filtering could not be applied."
            )

        return df

    except FileNotFoundError:

        logger.error(
            f"CSV file not found: {SAMPLE_CSV_FILE}"
        )

        raise

    except Exception as e:

        logger.error(
            f"Failed to extract CSV data: {e}"
        )

        raise


# ============================================================
# FILTER PUNE DATA
# ============================================================

def filter_pune_data(df):
    """
    Keep ALL available records belonging to Pune district.

    Important:
    We do NOT select a single market.

    Every market returned by AGMARKNET for Pune is retained.
    """

    if df is None:
        logger.warning("Received None dataframe.")
        return pd.DataFrame()

    if df.empty:
        return df

    # --------------------------------------------------------
    # Check district column
    # --------------------------------------------------------

    if "district" not in df.columns:

        logger.warning(
            "District column not found. "
            "Cannot apply Pune district filter."
        )

        return df

    # --------------------------------------------------------
    # Normalize district values
    # --------------------------------------------------------

    district_values = (
        df["district"]
        .astype(str)
        .str.strip()
        .str.lower()
    )

    # --------------------------------------------------------
    # Filter Pune
    # --------------------------------------------------------

    pune_df = df[
        district_values == TARGET_DISTRICT.lower()
    ].copy()

    logger.info(
        f"Pune district records: "
        f"{len(pune_df)} / {len(df)}"
    )

    # --------------------------------------------------------
    # Show all available markets
    # --------------------------------------------------------

    if not pune_df.empty and "market" in pune_df.columns:

        markets = sorted(
            pune_df["market"]
            .dropna()
            .astype(str)
            .str.strip()
            .unique()
            .tolist()
        )

        logger.info(
            f"Available Pune markets: {len(markets)}"
        )

        for index, market in enumerate(markets, start=1):

            market_count = len(
                pune_df[
                    pune_df["market"]
                    .astype(str)
                    .str.strip()
                    == market
                ]
            )

            logger.info(
                f"  {index}. {market} "
                f"({market_count} records)"
            )

    else:

        logger.warning(
            "No Pune records found."
        )

    return pune_df


# ============================================================
# VALIDATE EXTRACTED DATA
# ============================================================

def validate_extracted_data(df, commodity_name):
    """
    Validate the Pune data returned for a commodity.

    This function does not reject data simply because a market
    is missing. AGMARKNET may not have a report from every mandi
    for every commodity/date.

    It checks that:
      - data exists
      - Pune data exists
      - market information exists
      - price columns are available
    """

    if df is None or df.empty:

        logger.warning(
            f"{commodity_name}: validation failed - "
            f"no records available"
        )

        return False

    # --------------------------------------------------------
    # Market validation
    # --------------------------------------------------------

    if "market" not in df.columns:

        logger.warning(
            f"{commodity_name}: market column missing"
        )

        return False

    market_count = (
        df["market"]
        .dropna()
        .astype(str)
        .str.strip()
        .replace("", pd.NA)
        .dropna()
        .nunique()
    )

    if market_count == 0:

        logger.warning(
            f"{commodity_name}: no valid markets found"
        )

        return False

    # --------------------------------------------------------
    # Price validation
    # --------------------------------------------------------

    required_price_columns = [
        "min_price",
        "max_price",
        "modal_price"
    ]

    missing_price_columns = [
        column
        for column in required_price_columns
        if column not in df.columns
    ]

    if missing_price_columns:

        logger.warning(
            f"{commodity_name}: missing price columns: "
            f"{missing_price_columns}"
        )

        return False

    # --------------------------------------------------------
    # Validation successful
    # --------------------------------------------------------

    logger.info(
        f"{commodity_name}: validation successful | "
        f"{len(df)} records | "
        f"{market_count} markets"
    )

    return True


# ============================================================
# AGMARKNET EXTRACTION
# ============================================================

def extract_from_agmarknet():

    logger.info("=" * 60)
    logger.info("EXTRACTING FROM AGMARKNET 2.0")
    logger.info("=" * 60)

    # --------------------------------------------------------
    # Current date
    # --------------------------------------------------------

    today = datetime.now()

    year = today.year
    month = today.month

    logger.info(
        f"Extraction period: {year}-{month:02d}"
    )

    logger.info(
        f"Target district: {TARGET_DISTRICT}"
    )

    logger.info(
        f"Total commodities configured: "
        f"{len(AGMARKNET_COMMODITIES)}"
    )

    all_data = []

    # ========================================================
    # EXTRACT EACH COMMODITY
    # ========================================================

    for commodity in AGMARKNET_COMMODITIES:

        commodity_id = commodity["id"]
        commodity_name = commodity["name"]

        logger.info("-" * 60)

        logger.info(
            f"Extracting commodity: {commodity_name}"
        )

        logger.info(
            f"Commodity ID: {commodity_id}"
        )

        try:

            # ------------------------------------------------
            # Request AGMARKNET data
            # ------------------------------------------------

            df = extract_agmarknet_data(
                year=year,
                month=month,
                state_id=AGMARKNET_STATE_ID,
                commodity_id=commodity_id,
                commodity_name=commodity_name
            )

            # ------------------------------------------------
            # Check result
            # ------------------------------------------------

            if df is None:

                logger.warning(
                    f"{commodity_name}: "
                    f"Extractor returned None"
                )

                continue

            if df.empty:

                logger.warning(
                    f"{commodity_name}: "
                    f"No records returned from AGMARKNET"
                )

                continue

            logger.info(
                f"{commodity_name}: "
                f"{len(df)} records returned from AGMARKNET"
            )

            # ------------------------------------------------
            # Normalize column names
            # ------------------------------------------------

            df.columns = (
                df.columns
                .str.strip()
                .str.lower()
            )

            # ------------------------------------------------
            # Raw market count
            # ------------------------------------------------

            if "market" in df.columns:

                raw_markets = (
                    df["market"]
                    .dropna()
                    .astype(str)
                    .str.strip()
                    .replace("", pd.NA)
                    .dropna()
                    .unique()
                )

                logger.info(
                    f"{commodity_name}: "
                    f"{len(raw_markets)} markets returned "
                    f"from Maharashtra"
                )

            # ------------------------------------------------
            # Filter Pune district
            # ------------------------------------------------

            pune_df = filter_pune_data(df)

            if pune_df.empty:

                logger.warning(
                    f"{commodity_name}: "
                    f"No Pune district records found"
                )

                continue

            # ------------------------------------------------
            # Validate Pune data
            # ------------------------------------------------

            if not validate_extracted_data(
                pune_df,
                commodity_name
            ):

                logger.warning(
                    f"{commodity_name}: "
                    f"validation failed"
                )

                continue

            # ------------------------------------------------
            # Add to final collection
            # ------------------------------------------------

            all_data.append(pune_df)

            # ------------------------------------------------
            # Commodity summary
            # ------------------------------------------------

            pune_market_count = (
                pune_df["market"]
                .dropna()
                .astype(str)
                .str.strip()
                .nunique()
                if "market" in pune_df.columns
                else 0
            )

            logger.info(
                f"{commodity_name}: "
                f"{len(pune_df)} Pune records retained | "
                f"{pune_market_count} Pune markets"
            )

        except Exception as e:

            logger.exception(
                f"Failed to extract "
                f"{commodity_name}: {e}"
            )

            # Continue with next commodity
            continue

    # ========================================================
    # CHECK DATA
    # ========================================================

    if not all_data:

        raise ValueError(
            "AGMARKNET returned no Pune district data "
            "for any configured commodity."
        )

    # ========================================================
    # COMBINE ALL COMMODITIES
    # ========================================================

    final_df = pd.concat(
        all_data,
        ignore_index=True
    )

    # ========================================================
    # REMOVE EXACT DUPLICATES
    # ========================================================

    before_duplicates = len(final_df)

    final_df = final_df.drop_duplicates()

    duplicates_removed = (
        before_duplicates - len(final_df)
    )

    logger.info(
        f"Duplicate records removed: "
        f"{duplicates_removed}"
    )

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    logger.info("=" * 60)
    logger.info("AGMARKNET EXTRACTION SUMMARY")
    logger.info("=" * 60)

    logger.info(
        f"Total Pune records: {len(final_df)}"
    )

    if "commodity" in final_df.columns:

        logger.info(
            f"Commodities: "
            f"{final_df['commodity'].nunique()}"
        )

        for commodity_name, group in (
            final_df.groupby("commodity")
        ):

            market_count = (
                group["market"]
                .dropna()
                .astype(str)
                .str.strip()
                .nunique()
                if "market" in group.columns
                else 0
            )

            logger.info(
                f"  {commodity_name}: "
                f"{len(group)} records | "
                f"{market_count} markets"
            )

            if "market" in group.columns:

                markets = sorted(
                    group["market"]
                    .dropna()
                    .astype(str)
                    .str.strip()
                    .unique()
                    .tolist()
                )

                for market in markets:

                    market_count = len(
                        group[
                            group["market"]
                            .astype(str)
                            .str.strip()
                            == market
                        ]
                    )

                    logger.info(
                        f"      - {market}: "
                        f"{market_count}"
                    )

    logger.info("=" * 60)

    return final_df


# ============================================================
# MAIN EXTRACTION FUNCTION
# ============================================================

def extract_data():

    logger.info("=" * 60)
    logger.info("STARTING MANDIPLUS DATA EXTRACTION")
    logger.info("=" * 60)

    try:

        # ----------------------------------------------------
        # PRIMARY SOURCE
        # ----------------------------------------------------

        logger.info(
            "Attempting extraction from AGMARKNET..."
        )

        df = extract_from_agmarknet()

        logger.info(
            "Primary AGMARKNET extraction successful."
        )

        return df

    except Exception as e:

        # ----------------------------------------------------
        # FALLBACK SOURCE
        # ----------------------------------------------------

        logger.warning(
            f"AGMARKNET extraction failed: {e}"
        )

        logger.warning(
            "Falling back to sample CSV..."
        )

        df = extract_from_csv()

        logger.info(
            "CSV fallback extraction successful."
        )

        return df


# ============================================================
# SCRIPT ENTRY POINT
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("🚀 MandiPlus Extraction Started")
    print("=" * 60)
    print()

    try:

        result = extract_data()

        print()
        print("=" * 60)
        print("✅ EXTRACTION COMPLETED")
        print("=" * 60)

        print(
            f"Total records: {len(result)}"
        )

        if "commodity" in result.columns:

            print(
                f"Commodities: "
                f"{result['commodity'].nunique()}"
            )

        if "market" in result.columns:

            print(
                f"Markets: "
                f"{result['market'].nunique()}"
            )

        print()
        print("📊 Commodity + Market summary:")
        print()

        if (
            "commodity" in result.columns
            and "market" in result.columns
        ):

            summary = (
                result
                .groupby(
                    ["commodity", "market"]
                )
                .size()
                .reset_index(
                    name="records"
                )
            )

            print(
                summary.to_string(
                    index=False
                )
            )

        print()
        print("=" * 60)

    except Exception as e:

        print()
        print("=" * 60)
        print("❌ EXTRACTION FAILED")
        print("=" * 60)

        print(str(e))

        print()

        raise