import asyncio
from backend.ingest.fetch import fetch_one
from backend.engine.claims import extract_claims_from_source
from backend.db import models
from backend.db.database import SessionLocal
from backend.sse import bus
from backend.config import settings
from backend.llm_router import chat
from backend.nli_module import nli_verdict
from tavily import TavilyClient


SCANNER_QUEUES = {}


def get_q(report_id):
    if report_id not in SCANNER_QUEUES:
        SCANNER_QUEUES[report_id] = asyncio.Queue()
    return SCANNER_QUEUES[report_id]


def emit_scanner(report_id, etype, payload):
    # etype should be scanner_*; store not in run_events. We'll just queue.
    q = SCANNER_QUEUES.get(report_id)
    if q is not None:
        q.put_nowait({"seq": 0, "ts": None, "type": etype, "payload": payload})


async def run_scanner(report_id: int, url: str):
    get_q(report_id)
    db = SessionLocal()
    try:
        report = db.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
        if report:
            report.status = "running"
            db.commit()
    finally:
        db.close()
    
    # fetch
    try:
        res = await fetch_one(url)
    except Exception as e:
        db = SessionLocal()
        try:
            report = db.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
            if report:
                report.status = "failed"
                db.commit()
        finally:
            db.close()
        emit_scanner(report_id, "scanner_failed", {"error": f"Failed to fetch URL: {str(e)}"})
        SCANNER_QUEUES.pop(report_id, None)
        return
    
    text = res.get("text") or ""
    
    # Check if we actually got content
    if len(text.strip()) < 100:
        db = SessionLocal()
        try:
            report = db.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
            if report:
                report.status = "failed"
                db.commit()
        finally:
            db.close()
        emit_scanner(report_id, "scanner_failed", {"error": "Could not extract article content. The page may be behind a paywall or require JavaScript."})
        SCANNER_QUEUES.pop(report_id, None)
        return
    
    emit_scanner(report_id, "scanner_claim_extracted", {"message": f"Extracted {len(text)} characters from article"})
    
    claims = extract_claims_from_source(text)
    
    # Check if claims were extracted
    if not claims:
        db = SessionLocal()
        try:
            report = db.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
            if report:
                report.status = "done"
                db.commit()
        finally:
            db.close()
        emit_scanner(report_id, "scanner_done", {"report_id": report_id, "message": "No factual claims found in article"})
        SCANNER_QUEUES.pop(report_id, None)
        return
    
    # check-worthiness: sort by length/numbers; cap
    def weight(c):
        t = c.get("claim_text", "")
        score = len(t)
        if any(ch.isdigit() for ch in t):
            score += 50
        return score
    claims_sorted = sorted(claims, key=weight, reverse=True)[:settings.TAVILY_MAX_SCANNER_CLAIM_CHECKS]

    client = TavilyClient(api_key=settings.TAVILY_API_KEY)
    findings = []
    for c in claims_sorted:
        emit_scanner(report_id, "scanner_claim_extracted", {"claim": c.get("claim_text")})
        # search
        try:
            search = client.search(query=c.get("claim_text", ""), max_results=3)
            results = search.get("results", [])
        except Exception:
            results = []
        emit_scanner(report_id, "scanner_check", {"claim": c.get("claim_text"), "results": len(results)})
        # gather counter evidence text
        counter_text = " ".join(r.get("content", "") for r in results)
        counter_url = results[0].get("url") if results else None
        # NLI stance
        label, score = nli_verdict(c.get("quote", ""), counter_text[:500]) if counter_text else ("neutral", 0.5)
        # LLM verdict
        verdict = _stance_verdict(c.get("claim_text", ""), c.get("quote", ""), counter_text[:800])
        stance = verdict
        # persist
        db = SessionLocal()
        try:
            sf = models.ScannerFinding(
                report_id=report_id,
                claim=c.get("claim_text", ""),
                quote=c.get("quote"),
                span_start=c.get("span_start"),
                span_end=c.get("span_end"),
                stance=stance,
                evidence_json={"counter_quote": counter_text[:500] if counter_text else None, "url": counter_url, "searches": len(results)},
            )
            db.add(sf)
            db.commit()
            db.refresh(sf)
            findings.append(sf)
        finally:
            db.close()
        emit_scanner(report_id, "scanner_verdict", {"claim": c.get("claim_text"), "stance": stance})

    db = SessionLocal()
    try:
        report = db.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
        if report:
            report.status = "done"
            db.commit()
    finally:
        db.close()
    emit_scanner(report_id, "scanner_done", {"report_id": report_id})
    SCANNER_QUEUES.pop(report_id, None)


def _stance_verdict(claim, quote, counter_text):
    prompt = f"""Determine stance of independent evidence toward the claim.
Claim: {claim}
Quote: {quote}
Evidence: {counter_text}
Return JSON: {{"stance":"REFUTED|UNSUPPORTED|UNDATED|CORROBORATED"}}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0)
    import json, re
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0)) if m else {}
    stance = data.get("stance", "UNSUPPORTED")
    if stance not in ("REFUTED", "UNSUPPORTED", "UNDATED", "CORROBORATED"):
        stance = "UNSUPPORTED"
    return stance