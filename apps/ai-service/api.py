"""Atlas AI Service — FastAPI application entry point.

Two classes of endpoints:
  /health   — public, no auth required (for Railway health checks and load balancers)
  everything else — requires a valid X-Atlas-Signature HMAC header signed by the
                    Next.js app with AI_SERVICE_SHARED_SECRET.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import Depends, FastAPI, HTTPException, Request

from agents.stub import compiled_stub  # noqa: F401 — validates LangGraph compiles
from config import settings
from rules.engine import engine  # noqa: F401 — validates engine instantiates

structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)

logger = structlog.get_logger(__name__)

SERVICE_VERSION = "0.1.0"
SERVICE_NAME = "atlas-ai"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("startup", service=SERVICE_NAME, version=SERVICE_VERSION)
    yield
    logger.info("shutdown", service=SERVICE_NAME)


app = FastAPI(
    title="Atlas AI Service",
    version=SERVICE_VERSION,
    lifespan=lifespan,
    docs_url=None,   # disable Swagger UI in production
    redoc_url=None,
)


# ── HMAC verification ─────────────────────────────────────────────────────────

async def require_valid_signature(request: Request) -> None:
    """FastAPI dependency that enforces HMAC-SHA256 request signing.

    Expected header:  X-Atlas-Signature: sha256=<hex_digest>
    Signed payload:   raw request body bytes
    Secret:           AI_SERVICE_SHARED_SECRET env var (shared with Next.js)

    Returns 401 for missing or invalid signatures.
    """
    signature = request.headers.get("X-Atlas-Signature", "")
    if not signature:
        raise HTTPException(status_code=401, detail="Missing X-Atlas-Signature header")

    body = await request.body()
    secret = settings.ai_service_shared_secret
    expected = "sha256=" + hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("hmac_verification_failed", path=str(request.url.path))
        raise HTTPException(status_code=401, detail="Invalid signature")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health() -> dict[str, str]:
    """Public health check endpoint — no HMAC required."""
    return {"status": "ok", "version": SERVICE_VERSION, "service": SERVICE_NAME}


@app.get("/")
async def root() -> dict[str, str]:
    """Root route — redirects probes to health check info."""
    return {"status": "ok", "service": SERVICE_NAME, "version": SERVICE_VERSION}


@app.post(
    "/ping",
    dependencies=[Depends(require_valid_signature)],
)
async def ping(request: Request) -> dict[str, object]:
    """Signed echo endpoint for integration testing the HMAC handshake."""
    start = time.monotonic()
    body = await request.body()
    duration_ms = round((time.monotonic() - start) * 1000, 2)

    logger.info(
        "ping",
        body_bytes=len(body),
        duration_ms=duration_ms,
    )
    return {"pong": True, "body_bytes": len(body), "duration_ms": duration_ms}
