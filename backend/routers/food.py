from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlmodel import Session, select
from datetime import datetime, timezone, time, timedelta
from zoneinfo import ZoneInfo
import time as time_lib
from openai import OpenAI

from db import engine
import json
from auth import get_current_user
from models.food import FoodLog, MacroRequest, MultiItemResponse, LogMealRequest, TranscribeResponse
from prompts.ingredient_defaults import get_ingredient_defaults

router = APIRouter(tags=["food"])
llm_client = OpenAI()

@router.post("/parse-macros")
def parse_macros(request: MacroRequest, user_id: str = Depends(get_current_user)) -> MultiItemResponse:
    from services import parse_service, retrieval_service, estimation_service, clarification_service
    from models.food import NutritionItem
    
    parsed_meal = parse_service.parse(request.messages)
    
    FAT_KEYWORDS = {"oil", "butter", "ghee", "mayo", "dressing", "margarine"}
    fat_items = [
        item for item in parsed_meal.items
        if item.quantity is not None and any(f in item.canonical_name.lower() for f in FAT_KEYWORDS)
    ]
    non_fat_items = [
        item for item in parsed_meal.items
        if not any(f in item.canonical_name.lower() for f in FAT_KEYWORDS)
    ]
    
    for fat_item in fat_items:
        linked_item = None
        fat_name = fat_item.canonical_name.lower()
        
        for item in non_fat_items:
            prep_lower = (item.preparation or "").lower()
            if fat_name in prep_lower or any(f in prep_lower for f in FAT_KEYWORDS):
                linked_item = item
                break
            
            if item.modifiers:
                if any(fat_name in mod.lower() or any(f in mod.lower() for f in FAT_KEYWORDS) for mod in item.modifiers):
                    linked_item = item
                    break
                    
        if not linked_item and len(non_fat_items) == 1:
            linked_item = non_fat_items[0]
            
        if linked_item:
            linked_item.avoid_pre_fatted_candidates = True
            for kw in ["deep fried", "fried", "scrambled", "roasted", "sautéed", "sauteed"]:
                linked_item.canonical_name = linked_item.canonical_name.lower().replace(kw, "").strip()
                
    retrievals = retrieval_service.retrieve_all(parsed_meal.items, user_id)
    
    raw_query = " ".join([m.get("content", "") if isinstance(m, dict) else getattr(m, "content", "") for m in request.messages]).lower()
    clarification = clarification_service.check(retrievals, raw_query)
    
    thinking = "Parsed successfully via 4-stage pipeline."
    if clarification:
        return MultiItemResponse(
            thinking=f"Clarification needed: {clarification.question}",
            items=[NutritionItem(
                is_food=False,
                name=f"__clarification__: {clarification.question}",
                calories=0, protein=0, carbohydrates=0, fat=0,
                meal_type=None
            )]
        )
        
    estimated_items = estimation_service.estimate_all(retrievals, raw_query)
    items = []
    for est in estimated_items:
        items.append(NutritionItem(
            is_food=est.is_food,
            name=est.name,
            calories=est.macros.calories,
            protein=est.macros.protein,
            carbohydrates=est.macros.carbohydrates,
            fat=est.macros.fat,
            meal_type=est.meal_type
        ))
        
    return MultiItemResponse(thinking=thinking, items=items)

@router.post("/transcribe", response_model=TranscribeResponse)
def transcribe_audio(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    try:
        response = llm_client.audio.transcriptions.create(
            model="whisper-1",
            file=(file.filename, file.file, file.content_type)
        )
        return {"text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-meal")
def log_meal(request: LogMealRequest, user_id: str = Depends(get_current_user)):
    db_log = FoodLog(
        name=request.name,
        user_id=user_id,
        calories=request.calories,
        protein=request.protein,
        carbohydrates=request.carbohydrates,
        fat=request.fat,
        meal_type=request.meal_type,
        notes=request.reasoning
    )
    with Session(engine) as session:
        session.add(db_log)
        session.commit()
        session.refresh(db_log)

    return db_log

@router.get("/get-logs")
def get_logs(
    tz: str = "UTC",
    date: str | None = None,
    user_id: str = Depends(get_current_user)
):
    t0 = time_lib.time()
    try:
        user_tz = ZoneInfo(tz)
    except Exception:
        user_tz = ZoneInfo("UTC")

    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
    else:
        target_date = datetime.now(user_tz).date()

    day_start_utc = datetime.combine(target_date, time.min, tzinfo=user_tz).astimezone(timezone.utc).replace(tzinfo=None)
    day_end_utc = datetime.combine(target_date, time.max, tzinfo=user_tz).astimezone(timezone.utc).replace(tzinfo=None)

    with Session(engine) as session:
        statement = select(FoodLog).where(
            FoodLog.user_id == user_id,
            FoodLog.created_at >= day_start_utc,
            FoodLog.created_at <= day_end_utc,
        )
        logs = session.exec(statement).all()

    print(f"get_logs took {time_lib.time() - t0:.3f} seconds")
    return logs

@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_log(log_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        log = session.get(FoodLog, log_id)
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        if log.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your log")
        session.delete(log)
        session.commit()

@router.get("/logs-summary")
def logs_summary(tz: str = "UTC", user_id: str = Depends(get_current_user)):
    t0 = time_lib.time()
    try:
        user_tz = ZoneInfo(tz)
    except Exception:
        user_tz = ZoneInfo("UTC")

    # Get current time in user's timezone, find midnight, and convert to UTC
    now_in_tz = datetime.now(user_tz)
    midnight_in_tz = datetime.combine(now_in_tz.date(), time.min, tzinfo=user_tz)
    midnight_utc = midnight_in_tz.astimezone(timezone.utc)
    
    # Strip timezone info so it matches PostgreSQL naive timestamp comparison
    start_of_today = midnight_utc.replace(tzinfo=None)

    statement = select(FoodLog).where(
        FoodLog.user_id == user_id
    ).where(
        FoodLog.created_at >= start_of_today
    )

    with Session(engine) as session:
        logs = session.exec(statement).all()

    total_calories = sum(log.calories for log in logs)
    total_protein = sum(log.protein for log in logs)
    total_carbohydrates = sum(log.carbohydrates for log in logs)
    total_fat = sum(log.fat for log in logs)
    
    print(f"logs_summary took {time_lib.time() - t0:.3f} seconds")
    return {
        "calories": total_calories,
        "protein": total_protein,
        "carbohydrates": total_carbohydrates,
        "fat": total_fat
    }

@router.get("/analytics/weekly")
def analytics_weekly(tz: str = "UTC", user_id: str = Depends(get_current_user)):
    try:
        user_tz = ZoneInfo(tz)
    except Exception:
        user_tz = ZoneInfo("UTC")

    now_in_tz = datetime.now(user_tz)
    midnight_in_tz = datetime.combine(now_in_tz.date(), time.min, tzinfo=user_tz)
    
    start_date = (midnight_in_tz - timedelta(days=6)).astimezone(timezone.utc).replace(tzinfo=None)
    
    statement = select(FoodLog).where(
        FoodLog.user_id == user_id,
        FoodLog.created_at >= start_date
    )
    
    with Session(engine) as session:
        logs = session.exec(statement).all()

    daily_stats = {}
    for i in range(7):
        d = (now_in_tz.date() - timedelta(days=6-i))
        daily_stats[d.isoformat()] = {"calories": 0, "protein": 0, "carbohydrates": 0, "fat": 0}

    for log in logs:
        log_utc = log.created_at.replace(tzinfo=timezone.utc)
        log_local_date = log_utc.astimezone(user_tz).date().isoformat()
        if log_local_date in daily_stats:
            daily_stats[log_local_date]["calories"] += log.calories
            daily_stats[log_local_date]["protein"] += log.protein
            daily_stats[log_local_date]["carbohydrates"] += log.carbohydrates
            daily_stats[log_local_date]["fat"] += log.fat

    result = []
    for date_str, stats in daily_stats.items():
        result.append({
            "date": date_str,
            **stats
        })

    return result
