import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    HF_TOKEN: str = ""

    DATABASE_URL: str = "sqlite:///./lemma.db"
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000

    TAVILY_MAX_INITIAL_SOURCES: int = 6
    TAVILY_MAX_GAP_PROBES: int = 3
    TAVILY_MAX_SCANNER_CLAIM_CHECKS: int = 20

    @property
    def db_path(self) -> Path:
        url = self.DATABASE_URL
        if url.startswith("sqlite:///"):
            return Path(url.replace("sqlite:///", ""))
        return Path("lemma.db")

    def clean(self, v: str) -> str:
        return v.strip().strip('"').strip("'").strip()


settings = Settings()

# normalize keys loaded from .env (strip stray spaces/quotes)
settings.GROQ_API_KEY = settings.clean(settings.GROQ_API_KEY)
settings.GEMINI_API_KEY = settings.clean(settings.GEMINI_API_KEY)
settings.TAVILY_API_KEY = settings.clean(settings.TAVILY_API_KEY)
settings.HF_TOKEN = settings.clean(settings.HF_TOKEN)
config = settings
