import asyncio
from datetime import datetime, timezone
from backend.db import models
from backend.db.database import SessionLocal


RUN_QUEUES: dict[int, asyncio.Queue] = {}
SCANNER_QUEUES: dict[int, asyncio.Queue] = {}


def get_queue(run_id: int) -> asyncio.Queue:
    if run_id not in RUN_QUEUES:
        RUN_QUEUES[run_id] = asyncio.Queue()
    return RUN_QUEUES[run_id]


def remove_queue(run_id: int):
    RUN_QUEUES.pop(run_id, None)


def emit(run_id: int, etype: str, payload: dict):
    db = SessionLocal()
    try:
        last = db.query(models.RunEvent).filter(models.RunEvent.run_id == run_id).order_by(models.RunEvent.seq.desc()).first()
        seq = (last.seq + 1) if last else 1
        ev = models.RunEvent(run_id=run_id, seq=seq, type=etype, payload_json=payload)
        db.add(ev)
        db.commit()
        db.refresh(ev)
        envelope = {"seq": ev.seq, "ts": ev.ts.isoformat() if ev.ts else datetime.now(timezone.utc).isoformat(), "type": etype, "payload": payload}
    finally:
        db.close()
    q = RUN_QUEUES.get(run_id)
    if q is not None:
        try:
            q.put_nowait(envelope)
        except Exception:
            pass
    return envelope
