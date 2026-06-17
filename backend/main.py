from fastapi import FastAPI, Header, Depends, HTTPException, status
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





class MacroRequest(BaseModel):
    user_input: str


class NutritionResponse(BaseModel):
    is_food: bool
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    meal_type: str | None = Field(default=None)


class LogMealRequest(BaseModel):
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    meal_type: str | None = None


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
def parse_macros(request: MacroRequest, user_id: str = Depends(get_current_user)) -> NutritionResponse:
    embed_response = llm_client.embeddings.create(
        model="text-embedding-3-small",
        input=request.user_input
    )
    user_embedding = embed_response.data[0].embedding
    
    with Session(engine) as session:
        statement = select(UsdaFood).order_by(UsdaFood.embedding.cosine_distance(user_embedding)).limit(5)
        top_foods = session.exec(statement).all()
        
    context_str = "USDA Reference Foods (per 100g):\n"
    for food in top_foods:
        context_str += f"- {food.description}: {food.calories}kcal, Protein {food.protein}g, Carbs {food.carbs}g, Fat {food.fat}g\n"
        
    system_prompt = f"""You are a strict nutrition tracker. First, determine if the user input describes a recognizable food item. If it is gibberish, a non-food object, or completely unrelated, set is_food to False and all macros to 0. If it is a food, set is_food to True and calculate the macros. Also infer the meal_type from context clues (e.g., 'breakfast', 'lunch', 'dinner', 'snack') if possible, otherwise leave it null.

Use the following USDA foundation food reference data to improve your accuracy. The reference data is strictly per 100g. Estimate the weight of the user's food and scale the macros appropriately.

{context_str}"""

    response = llm_client.beta.chat.completions.parse(
        model= "gpt-4o-mini",
        response_format= NutritionResponse,
        messages= [{
            "role": "system",
            "content": system_prompt
        }, 
        {
            "role": "user",
            "content": request.user_input
        }]
    )
    
    parsed_macros = response.choices[0].message.parsed

    if not parsed_macros.is_food:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="We couldn't recognize that as food. Please describe a meal!"
        )

    return parsed_macros

@app.post("/log-meal")
def log_meal(request: LogMealRequest, user_id: str = Depends(get_current_user)):
    db_log = FoodLog(
        name=request.name,
        user_id=user_id,
        calories=request.calories,
        protein=request.protein,
        carbohydrates=request.carbohydrates,
        fat=request.fat,
        meal_type=request.meal_type
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
