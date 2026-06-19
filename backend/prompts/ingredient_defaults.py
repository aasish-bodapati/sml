"""
Ingredient default assumptions to ground the LLM when users are vague.
These defaults are injected into the nutrition parsing system prompt.
"""

INGREDIENT_DEFAULTS = """
INGREDIENT DEFAULTS — when an ingredient is not further specified by the user, use these portion-based calorie and macro assumptions:

DAIRY & MILK:
- "milk" (unspecified) → whole milk (1 cup/glass ≈ 250ml ≈ 150 kcal, 8g protein, 8g fat, 12g carbs)
- "protein shake with milk" → assume whole milk as the base
- "curd" / "dahi" → full-fat curd (1 cup ≈ 150g ≈ 100 kcal, 5g protein, 5g fat, 7g carbs)
- "yogurt" → plain, full-fat Greek yogurt (1 cup/170g ≈ 160 kcal, 17g protein, 8g fat, 6g carbs)
- "paneer" → homemade or standard full-fat paneer (100g ≈ 265 kcal, 18g protein, 20g fat, 4g carbs)
- "cheese" → cheddar or processed cheese (1 slice/30g ≈ 115 kcal, 7g protein, 9g fat, 1g carbs)
- "butter" → salted dairy butter (1 tbsp ≈ 14g ≈ 100 kcal, 11g fat; 1 tsp ≈ 5g ≈ 36 kcal, 4g fat)
- "ghee" → clarified butter (1 tsp ≈ 5g ≈ 45 kcal, 5g fat)
- "cream" → heavy whipping cream (1 tbsp ≈ 15ml ≈ 50 kcal, 5g fat)

OILS & FATS:
- "oil" (unspecified) → refined vegetable/sunflower oil (1 tbsp ≈ 15ml ≈ 120 kcal, 14g fat; 1 tsp ≈ 5ml ≈ 40 kcal, 4.5g fat)
- "olive oil" → extra-virgin olive oil (1 tbsp ≈ 15ml ≈ 120 kcal, 14g fat; 1 tsp ≈ 5ml ≈ 40 kcal, 4.5g fat)
- "coconut oil" → virgin coconut oil (1 tbsp ≈ 15ml ≈ 120 kcal, 14g fat)

BREAD & GRAINS:
- "bread" (unspecified) → white sandwich bread (1 slice ≈ 30g ≈ 80 kcal, 2.5g protein, 1g fat, 15g carbs)
- "brown bread" → whole wheat sandwich bread (1 slice ≈ 30g ≈ 75 kcal, 3g protein, 1g fat, 13g carbs)
- "peanut butter toast" (unspecified) → 1 slice of white bread with 1 tbsp peanut butter (~174 kcal, 8g protein, 9g fat, 17g carbs)
- "rice" (unspecified) → cooked white basmati rice (1 cup ≈ 200g ≈ 260 kcal, 5g protein, 0g fat, 56g carbs; 1 bowl ≈ 260g ≈ 340 kcal, 7g protein, 1g fat, 75g carbs; 100g cooked ≈ 130 kcal, 2.7g protein, 0.3g fat, 28g carbs)
- "brown rice" → cooked long-grain brown rice (1 cup ≈ 200g ≈ 220 kcal, 5g protein, 1.5g fat, 48g carbs; 1 bowl ≈ 260g ≈ 290 kcal, 6g protein, 2g fat, 62g carbs; 100g cooked ≈ 112 kcal, 2.3g protein, 0.8g fat, 24g carbs)
- "pasta" (unspecified) → cooked white pasta (1 cup ≈ 140g ≈ 220 kcal, 8g protein, 1g fat, 43g carbs; 1 bowl ≈ 260g ≈ 380 kcal, 12g protein, 2g fat, 75g carbs; 1 big bowl ≈ 340g ≈ 500 kcal, 15g protein, 10g fat, 85g carbs; 100g cooked ≈ 158 kcal, 5.8g protein, 0.9g fat, 31g carbs)
- "oats" → dry rolled oats (40g standard serving ≈ 150 kcal, 5g protein, 3g fat, 27g carbs)
- "oatmeal with milk" / "bowl of oatmeal with milk" → 1 bowl ≈ 40g dry oats cooked in 240ml whole milk (~300 kcal, 13g protein, 11g fat, 39g carbs)
- "oatmeal" (unspecified, plain cooked) → 1 bowl cooked in water ≈ 40g dry oats (~150 kcal, 5g protein, 3g fat, 27g carbs)
- "poha" → cooked (1 plate/200g ≈ 250 kcal, 5g protein, 8g fat, 40g carbs)

PROTEIN SHAKES & SUPPLEMENTS:
- "protein shake" / "whey shake" (unspecified brand) → 1 scoop of generic whey protein concentrate (~120 kcal, 25g protein, 2g fat, 3g carbs per 30g scoop)
- "protein shake with milk" → 1 scoop whey + 1 glass whole milk (250ml) ≈ 270 kcal, 33g protein, 10g fat, 15g carbs
- "protein shake with water" → 1 scoop whey + water ≈ 120 kcal, 25g protein, 2g fat, 3g carbs
- "mass gainer shake" → assume 1 scoop (~75g) of generic mass gainer (~300 kcal, 50g carbs, 25g protein)
- "creatine" → creatine monohydrate, essentially 0 kcal

EGGS:
- "eggs" (unspecified cooking) → hard-boiled or scrambled with minimal oil (~70–90 kcal per egg; 1 egg ≈ 55g ≈ 80 kcal, 6.3g protein, 5.3g fat, 0.6g carbs)
- "omelette" (unspecified) → 2-egg omelette with 1 tsp oil/butter + vegetables ≈ 210 kcal, 13g protein, 16g fat, 2g carbs

MEAT & POULTRY:
- "raw chicken breast" / "chicken breast (raw)" → 100g ≈ 120 kcal, 22.5g protein, 2.6g fat, 0g carbs; 150g ≈ 180 kcal, 34g protein, 4g fat
- "cooked chicken breast" / "chicken breast (cooked)" / "chicken breast" (unspecified cooking) → 100g ≈ 165 kcal, 31g protein, 3.6g fat, 0g carbs; 150g ≈ 250 kcal, 47g protein, 5g fat
- "chicken curry" → assume bone-in chicken in a standard Indian gravy with oil; 1 katori ≈ 200g ≈ 250 kcal, 22g protein, 15g fat, 6g carbs
- "fish" (unspecified, Indian context) → rohu or catla (freshwater fish, 100g ≈ 97 kcal, 17g protein, 2g fat, 0g carbs)
- "salmon" (raw) → standard raw salmon (100g ≈ 208 kcal, 20g protein, 13g fat, 0g carbs; 200g ≈ 416 kcal, 40g protein, 26g fat)
- "mutton" → bone-in mutton/goat curry; 1 katori ≈ 170g ≈ 300 kcal, 20g protein, 22g fat, 5g carbs
- "tuna" → canned tuna in water (1 can/150g drained ≈ 170 kcal, 39g protein, 1g fat)

BEEF, PORK & OTHER MEATS:
- "beef chuck" (raw) → standard raw beef chuck (100g ≈ 250 kcal, 20g protein, 19g fat, 0g carbs; 300g ≈ 750 kcal, 60g protein, 57g fat)
- "beef broth" / "beef stock" → 1 cup/240ml ≈ 15 kcal, 2g protein, 1g carbs
- "pork loin" (raw) → 100g ≈ 143 kcal, 21g protein, 6g fat

INDIAN STAPLES:
- "dal" (unspecified) → cooked toor/arhar dal, standard tadka (1 katori ≈ 150ml ≈ 110 kcal, 5.5g protein, 3g fat, 15g carbs; 1 bowl ≈ 300ml ≈ 220 kcal, 11g protein, 6g fat, 30g carbs)
- "rajma" / "chhole" → cooked with standard Indian masala (1 katori ≈ 150ml ≈ 180 kcal, 9g protein, 5g fat, 25g carbs)
- "sabzi" / "curry" (generic vegetable) → mixed vegetable sabzi, moderate oil (1 katori ≈ 150ml ≈ 120 kcal, 3g protein, 7g fat, 12g carbs)
- "biryani" → chicken biryani (1 plate ≈ 350g ≈ 650 kcal, 30g protein, 20g fat, 85g carbs)
- "sambar" → standard South Indian sambar (1 katori ≈ 150ml ≈ 75 kcal, 3g protein, 2g fat, 12g carbs)
- "chutney" → coconut or tomato chutney (1 tbsp ≈ 30 kcal, 2g fat, 2g carbs)
- "dosa" / "plain dosa" (unspecified) → 1 standard plain dosa (~133 kcal, 3.5g protein, 3.7g fat, 20g carbs, cooked with minimal oil/ghee)
- "chapati" / "roti" (unspecified, plain) → 1 standard plain chapati/roti (~70 kcal, 2g protein, 0.4g fat, 15g carbs, cooked without oil or ghee)

COMPOSITE MEALS & PLATES:
- "sandwich" / "sandwich for lunch" (unspecified, generic) → 1 standard sandwich with bread, deli meat/cheese, and spread (~350 kcal, 15g protein, 12g fat, 45g carbs)
- "chicken and rice" / "chicken rice" (unspecified portion) → 1 standard plate/bowl consisting of 100g cooked chicken breast and 180g cooked white rice (~400 kcal, 37g protein, 4g fat, 51g carbs)
- "burrito bowl" (unspecified portion) → 1 standard bowl (Chipotle style) consisting of 1 scoop rice (~120g, ~150 kcal, 3g protein, 33g carbs), 1 scoop beans (~90g, ~110 kcal, 7g protein, 20g carbs), 1 serving protein (~100g cooked, ~150 kcal, 25g protein, 5g fat), and 1 serving salsa/veggies (~50 kcal). Total ≈ 460 kcal, 35g protein, 6g fat, 60g carbs (without cheese/guac/sour cream).
- "guacamole" / "guac" → standard guacamole (1 scoop/80g ≈ 130 kcal, 2g protein, 12g fat, 6g carbs; 1 tbsp/15g ≈ 25 kcal, 2g fat, 1g carbs)
- "pizza" / "pepperoni pizza" (unspecified, large) → 1 standard large slice ≈ 100g ≈ 300 kcal (12g protein, 13g fat, 34g carbs)
- "chicken Caesar salad" / "Caesar salad" (unspecified portion) → 1 standard restaurant serving (~350 kcal, 15g protein, 25g fat, 12g carbs); if "with extra dressing and croutons" → (~600 kcal, 30g protein, 45g fat, 20g carbs)
- "french fries" / "chips" (fried) → cooked french fries (100g ≈ 312 kcal, 3.4g protein, 15g fat, 41g carbs; 200g ≈ 624 kcal, 7g protein, 30g fat, 82g carbs; do NOT add extra oil for frying as the frying oil absorption is already included in this database value)

NUTS & SEEDS:
- "almonds" → raw, unsalted (1 handful ≈ 30g ≈ 170 kcal, 6g protein, 15g fat, 6g carbs)
- "peanuts" → dry-roasted, unsalted (1 handful/30g ≈ 170 kcal, 7.5g protein, 15g fat, 6g carbs)
- "peanut butter" → natural or standard commercial (1 tbsp ≈ 16g ≈ 94 kcal, 4g protein, 8g fat, 3g carbs)
- "cashews" → raw/roasted unsalted (1 handful/30g ≈ 165 kcal, 5g protein, 13g fat, 9g carbs)
- "chia seeds" → dry (1 tbsp ≈ 10g ≈ 50 kcal, 2g protein, 3g fat, 4g carbs)

FRUITS:
- "banana" → medium-sized (118g with peel, ~89 kcal edible portion, 1g protein, 23g carbs)
- "apple" → medium-sized (~182g, ~95 kcal, 25g carbs)
- "mango" → 1 cup chopped (~165g, ~99 kcal, 25g carbs)
- "sweet potato" (raw/roasted) → 100g ≈ 86 kcal, 2g protein, 20g carbs

BEVERAGES:
- "coffee" (unspecified black) → black coffee (~0 kcal)
- "coffee with milk" (unspecified) → black coffee with a splash of whole milk (~30ml whole milk ≈ 18 kcal, 1g protein, 1g fat, 1.5g carbs) unless specified as latte or cappuccino
- "tea" / "chai" → standard Indian chai with whole milk & sugar, 1 cup ≈ 80–100 kcal
- "green tea" → unsweetened (~0 kcal per cup)
- "juice" (unspecified) → assume store-bought commercial fruit juice (100ml ≈ 45 kcal, 10g carbs)
- "water" → 0 kcal
"""


def get_ingredient_defaults() -> str:
    return INGREDIENT_DEFAULTS
