"""
Audit trail system for DropoutRadar.
Logs every significant user action with metadata for compliance and diagnostics.
"""

from datetime import datetime, timezone
from typing import Optional
from collections import deque
from .logger import log

# Fixed-size audit buffer (last 500 events)
_audit_log: deque = deque(maxlen=500)

# Counter for total events since boot
_total_events: int = 0


class AuditAction:
    """Constants for audit event types."""
    SYSTEM_BOOT = "SYSTEM_BOOT"
    UPLOAD_CSV = "UPLOAD_CSV"
    VIEW_DASHBOARD = "VIEW_DASHBOARD"
    VIEW_STUDENT = "VIEW_STUDENT"
    GENERATE_NOTE = "GENERATE_NOTE"
    ADMIN_LOGIN = "ADMIN_LOGIN"
    ADMIN_HEALTH_CHECK = "ADMIN_HEALTH_CHECK"
    ADMIN_RETRAIN = "ADMIN_RETRAIN"
    ADMIN_DELETE_REPORT = "ADMIN_DELETE_REPORT"
    RATE_LIMIT_HIT = "RATE_LIMIT_HIT"
    AUTH_FAILURE = "AUTH_FAILURE"
    DATA_EXPORT = "DATA_EXPORT"


# Severity mapping
_SEVERITY = {
    AuditAction.SYSTEM_BOOT: "info",
    AuditAction.UPLOAD_CSV: "info",
    AuditAction.VIEW_DASHBOARD: "low",
    AuditAction.VIEW_STUDENT: "low",
    AuditAction.GENERATE_NOTE: "info",
    AuditAction.ADMIN_LOGIN: "warning",
    AuditAction.ADMIN_HEALTH_CHECK: "low",
    AuditAction.ADMIN_RETRAIN: "critical",
    AuditAction.ADMIN_DELETE_REPORT: "critical",
    AuditAction.RATE_LIMIT_HIT: "warning",
    AuditAction.AUTH_FAILURE: "critical",
    AuditAction.DATA_EXPORT: "info",
}


def log_event(
    action: str,
    details: str = "",
    actor: str = "system",
    ip_address: str = "127.0.0.1",
    request_id: str = "",
    metadata: Optional[dict] = None,
):
    """Record an audit event."""
    global _total_events
    _total_events += 1

    event = {
        "id": _total_events,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "actor": actor,
        "details": details,
        "ip_address": ip_address,
        "request_id": request_id,
        "severity": _SEVERITY.get(action, "info"),
    }
    if metadata:
        event["metadata"] = metadata

    _audit_log.append(event)

    # Also write to structured logger
    log.info(f"AUDIT | {action} | {actor} | {details} | {ip_address}")


def get_audit_log(
    limit: int = 50,
    offset: int = 0,
    action_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
) -> dict:
    """Retrieve paginated, optionally filtered audit log."""
    events = list(_audit_log)

    # Apply filters
    if action_filter:
        events = [e for e in events if e["action"] == action_filter]
    if severity_filter:
        events = [e for e in events if e["severity"] == severity_filter]

    # Reverse (newest first) and paginate
    events = events[::-1]
    total = len(events)
    page = events[offset:offset + limit]

    return {
        "events": page,
        "total": total,
        "total_since_boot": _total_events,
        "limit": limit,
        "offset": offset,
    }


def get_audit_summary() -> dict:
    """Return event counts by action type for the admin dashboard."""
    events = list(_audit_log)
    counts: dict[str, int] = {}
    severity_counts: dict[str, int] = {"critical": 0, "warning": 0, "info": 0, "low": 0}

    for e in events:
        action = e["action"]
        counts[action] = counts.get(action, 0) + 1
        sev = e.get("severity", "info")
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    return {
        "total_events": _total_events,
        "by_action": counts,
        "by_severity": severity_counts,
    }
