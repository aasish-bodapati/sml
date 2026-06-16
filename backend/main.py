from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, create_engine, select, text
from dotenv import load_dotenv
import os
from openai import OpenAI
from pydantic import BaseModel
from datetime import datetime, timezone
from contextlib import asynccontextmanager







load_dotenv()

engine= create_engine(os.getenv("DATABASE_URL"))

llm_client = OpenAI()






class MacroRequest(BaseModel):
    user_input: str


class NutritionResponse(BaseModel):
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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)










@app.get("/")
def get_health():
    return {"status_code": 200, "status": "running"}



@app.post("/calculate-macros")
def calculate_macros(request: MacroRequest, x_user_id: str = Header(...)) -> NutritionResponse:
    response = llm_client.beta.chat.completions.parse(
        model= "gpt-4o-mini",
        response_format= NutritionResponse,
        messages= [{
            "role": "system",
            "content": "You are a nutrition tracker who takes in user input in NLP and reutns the macros of the meal"
        }, 
        {
            "role": "user",
            "content": request.user_input
        }]
    )
    
    parsed_macros = response.choices[0].message.parsed


    db_log = FoodLog(
        name = parsed_macros.name,
        user_id = x_user_id,
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
def get_logs(x_user_id: str= Header(...)):
    with Session(engine) as session:
        statement= select(FoodLog).where(FoodLog.user_id == x_user_id)
        logs = session.exec(statement).all()

    return logs


@app.get("/logs-summary")
def logs_summary(x_user_id: str =Header(...)):
    start_of_today = datetime.now(timezone.utc).replace(hour= 0, minute= 0, second= 0, microsecond= 0)


    statement= select(FoodLog).where(
        x_user_id == FoodLog.user_id
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


        