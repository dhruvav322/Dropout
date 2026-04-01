"""
Admin API — Protected system diagnostics, audit logs, and model management.
All endpoints require X-API-Key header authentication.
"""

import os
import sys
import psutil
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query

from ..security import require_admin, get_uptime, SERVER_START_TIME
from ..audit import get_audit_log, get_audit_summary, log_event, AuditAction
from ..database import list_reports, get_report, _reports
from ..ml.model import load_model, train_model, MODEL_PATH, FEATURE_COLUMNS
from ..logger import log

router = APIRouter()


@router.get("/admin/health")
async def system_health(api_key: str = Depends(require_admin)):
    """Full system health check — model status, memory, uptime."""
    log_event(AuditAction.ADMIN_HEALTH_CHECK, "System health check requested", actor="admin")

    # Memory usage
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    mem_mb = mem_info.rss / (1024 * 1024)

    # Model status
    model_exists = os.path.exists(MODEL_PATH)
    model_size_kb = os.path.getsize(MODEL_PATH) / 1024 if model_exists else 0

    # Dataset status
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "data", "sample_students.csv")
    # Adjust path for actual location
    data_path = os.path.join(os.path.dirname(__file__), "..", "data", "sample_students.csv")
    data_exists = os.path.exists(data_path)

    # Reports in memory
    total_reports = len(_reports)
    total_students_in_memory = sum(len(r["students"]) for r in _reports.values())

    return {
        "status": "operational",
        "version": "1.0.0",
        "environment": os.getenv("ENV", "development"),
        "uptime": get_uptime(),
        "boot_time": SERVER_START_TIME.isoformat(),
        "system": {
            "python_version": sys.version.split()[0],
            "memory_usage_mb": round(mem_mb, 1),
            "cpu_percent": process.cpu_percent(interval=0.1),
            "pid": os.getpid(),
        },
        "model": {
            "loaded": model_exists,
            "file_size_kb": round(model_size_kb, 1),
            "features": FEATURE_COLUMNS,
            "algorithm": "LightGBM (Gradient Boosted Trees)",
        },
        "data": {
            "training_dataset_exists": data_exists,
            "reports_in_memory": total_reports,
            "total_students_loaded": total_students_in_memory,
        },
        "security": {
            "rate_limiting": True,
            "api_key_auth": True,
            "security_headers": True,
            "request_logging": True,
            "input_sanitization": True,
        },
    }


@router.get("/admin/audit-log")
async def get_audit_events(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    action: str = Query(default=None),
    severity: str = Query(default=None),
    api_key: str = Depends(require_admin),
):
    """Retrieve paginated audit trail with optional filtering."""
    return get_audit_log(
        limit=limit,
        offset=offset,
        action_filter=action,
        severity_filter=severity,
    )


@router.get("/admin/audit-summary")
async def audit_summary(api_key: str = Depends(require_admin)):
    """Get audit event counts by action type and severity."""
    return get_audit_summary()


@router.get("/admin/model-stats")
async def model_statistics(api_key: str = Depends(require_admin)):
    """Detailed model performance metrics and feature importances."""
    model = load_model()

    # Feature importances from LightGBM
    importances = model.feature_importances_.tolist()
    feature_importance = [
        {"feature": name, "importance": imp}
        for name, imp in sorted(
            zip(FEATURE_COLUMNS, importances),
            key=lambda x: x[1],
            reverse=True,
        )
    ]

    # Model parameters
    params = model.get_params()

    return {
        "algorithm": "LightGBM Classifier",
        "n_estimators": params.get("n_estimators"),
        "max_depth": params.get("max_depth"),
        "learning_rate": params.get("learning_rate"),
        "num_leaves": params.get("num_leaves"),
        "class_weight": str(params.get("class_weight")),
        "feature_importance": feature_importance,
        "model_file": MODEL_PATH,
        "training_note": "Trained on synthetic Faker-generated data (200 students, 10 features)",
    }


@router.post("/admin/retrain")
async def retrain_model(api_key: str = Depends(require_admin)):
    """Retrain the LightGBM model on current training data."""
    log_event(AuditAction.ADMIN_RETRAIN, "Model retrain triggered by admin", actor="admin")
    log.warning("Model retrain triggered by admin")

    try:
        model = train_model()
        return {
            "status": "success",
            "message": "Model retrained successfully",
            "model_path": MODEL_PATH,
        }
    except Exception as e:
        log.error(f"Model retrain failed: {e}")
        raise HTTPException(status_code=500, detail=f"Retrain failed: {str(e)}")


@router.delete("/admin/reports/{report_id}")
async def delete_report(report_id: str, api_key: str = Depends(require_admin)):
    """Delete a specific report from memory."""
    if report_id not in _reports:
        raise HTTPException(status_code=404, detail="Report not found")

    institution = _reports[report_id]["institution"]
    student_count = len(_reports[report_id]["students"])
    del _reports[report_id]

    log_event(
        AuditAction.ADMIN_DELETE_REPORT,
        f"Deleted report {report_id} ({institution}, {student_count} students)",
        actor="admin",
    )

    return {
        "status": "deleted",
        "report_id": report_id,
        "institution": institution,
        "students_removed": student_count,
    }


@router.get("/admin/reports")
async def list_all_reports(api_key: str = Depends(require_admin)):
    """List all reports with detailed metadata."""
    reports = []
    for rid, data in _reports.items():
        students = data["students"]
        critical = sum(1 for s in students if s.get("risk_tier") == "Critical")
        at_risk = sum(1 for s in students if s.get("risk_tier") == "At-Risk")
        stable = sum(1 for s in students if s.get("risk_tier") == "Stable")
        avg_risk = sum(s.get("risk_score", 0) for s in students) / len(students) if students else 0

        reports.append({
            "report_id": rid,
            "institution": data["institution"],
            "total_students": len(students),
            "critical": critical,
            "at_risk": at_risk,
            "stable": stable,
            "avg_risk_score": round(avg_risk, 1),
        })

    return {"reports": reports, "total": len(reports)}
