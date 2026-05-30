import base64
import hashlib
import hmac
import time
from dataclasses import dataclass

from app.core.config import get_settings


@dataclass(frozen=True)
class Actor:
    id: int
    username: str
    name: str
    roles: tuple[str, ...] = ()
    permission_scopes: dict[str, tuple[str, ...]] | None = None


@dataclass(frozen=True)
class TokenPayload:
    user_id: int
    username: str


def _sign(payload: str) -> str:
    settings = get_settings()
    return hmac.new(
        settings.auth_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_access_token(user_id: int, username: str) -> str:
    settings = get_settings()
    expires_at = int(time.time()) + settings.token_expire_minutes * 60
    payload = f"{user_id}:{username}:{expires_at}"
    token = f"{payload}:{_sign(payload)}"
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("utf-8")


def verify_access_token(token: str) -> TokenPayload | None:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        user_id_text, username, expires_at_text, signature = decoded.rsplit(":", 3)
        payload = f"{user_id_text}:{username}:{expires_at_text}"
        user_id = int(user_id_text)
        expires_at = int(expires_at_text)
    except (ValueError, UnicodeDecodeError):
        return None

    if expires_at < int(time.time()):
        return None
    if not hmac.compare_digest(signature, _sign(payload)):
        return None
    return TokenPayload(user_id=user_id, username=username)
