from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from openai import OpenAI

from db import engine
from auth import get_current_user
from models.fitness import Exercise, WorkoutSession, WorkoutSet, WorkoutSessionRequest, CalorieEstimateResponse, Routine, RoutineExercise, RoutineRequest, GenerateRoutineRequest
from models.profile import UserProfile

router = APIRouter(tags=["fitness"])
llm_client = OpenAI()

from sqlmodel import and_

from models.fitness import RoutineDay

@router.post("/routines/generate", response_model=RoutineRequest)
def generate_routine(request: GenerateRoutineRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        exercises = session.exec(select(Exercise.exercise_id, Exercise.name)).all()
        ex_list = "\n".join([f"- {e.exercise_id}: {e.name}" for e in exercises])
        
        system_msg = {
            "role": "system",
            "content": f"You are an expert fitness coach. The user will ask for a weekly workout routine. "
                       f"You MUST create a structured multi-day weekly routine and strictly ONLY choose exercises from the following list. "
                       f"Use the exact exercise_id provided for each exercise.\n\n"
                       f"Valid Exercises:\n{ex_list}"
        }
        user_msg = {
            "role": "user",
            "content": request.prompt
        }
        
        response = llm_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            response_format=RoutineRequest,
            messages=[system_msg, user_msg]
        )
        parsed = response.choices[0].message.parsed
        
        # Populate exercise names
        for day in parsed.days:
            for ex in day.exercises:
                db_ex = session.exec(select(Exercise).where(Exercise.exercise_id == ex.exercise_id)).first()
                if db_ex:
                    ex.name = db_ex.name
                    
        return parsed

@router.get("/routines")
def get_routines(user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        statement = select(Routine).where(Routine.user_id == user_id).order_by(Routine.created_at.desc())
        routines = session.exec(statement).all()
        
        results = []
        for r in routines:
            days_db = session.exec(select(RoutineDay).where(RoutineDay.routine_id == r.id).order_by(RoutineDay.day_number)).all()
            days_out = []
            
            for day in days_db:
                exercises = session.exec(select(RoutineExercise).where(RoutineExercise.day_id == day.id).order_by(RoutineExercise.order_index)).all()
                enriched_ex = []
                for ex in exercises:
                    db_ex = session.exec(select(Exercise).where(Exercise.exercise_id == ex.exercise_id)).first()
                    enriched_ex.append({
                        "id": ex.id,
                        "exercise_id": ex.exercise_id,
                        "name": db_ex.name if db_ex else "Unknown",
                        "gif_url": db_ex.gif_url if db_ex else None,
                        "sets": ex.sets,
                        "reps": ex.reps,
                        "weight_kg": ex.weight_kg,
                        "duration_seconds": ex.duration_seconds
                    })
                
                days_out.append({
                    "id": day.id,
                    "day_number": day.day_number,
                    "title": day.title,
                    "focus": day.focus,
                    "exercises": enriched_ex
                })
            
            results.append({
                "id": r.id,
                "name": r.name,
                "description": r.description,
                "created_at": r.created_at,
                "days": days_out
            })
        return results

@router.post("/routines")
def save_routine(request: RoutineRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        db_routine = Routine(
            user_id=user_id,
            name=request.name,
            description=request.description
        )
        session.add(db_routine)
        session.commit()
        session.refresh(db_routine)
        
        for day_req in request.days:
            db_day = RoutineDay(
                routine_id=db_routine.id,
                day_number=day_req.day_number,
                title=day_req.title,
                focus=day_req.focus
            )
            session.add(db_day)
            session.commit()
            session.refresh(db_day)
            
            for idx, ex in enumerate(day_req.exercises):
                db_ex = RoutineExercise(
                    day_id=db_day.id,
                    exercise_id=ex.exercise_id,
                    sets=ex.sets,
                    reps=ex.reps,
                    weight_kg=ex.weight_kg,
                    duration_seconds=ex.duration_seconds,
                    order_index=idx
                )
                session.add(db_ex)
            
        session.commit()
        return {"routine_id": db_routine.id}

@router.delete("/routines/{routine_id}")
def delete_routine(routine_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        routine = session.get(Routine, routine_id)
        if not routine or routine.user_id != user_id:
            raise HTTPException(status_code=404, detail="Routine not found")
            
        days = session.exec(select(RoutineDay).where(RoutineDay.routine_id == routine_id)).all()
        for day in days:
            exercises = session.exec(select(RoutineExercise).where(RoutineExercise.day_id == day.id)).all()
            for ex in exercises:
                session.delete(ex)
            session.delete(day)
            
        session.delete(routine)
        session.commit()
        return {"status": "success"}

@router.get("/exercises/search")
def search_exercises(q: str, limit: int = 20):
    with Session(engine) as session:
        words = q.split()
        conditions = [Exercise.name.ilike(f"%{w}%") for w in words]
        statement = select(Exercise).where(and_(*conditions)).limit(limit)
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

@router.delete("/workouts/{session_id}")
def delete_workout(session_id: int, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        workout = session.get(WorkoutSession, session_id)
        if not workout or workout.user_id != user_id:
            raise HTTPException(status_code=404, detail="Workout not found")
            
        sets = session.exec(select(WorkoutSet).where(WorkoutSet.session_id == session_id)).all()
        for wset in sets:
            session.delete(wset)
            
        session.delete(workout)
        session.commit()
        return {"status": "success"}

@router.put("/workouts/{session_id}")
def update_workout(session_id: int, request: WorkoutSessionRequest, user_id: str = Depends(get_current_user)):
    with Session(engine) as session:
        db_session = session.get(WorkoutSession, session_id)
        if not db_session or db_session.user_id != user_id:
            raise HTTPException(status_code=404, detail="Workout not found")
            
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

        # Update session details
        db_session.name = request.name
        db_session.notes = request.notes
        db_session.duration_minutes = request.duration_minutes
        db_session.calories_burned = total_calories

        # Delete old sets
        old_sets = session.exec(select(WorkoutSet).where(WorkoutSet.session_id == session_id)).all()
        for wset in old_sets:
            session.delete(wset)
            
        # Add new sets
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
