"""
Pydantic models for API request/response validation.
Hardened with field constraints for security.
"""

from pydantic import BaseModel, field_validator, Field
from typing import Optional


class StudentBase(BaseModel):
    student_id: str = Field(..., max_length=20)
    name: str = Field(..., max_length=200)
    department: Optional[str] = Field(default=None, max_length=100)
    year: Optional[str] = Field(default=None, max_length=20)
    first_semester_credits_approved: float = Field(..., ge=0, le=50)
    tuition_payment_status: str = Field(..., max_length=20)
    first_assignment_delay_hours: float = Field(..., ge=0)
    forum_messages_posted: int = Field(..., ge=0)
    attendance_pct: float = Field(..., ge=0, le=100)
    lms_logins_per_week: float = Field(..., ge=0)
    library_logins_per_week: float = Field(..., ge=0)
    avg_grade: float = Field(..., ge=0, le=100)
    counselor_visits: int = Field(..., ge=0)
    late_submissions: int = Field(..., ge=0)

    @field_validator("tuition_payment_status")
    @classmethod
    def validate_tuition(cls, v: str) -> str:
        allowed = {"Paid", "Delayed", "Unpaid"}
        if v not in allowed:
            raise ValueError(f"Must be one of: {allowed}")
        return v


class StudentScored(StudentBase):
    risk_score: float = Field(..., ge=0, le=100)
    risk_tier: str
    top_factors: Optional[list] = None
    intervention: Optional[dict] = None

    @field_validator("risk_tier")
    @classmethod
    def validate_tier(cls, v: str) -> str:
        allowed = {"Critical", "At-Risk", "Stable"}
        if v not in allowed:
            raise ValueError(f"Must be one of: {allowed}")
        return v


class DashboardSummary(BaseModel):
    report_id: str
    institution: str
    total_students: int = Field(..., ge=0)
    critical_count: int = Field(..., ge=0)
    at_risk_count: int = Field(..., ge=0)
    stable_count: int = Field(..., ge=0)
    avg_risk_score: float = Field(..., ge=0, le=100)
    students: list[StudentScored]


class CounselorNoteRequest(BaseModel):
    student_name: str = Field(..., max_length=200)
    risk_score: float = Field(..., ge=0, le=100)
    risk_tier: str
    top_factors: list
    intervention_type: str = Field(..., max_length=50)
    department: Optional[str] = Field(default=None, max_length=100)
    year: Optional[str] = Field(default=None, max_length=20)


class CounselorNoteResponse(BaseModel):
    note: str
    priority: str
    intervention_type: str
    generated_by: str = "Gemini Pro"


class UploadResponse(BaseModel):
    report_id: str
    message: str
    total_students: int = Field(..., ge=0)
    critical_count: int = Field(..., ge=0)
    at_risk_count: int = Field(..., ge=0)
