from datetime import datetime
from typing import Any, List, Optional, Literal
from pydantic import BaseModel, Field


# ---------- SSE envelope ----------
class SSEEnvelope(BaseModel):
    seq: int
    ts: datetime
    type: str
    payload: dict[str, Any] = Field(default_factory=dict)


# ---------- event types ----------
EVENT_TYPES = [
    "search_query",
    "source_fetched",
    "claim_extracted",
    "mapping_progress",
    "conflict_found",
    "gap_probe",
    "finding_finalized",
    "stage_done",
    "run_done",
    "run_failed",
    "scanner_claim_extracted",
    "scanner_check",
    "scanner_verdict",
    "scanner_done",
    "scanner_failed",
]


# ---------- analyze ----------
class AnalyzeRequest(BaseModel):
    topic: str
    question: Optional[str] = None
    domain: Optional[str] = None
    urls: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    run_id: int
    status: Literal["queued"] = "queued"


# ---------- sources ----------
class SourceOut(BaseModel):
    id: int
    url: Optional[str] = None
    title: Optional[str] = None
    page_date: Optional[str] = None
    tier: Optional[str] = None
    words: Optional[int] = None
    active: bool = True


# ---------- slots / matrix ----------
class SlotOut(BaseModel):
    id: int
    key: str
    label: Optional[str] = None
    definition: Optional[str] = None
    is_core: bool = False
    mapped_count: int = 0
    state: Optional[str] = None  # evidential state


class EvidenceOut(BaseModel):
    id: int
    source_id: Optional[int] = None
    quote: Optional[str] = None
    span_start: Optional[int] = None
    span_end: Optional[int] = None
    url: Optional[str] = None


class FindingOut(BaseModel):
    id: int
    slot_id: Optional[int] = None
    slot_key: Optional[str] = None
    kind: str  # GAP|CONFLICT|STALE
    state: str
    detail: dict[str, Any] = Field(default_factory=dict)
    evidence: List[EvidenceOut] = Field(default_factory=list)


class MatrixResponse(BaseModel):
    run_id: int
    status: str
    slots: List[SlotOut] = Field(default_factory=list)
    findings: List[FindingOut] = Field(default_factory=list)


# ---------- evidence ----------
class EvidenceDetailResponse(BaseModel):
    finding_id: int
    chain: List[EvidenceOut] = Field(default_factory=list)
    detail: dict[str, Any] = Field(default_factory=dict)


# ---------- rerun ----------
class RerunRequest(BaseModel):
    disabled_source_ids: List[int] = Field(default_factory=list)


class RerunResponse(BaseModel):
    run_id: int
    status: str = "recomputed"


# ---------- checklist ----------
class ChecklistItemOut(BaseModel):
    id: int
    finding_id: Optional[int] = None
    prompt: str
    target_hint: Optional[str] = None
    done: bool = False


class ChecklistDoneResponse(BaseModel):
    item_id: int
    done: bool = True


# ---------- scanner ----------
class ScannerRequest(BaseModel):
    url: str


class ScannerFindingOut(BaseModel):
    id: int
    claim: str
    quote: Optional[str] = None
    span_start: Optional[int] = None
    span_end: Optional[int] = None
    stance: str  # REFUTED|UNSUPPORTED|UNDATED|CORROBORATED
    evidence: dict[str, Any] = Field(default_factory=dict)


class ScannerReportOut(BaseModel):
    id: int
    url: str
    status: str
    findings: List[ScannerFindingOut] = Field(default_factory=list)


# ---------- history ----------
class RunSummary(BaseModel):
    id: int
    topic: str
    domain: Optional[str] = None
    created_at: Optional[datetime] = None
    status: str


class RunsListResponse(BaseModel):
    runs: List[RunSummary] = Field(default_factory=list)


# ---------- evals ----------
class EvalCase(BaseModel):
    id: str
    kind: str
    passed: bool
    detail: Optional[str] = None


class EvalsResponse(BaseModel):
    cases: List[EvalCase] = Field(default_factory=list)
    summary: dict[str, Any] = Field(default_factory=dict)


# ---------- health ----------
class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
