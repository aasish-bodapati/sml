from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from openai import OpenAI

from db import engine
from auth import get_current_user
from models.fitness import Exercise, WorkoutSession, WorkoutSet, WorkoutSessionRequest, CalorieEstimateResponse
from models.profile import UserProfile

router = APIRouter(tags=["fitness"])
llm_client = OpenAI()

@router.get("/exercises/search")
def search_exercises(q: str, limit: int = 20):
    with Session(engine) as session:
        statement = select(Exercise).where(Exercise.name.ilike(f"%{q}%")).limit(limit)
        results = session.exec(statement).all()
        return results

@router.get("/exercises/{exercise_id}")
def get_exercise(exercise_id: str):
    with Session(engine) as session:
        statement = select(Exercise).where(Exercise.exercise_id == exercise_id)
        result = session.exec(statement).first()
        if not result:
            raise HTTPException(status_code=404, detail="Exercise not found")
        return result

@router.post("/workouts")
def log_workout(request: WorkoutSessionRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        # Get user weight for calorie estimation
        profile = session.exec(select(UserProfile).where(UserProfile.user_id == user_id)).first()
        weight_kg = profile.weight_kg if profile else 70.0

        # Fetch exercise names
        exercise_ids = [s.exercise_id for s in request.sets]
        exercises = session.exec(select(Exercise).where(Exercise.exercise_id.in_(exercise_ids))).all()
        ex_map = {e.exercise_id: e.name for e in exercises}

        # Build prompt for LLM
        prompt_lines = [f"User weight: {weight_kg}kg", "Exercises:"]
        for s in request.sets:
            name = ex_map.get(s.exercise_id, s.exercise_id)
            details = []
            if s.sets: details.append(f"{s.sets} sets")
            if s.reps: details.append(f"{s.reps} reps")
            if s.weight_kg: details.append(f"@{s.weight_kg}kg")
            if s.duration_seconds: details.append(f"{s.duration_seconds}s")
            prompt_lines.append(f"- {name}: {' × '.join(details)}")

        system_msg = {
            "role": "system",
            "content": "You are a fitness calorie estimator. Given a user's weight and a list of exercises with sets/reps/weight, estimate total calories burned. Use MET values and exercise intensity. Be conservative. Return only the data."
        }
        
        user_msg = {
            "role": "user",
            "content": "\n".join(prompt_lines)
        }

        response = llm_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            response_format=CalorieEstimateResponse,
            messages=[system_msg, user_msg]
        )
        total_calories = response.choices[0].message.parsed.total_calories

        # Save to DB
        db_session = WorkoutSession(
            user_id=user_id,
            name=request.name,
            notes=request.notes,
            duration_minutes=request.duration_minutes,
            calories_burned=total_calories
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)

        for s in request.sets:
            db_set = WorkoutSet(
                session_id=db_session.id,
                exercise_id=s.exercise_id,
                sets=s.sets,
                reps=s.reps,
                weight_kg=s.weight_kg,
                duration_seconds=s.duration_seconds
            )
            session.add(db_set)
        
        session.commit()
        return {"session_id": db_session.id, "calories_burned": total_calories}

@router.get("/workouts")
def get_workouts(limit: int = 50, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(WorkoutSession).where(WorkoutSession.user_id == user_id).order_by(WorkoutSession.logged_at.desc()).limit(limit)
        sessions = session.exec(statement).all()
        
        # Manually fetch sets to avoid complex joins in SQLModel for now
        results = []
        for s in sessions:
            sets = session.exec(select(WorkoutSet).where(WorkoutSet.session_id == s.id)).all()
            
            # Enrich with exercise names and gifs
            enriched_sets = []
            for wset in sets:
                ex = session.exec(select(Exercise).where(Exercise.exercise_id == wset.exercise_id)).first()
                enriched_sets.append({
                    "id": wset.id,
                    "exercise_id": wset.exercise_id,
                    "name": ex.name if ex else "Unknown",
                    "gif_url": ex.gif_url if ex else None,
                    "sets": wset.sets,
                    "reps": wset.reps,
                    "weight_kg": wset.weight_kg,
                    "duration_seconds": wset.duration_seconds
                })

            results.append({
                "id": s.id,
                "name": s.name,
                "notes": s.notes,
                "duration_minutes": s.duration_minutes,
                "calories_burned": s.calories_burned,
                "logged_at": s.logged_at,
                "sets": enriched_sets
            })
            
        return results
