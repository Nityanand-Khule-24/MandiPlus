import logging

from extract import extract_data
from transform import transform_data
from load import load_to_supabase


# ============================================================
# LOGGING
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

logger = logging.getLogger(__name__)


# ============================================================
# MAIN PIPELINE
# ============================================================

def run_pipeline():

    logger.info("=" * 60)
    logger.info("MANDIPLUS DATA PIPELINE STARTED")
    logger.info("=" * 60)

    try:

        # ----------------------------------------------------
        # STEP 1 — EXTRACT
        # ----------------------------------------------------

        logger.info("STEP 1: EXTRACT")

        df = extract_data()


        # ----------------------------------------------------
        # STEP 2 — TRANSFORM
        # ----------------------------------------------------

        logger.info("STEP 2: TRANSFORM")

        df = transform_data(df)


        # ----------------------------------------------------
        # STEP 3 — LOAD
        # ----------------------------------------------------

        logger.info("STEP 3: LOAD")

        result = load_to_supabase(df)


        # ----------------------------------------------------
        # PIPELINE SUMMARY
        # ----------------------------------------------------

        logger.info("=" * 60)
        logger.info("MANDIPLUS DATA PIPELINE COMPLETED")
        logger.info("=" * 60)

        logger.info(
            f"Total records: {result['total']}"
        )

        logger.info(
            f"Successful records: {result['successful']}"
        )

        logger.info(
            f"Failed records: {result['failed']}"
        )


        if result["failed"] > 0:

            logger.warning(
                "Pipeline completed with some failures."
            )

        else:

            logger.info(
                "Pipeline completed successfully."
            )


    except Exception as e:

        logger.exception(
            f"PIPELINE FAILED: {e}"
        )

        raise


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    run_pipeline()