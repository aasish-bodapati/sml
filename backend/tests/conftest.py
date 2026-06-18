import os
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from sqlmodel.pool import StaticPool

# Setup the in-memory engine before db is imported
sqlite_url = "sqlite:///:memory:"
test_engine = create_engine(
    sqlite_url, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

# Patch the db.engine BEFORE importing main
import db
db.engine = test_engine

# Also need to patch it in the routers that use it directly
import routers.food
routers.food.engine = test_engine
import routers.fitness
routers.fitness.engine = test_engine
import routers.profile
routers.profile.engine = test_engine
import routers.recipes
routers.recipes.engine = test_engine

from main import app
from auth import get_current_user

# Mock user for testing
TEST_USER_ID = "test_user_123"

def override_get_current_user():
    return TEST_USER_ID

app.dependency_overrides[get_current_user] = override_get_current_user

@pytest.fixture(name="session")
def session_fixture():
    # Because lifespan creates tables, we will yield the session here
    with Session(test_engine) as session:
        yield session

@pytest.fixture(name="client")
def client_fixture():
    with TestClient(app) as client:
        # Tables are created and dropped by main's lifespan
        yield client

