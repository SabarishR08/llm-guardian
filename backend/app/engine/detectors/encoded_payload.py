"""Encoded / obfuscated payload detection.

Flags high-entropy or encoded spans (base64, hex escapes, url-encoding, HTML
entities). If the normalizer already decoded a variant to readable text, that's
a strong signal the encoding was hiding an instruction.
"""

from __future__ import annotations

import math
import re

from app.engine.base import Detector, InspectionContext
from app.schemas.events import DetectionSignal, ThreatCategory

_B64 = re.compile(r"\b[A-Za-z0-9+/]{24,}={0,2}\b")
_HEX = re.compile(r"(?:\\x[0-9a-fA-F]{2}){6,}")
_URL = re.compile(r"(?:%[0-9a-fA-F]{2}){8,}")
_ENT = re.compile(r"(?:&#x?[0-9a-fA-F]+;){6,}")

# A token that is *only* hex digits - a file hash / IOC (SHA-256, MD5, …), not
# base64. The base64 alphabet is a superset of hex, so the _B64 pattern matches
# these; we must not treat them as encoded payloads.
_HEX_TOKEN = re.compile(r"[0-9a-fA-F]+")

# Context that means a hex/base64 blob is genuinely meant to be decoded or run -
# only then is a hex string an "encoded payload" rather than an indicator.
_DECODE_CONTEXT = re.compile(
    r"\b(decode|decrypt|deflate|gunzip|gzip|fromhexstring|frombase64string|atob|"
    r"unescape|iex|invoke-expression|eval|exec|shellcode|-enc(odedcommand)?|"
    r"powershell\s+-e|payload)\b",
    re.I,
)


def _entropy(s: str) -> float:
    if not s:
        return 0.0
    counts: dict[str, int] = {}
    for ch in s:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


class EncodedPayloadDetector(Detector):
    name = "EncodedPayloadDetector"
    category = ThreatCategory.ENCODED_PAYLOAD
    tier = "heuristic"

    def inspect(self, ctx: InspectionContext) -> list[DetectionSignal]:
        matched: list[str] = []
        score = 0.0
        labels: set[str] = set()

        decode_context = bool(_DECODE_CONTEXT.search(ctx.raw))

        for pat, weight, label in (
            (_B64, 58, "base64"),
            (_HEX, 60, "hex-escape"),
            (_URL, 55, "url-encoded"),
            (_ENT, 54, "html-entities"),
        ):
            m = pat.search(ctx.raw)
            if not m:
                continue
            span = m.group(0)

            if label == "base64":
                if _entropy(span) <= 3.2:
                    continue
                # A pure-hex token is a hash / IOC (SHA-256, SHA-1, MD5, …), not a
                # base64 payload. Only treat it as encoded if the surrounding text
                # actually asks to decode or execute it. This stops legitimate
                # cybersecurity artifacts (hashes, IOC lists) from being flagged.
                if _HEX_TOKEN.fullmatch(span) and not decode_context:
                    continue

            matched.append(span[:60])
            score = max(score, weight)
            labels.add(label)

        # If decoding revealed readable text, escalate hard.
        if ctx.decoded_variants:
            score = max(score, 72)
            labels.add("decoded-to-text")
            matched.extend(v[:50] for v in ctx.decoded_variants[:2])

        if score == 0:
            return []

        return [
            self._signal(
                score=score,
                confidence=0.55 + (0.25 if ctx.decoded_variants else 0),
                message=f"Obfuscated payload ({', '.join(sorted(labels))}) - possible hidden instruction.",
                matched=matched,
            )
        ]
