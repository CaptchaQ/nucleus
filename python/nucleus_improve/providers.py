"""Provider implementations for the improve loop.

A provider is a single callable: ``call(system: str, user: str) -> str``.

We ship two default providers — Gemini (matches auto-improve) and OpenAI —
plus a dummy deterministic provider for tests/offline runs.
"""

from __future__ import annotations

import os
from typing import Optional

from .core import Provider


def gemini_provider(
    api_key: Optional[str] = None,
    model: str = "gemini-flash-latest",
) -> Provider:
    import requests

    key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY / GOOGLE_API_KEY not set")

    def call(system: str, user: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={key}"
        )
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system}\n\n{user}"}]},
            ],
        }
        r = requests.post(url, json=payload, timeout=120)
        r.raise_for_status()
        data = r.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise RuntimeError(f"gemini: unexpected response {data}")

    return call


def openai_provider(
    api_key: Optional[str] = None,
    model: str = "gpt-4o-mini",
) -> Provider:
    import requests

    key = api_key or os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")

    def call(system: str, user: str) -> str:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.2,
            },
            timeout=120,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]

    return call


def dummy_provider() -> Provider:
    """Deterministic provider for tests — echoes a fixed JSON-ish payload."""

    def call(system: str, user: str) -> str:
        if "JSON array" in system:
            # Return the artifact unchanged wrapped in JSON; no candidates differ.
            import json
            artifact = user.split("--artifact\n", 1)[1].split("\n--N", 1)[0]
            return json.dumps([artifact + " # improved"])
        if "pairwise judge" in system:
            return "B"
        if "grade a text artifact" in system:
            return "50"
        return "50"

    return call
