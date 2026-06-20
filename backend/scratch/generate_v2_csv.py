import csv
from pathlib import Path
import os

OLD_CSV = "data/eval_ground_truth.csv"
NEW_CSV = "data/eval_ground_truth_v2.csv"

def get_base_cases():
    cases = []
    if os.path.exists(OLD_CSV):
        with open(OLD_CSV, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                desc = row["description"]
                cat = "atomic_ingredient"
                tags = "synonym_risk"
                diff = "easy"
                followup = False
                
                # Rough heuristics to backfill old cases
                desc_lower = desc.lower()
                if "chicken breast" in desc_lower or "spinach" in desc_lower or "olive oil" in desc_lower or "banana" in desc_lower or "apple" in desc_lower or "almonds" in desc_lower or "milk" in desc_lower or "rice" in desc_lower and "bowl" not in desc_lower and "plate" not in desc_lower:
                    if "cooked" in desc_lower or "raw" in desc_lower or "boiled" in desc_lower:
                        cat = "raw_vs_cooked"
                        tags = "cooked_weight" if "cooked" in desc_lower or "boiled" in desc_lower else "raw_weight"
                    else:
                        cat = "atomic_ingredient"
                elif "dal tadka" in desc_lower or "biryani" in desc_lower or "dosa" in desc_lower or "paneer tikka" in desc_lower or "chapatis" in desc_lower:
                    cat = "indian_home_cooked"
                    tags = "indian|composite|serving_based"
                elif "whey" in desc_lower:
                    cat = "protein_shakes_and_supplements"
                    tags = "protein_shake|composite"
                elif "pizza" in desc_lower or "mcdonalds" in desc_lower or "burrito" in desc_lower or "caesar" in desc_lower:
                    cat = "restaurant_or_packaged"
                    tags = "restaurant|composite"
                elif "sandwich" in desc_lower or "pasta" in desc_lower or "some chicken" in desc_lower:
                    cat = "vague_user_input"
                    tags = "vague|followup_needed"
                    followup = True
                    diff = "hard"
                elif "pan fried" in desc_lower or "deep fried" in desc_lower or "scrambled" in desc_lower:
                    cat = "hidden_fat_or_cooking_medium"
                    tags = "hidden_fat"
                else:
                    cat = "composite_meal"
                    tags = "composite"

                cases.append({
                    "case_id": f"legacy_{i+1:03d}",
                    "description": desc,
                    "calories": row["calories"],
                    "protein": row["protein"],
                    "fat": row["fat"],
                    "carbohydrates": row["carbohydrates"],
                    "category": cat,
                    "tags": tags,
                    "difficulty": diff,
                    "should_require_followup": str(followup).lower(),
                    "expected_items": "",
                    "expected_dishes": "",
                    "expected_key_entities": "",
                    "notes": "Migrated from v1"
                })
    return cases

def get_new_cases():
    return [
        # 8 Indian serving-based
        {"case_id": "indian_001", "description": "1 bowl dal tadka and 2 chapatis", "calories": 360, "protein": 15, "fat": 7, "carbohydrates": 60, "category": "indian_home_cooked", "tags": "indian|serving_based|composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "2", "expected_dishes": "dal tadka|chapati", "expected_key_entities": "dal|chapati", "notes": ""},
        {"case_id": "indian_002", "description": "1 katori aloo sabzi", "calories": 150, "protein": 2, "fat": 8, "carbohydrates": 18, "category": "indian_home_cooked", "tags": "indian|serving_based", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "aloo sabzi", "expected_key_entities": "aloo sabzi", "notes": ""},
        {"case_id": "indian_003", "description": "1 plate poha", "calories": 250, "protein": 5, "fat": 8, "carbohydrates": 40, "category": "indian_home_cooked", "tags": "indian|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "poha", "expected_key_entities": "poha", "notes": ""},
        {"case_id": "indian_004", "description": "2 idlis and 1 katori sambar", "calories": 185, "protein": 8, "fat": 4, "carbohydrates": 30, "category": "indian_home_cooked", "tags": "indian|serving_based|composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "2", "expected_dishes": "idli|sambar", "expected_key_entities": "idli|sambar", "notes": ""},
        {"case_id": "indian_005", "description": "2 pav and 1 plate bhaji", "calories": 400, "protein": 10, "fat": 15, "carbohydrates": 55, "category": "indian_home_cooked", "tags": "indian|serving_based|composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "2", "expected_dishes": "pav|bhaji", "expected_key_entities": "pav|bhaji", "notes": ""},
        {"case_id": "indian_006", "description": "2 bhature and 1 katori chole", "calories": 550, "protein": 12, "fat": 25, "carbohydrates": 65, "category": "indian_home_cooked", "tags": "indian|serving_based|composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "2", "expected_dishes": "bhature|chole", "expected_key_entities": "bhature|chole", "notes": ""},
        {"case_id": "indian_007", "description": "1 plate rajma chawal", "calories": 350, "protein": 10, "fat": 5, "carbohydrates": 65, "category": "indian_home_cooked", "tags": "indian|serving_based|composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "2", "expected_dishes": "rajma|rice", "expected_key_entities": "rajma|rice", "notes": ""},
        {"case_id": "indian_008", "description": "1 bowl khichdi", "calories": 250, "protein": 8, "fat": 5, "carbohydrates": 42, "category": "indian_home_cooked", "tags": "indian|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "khichdi", "expected_key_entities": "khichdi", "notes": ""},
        
        # 6 Beverages
        {"case_id": "bev_001", "description": "1 tea cup garam chai", "calories": 34, "protein": 0.8, "fat": 1.1, "carbohydrates": 5.4, "category": "serving_based_beverages", "tags": "indian|beverage|serving_based|synonym_risk", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "hot tea (garam chai)", "expected_key_entities": "tea", "notes": ""},
        {"case_id": "bev_002", "description": "1 tall glass aam panna", "calories": 120, "protein": 0.5, "fat": 0, "carbohydrates": 30, "category": "serving_based_beverages", "tags": "indian|beverage|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "aam panna", "expected_key_entities": "aam panna", "notes": ""},
        {"case_id": "bev_003", "description": "1 glass sweet lassi", "calories": 200, "protein": 8, "fat": 8, "carbohydrates": 25, "category": "serving_based_beverages", "tags": "indian|beverage|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "sweet lassi", "expected_key_entities": "lassi", "notes": ""},
        {"case_id": "bev_004", "description": "1 glass nimbu pani", "calories": 60, "protein": 0.2, "fat": 0, "carbohydrates": 15, "category": "serving_based_beverages", "tags": "indian|beverage|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "nimbu pani", "expected_key_entities": "nimbu pani", "notes": ""},
        {"case_id": "bev_005", "description": "1 cup filter coffee", "calories": 80, "protein": 2, "fat": 2, "carbohydrates": 12, "category": "serving_based_beverages", "tags": "indian|beverage|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "filter coffee", "expected_key_entities": "filter coffee", "notes": ""},
        {"case_id": "bev_006", "description": "1 glass hot milk", "calories": 150, "protein": 8, "fat": 8, "carbohydrates": 12, "category": "serving_based_beverages", "tags": "beverage|serving_based", "difficulty": "easy", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "hot milk", "expected_key_entities": "milk", "notes": ""},

        # 6 Composite/Restaurant
        {"case_id": "comp_001", "description": "chicken rice bowl", "calories": 450, "protein": 35, "fat": 10, "carbohydrates": 55, "category": "composite_meal", "tags": "composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "chicken rice bowl", "expected_key_entities": "chicken|rice", "notes": ""},
        {"case_id": "comp_002", "description": "burrito bowl with guac", "calories": 600, "protein": 30, "fat": 20, "carbohydrates": 75, "category": "restaurant_or_packaged", "tags": "restaurant|composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "burrito bowl", "expected_key_entities": "burrito bowl|guacamole", "notes": ""},
        {"case_id": "comp_003", "description": "caesar salad with croutons", "calories": 400, "protein": 15, "fat": 30, "carbohydrates": 15, "category": "composite_meal", "tags": "composite", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "caesar salad", "expected_key_entities": "caesar salad|croutons", "notes": ""},
        {"case_id": "comp_004", "description": "1 masala dosa", "calories": 250, "protein": 5, "fat": 10, "carbohydrates": 35, "category": "indian_home_cooked", "tags": "indian|composite|serving_based", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "masala dosa", "expected_key_entities": "dosa", "notes": ""},
        {"case_id": "comp_005", "description": "chicken tikka masala 1 katori", "calories": 250, "protein": 20, "fat": 15, "carbohydrates": 10, "category": "indian_home_cooked", "tags": "indian|composite|serving_based", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "chicken tikka masala", "expected_key_entities": "chicken tikka masala", "notes": ""},
        {"case_id": "comp_006", "description": "1 plate gobi manchurian", "calories": 300, "protein": 5, "fat": 15, "carbohydrates": 35, "category": "restaurant_or_packaged", "tags": "indian|restaurant|composite|serving_based", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "gobi manchurian", "expected_key_entities": "gobi manchurian", "notes": ""},

        # 5 Hidden Fat
        {"case_id": "fat_001", "description": "2 eggs scrambled in 1 tbsp butter", "calories": 240, "protein": 12, "fat": 21, "carbohydrates": 1, "category": "hidden_fat_or_cooking_medium", "tags": "hidden_fat", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "scrambled eggs", "expected_key_entities": "egg|butter", "notes": ""},
        {"case_id": "fat_002", "description": "150g fish fried in 1 tbsp oil", "calories": 270, "protein": 25, "fat": 18, "carbohydrates": 0, "category": "hidden_fat_or_cooking_medium", "tags": "hidden_fat", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "fried fish", "expected_key_entities": "fish|oil", "notes": ""},
        {"case_id": "fat_003", "description": "1 plain paratha with 1 tsp ghee", "calories": 165, "protein": 3, "fat": 8, "carbohydrates": 20, "category": "hidden_fat_or_cooking_medium", "tags": "indian|hidden_fat|serving_based", "difficulty": "medium", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "paratha", "expected_key_entities": "paratha|ghee", "notes": ""},
        {"case_id": "fat_004", "description": "1 plate chicken biryani with 1 katori raita", "calories": 750, "protein": 35, "fat": 25, "carbohydrates": 95, "category": "hidden_fat_or_cooking_medium", "tags": "indian|composite|hidden_fat|serving_based", "difficulty": "medium", "should_require_followup": "false", "expected_items": "2", "expected_dishes": "chicken biryani|raita", "expected_key_entities": "biryani|raita", "notes": ""},
        {"case_id": "fat_005", "description": "2 pooris deep fried", "calories": 200, "protein": 4, "fat": 12, "carbohydrates": 20, "category": "hidden_fat_or_cooking_medium", "tags": "indian|hidden_fat|serving_based", "difficulty": "hard", "should_require_followup": "false", "expected_items": "1", "expected_dishes": "poori", "expected_key_entities": "poori", "notes": "Frying oil must be estimated"},

        # 5 Vague
        {"case_id": "vague_001", "description": "had some chicken and rice", "calories": 400, "protein": 30, "fat": 5, "carbohydrates": 55, "category": "vague_user_input", "tags": "vague|composite|followup_needed", "difficulty": "hard", "should_require_followup": "true", "expected_items": "1", "expected_dishes": "chicken and rice", "expected_key_entities": "chicken|rice", "notes": "Should ideally ask portion follow-up"},
        {"case_id": "vague_002", "description": "ate pasta", "calories": 380, "protein": 12, "fat": 2, "carbohydrates": 75, "category": "vague_user_input", "tags": "vague|followup_needed", "difficulty": "hard", "should_require_followup": "true", "expected_items": "1", "expected_dishes": "pasta", "expected_key_entities": "pasta", "notes": ""},
        {"case_id": "vague_003", "description": "tea and snacks", "calories": 300, "protein": 5, "fat": 12, "carbohydrates": 40, "category": "vague_user_input", "tags": "vague|followup_needed", "difficulty": "hard", "should_require_followup": "true", "expected_items": "2", "expected_dishes": "tea|snacks", "expected_key_entities": "tea", "notes": ""},
        {"case_id": "vague_004", "description": "just a small lunch", "calories": 350, "protein": 10, "fat": 10, "carbohydrates": 55, "category": "vague_user_input", "tags": "vague|followup_needed", "difficulty": "hard", "should_require_followup": "true", "expected_items": "1", "expected_dishes": "", "expected_key_entities": "", "notes": ""},
        {"case_id": "vague_005", "description": "a big dinner", "calories": 800, "protein": 30, "fat": 30, "carbohydrates": 100, "category": "vague_user_input", "tags": "vague|followup_needed", "difficulty": "hard", "should_require_followup": "true", "expected_items": "1", "expected_dishes": "", "expected_key_entities": "", "notes": ""},
    ]

def main():
    cases = get_base_cases() + get_new_cases()
    fields = [
        "case_id", "description", "calories", "protein", "fat", "carbohydrates",
        "category", "tags", "difficulty", "should_require_followup",
        "expected_items", "expected_dishes", "expected_key_entities", "notes"
    ]
    with open(NEW_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for c in cases:
            writer.writerow(c)
    print(f"Wrote {len(cases)} cases to {NEW_CSV}")

if __name__ == "__main__":
    main()
