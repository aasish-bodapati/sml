from models.nutrition_pipeline import ParsedItem, EstimatedItem
from models.food import MacroSet
import re

# Base macro definitions for trusted items. 
# We define them per standard 'serving' unit or per 100g.
_TRUSTED_DB = {
    "raw chicken breast": {"calories": 120, "protein": 22, "carbohydrates": 0, "fat": 2.5, "base_unit": "100g", "weight_g": 100},
    "cooked chicken breast": {"calories": 165, "protein": 31, "carbohydrates": 0, "fat": 3.6, "base_unit": "100g", "weight_g": 100},
    "coffee with milk": {"calories": 18, "protein": 1, "carbohydrates": 1.5, "fat": 1, "base_unit": "cup", "weight_g": 240},
    "filter coffee": {"calories": 60, "protein": 1.5, "carbohydrates": 10, "fat": 1.5, "base_unit": "small cup", "weight_g": 100},
    "chai": {"calories": 45, "protein": 1.5, "carbohydrates": 7, "fat": 1.5, "base_unit": "small cup", "weight_g": 100},
    "garam chai": {"calories": 45, "protein": 1.5, "carbohydrates": 7, "fat": 1.5, "base_unit": "small cup", "weight_g": 100},
    "tea": {"calories": 45, "protein": 1.5, "carbohydrates": 7, "fat": 1.5, "base_unit": "small cup", "weight_g": 100},
    "dal tadka": {"calories": 110, "protein": 5.5, "carbohydrates": 15, "fat": 3, "base_unit": "katori", "weight_g": 130},
    "dal": {"calories": 110, "protein": 5.5, "carbohydrates": 15, "fat": 3, "base_unit": "katori", "weight_g": 130},
    "chapati": {"calories": 70, "protein": 2, "carbohydrates": 15, "fat": 0.4, "base_unit": "piece", "weight_g": 40},
    "roti": {"calories": 70, "protein": 2, "carbohydrates": 15, "fat": 0.4, "base_unit": "piece", "weight_g": 40},
    "poori": {"calories": 100, "protein": 2, "carbohydrates": 10, "fat": 6, "base_unit": "piece", "weight_g": 30},
    "puri": {"calories": 100, "protein": 2, "carbohydrates": 10, "fat": 6, "base_unit": "piece", "weight_g": 30},
    "banana": {"calories": 89, "protein": 1.1, "carbohydrates": 23, "fat": 0.3, "base_unit": "piece", "weight_g": 120},
    "apple": {"calories": 95, "protein": 0.5, "carbohydrates": 25, "fat": 0.3, "base_unit": "piece", "weight_g": 180},
    "almonds": {"calories": 164, "protein": 6, "carbohydrates": 6, "fat": 14, "base_unit": "handful", "weight_g": 28},
    "maggi": {"calories": 300, "protein": 7, "carbohydrates": 40, "fat": 12, "base_unit": "packet", "weight_g": 70},
    "snickers": {"calories": 250, "protein": 4, "carbohydrates": 33, "fat": 12, "base_unit": "bar", "weight_g": 50},
    "oreo": {"calories": 53, "protein": 0.5, "carbohydrates": 8, "fat": 2.3, "base_unit": "piece", "weight_g": 11},
    "mcdonalds cheeseburger": {"calories": 300, "protein": 15, "carbohydrates": 33, "fat": 12, "base_unit": "piece", "weight_g": 115},
    "cheeseburger from mcdonalds": {"calories": 300, "protein": 15, "carbohydrates": 33, "fat": 12, "base_unit": "piece", "weight_g": 115},
    "french fries": {"calories": 312, "protein": 3.4, "carbohydrates": 41, "fat": 15, "base_unit": "100g", "weight_g": 100},
    # Absorbed oil logic
    "vegetable oil": {"calories": 120, "protein": 0, "carbohydrates": 0, "fat": 14, "base_unit": "tbsp", "weight_g": 14},
    "oil": {"calories": 120, "protein": 0, "carbohydrates": 0, "fat": 14, "base_unit": "tbsp", "weight_g": 14},
    "butter": {"calories": 100, "protein": 0, "carbohydrates": 0, "fat": 11, "base_unit": "tbsp", "weight_g": 14},
    "ghee": {"calories": 120, "protein": 0, "carbohydrates": 0, "fat": 14, "base_unit": "tbsp", "weight_g": 14},
    # Curated overrides
    "pav": {"calories": 120, "protein": 3, "carbohydrates": 24, "fat": 1, "base_unit": "piece", "weight_g": 40},
    "bhaji": {"calories": 160, "protein": 4, "carbohydrates": 10, "fat": 11, "base_unit": "plate", "weight_g": 200},
    "pav bhaji": {"calories": 400, "protein": 10, "carbohydrates": 55, "fat": 15, "base_unit": "plate", "weight_g": 280},
    "gobi manchurian": {"calories": 300, "protein": 5, "carbohydrates": 35, "fat": 15, "base_unit": "plate", "weight_g": 250},
}

_UNIT_TO_MULTIPLIER = {
    "piece": 1.0,
    "pieces": 1.0,
    "slice": 1.0,
    "slices": 1.0,
    "bar": 1.0,
    "packet": 1.0,
    "cup": 2.4, # compared to 100g/ml
    "small cup": 1.0,
    "tea cup": 1.0,
    "glass": 2.5,
    "katori": 1.3,
    "bowl": 2.6,
    "handful": 0.3, # 30g
    "tbsp": 0.15,
    "tsp": 0.05,
    "plate": 2.5,
    "g": 0.01,
    "gram": 0.01,
    "grams": 0.01,
    "ml": 0.01,
    "regular size": 1.0,
}

def resolve_trusted_default(parsed_item: ParsedItem, raw_query: str = "") -> EstimatedItem | None:
    # Clean the name to check against our DB
    name_lower = parsed_item.canonical_name.lower().strip()
    
    # Handle prep modifiers that change the core type
    prep = (parsed_item.preparation or "").lower()
    surface = parsed_item.surface_text.lower()
    
    if "chicken breast" in name_lower or "chicken breast" in surface:
        if "raw" in name_lower or "raw" in prep or "raw" in surface:
            name_lower = "raw chicken breast"
        else:
            name_lower = "cooked chicken breast"
            
    if "coffee" in name_lower and "milk" in name_lower:
        name_lower = "coffee with milk"
    if "coffee" in surface and "milk" in surface:
        name_lower = "coffee with milk"
        
    if "chai" in name_lower or "tea" in name_lower:
        name_lower = "chai"
        
    if "cheeseburger" in name_lower and ("mcdonald" in name_lower or "mcdonald" in surface or "mcdonald" in raw_query.lower()):
        name_lower = "mcdonalds cheeseburger"

    # Exact or strongly contained match check
    matched_key = None
    for k in _TRUSTED_DB.keys():
        if name_lower == k:
            matched_key = k
            break
            
    if not matched_key:
        for k in _TRUSTED_DB.keys():
            if k in name_lower:
                matched_key = k
                break

    if not matched_key:
        return None
        
    default_data = _TRUSTED_DB[matched_key]
    
    qty = parsed_item.quantity if parsed_item.quantity is not None else 1.0
    unit = (parsed_item.unit or "").lower()
    
    multiplier = 1.0
    
    # Logic to scale based on unit provided
    if not unit or unit == "none" or unit == "":
        # Assume user meant 1 of the base unit
        multiplier = qty
    else:
        # User provided a unit. 
        # Calculate weight of requested vs weight of base unit.
        requested_mult = 1.0
        found_unit = False
        for u, m in _UNIT_TO_MULTIPLIER.items():
            if u in unit:
                requested_mult = m
                found_unit = True
                break
                
        if not found_unit:
            # If we don't know the unit, don't trust the default
            # Check for piece unit compatibility
            if default_data["base_unit"] == "piece":
                if any(u in unit for u in ["piece", "slice", "whole", "item", "count", "serving", "regular"]):
                    found_unit = True
                    requested_mult = 1.0
                    
        if not found_unit:
            return None
            
        # Convert base unit to its multiplier
        base_mult = 1.0
        for u, m in _UNIT_TO_MULTIPLIER.items():
            if u in default_data["base_unit"]:
                base_mult = m
                break
                
        # If both are 'g' or 'ml' derived, we can scale directly
        # Example: 100g = 1.0 mult. Requested: 200g -> qty=200, unit='g' -> requested_mult=0.01 -> total = 200 * 0.01 = 2.0.
        # Wait, if default base_unit is '100g', its base_mult = 1.0. 
        if "g" in unit or "ml" in unit:
            # qty is in grams. So multiplier = qty / default_data["weight_g"]
            multiplier = qty / default_data["weight_g"]
        else:
            # e.g., 1 bowl requested. base_unit = katori.
            # bowl_mult = 2.6, katori_mult = 1.3
            # scale = 2.6 / 1.3 = 2.0. So 1 bowl = 2 katoris.
            multiplier = qty * (requested_mult / base_mult)

    final_cals = default_data["calories"] * multiplier
    final_prot = default_data["protein"] * multiplier
    final_carb = default_data["carbohydrates"] * multiplier
    final_fat = default_data["fat"] * multiplier
    
    return EstimatedItem(
        name=matched_key.title(),
        selected_candidate_id="trusted_default",
        selected_candidate_source="Trusted Defaults",
        assumptions=[f"Matched against trusted default '{matched_key}' and scaled automatically."],
        macros=MacroSet(
            calories=int(round(final_cals)),
            protein=int(round(final_prot)),
            carbohydrates=int(round(final_carb)),
            fat=int(round(final_fat))
        ),
        confidence=1.0,
        is_food=True,
        meal_type=None
    )
