import re

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"


def extract_date(text: str, metadata_date: str = None, html: str = None) -> str:
    if metadata_date:
        return str(metadata_date).strip()
    # copyright year
    m = re.search(r"(?:©|copyright)\s*(\d{4})", (html or "") + " " + (text or ""), re.I)
    if m:
        return m.group(1)
    # ISO date
    m = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text or "")
    if m:
        return m.group(1)
    # "12 March 2025"
    m = re.search(rf"\b(\d{{1,2}}\s+(?:{MONTHS})\s+\d{{4}})\b", text or "", re.I)
    if m:
        return m.group(1)
    return None
