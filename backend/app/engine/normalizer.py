"""Content normalization + decoding.

Attackers hide instructions behind encodings and homoglyphs. The normalizer
produces a canonical form for matching and surfaces any decoded variants so
downstream detectors can inspect the *revealed* payload, not just the wrapper.
"""

from __future__ import annotations

import base64
import binascii
import html
import re
import unicodedata
from urllib.parse import unquote

from app.engine.base import InspectionContext

# Common homoglyph → ascii folding (Cyrillic/Greek look-alikes)
_HOMOGLYPHS = {
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
    "ѕ": "s", "і": "i", "ј": "j", "ԁ": "d", "ո": "n", "г": "r",
    "α": "a", "ο": "o", "ρ": "p", "ν": "v", "ѐ": "e",
}

_ZERO_WIDTH = re.compile(r"[​‌‍⁠﻿]")
_B64 = re.compile(r"\b([A-Za-z0-9+/]{20,}={0,2})\b")
_HEX = re.compile(r"((?:\\x[0-9a-fA-F]{2}){6,})")
_URL_ENC = re.compile(r"((?:%[0-9a-fA-F]{2}){6,})")
_ENTITIES = re.compile(r"((?:&#x?[0-9a-fA-F]+;){4,})")


def _fold_homoglyphs(text: str) -> str:
    return "".join(_HOMOGLYPHS.get(ch, ch) for ch in text)


def _try_b64(s: str) -> str | None:
    try:
        pad = "=" * (-len(s) % 4)
        decoded = base64.b64decode(s + pad, validate=False)
        text = decoded.decode("utf-8", errors="strict")
        # Only surface if it looks like human/instruction text
        if sum(c.isprintable() for c in text) / max(len(text), 1) > 0.8:
            return text
    except (binascii.Error, ValueError, UnicodeDecodeError):
        return None
    return None


def _try_hex(s: str) -> str | None:
    try:
        raw = bytes(int(h, 16) for h in re.findall(r"\\x([0-9a-fA-F]{2})", s))
        return raw.decode("utf-8", errors="ignore") or None
    except ValueError:
        return None


def normalize(raw: str) -> InspectionContext:
    text = unicodedata.normalize("NFKC", raw)
    text = _ZERO_WIDTH.sub("", text)
    folded = _fold_homoglyphs(text)

    decoded: list[str] = []
    for match in _B64.findall(raw):
        d = _try_b64(match)
        if d:
            decoded.append(d)
    for match in _HEX.findall(raw):
        d = _try_hex(match)
        if d:
            decoded.append(d)
    for match in _URL_ENC.findall(raw):
        try:
            decoded.append(unquote(match))
        except Exception:  # noqa: BLE001
            pass
    for match in _ENTITIES.findall(raw):
        try:
            decoded.append(html.unescape(match))
        except Exception:  # noqa: BLE001
            pass

    return InspectionContext(
        raw=raw,
        normalized=folded,
        decoded_variants=[d for d in decoded if d.strip()],
    )
