"""URL-threat detection.

Ported from llm-prompt-security-middleware's URL intelligence (portfolio
consolidation). Heuristic tier: high-signal URL patterns - IP-literal hosts,
known shorteners, suspicious TLDs, punycode homoglyphs, embedded credentials,
phishing keywords. ML/intel tier (optional): Google Safe Browsing lookups for
extracted URLs, cached and checked asynchronously so the synchronous inspect
path never blocks on network I/O.
"""

from __future__ import annotations

import asyncio
import re
import time

from app.core.config import settings
from app.engine.base import Detector, InspectionContext
from app.schemas.events import DetectionSignal, ThreatCategory
from app.services import url_threat_service

_URL = re.compile(r"https?://[^\s\"'<>\\)]+", re.I)
_IP_HOST = re.compile(r"^https?://(\d{1,3}\.){3}\d{1,3}", re.I)
_PUNYCODE = re.compile(r"https?://[^\s/]*xn--[^\s/]*", re.I)
_CRED_IN_URL = re.compile(r"https?://[^\s/@]+:[^\s/@]+@", re.I)
_SUSPICIOUS_TLDS = {
    "zip", "mov", "tk", "ml", "ga", "cf", "gq", "top", "xyz", "click", "country",
}
_SHORTENERS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "cutt.ly", "rb.gy",
    "shorturl.at", "tiny.cc", "rebrand.ly", "t.ly",
}
_PHISH_KEYWORDS = re.compile(
    r"(verify|secure|login|update|confirm|account|webscr|ebayisapi|free-|-bonus)",
    re.I,
)

# Safe Browsing result cache: url -> (threat_type or None, checked_at)
_SB_CACHE: dict[str, tuple[str | None, float]] = {}
_SB_TTL_SECONDS = 600
_SB_MAX_INFLIGHT_PER_INSPECT = 3


def _extract_urls(ctx: InspectionContext) -> list[str]:
    urls: list[str] = []
    for text in [ctx.raw, ctx.normalized, *ctx.decoded_variants]:
        for m in _URL.finditer(text or ""):
            url = m.group(0).rstrip(".,;:!?")
            if url not in urls:
                urls.append(url)
    return urls


def _heuristic_score(url: str) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    host = ""
    rest = url.split("://", 1)[-1]
    if "@" in rest.split("/", 1)[0]:
        rest = rest.split("/", 1)[0].split("@", 1)[-1]
    host = rest.split("/", 1)[0].split(":", 1)[0].lower()
    tld = host.rsplit(".", 1)[-1] if "." in host else ""

    if _IP_HOST.match(url):
        score = max(score, 55)
        reasons.append("IP-literal host instead of a domain name")
    if _PUNYCODE.match(url):
        score = max(score, 65)
        reasons.append("punycode host can hide homoglyph look-alikes")
    if _CRED_IN_URL.match(url):
        score = max(score, 60)
        reasons.append("credentials embedded in the URL")
    if host in _SHORTENERS:
        score = max(score, 45)
        reasons.append("URL shortener obscures the destination")
    if tld in _SUSPICIOUS_TLDS:
        score = max(score, 60)
        reasons.append(f"suspicious TLD .{tld}")
    if _PHISH_KEYWORDS.search(url):
        score = max(score, 40)
        reasons.append("phishing-style keywords in the URL")

    return score, reasons


def _schedule_safebrowsing_checks(urls: list[str]) -> None:
    """Fire-and-forget Safe Browsing lookups (never blocks the pipeline)."""
    if not settings.safe_browsing_api_key:
        return
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return

    now = time.time()
    pending = 0
    for url in urls:
        if pending >= _SB_MAX_INFLIGHT_PER_INSPECT:
            break
        cached = _SB_CACHE.get(url)
        if cached and now - cached[1] < _SB_TTL_SECONDS:
            continue
        pending += 1

        async def _check(u: str = url) -> None:
            try:
                threat = await url_threat_service.check_url(u)
                _SB_CACHE[u] = (threat, time.time())
            except Exception:  # noqa: BLE001
                pass

        loop.create_task(_check())


def _cached_threat(urls: list[str]) -> str | None:
    now = time.time()
    for url in urls:
        cached = _SB_CACHE.get(url)
        if cached and now - cached[1] < _SB_TTL_SECONDS and cached[0]:
            return cached[0]
    return None


class URLThreatDetector(Detector):
    name = "URL Threat"
    category = ThreatCategory.URL_THREAT
    tier = "hybrid"

    @property
    def upgraded(self) -> bool:
        return bool(settings.safe_browsing_api_key)

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        urls = _extract_urls(ctx)
        if not urls:
            return []

        score, reasons = 0.0, []
        for url in urls:
            s, r = _heuristic_score(url)
            if s > score:
                score, reasons = s, r

        threat = _cached_threat(urls) if self.upgraded else None
        if threat:
            score = max(score, 92)
            reasons = [f"Google Safe Browsing: {threat}"] + reasons

        if score <= 0:
            # Clean so far - schedule intel lookups for next time.
            _schedule_safebrowsing_checks(urls)
            return []

        confidence = 0.95 if threat else min(0.9, 0.4 + score / 100)
        return [
            self._signal(
                score=score,
                confidence=confidence,
                message=f"URL threat: {reasons[0]}" if len(reasons) == 1
                else f"URL threat ({len(reasons)} indicators): {'; '.join(reasons[:3])}",
                matched=[u[:80] for u in urls[:3]],
            )
        ]
