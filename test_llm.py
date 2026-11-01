from backend.llm_router import chat

try:
    result = chat([{"role": "user", "content": "Say hello"}], temperature=0)
    print(f"✅ LLM working! Response: {result[:100]}")
except Exception as e:
    print(f"❌ LLM failed: {str(e)}")
