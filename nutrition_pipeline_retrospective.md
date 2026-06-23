# Nutrition Pipeline: Full Implementation History & Retrospective

This document chronicles the complete history of the Nutrition LLM implementation from its inception. It outlines the evolution of the architecture, the problems encountered along the way, and the reasoning behind each major refactor and rule implementation.

---

## Phase 1: The Single-Prompt Approach (V1)

**The Initial Implementation:**
The original iteration of the nutrition pipeline relied entirely on a single "god prompt" sent to GPT-4o-mini. The LLM was responsible for reading the user's input, parsing the items, guessing the portion sizes, estimating the macros, and outputting the final structured JSON. 

**The Enhancements:**
- We added `ingredient_defaults.py` to inject standard portion rules (e.g., "1 katori = 130g", "1 tbsp = 15ml") directly into the system prompt to ground the LLM's estimates.
- We experimented with adding an internet search tool for unknown foods. 

**The Problem:**
While this approach initially achieved an impressive 2.60% Calorie MAPE on a small, curated dataset, it proved highly brittle in production. 
- The LLM hallucinated macros for foods it didn't know.
- The internet search tool was too slow for a synchronous chat experience and highly unpredictable.
- We had no verifiable ground truth; the LLM was both the calculator and the database.

---

## Phase 2: The 4-Stage Architectural Shift (V2)

**The Fix:**
To make the system deterministic, verifiable, and safe, we completely tore down the single-prompt approach and rebuilt it as a **4-stage pipeline**.

1. **Parse:** An LLM extracts the surface text, quantity, units, modifiers, and preparation methods without estimating *any* macros.
2. **Retrieve:** A vector search (`text-embedding-3-small`) matches the parsed canonical names against two rigid, verified databases: USDA (for raw ingredients) and INDB (for complex Indian dishes).
3. **Clarify:** Deterministic, heuristic rules decide whether the retrieved candidates are safe to use or if the user must be asked a follow-up question.
4. **Estimate:** A final LLM call takes the rigid database candidate and scales its macros to the user's parsed portion size.

**Why we did it:**
This architecture separates understanding (LLM) from knowledge (Database). It gives us trace logs for exactly *why* a calorie count was chosen, allows us to update macros without retraining or re-prompting the LLM, and creates a clear intervention point for safety (the Clarify stage).

---

## Phase 3: Refining the Safety Guardrails & Evaluations (V3)

With the 4-stage pipeline in place, we encountered new edge cases during evaluation that required surgical logic updates.

### 1. Evaluation Accounting & Clarification Short-Circuiting
**The Problem:** The pipeline was generating fallback estimates even when a clarification question was triggered. The evaluation script scored these fallback estimates, penalizing the system with a `0` accuracy score for cases where it was *supposed* to ask for help.
**The Fix:** Updated the router to short-circuit estimation if `clarification_service.check()` triggered a follow-up. 
**Why:** Evaluation metrics must cleanly separate "macro accuracy" from "safety behavior." The system should be rewarded for clarifying ambiguous inputs, not penalized for fallback estimates it never intended to show the user.

### 2. Brand Clarification Strategy
**The Problem:** Generic confidence thresholds in the Clarify stage caused high "Unnecessary Clarification" rates. Packaged goods (Maggi, Oreo) were being flagged, while highly variable restaurant meals (Subway, Domino's) were slipping through.
**The Fix:** 
- Added packaged standard goods to a `KNOWN_ITEMS` bypass list to keep them answerable.
- Configured customizable chain restaurants (Subway, Domino's) to unconditionally trigger a clarification request (`should_require_followup=True`).
**Why:** Customizable meals have too much variance to guess safely. Packaged goods have standard sizes. Hardcoding these paths prevents hiding retrieval weaknesses behind safety gates.

### 3. Tiered Evaluation Suites
**The Problem:** Running the full evaluation suite was too slow and expensive for rapid iteration.
**The Fix:** Introduced `--suite smoke` (12 cases) and `--suite core` (28 cases) to `eval_meal_accuracy.py`.
**Why:** To allow for fast prompt tuning and logic debugging without polluting the main dataset.

---

## Phase 4: Solving Double-Counting in Hidden Fats

**The Problem:**
When users specified explicit cooking fats (e.g., "150g fish fried in 1 tbsp oil"), the Parse stage correctly split this into `fried fish` and `1 tbsp oil`. However, the Retrieval stage matched `fried fish` to pre-fatted database candidates (like "Tomato fish" or "Fish orly"). The Estimate stage would then evaluate the pre-fatted fish AND the separate `1 tbsp oil`, leading to massive double-counting (over 250% error).

**Failed Attempt:**
We tried instructing the estimator LLM to ignore the fat if oil was explicitly parsed. This worsened overall metrics, as the LLM struggled to balance the negative constraint alongside normal estimation.

**The Fix:**
Implemented a deterministic "explicit added fat" logic path:
1. **Detection:** The router checks the parsed items for explicit fat keywords (oil, butter, ghee) with quantities. If found, it marks neighboring base items with `avoid_pre_fatted_candidates=True`.
2. **Retrieval Filtering:** In the vector search, if this flag is active, candidates containing terms like `fried`, `pakora`, or `breaded` are heavily downranked (`-0.30`), while lean/raw candidates (`raw`, `plain`, `grilled`) are boosted (`+0.15`).
3. **Independent Estimation:** The estimator now safely receives a raw/lean base candidate and an independent oil candidate, scaling both correctly.

**Why we did it:**
Moving the solution out of the LLM prompt and into deterministic retrieval logic ensures the problem is solved at the source. This successfully dropped the error on the fish case from ~257% to ~58% in the `smoke` suite without degrading performance on unrelated meals.
