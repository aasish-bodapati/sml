from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone

def test_food_logs_crud(client: TestClient):
    # Log a meal
    log_data = {
        "name": "Oatmeal",
        "calories": 300,
        "protein": 10,
        "carbohydrates": 50,
        "fat": 5,
        "meal_type": "breakfast",
        "reasoning": "Standard bowl"
    }
    response = client.post("/log-meal", json=log_data)
    assert response.status_code == 200
    log = response.json()
    assert log["name"] == "Oatmeal"
    assert log["calories"] == 300
    log_id = log["id"]

    # Get logs
    response = client.get("/get-logs")
    assert response.status_code == 200
    logs = response.json()
    assert len(logs) == 1
    assert logs[0]["name"] == "Oatmeal"

    # Get logs summary
    response = client.get("/logs-summary")
    assert response.status_code == 200
    summary = response.json()
    assert summary["calories"] == 300
    assert summary["protein"] == 10

    # Get analytics
    response = client.get("/analytics/weekly")
    assert response.status_code == 200
    analytics = response.json()
    assert len(analytics) == 7
    # One of the days should have calories = 300
    assert any(day["calories"] == 300 for day in analytics)

    # Delete log
    response = client.delete(f"/logs/{log_id}")
    assert response.status_code == 204

    # Verify deleted
    response = client.get("/get-logs")
    assert len(response.json()) == 0

@patch("routers.food.llm_client.beta.chat.completions.parse")
def test_parse_macros(mock_parse, client: TestClient):
    # Mock the LLM response
    mock_msg = MagicMock()
    mock_msg.message.parsed.thinking = "Thinking process"
    mock_msg.message.parsed.items = [{
        "name": "Chicken Salad",
        "calories": 400,
        "protein": 30,
        "carbohydrates": 10,
        "fat": 20,
        "meal_type": "lunch",
        "reasoning": "Standard serving",
        "is_food": True
    }]
    mock_parse.return_value.choices = [mock_msg]

    request_data = {
        "messages": [
            {"role": "user", "content": "I had a chicken salad"}
        ]
    }
    response = client.post("/parse-macros", json=request_data)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "Chicken Salad"
    mock_parse.assert_called_once()

@patch("routers.food.llm_client.audio.transcriptions.create")
def test_transcribe_audio(mock_transcribe, client: TestClient):
    mock_transcribe.return_value.text = "I ate an apple"
    
    # We need to send a dummy file
    files = {"file": ("test.wav", b"dummy audio content", "audio/wav")}
    response = client.post("/transcribe", files=files)
    
    assert response.status_code == 200
    assert response.json() == {"text": "I ate an apple"}
    mock_transcribe.assert_called_once()
