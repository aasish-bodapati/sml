from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_create_workout(mock_parse, client: TestClient):
    mock_msg = MagicMock()
    mock_msg.message.parsed.total_calories = 450
    mock_parse.return_value.choices = [mock_msg]

    response = client.post(
        "/workouts",
        json={
            "name": "Test Workout",
            "duration_minutes": 45,
            "sets": [
                {
                    "exercise_id": "squat_123",
                    "sets": 3,
                    "reps": 10,
                    "weight_kg": 50.0
                }
            ]
        },
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert "calories_burned" in data

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_get_workouts(mock_parse, client: TestClient):
    mock_msg = MagicMock()
    mock_msg.message.parsed.total_calories = 450
    mock_parse.return_value.choices = [mock_msg]

    client.post(
        "/workouts",
        json={"name": "Test Workout", "duration_minutes": 45, "sets": []},
        headers={"Authorization": "Bearer test_user"}
    )
    
    response = client.get(
        "/workouts",
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_update_workout(mock_parse, client: TestClient):
    mock_msg = MagicMock()
    mock_msg.message.parsed.total_calories = 450
    mock_parse.return_value.choices = [mock_msg]

    create_response = client.post(
        "/workouts",
        json={"name": "Test Workout", "duration_minutes": 45, "sets": [{"exercise_id": "squat_123", "sets": 3, "reps": 10}]},
        headers={"Authorization": "Bearer test_user"}
    )
    assert create_response.status_code == 200
    workout_id = create_response.json()["session_id"]

    update_response = client.put(
        f"/workouts/{workout_id}",
        json={
            "name": "Updated Workout",
            "duration_minutes": 60,
            "sets": [{"exercise_id": "squat_123", "sets": 3, "reps": 12}]
        },
        headers={"Authorization": "Bearer test_user"}
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert "session_id" in data
    assert "calories_burned" in data

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_delete_workout(mock_parse, client: TestClient):
    mock_msg = MagicMock()
    mock_msg.message.parsed.total_calories = 450
    mock_parse.return_value.choices = [mock_msg]

    create_response = client.post(
        "/workouts",
        json={"name": "Test Workout", "duration_minutes": 45, "sets": [{"exercise_id": "squat_123", "sets": 3, "reps": 10}]},
        headers={"Authorization": "Bearer test_user"}
    )
    assert create_response.status_code == 200
    workout_id = create_response.json()["session_id"]

    delete_response = client.delete(
        f"/workouts/{workout_id}",
        headers={"Authorization": "Bearer test_user"}
    )
    assert delete_response.status_code == 200

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_generate_routine(mock_parse, client: TestClient, session):
    from models.fitness import Exercise, RoutineRequest, RoutineDayRequest, RoutineExerciseRequest
    
    # Add exercise to DB to cover name population
    ex_db = Exercise(
        exercise_id="bench_123",
        name="Bench Press",
        gif_url="http://example.com/bench.gif",
        body_parts="chest",
        equipments="barbell",
        target_muscles="chest",
        secondary_muscles="triceps",
        instructions="Push it up"
    )
    session.add(ex_db)
    session.commit()

    mock_msg = MagicMock()
    mock_msg.message.parsed = RoutineRequest(
        name="Test Routine",
        description="A test routine",
        days=[
            RoutineDayRequest(
                day_number=1,
                title="Day 1",
                focus="Push",
                exercises=[
                    RoutineExerciseRequest(
                        exercise_id="bench_123",
                        sets=3,
                        reps=10,
                        weight_kg=50.0,
                        duration_seconds=None
                    )
                ]
            )
        ]
    )
    mock_parse.return_value.choices = [mock_msg]

    response = client.post(
        "/routines/generate",
        json={
            "prompt": "I want a 3 day split focusing on strength"
        },
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "days" in data
    assert data["days"][0]["exercises"][0]["name"] == "Bench Press"


def test_get_routines(client: TestClient):
    client.post(
        "/routines",
        json={
            "name": "To Delete",
            "description": "Will be deleted",
            "days": [
                {
                    "day_number": 1,
                    "title": "Leg Day",
                    "focus": "Legs",
                    "exercises": [
                        {
                            "exercise_id": "squat_123",
                            "sets": 3,
                            "reps": 10,
                            "weight_kg": 100,
                            "duration_seconds": None
                        }
                    ]
                }
            ]
        },
        headers={"Authorization": "Bearer test_user"}
    )
    response = client.get(
        "/routines",
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_save_routine(client: TestClient):
    response = client.post(
        "/routines",
        json={
            "name": "My New Routine",
            "description": "Legs and Core",
            "days": [
                {
                    "day_number": 1,
                    "title": "Leg Day",
                    "focus": "Legs",
                    "exercises": [
                        {
                            "exercise_id": "squat_123",
                            "sets": 3,
                            "reps": 10,
                            "weight_kg": 100,
                            "duration_seconds": None
                        }
                    ]
                }
            ]
        },
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 200
    assert "routine_id" in response.json()

def test_delete_routine(client: TestClient):
    create_resp = client.post(
        "/routines",
        json={
            "name": "To Delete",
            "description": "Will be deleted",
            "days": [
                {
                    "day_number": 1,
                    "title": "Leg Day",
                    "focus": "Legs",
                    "exercises": [
                        {
                            "exercise_id": "squat_123",
                            "sets": 3,
                            "reps": 10,
                            "weight_kg": 100,
                            "duration_seconds": None
                        }
                    ]
                }
            ]
        },
        headers={"Authorization": "Bearer test_user"}
    )
    assert create_resp.status_code == 200
    routine_id = create_resp.json()["routine_id"]
    
    del_resp = client.delete(
        f"/routines/{routine_id}",
        headers={"Authorization": "Bearer test_user"}
    )
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "success"

def test_delete_workout_not_found(client: TestClient):
    response = client.delete(
        "/workouts/99999",
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 404

def test_update_workout_not_found(client: TestClient):
    response = client.put(
        "/workouts/99999",
        json={"name": "Ghost", "duration_minutes": 10, "sets": []},
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 404

def test_get_exercise_not_found(client: TestClient):
    response = client.get(
        "/exercises/fake_exercise_id",
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 404

def test_delete_routine_not_found(client: TestClient):
    response = client.delete(
        "/routines/99999",
        headers={"Authorization": "Bearer test_user"}
    )
    assert response.status_code == 404

def test_get_exercise_success(client: TestClient, session):
    from models.fitness import Exercise
    ex_db = Exercise(
        exercise_id="squat_123",
        name="Squat",
        gif_url="http://example.com/squat.gif",
        body_parts="legs",
        equipments="barbell",
        target_muscles="quads",
        secondary_muscles="glutes",
        instructions="Squat down"
    )
    session.add(ex_db)
    session.commit()
    
    response = client.get("/exercises/squat_123")
    assert response.status_code == 200
    assert response.json()["name"] == "Squat"

