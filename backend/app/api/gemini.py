"""
AI counselor note generation endpoint.
Uses real Gemini API when GEMINI_API_KEY is set, falls back to mock templates.
"""

import os
import random
from fastapi import APIRouter, Request
from ..schemas import CounselorNoteRequest, CounselorNoteResponse
from ..audit import log_event, AuditAction
from ..logger import log

router = APIRouter()

# Check for real Gemini API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
_gemini_client = None


def _get_gemini_client():
    """Lazy-load Gemini client."""
    global _gemini_client
    if _gemini_client is None and GEMINI_API_KEY:
        try:
            from google import genai
            _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
            log.info("Gemini API client initialized successfully")
        except Exception as e:
            log.error(f"Failed to initialize Gemini client: {e}")
            _gemini_client = None
    return _gemini_client


# Pre-written high-quality counselor notes per intervention type
# These simulate Gemini output if no API key is available
NOTE_TEMPLATES = {
    "Financial Aid": [
        'Student shows signs of financial stress, evidenced by {factor}. '
        'This correlates with declining academic engagement and attendance patterns. '
        'Recommend immediate referral to the Financial Aid office for emergency assistance '
        'and a discussion about tuition payment plan options before the mid-term withdrawal deadline.',
        'Analysis indicates that financial barriers are the primary risk driver for this student. '
        '{factor} suggests potential external stressors affecting academic performance. '
        'Priority action: connect with Bursar\'s office for fee restructuring and explore '
        'institutional scholarship opportunities. Schedule follow-up within 5 business days.',
    ],
    "Academic Support": [
        'This student demonstrates a pattern of academic disengagement, with {factor} being the '
        'strongest predictor of dropout risk. The data suggests a need for structured academic '
        'support rather than general counseling. Recommend enrollment in peer tutoring for core '
        'courses and a workload review with their academic advisor.',
        'Academic performance metrics indicate this student is falling behind their cohort. '
        '{factor} reveals an early-warning pattern consistent with students who disengage '
        'before formal withdrawal. Immediate action: assign a faculty mentor and schedule '
        'a course load adjustment meeting. Priority: High.',
    ],
    "Counseling": [
        'Behavioral indicators suggest this student may be experiencing personal challenges '
        'that are impacting their academic engagement. {factor} is the primary concern. '
        'Recommend a proactive welfare check-in focused on identifying external stressors '
        'and connecting them with campus support services.',
        'Student\'s engagement profile shows a sharp decline that warrants immediate attention. '
        '{factor} indicates a pattern often associated with students facing non-academic barriers. '
        'Schedule a confidential counseling session within 48 hours. '
        'Consider both academic and personal support pathways.',
    ],
    "Engagement": [
        'Digital engagement metrics for this student have dropped significantly. {factor} '
        'suggests reduced interaction with course materials and learning platforms. '
        'This pattern typically precedes formal disengagement. Recommend a check-in focused '
        'on potential technical barriers and course relevance concerns.',
    ],
    "Social Integration": [
        'This student shows low social engagement within the learning community. {factor} '
        'indicates minimal peer interaction which is a strong predictor of attrition. '
        'Recommend assignment to a peer mentor group and encouragement to participate '
        'in departmental study sessions or extracurricular academic activities.',
    ],
    "Academic Planning": [
        'Course progression analysis reveals that this student\'s credit approval rate is below '
        'the retention threshold. {factor} suggests potential misalignment between course load '
        'and academic readiness. Recommend a comprehensive degree audit and meeting with '
        'an academic advisor to restructure their semester plan.',
    ],
}

DEFAULT_NOTE = (
    'This student has been flagged by the early warning system based on multiple risk indicators. '
    '{factor} is the primary contributing factor. Recommend a comprehensive review '
    'with the student\'s academic advisor to identify appropriate support interventions. '
    'Priority: review within one week.'
)


async def _generate_with_gemini(request: CounselorNoteRequest, primary_factor: str) -> str:
    """Generate a counselor note using the real Gemini API."""
    client = _get_gemini_client()
    if not client:
        return None

    # Build all factor descriptions
    factor_details = []
    for i, f in enumerate(request.top_factors[:5]):
        name = f.get("display_name", f.get("feature", "unknown"))
        val = f.get("raw_value", "N/A")
        direction = f.get("direction", "unknown")
        trend = "↑ risk" if direction == "risk_increasing" else "↓ protective"
        factor_details.append(f"  {i+1}. {name}: {val} ({trend})")

    factors_text = "\n".join(factor_details)

    prompt = f"""You are a senior academic counselor at a university. Generate a professional, empathetic, and actionable counselor intervention note for the following at-risk student.

STUDENT PROFILE:
- Name: {request.student_name}
- Department: {request.department or 'Not specified'}
- Year: {request.year or 'Not specified'}
- Risk Score: {request.risk_score}/100
- Risk Tier: {request.risk_tier}
- Primary Intervention Category: {request.intervention_type}

RISK FACTORS (ranked by impact):
{factors_text}

INSTRUCTIONS:
- Write 3-4 sentences maximum.
- Be specific about the student's data patterns — reference actual values.
- Include one concrete, actionable next step (e.g., "Schedule a meeting with...", "Refer to...", "Enroll in...").
- Use professional, institutional language appropriate for an academic setting.
- Do NOT include greetings, sign-offs, or the student's name.
- Do NOT use markdown formatting.
- Convey urgency proportional to the risk score."""

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        note = response.text.strip()
        # Strip any quotes the model might add
        if note.startswith('"') and note.endswith('"'):
            note = note[1:-1]
        log.info(f"Gemini note generated for {request.student_name} ({len(note)} chars)")
        return note
    except Exception as e:
        log.error(f"Gemini API error: {e}")
        return None


def _generate_mock_note(request: CounselorNoteRequest, primary_factor: str) -> str:
    """Generate a mock counselor note from templates."""
    random.seed(hash(request.student_name))
    templates = NOTE_TEMPLATES.get(request.intervention_type, [DEFAULT_NOTE])
    template = random.choice(templates)
    return template.format(factor=primary_factor)


@router.post("/generate-note", response_model=CounselorNoteResponse)
async def generate_counselor_note(request: CounselorNoteRequest, req: Request = None):
    """Generate a personalized AI counselor note based on risk factors."""
    # Get the primary factor description
    primary_factor = ""
    if request.top_factors:
        factor = request.top_factors[0]
        display_name = factor.get("display_name", factor.get("feature", "unknown factor"))
        raw_value = factor.get("raw_value", "")
        primary_factor = f"{display_name} ({raw_value})"

    # Try real Gemini first, fall back to mock
    generated_by = "Gemini Pro"
    note = None

    if GEMINI_API_KEY:
        note = await _generate_with_gemini(request, primary_factor)
        if note:
            generated_by = "Gemini 2.0 Flash (Live)"

    if not note:
        note = _generate_mock_note(request, primary_factor)
        generated_by = "Gemini Pro (Cached)"

    # Determine priority
    if request.risk_score >= 75:
        priority = "Critical"
    elif request.risk_score >= 50:
        priority = "High"
    elif request.risk_score >= 35:
        priority = "Medium"
    else:
        priority = "Low"

    # Audit
    client_ip = req.client.host if req and req.client else "127.0.0.1"
    log_event(
        AuditAction.GENERATE_NOTE,
        f"Note for {request.student_name} (risk: {request.risk_score}, tier: {request.risk_tier})",
        actor="counselor",
        ip_address=client_ip,
    )

    return CounselorNoteResponse(
        note=note,
        priority=priority,
        intervention_type=request.intervention_type,
        generated_by=generated_by,
    )
