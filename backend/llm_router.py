import os
import json
from backend.config import settings

GROQ_MODEL = "qwen/qwen3.8-27b"
GEMINI_MODEL = "gemini-2.0-flash-exp"


def _groq_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def _gemini_model():
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return genai.GenerativeModel(GEMINI_MODEL)


def chat(messages, temperature=0, json_mode=False, vision_image=None):
    # primary gemini
    try:
        model = _gemini_model()
        if vision_image is not None:
            r = model.generate_content([messages[-1]["content"], vision_image])
        else:
            prompt = "\n".join(f"{m.get('role','user')}: {m.get('content','')}" for m in messages)
            r = model.generate_content(prompt)
        return r.text
    except Exception as e:
        # fallback groq
        try:
            client = _groq_client()
            kwargs = {
                "model": GROQ_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 800,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
            r = client.chat.completions.create(**kwargs)
            return r.choices[0].message.content
        except Exception:
            raise e


INTENT_SYSTEM_PROMPT = (
    "You are Lemma, a helpful AI assistant that verifies claims and detects "
    "information gaps before they mislead.\n\n"
    "Your job:\n"
    "1. Chat normally with the user (greetings, questions, small talk, general chat) — "
    "reply helpfully like a normal assistant.\n"
    "2. Only when the user explicitly asks to verify, research, fact-check, or investigate "
    "a claim or topic, respond with intent \"research\" and a concise research_query.\n\n"
    "Return ONLY valid JSON (no markdown fences, no extra text):\n"
    "{\"intent\": \"chat\" | \"research\", \"reply\": \"...\", \"research_query\": \"...\"}\n"
    "- intent \"chat\": reply to the user normally. research_query is null.\n"
    "- intent \"research\": reply briefly acknowledging you will verify it; "
    "research_query is the topic/claim to research.\n"
    "Be concise. Do not over-engineer."
)


def chat_with_intent(user_message: str):
    """Classify the user's message and return a structured intent.

    Returns a dict: {"intent": "chat"|"research", "reply": str, "research_query": str|None}
    """
    messages = [
        {"role": "system", "content": INTENT_SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]
    raw = chat(messages, temperature=0, json_mode=True)
    try:
        data = json.loads(raw)
    except Exception:
        # Fall back to treating it as a normal chat if we can't parse JSON.
        return {"intent": "chat", "reply": raw.strip(), "research_query": None}
    intent = data.get("intent", "chat")
    if intent not in ("chat", "research"):
        intent = "chat"
    return {
        "intent": intent,
        "reply": data.get("reply", ""),
        "research_query": data.get("research_query"),
    }