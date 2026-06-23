from __future__ import annotations

import csv
import json
from dataclasses import asdict, dataclass, field
from math import sqrt
from pathlib import Path
from statistics import mean, median
from typing import Any

from models.food import MultiItemResponse

MACRO_KEYS = ("calories", "protein", "fat", "carbohydrates")

VAGUE_KEYWORDS = (
    "sandwich", "pasta", "burger", "salad", "pizza", "snack", "lunch", "some chicken",
)
SPECIFIC_KEYWORDS = (
    "raw", "cooked", "tbsp", "cup", "scoop", "fried", "stew", "100g", "150g", "200g", "300g", "ml", "bowl", "slice", "handful", "plate",
)

@dataclass
class EvalCase:
    description: str
    expected: dict[str, float]
    category: str | None = None
    tags: list[str] = field(default_factory=list)
    case_id: str | None = None
    difficulty: str = "medium"
    should_require_followup: bool = False
    expected_items: int | None = None
    expected_dishes: list[str] = field(default_factory=list)
    expected_key_entities: list[str] = field(default_factory=list)
    notes: str = ""

@dataclass
class MissDiagnosis:
    food_type: str
    failure_stage: str
    suggested_fix: str

@dataclass
class EvalResult:
    description: str
    expected: dict[str, float]
    predicted: dict[str, float]
    errors: dict[str, float]
    category: str
    tags: list[str] = field(default_factory=list)
    case_id: str | None = None
    thinking: str | None = None
    item_count: int = 0
    items: list[dict[str, Any]] = field(default_factory=list)
    is_miss: bool = False
    miss_diagnosis: MissDiagnosis | None = None
    entity_recall: float | None = None
    item_count_match: bool | None = None
    followup_violated: bool = False
    should_require_followup: bool = False
    response_type: str = "macros"

def _safe_float(raw: str | float | int | None) -> float:
    if raw in (None, ""):
        return 0.0
    return float(raw)

def _safe_int(raw: str | None) -> int | None:
    if raw in (None, ""):
        return None
    try:
        return int(raw)
    except ValueError:
        return None

def infer_category(description: str) -> str:
    desc_lower = description.lower()
    if any(keyword in desc_lower for keyword in SPECIFIC_KEYWORDS):
        return "Specific/Detailed"
    if any(keyword in desc_lower for keyword in VAGUE_KEYWORDS):
        return "Vague/General"
    return "Moderate/Single Item"

def load_eval_cases(csv_path: str | Path) -> list[EvalCase]:
    cases: list[EvalCase] = []
    with Path(csv_path).open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            description = (row.get("description") or row.get("query") or "").strip()
            if not description:
                continue

            explicit_category = (row.get("category") or "").strip() or None
            tags = [part.strip() for part in (row.get("tags") or "").split("|") if part.strip()]
            
            should_require_followup = str(row.get("should_require_followup", "")).strip().lower() == "true"
            
            expected_dishes = [p.strip() for p in (row.get("expected_dishes") or "").split("|") if p.strip()]
            expected_key_entities = [p.strip() for p in (row.get("expected_key_entities") or "").split("|") if p.strip()]

            cases.append(
                EvalCase(
                    case_id=(row.get("case_id") or "").strip() or None,
                    description=description,
                    expected={
                        "calories": _safe_float(row.get("calories", row.get("expected_calories"))),
                        "protein": _safe_float(row.get("protein", row.get("expected_protein"))),
                        "fat": _safe_float(row.get("fat", row.get("expected_fat"))),
                        "carbohydrates": _safe_float(row.get("carbohydrates", row.get("expected_carbohydrates"))),
                    },
                    category=explicit_category,
                    tags=tags,
                    difficulty=(row.get("difficulty") or "medium").strip(),
                    should_require_followup=should_require_followup,
                    expected_items=_safe_int(row.get("expected_items")),
                    expected_dishes=expected_dishes,
                    expected_key_entities=expected_key_entities,
                    notes=(row.get("notes") or "").strip()
                )
            )
    return cases

def response_totals(response: MultiItemResponse) -> dict[str, float]:
    totals = {key: 0.0 for key in MACRO_KEYS}
    for item in response.items or []:
        if item.is_food is False:
            continue
        totals["calories"] += float(item.calories)
        totals["protein"] += float(item.protein)
        totals["fat"] += float(item.fat)
        totals["carbohydrates"] += float(item.carbohydrates)
    return totals

def relative_errors(expected: dict[str, float], predicted: dict[str, float]) -> dict[str, float]:
    return {
        key: abs(predicted[key] - expected[key]) / max(expected[key], 1.0)
        for key in MACRO_KEYS
    }

FAILURE_FIXES = {
    "vague_input_guessed": "Add followup trigger when input matches vague_user_input pattern",
    "hidden_fat_missed": "Add specific prompt constraints for implicit cooking fats (butter, oil)",
    "raw_vs_cooked": "Clarify raw vs cooked weight mapping for this item type in system prompt",
    "serving_assumption": "Add explicit serving size unit mapping for this dish to INGREDIENT_DB/INDB defaults",
    "entity_confusion": "Add synonym aliasing for this term",
    "unknown": "Review thinking trace and manually determine fix"
}

def classify_failure(case: EvalCase, result: EvalResult) -> MissDiagnosis:
    food_type = case.category or "Unknown"
    
    if case.should_require_followup and result.followup_violated:
        fs = "vague_input_guessed"
    elif "hidden_fat" in case.tags and result.errors["fat"] > 0.3:
        fs = "hidden_fat_missed"
    elif ("raw_weight" in case.tags or "cooked_weight" in case.tags) and result.errors["calories"] > 0.2:
        fs = "raw_vs_cooked"
    elif "serving_based" in case.tags and result.errors["calories"] > 0.2:
        fs = "serving_assumption"
    elif "synonym_risk" in case.tags and result.errors["calories"] > 0.2:
        fs = "entity_confusion"
    else:
        fs = "unknown"
        
    return MissDiagnosis(
        food_type=food_type,
        failure_stage=fs,
        suggested_fix=FAILURE_FIXES.get(fs, "Unknown fix")
    )

def evaluate_cases(
    cases: list[EvalCase],
    evaluator: Any,
) -> list[EvalResult]:
    results: list[EvalResult] = []
    for case in cases:
        response = evaluator(case)
        predicted = response_totals(response)
        errors = relative_errors(case.expected, predicted)
        
        is_miss = errors["calories"] > 0.20
        
        returned_macros = any(
            getattr(item, 'is_food', True) and float(item.calories) > 0
            for item in (response.items or [])
        )
        returned_clarification = any(
            getattr(item, 'name', '').startswith('__clarification__')
            for item in (response.items or [])
        )
        followup_violated = case.should_require_followup and returned_macros
        
        if case.should_require_followup:
            if returned_clarification:
                response_type = "clarification"
            else:
                response_type = "unsafe_guess"
        else:
            if returned_clarification:
                response_type = "unnecessary_clarification"
            else:
                response_type = "macros"
        
        # Ignore errors for clarification cases
        if response_type == "clarification":
            is_miss = False
            errors = {k: 0.0 for k in MACRO_KEYS}

        # Entity recall
        entity_recall = None
        if case.expected_key_entities:
            predicted_names = [item.name.lower() for item in response.items or [] if item.is_food]
            matched = 0
            for ent in case.expected_key_entities:
                if any(ent.lower() in pname for pname in predicted_names):
                    matched += 1
            entity_recall = matched / len(case.expected_key_entities)
            
        item_count = len(response.items or [])
        item_count_match = None
        if case.expected_items is not None:
            item_count_match = (item_count == case.expected_items)
            
        result = EvalResult(
            case_id=case.case_id,
            description=case.description,
            expected=case.expected,
            predicted=predicted,
            errors=errors,
            category=case.category or infer_category(case.description),
            tags=case.tags,
            thinking=response.thinking,
            item_count=item_count,
            items=[item.model_dump() for item in response.items or []],
            is_miss=is_miss,
            entity_recall=entity_recall,
            item_count_match=item_count_match,
            followup_violated=followup_violated,
            should_require_followup=case.should_require_followup,
            response_type=response_type
        )
        
        if is_miss:
            result.miss_diagnosis = classify_failure(case, result)
            
        results.append(result)
    return results

def _macro_summary(values: list[float]) -> dict[str, float]:
    if not values:
        return {
            "mape": 0.0,
            "median_error": 0.0,
            "rmse": 0.0,
            "within_10pct": 0.0,
            "within_20pct": 0.0,
            "within_30pct": 0.0,
        }
    return {
        "mape": mean(values),
        "median_error": median(values),
        "rmse": sqrt(mean(v * v for v in values)),
        "within_10pct": sum(v <= 0.10 for v in values) / len(values),
        "within_20pct": sum(v <= 0.20 for v in values) / len(values),
        "within_30pct": sum(v <= 0.30 for v in values) / len(values),
    }

def summarize_results(results: list[EvalResult], top_n_failures: int = 5) -> dict[str, Any]:
    answerable_results = [r for r in results if r.response_type in ("macros", "unnecessary_clarification")]
    
    overall = {
        macro: _macro_summary([result.errors[macro] for result in answerable_results])
        for macro in MACRO_KEYS
    }

    by_category: dict[str, dict[str, Any]] = {}
    categories = sorted({result.category for result in answerable_results})
    for category in categories:
        category_results = [result for result in answerable_results if result.category == category]
        by_category[category] = {
            "count": len(category_results),
            "macros": {
                macro: _macro_summary([result.errors[macro] for result in category_results])
                for macro in MACRO_KEYS
            },
        }

    tag_breakdown: dict[str, dict[str, Any]] = {}
    all_tags = set()
    for result in answerable_results:
        all_tags.update(result.tags)
    for tag in sorted(all_tags):
        tag_results = [r for r in answerable_results if tag in r.tags]
        tag_breakdown[tag] = {
            "count": len(tag_results),
            "macros": {
                macro: _macro_summary([r.errors[macro] for r in tag_results])
                for macro in MACRO_KEYS
            }
        }

    zero_macro_cases = [asdict(r) for r in answerable_results if all(r.predicted[k] == 0 for k in MACRO_KEYS)]
    overcount_cases = [asdict(r) for r in answerable_results if r.predicted["calories"] > 1.35 * max(r.expected["calories"], 1.0)]
    undercount_cases = [asdict(r) for r in answerable_results if r.predicted["calories"] < 0.65 * r.expected["calories"] and not all(r.predicted[k] == 0 for k in MACRO_KEYS)]
    followup_miss_cases = [asdict(r) for r in results if r.followup_violated]
    
    entity_recall_list = [r.entity_recall for r in answerable_results if r.entity_recall is not None]
    avg_entity_recall = mean(entity_recall_list) if entity_recall_list else None
    
    miss_diagnoses = [asdict(r.miss_diagnosis) for r in answerable_results if r.is_miss and r.miss_diagnosis]
    for i, md in enumerate(miss_diagnoses):
        miss_res = [r for r in answerable_results if r.is_miss][i]
        md["case_id"] = miss_res.case_id
        md["description"] = miss_res.description

    worst_cases = sorted(
        answerable_results,
        key=lambda result: result.errors["calories"],
        reverse=True,
    )[:top_n_failures]
    
    # Clarification metrics
    true_clarifications = [r for r in results if r.response_type == "clarification"]
    unsafe_guesses = [r for r in results if r.response_type == "unsafe_guess"]
    unnecessary_clarifications = [r for r in results if r.response_type == "unnecessary_clarification"]
    should_clarify_total = len([r for r in results if r.should_require_followup])
    did_clarify_total = len([r for r in results if r.response_type in ("clarification", "unnecessary_clarification")])

    clarification_metrics = {
        "precision": len(true_clarifications) / max(did_clarify_total, 1),
        "recall": len(true_clarifications) / max(should_clarify_total, 1),
        "unsafe_guess_rate": len(unsafe_guesses) / max(should_clarify_total, 1),
        "unnecessary_rate": len(unnecessary_clarifications) / max(len(answerable_results), 1)
    }

    return {
        "case_count": len(results),
        "answerable_count": len(answerable_results),
        "clarification_metrics": clarification_metrics,
        "overall": overall,
        "by_category": by_category,
        "tag_breakdown": tag_breakdown,
        "zero_macro_cases": zero_macro_cases,
        "overcount_cases": overcount_cases,
        "undercount_cases": undercount_cases,
        "followup_miss_cases": followup_miss_cases,
        "entity_recall": avg_entity_recall,
        "miss_diagnoses": miss_diagnoses,
        "worst_cases": [
            {
                "case_id": result.case_id,
                "description": result.description,
                "category": result.category,
                "calorie_error": result.errors["calories"],
                "protein_error": result.errors["protein"],
                "fat_error": result.errors["fat"],
                "carbohydrate_error": result.errors["carbohydrates"],
                "expected": result.expected,
                "predicted": result.predicted,
            }
            for result in worst_cases
        ],
    }

def serialize_results(results: list[EvalResult]) -> list[dict[str, Any]]:
    return [asdict(result) for result in results]

def print_summary(summary: dict[str, Any]) -> None:
    print("\n--- Meal Eval Summary ---")
    print(f"Cases: {summary['case_count']} (Answerable: {summary['answerable_count']})")
    
    cm = summary.get("clarification_metrics", {})
    if cm:
        print("\n--- Clarification Safety ---")
        print(f"Recall: {cm['recall']:.2%}  |  Precision: {cm['precision']:.2%}")
        print(f"Unsafe Guesses: {cm['unsafe_guess_rate']:.2%}  |  Unnecessary: {cm['unnecessary_rate']:.2%}")
        
    print("\n--- Macro Accuracy (Answerable Cases Only) ---")
    for macro in MACRO_KEYS:
        stats = summary["overall"][macro]
        print(
            f"{macro.title():<14} "
            f"MAPE={stats['mape']:.2%} "
            f"Median={stats['median_error']:.2%} "
            f"<=20%={stats['within_20pct']:.2%}"
        )

    if summary["by_category"]:
        print("\n--- By Category ---")
        for category, category_summary in summary["by_category"].items():
            cal_stats = category_summary["macros"]["calories"]
            print(
                f"{category:<25} "
                f"n={category_summary['count']:<2} "
                f"Calories MAPE={cal_stats['mape']:.2%} "
                f"<=20%={cal_stats['within_20pct']:.2%}"
            )

    if summary["worst_cases"]:
        print("\n--- Worst Calorie Misses ---")
        for result in summary["worst_cases"]:
            print(
                f"{result['calorie_error']:.2%} | "
                f"{result['category']} | "
                f"{result['description']}"
            )

def write_json(path: str | Path, payload: Any) -> None:
    with Path(path).open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
