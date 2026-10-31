# LEMMA

AI-assisted information-gap detection platform ("Digital Dark Spot").

## Stack
FastAPI + Pydantic v2 + SQLAlchemy + SQLite + httpx + trafilatura + pymupdf. LLM via Groq (primary) → Gemini (fallback + vision). NLI via HF Inference API. Search via Tavily.

## Setup
1. Copy `.env.example` to `.env` and fill keys.
2. Install: `pip install -r requirements.txt`
3. Run: `uvicorn backend.main:app --host 127.0.0.1 --port 8000`
4. Health: `GET /health`

## Endpoints
See `contracts/api_schema.py` and `contracts/mock_json/`.

## Status
See `STATUS.md`.
