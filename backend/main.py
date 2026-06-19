from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel
from contextlib import asynccontextmanager

from db import engine

from routers.food import router as food_router
from routers.recipes import router as recipes_router
from routers.profile import router as profile_router
from routers.fitness import router as fitness_router

# Ensure all models are imported so SQLModel.metadata registers them
from models import food, profile, fitness

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database migrations are now entirely handled by Alembic.
    yield
    engine.dispose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(food_router)
app.include_router(recipes_router)
app.include_router(profile_router)
app.include_router(fitness_router)

@app.get("/")
def get_health():
    return {"status_code": 200, "status": "running"}
