"""生成和校验轻量 Bearer token，并描述当前操作者上下文。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

import base64
import hashlib
import hmac
import time
from dataclasses import dataclass

from app.core.config import get_settings


@dataclass(frozen=True)
class Actor:
    """当前请求操作者上下文，包含用户、角色和权限 scope。

    业务意义：承载 `Actor` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    username: str
    name: str
    roles: tuple[str, ...] = ()
    permission_scopes: dict[str, tuple[str, ...]] | None = None


@dataclass(frozen=True)
class TokenPayload:
    """访问令牌解析结果，记录 token 内的用户身份。

    业务意义：承载 `TokenPayload` 相关的数据边界或能力，供系统其他模块复用。
    """
    user_id: int
    username: str


def _sign(payload: str) -> str:
    """使用服务端密钥为 token payload 生成 HMAC 签名。

    参数：`payload` 表示接口请求体或业务输入数据。
    返回：十六进制签名字符串。
    """
    settings = get_settings()
    return hmac.new(
        settings.auth_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_access_token(user_id: int, username: str) -> str:
    """创建轻量访问 token。

    参数：`user_id` 表示调用方传入的业务参数；`username` 表示调用方传入的业务参数。
    返回：包含用户 id、用户名、过期时间和签名的 base64 token。
    """
    settings = get_settings()
    expires_at = int(time.time()) + settings.token_expire_minutes * 60
    payload = f"{user_id}:{username}:{expires_at}"
    token = f"{payload}:{_sign(payload)}"
    return base64.urlsafe_b64encode(token.encode("utf-8")).decode("utf-8")


def verify_access_token(token: str) -> TokenPayload | None:
    """解析并校验访问 token。

    参数：`token` 表示客户端提交的访问令牌。
    返回：校验通过时返回 token 内的用户身份；格式错误、过期或签名不匹配时返回 None。
    """
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
    # 使用常量时间比较签名，避免普通字符串比较带来的侧信道风险。
    if not hmac.compare_digest(signature, _sign(payload)):
        return None
    return TokenPayload(user_id=user_id, username=username)
