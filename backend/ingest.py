import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

# Relative path to your extracted USDA directory
USDA_DIR = "data/usda/FoodData_Central_foundation_food_csv_2026-04-30"

def parse_usda() -> pd.DataFrame:
    print("Parsing USDA datasets...")
    
    # 1. Load the food list and the nutrient measurements
    df_food = pd.read_csv(os.path.join(USDA_DIR, "food.csv"))
    df_nutrient_links = pd.read_csv(os.path.join(USDA_DIR, "food_nutrient.csv"), low_memory=False)
    
    # 2. Filter to only 'foundation_food' (clean, raw ingredient items)
    df_foundation = df_food[df_food["data_type"] == "foundation_food"]
    
    # 3. Filter nutrient values to only Energy (1008), Protein (1003), Fat (1004), Carbs (1005)
    # The USDA database values are per 100 grams.
    nutrient_map = {
        1008: "calories",
        1003: "protein",
        1004: "fat",
        1005: "carbs"
    }
    df_nut_filtered = df_nutrient_links[
        df_nutrient_links["fdc_id"].isin(df_foundation["fdc_id"]) & 
        df_nutrient_links["nutrient_id"].isin(nutrient_map.keys())
    ]
    
    # 4. Pivot nutrient rows into columns
    df_pivoted = df_nut_filtered.pivot(
        index="fdc_id", 
        columns="nutrient_id", 
        values="amount"
    ).reset_index()
    
    # Rename columns to our friendly macro names
    df_pivoted = df_pivoted.rename(columns=nutrient_map)
    
    # 5. Merge the food description back with its pivoted nutrients
    df_merged = pd.merge(
        df_foundation[["fdc_id", "description"]], 
        df_pivoted, 
        on="fdc_id", 
        how="inner"
    )
    
    # 6. Fill any missing macro values with 0.0
    for col in ["calories", "protein", "fat", "carbs"]:
        df_merged[col] = df_merged[col].fillna(0.0)
        
    return df_merged

def ingest_data():
    df = parse_usda()
    print(f"Total foundation foods: {len(df)}")
    
    from openai import OpenAI
    client = OpenAI()
    
    from sqlmodel import Session, select
    from main import engine, UsdaFood
    
    batch_size = 100
    with Session(engine) as session:
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            descriptions = batch["description"].tolist()
            
            print(f"Embedding batch {i} to {i+len(batch)}...")
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=descriptions
            )
            embeddings = [data.embedding for data in response.data]
            
            for j, row in enumerate(batch.itertuples()):
                existing = session.exec(select(UsdaFood).where(UsdaFood.fdc_id == row.fdc_id)).first()
                if not existing:
                    food = UsdaFood(
                        fdc_id=row.fdc_id,
                        description=row.description,
                        calories=row.calories,
                        protein=row.protein,
                        fat=row.fat,
                        carbs=row.carbs,
                        embedding=embeddings[j]
                    )
                    session.add(food)
            session.commit()
            print("Batch committed.")
    print("Ingestion complete.")

if __name__ == "__main__":
    ingest_data()
