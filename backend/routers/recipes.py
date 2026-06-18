from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from db import engine
from auth import get_current_user
from models.food import SavedRecipe, SavedRecipeRequest, SavedRecipeResponse, FoodLog

router = APIRouter(prefix="/recipes", tags=["recipes"])

@router.get("", response_model=list[SavedRecipeResponse])
def get_recipes(user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(SavedRecipe).where(SavedRecipe.user_id == user_id).order_by(SavedRecipe.created_at.desc())
        recipes = session.exec(statement).all()
        return recipes

@router.post("", response_model=SavedRecipeResponse)
def create_recipe(request: SavedRecipeRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        db_recipe = SavedRecipe(
            user_id=user_id,
            **request.model_dump()
        )
        session.add(db_recipe)
        session.commit()
        session.refresh(db_recipe)
        return db_recipe

@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        recipe = session.get(SavedRecipe, recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        if recipe.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your recipe")
        session.delete(recipe)
        session.commit()

@router.post("/{recipe_id}/log")
def log_recipe(recipe_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        recipe = session.get(SavedRecipe, recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        if recipe.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your recipe")
            
        db_log = FoodLog(
            name=recipe.name,
            user_id=user_id,
            calories=recipe.calories,
            protein=recipe.protein,
            carbohydrates=recipe.carbohydrates,
            fat=recipe.fat
        )
        session.add(db_log)
        session.commit()
        session.refresh(db_log)
        return db_log
