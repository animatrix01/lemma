import os
from backend.config import settings

GROQ_MODEL = "openai/gpt-oss-120b"
GEMINI_MODEL = "gemini-2.5-flash"


def _groq_client():
    from groq import Groq
    return Groq(api_key=settings.GROQ_API_KEY)


def chat(messages, temperature=0, json_mode=False, vision_image=None):
    # primary groq
    try:
        client = _groq_client()
        kwargs = {"model": GROQ_MODEL, "messages": messages, "temperature": temperature}
        r = client.chat.completions.create(**kwargs)
        return r.choices[0].message.content
    except Exception as e:
        # fallback gemini
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel(GEMINI_MODEL)
            if vision_image is not None:
                r = model.generate_content([messages[-1]["content"], vision_image])
            else:
                prompt = "\n".join(m.get("content", "") for m in messages)
                r = model.generate_content(prompt)
            return r.text
        except Exception:
            raise e