from fastapi import FastAPI, Header, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select, text
from dotenv import load_dotenv
import os
import jwt
from jwt import PyJWKClient
from openai import OpenAI
from pydantic import BaseModel
from datetime import datetime, timezone, time, timedelta
from zoneinfo import ZoneInfo
from contextlib import asynccontextmanager
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector








load_dotenv()

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_ALGORITHM = "HS256"

# Supabase JWKS configuration for ES256 verification
JWKS_URL = "https://xpyzowlshriupianmuit.supabase.co/auth/v1/.well-known/jwks.json"
jwk_client = PyJWKClient(JWKS_URL, cache_keys=True)


engine= create_engine(os.getenv("DATABASE_URL"))

llm_client = OpenAI()

security = HTTPBearer()



import time as time_lib
cached_signing_key = None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    global cached_signing_key
    token = credentials.credentials
    try:
        t0 = time_lib.time()
        # Fetch the public key from the JWKS endpoint
        if not cached_signing_key:
            cached_signing_key = jwk_client.get_signing_key_from_jwt(token).key
        
        t1 = time_lib.time()
        print(f"JWK Fetch took {t1 - t0:.3f} seconds")
        
        # Verify the signature using the public key and ES256 algorithm
        payload = jwt.decode(
            token,
            cached_signing_key,
            algorithms=["ES256"],
            options={"verify_aud": False}
        )
        t2 = time_lib.time()
        print(f"JWT Decode took {t2 - t1:.3f} seconds")
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing 'sub' claim."
            )
        return user_id
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )





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
        sa_column_kwargs={"server_default": text("TIMEZONE('utc', now())")}
    )

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

class UsdaFood(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    fdc_id: int = Field(unique=True, index=True)
    description: str
    calories: float
    protein: float
    fat: float
    carbs: float
    embedding: list[float] | None = Field(default=None, sa_column=Column(Vector(1536)))

class BaseIngredient(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    source: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    embedding: list[float] | None = Field(default=None, sa_column=Column(Vector(1536)))

class ComplexDish(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    source: str
    calories: float
    protein: float
    carbohydrates: float
    fat: float
    embedding: list[float] | None = Field(default=None, sa_column=Column(Vector(1536)))

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
    calories_burned: int | None = None







@asynccontextmanager
async def lifespan(app: FastAPI):
    SQLModel.metadata.create_all(engine)

    yield

    engine.dispose()






app = FastAPI(lifespan= lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)










@app.get("/")
def get_health():
    return {"status_code": 200, "status": "running"}



@app.post("/parse-macros")
def parse_macros(request: MacroRequest, user_id: str = Depends(get_current_user)) -> MultiItemResponse:
    system_msg = {
        "role": "system",
        "content": (
            "You are a strict nutrition tracker. Use short, clean dish names (e.g. 'Protein Shake', 'Chicken Sandwich') — never list ingredients in the name. "
            "In the 'thinking' field, write 2-3 concise sentences explaining what portion sizes and reference values you used to estimate the macros (e.g. assumed standard serving, used USDA values, estimated weight). Do NOT list out arithmetic. "
            "Group items into composite DISHES (e.g. 'chicken sandwich' is 1 dish). Do NOT split composite dishes into raw ingredients. "
            "If the user ate multiple completely separate dishes, separate them into multiple NutritionItems in the 'items' array. "
            "If an item is gibberish or non-food, set is_food to False. Infer the meal_type from context.\n\n"
            "PORTION SIZE STANDARDS — always use these as your baseline, never deviate unless the user explicitly states grams or ml:\n"
            "- 1 tsp = 5ml (oil/ghee ~4g, dry spice ~3g)\n"
            "- 1 tbsp = 15ml (oil/ghee ~13g, peanut butter ~16g, sugar ~12g)\n"
            "- 1 cup = 240ml (cooked rice ~200g, cooked dal ~220g, milk ~240g, flour ~120g)\n"
            "- 1 bowl = 300ml / ~260g for solid foods (rice, dal, sabzi, pasta)\n"
            "- 1 katori = 150ml / ~130g (standard small Indian bowl)\n"
            "- 1 plate of rice = 250g cooked rice\n"
            "- 1 plate (full meal) = treat as a standard thali: ~250g rice or 3 rotis + 1 katori dal + 1 katori sabzi\n"
            "- 1 roti / chapati = 40g (medium, no oil); paratha = 60g\n"
            "- 1 idli = 40g; 1 dosa (plain) = 70g\n"
            "- 1 egg = 55g\n"
            "- 1 slice bread = 30g\n"
            "- 1 handful (dry nuts/seeds) = 30g; (chips/puffs) = 20g\n"
            "- 1 glass = 250ml\n"
            "- 'small' portion = reduce by 25%; 'large' or 'heaped' = increase by 30%; 'half' = reduce by 50%.\n"
            "When a food's volume-to-weight conversion isn't listed above, use your best estimate of the food's density."
        )
    }
    messages = [system_msg] + [msg.model_dump() for msg in request.messages]

    response = llm_client.beta.chat.completions.parse(
        model= "gpt-4o-mini",
        response_format= MultiItemResponse,
        messages=messages
    )
    return response.choices[0].message.parsed

class TranscribeResponse(BaseModel):
    text: str

@app.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    try:
        response = llm_client.audio.transcriptions.create(
            model="whisper-1",
            file=(file.filename, file.file, file.content_type)
        )
        return {"text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/log-meal")
def log_meal(request: LogMealRequest, user_id: str = Depends(get_current_user)):
    db_log = FoodLog(
        name=request.name,
        user_id=user_id,
        calories=request.calories,
        protein=request.protein,
        carbohydrates=request.carbohydrates,
        fat=request.fat,
        meal_type=request.meal_type,
        reasoning=request.reasoning
    )
    with Session(engine) as session:
        session.add(db_log)
        session.commit()
        session.refresh(db_log)

    return db_log



@app.get("/get-logs")
def get_logs(
    tz: str = "UTC",
    date: str | None = None,
    user_id: str = Depends(get_current_user)
):
    t0 = time_lib.time()
    try:
        user_tz = ZoneInfo(tz)
    except Exception:
        user_tz = ZoneInfo("UTC")

    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    else:
        target_date = datetime.now(user_tz).date()

    day_start_utc = datetime.combine(target_date, time.min, tzinfo=user_tz).astimezone(timezone.utc).replace(tzinfo=None)
    day_end_utc = datetime.combine(target_date, time.max, tzinfo=user_tz).astimezone(timezone.utc).replace(tzinfo=None)

    with Session(engine) as session:
        statement = select(FoodLog).where(
            FoodLog.user_id == user_id,
            FoodLog.created_at >= day_start_utc,
            FoodLog.created_at <= day_end_utc,
        )
        logs = session.exec(statement).all()

    print(f"get_logs took {time_lib.time() - t0:.3f} seconds")
    return logs


@app.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        log = session.get(FoodLog, log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        if log.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your log")
        session.delete(log)
        session.commit()


@app.get("/logs-summary")
def logs_summary(tz: str = "UTC", user_id: str = Depends(get_current_user)):
    t0 = time_lib.time()
    try:
        user_tz = ZoneInfo(tz)
    except Exception:
        user_tz = ZoneInfo("UTC")

    # Get current time in user's timezone, find midnight, and convert to UTC
    now_in_tz = datetime.now(user_tz)
    midnight_in_tz = datetime.combine(now_in_tz.date(), time.min, tzinfo=user_tz)
    midnight_utc = midnight_in_tz.astimezone(timezone.utc)
    
    # Strip timezone info so it matches PostgreSQL naive timestamp comparison
    start_of_today = midnight_utc.replace(tzinfo=None)

    statement = select(FoodLog).where(
        user_id == FoodLog.user_id
    ).where(
        FoodLog.created_at >= start_of_today
    )

    with Session(engine) as session:
        logs = session.exec(statement).all()

    total_calories = sum(log.calories for log in logs)
    total_protein = sum(log.protein for log in logs)
    total_carbohydrates = sum(log.carbohydrates for log in logs)
    total_fat = sum(log.fat for log in logs)
    
    print(f"logs_summary took {time_lib.time() - t0:.3f} seconds")
    return {
        "calories": total_calories,
        "protein": total_protein,
        "carbohydrates": total_carbohydrates,
        "fat": total_fat
    }

@app.get("/analytics/weekly")
def analytics_weekly(tz: str = "UTC", user_id: str = Depends(get_current_user)):
    try:
        user_tz = ZoneInfo(tz)
    except Exception:
        user_tz = ZoneInfo("UTC")

    now_in_tz = datetime.now(user_tz)
    midnight_in_tz = datetime.combine(now_in_tz.date(), time.min, tzinfo=user_tz)
    
    start_date = (midnight_in_tz - timedelta(days=6)).astimezone(timezone.utc).replace(tzinfo=None)
    
    statement = select(FoodLog).where(
        FoodLog.user_id == user_id,
        FoodLog.created_at >= start_date
    )
    
    with Session(engine) as session:
        logs = session.exec(statement).all()

    daily_stats = {}
    for i in range(7):
        d = (now_in_tz.date() - timedelta(days=6-i))
        daily_stats[d.isoformat()] = {"calories": 0, "protein": 0, "carbohydrates": 0, "fat": 0}

    for log in logs:
        log_utc = log.created_at.replace(tzinfo=timezone.utc)
        log_local_date = log_utc.astimezone(user_tz).date().isoformat()
        if log_local_date in daily_stats:
            daily_stats[log_local_date]["calories"] += log.calories
            daily_stats[log_local_date]["protein"] += log.protein
            daily_stats[log_local_date]["carbohydrates"] += log.carbohydrates
            daily_stats[log_local_date]["fat"] += log.fat

    result = []
    for date_str, stats in daily_stats.items():
        result.append({
            "date": date_str,
            **stats
        })

    return result

@app.get("/profile", response_model=UserProfileResponse | None)
def get_profile(user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = session.exec(statement).first()
        return profile

@app.post("/profile", response_model=UserProfileResponse)
def create_profile(request: UserProfileRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        existing = session.exec(statement).first()
        if existing:
            raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")
        
        db_profile = UserProfile(
            user_id=user_id,
            **request.model_dump()
        )
        session.add(db_profile)
        session.commit()
        session.refresh(db_profile)
        return db_profile

@app.put("/profile", response_model=UserProfileResponse)
def update_profile(request: UserProfileRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = session.exec(statement).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found.")
        
        profile_data = request.model_dump()
        for key, value in profile_data.items():
            setattr(profile, key, value)
            
        profile.updated_at = datetime.now(timezone.utc)
        
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

@app.get("/recipes", response_model=list[SavedRecipeResponse])
def get_recipes(user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(SavedRecipe).where(SavedRecipe.user_id == user_id).order_by(SavedRecipe.created_at.desc())
        recipes = session.exec(statement).all()
        return recipes

@app.post("/recipes", response_model=SavedRecipeResponse)
def create_recipe(request: SavedRecipeRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        db_recipe = SavedRecipe(
            user_id=user_id,
            **request.model_dump()
        )
        session.add(db_recipe)
        session.commit()
        session.refresh(db_recipe)
        return db_recipe

@app.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        recipe = session.get(SavedRecipe, recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        if recipe.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your recipe")
        session.delete(recipe)
        session.commit()

@app.post("/recipes/{recipe_id}/log")
def log_recipe(recipe_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        recipe = session.get(SavedRecipe, recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        if recipe.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your recipe")
            
        db_log = FoodLog(
            name=recipe.name,
            user_id=user_id,
            calories=recipe.calories,
            protein=recipe.protein,
            carbohydrates=recipe.carbohydrates,
            fat=recipe.fat
        )
        session.add(db_log)
        session.commit()
        session.refresh(db_log)
        return db_log

@app.post("/weight")
def log_weight(request: WeightLogRequest, user_id: str = Depends(get_current_user)):
    db_weight = WeightLog(user_id=user_id, weight_kg=request.weight_kg)
    with Session(engine) as session:
        session.add(db_weight)
        session.commit()
        session.refresh(db_weight)
        
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = session.exec(statement).first()
        if profile:
            profile.weight_kg = request.weight_kg
            session.add(profile)
            session.commit()
            
    return db_weight

@app.get("/weight")
def get_weight_history(days: int = 30, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(WeightLog).where(WeightLog.user_id == user_id).order_by(WeightLog.logged_at.desc()).limit(days)
        logs = session.exec(statement).all()
        return logs


# --- Workout & Exercise Routes ---

import json as pyjson
from sqlalchemy.orm import selectinload

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


@app.get("/exercises/search")
def search_exercises(q: str, limit: int = 20):
    with Session(engine) as session:
        statement = select(Exercise).where(Exercise.name.ilike(f"%{q}%")).limit(limit)
        results = session.exec(statement).all()
        return results

@app.get("/exercises/{exercise_id}")
def get_exercise(exercise_id: str):
    with Session(engine) as session:
        statement = select(Exercise).where(Exercise.exercise_id == exercise_id)
        result = session.exec(statement).first()
        if not result:
            raise HTTPException(status_code=404, detail="Exercise not found")
        return result

class CalorieEstimateResponse(BaseModel):
    total_calories: int

@app.post("/workouts")
def log_workout(request: WorkoutSessionRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        # Get user weight for calorie estimation
        profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
        weight_kg = profile.weight_kg if profile else 70.0

        # Fetch exercise names
        exercise_ids = [s.exercise_id for s in request.sets]
        exercises = session.exec(select(Exercise).where(Exercise.exercise_id.in_(exercise_ids))).all()
        ex_map = {e.exercise_id: e.name for e in exercises}

        # Build prompt for LLM
        prompt_lines = [f"User weight: {weight_kg}kg", "Exercises:"]
        for s in request.sets:
            name = ex_map.get(s.exercise_id, s.exercise_id)
            details = []
            if s.sets: details.append(f"{s.sets} sets")
            if s.reps: details.append(f"{s.reps} reps")
            if s.weight_kg: details.append(f"@{s.weight_kg}kg")
            if s.duration_seconds: details.append(f"{s.duration_seconds}s")
            prompt_lines.append(f"- {name}: {' × '.join(details)}")

        system_msg = {
            "role": "system",
            "content": "You are a fitness calorie estimator. Given a user's weight and a list of exercises with sets/reps/weight, estimate total calories burned. Use MET values and exercise intensity. Be conservative. Return only the data."
        }
        
        user_msg = {
            "role": "user",
            "content": "\n".join(prompt_lines)
        }

        response = llm_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            response_format=CalorieEstimateResponse,
            messages=[system_msg, user_msg]
        )
        total_calories = response.choices[0].message.parsed.total_calories

        # Save to DB
        db_session = WorkoutSession(
            user_id=user_id,
            name=request.name,
            notes=request.notes,
            duration_minutes=request.duration_minutes,
            calories_burned=total_calories
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)

        for s in request.sets:
            db_set = WorkoutSet(
                session_id=db_session.id,
                exercise_id=s.exercise_id,
                sets=s.sets,
                reps=s.reps,
                weight_kg=s.weight_kg,
                duration_seconds=s.duration_seconds
            )
            session.add(db_set)
        
        session.commit()
        return {"session_id": db_session.id, "calories_burned": total_calories}

@app.get("/workouts")
def get_workouts(limit: int = 50, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(WorkoutSession).where(WorkoutSession.user_id == user_id).order_by(WorkoutSession.logged_at.desc()).limit(limit)
        sessions = session.exec(statement).all()
        
        # Manually fetch sets to avoid complex joins in SQLModel for now
        results = []
        for s in sessions:
            sets = session.exec(select(WorkoutSet).where(WorkoutSet.session_id == s.id)).all()
            
            # Enrich with exercise names and gifs
            enriched_sets = []
            for wset in sets:
                ex = session.exec(select(Exercise).where(Exercise.exercise_id == wset.exercise_id)).first()
                enriched_sets.append({
                    "id": wset.id,
                    "exercise_id": wset.exercise_id,
                    "name": ex.name if ex else "Unknown",
                    "gif_url": ex.gif_url if ex else None,
                    "sets": wset.sets,
                    "reps": wset.reps,
                    "weight_kg": wset.weight_kg,
                    "duration_seconds": wset.duration_seconds
                })

            results.append({
                "id": s.id,
                "name": s.name,
                "notes": s.notes,
                "duration_minutes": s.duration_minutes,
                "calories_burned": s.calories_burned,
                "logged_at": s.logged_at,
                "sets": enriched_sets
            })
            
        return results
