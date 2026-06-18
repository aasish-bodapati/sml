from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

def test_exercises_search(client: TestClient):
    # Depending on whether there are exercises seeded in the in-memory DB or not,
    # this will return an empty list or some results. Since we start fresh, it's likely empty.
    response = client.get("/exercises/search?q=squat")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_exercise_not_found(client: TestClient):
    response = client.get("/exercises/nonexistent")
    assert response.status_code == 404

@patch("routers.fitness.llm_client.beta.chat.completions.parse")
def test_log_workout_and_get(mock_parse, client: TestClient):
    # Mock LLM calorie estimation
    mock_msg = MagicMock()
    mock_msg.message.parsed.total_calories = 450
    mock_parse.return_value.choices = [mock_msg]

    workout_data = {
        "name": "Leg Day",
        "notes": "Felt good",
        "duration_minutes": 60,
        "sets": [
            {
                "exercise_id": "squat_123",
                "sets": 3,
                "reps": 10,
                "weight_kg": 100,
                "duration_seconds": None
            }
        ]
    }
    
    # Post workout
    response = client.post("/workouts", json=workout_data)
    assert response.status_code == 200
    result = response.json()
    assert result["calories_burned"] == 450
    assert "session_id" in result
    mock_parse.assert_called_once()

    # Get workouts
    response = client.get("/workouts")
    assert response.status_code == 200
    workouts = response.json()
    assert len(workouts) == 1
    assert workouts[0]["name"] == "Leg Day"
    assert workouts[0]["calories_burned"] == 450
    assert len(workouts[0]["sets"]) == 1
    assert workouts[0]["sets"][0]["exercise_id"] == "squat_123"
    assert workouts[0]["sets"][0]["weight_kg"] == 100
