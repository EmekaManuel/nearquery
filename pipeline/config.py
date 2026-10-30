import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

BQ_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT")
BQ_DATASET = "bigquery-public-data.crypto_near_mainnet_us"
INTENTS_ACCOUNT = "intents.near"

RAW = ROOT / "data" / "raw"
