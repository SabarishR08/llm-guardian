"""Authentication schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    id: str
    name: str
    email: str
    role: Literal["admin", "analyst", "viewer"] = "admin"
    org: str = "Acme Security"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr
    password: str = Field(min_length=6)


class ForgotRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
