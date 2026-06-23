from openai import OpenAI
from models.nutrition_pipeline import RetrievalResult, EstimatedItem
from prompts.ingredient_defaults import get_ingredient_defaults
from services.trusted_defaults import resolve_trusted_default

llm_client = OpenAI()

def estimate_all(retrievals: list[RetrievalResult], raw_query: str = "") -> list[EstimatedItem]:
    return [estimate_single(r, raw_query) for r in retrievals]

def estimate_single(retrieval: RetrievalResult, raw_query: str = "") -> EstimatedItem:
    trusted = resolve_trusted_default(retrieval.parsed_item, raw_query)
    if trusted:
        return trusted
        
    system_prompt = (
        "You are an expert nutrition estimator. "
        "Your task is to take a parsed food item and a list of retrieved database candidates, and estimate the final macros. "
        "1. Pick the best matching candidate from the list. If none are good, you may estimate from your own knowledge. "
        "2. Scale the serving size to match the user's requested quantity. "
        "3. Output the estimated macros, your assumptions, and a confidence score (0.0 to 1.0). "
        "4. Determine if the item is an actual food (is_food=True) or gibberish (is_food=False). "
        "5. Infer the meal type if possible, or leave null.\n\n"
        "PORTION SIZE STANDARDS:\n"
        "- 1 tsp = 5ml (oil/ghee ~4g, dry spice ~3g)\n"
        "- 1 tbsp = 15ml (oil/ghee ~13g, peanut butter ~16g, sugar ~12g)\n"
        "- 1 cup = 240ml (cooked rice ~200g, cooked dal ~220g, milk ~240g, flour ~120g)\n"
        "- 1 bowl = 300ml / ~260g for solid foods (rice, dal, sabzi, pasta)\n"
        "- 1 katori = 150ml / ~130g (standard small Indian bowl)\n"
        "- 1 plate of rice = 250g cooked rice\n"
        "- 1 plate (full meal) = treat as a standard thali: ~250g rice or 3 rotis + 1 katori dal + 1 katori sabzi\n"
        "- 1 roti / chapati = 40g (medium, no oil); paratha = 60g\n"
        "- 1 idli = 40g; 1 dosa (plain) = 70g\n"
        "- 1 egg = 55g\n"
        "- 1 slice bread = 30g\n"
        "- 1 handful (dry nuts/seeds) = 30g; (chips/puffs) = 20g\n"
        "- 1 glass = 250ml\n"
        "- 'small' portion = reduce by 25%; 'large' or 'heaped' = increase by 30%; 'half' = reduce by 50%.\n\n"
        "SANITY CAP: Do not estimate any standard 'katori' or 'bowl' of Indian dal, sabzi, or curry to be more than 400-450 calories unless it is explicitly deep-fried or heavily buttered restaurant style. If retrieved candidates suggest > 450 kcal per katori, IGNORE them and fall back to the static Ingredient Defaults below, scaled appropriately.\n\n"
    )
    
    system_prompt += get_ingredient_defaults()
    
    user_content = (
        f"Parsed Item: {retrieval.parsed_item.model_dump_json()}\n"
        f"Top Candidates: {[c.model_dump() for c in retrieval.candidates]}\n"
    )
    
    if getattr(retrieval, "additive_candidates", []):
        user_content += f"Additive Candidates (for hidden fats/modifiers): {[c.model_dump() for c in retrieval.additive_candidates]}\n"
        system_prompt += "\nWARNING: The parsed item has modifiers that include additives (butter/oil/cheese/etc). You MUST explicitly add the macros for these additives to the final total using the provided Additive Candidates.\n"
    
    response = llm_client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        response_format=EstimatedItem,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ]
    )
    
    return response.choices[0].message.parsed
