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
from datetime import datetime, timezone, time
from zoneinfo import ZoneInfo
from contextlib import asynccontextmanager








load_dotenv()

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_ALGORITHM = "HS256"

# Supabase JWKS configuration for ES256 verification
JWKS_URL = "https://xpyzowlshriupianmuit.supabase.co/auth/v1/.well-known/jwks.json"
jwk_client = PyJWKClient(JWKS_URL)


engine= create_engine(os.getenv("DATABASE_URL"))

llm_client = OpenAI()

security = HTTPBearer()



def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        # Fetch the public key from the JWKS endpoint
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        
        # Verify the signature using the public key and ES256 algorithm
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            options={"verify_aud": False}
        )
        
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


class FoodLog(SQLModel, table = True):
    id: int | None= Field(default= None, primary_key= True)
    user_id: str = Field(index= True)
    name: str
    calories: int
    protein: int
    carbohydrates: int
    fat: int
    notes: str | None= Field(default= None)
    created_at: datetime = Field(
        sa_column_kwargs = {"server_default": text("TIMEZONE('utc', now())")}
    )






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



@app.post("/calculate-macros")
def calculate_macros(request: MacroRequest, user_id: str = Depends(get_current_user)) -> NutritionResponse:
    response = llm_client.beta.chat.completions.parse(
        model= "gpt-4o-mini",
        response_format= NutritionResponse,
        messages= [{
            "role": "system",
            "content": "You are a strict nutrition tracker. First, determine if the user input describes a recognizable food item. If it is gibberish, a non-food object (like 'table', 'car'), or completely unrelated, set is_food to False and all macros to 0. If it is a food, set is_food to True and calculate the macros."
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

    db_log = FoodLog(
        name = parsed_macros.name,
        user_id = user_id,
        calories = parsed_macros.calories,
        protein = parsed_macros.protein,
        carbohydrates = parsed_macros.carbohydrates,
        fat = parsed_macros.fat
    )
    with Session(engine) as session:
        session.add(db_log)
        session.commit()
        session.refresh(db_log)

    return parsed_macros



@app.get("/get-logs")
def get_logs(
    tz: str = "UTC",
    date: str | None = None,
    user_id: str = Depends(get_current_user)
):
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
    
    return {
        "calories": total_calories,
        "protein": total_protein,
        "carbohydrates": total_carbohydrates,
        "fat": total_fat
    }
