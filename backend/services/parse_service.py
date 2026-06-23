from openai import OpenAI
from models.nutrition_pipeline import ParsedMeal
from models.food import ChatMessage

llm_client = OpenAI()

def parse(messages: list[ChatMessage]) -> ParsedMeal:
    system_prompt = (
        "You are a meal parsing assistant. Your ONLY job is to extract what the user ate into a structured list of items. "
        "DO NOT estimate calories or macros. "
        "DO NOT guess standard portions if they are not explicitly provided. "
        "Extract the surface text, canonical food name, quantity (as a number if possible), unit, and any modifiers or preparation methods. "
        "Group items into logical composite dishes if they are meant to be eaten together (e.g. 'chicken sandwich' is one item, don't separate bread and chicken). "
        "If an item is gibberish or not a food, you can still list it but it will be filtered later."
    )
    
    api_messages = [{"role": "system", "content": system_prompt}] + [msg.model_dump() for msg in messages]
    
    response = llm_client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        response_format=ParsedMeal,
        messages=api_messages
    )
    
    return response.choices[0].message.parsed
