"""
SHAP explainer for individual student risk predictions.
Returns top 3 contributing risk factors per student.
"""

import shap
import numpy as np
import pandas as pd
from .model import load_model, prepare_data, FEATURE_COLUMNS, FEATURE_DISPLAY_NAMES

# Intervention routing based on primary SHAP factor
INTERVENTION_MAP = {
    "tuition_encoded": {
        "type": "Financial Aid",
        "icon": "payments",
        "action": "Route to Bursar's Office / Financial Aid",
    },
    "first_assignment_delay_hours": {
        "type": "Academic Support",
        "icon": "school",
        "action": "Assign Academic Tutor / Study Group",
    },
    "attendance_pct": {
        "type": "Counseling",
        "icon": "event_busy",
        "action": "Schedule Welfare Check-in",
    },
    "avg_grade": {
        "type": "Academic Support",
        "icon": "grade",
        "action": "Academic Remediation Program",
    },
    "lms_logins_per_week": {
        "type": "Engagement",
        "icon": "computer",
        "action": "Digital Engagement Follow-up",
    },
    "forum_messages_posted": {
        "type": "Social Integration",
        "icon": "forum",
        "action": "Peer Mentor Assignment",
    },
    "library_logins_per_week": {
        "type": "Academic Support",
        "icon": "local_library",
        "action": "Study Resources Orientation",
    },
    "counselor_visits": {
        "type": "Counseling",
        "icon": "psychology",
        "action": "Increase Counseling Frequency",
    },
    "late_submissions": {
        "type": "Academic Support",
        "icon": "assignment_late",
        "action": "Time Management Workshop",
    },
    "first_semester_credits_approved": {
        "type": "Academic Planning",
        "icon": "description",
        "action": "Course Load Review with Advisor",
    },
}


class DropoutExplainer:
    """SHAP-based explainer for dropout risk predictions."""

    def __init__(self):
        self.model = load_model()
        self.explainer = shap.TreeExplainer(self.model)

    def explain_student(self, student_data: dict) -> dict:
        """
        Explain a single student's risk prediction.
        Returns top 3 SHAP factors with values and intervention routing.
        """
        df = pd.DataFrame([student_data])
        X, _, _ = prepare_data(df)

        shap_values = self.explainer.shap_values(X)

        # For binary classification, shap_values may be a list of two arrays
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # Class 1 (dropout) SHAP values
        else:
            sv = shap_values[0]

        # Get feature contributions
        factors = []
        for i, col in enumerate(FEATURE_COLUMNS):
            factors.append({
                "feature": col,
                "display_name": FEATURE_DISPLAY_NAMES.get(col, col),
                "shap_value": round(float(sv[i]), 4),
                "raw_value": float(X[0][i]),
                "direction": "risk_increasing" if sv[i] > 0 else "risk_decreasing",
            })

        # Sort by absolute SHAP value (most impactful first)
        factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # Top 3 factors
        top_factors = factors[:3]

        # Primary intervention routing
        primary_feature = top_factors[0]["feature"]
        intervention = INTERVENTION_MAP.get(primary_feature, {
            "type": "General Counseling",
            "icon": "support_agent",
            "action": "Schedule General Advisor Meeting",
        })

        return {
            "top_factors": top_factors,
            "all_factors": factors,
            "intervention": intervention,
            "base_value": round(float(self.explainer.expected_value[1]
                                     if isinstance(self.explainer.expected_value, (list, np.ndarray))
                                     else self.explainer.expected_value), 4),
        }

    def explain_batch(self, df: pd.DataFrame) -> list:
        """Explain predictions for a batch of students."""
        X, _, _ = prepare_data(df)
        shap_values = self.explainer.shap_values(X)

        if isinstance(shap_values, list):
            sv = shap_values[1]
        else:
            sv = shap_values

        results = []
        for idx in range(len(df)):
            factors = []
            for i, col in enumerate(FEATURE_COLUMNS):
                factors.append({
                    "feature": col,
                    "display_name": FEATURE_DISPLAY_NAMES.get(col, col),
                    "shap_value": round(float(sv[idx][i]), 4),
                    "raw_value": float(X[idx][i]),
                    "direction": "risk_increasing" if sv[idx][i] > 0 else "risk_decreasing",
                })
            factors.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

            primary_feature = factors[0]["feature"]
            intervention = INTERVENTION_MAP.get(primary_feature, {
                "type": "General Counseling",
                "icon": "support_agent",
                "action": "Schedule General Advisor Meeting",
            })

            results.append({
                "top_factors": factors[:3],
                "intervention": intervention,
            })

        return results
