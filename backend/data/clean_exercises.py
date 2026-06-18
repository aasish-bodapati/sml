import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel

# Add backend to path so we can import the OpenAI client
sys.path.append(str(Path(__file__).resolve().parent.parent))
from routers.food import llm_client

class CleanedExercise(BaseModel):
    exercise_id: str
    standard_name: str

class CleanedExerciseList(BaseModel):
    exercises: list[CleanedExercise]

def clean():
    load_dotenv()
    data_path = Path(__file__).parent / "exercisedb_full.json"
    out_path = Path(__file__).parent / "exercisedb_cleaned.json"
    
    with open(data_path) as f:
        full_data = json.load(f)
        
    print(f"Loaded {len(full_data)} exercises. Sending to LLM for cleanup... This may take a minute.")
    
    # We just need to send the names and IDs to save tokens
    mini_list = [{"id": ex["exerciseId"], "name": ex["name"]} for ex in full_data]
    
    prompt = """
    You are a fitness expert. I have a list of ~1500 exercises from an API. Many have weird, overly specific, or poorly formatted names.
    Your task:
    1. Filter the list down to the ~200-300 most common, standard gym exercises (e.g. Bench Press, Squat, Deadlift, Bicep Curl, Pull-up, Tricep Extension, Leg Press, Lat Pulldown).
    2. Ignore weird variations like "barbell seated bradford rocky press", "impossible dips", or "push-up inside leg kick".
    3. Provide a clean, properly capitalized, standard name for each exercise you select (e.g. "Bench Press" instead of "barbell bench press").
    4. You MUST include the EXACT original `id` so I can map it back to the database.
    """
    
    response = llm_client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": json.dumps(mini_list)}
        ],
        response_format=CleanedExerciseList,
        timeout=120
    )
    
    cleaned = response.choices[0].message.parsed.exercises
    print(f"LLM returned {len(cleaned)} cleaned exercises.")
    
    # Map back to full objects
    lookup = {ex["exerciseId"]: ex for ex in full_data}
    
    final_data = []
    for c in cleaned:
        if c.exercise_id in lookup:
            original = lookup[c.exercise_id]
            # Replace name
            original["name"] = c.standard_name
            final_data.append(original)
            
    with open(out_path, "w") as f:
        json.dump(final_data, f, indent=2)
        
    print(f"Saved {len(final_data)} exercises to {out_path}")

if __name__ == "__main__":
    clean()
