"""
Dashboard endpoint — returns scored students with risk tiers and summary stats.
"""

from fastapi import APIRouter, HTTPException, Request
from ..database import get_report, get_default_report_id, list_reports
from ..security import validate_report_id
from ..audit import log_event, AuditAction

router = APIRouter()


@router.get("/dashboard/{report_id}")
async def get_dashboard(report_id: str, request: Request):
    """Get full dashboard data for a report."""
    if not validate_report_id(report_id):
        raise HTTPException(status_code=400, detail="Invalid report ID format")
    report = get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    students = report["students"]

    critical = [s for s in students if s["risk_tier"] == "Critical"]
    at_risk = [s for s in students if s["risk_tier"] == "At-Risk"]
    stable = [s for s in students if s["risk_tier"] == "Stable"]

    avg_risk = sum(s["risk_score"] for s in students) / len(students) if students else 0

    # Audit
    client_ip = request.client.host if request.client else "127.0.0.1"
    log_event(
        AuditAction.VIEW_DASHBOARD,
        f"Viewed dashboard for report {report_id} ({report['institution']})",
        actor="user",
        ip_address=client_ip,
        request_id=getattr(request.state, 'request_id', ''),
    )

    return {
        "report_id": report_id,
        "institution": report["institution"],
        "total_students": len(students),
        "critical_count": len(critical),
        "at_risk_count": len(at_risk),
        "stable_count": len(stable),
        "avg_risk_score": round(avg_risk, 1),
        "students": students,
    }


@router.get("/dashboard")
async def get_default_dashboard(request: Request):
    """Get the default (pre-loaded) dashboard."""
    report_id = get_default_report_id()
    if not report_id:
        raise HTTPException(status_code=404, detail="No reports available. Upload a CSV first.")
    return await get_dashboard(report_id, request)


@router.get("/reports")
async def get_reports():
    """List all available reports."""
    return list_reports()
