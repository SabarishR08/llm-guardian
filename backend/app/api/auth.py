"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.schemas.auth import (
    AuthResponse,
    ForgotRequest,
    LoginRequest,
    RegisterRequest,
    User,
)
from app.services.user_store import user_store

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> AuthResponse:
    user = user_store.authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    token = create_access_token(user.id, {"email": user.email, "role": user.role})
    return AuthResponse(access_token=token, user=user)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest) -> AuthResponse:
    user = user_store.create(body.name, body.email, body.password)
    if user is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    token = create_access_token(user.id, {"email": user.email, "role": user.role})
    return AuthResponse(access_token=token, user=user)


@router.post("/forgot")
async def forgot(body: ForgotRequest) -> dict[str, str]:
    # Always report success to avoid account enumeration.
    return {"message": "If an account exists, a reset link has been sent."}


@router.get("/me", response_model=User)
async def me(user: User = Depends(get_current_user)) -> User:
    return user
