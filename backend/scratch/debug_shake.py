import sys
from models.food import MacroRequest
from routers.food import parse_macros
import json

request = MacroRequest(messages=[{"role": "user", "content": "2 scoop whey protein, 300ml whole milk, 1 medium banana, 1 tbsp peanut butter"}])
res = parse_macros(request, user_id="test_user")

print("Thinking:")
print(res.thinking)
print("\nItems:")
for item in res.items:
    print(f"- {item.name}: {item.calories} kcal, {item.protein}g protein, {item.fat}g fat, {item.carbohydrates}g carbs (is_food={item.is_food})")

total_cal = sum(item.calories for item in res.items if item.is_food)
print(f"\nSummed Calories: {total_cal}")
