import re
from urllib.parse import urlparse

NEWS_DOMAINS = {
    "ndtv.com", "timesofindia.indiatimes.com", "thehindu.com", "indianexpress.com",
    "hindustantimes.com", "news18.com", "livemint.com", "economictimes.indiatimes.com",
}


def classify_tier(url: str, content_type: str = "") -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if url.lower().endswith(".pdf") or "pdf" in (content_type or "").lower():
        return "Government/PDF"
    if host.endswith(".gov.in") or host.endswith(".ac.in"):
        return "Official"
    if host in NEWS_DOMAINS or any(host.endswith(d) for d in NEWS_DOMAINS):
        return "News"
    return "Aggregator/Blog"
