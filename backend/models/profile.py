from sqlmodel import SQLModel, Field, text
from pydantic import BaseModel
from datetime import datetime, timezone

class UserProfileRequest(BaseModel):
    goal: str
    gender: str
    age: int
    height_cm: float
    weight_kg: float
    activity: str
    target_calories: int
    target_protein: int
    target_carbs: int
    target_fat: int

class UserProfileResponse(UserProfileRequest):
    updated_at: datetime

class UserProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, unique=True)
    goal: str
    gender: str
    age: int
    height_cm: float
    weight_kg: float
    activity: str
    target_calories: int
    target_protein: int
    target_carbs: int
    target_fat: int
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())"), "onupdate": text("TIMEZONE('utc', now())")}
    )

class WeightLogRequest(BaseModel):
    weight_kg: float

class WeightLog(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    weight_kg: float
    logged_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())")}
    )
