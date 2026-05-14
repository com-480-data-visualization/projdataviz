from pathlib import Path
import json
import math

import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import train_test_split


# ============================================================
# Constants
# ============================================================

ROOT_DIR = Path(__file__).resolve().parents[2]

INPUT_DATA_PATH = ROOT_DIR / "assets" / "data" / "consumer_behavior.json"
OUTPUT_MODEL_PATH = ROOT_DIR / "assets" / "data" / "beverage_decision_tree.json"

SOURCE_COLUMNS = {
    "city_level": "city_level",
    "age_group": "age_group",
    "gender": "gender",
    "motive": "motive",
    "scenario": "scenario",
    "order_amount": "order_amount",
    "price": "price",
    "brand": "brand",
    "product_type": "product_type",
}

FEATURES = [
    "city_level",
    "age_group",
    "gender",
    "motive",
    "scenario",
    "budget_band",
]

TARGET = "product_type"

MODEL_RANDOM_STATE = 42
TEST_SIZE = 0.2
MAX_DEPTH = 4
MIN_SAMPLES_LEAF = 120
CRITERION = "entropy"

TOP_LABEL_LIMIT = 5
TOP_BRAND_LIMIT = 5

BUDGET_BANDS = [
    {
        "value": "budget_low",
        "label": "Under ¥15",
        "min": 0,
        "max": 15,
    },
    {
        "value": "budget_standard",
        "label": "¥15–25",
        "min": 15,
        "max": 25,
    },
    {
        "value": "budget_premium",
        "label": "¥25–35",
        "min": 25,
        "max": 35,
    },
    {
        "value": "budget_high",
        "label": "¥35+",
        "min": 35,
        "max": math.inf,
    },
]

FEATURE_LABELS = {
    "city_level": "City tier",
    "age_group": "Age group",
    "gender": "Gender",
    "motive": "Motive",
    "scenario": "Scenario",
    "budget_band": "Budget",
}

VALUE_LABELS = {
    "city_level": {
        "1st-tier": "Tier 1",
        "new-1st-tier": "New Tier 1",
        "2nd-tier": "Tier 2",
        "3rd-tier": "Tier 3",
        "4th-tier": "Tier 4",
    },
    "gender": {
        "male": "Male",
        "female": "Female",
    },
    "motive": {
        "quality": "Quality",
        "novelty": "Novelty",
        "social": "Social",
        "convenience": "Convenience",
        "price": "Price",
    },
    "scenario": {
        "Dine-in": "Dine-in",
        "Takeaway": "Takeaway",
        "Delivery": "Delivery",
        "Gift": "Gift",
    },
    "budget_band": {
        "budget_low": "Under ¥15",
        "budget_standard": "¥15–25",
        "budget_premium": "¥25–35",
        "budget_high": "¥35+",
    },
}


# ============================================================
# Normalization helpers
# ============================================================

def clean_string(value):
    if pd.isna(value):
        return None

    return str(value).strip()


def normalize_city_level(value):
    value = clean_string(value)

    if not value:
        return None

    value = value.lower().replace("_", "-").replace(" ", "-")

    mapping = {
        "tier1": "1st-tier",
        "first-tier": "1st-tier",
        "1st-tier": "1st-tier",

        "new-tier1": "new-1st-tier",
        "new-first-tier": "new-1st-tier",
        "new-1st-tier": "new-1st-tier",

        "tier2": "2nd-tier",
        "second-tier": "2nd-tier",
        "2nd-tier": "2nd-tier",

        "tier3": "3rd-tier",
        "third-tier": "3rd-tier",
        "3rd-tier": "3rd-tier",

        "tier4": "4th-tier",
        "fourth-tier": "4th-tier",
        "4th-tier": "4th-tier",
    }

    return mapping.get(value, value)


def normalize_gender(value):
    value = clean_string(value)

    if not value:
        return None

    return value.lower()


def normalize_motive(value):
    value = clean_string(value)

    if not value:
        return None

    lower = value.lower()

    if "quality" in lower or "taste" in lower:
        return "quality"

    if "novel" in lower:
        return "novelty"

    if "social" in lower:
        return "social"

    if "convenience" in lower:
        return "convenience"

    if "price" in lower or "cheap" in lower or "discount" in lower:
        return "price"

    return lower


def normalize_scenario(value):
    value = clean_string(value)

    if not value:
        return None

    lower = value.lower()

    if "dine" in lower:
        return "Dine-in"

    if "take" in lower:
        return "Takeaway"

    if "delivery" in lower:
        return "Delivery"

    if "gift" in lower:
        return "Gift"

    return value


def to_float(value):
    try:
        return float(value)
    except Exception:
        return None


def get_budget_band(amount):
    amount = to_float(amount)

    if amount is None:
        return None

    for band in BUDGET_BANDS:
        if band["min"] <= amount < band["max"]:
            return band["value"]

    return None


def feature_label(feature):
    return FEATURE_LABELS.get(feature, feature)


def value_label(feature, value):
    value = str(value)
    return VALUE_LABELS.get(feature, {}).get(value, value)


# ============================================================
# Data helpers
# ============================================================

def top_distribution(series, limit):
    counts = series.value_counts(dropna=False)
    total = int(counts.sum())

    if total == 0:
        return []

    items = []

    for name, count in counts.head(limit).items():
        items.append({
            "name": str(name),
            "count": int(count),
            "pct": round(float(count / total * 100), 1),
        })

    return items


def build_feature_segments(df_subset):
    segments = {}

    for feature in FEATURES:
        items = []

        for value, group in df_subset.groupby(feature):
            if len(group) == 0:
                continue

            label_counts = group[TARGET].value_counts()
            top_label = str(label_counts.index[0])
            top_count = int(label_counts.iloc[0])

            items.append({
                "value": str(value),
                "label": value_label(feature, value),
                "count": int(len(group)),
                "topLabel": top_label,
                "pct": round(float(top_count / len(group) * 100), 1),
            })

        segments[feature] = sorted(
            items,
            key=lambda item: item["count"],
            reverse=True,
        )

    return segments


def load_dataset():
    with open(INPUT_DATA_PATH, "r", encoding="utf-8") as file:
        raw_data = json.load(file)

    df = pd.DataFrame(raw_data)

    df["city_level"] = df[SOURCE_COLUMNS["city_level"]].apply(normalize_city_level)
    df["age_group"] = df[SOURCE_COLUMNS["age_group"]].apply(clean_string)
    df["gender"] = df[SOURCE_COLUMNS["gender"]].apply(normalize_gender)
    df["motive"] = df[SOURCE_COLUMNS["motive"]].apply(normalize_motive)
    df["scenario"] = df[SOURCE_COLUMNS["scenario"]].apply(normalize_scenario)

    amount_source = SOURCE_COLUMNS["order_amount"]

    if amount_source not in df.columns:
        amount_source = SOURCE_COLUMNS["price"]

    df["budget_band"] = df[amount_source].apply(get_budget_band)
    df[TARGET] = df[SOURCE_COLUMNS["product_type"]].apply(clean_string)

    if SOURCE_COLUMNS["brand"] not in df.columns:
        df["brand"] = "Unknown"

    df = df.dropna(subset=FEATURES + [TARGET]).reset_index(drop=True)

    return df


# ============================================================
# Model export helpers
# ============================================================

def build_encoded_metadata(encoder):
    metadata = []

    for feature, categories in zip(FEATURES, encoder.categories_):
        for category in categories:
            metadata.append({
                "feature": feature,
                "featureLabel": feature_label(feature),
                "value": str(category),
                "valueLabel": value_label(feature, category),
            })

    return metadata


def build_ui_options(df):
    fields = []

    for feature in FEATURES:
        values = sorted(df[feature].dropna().unique().tolist())

        fields.append({
            "feature": feature,
            "label": feature_label(feature),
            "options": [
                {
                    "value": str(value),
                    "label": value_label(feature, value),
                }
                for value in values
            ],
        })

    return fields


def train_model(df):
    x = df[FEATURES]
    y = df[TARGET]

    try:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    except TypeError:
        encoder = OneHotEncoder(handle_unknown="ignore", sparse=False)

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=TEST_SIZE,
        random_state=MODEL_RANDOM_STATE,
        stratify=y,
    )

    encoder.fit(x_train)

    x_train_encoded = encoder.transform(x_train)
    x_test_encoded = encoder.transform(x_test)
    x_all_encoded = encoder.transform(x)

    model = DecisionTreeClassifier(
        max_depth=MAX_DEPTH,
        min_samples_leaf=MIN_SAMPLES_LEAF,
        criterion=CRITERION,
        random_state=MODEL_RANDOM_STATE,
    )

    model.fit(x_train_encoded, y_train)

    accuracy = model.score(x_test_encoded, y_test)

    return model, encoder, x_all_encoded, accuracy


def export_tree(model, encoder, df, x_all_encoded, accuracy):
    tree = model.tree_
    classes = [str(class_name) for class_name in model.classes_]
    encoded_metadata = build_encoded_metadata(encoder)

    decision_path = model.decision_path(x_all_encoded).tocsc()

    def sample_indices_for_node(node_id):
        return decision_path[:, node_id].indices.tolist()

    def prediction_for_node(node_id):
        values = tree.value[node_id][0]
        total = float(values.sum())

        if total == 0:
            return {
                "prediction": None,
                "confidence": 0,
                "classDistribution": [],
            }

        max_index = int(values.argmax())

        distribution = []

        for class_name, count in zip(classes, values):
            distribution.append({
                "name": class_name,
                "count": float(count),
                "pct": round(float(count / total * 100), 1),
            })

        distribution = sorted(
            distribution,
            key=lambda item: item["pct"],
            reverse=True,
        )

        return {
            "prediction": classes[max_index],
            "confidence": round(float(values[max_index] / total * 100), 1),
            "classDistribution": distribution,
        }

    def insights_for_node(node_id):
        indices = sample_indices_for_node(node_id)
        subset = df.iloc[indices]

        return {
            "sampleCount": int(len(subset)),
            "shareOfDataset": round(float(len(subset) / len(df) * 100), 1),
            "topLabels": top_distribution(subset[TARGET], TOP_LABEL_LIMIT),
            "topBrands": top_distribution(subset["brand"], TOP_BRAND_LIMIT),
            "segments": build_feature_segments(subset),
        }

    def build_node(node_id, branch=None, branch_label=None):
        is_leaf = tree.children_left[node_id] == tree.children_right[node_id]

        prediction = prediction_for_node(node_id)
        insights = insights_for_node(node_id)

        node = {
            "id": int(node_id),
            "type": "leaf" if is_leaf else "split",
            "branch": branch,
            "branchLabel": branch_label,
            "isLeaf": bool(is_leaf),
            "prediction": prediction["prediction"],
            "confidence": prediction["confidence"],
            "classDistribution": prediction["classDistribution"],
            "sampleCount": insights["sampleCount"],
            "shareOfDataset": insights["shareOfDataset"],
            "topLabels": insights["topLabels"],
            "topBrands": insights["topBrands"],
            "segments": insights["segments"],
            "children": [],
        }

        if is_leaf:
            node["question"] = None
            node["shortLabel"] = prediction["prediction"]
            return node

        encoded_feature_index = int(tree.feature[node_id])
        split_meta = encoded_metadata[encoded_feature_index]

        feature = split_meta["feature"]
        value = split_meta["value"]

        node["split"] = {
            "feature": feature,
            "featureLabel": split_meta["featureLabel"],
            "operator": "==",
            "value": value,
            "valueLabel": split_meta["valueLabel"],
            "threshold": float(tree.threshold[node_id]),
        }

        node["question"] = f"{split_meta['featureLabel']} is {split_meta['valueLabel']}?"
        node["shortLabel"] = f"{split_meta['featureLabel']} = {split_meta['valueLabel']}?"

        left_id = int(tree.children_left[node_id])
        right_id = int(tree.children_right[node_id])

        # For one-hot encoded features:
        # left child means encoded value <= 0.5, so condition is false.
        # right child means encoded value > 0.5, so condition is true.
        node["children"] = [
            build_node(left_id, branch="no", branch_label="No"),
            build_node(right_id, branch="yes", branch_label="Yes"),
        ]

        return node

    category_importances = []

    for index, importance in enumerate(model.feature_importances_):
        if importance <= 0:
            continue

        meta = encoded_metadata[index]

        category_importances.append({
            "feature": meta["feature"],
            "featureLabel": meta["featureLabel"],
            "value": meta["value"],
            "valueLabel": meta["valueLabel"],
            "importance": round(float(importance), 4),
        })

    feature_importances_map = {}

    for item in category_importances:
        feature = item["feature"]
        feature_importances_map[feature] = feature_importances_map.get(feature, 0) + item["importance"]

    feature_importances = [
        {
            "feature": feature,
            "featureLabel": feature_label(feature),
            "importance": round(float(importance), 4),
        }
        for feature, importance in feature_importances_map.items()
    ]

    feature_importances = sorted(
        feature_importances,
        key=lambda item: item["importance"],
        reverse=True,
    )

    exported = {
        "modelType": "DecisionTreeClassifier",
        "target": TARGET,
        "features": FEATURES,
        "uiOptions": build_ui_options(df),
        "classes": classes,
        "maxDepth": int(model.get_depth()),
        "nodeCount": int(tree.node_count),
        "testAccuracy": round(float(accuracy), 3),
        "featureImportances": feature_importances,
        "categoryImportances": category_importances,
        "tree": build_node(0),
    }

    return exported


def main():
    df = load_dataset()

    model, encoder, x_all_encoded, accuracy = train_model(df)

    exported = export_tree(
        model=model,
        encoder=encoder,
        df=df,
        x_all_encoded=x_all_encoded,
        accuracy=accuracy,
    )

    OUTPUT_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_MODEL_PATH, "w", encoding="utf-8") as file:
        json.dump(exported, file, ensure_ascii=False, indent=2)

    print(f"Exported model to: {OUTPUT_MODEL_PATH}")
    print(f"Rows used: {len(df)}")
    print(f"Accuracy: {exported['testAccuracy']}")
    print(f"Depth: {exported['maxDepth']}")
    print(f"Nodes: {exported['nodeCount']}")


if __name__ == "__main__":
    main()