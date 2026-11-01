# Domain-specific seed requirements - used only when domain is clearly identified
DOMAIN_SEEDS = {
    "scholarship": [
        ("eligibility", "Eligibility", "Who can apply / criteria", True),
        ("deadline", "Application deadline", "Last date to apply", True),
        ("documents", "Required documents", "Documents needed to apply", True),
        ("amount", "Award amount", "Funding amount", True),
        ("process", "Application process", "How to apply", True),
        ("renewal_conditions", "Renewal conditions", "Conditions to renew", False),
        ("disbursement", "Disbursement", "How funds are paid", False),
        ("exclusions", "Exclusions", "Who/what is excluded", False),
        ("official_portal", "Official portal", "Official application link", True),
        ("contact", "Contact", "Contact info", False),
    ],
    "government_scheme": [
        ("eligibility", "Eligibility", "Who qualifies for benefits", True),
        ("benefits", "Benefits", "What benefits are provided", True),
        ("application_process", "Application process", "How to apply", True),
        ("required_documents", "Required documents", "Documents needed", True),
        ("deadlines", "Important dates", "Application or renewal deadlines", False),
        ("official_portal", "Official portal", "Official application website", True),
        ("exclusions", "Exclusions", "Who is not eligible", False),
    ],
    "policy": [
        ("effective_date", "Effective date", "When the policy takes effect", True),
        ("scope", "Scope", "What the policy covers", True),
        ("requirements", "Requirements", "What is required by the policy", True),
        ("exemptions", "Exemptions", "Exceptions to the policy", False),
        ("enforcement", "Enforcement", "How the policy is enforced", False),
    ],
}


def seeded_slots(topic: str = "", domain: str = "", question: str = ""):
    """
    Generate domain-appropriate seed slots based on the actual query.
    
    Returns curated seeds only when domain is clear, otherwise generates
    query-specific slots via LLM to avoid forcing irrelevant categories.
    """
    # Try to detect domain from explicit domain parameter or topic/question
    detected_domain = _detect_domain(topic, domain, question)
    
    if detected_domain and detected_domain in DOMAIN_SEEDS:
        # Use curated seeds for known domains
        seeds = DOMAIN_SEEDS[detected_domain]
        return [{"key": k, "label": l, "definition": d, "is_core": c} for (k, l, d, c) in seeds]
    
    # For unclear or unique topics, generate query-specific slots
    return _generate_query_specific_slots(topic, question)


def _detect_domain(topic: str, domain: str, question: str) -> str | None:
    """Detect the research domain from topic and question."""
    combined = f"{topic} {question} {domain}".lower()
    
    # Scholarship indicators
    if any(word in combined for word in ["scholarship", "financial aid", "grant", "fellowship", "bursary"]):
        return "scholarship"
    
    # Government scheme indicators
    if any(word in combined for word in ["scheme", "benefit", "pension", "subsidy", "welfare"]) and \
       any(word in combined for word in ["government", "central", "state", "ministry"]):
        return "government_scheme"
    
    # Policy indicators
    if any(word in combined for word in ["policy", "regulation", "guideline", "directive", "circular"]):
        return "policy"
    
    # If domain is explicitly "Education" but no scholarship keywords, might be scholarship
    if domain and domain.lower() == "education" and \
       any(word in combined for word in ["apply", "application", "eligibility", "deadline"]):
        return "scholarship"
    
    return None


def _generate_query_specific_slots(topic: str, question: str) -> list[dict]:
    """Generate slots specifically relevant to this research question using LLM."""
    from backend.llm_router import chat
    import json, re
    
    combined_query = f"{topic}. {question}" if question else topic
    
    prompt = f"""Analyze this research question and identify 5-8 critical information requirements that need verification:

Research Question: "{combined_query}"

Generate specific, relevant verification criteria for THIS question only. Do not use generic categories.

For example:
- If asking "Is person X eliminated from show Y?" → criteria like: elimination_status, official_confirmation, episode_details, conflicting_reports
- If asking about a product → criteria like: features, pricing, availability, technical_specs
- If asking about an event → criteria like: date, location, participants, status

Return JSON with this exact structure:
{{"slots": [{{"key": "snake_case_key", "label": "Human Label", "definition": "What this verifies", "is_core": true}}]}}

Generate 5-8 slots. Mark the 3-4 most critical as is_core: true."""
    
    try:
        raw = chat([{"role": "user", "content": prompt}], temperature=0.3)
        try:
            data = json.loads(raw)
        except Exception:
            # Try to extract JSON from response
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            data = json.loads(m.group(0)) if m else {"slots": []}
        
        slots = data.get("slots", [])
        
        # Validate and ensure required fields
        validated_slots = []
        for s in slots:
            if "key" in s and "label" in s:
                validated_slots.append({
                    "key": s["key"],
                    "label": s.get("label", s["key"]),
                    "definition": s.get("definition", ""),
                    "is_core": s.get("is_core", False)
                })
        
        # Ensure at least 3 slots
        if len(validated_slots) < 3:
            validated_slots = _get_fallback_slots(topic)
        
        return validated_slots
    except Exception as e:
        # Fallback to generic verification slots
        return _get_fallback_slots(topic)


def _get_fallback_slots(topic: str) -> list[dict]:
    """Minimal fallback slots when LLM generation fails."""
    return [
        {"key": "key_claim", "label": "Primary claim or statement", "definition": "The main assertion to verify", "is_core": True},
        {"key": "official_confirmation", "label": "Official confirmation", "definition": "Official or authoritative source confirmation", "is_core": True},
        {"key": "supporting_evidence", "label": "Supporting evidence", "definition": "Additional corroborating information", "is_core": False},
        {"key": "contradicting_information", "label": "Contradicting information", "definition": "Any conflicting reports or statements", "is_core": True},
        {"key": "date_or_timeline", "label": "Date or timeline", "definition": "When the event occurred or information was published", "is_core": False},
    ]


def extend_slots(topic: str, question: str, existing_keys: list[str]) -> list[dict]:
    """
    Optionally extend slots with query-specific additions.
    
    This should only add highly relevant requirements that weren't captured
    in the initial seed generation.
    """
    from backend.llm_router import chat
    import json, re
    
    combined_query = f"{topic}. {question}" if question else topic
    
    prompt = f"""Given this research question and existing verification criteria, suggest 0-3 additional critical requirements that are missing.

Research Question: "{combined_query}"
Existing criteria: {existing_keys}

Only suggest additional criteria if they are:
1. Highly relevant to THIS specific question
2. Not already covered by existing criteria
3. Critical for verification (not minor details)

Return JSON: {{"slots": [{{"key": "snake_case", "label": "Label", "definition": "Definition", "is_core": false}}]}}

If no additional criteria are needed, return: {{"slots": []}}"""
    
    try:
        raw = chat([{"role": "user", "content": prompt}], temperature=0)
        try:
            data = json.loads(raw)
        except Exception:
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            data = json.loads(m.group(0)) if m else {"slots": []}
        
        slots = data.get("slots", [])
        
        # Filter out any that duplicate existing keys
        new_slots = []
        for s in slots:
            if s.get("key") and s["key"] not in existing_keys:
                new_slots.append({
                    "key": s["key"],
                    "label": s.get("label", s["key"]),
                    "definition": s.get("definition", ""),
                    "is_core": False
                })
        
        return new_slots[:3]  # Maximum 3 extensions
    except Exception:
        return []