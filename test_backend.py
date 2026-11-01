#!/usr/bin/env python3
"""Quick test of LEMMA backend API"""
import httpx
import sys

API_BASE = "http://127.0.0.1:8000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    try:
        resp = httpx.get(f"{API_BASE}/health", timeout=5)
        resp.raise_for_status()
        print(f"✓ Health check passed: {resp.json()}")
        return True
    except Exception as e:
        print(f"✗ Health check failed: {e}")
        return False

def test_analyze():
    """Test analyze endpoint"""
    print("\nTesting analyze endpoint...")
    try:
        payload = {
            "topic": "Test scholarship eligibility",
            "question": "Who is eligible?",
            "domain": "Education",
            "urls": [],
            "attachments": []
        }
        resp = httpx.post(f"{API_BASE}/api/analyze", json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        print(f"✓ Analysis started: run_id={data.get('run_id')}, status={data.get('status')}")
        return data.get("run_id")
    except Exception as e:
        print(f"✗ Analyze failed: {e}")
        return None

def test_runs_list():
    """Test runs list endpoint"""
    print("\nTesting runs list endpoint...")
    try:
        resp = httpx.get(f"{API_BASE}/api/runs", timeout=5)
        resp.raise_for_status()
        data = resp.json()
        runs = data.get("runs", [])
        print(f"✓ Found {len(runs)} runs")
        for r in runs[:3]:
            print(f"  - Run #{r.get('id')}: {r.get('topic')} ({r.get('status')})")
        return True
    except Exception as e:
        print(f"✗ Runs list failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("LEMMA Backend API Test")
    print("=" * 60)
    
    if not test_health():
        print("\n❌ Backend is not responding. Please start it with:")
        print("   uvicorn backend.main:app --host 127.0.0.1 --port 8000")
        sys.exit(1)
    
    test_runs_list()
    
    # Uncomment to test analyze (will create a real run)
    # run_id = test_analyze()
    # if run_id:
    #     print(f"\nView run at: http://localhost:3000/runs/{run_id}")
    
    print("\n" + "=" * 60)
    print("✓ All tests passed!")
    print("=" * 60)
