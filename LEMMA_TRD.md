# LEMMA — Technical Requirements Document (TRD)

**Version:** 1.2 (Final) · Companion to LEMMA_PRD.md v1.2 · *v1.2 amendments: SSE protocol frozen, run-event persistence, embedding model decided, scanner + NLI storage tables added*

---

## 1. Architecture

```
Next.js (TS/Tailwind/shadcn)  ←──────────────  FastAPI backend
        │  SSE client for live events                │
        │                       ┌────────────────────┼─────────────────────┐
        │                 Ingestion layer        Engine layer           LLM routing
        │              (fetch, trafilatura,   (claims→slots→matrix,     Groq llama-3.3-70b
        │               pymupdf PDFs,          conflicts: deterministic →NLI→LLM;
        │               image→vision LLM)      gaps; follow-up probes;   Gemini 2.5 Flash
        │                                      stale; checklist;         (fallback + vision)
        │                                      scanner)                  llm_router.py
        │                                              │
        └──────────────────────────────  SQLite  ─────┘
        (runs / sources / slots / claims / findings / evidence / checklist)
```

- **Deterministic components:** ingestion, value normalization, numeric/date/deadline conflict rules, gap-state derivation, follow-up probe orchestration, checklist generation, NLI verdict caching, re-run recomputation path, **append-only persistence of all pipeline events (`run_events` table — see §7)**.
- **LLM components:** claim extraction, slot-schema extension, slot-mapping finalization, text-conflict judging, scanner stance verification.
- **Contract-first rule:** `contracts/api_schema.py` (Pydantic) + `contracts/mock_json/` are frozen **before any dev**; frontend builds against mocks from hour 1.

### Live pipeline SSE event types
```
search_query        {query, results_count}
source_fetched      {source_id, url, words, page_date, tier}
claim_extracted     {source_id, count_total, samples[quote]}
mapping_progress    {slot_key, mapped_count}
conflict_found      {slot_key, values[], method[deterministic|nli|llm], verdict}
gap_probe           {slot_key, attempt, query, outcome}
finding_finalized   {kind, state}
stage_done / run_done
```

### SSE protocol (frozen — both agents build against this)
1. `POST /api/analyze` **returns immediately**: `{run_id, status: "queued"}` — the analysis executes server-side async; this endpoint does not stream.
2. Client then opens `GET /api/runs/{id}/status` (SSE). Server behaviour: **replay all persisted `run_events` for the run in ascending `seq` → then attach to the live stream.** Every emitted event is appended to `run_events` first, stream second.
3. Event envelope (uniform for all events): `{seq, ts, type, payload}`.
4. Heartbeat comment every 15s to keep connections alive.
5. Terminal events: `stage_done` per stage, then exactly one of `run_done` / `run_failed` (with top-level error reason; no partial-silent failures).
6. **Reconnect/recovery:** any client (browser refresh, disconnect, second tab) replays from `seq: 0` via the same endpoint — the run continues server-side regardless of viewers. "View run trace" in the UI reads the same persisted events; no separate trace API needed.
7. F2 scanner uses the identical protocol with its own event types (`scanner_*` prefixed) persisted against `scanner_reports`.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui + SSE client |
| Backend | FastAPI + Pydantic v2 (strict structured outputs) + httpx |
| Extraction | trafilatura (HTML) · pymupdf (PDF) · Gemini 2.5 Flash vision (images → OCR + claims) |
| LLM | Groq `llama-3.3-70b` (primary) → Gemini 2.5 Flash (fallback + vision) via `llm_router.py` |
| NLI | `cross-encoder/nli-deberta-v3-base` via **HF Inference API only** (no local torch install); SQLite verdict cache; silent degrade to LLM judge |
| Embeddings (claim→slot pre-filter) | `all-MiniLM-L6-v2` via HF Inference API (same token as NLI) · **degrade path: TF-IDF cosine (pure Python, no deps)** · LLM always finalizes mapping, so degrade costs little accuracy |
| Search | Tavily (auto source-gathering · follow-up gap probes · F2 claim verification) |
| Voice | Web Speech API (browser-native, zero backend) |
| Storage | SQLite via SQLAlchemy |
| Deploy | Railway (API) + Vercel (frontend) |

Deliberately **not** used: vector DBs, LangGraph orchestration, local model installs, auth systems — each adds risk without measurable benefit at this scale.

---

## 3. External Services & Free-Tier Budgets

| Service | Usage per F1 run | Free-tier fit |
|---|---|---|
| Groq | ~30–50 calls (extraction, mapping, judging, checklist) | Generous free tier |
| Gemini | fallback only + image vision | Free tier |
| Tavily | ~10–15 searches (F1) · ~15–20 per F2 URL | 1,000 credits/month — demo usage is a trivial fraction |
| HF NLI | ~40–80 pairs/run (cached; one-time analysis + testing only) | Free token, within limits |

**Key policy:** 4 keys, `.env` only — `GROQ_API_KEY`, `GEMINI_API_KEY`, `TAVILY_API_KEY`, `HF_TOKEN`. Loaded once in `config.py` (pydantic-settings). Never exposed to frontend (LLM/search calls are server-side only). `.env` gitignored; committed `.env.example` with empty values.

---

## 4. Repository Layout

```
lemma/
├── contracts/          # API schemas — T2 READS, never edits
│   ├── api_schema.py
│   └── mock_json/
├── backend/            # T1-exclusive
│   ├── ingest/         # fetch, html/pdf/image extraction, date heuristics
│   ├── engine/         # claims, slots, mapping, conflicts, gaps, stale, checklist
│   ├── scanner/        # F2 verify loop
│   ├── llm_router.py   # Groq → Gemini failover
│   ├── nli_module.py   # HF Inference API + verdict cache
│   ├── sse/            # live pipeline event stream
│   └── db/
├── frontend/           # T2-exclusive
├── evals/              # gold pack (8 cases) + runner script + committed results JSON
├── STATUS.md           # shared agent protocol file
└── README.md
```

---

## 5. Detection Methodology (the core)

1. **Claim extraction:** per-chunk LLM → atomic claims, Pydantic-strict: exact `quote` + `span` + normalized `value` (amount/date/threshold/enumeration) + optional claim date. No cross-chunk synthesis permitted.
2. **Slot mapping:** embedding-similarity pre-filter → LLM finalize → claims pooled per slot. Slot taxonomy = curated domain seeds + LLM topic extension, each extension carrying a written justification.
3. **Conflicts, tiered:**
   - *Deterministic:* two parsed values for one (slot, field) differ → hard conflict with programmatic confidence (zero hallucination surface — dates/amounts/deadlines parsed, not reasoned).
   - *NLI screen:* remaining claim pairs → HF cross-encoder (verdicts cached by pair-hash) → contradiction score > threshold survives.
   - *LLM judge:* survivors → verdict ∈ {contradiction, complementary, ambiguous, unrelated} + authority note (official vs aggregator). Output labelled **possible conflict** until evidence-backed.
4. **Gap probing:** zero mapped claims on a critical slot → 2–3 reworded Tavily probes before final state: *"not found in 6 sources + 3 targeted searches."* Never "this does not exist."
5. **Staleness:** parsed claim dates vs. domain cycle length; older-vs-newer source contradictions; past-cycle references ("2024–25 session") flagged **potentially outdated** — never certain.
6. **Checklist:** programmatically derived from matrix findings (gap → "verify [slot] from [official source]"; conflict → "which value is current?"; stale → "re-confirm date at source"). No free-form generation.

---

## 6. API Contract (final)

```
POST /api/analyze                     {topic, question, domain, urls[], attachments[]} → run_id (SSE)
GET  /api/runs/{id}/status            SSE pipeline stage events
GET  /api/runs/{id}/matrix            slots + findings + evidential states
GET  /api/runs/{id}/evidence/{finding_id}
POST /api/runs/{id}/rerun             {disabled_source_ids[]} → recomputed matrix (fast path)
POST /api/runs/{id}/checklist/{item_id}/done
POST /api/scanner                     {url} → red-flag report (SSE)
GET  /api/runs                        history list
GET  /evals                           benchmark scoreboard (reads committed results JSON)
```

---

## 7. DB Schema (SQLite)

```
runs(id, topic, domain, question, created_at, status)
sources(id, run_id, url, title, fetched_at, page_date, tier, text, active)
slots(id, run_id, key, label, definition, is_core)
claims(id, run_id, source_id, quote, span_start, span_end, slot_id,
       normalized_value_json, type, claim_date)
findings(id, run_id, slot_id, kind[GAP|CONFLICT|STALE],
         state[5 evidential states], detail_json)
evidence(id, finding_id, source_id, quote, span_start, span_end)
checklist_items(id, run_id, finding_id, prompt, target_hint, done)
run_events(id, run_id, seq, ts, type, payload_json)      # SSE source-of-truth; replay + view run trace
nli_verdict_cache(id, pair_hash UNIQUE, label, score, model, created_at)
scanner_reports(id, url, created_at, status)
scanner_findings(id, report_id, claim, quote, span_start, span_end,
                 stance[REFUTED|UNSUPPORTED|UNDATED|CORROBORATED], evidence_json)
```

Storage notes: `run_events` is append-only and seq-ordered per run — it is what SSE replays and what "view run trace" renders. `nli_verdict_cache` is keyed by a deterministic pair-hash (normalized claim texts), shared across runs. Scanner storage is intentionally separate from run tables — a scanner report is not a "run" and must not pollute matrix endpoints.

Re-run semantics: claims persist per source → re-run recomputes **mapping + analysis only** (no re-fetch/search) → seconds, not minutes.

---

## 8. Execution Protocol (solo developer + opencode agents)

- **T1 — Backend:** owns `backend/`, `evals/` runner, mock authoring.
- **T2 — Frontend:** owns `frontend/`, builds against `contracts/` + mock JSON from hour 1.
- **Shared:** `STATUS.md` — per-stream `DONE / IN-PROGRESS / NEXT / BLOCKED-ON`, updated after each task; hard no cross-edits; conflicts resolved by the human owner.
- **P0 gate (written into STATUS.md):** until Coverage Matrix + evidence inspector + checklist render end-to-end on real data, **F2 / voice / attachments / evals page / history sidebar do not start.**
- Prompt tuning on real URLs is done by the human owner — never delegated.

---

## 9. Timeline (~23–26h wall-clock vs. 31h window)

| Phase | Wall time | Gate |
|---|---|---|
| Contracts + mock JSON + repo + keys + eval gold seeding | 1–1.5h | contract v1 frozen |
| T1 ingest (URL/pdf/image) ↔ T2 app shell + pipeline view (mock) | ~3h | real text flows |
| T1 claims+slots+mapping ↔ T2 matrix UI | ~4h | **P0 gate (hour ~9–10)** |
| T1 conflicts/gaps/probes/stale/checklist ↔ T2 inspector + checklist + re-run | ~3h | F1 complete |
| F2 scanner loop ↔ report UI | ~3h | F2 complete |
| Attachments + voice + evals page + history sidebar + deploy + device-2 check | ~3h | deployed |
| README + demo video + golden persisted run + PPT | ~3h | ready |
| GitHub push (owner-handled) + Unstop upload + buffer | ~1h+ | submitted |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM extraction drift | temperature 0, strict Pydantic schemas, owner-tuned prompts on real URLs |
| Conflict false positives | deterministic-first tiering, NLI caching, "possible conflict" labelling |
| Live fetch failure during judging | persisted source snapshots + golden pre-computed run in DB |
| Free-tier throttling mid-run | `llm_router.py` Groq→Gemini failover; NLI degrades to LLM judge |
| Scope creep killing the demo | written P0 gate; F2 is the first casualty on any overrun |
| Two half-finished pipelines | contract-first + mock JSON guarantee both streams converge |

---

## 11. Demo & Submission (55-page allocation here means 5-minute script)

- **~70% F1:** live pipeline run on real URLs → Coverage Matrix walkthrough → evidence inspector → **re-run kill-shot** (untick a source, watch the matrix re-derive).
- **~25% F2:** red-flag report on a real claim-website URL.
- **~5%:** voice input + PDF attachment as seconds-long mentions; point at the run-trace event feed (live search/claim/comparison counts) as free-tier proof of effort.
- Golden persisted run = network-failure insurance. GitHub repo + README + PPT uploaded to Unstop before 1 Nov, 5:00 PM IST.
