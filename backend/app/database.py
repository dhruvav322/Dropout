"""
In-memory database store for demo purposes.
Stores processed reports and scored student data.
"""

import uuid
from typing import Optional

# In-memory store (dict of report_id -> data)
_reports: dict = {}


def store_report(institution: str, students: list) -> str:
    """Store a processed report and return its ID."""
    report_id = str(uuid.uuid4())[:8]
    _reports[report_id] = {
        "institution": institution,
        "students": students,
    }
    return report_id


def get_report(report_id: str) -> Optional[dict]:
    """Retrieve a report by ID."""
    return _reports.get(report_id)


def get_student_from_report(report_id: str, student_id: str) -> Optional[dict]:
    """Retrieve a specific student from a report."""
    report = _reports.get(report_id)
    if not report:
        return None
    for student in report["students"]:
        if student.get("student_id") == student_id:
            return student
    return None


def list_reports() -> list:
    """List all report IDs with metadata."""
    return [
        {
            "report_id": rid,
            "institution": data["institution"],
            "total_students": len(data["students"]),
        }
        for rid, data in _reports.items()
    ]


def get_default_report_id() -> Optional[str]:
    """Get the most recent report ID (for pre-loaded demo)."""
    if _reports:
        return list(_reports.keys())[-1]
    return None
