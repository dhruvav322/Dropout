"""
Security layer for DropoutRadar.
API key authentication, rate limiting, request tracing, and security headers.
"""

import os
import time
import uuid
import re
import math
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import Request, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse

from .logger import log

# ---- Configuration ----

ADMIN_API_KEY = os.getenv("DROPOUT_ADMIN_KEY", "dr-admin-2026-sovereign")
RATE_LIMIT_DEFAULT = int(os.getenv("RATE_LIMIT_PER_SECOND", "20"))
RATE_LIMIT_UPLOAD = int(os.getenv("RATE_LIMIT_UPLOAD_PER_SECOND", "3"))
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

# Tracks server boot time
SERVER_START_TIME = datetime.now(timezone.utc)


# ---- API Key Authentication ----

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_admin(api_key: Optional[str] = Security(api_key_header)):
    """Dependency that protects admin endpoints with API key validation."""
    if not api_key or api_key != ADMIN_API_KEY:
        log.warning(f"Unauthorized admin access attempt (key={'[REDACTED]' if api_key else '[MISSING]'})")
        raise HTTPException(
            status_code=403,
            detail="Invalid or missing API key. Admin access denied.",
        )
    return api_key


# ---- Rate Limiter (Token Bucket) ----

class TokenBucket:
    """Per-IP token bucket rate limiter."""

    def __init__(self):
        self._buckets: dict[str, dict] = defaultdict(
            lambda: {"tokens": RATE_LIMIT_DEFAULT, "last_refill": time.monotonic()}
        )

    def consume(self, ip: str, cost: int = 1, limit: int = RATE_LIMIT_DEFAULT) -> bool:
        """Try to consume tokens. Returns True if allowed."""
        now = time.monotonic()
        bucket = self._buckets[ip]

        # Refill tokens based on elapsed time
        elapsed = now - bucket["last_refill"]
        bucket["tokens"] = min(limit, bucket["tokens"] + elapsed * limit)
        bucket["last_refill"] = now

        if bucket["tokens"] >= cost:
            bucket["tokens"] -= cost
            return True
        return False


_rate_limiter = TokenBucket()


# ---- Middleware: Security Headers ----

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Injects production-grade security headers into every response."""

    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())[:12]
        request.state.request_id = request_id
        request.state.start_time = time.monotonic()

        response = await call_next(request)

        # Security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["X-Powered-By"] = "DropoutRadar/1.0"

        # Response time tracking
        elapsed_ms = (time.monotonic() - request.state.start_time) * 1000
        response.headers["X-Response-Time"] = f"{elapsed_ms:.0f}ms"

        return response


# ---- Middleware: Rate Limiting ----

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limits requests by client IP."""

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        # Higher cost for upload endpoints
        is_upload = request.url.path.endswith("/upload")
        limit = RATE_LIMIT_UPLOAD if is_upload else RATE_LIMIT_DEFAULT
        cost = 5 if is_upload else 1

        if not _rate_limiter.consume(client_ip, cost=cost, limit=limit):
            log.warning(f"Rate limit exceeded for {client_ip} on {request.url.path}")
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please retry in a moment."},
                headers={"Retry-After": "2"},
            )

        return await call_next(request)


# ---- Middleware: Request Logging ----

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with method, path, status, and timing."""

    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        elapsed = (time.monotonic() - start) * 1000

        # Don't log static/health checks to reduce noise
        path = request.url.path
        if path in ("/", "/favicon.ico", "/docs", "/openapi.json"):
            return response

        client_ip = request.client.host if request.client else "?"
        log.info(
            f"{request.method} {path} → {response.status_code} ({elapsed:.0f}ms) [{client_ip}]"
        )

        return response


# ---- Input Sanitization ----

_SCRIPT_PATTERN = re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)
_TAG_PATTERN = re.compile(r"<[^>]+>")


def sanitize_string(value: str) -> str:
    """Strip HTML/script tags and normalize whitespace."""
    if not isinstance(value, str):
        return str(value)
    cleaned = _SCRIPT_PATTERN.sub("", value)
    cleaned = _TAG_PATTERN.sub("", cleaned)
    cleaned = cleaned.strip()
    return cleaned[:500]  # Hard cap at 500 chars


def sanitize_numeric(value, default: float = 0.0) -> float:
    """Replace NaN/inf with a safe default."""
    try:
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return default
        return v
    except (TypeError, ValueError):
        return default


# ---- Utility ----

def get_uptime() -> str:
    """Get server uptime as a human-readable string."""
    delta = datetime.now(timezone.utc) - SERVER_START_TIME
    hours, remainder = divmod(int(delta.total_seconds()), 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes}m {seconds}s"
    return f"{minutes}m {seconds}s"
