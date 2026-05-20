from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent

if str(PARENT_DIR) not in sys.path:
    sys.path.insert(0, str(PARENT_DIR))

try:
    from .decision_tree_consts import (
        AGE_GROUP_MAP,
        BASE_FEATURES,
        BRANCH_LOGIC,
        BUDGET_BAND_DEFINITION,
        CITY_LEVEL_MAP,
        COLUMN_ALIASES,
        FEATURE_LABELS,
        FEATURES,
        FEATURE_VALUE_ORDER,
        GENDER_MAP,
        INPUT_PATH,
        LOW_BUDGET_MAX,
        MOTIVE_MAP,
        MEDIUM_BUDGET_MAX,
        NUMERIC_COLUMNS,
        OUTPUT_PATH,
        REQUIRED_COLUMNS,
        SCENARIO_MAP,
        TARGET,
        TOP_BRANDS_COUNT,
    )
except ImportError:
    from decision_tree_consts import (
        AGE_GROUP_MAP,
        BASE_FEATURES,
        BRANCH_LOGIC,
        BUDGET_BAND_DEFINITION,
        CITY_LEVEL_MAP,
        COLUMN_ALIASES,
        FEATURE_LABELS,
        FEATURES,
        FEATURE_VALUE_ORDER,
        GENDER_MAP,
        INPUT_PATH,
        LOW_BUDGET_MAX,
        MOTIVE_MAP,
        MEDIUM_BUDGET_MAX,
        NUMERIC_COLUMNS,
        OUTPUT_PATH,
        REQUIRED_COLUMNS,
        SCENARIO_MAP,
        TARGET,
        TOP_BRANDS_COUNT,
    )


TEST_SIZE = 0.25
EVALUATION_RANDOM_STATE = 42

MODEL_CONFIG = {
    "criterion": "gini",
    "max_depth": 5,
    "min_samples_leaf": 60,
    "max_leaf_nodes": 18,
    "class_weight": "balanced",
    "random_state": 42,
}


def normalize_key(value: object) -> str:
    return str(value).strip().lower().replace("_", "-").replace(" ", "")


def normalize_city_level(value: object) -> str:
    raw = str(value).strip()
    return CITY_LEVEL_MAP.get(normalize_key(raw), raw)


def normalize_age_group(value: object) -> str:
    raw = str(value).strip()
    return AGE_GROUP_MAP.get(normalize_key(raw), raw)


def normalize_gender(value: object) -> str:
    raw = str(value).strip().lower()
    return GENDER_MAP.get(raw, str(value).strip())


def normalize_motive(value: object) -> str:
    raw = str(value).strip()
    return MOTIVE_MAP.get(normalize_key(raw), raw)


def normalize_scenario(value: object) -> str:
    raw = str(value).strip()
    return SCENARIO_MAP.get(normalize_key(raw), raw)


def budget_band(order_amount: float) -> str:
    if order_amount < LOW_BUDGET_MAX:
        return "Low"

    if order_amount < MEDIUM_BUDGET_MAX:
        return "Medium"

    return "High"


def load_json_data(path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Input file not found: {path}")

    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list):
        raise ValueError("Expected consumer_behavior.json to contain a list of records.")

    return pd.DataFrame(data)


def normalize_consumer_data(raw_df: pd.DataFrame) -> pd.DataFrame:
    df = raw_df.copy()

    rename_map = {
        column: COLUMN_ALIASES[column]
        for column in df.columns
        if column in COLUMN_ALIASES
    }
    df = df.rename(columns=rename_map)

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")

    for column in NUMERIC_COLUMNS:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=REQUIRED_COLUMNS).copy()

    df["city_level"] = df["city_level"].map(normalize_city_level)
    df["age_group"] = df["age_group"].map(normalize_age_group)
    df["gender"] = df["gender"].map(normalize_gender)
    df["motive"] = df["motive"].map(normalize_motive)
    df["scenario"] = df["scenario"].map(normalize_scenario)

    for column in BASE_FEATURES + [TARGET, "brand"]:
        df[column] = df[column].astype(str).str.strip()
        df = df[df[column] != ""].copy()

    df["budget_band"] = df["order_amount"].map(budget_band)

    keep_columns = [
        column
        for column in FEATURES + [TARGET, "brand", "order_amount", "price", "quantity", "year"]
        if column in df.columns
    ]

    df = df[keep_columns].reset_index(drop=True)

    if df.empty:
        raise ValueError("No valid rows remain after preprocessing.")

    return df


def train_model(df: pd.DataFrame) -> tuple[DecisionTreeClassifier, pd.DataFrame]:
    x_encoded = pd.get_dummies(df[FEATURES], prefix_sep="=", dtype=int)
    y = df[TARGET]

    classifier = DecisionTreeClassifier(**MODEL_CONFIG)
    classifier.fit(x_encoded, y)

    return classifier, x_encoded


def make_json_safe(value):
    if isinstance(value, dict):
        return {
            str(key): make_json_safe(inner_value)
            for key, inner_value in value.items()
        }

    if isinstance(value, list):
        return [make_json_safe(item) for item in value]

    if isinstance(value, tuple):
        return [make_json_safe(item) for item in value]

    if isinstance(value, np.integer):
        return int(value)

    if isinstance(value, np.floating):
        return float(value)

    if isinstance(value, np.ndarray):
        return value.tolist()

    return value


def evaluate_model(x_encoded: pd.DataFrame, y: pd.Series) -> dict:
    x_train, x_test, y_train, y_test = train_test_split(
        x_encoded,
        y,
        test_size=TEST_SIZE,
        random_state=EVALUATION_RANDOM_STATE,
        stratify=y,
    )

    evaluation_model = DecisionTreeClassifier(**MODEL_CONFIG)
    evaluation_model.fit(x_train, y_train)

    train_predictions = evaluation_model.predict(x_train)
    test_predictions = evaluation_model.predict(x_test)

    classes = [str(class_name) for class_name in evaluation_model.classes_]

    majority_class = str(y_train.value_counts().idxmax())
    majority_baseline_predictions = np.array([majority_class] * len(y_test))

    report = classification_report(
        y_test,
        test_predictions,
        labels=evaluation_model.classes_,
        output_dict=True,
        zero_division=0,
    )

    matrix = confusion_matrix(
        y_test,
        test_predictions,
        labels=evaluation_model.classes_,
    )

    return make_json_safe(
        {
            "test_size": TEST_SIZE,
            "train_samples": int(len(y_train)),
            "test_samples": int(len(y_test)),
            "classes": classes,
            "train_accuracy": round_float(
                accuracy_score(y_train, train_predictions)
            ),
            "test_accuracy": round_float(
                accuracy_score(y_test, test_predictions)
            ),
            "balanced_test_accuracy": round_float(
                balanced_accuracy_score(y_test, test_predictions)
            ),
            "majority_class": majority_class,
            "majority_baseline_accuracy": round_float(
                accuracy_score(y_test, majority_baseline_predictions)
            ),
            "beats_majority_baseline": bool(
                accuracy_score(y_test, test_predictions)
                > accuracy_score(y_test, majority_baseline_predictions)
            ),
            "classification_report": report,
            "confusion_matrix": {
                "labels": classes,
                "matrix": matrix,
            },
        }
    )


def ordered_unique_values(df: pd.DataFrame, column: str) -> list[str]:
    actual_values = [str(value) for value in df[column].dropna().unique()]
    preferred_order = FEATURE_VALUE_ORDER.get(column, [])

    ordered = [value for value in preferred_order if value in actual_values]
    extras = sorted(value for value in actual_values if value not in ordered)

    return ordered + extras


def round_float(value: float | None, digits: int = 6) -> float | None:
    if value is None or pd.isna(value):
        return None

    return round(float(value), digits)


def model_class_stats(
    classifier: DecisionTreeClassifier,
    node_id: int,
    classes: list[str],
) -> dict:
    raw_values = classifier.tree_.value[node_id][0]
    total = float(np.sum(raw_values))

    if total <= 0:
        distribution = {
            class_name: 0.0
            for class_name in classes
        }

        return {
            "model_prediction": None,
            "model_dominant_share": 0.0,
            "model_class_distribution": distribution,
        }

    distribution = {
        class_name: round_float(float(raw_values[index]) / total)
        for index, class_name in enumerate(classes)
    }

    best_index = int(np.argmax(raw_values))
    prediction = classes[best_index]
    dominant_share = round_float(float(raw_values[best_index]) / total)

    return {
        "model_prediction": prediction,
        "model_dominant_share": dominant_share,
        "model_class_distribution": distribution,
    }


def split_encoded_feature(encoded_feature: str) -> tuple[str, str]:
    if "=" not in encoded_feature:
        raise ValueError(f"Unexpected encoded feature format: {encoded_feature}")

    feature, value = encoded_feature.split("=", 1)
    return feature, value


def format_question(feature: str, value: str) -> str:
    label = FEATURE_LABELS.get(feature, feature.replace("_", " ").title())
    return f"{label} = {value}?"


def class_stats(subset: pd.DataFrame, classes: list[str]) -> dict:
    total = int(len(subset))

    counts_series = (
        subset[TARGET]
        .value_counts()
        .reindex(classes, fill_value=0)
        .astype(int)
    )

    class_counts = {
        class_name: int(count)
        for class_name, count in counts_series.items()
    }

    if total == 0:
        class_distribution = {
            class_name: 0.0
            for class_name in classes
        }
        observed_prediction = None
        observed_dominant_share = 0.0
    else:
        class_distribution = {
            class_name: round_float(count / total)
            for class_name, count in class_counts.items()
        }

        observed_prediction = max(class_counts, key=class_counts.get)
        observed_dominant_share = round_float(
            class_counts[observed_prediction] / total
        )

    return {
        "observed_prediction": observed_prediction,
        "observed_dominant_share": observed_dominant_share,
        "class_counts": class_counts,
        "class_distribution": class_distribution,
    }


def top_brands(subset: pd.DataFrame) -> list[dict]:
    total = int(len(subset))

    if total == 0:
        return []

    brand_counts = (
        subset["brand"]
        .astype(str)
        .str.strip()
        .replace("", np.nan)
        .dropna()
        .value_counts()
        .head(TOP_BRANDS_COUNT)
    )

    return [
        {
            "brand": str(brand),
            "count": int(count),
            "share": round_float(count / total),
        }
        for brand, count in brand_counts.items()
    ]


def node_stats(df: pd.DataFrame, sample_indices: np.ndarray, classes: list[str]) -> dict:
    subset = df.iloc[sample_indices]
    stats = class_stats(subset, classes)

    average_order_amount = None
    if len(subset) > 0:
        average_order_amount = round_float(subset["order_amount"].mean(), digits=2)

    return {
        "samples": int(len(subset)),
        **stats,
        "top_brands": top_brands(subset),
        "average_order_amount": average_order_amount,
    }


def export_node(
    classifier: DecisionTreeClassifier,
    x_encoded: pd.DataFrame,
    df: pd.DataFrame,
    node_id: int,
    sample_indices: np.ndarray,
    depth: int,
    classes: list[str],
) -> dict:
    tree = classifier.tree_

    left_child = int(tree.children_left[node_id])
    right_child = int(tree.children_right[node_id])
    is_leaf = left_child == right_child

    model_stats = model_class_stats(classifier, node_id, classes)
    observed_stats = node_stats(df, sample_indices, classes)

    node = {
        "id": int(node_id),
        "type": "leaf" if is_leaf else "split",
        "depth": int(depth),

        # Main prediction used by the visualization.
        # This comes from the balanced sklearn model.
        "prediction": model_stats["model_prediction"],
        "dominant_share": model_stats["model_dominant_share"],

        # Explicit model statistics.
        "model_prediction": model_stats["model_prediction"],
        "model_dominant_share": model_stats["model_dominant_share"],
        "model_class_distribution": model_stats["model_class_distribution"],

        # Real observed statistics inside the node.
        **observed_stats,
    }

    if is_leaf:
        return node

    encoded_feature_index = int(tree.feature[node_id])
    encoded_feature = str(x_encoded.columns[encoded_feature_index])
    threshold = float(tree.threshold[node_id])

    feature, value = split_encoded_feature(encoded_feature)
    current_values = x_encoded.iloc[sample_indices, encoded_feature_index].to_numpy()

    no_indices = sample_indices[current_values <= threshold]
    yes_indices = sample_indices[current_values > threshold]

    no_child = export_node(
        classifier=classifier,
        x_encoded=x_encoded,
        df=df,
        node_id=left_child,
        sample_indices=no_indices,
        depth=depth + 1,
        classes=classes,
    )
    no_child["branch"] = "no"
    no_child["branch_label"] = "No"

    yes_child = export_node(
        classifier=classifier,
        x_encoded=x_encoded,
        df=df,
        node_id=right_child,
        sample_indices=yes_indices,
        depth=depth + 1,
        classes=classes,
    )
    yes_child["branch"] = "yes"
    yes_child["branch_label"] = "Yes"

    node.update(
        {
            "question": format_question(feature, value),
            "condition": {
                "feature": feature,
                "operator": "equals",
                "value": value,
                "encoded_feature": encoded_feature,
                "threshold": threshold,
            },
            "children": [no_child, yes_child],
        }
    )

    return node


def collect_leaf_nodes(node: dict) -> list[dict]:
    if node["type"] == "leaf":
        return [node]

    leaves = []
    for child in node.get("children", []):
        leaves.extend(collect_leaf_nodes(child))

    return leaves


def build_leaf_diagnostics(root: dict) -> dict:
    leaves = collect_leaf_nodes(root)

    predictions = [
        leaf["prediction"]
        for leaf in leaves
        if leaf.get("prediction") is not None
    ]

    prediction_counts = Counter(predictions)

    observed_predictions = [
        leaf["observed_prediction"]
        for leaf in leaves
        if leaf.get("observed_prediction") is not None
    ]

    observed_prediction_counts = Counter(observed_predictions)

    samples_by_prediction = Counter()
    for leaf in leaves:
        prediction = leaf.get("prediction")
        if prediction is not None:
            samples_by_prediction[prediction] += int(leaf.get("samples", 0))

    dominant_shares = [
        float(leaf.get("dominant_share", 0))
        for leaf in leaves
    ]

    leaf_summary = [
        {
            "id": int(leaf["id"]),
            "depth": int(leaf["depth"]),
            "samples": int(leaf["samples"]),

            "prediction": leaf["prediction"],
            "dominant_share": leaf["dominant_share"],

            "model_prediction": leaf["model_prediction"],
            "model_dominant_share": leaf["model_dominant_share"],
            "model_class_distribution": leaf["model_class_distribution"],

            "observed_prediction": leaf["observed_prediction"],
            "observed_dominant_share": leaf["observed_dominant_share"],

            "class_counts": leaf["class_counts"],
            "class_distribution": leaf["class_distribution"],

            "top_brands": leaf["top_brands"],
            "average_order_amount": leaf["average_order_amount"],
        }
        for leaf in leaves
    ]

    unique_predictions = sorted(prediction_counts.keys())

    return make_json_safe(
        {
            "leaf_count": len(leaves),
            "unique_leaf_predictions": unique_predictions,
            "observed_unique_leaf_predictions": sorted(observed_prediction_counts.keys()),
            "all_leaves_same_prediction": len(unique_predictions) <= 1,
            "leaf_prediction_counts": dict(prediction_counts),
            "observed_leaf_prediction_counts": dict(observed_prediction_counts),
            "leaf_samples_by_prediction": dict(samples_by_prediction),
            "dominant_share": {
                "min": round_float(min(dominant_shares)) if dominant_shares else None,
                "max": round_float(max(dominant_shares)) if dominant_shares else None,
                "mean": round_float(float(np.mean(dominant_shares))) if dominant_shares else None,
            },
            "leaf_summary": leaf_summary,
        }
    )


def build_export_json(
    classifier: DecisionTreeClassifier,
    x_encoded: pd.DataFrame,
    df: pd.DataFrame,
    evaluation_stats: dict,
) -> dict:
    classes = [str(class_name) for class_name in classifier.classes_]
    root_indices = np.arange(len(df))

    feature_values = {feature: ordered_unique_values(df, feature) for feature in FEATURES}

    root = export_node(
        classifier=classifier,
        x_encoded=x_encoded,
        df=df,
        node_id=0,
        sample_indices=root_indices,
        depth=0,
        classes=classes,
    )

    leaf_diagnostics = build_leaf_diagnostics(root)

    compact_leaf_diagnostics = {
        key: value
        for key, value in leaf_diagnostics.items()
        if key != "leaf_summary"
    }

    return {
        "metadata": {
            "schema_version": 1,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "model_type": "sklearn.tree.DecisionTreeClassifier",
            "target": TARGET,
            "features": FEATURES,
            "classes": classes,
            "feature_values": feature_values,
            "training_samples": int(len(df)),
            "model_config": MODEL_CONFIG,
            "evaluation": evaluation_stats,
            "leaf_diagnostics": compact_leaf_diagnostics,
            "budget_band_definition": BUDGET_BAND_DEFINITION,
            "branch_logic": BRANCH_LOGIC,
            "note": (
                "This balanced decision tree is intended for exploratory visualization "
                "of consumer behavior patterns. The field 'prediction' is the model's "
                "balanced suggestion, while 'class_distribution' shows the real observed "
                "product-type distribution inside each node. It should not be interpreted "
                "as a high-accuracy predictor."
            ),
        },
        "root": root,
        "leaf_summary": leaf_diagnostics["leaf_summary"],
    }


def save_json(data: dict, path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def main() -> None:
    raw_df = load_json_data(INPUT_PATH)
    df = normalize_consumer_data(raw_df)

    classifier, x_encoded = train_model(df)
    evaluation_stats = evaluate_model(x_encoded, df[TARGET])
    export_data = build_export_json(classifier, x_encoded, df, evaluation_stats)

    save_json(export_data, OUTPUT_PATH)

    root = export_data["root"]
    evaluation = export_data["metadata"]["evaluation"]
    leaf_diagnostics = export_data["metadata"]["leaf_diagnostics"]

    print("Decision tree export complete.")
    print(f"Input rows used: {len(df)}")
    print(f"Output file: {OUTPUT_PATH}")
    print(f"Root prediction: {root['prediction']}")
    print(f"Root samples: {root['samples']}")
    print(f"Tree max depth: {MODEL_CONFIG['max_depth']}")
    print(f"Minimum samples per leaf: {MODEL_CONFIG['min_samples_leaf']}")
    print("")
    print("Evaluation diagnostics:")
    print(f"Train accuracy: {evaluation['train_accuracy']}")
    print(f"Test accuracy: {evaluation['test_accuracy']}")
    print(f"Balanced test accuracy: {evaluation['balanced_test_accuracy']}")
    print(f"Majority class: {evaluation['majority_class']}")
    print(f"Majority baseline accuracy: {evaluation['majority_baseline_accuracy']}")
    print(f"Beats majority baseline: {evaluation['beats_majority_baseline']}")
    print("")
    print("Leaf diagnostics:")
    print(f"Leaf count: {leaf_diagnostics['leaf_count']}")
    print(f"Unique leaf predictions: {leaf_diagnostics['unique_leaf_predictions']}")
    print(f"All leaves same prediction: {leaf_diagnostics['all_leaves_same_prediction']}")
    print(f"Leaf prediction counts: {leaf_diagnostics['leaf_prediction_counts']}")
    print(
        "Observed unique leaf predictions: "
        f"{leaf_diagnostics['observed_unique_leaf_predictions']}"
    )
    print(
        "Observed leaf prediction counts: "
        f"{leaf_diagnostics['observed_leaf_prediction_counts']}"
    )
    print(f"Leaf samples by prediction: {leaf_diagnostics['leaf_samples_by_prediction']}")
    print(f"Dominant share summary: {leaf_diagnostics['dominant_share']}")


if __name__ == "__main__":
    main()
