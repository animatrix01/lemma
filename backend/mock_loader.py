import json, os
from pathlib import Path

MOCK_DIR = Path(__file__).resolve().parent.parent / "contracts" / "mock_json"


def load(name: str):
    with open(MOCK_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)
