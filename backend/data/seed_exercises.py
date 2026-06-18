"""
Seed script to read downloaded ExerciseDB data and insert into Supabase.
"""
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlmodel import Session, create_engine, select
from main import Exercise

load_dotenv()
engine = create_engine(os.getenv("DATABASE_URL"))

DATA_PATH = Path(__file__).parent / "exercisedb_full.json"

def seed_exercises():
    print(f"Loading {DATA_PATH}...")
    with open(DATA_PATH) as f:
        exercises = json.load(f)
    
    print(f"Loaded {len(exercises)} exercises from JSON.")
    
    with Session(engine) as session:
        # Get existing exercise IDs to avoid duplicates
        existing_ids = session.exec(select(Exercise.exercise_id)).all()
        existing_set = set(existing_ids)
        print(f"Found {len(existing_set)} existing exercises in DB.")
        
        new_exercises = []
        for e in exercises:
            if e["exerciseId"] in existing_set:
                continue
                
            db_ex = Exercise(
                exercise_id=e["exerciseId"],
                name=e["name"],
                gif_url=e["gifUrl"],
                body_parts=json.dumps(e["bodyParts"]),
                equipments=json.dumps(e["equipments"]),
                target_muscles=json.dumps(e["targetMuscles"]),
                secondary_muscles=json.dumps(e.get("secondaryMuscles", [])),
                instructions=json.dumps(e.get("instructions", []))
            )
            new_exercises.append(db_ex)
            
        if new_exercises:
            print(f"Inserting {len(new_exercises)} new exercises...")
            session.add_all(new_exercises)
            session.commit()
            print("Successfully seeded exercises.")
        else:
            print("No new exercises to insert.")

if __name__ == "__main__":
    seed_exercises()
