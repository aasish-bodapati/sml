from models.nutrition_pipeline import RetrievalResult, ClarificationQuestion

def check(retrievals: list[RetrievalResult], raw_query: str = "") -> ClarificationQuestion | None:
    # Rule -1: Brand detection on the full raw query (gated by retrieval confidence)
    # Only includes restaurants/customizable chains, not packaged goods with standard serving sizes
    brands = ['mcdonald', 'kfc', 'domino', 'subway', 'burger king', 'zomato', 'swiggy', 'starbucks', 'taco bell']
    matched_brand = next((b for b in brands if b in raw_query), None)
    
    top_confidence_across_items = max((r.top_hit_confidence for r in retrievals), default=0.0)
    
    if matched_brand:
        return ClarificationQuestion(
            item_ref=matched_brand.title(),
            question=f"I don't have exact nutritional data for {matched_brand.title()} items. Could you tell me the size/weight or check the nutrition label?",
            options=None
        )

    # Phase 1: heuristic rules
    for r in retrievals:
        item_name = r.parsed_item.canonical_name.lower()
        surface_text = r.parsed_item.surface_text.lower()
        
        # Rule 0: quantity AND unit both missing -> almost always ambiguous
        NATURAL_PORTIONS = {
            'handful', 'glass', 'bowl', 'cup', 'plate', 'katori', 'piece',
            'slice', 'scoop', 'tbsp', 'tsp', 'tablespoon', 'teaspoon', 'toast',
            'serving', 'portion', 'packet', 'bar', 'can', 'some'
        }
        has_natural_portion = any(p in surface_text for p in NATURAL_PORTIONS)
        if r.parsed_item.quantity is None and r.parsed_item.unit is None and not has_natural_portion:
            return ClarificationQuestion(
                item_ref=r.parsed_item.surface_text,
                question=f"Could you clarify the portion size for the {item_name}?",
                options=None
            )
            
        KNOWN_ITEMS = {
            'dal', 'dal tadka', 'chapati', 'roti', 'paratha', 'biryani',
            'chicken curry', 'paneer', 'sabzi', 'chai', 'lassi', 'chaach',
            'buttermilk', 'ghee', 'butter', 'egg', 'rice', 'dosa', 'idli',
            'sambar', 'rajma', 'chole', 'poha', 'upma', 'coffee', 'milk',
            'almonds', 'banana', 'apple', 'bread', 'poori', 'puri',
            'whey protein', 'protein shake', 'water',
            'maggi', 'oreo', 'snickers', 'haldiram', 'bhujia', 'coke',
            'taco', 'sushi', 'nigiri'
        }
        is_known = any(k in item_name for k in KNOWN_ITEMS)

            
        # Rule 1: Highly ambiguous common items where unit/preparation matters massively
        ambiguous_keywords = ["oats", "protein shake", "biryani", "sandwich", "smoothie", "salad"]
        if any(k in item_name for k in ambiguous_keywords) and not r.parsed_item.unit:
            return ClarificationQuestion(
                item_ref=r.parsed_item.surface_text,
                question=f"Could you clarify the portion size or preparation for the {item_name}?",
                options=None
            )
            
        # Rule 0a: Name overlap check to catch false semantic neighbors
        if r.candidates:
            import re
            top_candidate_name = r.candidates[0].name.lower()
            item_tokens = set(re.sub(r'[^\w\s]', '', item_name).split())
            cand_tokens = set(re.sub(r'[^\w\s]', '', top_candidate_name).split())
            
            has_overlap = False
            for it in item_tokens:
                for ct in cand_tokens:
                    if (len(it) > 3 and it in ct) or (len(ct) > 3 and ct in it) or it == ct:
                        has_overlap = True
                        break
                if has_overlap:
                    break
                    
            if not has_overlap and r.top_hit_confidence < 0.75:
                # If zero lexical overlap and not a very high confidence semantic match, treat as a miss
                r.top_hit_confidence = 0.0

        # Rule 2: Low confidence and high variance between top 2 candidates
        if not is_known and r.top_hit_confidence < 0.55 and len(r.candidates) >= 2:
            c1, c2 = r.candidates[0], r.candidates[1]
            if abs(c1.macros.calories - c2.macros.calories) > 150:
                return ClarificationQuestion(
                    item_ref=r.parsed_item.surface_text,
                    question=f"I found a few different matches for {item_name} with very different calories. Can you be more specific?",
                    options=None
                )
                
        # Rule 3: top candidate similarity is very low (< 0.40) -> retrieval found nothing useful
        if not is_known and r.top_hit_confidence < 0.40:
            return ClarificationQuestion(
                item_ref=r.parsed_item.surface_text,
                question=f"I couldn't find a good match for {item_name}. Could you describe it differently or provide more details?",
                options=None
            )
            
    return None
