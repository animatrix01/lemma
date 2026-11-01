import asyncio
from backend.ingest.gather import gather_sources
from backend.ingest.fetch import fetch_one
from backend.db import models
from backend.db.database import SessionLocal
from backend.sse import bus
from backend.engine.claims import extract_claims_from_source
from backend.engine.slots import seeded_slots, extend_slots
from backend.engine.mapping import prefilter_slots, finalize_mapping
from backend.engine.analysis import run_analysis


def run_ingest(run_id: int, topic: str, question: str, domain: str, urls: list[str], attachments: list[str]):
    asyncio.run(_run_ingest_async(run_id, topic, question, domain, urls, attachments))


async def _run_ingest_async(run_id: int, topic: str, question: str, domain: str, urls: list[str], attachments: list[str]):
    bus.get_queue(run_id)
    db = SessionLocal()
    try:
        run = db.query(models.Run).filter(models.Run.id == run_id).first()
        if run:
            run.status = "running"
            db.commit()
    finally:
        db.close()

    # gather
    bus.emit(run_id, "search_query", {"query": topic, "results_count": 0})
    all_urls = gather_sources(topic, urls or [])

    source_ids = []
    for u in all_urls:
        res = await fetch_one(u)
        db = SessionLocal()
        try:
            src = models.Source(run_id=run_id, url=res["url"], title=res.get("title"), page_date=res.get("page_date"), tier=res.get("tier"), text=res.get("text"), active=True)
            db.add(src)
            db.commit()
            db.refresh(src)
            source_ids.append((src.id, res.get("text") or ""))
        finally:
            db.close()
        bus.emit(run_id, "source_fetched", {
            "source_id": source_ids[-1][0],
            "url": res["url"],
            "words": res.get("words", 0),
            "page_date": res.get("page_date"),
            "tier": res.get("tier"),
        })

    for a in (attachments or []):
        try:
            res = await fetch_one(a)
            db = SessionLocal()
            try:
                src = models.Source(run_id=run_id, url=a, title=res.get("title"), page_date=res.get("page_date"), tier=res.get("tier"), text=res.get("text"), active=True)
                db.add(src)
                db.commit()
                db.refresh(src)
                source_ids.append((src.id, res.get("text") or ""))
                sid = src.id
            finally:
                db.close()
            bus.emit(run_id, "source_fetched", {"source_id": sid, "url": a, "words": res.get("words", 0), "page_date": res.get("page_date"), "tier": res.get("tier")})
        except Exception:
            pass

    bus.emit(run_id, "stage_done", {"stage": "Ingest"})

    # Phase 2: slots - generate query-specific requirements
    existing = seeded_slots(topic=topic, domain=domain, question=question)
    bus.emit(run_id, "slot_generation", {"method": "query_specific", "count": len(existing)})
    
    try:
        extra = extend_slots(topic, question, [s["key"] for s in existing])
        for s in extra:
            existing.append({"key": s["key"], "label": s.get("label", s["key"]), "definition": s.get("definition", ""), "is_core": False})
        if extra:
            bus.emit(run_id, "slot_extension", {"count": len(extra)})
    except Exception as e:
        bus.emit(run_id, "slot_extension", {"error": str(e)})
    db = SessionLocal()
    try:
        slot_rows = {}
        for s in existing:
            row = models.Slot(run_id=run_id, key=s["key"], label=s["label"], definition=s["definition"], is_core=s["is_core"])
            db.add(row)
            db.commit()
            db.refresh(row)
            slot_rows[s["key"]] = row.id
            s["_id"] = row.id
    finally:
        db.close()

    # claims extraction + mapping
    total_claims = 0
    slot_counts = {s["key"]: 0 for s in existing}
    for source_id, text in source_ids:
        try:
            # Limit text size to prevent timeouts
            if len(text) > 50000:
                text = text[:50000]
            claims = extract_claims_from_source(text)
            for c in claims:
                # prefilter + finalize
                cand = prefilter_slots(c.get("claim_text", ""), existing, top_k=6)
                slot_key = finalize_mapping(c.get("claim_text", ""), cand, existing)
                slot_id = slot_rows.get(slot_key) if slot_key else None
                db = SessionLocal()
                try:
                    claim = models.Claim(
                        run_id=run_id,
                        source_id=source_id,
                        quote=c.get("quote", ""),
                        span_start=c.get("span_start"),
                        span_end=c.get("span_end"),
                        slot_id=slot_id,
                        normalized_value_json=c.get("normalized_value"),
                        type=c.get("type"),
                        claim_date=c.get("claim_date"),
                    )
                    db.add(claim)
                    db.commit()
                finally:
                    db.close()
                total_claims += 1
                if slot_key:
                    slot_counts[slot_key] = slot_counts.get(slot_key, 0) + 1
            bus.emit(run_id, "claim_extracted", {"source_id": source_id, "count_total": total_claims, "samples": [cl.get("quote", "") for cl in claims[:2]]})
        except Exception as e:
            # Log error but continue processing other sources
            bus.emit(run_id, "claim_extracted", {"source_id": source_id, "count_total": total_claims, "error": str(e)})

    for key, cnt in slot_counts.items():
        bus.emit(run_id, "mapping_progress", {"slot_key": key, "mapped_count": cnt})

    bus.emit(run_id, "stage_done", {"stage": "Extract"})
    bus.emit(run_id, "stage_done", {"stage": "Map"})

    run_analysis(run_id)

    db = SessionLocal()
    try:
        run = db.query(models.Run).filter(models.Run.id == run_id).first()
        if run:
            run.status = "analyzed"
            db.commit()
    finally:
        db.close()
    bus.emit(run_id, "run_done", {"status": "analyzed"})
    bus.remove_queue(run_id)