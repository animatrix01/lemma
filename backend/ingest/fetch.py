import httpx, io, re
from urllib.parse import urlparse
import fitz
import trafilatura
from backend.ingest.tiers import classify_tier
from backend.ingest.dates import extract_date
from backend.config import settings


async def fetch_one(url: str) -> dict:
    import os
    if os.path.exists(url):
        # local attachment
        with open(url, "rb") as f:
            raw = f.read()
        ctype = ""
        if url.lower().endswith(".pdf"):
            ctype = "application/pdf"
        elif url.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            ctype = "image/png"
        else:
            ctype = "text/html"
        # process below by duplicating logic? Instead handle here:
        text = ""
        title = os.path.basename(url)
        page_date = None
        if "pdf" in ctype:
            doc = fitz.open(stream=raw, filetype="pdf")
            text = "\n".join(p.get_text() for p in doc)
            title = (doc.metadata or {}).get("title") or title
        elif "image" in ctype:
            text = _vision_ocr(raw)
        else:
            try:
                text = raw.decode("utf-8", "ignore")
            except Exception:
                text = ""
        tier = classify_tier(url, ctype)
        return {"url": url, "title": title, "text": text or "", "page_date": page_date, "tier": tier, "words": len((text or "").split()), "error": None}
    last_err = None
    for _ in range(2):
        try:
            async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:
                r = await client.get(url)
                r.raise_for_status()
                ctype = r.headers.get("content-type", "")
                raw = r.content
                text = ""
                title = None
                page_date = None
                html = r.text if "html" in ctype.lower() else ""
                if "pdf" in ctype.lower() or url.lower().endswith(".pdf"):
                    doc = fitz.open(stream=raw, filetype="pdf")
                    text = "\n".join(p.get_text() for p in doc)
                    title = (doc.metadata or {}).get("title")
                    page_date = (doc.metadata or {}).get("creationDate")
                elif "image" in ctype.lower():
                    text = _vision_ocr(raw)
                else:
                    extracted = trafilatura.extract(raw.decode("utf-8", "ignore"), include_comments=False, include_tables=True)
                    text = extracted or ""
                    meta = trafilatura.extract_metadata(raw.decode("utf-8", "ignore"))
                    if meta:
                        title = meta.title
                        page_date = meta.date
                if not page_date:
                    page_date = extract_date(text, None, html)
                tier = classify_tier(url, ctype)
                return {
                    "url": url,
                    "title": title,
                    "text": text or "",
                    "page_date": page_date,
                    "tier": tier,
                    "words": len((text or "").split()),
                    "error": None,
                }
        except Exception as e:
            last_err = str(e)
    return {"url": url, "title": None, "text": "", "page_date": None, "tier": "Aggregator/Blog", "words": 0, "error": last_err}


def _vision_ocr(raw: bytes) -> str:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        import PIL.Image, io as _io
        img = PIL.Image.open(_io.BytesIO(raw))
        resp = model.generate_content(["Extract all readable text from this image.", img])
        return resp.text or ""
    except Exception:
        return ""