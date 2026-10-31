import json, re
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.llm_router import chat


class NormalizedValue(BaseModel):
    field: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None


class ClaimOut(BaseModel):
    quote: str
    span_start: int
    span_end: int
    claim_text: str
    type: str  # date|amount|threshold|enumeration|condition|process|other
    normalized_value: NormalizedValue = Field(default_factory=NormalizedValue)
    claim_date: Optional[str] = None


class ClaimList(BaseModel):
    claims: List[ClaimOut]


EXTRACTION_PROMPT = """You are a precise claim extractor. Given a chunk of source text, extract atomic factual claims.
Return JSON: {"claims":[{"quote":verbatim substring,"span_start":int,"span_end":int,"claim_text":string,"type":one of date|amount|threshold|enumeration|condition|process|other,"normalized_value":{"field":string|null,"value":string|null,"unit":string|null},"claim_date":"ISO date or null"}]}
Rules:
- quote must be a verbatim substring of the chunk.
- span_start/span_end are character offsets of quote in chunk.
- No cross-chunk synthesis; only claims present in this chunk.
- One claim per distinct fact.
"""


def chunk_text(text: str, size: int = 400, overlap: float = 0.15) -> list[str]:
    if not text:
        return []
    step = int(size * (1 - overlap))
    chunks = []
    i = 0
    n = len(text)
    while i < n:
        chunks.append(text[i:i + size])
        i += step
        if i >= n:
            break
    return chunks


def extract_claims_from_chunk(chunk: str) -> list[dict]:
    messages = [
        {"role": "user", "content": EXTRACTION_PROMPT + "\n\nTEXT CHUNK:\n" + chunk},
    ]
    raw = chat(messages, temperature=0, json_mode=True)
    data = {}
    try:
        data = json.loads(raw)
    except Exception:
        try:
            m = re.search(r"\{.*\}", raw, re.S)
            data = json.loads(m.group(0)) if m else {}
        except Exception:
            data = {}
    claims = []
    for c in data.get("claims", []):
        # validate quote is substring
        q = c.get("quote", "")
        idx = chunk.find(q)
        if idx == -1:
            continue
        c["span_start"] = idx
        c["span_end"] = idx + len(q)
        try:
            validated = ClaimOut(**c)
            claims.append(validated.model_dump())
        except Exception:
            continue
    return claims


def extract_claims_from_source(text: str) -> list[dict]:
    all_claims = []
    for ch in chunk_text(text):
        all_claims.extend(extract_claims_from_chunk(ch))
    return all_claims