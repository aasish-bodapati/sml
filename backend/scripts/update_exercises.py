import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import json
from sqlmodel import Session, select
from main import engine
from models.fitness import Exercise, WorkoutSet
from dotenv import load_dotenv

def main():
    load_dotenv()
    with open("data/exercisedb_cleaned.json") as f:
        cleaned = json.load(f)

    lookup = {ex["exerciseId"]: ex["name"] for ex in cleaned}

    with Session(engine) as session:
        # We need to see if there are any WorkoutSets referencing exercises we want to delete
        workout_sets = session.exec(select(WorkoutSet.exercise_id)).all()
        used_exercise_ids = set(workout_sets)

        exercises = session.exec(select(Exercise)).all()
        updated = 0
        deleted = 0
        skipped_delete = 0
        
        for ex in exercises:
            if ex.exercise_id in lookup:
                # Update name
                if ex.name != lookup[ex.exercise_id]:
                    ex.name = lookup[ex.exercise_id]
                    updated += 1
            else:
                # We need to delete this exercise since it didn't make the cut
                if ex.exercise_id in used_exercise_ids:
                    skipped_delete += 1
                else:
                    session.delete(ex)
                    deleted += 1
                    
        session.commit()
        print(f"Updated {updated} exercise names.")
        print(f"Deleted {deleted} unused obscure exercises.")
        if skipped_delete > 0:
            print(f"Skipped deleting {skipped_delete} exercises because you have already logged workouts using them!")

if __name__ == "__main__":
    main()
