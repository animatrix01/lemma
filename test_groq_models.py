from groq import Groq
from backend.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

# Test the available models
test_models = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "allam-2-7b"
]

print("Testing available models:")
for model in test_models:
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say hello in 3 words"}],
            max_tokens=20
        )
        print(f"✅ {model} - WORKS")
        print(f"   Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ {model} - {str(e)[:100]}")
