import pandas as pd
from sqlmodel import Session, select, text
from main import engine, UsdaFood, BaseIngredient
from openai import OpenAI
import os
from pydantic import BaseModel

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class AcceptedItems(BaseModel):
    accepted_names: list[str]

def filter_items(items: list[str], system_prompt: str) -> list[str]:
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        response_format=AcceptedItems,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "\n".join(items)}
        ]
    )
    return response.choices[0].message.parsed.accepted_names

def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return [item.embedding for item in response.data]

def curate_usda():
    with Session(engine) as session:
        usda_foods = session.exec(select(UsdaFood)).all()
        names = [f.description for f in usda_foods]
        
        accepted = []
        prompt = """You are curating a database of fundamental ingredients.
Return ONLY names that represent fundamental, single-ingredient whole foods (spices, grains, meats, vegetables, fruits, dairy, oils).
REJECT complex dishes, mixed meals, highly processed or branded commercial foods."""

        for i in range(0, len(names), 100):
            chunk = names[i:i+100]
            acc = filter_items(chunk, prompt)
            accepted.extend(acc)
            print(f"USDA batch {i}: Accepted {len(acc)} / {len(chunk)}")
            
        print(f"Total USDA accepted: {len(accepted)}")
        
        accepted_set = set(accepted)
        for food in usda_foods:
            if food.description in accepted_set:
                bi = BaseIngredient(
                    name=food.description,
                    source="USDA",
                    calories=food.calories,
                    protein=food.protein,
                    carbohydrates=food.carbs,
                    fat=food.fat,
                    embedding=food.embedding
                )
                session.add(bi)
        session.commit()

def curate_indb():
    df = pd.read_excel("data/indb/Anuvaad_INDB_2024.11 (1).xlsx")
    names = df['food_name'].astype(str).tolist()
    
    accepted = []
    prompt = """You are curating a database of complex regional dishes and prepared meals.
Return ONLY names that represent complex dishes, cooked meals, or multi-ingredient preparations (e.g., curries, dal, biryani, dosa, porridge, infused water).
REJECT raw, single ingredients (e.g., plain salt, raw rice, raw vegetables, single spices)."""

    for i in range(0, len(names), 100):
        chunk = names[i:i+100]
        acc = filter_items(chunk, prompt)
        accepted.extend(acc)
        print(f"INDB batch {i}: Accepted {len(acc)} / {len(chunk)}")
        
    print(f"Total INDB accepted: {len(accepted)}")
    
    accepted_df = df[df['food_name'].isin(accepted)]
    
    with Session(engine) as session:
        for i in range(0, len(accepted_df), 100):
            batch = accepted_df.iloc[i:i+100]
            batch_names = batch['food_name'].tolist()
            embeddings = embed_texts(batch_names)
            
            for j, (_, row) in enumerate(batch.iterrows()):
                cd = ComplexDish(
                    name=row['food_name'],
                    source="INDB",
                    calories=float(row['energy_kcal']) if pd.notna(row['energy_kcal']) else 0.0,
                    protein=float(row['protein_g']) if pd.notna(row['protein_g']) else 0.0,
                    carbohydrates=float(row['carb_g']) if pd.notna(row['carb_g']) else 0.0,
                    fat=float(row['fat_g']) if pd.notna(row['fat_g']) else 0.0,
                    embedding=embeddings[j]
                )
                session.add(cd)
            session.commit()

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    from main import ComplexDish
    with Session(engine) as session:
        session.exec(text("TRUNCATE TABLE baseingredient RESTART IDENTITY"))
        session.exec(text("TRUNCATE TABLE complexdish RESTART IDENTITY"))
        session.commit()
        
    print("Curating USDA...")
    curate_usda()
    print("Curating INDB...")
    curate_indb()
    print("Done!")
