from __future__ import annotations

import traceback

from evals.meal_eval import (
    evaluate_cases,
    load_eval_cases,
    print_summary,
    serialize_results,
    summarize_results,
    write_json,
)
from models.food import MacroRequest
from routers.food import parse_macros


def _evaluator(case):
    print(f"Evaluating: {case.description}")
    request = MacroRequest(messages=[{"role": "user", "content": case.description}])
    return parse_macros(request, user_id="test_user")


def run_eval():
    cases = load_eval_cases("data/eval_ground_truth.csv")
    results = []

    for case in cases:
        try:
            result = evaluate_cases([case], _evaluator)[0]
            results.append(result)
        except Exception as exc:
            print(f"Failed {case.description}: {exc}")
            traceback.print_exc()

    serialized = serialize_results(results)
    summary = summarize_results(results)

    write_json("data/eval_results.json", serialized)
    write_json("data/eval_summary.json", summary)
    print_summary(summary)

if __name__ == "__main__":
    run_eval()
