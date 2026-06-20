from sqlmodel import SQLModel, Field, text
from pydantic import BaseModel
from datetime import datetime, timezone
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector

class ChatMessage(BaseModel):
    role: str
    content: str

class MacroRequest(BaseModel):
    messages: list[ChatMessage]

class NutritionItem(BaseModel):
    is_food: bool
    name: str = Field(description="Cleaned up name of the food")
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    meal_type: str | None

class MultiItemResponse(BaseModel):
    thinking: str = Field(description="Step by step reasoning about what the user input means. Group items into DISHES (e.g. 'chicken sandwich' is 1 dish, don't split into bread and chicken). But if they are separate discrete dishes/items (e.g. '1 apple and 2 eggs'), list them separately.")
    items: list[NutritionItem] = Field(default=None)

class LogMealRequest(BaseModel):
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    meal_type: str | None = None
    reasoning: str | None = None

class FoodLog(SQLModel, table = True):
    id: int | None= Field(default= None, primary_key= True)
    user_id: str = Field(index= True)
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    meal_type: str | None = Field(default=None)
    notes: str | None= Field(default= None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs = {"server_default": text("TIMEZONE('utc', now())")}
    )

class SavedRecipeRequest(BaseModel):
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int

class SavedRecipeResponse(SavedRecipeRequest):
    id: int
    created_at: datetime

class SavedRecipe(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())")}
    )

class BaseIngredient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    source: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    embedding: list[float] | None = Field(default=None, sa_column=Column(Vector(1536)))

class TranscribeResponse(BaseModel):
    text: str
