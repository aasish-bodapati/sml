from models.food import MultiItemResponse, NutritionItem

from evals.meal_eval import (
    EvalCase,
    evaluate_cases,
    infer_category,
    load_eval_cases,
    response_totals,
    summarize_results,
)


def test_infer_category_prefers_specific_language():
    assert infer_category("150g cooked rice with 1 tbsp butter") == "Specific/Detailed"
    assert infer_category("I had a sandwich for lunch") == "Vague/General"
    assert infer_category("1 medium apple") == "Moderate/Single Item"


def test_response_totals_skips_non_food_items():
    response = MultiItemResponse(
        thinking="test",
        items=[
            NutritionItem(
                is_food=True,
                name="Apple",
                calories=95,
                protein=0,
                carbohydrates=25,
                fat=0,
                meal_type="snack",
            ),
            NutritionItem(
                is_food=False,
                name="Water",
                calories=0,
                protein=0,
                carbohydrates=0,
                fat=0,
                meal_type="snack",
            ),
        ],
    )

    assert response_totals(response) == {
        "calories": 95.0,
        "protein": 0.0,
        "fat": 0.0,
        "carbohydrates": 25.0,
    }


def test_evaluate_and_summarize_results():
    cases = [
        EvalCase(
            description="1 medium apple",
            expected={"calories": 95.0, "protein": 0.5, "fat": 0.3, "carbohydrates": 25.0},
        ),
        EvalCase(
            description="2 plain chapatis",
            expected={"calories": 140.0, "protein": 4.0, "fat": 0.8, "carbohydrates": 30.0},
        ),
    ]

    def evaluator(case: EvalCase) -> MultiItemResponse:
        if "apple" in case.description:
            item = NutritionItem(
                is_food=True,
                name="Apple",
                calories=95,
                protein=0,
                carbohydrates=25,
                fat=0,
                meal_type="snack",
            )
        else:
            item = NutritionItem(
                is_food=True,
                name="Chapati",
                calories=215,
                protein=6,
                carbohydrates=42,
                fat=4,
                meal_type="lunch",
            )
        return MultiItemResponse(thinking="test", items=[item])

    results = evaluate_cases(cases, evaluator)
    summary = summarize_results(results, top_n_failures=1)

    assert len(results) == 2
    assert summary["case_count"] == 2
    assert "Vague/General" in summary["by_category"] or "Moderate/Single Item" in summary["by_category"]
    assert len(summary["worst_cases"]) == 1
    assert summary["worst_cases"][0]["description"] == "2 plain chapatis"
    assert summary["overall"]["calories"]["mape"] > 0


def test_load_eval_cases_supports_legacy_csv_shape(tmp_path):
    csv_path = tmp_path / "cases.csv"
    csv_path.write_text(
        "description,calories,protein,fat,carbohydrates,category,tags\n"
        "\"protein shake\",200,20,5,10,Specific/Detailed,shake|supplement\n",
        encoding="utf-8",
    )

    cases = load_eval_cases(csv_path)

    assert len(cases) == 1
    assert cases[0].category == "Specific/Detailed"
    assert cases[0].tags == ["shake", "supplement"]
    assert cases[0].expected["protein"] == 20.0
