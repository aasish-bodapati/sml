# NLP Nutrition Tracker — Backend Implementation Plan

## ✅ Decisions Finalized

| Question | Decision |
|---|---|
| LLM Provider | OpenAI (GPT-4o-mini for NLP, Whisper for voice) |
| Brand Foods | Both generic + branded (USDA FDC has branded items) |
| Database | Supabase (hosted PostgreSQL) |
| Voice Logging | Yes — OpenAI Whisper API |
| Role Target | **AI/ML Engineering** — emphasize NLP pipeline depth |
| Portfolio README | Yes — polished GitHub-ready with diagrams |

---

## What Is This?

A **production-grade REST API backend** that lets users log food using **plain English** (e.g., *"I had 2 scrambled eggs with whole wheat toast and a cup of coffee"*). The system:

1. Parses the natural language input using an NLP pipeline (LLM-based extraction)
2. Maps detected food items to a nutrition database
3. Stores per-user daily logs with meals, macros & micros
4. Provides analytics (daily summary, weekly trends, goal tracking)
5. Supports full user auth, goals, and reminders

This is exactly the kind of backend a real health-tech startup would ship — and the kind that impresses interviewers because it combines **NLP, REST API design, data modeling, auth, and analytics** in one project.

---

## Architecture

```
Client (Mobile/Web)
        │
        ▼
   FastAPI Backend  ──► NLP Pipeline (OpenAI / Gemini)
        │                      │
        │               Food Entity Extraction
        │               (food name, quantity, unit)
        │
        ▼
   PostgreSQL DB ◄─── Nutritionix / USDA FDC API
        │                (nutrition lookup)
        │
        ▼
   Analytics Layer (aggregation queries)
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | FastAPI (Python) | Fast, async, auto docs, interview-friendly |
| **Database** | Supabase (hosted PostgreSQL) | Production cloud DB, no infra to manage |
| **ORM** | SQLAlchemy + Alembic | Clean schema management, migration history |
| **NLP Engine** | OpenAI GPT-4o-mini | Structured extraction via function calling |
| **Voice** | OpenAI Whisper API | Speech-to-text before NLP pipeline |
| **Nutrition DB** | USDA FDC Open API (free) | Real data incl. branded foods, no cost |
| **Auth** | JWT (access + refresh tokens) | Industry standard |
| **Containerization** | Docker + docker-compose | App container only (DB is Supabase) |
| **Testing** | Pytest + httpx | Professional test coverage |

---

## Feature Scope

### Core (Must-Have for Interview)

#### 1. User Auth
- `POST /auth/register` — email + password signup
- `POST /auth/login` — JWT token pair
- `POST /auth/refresh` — refresh access token
- `GET /me` — profile info
- `PUT /me` — update name, age, weight, height

#### 2. NLP Food Logging ⭐ (The Star Feature)
- `POST /logs/nlp` — accepts `{ "text": "I had 2 eggs and toast" }` → parses → stores → returns structured log with nutrition
- Internal pipeline:
  1. Send text to LLM with a structured prompt
  2. LLM returns: `[{ "food": "egg", "quantity": 2, "unit": "whole" }, ...]`
  3. Look up each food in USDA FDC API
  4. Persist to DB with timestamp

#### 3. Manual Food Logging (Fallback)
- `POST /logs/manual` — `{ food_name, quantity, unit, meal_type }`
- `GET /logs?date=YYYY-MM-DD` — get all logs for a day
- `DELETE /logs/{id}` — delete a specific log entry

#### 4. Nutrition Goals
- `POST /goals` — set daily targets (calories, protein, carbs, fat)
- `GET /goals` — get current goals
- `GET /goals/progress?date=YYYY-MM-DD` — today's intake vs. goals

#### 5. Analytics
- `GET /analytics/daily?date=YYYY-MM-DD` — full macro/micro breakdown
- `GET /analytics/weekly` — 7-day trend chart data
- `GET /analytics/streak` — consecutive days logged

### Bonus (Nice-to-Have)
- `POST /logs/voice` — accepts base64 audio, transcribes with Whisper, then runs NLP pipeline
- `GET /foods/search?q=banana` — search the nutrition DB
- Meal type classification (breakfast/lunch/dinner/snack) inferred from NLP
- Smart reminders via APScheduler

---

## Data Models

```
User
├── id, email, password_hash
├── name, age, weight_kg, height_cm
└── created_at, updated_at

NutritionGoal
├── id, user_id (FK)
├── calories, protein_g, carbs_g, fat_g, fiber_g
└── effective_from

FoodLog
├── id, user_id (FK)
├── meal_type (breakfast/lunch/dinner/snack)
├── logged_at (datetime)
├── raw_text (original NLP input)
└── source (nlp | manual | voice)

FoodLogItem
├── id, log_id (FK)
├── food_name, brand (nullable)
├── quantity, unit
├── fdc_id (USDA reference)
├── calories, protein_g, carbs_g, fat_g
└── fiber_g, sugar_g, sodium_mg, ...

NLPParseHistory  (audit trail)
├── id, user_id, raw_input
├── llm_response (JSON)
├── parsed_items (JSON)
├── status (success | partial | failed)
├── latency_ms, model_used
└── created_at
```

---

## NLP Pipeline Detail

The core differentiator — structured extraction using LLM function calling:

```python
EXTRACTION_SCHEMA = {
    "name": "extract_food_items",
    "parameters": {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "food_name": "string",    # normalized name
                    "quantity": "number",
                    "unit": "string",          # cup, gram, piece, etc.
                    "meal_type": "string",     # breakfast/lunch/dinner/snack
                    "preparation": "string"    # scrambled, boiled, fried, etc.
                }
            },
            "meal_time": "string",    # morning/afternoon/evening/night
            "confidence": "number"    # 0.0 – 1.0
        }
    }
}
```

This is far more robust than regex/keyword matching and is what real companies actually ship.

---

## Project Structure

```
nlp-nutrition-tracker/
├── app/
│   ├── main.py                   # FastAPI app entry point
│   ├── config.py                 # Settings (pydantic-settings)
│   ├── database.py               # SQLAlchemy engine & session
│   │
│   ├── api/
│   │   ├── auth.py
│   │   ├── logs.py
│   │   ├── goals.py
│   │   └── analytics.py
│   │
│   ├── models/                   # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── food_log.py
│   │   └── goal.py
│   │
│   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── auth.py
│   │   ├── log.py
│   │   └── analytics.py
│   │
│   ├── services/
│   │   ├── nlp_service.py        # LLM parsing logic
│   │   ├── nutrition_service.py  # USDA FDC lookups
│   │   ├── auth_service.py       # JWT creation/validation
│   │   └── analytics_service.py  # Aggregation logic
│   │
│   └── core/
│       ├── security.py           # Password hashing, JWT
│       ├── dependencies.py       # get_current_user, get_db
│       └── exceptions.py         # Custom HTTP exceptions
│
├── alembic/                      # DB migrations
├── tests/
│   ├── test_auth.py
│   ├── test_nlp.py
│   └── test_analytics.py
│
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md                     # Interview-ready documentation
```

---

## AI/ML Emphasis (Since Role Target is AI/ML)

For an AI/ML role, the following will be highlighted extra:

- **Prompt engineering** — versioned system prompts, few-shot examples in extraction schema
- **Structured output / function calling** — not naive text parsing, proper OpenAI tool use
- **Confidence scoring** — LLM returns 0–1 confidence per item; low-confidence items flagged
- **NLPParseHistory table** — acts as a model monitoring log (latency, model version, success rate)
- **Fallback strategy** — if LLM fails or confidence < 0.5, fallback to fuzzy USDA text search
- **Whisper pipeline** — voice → transcript → NLP → nutrition (full audio-to-data pipeline)
- **Analytics on parse quality** — `GET /analytics/nlp-stats` shows model success rate over time

---

## Verification Plan

### Automated Tests
```bash
pytest tests/ -v --cov=app --cov-report=term-missing
```
- Auth flow (register, login, protected routes)
- NLP parsing with mocked LLM responses
- Nutrition lookup with mocked USDA API
- Analytics aggregation correctness

### Manual Verification
- Run `docker-compose up` and hit Swagger UI at `http://localhost:8000/docs`
- Test NLP endpoint with real food descriptions
- Verify daily summary math is correct

---

## Why This Is Interview-Worthy

| Signal | What It Shows |
|---|---|
| LLM function calling | You understand modern AI APIs, not just keyword matching |
| USDA FDC integration | Third-party API integration, error handling |
| Alembic migrations | Production DB schema management |
| JWT auth | Security best practices |
| Service layer separation | Clean architecture, testability |
| Docker setup | DevOps awareness |
| Analytics aggregation | SQL query writing skill |
| NLPParseHistory table | Audit logging, observability mindset |
| Pytest coverage | Professional engineering standards |
