"""In-memory user store with a seeded demo account.

Swap for a real database in production; the interface is intentionally small.
"""

from __future__ import annotations

import uuid

from app.core.security import hash_password, verify_password
from app.schemas.auth import User


class _Record:
    def __init__(self, user: User, password_hash: str) -> None:
        self.user = user
        self.password_hash = password_hash


class UserStore:
    def __init__(self) -> None:
        self._by_email: dict[str, _Record] = {}
        self._by_id: dict[str, _Record] = {}
        self._seed_demo()

    def _seed_demo(self) -> None:
        demo = User(
            id="usr_demo",
            name="Alex Rivera",
            email="demo@mcpguardian.dev",
            role="admin",
            org="Acme Security",
        )
        self._insert(demo, hash_password("guardian"))

    def _insert(self, user: User, password_hash: str) -> None:
        rec = _Record(user, password_hash)
        self._by_email[user.email.lower()] = rec
        self._by_id[user.id] = rec

    def get_by_id(self, user_id: str) -> User | None:
        rec = self._by_id.get(user_id)
        return rec.user if rec else None

    def get_by_email(self, email: str) -> User | None:
        rec = self._by_email.get(email.lower())
        return rec.user if rec else None

    def authenticate(self, email: str, password: str) -> User | None:
        rec = self._by_email.get(email.lower())
        if rec and verify_password(password, rec.password_hash):
            return rec.user
        return None

    def create(self, name: str, email: str, password: str) -> User | None:
        if email.lower() in self._by_email:
            return None
        user = User(
            id=f"usr_{uuid.uuid4().hex[:8]}",
            name=name,
            email=email,
            role="admin",
            org="Acme Security",
        )
        self._insert(user, hash_password(password))
        return user


user_store = UserStore()
