from tavily import TavilyClient
from backend.config import settings


def gather_sources(topic: str, user_urls: list[str], max_sources: int = None) -> list[str]:
    max_sources = max_sources or settings.TAVILY_MAX_INITIAL_SOURCES
    urls = list(user_urls or [])
    seen = set(urls)
    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        res = client.search(query=topic, max_results=max_sources, search_depth="basic")
        for r in (res.get("results") or []):
            u = r.get("url")
            if u and u not in seen:
                seen.add(u)
                urls.append(u)
                if len(urls) >= max_sources + len(user_urls or []):
                    break
    except Exception:
        pass
    # user urls first, never replaced: ensure user urls at front
    user_set = set(user_urls or [])
    ordered = [u for u in (user_urls or [])] + [u for u in urls if u not in user_set]
    # cap total to max_sources + user extras? keep all user + fill
    final = []
    seen2 = set()
    for u in ordered:
        if u in seen2:
            continue
        seen2.add(u)
        final.append(u)
        if len(final) >= max(max_sources, len(user_urls or [])):
            # allow user extras beyond cap
            if len(final) >= max_sources and not (u in user_set and len([x for x in final if x in user_set]) < len(user_urls or [])):
                # stop only if no more user urls pending
                pending_user = [x for x in (user_urls or []) if x not in final]
                if not pending_user:
                    break
    # include any remaining user urls
    for u in (user_urls or []):
        if u not in final:
            final.append(u)
    return final