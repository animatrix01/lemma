import asyncio, json
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from backend.db.database import get_db, init_db
from backend.db import models
from backend.mock_loader import load
from backend.sse import bus
from backend.ingest.pipeline import run_ingest
from backend.config import settings
from backend.llm_router import chat_with_intent
from contracts.api_schema import *

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse()


@router.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    run = models.Run(topic=req.topic, domain=req.domain, question=req.question, status="queued")
    db.add(run)
    db.commit()
    db.refresh(run)
    bus.get_queue(run.id)
    background_tasks.add_task(run_ingest, run.id, req.topic, req.question or "", req.domain or "", req.urls or [], req.attachments or [])
    return AnalyzeResponse(run_id=run.id, status="queued")


@router.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(req: ChatRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    result = chat_with_intent(req.message)
    if result["intent"] == "chat":
        return ChatResponse(intent="chat", reply=result["reply"], research_query=None)

    # intent == "research": start a lightweight run so the user gets verification inline.
    topic = result["research_query"] or req.message
    run = models.Run(topic=topic, domain="Education", question=topic, status="queued")
    db.add(run)
    db.commit()
    db.refresh(run)
    bus.get_queue(run.id)
    background_tasks.add_task(
        run_ingest, run.id, topic, topic, "Education", [], []
    )
    return ChatResponse(
        intent="research",
        reply=result["reply"],
        research_query=result["research_query"],
        run_id=run.id,
    )


@router.get("/api/runs/{run_id}/status")
async def run_status(run_id: int):
    from fastapi.responses import StreamingResponse

    async def gen():
        # replay persisted
        from backend.db.database import SessionLocal
        s = SessionLocal()
        last_seq = 0
        try:
            events = s.query(models.RunEvent).filter(models.RunEvent.run_id == run_id).order_by(models.RunEvent.seq).all()
            for e in events:
                last_seq = max(last_seq, e.seq)
                yield f"data: {json.dumps({'seq': e.seq, 'ts': e.ts.isoformat() if e.ts else None, 'type': e.type, 'payload': e.payload_json or {}})}\n\n"
        finally:
            s.close()
        q = bus.get_queue(run_id)
        while True:
            try:
                item = await asyncio.wait_for(q.get(), timeout=15)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                s2 = SessionLocal()
                try:
                    run = s2.query(models.Run).filter(models.Run.id == run_id).first()
                    if run and run.status in ("ingested", "done", "failed"):
                        break
                finally:
                    s2.close()
                continue
            if item is None:
                break
            if item.get("seq", 0) <= last_seq:
                continue
            last_seq = max(last_seq, item.get("seq", 0))
            yield f"data: {json.dumps(item)}\n\n"
            if item.get("type") in ("run_done", "run_failed", "scanner_done", "scanner_failed"):
                break

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.get("/api/runs/{run_id}/matrix", response_model=MatrixResponse)
def matrix(run_id: int):
    from backend.db.database import SessionLocal
    s = SessionLocal()
    try:
        run = s.query(models.Run).filter(models.Run.id == run_id).first()
        if not run:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
        
        slots = s.query(models.Slot).filter(models.Slot.run_id == run_id).all()
        claims = s.query(models.Claim).filter(models.Claim.run_id == run_id).all()
        findings = s.query(models.Finding).filter(models.Finding.run_id == run_id).all()
        counts = {}
        for c in claims:
            if c.slot_id:
                counts[c.slot_id] = counts.get(c.slot_id, 0) + 1
        slot_outs = []
        for sl in slots:
            slot_outs.append(SlotOut(id=sl.id, key=sl.key, label=sl.label, definition=sl.definition, is_core=sl.is_core, mapped_count=counts.get(sl.id, 0), state=None))
        finding_outs = []
        for f in findings:
            evs = s.query(models.Evidence).filter(models.Evidence.finding_id == f.id).all()
            ev_out = []
            for e in evs:
                src = s.query(models.Source).filter(models.Source.id == e.source_id).first()
                ev_out.append(EvidenceOut(id=e.id, source_id=e.source_id, quote=e.quote, span_start=e.span_start, span_end=e.span_end, url=src.url if src else None))
            sk = None
            if f.slot_id:
                sl = s.query(models.Slot).filter(models.Slot.id == f.slot_id).first()
                sk = sl.key if sl else None
            finding_outs.append(FindingOut(id=f.id, slot_id=f.slot_id, slot_key=sk, kind=f.kind, state=f.state, detail=f.detail_json or {}, evidence=ev_out))
        return MatrixResponse(run_id=run_id, status=run.status if run else "unknown", slots=slot_outs, findings=finding_outs)
    finally:
        s.close()


@router.get("/api/runs/{run_id}/checklist")
def get_checklist(run_id: int):
    from backend.db.database import SessionLocal
    s = SessionLocal()
    try:
        items = s.query(models.ChecklistItem).filter(models.ChecklistItem.run_id == run_id).all()
        return [
            ChecklistItemOut(
                id=item.id,
                run_id=item.run_id,
                finding_id=item.finding_id,
                prompt=item.prompt,
                target_hint=item.target_hint,
                done=item.done
            )
            for item in items
        ]
    finally:
        s.close()


@router.get("/api/runs/{run_id}/evidence/{finding_id}", response_model=EvidenceDetailResponse)
def evidence(run_id: int, finding_id: int):
    from backend.db.database import SessionLocal
    s = SessionLocal()
    try:
        f = s.query(models.Finding).filter(models.Finding.id == finding_id).first()
        evs = s.query(models.Evidence).filter(models.Evidence.finding_id == finding_id).all()
        chain = []
        for e in evs:
            src = s.query(models.Source).filter(models.Source.id == e.source_id).first()
            chain.append(EvidenceOut(id=e.id, source_id=e.source_id, quote=e.quote, span_start=e.span_start, span_end=e.span_end, url=src.url if src else None))
        return EvidenceDetailResponse(finding_id=finding_id, chain=chain, detail=f.detail_json if f else {})
    finally:
        s.close()


@router.post("/api/runs/{run_id}/rerun", response_model=RerunResponse)
def rerun(run_id: int, req: RerunRequest):
    return RerunResponse(run_id=run_id, status="recomputed")


@router.post("/api/runs/{run_id}/checklist/{item_id}/done", response_model=ChecklistDoneResponse)
def checklist_done(run_id: int, item_id: int):
    return ChecklistDoneResponse(item_id=item_id, done=True)


@router.post("/api/scanner")
async def scanner(req: ScannerRequest):
    from backend.db.database import SessionLocal
    from backend.scanner.run import get_q, run_scanner
    s = SessionLocal()
    try:
        report = models.ScannerReport(url=req.url, status="queued")
        s.add(report)
        s.commit()
        s.refresh(report)
        rid = report.id
    finally:
        s.close()
    get_q(rid)
    asyncio.create_task(run_scanner(rid, req.url))
    return {"report_id": rid, "status": "queued"}


@router.get("/api/scanner/{report_id}/status")
async def scanner_status(report_id: int):
    from fastapi.responses import StreamingResponse
    from backend.db.database import SessionLocal
    from backend.scanner.run import SCANNER_EVENTS, get_q

    async def gen():
        replayed_terminal = False
        for item in list(SCANNER_EVENTS.get(report_id, [])):
            yield f"data: {json.dumps(item)}\n\n"
            if item.get("type") in ("scanner_done", "scanner_failed"):
                replayed_terminal = True
                break
        if replayed_terminal:
            return

        s = SessionLocal()
        try:
            report = s.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
            status = report.status if report else None
        finally:
            s.close()
        if status == "done":
            yield f"data: {json.dumps({'seq': 0, 'ts': None, 'type': 'scanner_done', 'payload': {'report_id': report_id}})}\n\n"
            return
        if status == "failed":
            yield f"data: {json.dumps({'seq': 0, 'ts': None, 'type': 'scanner_failed', 'payload': {'error': 'Scan failed'}})}\n\n"
            return

        q = get_q(report_id)
        while True:
            try:
                item = await asyncio.wait_for(q.get(), timeout=15)
            except asyncio.TimeoutError:
                yield ": heartbeat\n\n"
                continue
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"
            if item.get("type") in ("scanner_done", "scanner_failed"):
                break

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/api/scanner/{report_id}", response_model=ScannerReportOut)
def get_scanner_report(report_id: int):
    from backend.db.database import SessionLocal
    from fastapi import HTTPException
    s = SessionLocal()
    try:
        report = s.query(models.ScannerReport).filter(models.ScannerReport.id == report_id).first()
        if not report:
            raise HTTPException(status_code=404, detail=f"Scanner report {report_id} not found")
        
        findings = s.query(models.ScannerFinding).filter(models.ScannerFinding.report_id == report_id).all()
        finding_outs = []
        for f in findings:
            finding_outs.append(ScannerFindingOut(
                id=f.id,
                claim=f.claim,
                quote=f.quote,
                span_start=f.span_start,
                span_end=f.span_end,
                stance=f.stance,
                evidence=f.evidence_json or {}
            ))
        
        return ScannerReportOut(
            id=report.id,
            url=report.url,
            status=report.status,
            findings=finding_outs
        )
    finally:
        s.close()


@router.get("/api/scanner")
def list_scanner_reports():
    from backend.db.database import SessionLocal
    s = SessionLocal()
    try:
        reports = s.query(models.ScannerReport).order_by(models.ScannerReport.id.desc()).limit(20).all()
        return [
            {
                "id": r.id,
                "url": r.url,
                "status": r.status,
                "created_at": r.created_at.isoformat() if hasattr(r, 'created_at') and r.created_at else None
            }
            for r in reports
        ]
    finally:
        s.close()


@router.get("/api/runs", response_model=RunsListResponse)
def runs_list(db: Session = Depends(get_db)):
    rows = db.query(models.Run).order_by(models.Run.created_at.desc()).all()
    return RunsListResponse(runs=[RunSummary(id=r.id, topic=r.topic, domain=r.domain, created_at=r.created_at, status=r.status) for r in rows])


@router.get("/evals", response_model=EvalsResponse)
def evals():
    data = load("evals.json")
    return EvalsResponse(**data)
