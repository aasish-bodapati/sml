import asyncio
from main import parse_macros, MacroRequest, llm_client, engine, BaseIngredient, ComplexDish
from sqlmodel import Session, select
import json

test_inputs = [
    "1 tablespoon olive oil",
    "1 plate chicken biryani",
    "a snack"
]

def debug_query(user_input):
    print(f"\n{'='*50}\nDEBUGGING: {user_input}\n{'='*50}")
    
    embed_res = llm_client.embeddings.create(
        model="text-embedding-3-small",
        input=user_input
    )
    query_embedding = embed_res.data[0].embedding

    with Session(engine) as session:
        base_items = session.exec(
            select(BaseIngredient)
            .order_by(BaseIngredient.embedding.cosine_distance(query_embedding))
            .limit(3)
        ).all()
        
        dish_items = session.exec(
            select(ComplexDish)
            .order_by(ComplexDish.embedding.cosine_distance(query_embedding))
            .limit(3)
        ).all()

    print("--- BASE INGREDIENTS RETRIEVED ---")
    for item in base_items:
        print(f"{item.name} | Cal: {item.calories} | Pro: {item.protein} | Carb: {item.carbohydrates} | Fat: {item.fat}")
        
    print("\n--- COMPLEX DISHES RETRIEVED ---")
    for item in dish_items:
        print(f"{item.name} | Cal: {item.calories} | Pro: {item.protein} | Carb: {item.carbohydrates} | Fat: {item.fat}")

    print("\n--- RUNNING PARSE ---")
    try:
        req = MacroRequest(user_input=user_input)
        res = parse_macros(req, user_id="test")
        print(res.model_dump_json(indent=2))
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    for t in test_inputs:
        debug_query(t)
