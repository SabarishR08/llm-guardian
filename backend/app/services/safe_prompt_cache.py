"""Safe-prompt cache with TTL + LRU eviction.

Ported from llm-prompt-security-middleware (portfolio consolidation).
Caches verdicts for content hashes that previously inspected clean
(ALLOW verdict, low risk). On a hit, the pipeline skips the detector
fan-out entirely - a fast path for repeated benign prompts. Any signal
present means never cached; blocked/quarantined content is never cached.
"""

from __future__ import annotations

import hashlib
import time
from collections import OrderedDict


class SafePromptCache:
    def __init__(self, maxsize: int = 1024, ttl_seconds: int = 600) -> None:
        self.maxsize = maxsize
        self.ttl = ttl_seconds
        self._store: OrderedDict[str, tuple[float, dict]] = OrderedDict()
        self.hits = 0
        self.misses = 0

    @staticmethod
    def key_for(content: str) -> str:
        return hashlib.sha256(content.encode("utf-8", errors="replace")).hexdigest()

    def get(self, content: str) -> dict | None:
        key = self.key_for(content)
        entry = self._store.get(key)
        if entry is None:
            self.misses += 1
            return None
        ts, payload = entry
        if time.time() - ts > self.ttl:
            del self._store[key]
            self.misses += 1
            return None
        self._store.move_to_end(key)
        self.hits += 1
        return payload

    def put(self, content: str, payload: dict) -> None:
        self._store[self.key_for(content)] = (time.time(), payload)
        self._store.move_to_end(self.key_for(content))
        while len(self._store) > self.maxsize:
            self._store.popitem(last=False)

    def stats(self) -> dict:
        total = self.hits + self.misses
        return {
            "size": len(self._store),
            "maxsize": self.maxsize,
            "ttl_seconds": self.ttl,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(self.hits / total, 4) if total else 0.0,
        }

    def clear(self) -> None:
        self._store.clear()
        self.hits = 0
        self.misses = 0


# module-level singleton
safe_prompt_cache = SafePromptCache()
