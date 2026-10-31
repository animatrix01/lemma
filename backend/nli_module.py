import hashlib, json
from backend.config import settings


def pair_hash(a: str, b: str) -> str:
    return hashlib.sha256((a + "||" + b).encode()).hexdigest()


def nli_verdict(a: str, b: str) -> tuple[str, float]:
    # cache
    from backend.db.database import SessionLocal
    from backend.db import models
    h = pair_hash(a, b)
    db = SessionLocal()
    try:
        cached = db.query(models.NliVerdictCache).filter(models.NliVerdictCache.pair_hash == h).first()
        if cached:
            return cached.label, cached.score or 0.0
    finally:
        db.close()
    label = "neutral"
    score = 0.5
    try:
        from huggingface_hub import InferenceClient
        client = InferenceClient(token=settings.HF_TOKEN)
        res = client.text_classification(f"{a} [SEP] {b}", model="cross-encoder/nli-deberta-v3-base")
        # res is list of {label, score}
        best = max(res, key=lambda x: x["score"])
        label = best["label"].lower()
        score = float(best["score"])
    except Exception:
        label = "neutral"
        score = 0.5
    db = SessionLocal()
    try:
        db.add(models.NliVerdictCache(pair_hash=h, label=label, score=score, model="nli-deberta-v3-base"))
        db.commit()
    finally:
        db.close()
    return label, score