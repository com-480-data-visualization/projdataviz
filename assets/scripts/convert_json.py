from pathlib import Path
import json
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ASSETS_DIR = PROJECT_ROOT / "assets"

consumer_path = ASSETS_DIR / "China_DrinkMarket_Datasets" / "cleaned datasets" / "2.Consumer behavior.csv"
shops_path = ASSETS_DIR / "China_DrinkMarket_Datasets" / "cleaned datasets" / "1.Drink shops.xlsx"

output_dir = PROJECT_ROOT / "data"
output_dir.mkdir(parents=True, exist_ok=True)

consumer_json_path = output_dir / "consumer_behavior.json"
shops_json_path = output_dir / "drink_shops.json"


def read_csv_with_fallback(path: Path) -> pd.DataFrame:
    for enc in ["utf-8-sig", "utf-8", "gb18030", "gbk", "latin1", "cp1252"]:
        try:
            df = pd.read_csv(
                path,
                encoding=enc,
                dtype=str,
                keep_default_na=False,
                na_filter=False
            )
            print(f"Loaded CSV with encoding: {enc}")
            return df
        except Exception:
            continue
    raise ValueError(f"Could not read CSV file: {path}")


def read_excel_safe(path: Path) -> pd.DataFrame:
    df = pd.read_excel(
        path,
        dtype=str,
        keep_default_na=False
    )
    return df.fillna("")


def save_df_to_json(df: pd.DataFrame, path: Path):
    records = df.to_dict(orient="records")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


def main():
    consumer = read_csv_with_fallback(consumer_path)
    shops = read_excel_safe(shops_path)

    save_df_to_json(consumer, consumer_json_path)
    save_df_to_json(shops, shops_json_path)

    print("\nSaved:")
    print(consumer_json_path)
    print(shops_json_path)


if __name__ == "__main__":
    main()