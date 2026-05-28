import base64
import hashlib
import hmac
import os
import secrets
from typing import Optional

from fastapi import Request
from sqlalchemy.orm import Session

from .models import User


SECRET_KEY = os.environ.get("CHAMADOS_SECRET_KEY", "dev-secret-change-me")
SESSION_COOKIE = "chamados_session"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"pbkdf2_sha256${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, salt_b64, digest_b64 = stored_hash.split("$", 2)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
        return hmac.compare_digest(actual, expected)
    except ValueError:
        return False


def sign_session(user_id: int) -> str:
    payload = str(user_id)
    signature = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def read_session_user_id(cookie_value: str | None) -> Optional[int]:
    if not cookie_value or "." not in cookie_value:
        return None
    payload, signature = cookie_value.rsplit(".", 1)
    expected = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        return int(payload)
    except ValueError:
        return None


def current_user(request: Request, db: Session) -> User | None:
    user_id = read_session_user_id(request.cookies.get(SESSION_COOKIE))
    if user_id is None:
        return None
    return db.get(User, user_id)
