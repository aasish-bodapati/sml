import pandas as pd
from main import parse_macros, MacroRequest
import json
import traceback

def run_eval():
    df = pd.read_csv("data/eval_ground_truth.csv")
    results = []
    
    for idx, row in df.iterrows():
        desc = row["description"]
        print(f"Evaluating: {desc}")
        req = MacroRequest(messages=[{"role": "user", "content": desc}])
        try:
            res = parse_macros(req, user_id="test_user")
            
            # Sum up macros across all items
            total_cal = sum(item.calories for item in res.items if item.is_food)
            total_pro = sum(item.protein for item in res.items if item.is_food)
            total_fat = sum(item.fat for item in res.items if item.is_food)
            total_car = sum(item.carbohydrates for item in res.items if item.is_food)
            
            cal_err = abs(total_cal - row["calories"]) / max(row["calories"], 1)
            pro_err = abs(total_pro - row["protein"]) / max(row["protein"], 1)
            fat_err = abs(total_fat - row["fat"]) / max(row["fat"], 1)
            car_err = abs(total_car - row["carbohydrates"]) / max(row["carbohydrates"], 1)
            
            results.append({
                "description": desc,
                "expected": {
                    "calories": row["calories"],
                    "protein": row["protein"],
                    "fat": row["fat"],
                    "carbohydrates": row["carbohydrates"]
                },
                "predicted": {
                    "calories": total_cal,
                    "protein": total_pro,
                    "fat": total_fat,
                    "carbohydrates": total_car
                },
                "errors": {
                    "calories": cal_err,
                    "protein": pro_err,
                    "fat": fat_err,
                    "carbohydrates": car_err
                }
            })
        except Exception as e:
            print(f"Failed {desc}: {e}")
            traceback.print_exc()
            
    with open("data/eval_results.json", "w") as f:
        json.dump(results, f, indent=2)
        
    print("\n--- Summary ---")
    if results:
        cal_mape = sum(r["errors"]["calories"] for r in results) / len(results)
        print(f"Calories MAPE: {cal_mape:.2%}")
        pro_mape = sum(r["errors"]["protein"] for r in results) / len(results)
        print(f"Protein MAPE: {pro_mape:.2%}")
        fat_mape = sum(r["errors"]["fat"] for r in results) / len(results)
        print(f"Fat MAPE: {fat_mape:.2%}")
        car_mape = sum(r["errors"]["carbohydrates"] for r in results) / len(results)
        print(f"Carbs MAPE: {car_mape:.2%}")
        
        # Calculate how many were within 20% error for calories
        within_20 = sum(1 for r in results if r["errors"]["calories"] <= 0.20)
        print(f"Calories within 20% error: {within_20}/{len(results)} ({within_20/len(results):.2%})")

if __name__ == "__main__":
    run_eval()
