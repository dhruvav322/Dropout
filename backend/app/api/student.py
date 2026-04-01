"""
Student detail endpoint — full profile with SHAP factors.
"""

from fastapi import APIRouter, HTTPException, Query, Request
from ..database import get_report, get_default_report_id
from ..audit import log_event, AuditAction

router = APIRouter()


@router.get("/student/{student_id}")
async def get_student(student_id: str, request: Request, report_id: str = Query(default=None)):
    """Get full student profile with SHAP explanation."""
    if not report_id:
        report_id = get_default_report_id()
    if not report_id:
        raise HTTPException(status_code=404, detail="No reports available")

    report = get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for student in report["students"]:
        if student.get("student_id") == student_id:
            # Audit
            client_ip = request.client.host if request.client else "127.0.0.1"
            log_event(
                AuditAction.VIEW_STUDENT,
                f"Viewed student {student_id} ({student.get('name', '?')}) "
                f"- risk: {student.get('risk_score', '?')}",
                actor="user",
                ip_address=client_ip,
                request_id=getattr(request.state, 'request_id', ''),
            )

            return {
                "student": student,
                "institution": report["institution"],
                "report_id": report_id,
            }

    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")
