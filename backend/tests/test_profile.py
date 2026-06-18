from fastapi.testclient import TestClient

def test_get_profile_not_found(client: TestClient):
    response = client.get("/profile")
    assert response.status_code == 200
    assert response.json() is None

def test_create_profile(client: TestClient):
    profile_data = {
        "goal": "maintenance",
        "gender": "male",
        "age": 30,
        "height_cm": 180,
        "weight_kg": 75,
        "activity": "moderate",
        "target_calories": 2600,
        "target_protein": 150,
        "target_carbs": 300,
        "target_fat": 80
    }
    response = client.post("/profile", json=profile_data)
    assert response.status_code == 200
    data = response.json()
    assert data["goal"] == "maintenance"
    assert data["target_calories"] == 2600

def test_create_profile_already_exists(client: TestClient):
    profile_data = {
        "goal": "maintenance",
        "gender": "male",
        "age": 30,
        "height_cm": 180,
        "weight_kg": 75,
        "activity": "moderate",
        "target_calories": 2600,
        "target_protein": 150,
        "target_carbs": 300,
        "target_fat": 80
    }
    client.post("/profile", json=profile_data)
    
    # Try to create again
    response = client.post("/profile", json=profile_data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Profile already exists. Use PUT to update."

def test_update_profile(client: TestClient):
    profile_data = {
        "goal": "maintenance",
        "gender": "male",
        "age": 30,
        "height_cm": 180,
        "weight_kg": 75,
        "activity": "moderate",
        "target_calories": 2600,
        "target_protein": 150,
        "target_carbs": 300,
        "target_fat": 80
    }
    client.post("/profile", json=profile_data)
    
    update_data = {
        "goal": "cut",
        "gender": "male",
        "age": 30,
        "height_cm": 180,
        "weight_kg": 70,
        "activity": "high",
        "target_calories": 2200,
        "target_protein": 180,
        "target_carbs": 200,
        "target_fat": 60
    }
    response = client.put("/profile", json=update_data)
    assert response.status_code == 200
    assert response.json()["goal"] == "cut"
    assert response.json()["weight_kg"] == 70

def test_log_weight(client: TestClient):
    weight_data = {"weight_kg": 72.5}
    response = client.post("/weight", json=weight_data)
    assert response.status_code == 200
    assert response.json()["weight_kg"] == 72.5
    assert response.json()["user_id"] == "test_user_123"

def test_get_weight_history(client: TestClient):
    # Log multiple weights
    client.post("/weight", json={"weight_kg": 75.0})
    client.post("/weight", json={"weight_kg": 74.5})
    
    response = client.get("/weight?days=30")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["weight_kg"] == 74.5  # Ordered by desc
    assert data[1]["weight_kg"] == 75.0
