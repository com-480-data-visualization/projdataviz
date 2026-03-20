from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSETS_DIR = PROJECT_ROOT / "assets"

consumer_path = ASSETS_DIR / "China_DrinkMarket_Datasets" / "cleaned datasets" / "2.Consumer behavior.csv"
output_path = ASSETS_DIR / "plots" / "city_brand_stats.csv"


def looks_corrupted(df: pd.DataFrame, columns_to_check: list[str]) -> bool:
    sample_text = []
    for col in columns_to_check:
        if col in df.columns:
            sample_text.extend(df[col].astype(str).head(100).tolist())

    joined = " ".join(sample_text)
    bad_markers = ["�", "Ã", "Ð", "Ø", "Ù", "Ï", "Ñ"]
    return any(marker in joined for marker in bad_markers)


def read_csv_with_fallback(path: Path) -> pd.DataFrame:
    encodings_to_try = [
        "gb18030",
        "gbk",
        "utf-8-sig",
        "utf-8",
        "utf-16",
        "utf-16le",
        "utf-16be",
        "latin1",
        "cp1252",
    ]

    engines_to_try = ["c", "python"]

    for enc in encodings_to_try:
        for engine in engines_to_try:
            try:
                df = pd.read_csv(path, encoding=enc, engine=engine)

                if looks_corrupted(df, ["brand", "city", "product_type"]):
                    continue

                print(f"Loaded CSV with encoding: {enc} (engine={engine})")
                return df

            except Exception:
                continue

    raise ValueError(f"Could not read {path} safely with the tested encodings.")


consumer = read_csv_with_fallback(consumer_path)
consumer.columns = [c.strip() for c in consumer.columns]

consumer["city"] = consumer["city"].astype(str).str.strip()
consumer["brand"] = consumer["brand"].astype(str).str.strip()
consumer["quantity"] = pd.to_numeric(consumer["quantity"], errors="coerce")
consumer["order_amount"] = pd.to_numeric(consumer["order_amount"], errors="coerce")
consumer["price"] = pd.to_numeric(consumer["price"], errors="coerce")

consumer = consumer.dropna(subset=["city", "brand"])
consumer = consumer[(consumer["city"] != "") & (consumer["brand"] != "")]

city_stats = (
    consumer.groupby("city")
    .agg(
        distinct_brands=("brand", "nunique"),
        total_orders=("order_id", "count"),
        total_drinks=("quantity", "sum"),
        avg_drinks_per_order=("quantity", "mean"),
        min_drinks_per_order=("quantity", "min"),
        max_drinks_per_order=("quantity", "max"),
        avg_order_amount=("order_amount", "mean"),
        min_order_amount=("order_amount", "min"),
        max_order_amount=("order_amount", "max"),
        avg_price=("price", "mean"),
        min_price=("price", "min"),
        max_price=("price", "max"),
    )
    .reset_index()
    .sort_values(["distinct_brands", "total_orders"], ascending=[False, False])
)

for col in [
    "avg_drinks_per_order",
    "avg_order_amount",
    "avg_price",
]:
    city_stats[col] = city_stats[col].round(2)

print("\nCity brand stats:\n")
print(city_stats)

city_stats.to_csv(output_path, index=False, encoding="utf-8-sig")
print(f"\nSaved to: {output_path}")