from __future__ import annotations

from pathlib import Path


# Centralized paths for the training/export pipeline.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
INPUT_PATH = PROJECT_ROOT / "assets" / "data" / "consumer_behavior.json"
OUTPUT_PATH = PROJECT_ROOT / "assets" / "data" / "beverage_decision_tree.json"


# Target column and model features used for training.
TARGET = "product_type"

BASE_FEATURES = [
    "city_level",
    "age_group",
    "gender",
    "motive",
    "scenario",
]

FEATURES = BASE_FEATURES + ["budget_band"]


# Fixed sklearn configuration requested for the exported tree.
MODEL_CONFIG = {
    "criterion": "gini",
    "max_depth": 4,
    "min_samples_leaf": 120,
    "random_state": 42,
}

TOP_BRANDS_COUNT = 5


# Input column aliases accepted from the consumer behavior dataset.
COLUMN_ALIASES = {
    "order_id": "order_id",
    "city": "city",
    "city_level": "city_level",
    "city level": "city_level",
    "City Level": "city_level",
    "brand": "brand",
    "Brand": "brand",
    "product_type": "product_type",
    "Product Type": "product_type",
    "price": "price",
    "Price": "price",
    "quantity": "quantity",
    "Quantity": "quantity",
    "order_amount": "order_amount",
    "Order Amount": "order_amount",
    "scenario": "scenario",
    "Consumption Scenario": "scenario",
    "gender": "gender",
    "Gender": "gender",
    "age_group": "age_group",
    "Age Group": "age_group",
    "motive": "motive",
    "Consumption Motive": "motive",
    "year": "year",
    "Year": "year",
}

REQUIRED_COLUMNS = BASE_FEATURES + [TARGET, "brand", "order_amount"]
NUMERIC_COLUMNS = ["price", "quantity", "order_amount", "year"]


# Human-friendly labels for later D3 rendering.
FEATURE_LABELS = {
    "city_level": "City tier",
    "age_group": "Age group",
    "gender": "Gender",
    "motive": "Motive",
    "scenario": "Scenario",
    "budget_band": "Budget",
}

FEATURE_VALUE_ORDER = {
    "city_level": ["1st-tier", "2nd-tier", "3rd-tier"],
    "age_group": ["18-24", "25-34", "35-44", "Over 45"],
    "gender": ["female", "male"],
    "motive": ["Quality", "Novelty", "Social"],
    "scenario": ["Delivery", "Dine-in", "Pick-up"],
    "budget_band": ["Low", "Medium", "High"],
}


# Canonical value mappings used during preprocessing.
CITY_LEVEL_MAP = {
    "1st-tier": "1st-tier",
    "first-tier": "1st-tier",
    "tier1": "1st-tier",
    "tier-1": "1st-tier",
    "2nd-tier": "2nd-tier",
    "second-tier": "2nd-tier",
    "tier2": "2nd-tier",
    "tier-2": "2nd-tier",
    "3rd-tier": "3rd-tier",
    "third-tier": "3rd-tier",
    "tier3": "3rd-tier",
    "tier-3": "3rd-tier",
}

AGE_GROUP_MAP = {
    "18-24": "18-24",
    "25-34": "25-34",
    "35-44": "35-44",
    "45+": "Over 45",
    "over45": "Over 45",
    "over-45": "Over 45",
    "over45years": "Over 45",
    "over45yearsold": "Over 45",
    "over45+": "Over 45",
}

GENDER_MAP = {
    "female": "female",
    "f": "female",
    "male": "male",
    "m": "male",
}

MOTIVE_MAP = {
    "quality": "Quality",
    "novelty": "Novelty",
    "social": "Social",
}

SCENARIO_MAP = {
    "delivery": "Delivery",
    "dine-in": "Dine-in",
    "dinein": "Dine-in",
    "pickup": "Pick-up",
    "pick-up": "Pick-up",
    "takeaway": "Pick-up",
    "take-away": "Pick-up",
}


# Budget-band thresholds derived from order amount.
LOW_BUDGET_MAX = 25
MEDIUM_BUDGET_MAX = 50

BUDGET_BAND_DEFINITION = {
    "Low": "order_amount < 25",
    "Medium": "25 <= order_amount < 50",
    "High": "order_amount >= 50",
}


# Export metadata and branch semantics for the visualization layer.
BRANCH_LOGIC = {
    "yes": "selected feature value equals the condition value",
    "no": "selected feature value does not equal the condition value",
}

EXPORT_NOTE = (
    "This decision tree is intended for exploratory visualization "
    "of consumer behavior patterns, not as a high-accuracy predictor."
)
