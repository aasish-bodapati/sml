from pydantic import BaseModel
from models.food import MacroSet

class ParsedItem(BaseModel):
    surface_text: str
    canonical_name: str
    quantity: float | None
    unit: str | None
    modifiers: list[str]
    preparation: str | None

class ParsedMeal(BaseModel):
    items: list[ParsedItem]

class Candidate(BaseModel):
    food_id: str | int
    source: str
    name: str
    serving_basis: str
    macros: MacroSet
    similarity: float

class RetrievalResult(BaseModel):
    parsed_item: ParsedItem
    candidates: list[Candidate]
    top_hit_confidence: float
    additive_candidates: list[Candidate] = []

class EstimatedItem(BaseModel):
    name: str
    selected_candidate_id: str | int | None
    selected_candidate_source: str | None
    assumptions: list[str]
    macros: MacroSet
    confidence: float
    is_food: bool
    meal_type: str | None

class ClarificationOption(BaseModel):
    label: str
    value: str

class ClarificationQuestion(BaseModel):
    item_ref: str
    question: str
    options: list[ClarificationOption] | None
