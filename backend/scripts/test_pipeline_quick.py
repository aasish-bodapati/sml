from __future__ import annotations

import os
import sys
from typing import Iterable

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.food import ChatMessage, MacroRequest
from models.nutrition_pipeline import Candidate, ClarificationQuestion, EstimatedItem, ParsedItem, RetrievalResult
from routers.food import parse_macros
from services import clarification_service, estimation_service, parse_service, retrieval_service

TEST_INPUTS = [
    "1 bowl of dal tadka",
    "ate pasta",
    "2 eggs scrambled in 1 tbsp butter",
    "Just a regular cheeseburger from McDonalds",
    "1 katori chaach",
    "coffee with milk",
    "2 plain chapatis",
    "a handful of almonds",
    "1 glass lassi",
    "a Subway footlong roasted chicken breast sandwich",
    "1 margherita pizza from Domino's (regular size)",
    "Deep fried 200g of french fries in vegetable oil",
    "150g fish fried in 1 tbsp oil",
    "1 plain paratha with 1 tsp ghee",
]


def _fmt_float(value: float | None, digits: int = 3) -> str:
    if value is None:
        return "n/a"
    return f"{value:.{digits}f}"


def _print_header(title: str) -> None:
    print("\n" + "=" * 72)
    print(title)
    print("=" * 72)


def _print_parsed_items(items: Iterable[ParsedItem]) -> None:
    print("\n[Parse]")
    for idx, item in enumerate(items, 1):
        print(
            f"  {idx}. surface={item.surface_text!r} canonical={item.canonical_name!r} "
            f"qty={item.quantity!r} unit={item.unit!r} prep={item.preparation!r} "
            f"modifiers={item.modifiers!r}"
        )


def _print_candidates(candidates: list[Candidate]) -> None:
    if not candidates:
        print("    No candidates returned.")
        return

    for idx, candidate in enumerate(candidates, 1):
        macros = candidate.macros
        print(
            f"    {idx}. [{candidate.source}] {candidate.name} "
            f"(similarity={_fmt_float(candidate.similarity)}, serving={candidate.serving_basis})"
        )
        print(
            "       "
            f"{macros.calories} kcal | P {macros.protein}g | "
            f"F {macros.fat}g | C {macros.carbohydrates}g"
        )


def _print_retrievals(retrievals: list[RetrievalResult]) -> None:
    print("\n[Retrieval]")
    for idx, retrieval in enumerate(retrievals, 1):
        print(
            f"  {idx}. item={retrieval.parsed_item.canonical_name!r} "
            f"top_hit_confidence={_fmt_float(retrieval.top_hit_confidence)}"
        )
        _print_candidates(retrieval.candidates)


def _print_clarification(clarification: ClarificationQuestion | None) -> None:
    print("\n[Clarification]")
    if not clarification:
        print("  None")
        return

    print(f"  item_ref={clarification.item_ref!r}")
    print(f"  question={clarification.question}")
    if clarification.options:
        print(f"  options={[opt.label for opt in clarification.options]}")


def _print_estimates(estimates: list[EstimatedItem]) -> None:
    print("\n[Estimate]")
    for idx, estimate in enumerate(estimates, 1):
        macros = estimate.macros
        print(
            f"  {idx}. name={estimate.name!r} is_food={estimate.is_food} "
            f"candidate_id={estimate.selected_candidate_id!r} "
            f"source={estimate.selected_candidate_source!r} "
            f"confidence={_fmt_float(estimate.confidence)} "
            f"meal_type={estimate.meal_type!r}"
        )
        print(
            "     "
            f"{macros.calories} kcal | P {macros.protein}g | "
            f"F {macros.fat}g | C {macros.carbohydrates}g"
        )
        print(f"     assumptions={estimate.assumptions!r}")


def _print_router_output(text: str) -> None:
    request = MacroRequest(messages=[{"role": "user", "content": text}])
    response = parse_macros(request, user_id="test_user")

    print("\n[Router Output]")
    print("  thinking:")
    for line in response.thinking.splitlines():
        print(f"    {line}")

    if not response.items:
        print("  items=[]")
        return

    for idx, item in enumerate(response.items, 1):
        print(
            f"  {idx}. name={item.name!r} is_food={item.is_food} "
            f"{item.calories} kcal | P {item.protein}g | F {item.fat}g | C {item.carbohydrates}g"
        )


def run_quick_tests() -> None:
    print("--- Quick Pipeline Diagnostic ---")
    for text in TEST_INPUTS:
        _print_header(f"Input: {text}")

        messages = [ChatMessage(role="user", content=text)]
        parsed_meal = parse_service.parse(messages)
        
        FAT_KEYWORDS = {"oil", "butter", "ghee", "mayo", "dressing", "margarine"}
        has_explicit_added_fat = any(
            item.quantity is not None and any(f in item.canonical_name.lower() for f in FAT_KEYWORDS)
            for item in parsed_meal.items
        )
        if has_explicit_added_fat:
            for item in parsed_meal.items:
                if not any(f in item.canonical_name.lower() for f in FAT_KEYWORDS):
                    item.avoid_pre_fatted_candidates = True
                    
        retrievals = retrieval_service.retrieve_all(parsed_meal.items, user_id="test_user")
        clarification = clarification_service.check(retrievals)
        estimates = estimation_service.estimate_all(retrievals)

        _print_parsed_items(parsed_meal.items)
        _print_retrievals(retrievals)
        _print_clarification(clarification)
        _print_estimates(estimates)
        _print_router_output(text)


if __name__ == "__main__":
    run_quick_tests()
