import json
from datetime import datetime, timezone
from typing import AsyncIterator, Dict, Any
from fastapi.responses import StreamingResponse


def envelope(seq: int, etype: str, payload: Dict[str, Any]) -> dict:
    return {"seq": seq, "ts": datetime.now(timezone.utc).isoformat(), "type": etype, "payload": payload}


async def replay_then_live(run_id: int, fetch_events, live_queue) -> AsyncIterator[str]:
    # fetch persisted events ascending seq
    for ev in fetch_events(run_id):
        yield f"data: {json.dumps(ev)}\n\n"
    # attach live
    while True:
        item = await live_queue.get()
        if item is None:
            break
        yield f"data: {json.dumps(item)}\n\n"
        if item.get("type") in ("run_done", "run_failed", "scanner_done", "scanner_failed"):
            break
    # heartbeat handled by caller wrapper


def sse_response(gen):
    return StreamingResponse(gen, media_type="text/event-stream")
