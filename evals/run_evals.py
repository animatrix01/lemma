import asyncio, json, os, time
from backend.db.database import SessionLocal, init_db
from backend.db import models
from backend.ingest.pipeline import run_ingest

init_db()
base = os.path.dirname(__file__)
cases = json.load(open(os.path.join(base, "gold_pack", "cases.json")))
results = []
for c in cases:
    db = SessionLocal()
    run = models.Run(topic="eval", domain="Education", question="", status="queued")
    db.add(run); db.commit(); db.refresh(run); rid = run.id
    db.close()
    asyncio.run(run_ingest(rid, "eval", "", "Education", [c["url"]], []))
    db = SessionLocal()
    findings = db.query(models.Finding).filter(models.Finding.run_id == rid).all()
    kinds = [f.kind for f in findings]
    passed = any(k in kinds for k in c["expected"]) if c["expected"] else (len(kinds) == 0)
    results.append({"id": c["id"], "kind": c["kind"], "passed": bool(passed), "found": kinds})
    db.close()
    time.sleep(6)
out = {"cases": results, "summary": {"passed": sum(1 for r in results if r["passed"]), "total": len(results)}}
json.dump(out, open(os.path.join(base, "results.json"), "w"), indent=2)
print(json.dumps(out, indent=2))