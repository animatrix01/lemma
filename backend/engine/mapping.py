import math, re
from backend.config import settings


def _hf_embed(texts: list[str]) -> list[list[float]] | None:
    if not settings.HF_TOKEN:
        return None
    try:
        from huggingface_hub import InferenceClient
        client = InferenceClient(token=settings.HF_TOKEN)
        out = client.feature_extraction(texts, model="sentence-transformers/all-MiniLM-L6-v2")
        return [list(x) for x in out]
    except Exception:
        return None


def _tfidf_vec(text: str, vocab: list[str]) -> list[float]:
    toks = re.findall(r"\w+", text.lower())
    vec = [0.0] * len(vocab)
    idx = {w: i for i, w in enumerate(vocab)}
    for t in toks:
        if t in idx:
            vec[idx[t]] += 1.0
    # cosine normalize
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def cosine(a, b):
    return sum(x * y for x, y in zip(a, b))


def prefilter_slots(claim_text: str, slots: list[dict], top_k: int = 6) -> list[str]:
    # returns top-k slot keys
    slot_defs = [f"{s['key']}: {s['definition']}" for s in slots]
    texts = [claim_text] + slot_defs
    embs = _hf_embed(texts)
    if embs is not None and len(embs) == len(texts):
        claim_emb = embs[0]
        scored = []
        for i, s in enumerate(slots):
            scored.append((cosine(claim_emb, embs[i + 1]), s["key"]))
        scored.sort(reverse=True)
        return [k for _, k in scored[:top_k]]
    # TF-IDF degrade
    vocab = sorted(set(re.findall(r"\w+", (claim_text + " " + " ".join(slot_defs)).lower())))
    claim_vec = _tfidf_vec(claim_text, vocab)
    scored = []
    for s in slots:
        v = _tfidf_vec(s["key"] + " " + s["definition"], vocab)
        scored.append((cosine(claim_vec, v), s["key"]))
    scored.sort(reverse=True)
    return [k for _, k in scored[:top_k]]


def finalize_mapping(claim_text: str, candidate_keys: list[str], slots: list[dict]) -> str | None:
    from backend.llm_router import chat
    import json, re
    slot_map = {s["key"]: s for s in slots}
    cand_desc = "\n".join(f"- {k}: {slot_map[k]['definition']}" for k in candidate_keys if k in slot_map)
    prompt = f"""Map the claim to one of these slots or null.
Slots:
{cand_desc}
Claim: {claim_text}
Return JSON: {{"slot_key": "key or null"}}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0)
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0)) if m else {}
    key = data.get("slot_key")
    if key in slot_map:
        return key
    return None