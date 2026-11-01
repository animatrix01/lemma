import asyncio
from backend.ingest.fetch import fetch_one
from backend.engine.claims import extract_claims_from_source

async def test():
    # Test with a simple Wikipedia page
    url = "https://en.wikipedia.org/wiki/Python_(programming_language)"
    print(f"Testing with: {url}\n")
    
    result = await fetch_one(url)
    text = result.get("text", "")
    print(f"✅ Extracted {len(text)} characters")
    print(f"First 200 chars: {text[:200]}...\n")
    
    if text and len(text) > 100:
        print("Extracting claims...")
        claims = extract_claims_from_source(text[:2000])  # Use first 2000 chars for speed
        print(f"✅ Extracted {len(claims)} claims\n")
        
        for i, claim in enumerate(claims[:3], 1):
            print(f"{i}. {claim.get('claim_text', '')}")
            print(f"   Type: {claim.get('type', '')}")
            print()
    else:
        print("❌ Not enough text extracted!")

asyncio.run(test())
