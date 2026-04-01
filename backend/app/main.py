"""
DropoutRadar — FastAPI Backend
Main application entry point with security middleware, CORS, and startup lifecycle.
"""

from dotenv import load_dotenv
load_dotenv()  # Load .env before anything reads env vars

import os
import pandas as pd
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .api import upload, dashboard, student, gemini
from .api import admin as admin_api
from .ml.model import load_model, predict_risk
from .ml.shap_explainer import DropoutExplainer
from .database import store_report
from .security import (
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
    RequestLoggingMiddleware,
)
from .audit import log_event, AuditAction
from .logger import log


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-load the demo dataset on startup."""
    log.info("🎓 DropoutRadar Backend Starting...")
    log_event(AuditAction.SYSTEM_BOOT, "Server starting up")

    # Generate data if not exists
    data_path = os.path.join(os.path.dirname(__file__), "data", "sample_students.csv")
    if not os.path.exists(data_path):
        log.info("📊 Generating sample dataset...")
        from .data.generate_data import generate_dataset
        generate_dataset()

    # Train model if not exists
    model_path = os.path.join(os.path.dirname(__file__), "ml", "trained_model.pkl")
    if not os.path.exists(model_path):
        log.info("🤖 Training LightGBM model...")
        from .ml.model import train_model
        train_model()

    # Pre-load demo report
    demo_institution = os.getenv("DEMO_INSTITUTION", "DropoutRadar Demo")
    log.info(f"📋 Pre-loading {demo_institution} demo data...")
    model = load_model()
    df = pd.read_csv(data_path)
    scored_df = predict_risk(model, df)

    explainer = DropoutExplainer()
    shap_results = explainer.explain_batch(scored_df)

    students = []
    for idx, row in scored_df.iterrows():
        student_data = row.to_dict()
        student_data["risk_tier"] = str(student_data["risk_tier"])
        student_data["top_factors"] = shap_results[idx]["top_factors"]
        student_data["intervention"] = shap_results[idx]["intervention"]
        students.append(student_data)

    students.sort(key=lambda s: s["risk_score"], reverse=True)
    report_id = store_report(demo_institution, students)

    critical = sum(1 for s in students if s["risk_tier"] == "Critical")
    at_risk = sum(1 for s in students if s["risk_tier"] == "At-Risk")
    log.info(
        f"✅ Demo loaded: {len(students)} students | {critical} Critical | "
        f"{at_risk} At-Risk | Report: {report_id}"
    )
    log_event(
        AuditAction.SYSTEM_BOOT,
        f"Demo loaded: {len(students)} students, report {report_id}",
        metadata={"report_id": report_id, "students": len(students)},
    )

    # Check Gemini API
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        log.info("🧠 Gemini API key detected — live AI notes enabled")
    else:
        log.warning("⚠️  No GEMINI_API_KEY — using cached note templates")

    yield
    log.info("👋 DropoutRadar Backend Shutting Down...")


app = FastAPI(
    title="DropoutRadar API",
    description="Enterprise early warning system for student dropout prediction",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---- Middleware Stack (order matters: last added = first executed) ----

# CORS — reads from env for deployment, falls back to localhost for dev
_default_origins = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
_allowed_origins = os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"],
)

# Trusted hosts — allow all in production (Render generates random hostnames)
_trusted_hosts = os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1,0.0.0.0,*.localhost")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[h.strip() for h in _trusted_hosts.split(",")],
)

# Security headers (X-Frame-Options, X-Request-ID, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting
app.add_middleware(RateLimitMiddleware)

# Request logging
app.add_middleware(RequestLoggingMiddleware)


# ---- Routers ----

app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(dashboard.router, prefix="/api", tags=["Dashboard"])
app.include_router(student.router, prefix="/api", tags=["Students"])
app.include_router(gemini.router, prefix="/api", tags=["AI"])
app.include_router(admin_api.router, prefix="/api", tags=["Admin"])


@app.get("/")
async def root():
    return {
        "service": "DropoutRadar API",
        "version": "2.0.0",
        "docs": "/docs",
        "status": "operational",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
