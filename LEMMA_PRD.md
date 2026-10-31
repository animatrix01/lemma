# LEMMA — Product Requirements Document (PRD)

**Version:** 1.2 (Final) · **Build window:** 31 hours (Shinchan Online Hackathon 2026 — Team DEVENGERS) · **Mode:** Individual participation · *v1.2: aligned measure-with metric for free-tier proof to the run-trace event feed*

---

## 1. Product Overview

**Name:** LEMMA *(from mathematics: a lemma is a proved supporting claim — LEMMA extracts claims from your sources and proves, dates, contradicts, or leaves them visibly dark)*
**Tagline:** *Don't just read your sources. See what they left in the dark.*
**One-liner:** LEMMA audits sources the way an auditor audits accounts — it declares what a decision *needs* to know (requirement slots), then shows exactly which of those requirements your sources cover, contradict, date, or leave blank — with evidence linked to every finding.

- **Type:** Web application (AI-assisted information-gap detection platform — "Digital Dark Spot")
- **Built by:** One developer, using opencode agents (T1 backend / T2 frontend) under a contract-first protocol
- **Runs on:** 100% free-tier APIs

---

## 2. Problem

People make important decisions (scholarships, admissions, benefits, careers) using scattered online information. Sources **conflict** with each other, go **outdated**, **omit** conditions, and leave questions **unanswered**.

Search engines *find* information. Summarizers *condense* it. But nothing tells a user:

- What information is **missing**?
- Whether sources **contradict** each other?
- Whether information is **outdated**?
- Whether what they have is **complete enough** to act on?

LEMMA answers exactly these — computed from evidence, not narrated by an LLM.

---

## 3. Target Users

- Students and professionals making **document-bound decisions** (scholarships, admissions, benefits, tenders).
- Anyone checking whether a **claim-website** (biography pages, wikis, aggregators, incident articles) is trustworthy about what it asserts.

---

## 4. Core Concept — Decision-as-Schema

A decision needs a finite, enumerable set of information — **requirement slots**: eligibility criteria, application deadline, required documents, award amount, renewal conditions, application process, exclusions, official portal, etc.

Instead of asking *"what do these sources say?"* (every summarizer's question), LEMMA asks:

> **"Which of these slots remain empty — and why?"**

Claims extracted from sources are mapped onto slots. Gaps, conflicts, and staleness become **computed, visually inspectable properties of a matrix** — never invented by an LLM. This inversion (slot-filling flipped: the *empty* slots are the product) is the project's core originality.

---

## 5. Features

### F1 — Decision Readiness Auditor (core)

- **Input:** topic/question + optional URLs / PDFs / screenshots + domain pills (Education · Benefits · Policy).
- **Auto-search:** Tavily gathers remaining relevant sources (up to ~6 total).
- **Live pipeline view (transparency as a feature):** the user watches everything happen in real time after pressing Enter —
  - 4-stage rail: `Ingest → Extract → Map → Analyze`, lighting up live;
  - a curated event feed streaming typed events as they occur:
    `🔎 search queries fired → 📄 sources fetched (word count, date found, tier) → 🧩 claims extracted (running count + sample quotes) → 🗺 claims mapped to slots → ⚔️ comparisons (NLI → LLM verdicts) → 🕳 gap probes with reworded retries → ✅ done`.
  - After completion, the matrix takes the screen; a **"view run trace"** link reopens the full event history anytime.
  - Deliberate filter: structured events only (no raw logs/token streams).
- **Coverage Matrix (the product):** one card per requirement slot — coverage bar + finding badges: conflict / staleness / gap / multi-source support. Empty slots are literally rendered dark ("dark spot" visualized).
- **Conflict engine, tiered:** deterministic comparison of parsed dates/amounts/deadlines (programmatic confidence, no hallucination surface) → NLI pre-filter (cached verdicts) → LLM judge for subtle text conflicts. All conflicts labelled **possible**, evidence-linked on both sides.
- **Targeted follow-up search:** a critical empty slot is never declared "not found" after one pass — 2–3 reworded probes run first; the finding states the **full search effort** ("checked 6 sources + 3 targeted searches").
- **Source-tier badges:** Official · Government/PDF · News · Aggregator/Blog — display-only labels; nothing is auto-resolved by tier.
- **Evidence inspector (slide-over):** every finding opens its exact supporting quotes, source URLs, parsed values, highlights in original context.
- **Pooled re-run (the kill-shot):** untick any source from the output → engine recomputes the matrix in seconds from cached claims. Deleting the only source holding a fact converts its slot to a visible gap — proving gaps are *computed*, not narrated.
- **Verification checklist:** programmatically derived from matrix findings; each item links back to its finding and can be ticked.

### F2 — Source Red-Flag Scanner

- Paste one URL → claims extracted → each check-worthy claim verified against independent web evidence (Tavily) → NLI/LLM stance test → **red-flag report:**
  - 🔴 **Refuted** — counter-evidence found (quote vs counter-quote, both clickable)
  - 🟡 **Unsupported** — weight-bearing assertion with no independent confirmation (absence scoped to N searches performed)
  - ⚠️ **Undated / recycled** — no date, past-cycle references, missing citations
  - 🟢 **Corroborated**
- Same engine, pointed at a single source instead of a decision. Also rendered via live event stream.

### Add-ons

- **Attachments as sources:** PDFs (pymupdf text extraction) and images (vision-capable LLM → OCR + claim extraction in one call) become ordinary sources in the run.
- **Voice input:** browser speech-to-text (Web Speech API) → into the prompt box → send button.
- **Local run-history sidebar:** recent analyses, one-click reopen (localStorage/SQLite — like Claude/Gemini's sidebar).
- **`/evals` benchmark scoreboard:** 8 fixed gold test cases on real URLs (2 conflicts, 2 gaps, 2 stale, 2 clean) executed offline by a runner script; committed results displayed read-only in the app. No "run now" button in v1.

### UX principles

- **App-first:** no landing pages, CTAs, or FAQ pages; everything lives behind the sidebar.
- Dark theme (uncovered cells = literal dark spots).
- Every AI-generated finding labelled as a *signal*, never a verdict.

---

## 6. Honesty Rules (non-negotiable)

1. **"Not found" ≠ "does not exist."** Absence is always scoped: "not found in reviewed sources."
2. **Refuted requires counter-evidence.** Conflicts stay "possible" until evidence-backed.
3. **Every finding traceable:** quote → source URL → location in page.
4. **No confident written verdicts** — the matrix and badges carry the conclusion.
5. **Five evidential states everywhere:**
   `Supported by sources · Contradicted by sources · Potentially outdated · Not found in reviewed sources · Unverified`

---

## 7. Success Criteria (hackathon)

| # | Criterion | Measured by |
|---|---|---|
| 1 | F1 flow works live on real URLs | coverage matrix + evidence inspector + checklist end-to-end |
| 2 | Re-run visibly re-derives the matrix | live demo (untick a source, watch the matrix move) |
| 3 | F2 produces a defensible red-flag report on a real URL | refuted/unsupported/corroborated items with evidence |
| 4 | Zero fabricated contradictions; all findings inspectable | every finding opens real quotes + URLs |
| 5 | Entire demo runs on free API tiers | run-trace event feed shows live counts of searches, claims extracted, comparisons run (no paid calls anywhere) |
| 6 | P0 gate hit on schedule | F1 end-to-end within first ~10 hours |

---

## 8. Out of Scope (v1 — future scope only)

User accounts/auth · vector databases · knowledge-graph views · auto-written verdict summaries · multilingual sources · shareable public run links · "Run evals" button · browser extension · PDF/attachment deep parsing beyond text+vision OCR.

---

## 9. References

- Live pipeline transparency pattern: agentic research design lessons (agenticdevelopercookbook.com) — citation metadata at retrieval time raised observed citation accuracy to ~92%.
- Hybrid contradiction detection state-of-the-art: LegalWiz (arXiv:2510.03418), MAGIC (EMNLP 2025 Findings), CONFLICTS (arXiv:2506.08500) — LLMs alone fail to localize conflicts; hybrid NLI+LLM is best practice.
- Gap-question difficulty: QuestBench (arXiv:2503.22674) — models solve specified problems but cannot identify the right question when information is missing.
