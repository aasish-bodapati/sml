from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime, timezone

from db import engine
from auth import get_current_user
from models.profile import UserProfile, UserProfileRequest, UserProfileResponse, WeightLog, WeightLogRequest

router = APIRouter(tags=["profile"])

@router.get("/profile", response_model=UserProfileResponse | None)
def get_profile(user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = session.exec(statement).first()
        return profile

@router.post("/profile", response_model=UserProfileResponse)
def create_profile(request: UserProfileRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        existing = session.exec(statement).first()
        if existing:
            raise HTTPException(status_code=400, detail="Profile already exists. Use PUT to update.")
        
        db_profile = UserProfile(
            user_id=user_id,
            **request.model_dump()
        )
        session.add(db_profile)
        session.commit()
        session.refresh(db_profile)
        return db_profile

@router.put("/profile", response_model=UserProfileResponse)
def update_profile(request: UserProfileRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = session.exec(statement).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found.")
        
        profile_data = request.model_dump()
        for key, value in profile_data.items():
            setattr(profile, key, value)
            
        profile.updated_at = datetime.now(timezone.utc)
        
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

@router.post("/weight")
def log_weight(request: WeightLogRequest, user_id: str = Depends(get_current_user)):
    db_weight = WeightLog(user_id=user_id, weight_kg=request.weight_kg)
    with Session(engine) as session:
        session.add(db_weight)
        session.commit()
        session.refresh(db_weight)
        
        statement = select(UserProfile).where(UserProfile.user_id == user_id)
        profile = session.exec(statement).first()
        if profile:
            profile.weight_kg = request.weight_kg
            profile.updated_at = datetime.now(timezone.utc)
            session.add(profile)
            session.commit()
            
    return db_weight

@router.get("/weight")
def get_weight_history(days: int = 30, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(WeightLog).where(WeightLog.user_id == user_id).order_by(WeightLog.logged_at.desc()).limit(days)
        logs = session.exec(statement).all()
        return logs
