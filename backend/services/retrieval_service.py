from sqlmodel import Session, select
from sqlalchemy import text
from db import engine
from openai import OpenAI
from models.nutrition_pipeline import ParsedItem, Candidate, RetrievalResult
from models.food import SavedRecipe, MacroSet

llm_client = OpenAI()

ADDITIVE_KEYWORDS = ["butter", "ghee", "oil", "cream", "cheese", "dressing", "mayo"]

_embedding_cache: dict[str, list[float]] = {}

def _embed_text(text_str: str) -> list[float]:
    if text_str not in _embedding_cache:
        response = llm_client.embeddings.create(
            model="text-embedding-3-small",
            input=text_str
        )
        _embedding_cache[text_str] = response.data[0].embedding
    return _embedding_cache[text_str]

def retrieve_all(items: list[ParsedItem], user_id: str) -> list[RetrievalResult]:
    results = []
    with Session(engine) as session:
        for item in items:
            results.append(retrieve_single(item, user_id, session))
    return results

def retrieve_single(item: ParsedItem, user_id: str, session: Session) -> RetrievalResult:
    candidates = []
    
    # 1. Check SavedRecipe
    stmt = select(SavedRecipe).where(
        SavedRecipe.user_id == user_id,
        SavedRecipe.name.ilike(f"%{item.canonical_name}%")
    ).limit(1)
    saved = session.exec(stmt).first()
    
    if saved:
        candidates.append(
            Candidate(
                food_id=saved.id,
                source="SavedRecipe",
                name=saved.name,
                serving_basis="1 serving",
                macros=MacroSet(
                    calories=saved.calories,
                    protein=saved.protein,
                    carbohydrates=saved.carbohydrates,
                    fat=saved.fat
                ),
                similarity=1.15
            )
        )
        
    embedding = _embed_text(item.canonical_name)
    embedding_str = str(embedding)
    
    # 2. INDB ComplexDish
    dish_query = text("""
        SELECT id, name, calories, protein, carbohydrates, fat, serving_unit,
               1 - (embedding <=> :embedding) as similarity
        FROM complexdish
        ORDER BY embedding <=> :embedding
        LIMIT 2
    """)
    dish_rows = session.execute(dish_query, {"embedding": embedding_str}).mappings().all()
    
    for row in dish_rows:
        candidates.append(
            Candidate(
                food_id=row["id"],
                source="INDB",
                name=row["name"],
                serving_basis=row["serving_unit"] or "1 serving",
                macros=MacroSet(
                    calories=int(row["calories"]),
                    protein=int(row["protein"]),
                    carbohydrates=int(row["carbohydrates"]),
                    fat=int(row["fat"])
                ),
                similarity=float(row["similarity"])
            )
        )
        
    # 3. USDA BaseIngredient
    ingredient_query = text("""
        SELECT id, name, calories, protein, carbohydrates, fat,
               1 - (embedding <=> :embedding) as similarity
        FROM baseingredient
        ORDER BY embedding <=> :embedding
        LIMIT 2
    """)
    ing_rows = session.execute(ingredient_query, {"embedding": embedding_str}).mappings().all()
    
    for row in ing_rows:
        candidates.append(
            Candidate(
                food_id=row["id"],
                source="USDA",
                name=row["name"],
                serving_basis="100g",
                macros=MacroSet(
                    calories=int(row["calories"]),
                    protein=int(row["protein"]),
                    carbohydrates=int(row["carbohydrates"]),
                    fat=int(row["fat"])
                ),
                similarity=float(row["similarity"])
            )
        )
        
    import re
    item_tokens = set(re.sub(r'[^\w\s]', '', item.canonical_name.lower()).split())
    for c in candidates:
        if c.source != "SavedRecipe":
            cand_tokens = set(re.sub(r'[^\w\s]', '', c.name.lower()).split())
            if item_tokens and cand_tokens:
                overlap = len(item_tokens.intersection(cand_tokens))
                union = len(item_tokens.union(cand_tokens))
                jaccard = overlap / union
                c.similarity += (0.10 * jaccard)
                
        if item.avoid_pre_fatted_candidates:
            AVOID_TERMS = ["fried", "orly", "pakora", "breaded", "battered", "crispy", "tikka masala", "butter masala"]
            PREFER_TERMS = ["raw", "plain", "grilled", "boiled", "steamed", "baked"]
            c_name_lower = c.name.lower()
            if any(t in c_name_lower for t in AVOID_TERMS):
                c.similarity -= 0.30
            if any(t in c_name_lower for t in PREFER_TERMS):
                c.similarity += 0.15
                
    candidates.sort(key=lambda c: c.similarity, reverse=True)
    top_candidates = candidates[:3]
    top_confidence = top_candidates[0].similarity if top_candidates else 0.0
    
    additive_candidates = []
    if item.modifiers:
        for mod in item.modifiers:
            mod_lower = mod.lower()
            for kw in ADDITIVE_KEYWORDS:
                if kw in mod_lower:
                    add_emb = _embed_text(kw)
                    add_query = text("""
                        SELECT id, name, calories, protein, carbohydrates, fat,
                               1 - (embedding <=> :embedding) as similarity
                        FROM baseingredient
                        ORDER BY embedding <=> :embedding
                        LIMIT 1
                    """)
                    add_row = session.execute(add_query, {"embedding": str(add_emb)}).mappings().first()
                    if add_row:
                        additive_candidates.append(
                            Candidate(
                                food_id=add_row["id"],
                                source=f"Additive({kw})",
                                name=add_row["name"],
                                serving_basis="100g",
                                macros=MacroSet(
                                    calories=int(add_row["calories"]),
                                    protein=int(add_row["protein"]),
                                    carbohydrates=int(add_row["carbohydrates"]),
                                    fat=int(add_row["fat"])
                                ),
                                similarity=float(add_row["similarity"])
                            )
                        )
                        break # Only one additive match per modifier word to avoid duplicates
    
    return RetrievalResult(
        parsed_item=item,
        candidates=top_candidates,
        top_hit_confidence=top_confidence,
        additive_candidates=additive_candidates
    )
