from fastapi.testclient import TestClient

def test_recipes_crud(client: TestClient):
    # 1. Create a recipe
    recipe_data = {
        "name": "Protein Shake",
        "calories": 250,
        "protein": 30,
        "carbohydrates": 10,
        "fat": 5
    }
    response = client.post("/recipes", json=recipe_data)
    assert response.status_code == 200
    created = response.json()
    assert created["name"] == "Protein Shake"
    recipe_id = created["id"]

    # 2. Get recipes
    response = client.get("/recipes")
    assert response.status_code == 200
    recipes = response.json()
    assert len(recipes) == 1
    assert recipes[0]["name"] == "Protein Shake"

    # 3. Log a recipe
    response = client.post(f"/recipes/{recipe_id}/log")
    assert response.status_code == 200
    log = response.json()
    assert log["name"] == "Protein Shake"
    assert log["calories"] == 250

    # 4. Delete the recipe
    response = client.delete(f"/recipes/{recipe_id}")
    assert response.status_code == 204

    # 5. Verify it's deleted
    response = client.get("/recipes")
    assert response.status_code == 200
    assert len(response.json()) == 0

def test_recipe_not_found(client: TestClient):
    response = client.delete("/recipes/999")
    assert response.status_code == 404

    response = client.post("/recipes/999/log")
    assert response.status_code == 404
