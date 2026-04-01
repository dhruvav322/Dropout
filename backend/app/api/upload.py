"""
Upload endpoint — accepts CSV, runs ML inference, stores results.
Hardened with file size limits, input sanitization, and audit logging.
"""

import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
import pandas as pd
import numpy as np

from ..ml.model import load_model, predict_risk
from ..ml.shap_explainer import DropoutExplainer
from ..database import store_report
from ..schemas import UploadResponse
from ..security import sanitize_string, sanitize_numeric, MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB
from ..audit import log_event, AuditAction
from ..logger import log

router = APIRouter()
_explainer = None

MAX_ROWS = 5000


def get_explainer():
    global _explainer
    if _explainer is None:
        _explainer = DropoutExplainer()
    return _explainer


@router.post("/upload", response_model=UploadResponse)
async def upload_csv(
    request: Request,
    file: UploadFile = File(...),
    institution: str = Form(default="My Institution"),
):
    """Upload a CSV file, run dropout prediction, return report."""
    client_ip = request.client.host if request.client else "unknown"

    # --- Validation Layer ---

    # File type check
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    # File size check
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE_BYTES:
        log.warning(f"Upload rejected: file too large ({len(contents)} bytes) from {client_ip}")
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB."
        )

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Parse CSV
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        log.error(f"CSV parse failure from {client_ip}: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Row count limit
    if len(df) > MAX_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Dataset too large. Maximum {MAX_ROWS} rows allowed (got {len(df)})."
        )

    if len(df) == 0:
        raise HTTPException(status_code=400, detail="CSV file contains no data rows")

    # Required columns check
    required = [
        "first_semester_credits_approved", "tuition_payment_status",
        "first_assignment_delay_hours", "forum_messages_posted",
        "attendance_pct", "lms_logins_per_week", "library_logins_per_week",
        "avg_grade", "counselor_visits", "late_submissions",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing)}"
        )

    # --- Sanitization Layer ---

    # Sanitize string fields
    institution = sanitize_string(institution)
    if "name" in df.columns:
        df["name"] = df["name"].apply(lambda x: sanitize_string(str(x)) if pd.notna(x) else "Unknown")

    # Handle NaN/inf in numeric columns
    numeric_cols = [
        "first_semester_credits_approved", "first_assignment_delay_hours",
        "forum_messages_posted", "attendance_pct", "lms_logins_per_week",
        "library_logins_per_week", "avg_grade", "counselor_visits", "late_submissions",
    ]
    for col in numeric_cols:
        if col in df.columns:
            col_mean = df[col].replace([np.inf, -np.inf], np.nan).mean()
            df[col] = df[col].replace([np.inf, -np.inf], np.nan).fillna(col_mean if pd.notna(col_mean) else 0)

    # Generate IDs and names if not present
    if "student_id" not in df.columns:
        df["student_id"] = [f"STU{i:04d}" for i in range(1, len(df) + 1)]
    if "name" not in df.columns:
        df["name"] = [f"Student {i}" for i in range(1, len(df) + 1)]

    # --- ML Inference ---
    log.info(f"Processing upload: {len(df)} students from '{institution}' [{client_ip}]")

    model = load_model()
    scored_df = predict_risk(model, df)

    # Get SHAP explanations
    explainer = get_explainer()
    shap_results = explainer.explain_batch(scored_df)

    # Build student records
    students = []
    for idx, row in scored_df.iterrows():
        student = row.to_dict()
        student["risk_tier"] = str(student["risk_tier"])
        student["top_factors"] = shap_results[idx]["top_factors"]
        student["intervention"] = shap_results[idx]["intervention"]
        students.append(student)

    # Sort by risk score descending
    students.sort(key=lambda s: s["risk_score"], reverse=True)

    # Store report
    report_id = store_report(institution, students)

    # Count tiers
    critical = sum(1 for s in students if s["risk_tier"] == "Critical")
    at_risk = sum(1 for s in students if s["risk_tier"] == "At-Risk")

    # Audit
    log_event(
        AuditAction.UPLOAD_CSV,
        f"Uploaded {len(students)} students for '{institution}' → report {report_id} "
        f"({critical} critical, {at_risk} at-risk)",
        actor="user",
        ip_address=client_ip,
        request_id=getattr(request.state, 'request_id', ''),
        metadata={"report_id": report_id, "rows": len(students)},
    )

    return UploadResponse(
        report_id=report_id,
        message="Analysis complete",
        total_students=len(students),
        critical_count=critical,
        at_risk_count=at_risk,
    )
