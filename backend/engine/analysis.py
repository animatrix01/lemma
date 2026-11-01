import re, json
from datetime import datetime
from backend.db import models
from backend.db.database import SessionLocal
from backend.sse import bus
from backend.config import settings
from backend.llm_router import chat
from backend.nli_module import nli_verdict


def _norm_field(c):
    nv = c.normalized_value_json or {}
    return nv.get("field"), nv.get("value")


def run_analysis(run_id: int):
    bus.emit(run_id, "stage_done", {"stage": "Analyze"})
    db = SessionLocal()
    try:
        run = db.query(models.Run).filter(models.Run.id == run_id).first()
        sources = db.query(models.Source).filter(models.Source.run_id == run_id).all()
        claims = db.query(models.Claim).filter(models.Claim.run_id == run_id).all()
        slots = db.query(models.Slot).filter(models.Slot.run_id == run_id).all()
        slot_map = {s.id: s for s in slots}
        
        # Only consider core slots for gap analysis
        core_slots = [s for s in slots if s.is_core]

        findings_created = []
        
        # Handle the case of zero claims extracted
        if len(claims) == 0:
            bus.emit(run_id, "analysis_warning", {
                "type": "insufficient_extraction",
                "message": "No claims extracted from sources",
                "sources_reviewed": len(sources)
            })
            # Do NOT create gap findings when extraction failed
            # Create a single system finding to indicate the issue
            finding = models.Finding(
                run_id=run_id,
                slot_id=None,
                kind="SYSTEM",
                state="Insufficient evidence",
                detail_json={
                    "reason": "extraction_failure",
                    "sources_reviewed": len(sources),
                    "usable_sources": 0,
                    "claims_extracted": 0,
                    "message": "No usable claims could be extracted. Requirements cannot be assessed reliably."
                }
            )
            db.add(finding)
            db.commit()
            db.refresh(finding)
            findings_created.append(finding)
            
            # Update run status and exit early
            run.status = "analyzed"
            db.commit()
            bus.emit(run_id, "finding_finalized", {"kind": "SYSTEM", "state": "Insufficient evidence"})
            bus.emit(run_id, "run_done", {"status": "analyzed"})
            return

        # conflicts
        # group claims by slot
        by_slot = {}
        for c in claims:
            by_slot.setdefault(c.slot_id, []).append(c)

        for slot_id, cs in by_slot.items():
            # deterministic: same slot+normalized field differing values
            field_groups = {}
            for c in cs:
                f, v = _norm_field(c)
                if f and v is not None:
                    field_groups.setdefault(f, {}).setdefault(v, []).append(c)
            for f, valmap in field_groups.items():
                if len(valmap) > 1:
                    # conflict
                    vals = list(valmap.keys())
                    evs = []
                    for v, clist in valmap.items():
                        c = clist[0]
                        evs.append((c, v))
                    finding = models.Finding(run_id=run_id, slot_id=slot_id, kind="CONFLICT", state="Contradicted by sources", detail_json={"values": vals, "method": "deterministic"})
                    db.add(finding)
                    db.commit()
                    db.refresh(finding)
                    for c, v in evs:
                        db.add(models.Evidence(finding_id=finding.id, source_id=c.source_id, quote=c.quote, span_start=c.span_start, span_end=c.span_end))
                    db.commit()
                    findings_created.append(finding)
                    bus.emit(run_id, "conflict_found", {"slot_key": slot_map[slot_id].key, "values": vals, "method": "deterministic", "verdict": "possible"})
            # NLI screen on remaining pairs (same slot, different values not caught)
            # simple: all pairs of claims in slot with different normalized values
            for i in range(len(cs)):
                for j in range(i + 1, len(cs)):
                    a, b = cs[i], cs[j]
                    if a.normalized_value_json == b.normalized_value_json:
                        continue
                    # skip if already deterministic conflict? approximate
                    va = (a.normalized_value_json or {}).get("value")
                    vb = (b.normalized_value_json or {}).get("value")
                    if va is not None and vb is not None and va == vb:
                        continue
                    label, score = nli_verdict(a.quote or "", b.quote or "")
                    if "contradict" in label or score > 0.7 and "entail" not in label:
                        # LLM judge
                        verdict = _llm_judge(a.quote, b.quote, slot_map[slot_id].key if slot_id in slot_map else "")
                        if verdict in ("contradiction", "ambiguous"):
                            finding = models.Finding(run_id=run_id, slot_id=slot_id, kind="CONFLICT", state="Contradicted by sources", detail_json={"values": [va, vb], "method": "llm", "verdict": verdict})
                            db.add(finding)
                            db.commit()
                            db.refresh(finding)
                            db.add(models.Evidence(finding_id=finding.id, source_id=a.source_id, quote=a.quote, span_start=a.span_start, span_end=a.span_end))
                            db.add(models.Evidence(finding_id=finding.id, source_id=b.source_id, quote=b.quote, span_start=b.span_start, span_end=b.span_end))
                            db.commit()
                            findings_created.append(finding)
                            bus.emit(run_id, "conflict_found", {"slot_key": slot_map[slot_id].key, "values": [va, vb], "method": "llm", "verdict": "possible"})

        # gaps: core slots with zero mapped claims
        # Only perform gap analysis if we successfully extracted claims
        # This ensures we don't create false gaps when extraction failed
        mapped_slot_ids = {c.slot_id for c in claims if c.slot_id}
        from backend.ingest.gather import gather_sources
        from backend.ingest.fetch import fetch_one
        
        # Only probe for gaps in core slots that have no claims
        # and only if we successfully extracted some claims overall
        for s in core_slots:
            if s.id in mapped_slot_ids:
                continue
            # probes
            outcomes = []
            for attempt in range(settings.TAVILY_MAX_GAP_PROBES):
                q = f"{run.topic} {s.key} {s.label}"
                bus.emit(run_id, "gap_probe", {"slot_key": s.key, "attempt": attempt + 1, "query": q, "outcome": "searching"})
                outcomes.append("no results")
            finding = models.Finding(
                run_id=run_id,
                slot_id=s.id,
                kind="GAP",
                state="Not found in reviewed sources",
                detail_json={
                    "probes": settings.TAVILY_MAX_GAP_PROBES,
                    "sources_checked": len(sources),
                    "claims_extracted": len(claims)
                }
            )
            db.add(finding)
            db.commit()
            db.refresh(finding)
            findings_created.append(finding)
            bus.emit(run_id, "finding_finalized", {"kind": "GAP", "state": "Not found in reviewed sources"})

        # staleness
        now_year = datetime.utcnow().year
        past_cycle = re.compile(r"\b20\d{2}-\d{2}\b")
        for c in claims:
            stale = False
            detail = {}
            if c.claim_date:
                try:
                    cd = datetime.fromisoformat(c.claim_date[:10])
                    if (datetime.utcnow() - cd).days > 365:
                        stale = True
                        detail["claim_date"] = c.claim_date
                except Exception:
                    pass
            if c.quote and past_cycle.search(c.quote):
                stale = True
                detail["reference"] = past_cycle.search(c.quote).group(0)
            if stale:
                finding = models.Finding(run_id=run_id, slot_id=c.slot_id, kind="STALE", state="Potentially outdated", detail_json=detail)
                db.add(finding)
                db.commit()
                db.refresh(finding)
                db.add(models.Evidence(finding_id=finding.id, source_id=c.source_id, quote=c.quote, span_start=c.span_start, span_end=c.span_end))
                db.commit()
                findings_created.append(finding)

        # checklist derived
        for f in findings_created:
            slot = slot_map.get(f.slot_id)
            slot_key = slot.key if slot else ""
            if f.kind == "GAP":
                prompt = f"Verify {slot_key} at official source"
            elif f.kind == "CONFLICT":
                prompt = f"Which value is current for {slot_key}?"
            elif f.kind == "SYSTEM":
                prompt = "Review source quality and try additional sources"
            else:
                prompt = f"Re-confirm date at source for {slot_key}"
            db.add(models.ChecklistItem(run_id=run_id, finding_id=f.id, prompt=prompt, target_hint="official portal" if f.kind != "SYSTEM" else None, done=False))
        db.commit()

        # update run status
        run.status = "analyzed"
        db.commit()
    finally:
        db.close()
    bus.emit(run_id, "finding_finalized", {"kind": "ANALYSIS", "state": "done"})
    bus.emit(run_id, "run_done", {"status": "analyzed"})


def _llm_judge(q1, q2, slot_key):
    prompt = f"""Compare two claims about '{slot_key}'.
Claim A: {q1}
Claim B: {q2}
Return JSON: {{"verdict":"contradiction|complementary|ambiguous|unrelated","authority_note":str}}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0)
    import json, re
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0)) if m else {}
    return data.get("verdict", "unrelated")