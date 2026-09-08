import os
from pathlib import Path

from dotenv import load_dotenv


# ============================================================
# PROJECT PATH
# ============================================================

ROOT_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv(ROOT_DIR / ".env")


# ============================================================
# SUPABASE CONFIGURATION
# ============================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")


# ============================================================
# DATA.GOV.IN CONFIGURATION
# ============================================================

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")

DATA_GOV_RESOURCE_ID = (
    "9ef84268-d588-465a-a308-a864a43d0070"
)

DATA_GOV_URL = (
    f"https://api.data.gov.in/resource/{DATA_GOV_RESOURCE_ID}"
)


# ============================================================
# LOCAL DATA CONFIGURATION
# ============================================================

DATA_DIR = Path(__file__).parent / "data"

SAMPLE_CSV_FILE = DATA_DIR / "sample_mandi_data.csv"


# ============================================================
# AGMARKNET CONFIGURATION
# ============================================================

# Maharashtra State ID in AGMARKNET
AGMARKNET_STATE_ID = 20

# State name
AGMARKNET_STATE_NAME = "Maharashtra"


# ============================================================
# AGMARKNET COMMODITY CONFIGURATION
# ============================================================

AGMARKNET_COMMODITIES = [
    {
        "id": 23,
        "name": "Onion"
    },
    {
        "id": 305,
        "name": "Onion Green"
    },
    {
        "id": 65,
        "name": "Tomato"
    }
]


# ============================================================
# VALIDATE REQUIRED CONFIGURATION
# ============================================================

if not SUPABASE_URL:
    raise ValueError(
        "SUPABASE_URL is missing from .env"
    )


if not SUPABASE_SECRET_KEY:
    raise ValueError(
        "SUPABASE_SECRET_KEY is missing from .env"
    )