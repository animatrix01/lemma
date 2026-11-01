import asyncio
from backend.ingest.fetch import fetch_one
from backend.engine.claims import extract_claims_from_source

async def test():
    url = "https://www.reuters.com/legal/government/us-set-drop-criminal-fraud-case-against-indias-gautam-adani-sources-say-deal-2026-05-15/"
    result = await fetch_one(url)
    text = result.get("text", "")
    print(f"Text length: {len(text)}")
    print(f"First 500 chars:\n{text[:500]}\n")
    
    if text:
        claims = extract_claims_from_source(text)
        print(f"\nExtracted {len(claims)} claims:")
        for i, claim in enumerate(claims[:5], 1):
            print(f"{i}. {claim.get('claim_text', '')[:80]}...")
    else:
        print("No text extracted!")

asyncio.run(test())
