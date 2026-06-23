from __future__ import annotations
import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import argparse
import traceback
from collections import defaultdict
from pathlib import Path

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

SUITE_CASE_IDS = {
    "smoke": [
        "legacy_005",  # banana
        "legacy_011",  # chapatis
        "legacy_018",  # coffee with milk
        "fat_001",     # eggs + butter
        "fat_002",     # fish fried in oil
        "fat_005",     # poori deep fried
        "legacy_022",  # McDonalds cheeseburger
        "brand_001",   # Maggi
        "brand_005",   # Subway follow-up
        "global_005",  # Domino's follow-up
        "vague_002",   # ate pasta
        "vague_006",   # had oats
    ],
    "core": [
        "legacy_001",
        "legacy_003",
        "legacy_005",
        "legacy_009",
        "legacy_011",
        "legacy_012",
        "legacy_013",
        "legacy_018",
        "legacy_022",
        "legacy_027",
        "legacy_031",
        "indian_001",
        "indian_005",
        "bev_001",
        "comp_005",
        "comp_006",
        "fat_001",
        "fat_002",
        "fat_005",
        "noise_003",
        "brand_001",
        "brand_003",
        "brand_005",
        "global_003",
        "global_005",
        "vague_002",
        "vague_006",
        "vague_010",
    ],
}


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

def _dataset_paths(dataset_version: str) -> tuple[str, str, str]:
    if dataset_version == "v3":
        return (
            "data/eval_ground_truth_v3.csv",
            "data/eval_results_v3.json",
            "data/eval_summary_v3.json",
        )
    elif dataset_version == "v2":
        return (
            "data/eval_ground_truth_v2.csv",
            "data/eval_results_v2.json",
            "data/eval_summary_v2.json",
        )
    else:
        return (
            "data/eval_ground_truth.csv",
            "data/eval_results.json",
            "data/eval_summary.json",
        )


def _with_suffix(path: str, suffix: str | None) -> str:
    if not suffix:
        return path
    p = Path(path)
    return str(p.with_name(f"{p.stem}_{suffix}{p.suffix}"))


def run_eval(
    dataset_version="v2",
    report=False,
    suite: str = "full",
    case_ids: list[str] | None = None,
):
    csv_path, results_path, summary_path = _dataset_paths(dataset_version)

    cases = load_eval_cases(csv_path)
    requested_ids = set(case_ids or [])
    suite_ids = set(SUITE_CASE_IDS.get(suite, []))

    if suite != "full":
        cases = [case for case in cases if case.case_id in suite_ids]

    if requested_ids:
        cases = [case for case in cases if case.case_id in requested_ids]

    if not cases:
        raise SystemExit("No eval cases matched the requested suite / case IDs.")

    output_suffix = None
    if suite != "full":
        output_suffix = suite
    if requested_ids:
        output_suffix = "custom"

    results_path = _with_suffix(results_path, output_suffix)
    summary_path = _with_suffix(summary_path, output_suffix)
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
    parser.add_argument(
        "--suite",
        choices=["full", "core", "smoke"],
        default="full",
        help="Run a smaller curated subset to save time and API cost.",
    )
    parser.add_argument(
        "--case-id",
        action="append",
        dest="case_ids",
        help="Optional specific case_id to run. Can be passed multiple times.",
    )
    parser.add_argument("--report", action="store_true", help="Print structured miss diagnoses report")
    args = parser.parse_args()
    
    run_eval(
        dataset_version=args.dataset,
        report=args.report,
        suite=args.suite,
        case_ids=args.case_ids,
    )
