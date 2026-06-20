from sqlmodel import SQLModel, Field, text
from pydantic import BaseModel
from datetime import datetime, timezone

class Exercise(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    exercise_id: str = Field(unique=True, index=True)
    name: str = Field(index=True)
    gif_url: str
    body_parts: str
    equipments: str
    target_muscles: str
    secondary_muscles: str
    instructions: str

class WorkoutSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    name: str | None = None
    notes: str | None = None
    calories_burned: int | None = None
    duration_minutes: int | None = None
    logged_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())")}
    )

class WorkoutSet(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="workoutsession.id", index=True)
    exercise_id: str
    sets: int | None = None
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: int | None = None

class Routine(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    name: str
    description: str | None = None
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())")}
    )

class RoutineDay(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    routine_id: int = Field(foreign_key="routine.id", index=True)
    day_number: int
    title: str | None = None
    focus: str | None = None

class RoutineExercise(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    day_id: int = Field(foreign_key="routineday.id", index=True)
    exercise_id: str
    sets: int | None = None
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: int | None = None
    order_index: int = 0

class WorkoutSetRequest(BaseModel):
    exercise_id: str
    sets: int | None = None
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: int | None = None

class WorkoutSessionRequest(BaseModel):
    name: str | None = None
    notes: str | None = None
    duration_minutes: int | None = None
    sets: list[WorkoutSetRequest]

class RoutineExerciseRequest(BaseModel):
    exercise_id: str
    name: str | None = None
    sets: int | None = None
    reps: int | None = None
    weight_kg: float | None = None
    duration_seconds: int | None = None

class RoutineDayRequest(BaseModel):
    day_number: int
    title: str | None = None
    focus: str | None = None
    exercises: list[RoutineExerciseRequest]

class RoutineRequest(BaseModel):
    name: str
    description: str | None = None
    days: list[RoutineDayRequest]

class GenerateRoutineRequest(BaseModel):
    prompt: str

class CalorieEstimateResponse(BaseModel):
    total_calories: int
