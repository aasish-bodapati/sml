"""
Ingredient default assumptions to ground the LLM when users are vague.
These defaults are injected into the nutrition parsing system prompt.
"""

INGREDIENT_DEFAULTS = """
INGREDIENT DEFAULTS — when an ingredient is not further specified by the user, use the following standard assumptions:

DAIRY & MILK:
- "milk" (unspecified) → whole milk (full fat, 3.5% fat, ~61 kcal/100ml)
- "protein shake with milk" → assume whole milk as the base
- "curd" / "dahi" → full-fat curd (~98 kcal/100g, 4g fat, 11g protein per cup)
- "yogurt" → plain, full-fat Greek yogurt unless 'low fat' or 'Greek' is stated
- "paneer" → homemade or standard full-fat paneer (~265 kcal/100g)
- "cheese" → cheddar or processed cheese (~400 kcal/100g)
- "butter" → salted dairy butter (~717 kcal/100g, 81g fat)
- "ghee" → clarified butter (~900 kcal/100g, 100g fat)
- "cream" → heavy whipping cream (~340 kcal/100g)

OILS & FATS:
- "oil" (unspecified, Indian context) → refined sunflower or vegetable oil (~884 kcal/100ml)
- "olive oil" → extra-virgin olive oil (~884 kcal/100ml)
- "coconut oil" → virgin coconut oil (~862 kcal/100ml)

BREAD & GRAINS:
- "bread" (unspecified) → white sandwich bread (~265 kcal/100g, 1 slice ≈ 30g)
- "brown bread" → whole wheat sandwich bread (~247 kcal/100g)
- "peanut butter toast" (unspecified) → 1 slice of white bread with 1 tbsp peanut butter (~174 kcal, 8g protein, 9g fat, 17g carbs)
- "rice" (unspecified) → cooked white basmati rice (~130 kcal/100g)
- "brown rice" → cooked long-grain brown rice (~112 kcal/100g)
- "pasta" (unspecified) → cooked white pasta (~158 kcal/100g)
- "oats" → dry rolled oats (~389 kcal/100g); 1 bowl of porridge ≈ 40g dry oats + 240ml milk
- "poha" → cooked (~110 kcal per 100g, made with standard oil and peanuts)

PROTEIN SHAKES & SUPPLEMENTS:
- "protein shake" / "whey shake" (unspecified brand) → 1 scoop of generic whey protein concentrate (~120 kcal, 25g protein, 2g fat, 3g carbs per 30g scoop)
- "protein shake with milk" → 1 scoop whey + 1 glass whole milk (250ml)
- "protein shake with water" → 1 scoop whey + water (negligible calories from water)
- "mass gainer shake" → assume 1 scoop (~75g) of generic mass gainer (~300 kcal, 50g carbs, 25g protein)
- "creatine" → creatine monohydrate, essentially 0 kcal

EGGS:
- "eggs" (unspecified cooking) → hard-boiled or scrambled with minimal oil (~70–90 kcal per egg)
- "omelette" (unspecified) → 2-egg omelette with 1 tsp oil/butter + vegetables

MEAT & POULTRY:
- "raw chicken breast" / "chicken breast (raw)" → 100g raw boneless skinless chicken breast (~120 kcal, 22.5g protein, 2.6g fat, 0g carbs)
- "cooked chicken breast" / "chicken breast (cooked)" / "chicken breast" (unspecified cooking) → 100g cooked boneless skinless chicken breast (~165 kcal, 31g protein, 3.6g fat, 0g carbs)
- "chicken curry" → assume bone-in chicken in a standard Indian gravy with oil; 1 katori ≈ 200g
- "fish" (unspecified, Indian context) → rohu or catla (freshwater fish, ~97 kcal/100g)
- "mutton" → bone-in mutton/goat curry; 1 katori ≈ 170g
- "tuna" → canned tuna in water (~116 kcal/100g, 26g protein)

INDIAN STAPLES:
- "dal" (unspecified) → cooked toor/arhar dal, standard tadka (~100 kcal per 100g)
- "rajma" / "chhole" → cooked with standard Indian masala (~140 kcal per 100g cooked)
- "sabzi" / "curry" (generic vegetable) → mixed vegetable sabzi, moderate oil (~120 kcal per katori)
- "biryani" → chicken biryani, 1 plate ≈ 350g (~600–700 kcal)
- "sambar" → standard South Indian sambar (~50 kcal per 100ml)
- "chutney" → coconut or tomato chutney, 1 tbsp ≈ 30 kcal
- "dosa" / "plain dosa" (unspecified) → 1 standard plain dosa (~133 kcal, 3.5g protein, 3.7g fat, 20g carbs, cooked with minimal oil/ghee)

NUTS & SEEDS:
- "almonds" → raw, unsalted (~579 kcal/100g, 1 handful ≈ 30g)
- "peanuts" → dry-roasted, unsalted (~567 kcal/100g)
- "peanut butter" → natural or standard commercial (~589 kcal/100g, 1 tbsp ≈ 16g)
- "cashews" → raw/roasted unsalted (~553 kcal/100g)
- "chia seeds" → dry (~486 kcal/100g, 1 tbsp ≈ 10g)

FRUITS:
- "banana" → medium-sized (118g with peel, ~89 kcal edible portion)
- "apple" → medium-sized (~182g, ~95 kcal)
- "mango" → 1 cup chopped (~165g, ~99 kcal)

BEVERAGES:
- "coffee" (unspecified black) → black coffee (~5 kcal)
- "coffee with milk" (unspecified) → black coffee with a splash of whole milk (~30ml whole milk, ~18 kcal, 1g protein, 1g fat, 1.5g carbs) unless specified as latte or cappuccino
- "tea" / "chai" → standard Indian chai with whole milk & sugar, 1 cup ≈ 80–100 kcal
- "green tea" → unsweetened (~3 kcal per cup)
- "juice" (unspecified) → assume store-bought commercial fruit juice (~45 kcal/100ml, not fresh-squeezed)
- "water" → 0 kcal
"""


def get_ingredient_defaults() -> str:
    return INGREDIENT_DEFAULTS
