import json
import sys
import asyncio
from pathlib import Path
from pydantic import BaseModel

sys.path.append(str(Path(__file__).resolve().parent.parent))
from routers.food import llm_client

class CleanedExercise(BaseModel):
    exercise_id: str
    standard_name: str

class CleanedExerciseList(BaseModel):
    exercises: list[CleanedExercise]

def process_chunk(chunk):
    prompt = """
    You are a fitness database curator. I am giving you a chunk of exercises from an overly-specific database.
    Your task:
    1. Keep all reasonable, standard gym exercises and useful variations (e.g., Bench Press, Incline Dumbbell Press, Cable Fly, Back Squat).
    2. Discard overly absurd, useless, or hyper-specific variations that no one searches for (e.g., "barbell seated bradford rocky press", "push-up inside leg kick").
    3. Rename the exercises you keep to standard Title Case (e.g., "barbell bench press" -> "Barbell Bench Press").
    4. You should probably keep around 30% to 60% of these exercises, but use your best judgment.
    5. You MUST include the exact original `id`.
    """
    try:
        # Since the sync client is used in backend, we'll just run it synchronously
        # We can just use standard threadpool or synchronous calls since it's a one-off script
        res = llm_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": json.dumps(chunk)}
            ],
            response_format=CleanedExerciseList,
            temperature=0.1
        )
        return res.choices[0].message.parsed.exercises
    except Exception as e:
        print(f"Chunk error: {e}")
        return []

def main():
    data_path = Path(__file__).parent / "exercisedb_full.json"
    out_path = Path(__file__).parent / "exercisedb_cleaned.json"
    
    with open(data_path) as f:
        full_data = json.load(f)
        
    mini_list = [{"id": ex["exerciseId"], "name": ex["name"]} for ex in full_data]
    
    chunk_size = 100
    chunks = [mini_list[i:i + chunk_size] for i in range(0, len(mini_list), chunk_size)]
    
    print(f"Processing {len(chunks)} chunks sequentially...")
    all_cleaned = []
    
    for i, chunk in enumerate(chunks):
        print(f"  Chunk {i+1}/{len(chunks)}...")
        cleaned = process_chunk(chunk)
        all_cleaned.extend(cleaned)
        
    print(f"Total extracted: {len(all_cleaned)}")
    
    lookup = {ex["exerciseId"]: ex for ex in full_data}
    final_data = []
    
    # Remove duplicates based on standard_name
    seen_names = set()
    for c in all_cleaned:
        if c.exercise_id in lookup and c.standard_name.lower() not in seen_names:
            seen_names.add(c.standard_name.lower())
            original = lookup[c.exercise_id]
            original["name"] = c.standard_name
            final_data.append(original)
            
    with open(out_path, "w") as f:
        json.dump(final_data, f, indent=2)
        
    print(f"Saved {len(final_data)} unique exercises to {out_path}")

if __name__ == "__main__":
    main()
