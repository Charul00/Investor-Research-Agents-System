from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def cache_is_configured() -> bool:
    return bool(
        settings.cache_enabled
        and settings.upstash_redis_rest_url
        and settings.upstash_redis_rest_token
    )


async def upstash_command(command: list[Any]) -> Any | None:
    if not cache_is_configured():
        return None

    headers = {
        "Authorization": f"Bearer {settings.upstash_redis_rest_token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(1.4, connect=0.8)) as client:
            response = await client.post(
                str(settings.upstash_redis_rest_url),
                headers=headers,
                json=command,
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        logger.info("Upstash cache command skipped: %s", exc)
        return None

    if isinstance(payload, dict) and payload.get("error"):
        logger.info("Upstash cache returned an error: %s", payload["error"])
        return None

    return payload.get("result") if isinstance(payload, dict) else None


async def get_json(key: str) -> Any | None:
    raw_value = await upstash_command(["GET", key])
    if not isinstance(raw_value, str):
        return None

    try:
        return json.loads(raw_value)
    except json.JSONDecodeError:
        return None


async def set_json(key: str, value: Any, ttl_seconds: int) -> None:
    if ttl_seconds <= 0:
        return
    serialized = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    await upstash_command(["SET", key, serialized, "EX", ttl_seconds])
