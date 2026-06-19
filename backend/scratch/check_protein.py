import json

with open("data/eval_results.json") as f:
    results = json.load(f)

print("Cases with Protein Error > 30%:")
for r in results:
    err = r["errors"]["protein"]
    if err > 0.30:
        print(f"Error: {err:.2%} | Expected: {r['expected']['protein']}g | Predicted: {r['predicted']['protein']}g | Description: {r['description']}")
