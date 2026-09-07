import logging
import pandas as pd
from datetime import datetime

from agmarknet_extract import extract_agmarknet_data

from config import (
    SAMPLE_CSV_FILE,
    AGMARKNET_STATE_ID,
    AGMARKNET_COMMODITIES
)


logger = logging.getLogger(__name__)


# ============================================================
# CSV FALLBACK
# ============================================================

def extract_from_csv():

    logger.info(
        f"Reading CSV fallback: {SAMPLE_CSV_FILE}"
    )

    try:

        df = pd.read_csv(SAMPLE_CSV_FILE)

        logger.info(
            f"Successfully extracted "
            f"{len(df)} records from CSV"
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
# AGMARKNET EXTRACTION
# ============================================================

def extract_from_agmarknet():

    logger.info("=" * 60)
    logger.info("EXTRACTING FROM AGMARKNET 2.0")
    logger.info("=" * 60)

    # --------------------------------------------------------
    # Get current date
    # --------------------------------------------------------

    today = datetime.now()

    year = today.year
    month = today.month

    logger.info(
        f"Extraction period: "
        f"{year}-{month:02d}"
    )

    logger.info(
        f"Total commodities configured: "
        f"{len(AGMARKNET_COMMODITIES)}"
    )

    all_data = []

    # --------------------------------------------------------
    # Extract each configured commodity
    # --------------------------------------------------------

    for commodity in AGMARKNET_COMMODITIES:

        commodity_id = commodity["id"]
        commodity_name = commodity["name"]

        logger.info("-" * 60)

        logger.info(
            f"Extracting commodity: "
            f"{commodity_name}"
        )

        logger.info(
            f"Commodity ID: {commodity_id}"
        )

        try:

            # ------------------------------------------------
            # Call AGMARKNET extractor
            # ------------------------------------------------

            df = extract_agmarknet_data(

                year=year,

                month=month,

                state_id=AGMARKNET_STATE_ID,

                commodity_id=commodity_id,

                commodity_name=commodity_name
            )

            # ------------------------------------------------
            # Check extracted data
            # ------------------------------------------------

            if df.empty:

                logger.warning(
                    f"No data found for "
                    f"{commodity_name}"
                )

                continue

            # ------------------------------------------------
            # Store dataframe
            # ------------------------------------------------

            all_data.append(df)

            logger.info(
                f"{commodity_name}: "
                f"{len(df)} records extracted"
            )

        except Exception as e:

            logger.error(
                f"Failed to extract "
                f"{commodity_name}: {e}"
            )

            # Continue with remaining commodities
            continue

    # ========================================================
    # CHECK WHETHER ANY DATA WAS EXTRACTED
    # ========================================================

    if not all_data:

        raise ValueError(
            "AGMARKNET returned no data "
            "for any configured commodity"
        )

    # ========================================================
    # COMBINE ALL COMMODITY DATA
    # ========================================================

    final_df = pd.concat(
        all_data,
        ignore_index=True
    )

    # ========================================================
    # EXTRACTION SUMMARY
    # ========================================================

    logger.info("=" * 60)

    logger.info(
        f"Total AGMARKNET records extracted: "
        f"{len(final_df)}"
    )

    logger.info(
        f"Total commodities extracted: "
        f"{final_df['commodity'].nunique()}"
    )

    logger.info("=" * 60)

    return final_df


# ============================================================
# MAIN EXTRACTION FUNCTION
# ============================================================

def extract_data():

    logger.info("=" * 60)
    logger.info("STARTING DATA EXTRACTION")
    logger.info("=" * 60)

    try:

        # ----------------------------------------------------
        # Primary Source: AGMARKNET
        # ----------------------------------------------------

        logger.info(
            "Attempting extraction from AGMARKNET..."
        )

        df = extract_from_agmarknet()

        logger.info(
            "Primary extraction successful."
        )

        return df

    except Exception as e:

        # ----------------------------------------------------
        # Fallback Source: Sample CSV
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