"""
Download all exercises from the ExerciseDB OSS API.
Paginates through all 1,500 exercises using cursor-based pagination.
Output: backend/data/exercisedb_full.json

Attribution: AscendAPI (https://ascendapi.com) — required by usage terms.
"""

import json
import time
import urllib.request
import urllib.error
from pathlib import Path

BASE_URL = "https://oss.exercisedb.dev/api/v1/exercises"
OUTPUT_PATH = Path(__file__).parent / "exercisedb_full.json"
LIMIT = 25
DELAY_SECONDS = 1.2  # be respectful of rate limits


def fetch_page(after_cursor: str | None = None) -> dict:
    url = f"{BASE_URL}?limit={LIMIT}"
    if after_cursor:
        url += f"&after={after_cursor}"

    req = urllib.request.Request(url, headers={"User-Agent": "MacTrack/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def download_all():
    all_exercises = []
    cursor = None
    page = 1

    print("Downloading ExerciseDB exercises...")

    while True:
        try:
            data = fetch_page(after_cursor=cursor)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"  Rate limited on page {page}. Waiting 5s...")
                time.sleep(5)
                continue
            raise

        exercises = data["data"]
        meta = data["meta"]
        all_exercises.extend(exercises)

        print(f"  Page {page:3d} — fetched {len(exercises):2d} exercises | total so far: {len(all_exercises)}/{meta['total']}")

        if not meta["hasNextPage"]:
            break

        cursor = meta.get("nextCursor")
        page += 1
        time.sleep(DELAY_SECONDS)

    # Save
    OUTPUT_PATH.write_text(json.dumps(all_exercises, indent=2, ensure_ascii=False))
    print(f"\nDone! {len(all_exercises)} exercises saved to {OUTPUT_PATH}")
    print("Attribution: AscendAPI (https://ascendapi.com)")


if __name__ == "__main__":
    download_all()
