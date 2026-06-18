import asyncio
from main import parse_macros, MacroRequest, llm_client, engine, BaseIngredient, ComplexDish
from sqlmodel import Session, select
import json
from pydantic import BaseModel, Field

class NutritionResponseWithCOT(BaseModel):
    thinking: str = Field(description="Step by step reasoning about what the user input means, if it's a food, and how to use the provided database context to estimate macros.")
    is_food: bool
    name: str = Field(description="Cleaned up name of the food")
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    meal_type: str | None

test_inputs = [
    "1 tablespoon olive oil",
    "1 plate chicken biryani",
    "a snack"
]

def debug_query(user_input):
    print(f"\n{'='*50}\nDEBUGGING COT: {user_input}\n{'='*50}")
    
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

    context_str = "\n".join([f"- {i.name} (per 100g): Cal: {i.calories}, Pro: {i.protein}, Fat: {i.fat}, Carb: {i.carbohydrates}" for i in base_items + dish_items])
    
    system_prompt = f"""You are a strict nutrition tracker. Use the following verified database items (per 100g) as context to calculate the final meal macros.
Context:
{context_str}

First, write out your step by step thinking in the 'thinking' field. Consider portion sizes carefully."""

    response = llm_client.beta.chat.completions.parse(
        model= "gpt-4o-mini",
        response_format= NutritionResponseWithCOT,
        messages= [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_input}]
    )
    
    res = response.choices[0].message.parsed
    print(res.model_dump_json(indent=2))

if __name__ == "__main__":
    for t in test_inputs:
        debug_query(t)
