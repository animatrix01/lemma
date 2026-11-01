from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from backend.db.database import init_db
from backend.routers import api

app = FastAPI(title="LEMMA Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

init_db()

app.include_router(api.router)

# /evals static results route (placeholder dir)
results_dir = Path(__file__).resolve().parent.parent / "evals" / "results"
results_dir.mkdir(parents=True, exist_ok=True)
app.mount("/evals-static", StaticFiles(directory=str(results_dir), html=True))


@app.get("/")
def root():
    return {"name": "LEMMA", "status": "ok"}
