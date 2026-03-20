from pathlib import Path
import matplotlib
matplotlib.use("Agg")

import pandas as pd
import matplotlib.pyplot as plt
from matplotlib import font_manager

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSETS_DIR = PROJECT_ROOT / "assets"

consumer_path = ASSETS_DIR / "China_DrinkMarket_Datasets" / "cleaned datasets" / "2.Consumer behavior.csv"
shops_path = ASSETS_DIR / "China_DrinkMarket_Datasets" / "cleaned datasets" / "1.Drink shops.xlsx"

output_dir = ASSETS_DIR / "plots" 
output_dir.mkdir(parents=True, exist_ok=True)


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

    last_errors = []

    for enc in encodings_to_try:
        for engine in engines_to_try:
            try:
                df = pd.read_csv(
                    path,
                    encoding=enc,
                    engine=engine
                )

                if looks_corrupted(df, ["brand", "city", "product_type"]):
                    print(f"Rejected CSV encoding due to corrupted text: {enc} (engine={engine})")
                    continue

                print(f"Loaded CSV with encoding: {enc} (engine={engine})")
                return df

            except Exception as e:
                last_errors.append(f"{enc} / {engine}: {type(e).__name__}: {e}")
                continue

    print("\nFailed attempts:")
    for err in last_errors[-10:]:
        print(" -", err)

    raise ValueError(f"Could not read {path} safely with the tested encodings.")


def clean_text_series(s):
    return (
        s.astype(str)
         .str.strip()
         .str.lower()
         .str.replace(r"\s+", "", regex=True)
         .str.replace(r"[()（）\-—_/·,，.。:：;；'\"`~!@#$%^&*+=?<>[\]{}|\\]", "", regex=True)
    )


def save_plot(filename):
    plt.tight_layout()
    plt.savefig(output_dir / filename, dpi=300, bbox_inches="tight")
    plt.close()


candidate_fonts = [
    "Noto Sans CJK SC",
    "Noto Sans CJK JP",
    "Noto Serif CJK JP",
    "SimHei",
    "Microsoft YaHei",
    "WenQuanYi Zen Hei",
    "Arial Unicode MS"
]

available_fonts = {f.name for f in font_manager.fontManager.ttflist}
chosen_font = None
for f in candidate_fonts:
    if f in available_fonts:
        chosen_font = f
        break

if chosen_font:
    plt.rcParams["font.family"] = chosen_font
    print(f"Using font: {chosen_font}")
else:
    print("No Chinese-compatible font found. Chinese labels may not display correctly.")

plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["figure.figsize"] = (10, 6)
plt.rcParams["axes.grid"] = True
plt.rcParams["font.size"] = 11

consumer = read_csv_with_fallback(consumer_path)
shops = pd.read_excel(shops_path)

consumer.columns = [c.strip() for c in consumer.columns]
shops.columns = [c.strip() for c in shops.columns]

print("\nConsumer columns:", consumer.columns.tolist())
print("Shops columns:", shops.columns.tolist())

consumer["brand"] = clean_text_series(consumer["brand"])
shops["Name"] = clean_text_series(shops["Name"])

consumer = consumer[consumer["brand"].notna() & (consumer["brand"] != "")]
shops = shops[shops["Name"].notna() & (shops["Name"] != "")]

for col in ["price", "quantity", "order_amount", "year"]:
    if col in consumer.columns:
        consumer[col] = pd.to_numeric(consumer[col], errors="coerce")

for col in ["Average Price", "Number of Stores"]:
    if col in shops.columns:
        shops[col] = pd.to_numeric(shops[col], errors="coerce")

consumer = consumer.dropna(subset=["brand"])
shops = shops.dropna(subset=["Name"])

merged = consumer.merge(
    shops,
    left_on="brand",
    right_on="Name",
    how="inner"
)

print("\n=== DATASET SHAPES ===")
print("Consumer shape:", consumer.shape)
print("Shops shape:", shops.shape)
print("Merged shape:", merged.shape)
print("Matched brands:", merged["brand"].nunique())

consumer_brands = set(consumer["brand"].dropna().unique())
shop_brands = set(shops["Name"].dropna().unique())
common_brands = sorted(consumer_brands & shop_brands)

print("\nNumber of common brands:", len(common_brands))
print("Common brands (first 30):", common_brands[:30])

print("\n=== BASIC STATS: CONSUMER ===")
print("Rows:", len(consumer))
print("Unique brands:", consumer["brand"].nunique())
print("Unique cities:", consumer["city"].nunique() if "city" in consumer.columns else "N/A")
print("Unique product types:", consumer["product_type"].nunique() if "product_type" in consumer.columns else "N/A")
numeric_cols_consumer = [c for c in ["price", "quantity", "order_amount"] if c in consumer.columns]
if numeric_cols_consumer:
    print(consumer[numeric_cols_consumer].describe())

print("\n=== BASIC STATS: SHOPS ===")
print("Rows:", len(shops))
print("Unique brands:", shops["Name"].nunique())
print("Unique types:", shops["Type"].nunique() if "Type" in shops.columns else "N/A")
numeric_cols_shops = [c for c in ["Average Price", "Number of Stores"] if c in shops.columns]
if numeric_cols_shops:
    print(shops[numeric_cols_shops].describe())

brand_counts = consumer["brand"].value_counts().head(10)

plt.figure()
brand_counts.sort_values().plot(kind="barh")
plt.title("Top 10 Brands by Number of Orders")
plt.xlabel("Number of Orders")
plt.ylabel("Brand")
save_plot("01_top_10_brands_orders.png")

if "city" in consumer.columns:
    city_counts = consumer["city"].value_counts().head(10)

    plt.figure()
    city_counts.sort_values().plot(kind="barh")
    plt.title("Top 10 Cities by Number of Orders")
    plt.xlabel("Number of Orders")
    plt.ylabel("City")
    save_plot("02_top_10_cities_orders.png")

top_stores = shops[["Name", "Number of Stores"]].dropna()
top_stores = top_stores.sort_values("Number of Stores", ascending=False).head(10)

plt.figure()
plt.barh(top_stores["Name"], top_stores["Number of Stores"])
plt.title("Top 10 Drink Brands by Number of Stores")
plt.xlabel("Number of Stores")
plt.ylabel("Brand")
save_plot("03_top_10_brands_stores.png")

shops_clean = shops.dropna(subset=["Average Price", "Number of Stores"]).copy()

plt.figure()
plt.scatter(shops_clean["Number of Stores"], shops_clean["Average Price"], alpha=0.7)
plt.title("Average Price vs Number of Stores")
plt.xlabel("Number of Stores")
plt.ylabel("Average Price")
save_plot("04_avg_price_vs_stores.png")

brand_orders = consumer.groupby("brand").size().reset_index(name="order_count")

brand_link = brand_orders.merge(
    shops[["Name", "Number of Stores", "Average Price"]],
    left_on="brand",
    right_on="Name",
    how="inner"
).dropna(subset=["order_count", "Number of Stores"])

if not brand_link.empty:
    plt.figure()
    plt.scatter(brand_link["Number of Stores"], brand_link["order_count"], alpha=0.8)

    top_annot = brand_link.sort_values("order_count", ascending=False).head(8)
    for _, row in top_annot.iterrows():
        plt.annotate(
            row["brand"],
            (row["Number of Stores"], row["order_count"]),
            fontsize=9,
            xytext=(4, 4),
            textcoords="offset points"
        )

    plt.title("Brand Popularity vs Number of Stores")
    plt.xlabel("Number of Stores")
    plt.ylabel("Number of Consumer Orders")
    save_plot("05_brand_popularity_vs_stores.png")

price_link = merged.dropna(subset=["price", "Average Price"]).copy()

if not price_link.empty:
    price_compare = price_link.groupby("brand").agg(
        consumer_avg_price=("price", "mean"),
        official_avg_price=("Average Price", "first"),
        order_count=("brand", "size")
    ).reset_index()

    plt.figure()
    plt.scatter(price_compare["official_avg_price"], price_compare["consumer_avg_price"], alpha=0.8)

    min_val = min(price_compare["official_avg_price"].min(), price_compare["consumer_avg_price"].min())
    max_val = max(price_compare["official_avg_price"].max(), price_compare["consumer_avg_price"].max())
    plt.plot([min_val, max_val], [min_val, max_val], linestyle="--")

    top_annot2 = price_compare.sort_values("order_count", ascending=False).head(8)
    for _, row in top_annot2.iterrows():
        plt.annotate(
            row["brand"],
            (row["official_avg_price"], row["consumer_avg_price"]),
            fontsize=9,
            xytext=(4, 4),
            textcoords="offset points"
        )

    plt.title("Consumer Paid Price vs Official Brand Average Price")
    plt.xlabel("Official Brand Average Price")
    plt.ylabel("Average Consumer Transaction Price")
    save_plot("06_consumer_vs_official_price.png")

print(f"\nDone. Plots saved in: {output_dir}")