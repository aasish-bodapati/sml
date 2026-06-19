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
    "sandwich",
    "pasta",
    "burger",
    "salad",
    "pizza",
    "snack",
    "lunch",
    "some chicken",
)
SPECIFIC_KEYWORDS = (
    "raw",
    "cooked",
    "tbsp",
    "cup",
    "scoop",
    "fried",
    "stew",
    "100g",
    "150g",
    "200g",
    "300g",
    "ml",
    "bowl",
    "slice",
    "handful",
    "plate",
)


@dataclass
class EvalCase:
    description: str
    expected: dict[str, float]
    category: str | None = None
    tags: list[str] = field(default_factory=list)
    case_id: str | None = None


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


def _safe_float(raw: str | float | int | None) -> float:
    if raw in (None, ""):
        return 0.0
    return float(raw)


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
            tags = [
                part.strip()
                for part in (row.get("tags") or "").split("|")
                if part.strip()
            ]

            cases.append(
                EvalCase(
                    case_id=(row.get("case_id") or "").strip() or None,
                    description=description,
                    expected={
                        "calories": _safe_float(
                            row.get("calories", row.get("expected_calories"))
                        ),
                        "protein": _safe_float(
                            row.get("protein", row.get("expected_protein"))
                        ),
                        "fat": _safe_float(row.get("fat", row.get("expected_fat"))),
                        "carbohydrates": _safe_float(
                            row.get("carbohydrates", row.get("expected_carbohydrates"))
                        ),
                    },
                    category=explicit_category,
                    tags=tags,
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


def evaluate_cases(
    cases: list[EvalCase],
    evaluator: Any,
) -> list[EvalResult]:
    results: list[EvalResult] = []
    for case in cases:
        response = evaluator(case)
        predicted = response_totals(response)
        results.append(
            EvalResult(
                case_id=case.case_id,
                description=case.description,
                expected=case.expected,
                predicted=predicted,
                errors=relative_errors(case.expected, predicted),
                category=case.category or infer_category(case.description),
                tags=case.tags,
                thinking=response.thinking,
                item_count=len(response.items or []),
                items=[item.model_dump() for item in response.items or []],
            )
        )
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
    overall = {
        macro: _macro_summary([result.errors[macro] for result in results])
        for macro in MACRO_KEYS
    }

    by_category: dict[str, dict[str, Any]] = {}
    categories = sorted({result.category for result in results})
    for category in categories:
        category_results = [result for result in results if result.category == category]
        by_category[category] = {
            "count": len(category_results),
            "macros": {
                macro: _macro_summary([result.errors[macro] for result in category_results])
                for macro in MACRO_KEYS
            },
        }

    worst_cases = sorted(
        results,
        key=lambda result: result.errors["calories"],
        reverse=True,
    )[:top_n_failures]

    return {
        "case_count": len(results),
        "overall": overall,
        "by_category": by_category,
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
    print(f"Cases: {summary['case_count']}")
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
                f"{category:<22} "
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
