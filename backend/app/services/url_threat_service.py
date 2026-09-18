"""URL threat intelligence (Google Safe Browsing).

Ported from llm-prompt-security-middleware (portfolio consolidation).
Checks extracted URLs against Google Safe Browsing v4 (threatMatches:find).
When no API key is configured the service is inert and detection degrades
to the heuristic tier in the URL-threat detector - never an error.
"""

from __future__ import annotations

import httpx

from app.core.config import settings

_THREAT_TYPES = [
    "MALWARE",
    "SOCIAL_ENGINEERING",
    "UNWANTED_SOFTWARE",
    "POTENTIALLY_HARMFUL_APPLICATION",
]

_PLATFORM_TYPES = ["ANY_PLATFORM"]
_THREAT_ENTRY_TYPES = ["URL"]

SB_URL = "https://safebrowsing.googleapis.com/v4/threatMatches:find"


async def check_url(url: str) -> str | None:
    """Return the Safe Browsing threat type for `url`, or None if clean/unknown.

    - No API key configured  -> None (heuristic tier only)
    - Network/API error      -> None (fail open; heuristics still apply)
    - Threat found           -> the threat type string (e.g. SOCIAL_ENGINEERING)
    """
    if not settings.safe_browsing_api_key:
        return None

    payload = {
        "client": {"clientId": "mcp-guardian", "clientVersion": "1.0"},
        "threatInfo": {
            "threatTypes": _THREAT_TYPES,
            "platformTypes": _PLATFORM_TYPES,
            "threatEntryTypes": _THREAT_ENTRY_TYPES,
            "threatEntries": [{"url": url}],
        },
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            response = await client.post(
                f"{SB_URL}?key={settings.safe_browsing_api_key}", json=payload
            )
            response.raise_for_status()
            data = response.json()
    except Exception:  # noqa: BLE001 - threat intel must never break the pipeline
        return None

    matches = data.get("matches")
    if not matches:
        return None
    threat = matches[0].get("threatType")
    return str(threat) if threat else None
