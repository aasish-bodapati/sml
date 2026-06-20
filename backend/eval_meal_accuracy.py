from __future__ import annotations

import argparse
import traceback
from collections import defaultdict

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
    request = MacroRequest(messages=[{"role": "user", "content": case.description}])
    return parse_macros(request, user_id="test_user")


def print_report(summary: dict):
    miss_diagnoses = summary.get("miss_diagnoses", [])
    if not miss_diagnoses:
        print("\n--- MISS DIAGNOSES (0 misses) ---")
        return

    print(f"\n--- MISS DIAGNOSES ({len(miss_diagnoses)} misses) ---")
    
    grouped = defaultdict(list)
    for md in miss_diagnoses:
        grouped[md["failure_stage"]].append(md)
        
    for stage, cases in grouped.items():
        print(f"\n[{stage}] {len(cases)} cases")
        for md in cases:
            print(f"  • {md.get('case_id', 'unknown')} | {md.get('description', '')}")
            print(f"    Food type: {md.get('food_type', '')}")
            print(f"    Fix: {md.get('suggested_fix', '')}")

def run_eval(dataset_version="v2", report=False):
    if dataset_version == "v3":
        csv_path = "data/eval_ground_truth_v3.csv"
        results_path = "data/eval_results_v3.json"
        summary_path = "data/eval_summary_v3.json"
    elif dataset_version == "v2":
        csv_path = "data/eval_ground_truth_v2.csv"
        results_path = "data/eval_results_v2.json"
        summary_path = "data/eval_summary_v2.json"
    else:
        csv_path = "data/eval_ground_truth.csv"
        results_path = "data/eval_results.json"
        summary_path = "data/eval_summary.json"

    cases = load_eval_cases(csv_path)
    results = []

    total_cases = len(cases)
    for i, case in enumerate(cases, 1):
        try:
            print(f"[{i}/{total_cases} - {i/total_cases:.0%}] Evaluating: {case.description}")
            result = evaluate_cases([case], _evaluator)[0]
            results.append(result)
        except Exception as exc:
            print(f"Failed {case.description}: {exc}")
            traceback.print_exc()

    serialized = serialize_results(results)
    summary = summarize_results(results)

    write_json(results_path, serialized)
    write_json(summary_path, summary)
    
    print_summary(summary)
    
    if report:
        print_report(summary)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dataset",
        choices=["v1", "v2", "v3", "recipe"],
        default="v3",
        help="Which dataset to evaluate against."
    )
    parser.add_argument("--report", action="store_true", help="Print structured miss diagnoses report")
    args = parser.parse_args()
    
    run_eval(dataset_version=args.dataset, report=args.report)
