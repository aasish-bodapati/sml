import json

with open("data/eval_results.json", "r") as f:
    results = json.load(f)

vague_keywords = ["sandwich", "pasta", "burger", "salad", "pizza", "snack", "lunch", "some chicken"]
specific_keywords = ["raw", "cooked", "tbsp", "cup", "scoop", "fried", "stew", "100g", "150g", "200g", "300g", "ml", "bowl", "slice", "handful", "plate"]

def get_category(desc):
    desc_lower = desc.lower()
    # Check specific first to prioritize measurements
    for kw in specific_keywords:
        if kw in desc_lower:
            return "Specific/Detailed"
    for kw in vague_keywords:
        if kw in desc_lower:
            return "Vague/General"
    return "Moderate/Single Item"

categorized = {"Vague/General": [], "Moderate/Single Item": [], "Specific/Detailed": []}

for r in results:
    cat = get_category(r["description"])
    categorized[cat].append(r)

for cat, items in categorized.items():
    if not items: continue
    print(f"\n--- {cat} ({len(items)} items) ---")
    cal_mape = sum(i["errors"]["calories"] for i in items) / len(items)
    pro_mape = sum(i["errors"]["protein"] for i in items) / len(items)
    fat_mape = sum(i["errors"]["fat"] for i in items) / len(items)
    carbs_mape = sum(i["errors"]["carbohydrates"] for i in items) / len(items)
    
    within_20 = sum(1 for r in items if r["errors"]["calories"] <= 0.20)
    
    print(f"Calories Error: {cal_mape:.2%}")
    print(f"Protein Error: {pro_mape:.2%}")
    print(f"Fat Error: {fat_mape:.2%}")
    print(f"Carbs Error: {carbs_mape:.2%}")
    print(f"Calories within 20% error: {within_20}/{len(items)} ({within_20/len(items):.2%})")

