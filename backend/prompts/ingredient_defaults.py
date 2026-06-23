"""
Static ingredient defaults for the LLM.
Returns a simple formatted string to be appended to the system prompt.
"""

def get_ingredient_defaults() -> str:
    return """
INGREDIENT DEFAULTS (Use these exact values as your baseline if the user describes one of these items, then scale to their stated quantity):

--- Indian Staples ---
• Plain Dosa: 133 kcal, 3.5g protein, 3.7g fat, 20g carbs (per 1 dosa)
• Masala Dosa: 230 kcal, 5.0g protein, 8.0g fat, 35g carbs (per 1 dosa)
• Idli: 58 kcal, 2.0g protein, 0.4g fat, 12g carbs (per 1 idli, 40g)
• Chapati/Roti: 70 kcal, 2.0g protein, 0.4g fat, 15g carbs (per 1 roti)
• Paratha: 180 kcal, 3.5g protein, 7.0g fat, 26g carbs (per 1 paratha, 60g)
• Dal (cooked): 110 kcal, 5.5g protein, 3.0g fat, 15g carbs (per 1 katori, 130g)
• Rajma/Chhole (cooked): 180 kcal, 9.0g protein, 5.0g fat, 25g carbs (per 1 katori, 130g)
• Sambar: 75 kcal, 3.0g protein, 2.0g fat, 12g carbs (per 1 katori, 150ml)
• Poha/Upma: 250 kcal, 5.0g protein, 8.0g fat, 40g carbs (per 1 plate, 200g)
• Biryani: 650 kcal, 30g protein, 20g fat, 85g carbs (per 1 plate, 350g)
• Chicken Curry: 250 kcal, 22g protein, 15g fat, 6g carbs (per 1 katori, 200g)
• Paneer: 265 kcal, 18g protein, 20g fat, 4g carbs (per 100g)
• Curd/Dahi: 100 kcal, 5.0g protein, 5.0g fat, 7g carbs (per 1 cup, 150g)
• Sabzi: 120 kcal, 3.0g protein, 7.0g fat, 12g carbs (per 1 katori, 150g)
• Poori/Puri (deep fried): 150 kcal, 2.0g protein, 8.0g fat, 18g carbs (per 1 poori, ~50g)

--- Beverages ---
• Chai / Garam Chai: 45 kcal, 1.5g protein, 1.5g fat, 7g carbs (per 1 small tea cup, ~100ml)
• Filter Coffee: 60 kcal, 1.5g protein, 1.5g fat, 10g carbs (per 1 small cup, ~100ml)
• Coffee with Milk: 18 kcal, 1.0g protein, 1.0g fat, 1.5g carbs (per 1 standard cup, black coffee + splash of milk)
• Nimbu Pani (Sweetened): 40 kcal, 0g protein, 0g fat, 11g carbs (per 1 glass)
• Milk: 150 kcal, 8.0g protein, 8.0g fat, 12g carbs (per 1 glass, 250ml)
• Lassi (Sweet): 180 kcal, 6.0g protein, 5.0g fat, 28g carbs (per 1 glass, 250ml)
• Buttermilk/Chaas: 50 kcal, 3.0g protein, 1.5g fat, 6g carbs (per 1 glass, 250ml)

--- Dairy, Fats & Oils ---
• Ghee: 45 kcal, 0g protein, 5.0g fat, 0g carbs (per 1 tsp, 5g)
• Butter: 100 kcal, 0.1g protein, 11g fat, 0g carbs (per 1 tbsp, 14g)
• Oil (Olive/Vegetable): 120 kcal, 0g protein, 14g fat, 0g carbs (per 1 tbsp, 15ml)
• Peanut Butter: 94 kcal, 4.0g protein, 8.0g fat, 3g carbs (per 1 tbsp, 16g)
• Almonds: 164 kcal, 6.0g protein, 14g fat, 6g carbs (per 1 handful / 28g / ~23 almonds)

--- Proteins ---
• Egg (Boiled/Raw): 70 kcal, 6.0g protein, 5.0g fat, 0.5g carbs (per 1 large egg)
• Whey Protein Shake: 120 kcal, 25g protein, 2.0g fat, 3g carbs (per 1 scoop with water)
• Chicken Breast (Raw): 120 kcal, 22g protein, 2.5g fat, 0g carbs (per 100g)
• Chicken Breast (Cooked): 165 kcal, 31g protein, 3.6g fat, 0g carbs (per 100g)

--- Packaged Snacks & Brands ---
• Maggi Noodles: 300 kcal, 7.0g protein, 12g fat, 40g carbs (per 1 standard packet, 70g)
• Oreo Cookie: 53 kcal, 0.5g protein, 2.3g fat, 8g carbs (per 1 cookie)
• Snickers Bar: 250 kcal, 4.0g protein, 12g fat, 33g carbs (per 1 standard bar, 50g)
• Haldirams Bhujia: 600 kcal, 14g protein, 42g fat, 40g carbs (per 100g)
• Diet Coke / Zero Sugar Soda: 0 kcal, 0g protein, 0g fat, 0g carbs (per 1 can)

--- Seafood ---
• Salmon (raw): 208 kcal, 20g protein, 13g fat, 0g carbs (per 100g)
• Salmon (cooked/baked): 231 kcal, 25g protein, 14g fat, 0g carbs (per 100g)

--- Grains & Vegetables ---
• White Rice (cooked): 130 kcal, 2.7g protein, 0.3g fat, 28g carbs (per 100g)
• White Rice (raw/dry): 365 kcal, 7.1g protein, 0.7g fat, 80g carbs (per 100g)
• Pasta (cooked): 160 kcal, 5.5g protein, 1.1g fat, 31g carbs (per 100g)
• Spinach (raw): 23 kcal, 2.9g protein, 0.4g fat, 3.6g carbs (per 100g)
• Broccoli (raw/steamed): 34 kcal, 2.8g protein, 0.4g fat, 7g carbs (per 100g)
• Sweet Potato (roasted): 90 kcal, 2g protein, 0g fat, 21g carbs (per 100g)
• Banana (medium): 89 kcal, 1.1g protein, 0.3g fat, 23g carbs (per 1 medium banana, ~120g)
• Apple (medium): 95 kcal, 0.5g protein, 0.3g fat, 25g carbs (per 1 medium apple, ~182g)
• Bread (white): 79 kcal, 2.7g protein, 1.0g fat, 15g carbs (per 1 slice, 30g)
• Peanut Butter Toast: 173 kcal, 6.7g protein, 9.0g fat, 18g carbs (per 1 slice bread + 1 tbsp peanut butter)

--- Global Foods ---
• Tacos (meat, e.g. al pastor): 150 kcal, 7.0g protein, 7.0g fat, 15g carbs (per 1 small street taco)
• Sushi (Nigiri, e.g. salmon): 50 kcal, 3.0g protein, 1.0g fat, 7.0g carbs (per 1 piece)
"""
