CORE_SLOTS = [
    ("eligibility", "Eligibility", "Who can apply / criteria", True),
    ("deadline", "Application deadline", "Last date to apply", True),
    ("documents", "Required documents", "Documents needed to apply", True),
    ("amount", "Award amount", "Funding amount", True),
    ("process", "Application process", "How to apply", True),
    ("renewal_conditions", "Renewal conditions", "Conditions to renew", True),
    ("disbursement", "Disbursement", "How funds are paid", True),
    ("exclusions", "Exclusions", "Who/what is excluded", True),
    ("official_portal", "Official portal", "Official application link", True),
    ("contact", "Contact", "Contact info", True),
]


def seeded_slots():
    return [{"key": k, "label": l, "definition": d, "is_core": c} for (k, l, d, c) in CORE_SLOTS]


def extend_slots(topic: str, existing_keys: list[str]) -> list[dict]:
    # LLM topic extension
    from backend.llm_router import chat
    import json, re
    prompt = f"""Given topic '{topic}', propose up to 3 additional requirement slots not in {existing_keys}.
Return JSON: {{"slots":[{{"key":snake_case,"label":str,"definition":str,"is_core":false}}]}}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0)
    try:
        data = json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.S)
        data = json.loads(m.group(0)) if m else {"slots": []}
    return data.get("slots", [])