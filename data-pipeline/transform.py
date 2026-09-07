import logging
import pandas as pd


logger = logging.getLogger(__name__)


# ============================================================
# REQUIRED COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
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


# ============================================================
# TRANSFORM DATA
# ============================================================

def transform_data(df):
    """
    Clean, validate, and transform raw mandi data.
    """

    logger.info("=" * 60)
    logger.info("STARTING DATA TRANSFORMATION")
    logger.info("=" * 60)

    # --------------------------------------------------------
    # 0. Validate input
    # --------------------------------------------------------

    if df is None:
        raise ValueError(
            "Transformation failed: input DataFrame is None"
        )

    if df.empty:
        raise ValueError(
            "Transformation failed: input DataFrame is empty"
        )

    logger.info(
        f"Input records received: {len(df)}"
    )

    df = df.copy()

    # --------------------------------------------------------
    # 1. Validate required columns
    # --------------------------------------------------------

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    logger.info(
        "Required columns validated successfully"
    )

    # --------------------------------------------------------
    # 2. Clean text columns
    # --------------------------------------------------------

    text_columns = [
        "state",
        "district",
        "market",
        "commodity",
        "variety",
        "grade"
    ]

    for column in text_columns:

        df[column] = (
            df[column]
            .fillna("")
            .astype(str)
            .str.strip()
        )

    logger.info(
        "Text columns cleaned successfully"
    )

    # --------------------------------------------------------
    # 3. Convert numeric columns
    # --------------------------------------------------------

    numeric_columns = [
        "arrival_quantity",
        "min_price",
        "max_price",
        "modal_price"
    ]

    for column in numeric_columns:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    logger.info(
        "Numeric columns converted successfully"
    )

    # --------------------------------------------------------
    # 4. Convert arrival date
    # --------------------------------------------------------

    df["arrival_date"] = pd.to_datetime(
        df["arrival_date"],
        dayfirst=True,
        errors="coerce"
    )

    logger.info(
        "Arrival dates converted successfully"
    )

    # --------------------------------------------------------
    # 5. Remove records with missing critical values
    # --------------------------------------------------------

    before_cleaning = len(df)

    df = df.dropna(
        subset=[
            "state",
            "district",
            "market",
            "commodity",
            "arrival_date",
            "min_price",
            "max_price",
            "modal_price"
        ]
    )

    removed_records = (
        before_cleaning - len(df)
    )

    logger.info(
        f"Missing-value cleaning completed: "
        f"{removed_records} records removed"
    )

    logger.info(
        f"Records remaining: {len(df)}"
    )

    # --------------------------------------------------------
    # 6. Remove duplicate records
    # --------------------------------------------------------

    before_duplicates = len(df)

    df = df.drop_duplicates(
        subset=[
            "state",
            "district",
            "market",
            "commodity",
            "variety",
            "grade",
            "arrival_date"
        ]
    )

    duplicate_records = (
        before_duplicates - len(df)
    )

    logger.info(
        f"Duplicate cleaning completed: "
        f"{duplicate_records} duplicate records removed"
    )

    logger.info(
        f"Records remaining after duplicate removal: "
        f"{len(df)}"
    )

    # --------------------------------------------------------
    # 7. Validate required text fields
    # --------------------------------------------------------

    logger.info(
        "Starting required-field validation..."
    )

    validation_errors = []

    empty_state = df["state"].eq("").sum()
    empty_district = df["district"].eq("").sum()
    empty_market = df["market"].eq("").sum()
    empty_commodity = df["commodity"].eq("").sum()

    if empty_state > 0:
        validation_errors.append(
            f"{empty_state} records have empty state"
        )

    if empty_district > 0:
        validation_errors.append(
            f"{empty_district} records have empty district"
        )

    if empty_market > 0:
        validation_errors.append(
            f"{empty_market} records have empty market"
        )

    if empty_commodity > 0:
        validation_errors.append(
            f"{empty_commodity} records have empty commodity"
        )

    # --------------------------------------------------------
    # 8. Business-rule validation
    # --------------------------------------------------------

    logger.info(
        "Starting price and quantity validation..."
    )

    for index, row in df.iterrows():

        row_number = index + 2

        # ----------------------------------------------------
        # Price validation
        # ----------------------------------------------------

        if row["min_price"] < 0:

            validation_errors.append(
                f"Row {row_number}: "
                f"min_price cannot be negative"
            )

        if row["max_price"] < 0:

            validation_errors.append(
                f"Row {row_number}: "
                f"max_price cannot be negative"
            )

        if row["modal_price"] < 0:

            validation_errors.append(
                f"Row {row_number}: "
                f"modal_price cannot be negative"
            )

        # ----------------------------------------------------
        # Price relationship
        # ----------------------------------------------------

        if row["min_price"] > row["max_price"]:

            validation_errors.append(
                f"Row {row_number}: "
                f"min_price is greater than max_price"
            )

        if row["modal_price"] < row["min_price"]:

            validation_errors.append(
                f"Row {row_number}: "
                f"modal_price is below min_price"
            )

        if row["modal_price"] > row["max_price"]:

            validation_errors.append(
                f"Row {row_number}: "
                f"modal_price is above max_price"
            )

        # ----------------------------------------------------
        # Arrival quantity validation
        # ----------------------------------------------------

        if pd.notna(row["arrival_quantity"]):

            if row["arrival_quantity"] < 0:

                validation_errors.append(
                    f"Row {row_number}: "
                    f"arrival_quantity cannot be negative"
                )

    # ========================================================
    # 9. Stop pipeline if validation fails
    # ========================================================

    if validation_errors:

        logger.error(
            f"Data validation failed with "
            f"{len(validation_errors)} error(s)"
        )

        for error in validation_errors[:20]:
            logger.error(error)

        if len(validation_errors) > 20:

            logger.error(
                f"... and "
                f"{len(validation_errors) - 20} "
                f"more validation errors"
            )

        raise ValueError(
            "Data validation failed. "
            "Fix invalid records before ingestion."
        )

    logger.info(
        "All business-rule validations passed successfully"
    )

    # --------------------------------------------------------
    # 10. Standardize date format
    # --------------------------------------------------------

    df["arrival_date"] = (
        df["arrival_date"]
        .dt.strftime("%Y-%m-%d")
    )

    logger.info(
        "Date format standardized successfully"
    )

    # --------------------------------------------------------
    # 11. Reset DataFrame index
    # --------------------------------------------------------

    df = df.reset_index(drop=True)

    # ========================================================
    # TRANSFORMATION SUMMARY
    # ========================================================

    logger.info("=" * 60)
    logger.info("DATA TRANSFORMATION COMPLETED")
    logger.info("=" * 60)

    logger.info(
        f"Final records: {len(df)}"
    )

    logger.info(
        f"States: {df['state'].nunique()}"
    )

    logger.info(
        f"Districts: {df['district'].nunique()}"
    )

    logger.info(
        f"Markets: {df['market'].nunique()}"
    )

    logger.info(
        f"Commodities: {df['commodity'].nunique()}"
    )

    logger.info("=" * 60)

    return df