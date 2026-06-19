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
    assert data["name"] == "Test Workout"
    assert "id" in data

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
        json={"name": "Test Workout", "duration_minutes": 45, "sets": []},
        headers={"Authorization": "Bearer test_user"}
    )
    assert create_response.status_code == 200
    workout_id = create_response.json()["id"]

    update_response = client.put(
        f"/workouts/{workout_id}",
        json={
            "name": "Updated Workout",
            "duration_minutes": 60,
            "sets": []
        },
        headers={"Authorization": "Bearer test_user"}
    )
    assert update_response.status_code == 200
    data = update_response.json()
    assert data["name"] == "Updated Workout"
    assert data["duration_minutes"] == 60

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_delete_workout(mock_parse, client: TestClient):
    mock_msg = MagicMock()
    mock_msg.message.parsed.total_calories = 450
    mock_parse.return_value.choices = [mock_msg]

    create_response = client.post(
        "/workouts",
        json={"name": "Test Workout", "duration_minutes": 45, "sets": []},
        headers={"Authorization": "Bearer test_user"}
    )
    assert create_response.status_code == 200
    workout_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/workouts/{workout_id}",
        headers={"Authorization": "Bearer test_user"}
    )
    assert delete_response.status_code == 200

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_generate_routine(mock_parse, client: TestClient):
    mock_msg = MagicMock()
    mock_msg.message.parsed.days = [
        MagicMock(name="Day 1", notes="Push", exercises=[
            MagicMock(exercise_id="bench_123", sets=3, reps=10, weight_kg=50.0, duration_seconds=None)
        ])
    ]
    mock_msg.message.parsed.dict.return_value = {
        "days": [
            {
                "name": "Day 1",
                "notes": "Push",
                "exercises": [
                    {"exercise_id": "bench_123", "sets": 3, "reps": 10, "weight_kg": 50.0, "duration_seconds": None, "name": "Bench Press"}
                ]
            }
        ]
    }
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
