"""
LightGBM model for student dropout prediction.
Trains on synthetic data, exports risk scores 0-100.
"""

import os
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

MODEL_PATH = os.path.join(os.path.dirname(__file__), "trained_model.pkl")
DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "sample_students.csv")

FEATURE_COLUMNS = [
    "first_semester_credits_approved",
    "first_assignment_delay_hours",
    "forum_messages_posted",
    "attendance_pct",
    "lms_logins_per_week",
    "library_logins_per_week",
    "avg_grade",
    "counselor_visits",
    "late_submissions",
    "tuition_encoded",
]

TUITION_MAP = {"Paid": 0, "Delayed": 1, "Unpaid": 2}

FEATURE_DISPLAY_NAMES = {
    "first_semester_credits_approved": "Credits Approved",
    "first_assignment_delay_hours": "Assignment Submission Delay",
    "forum_messages_posted": "Forum Engagement",
    "attendance_pct": "Attendance Consistency",
    "lms_logins_per_week": "LMS Engagement",
    "library_logins_per_week": "Library Usage",
    "avg_grade": "Academic Performance",
    "counselor_visits": "Counselor Visits",
    "late_submissions": "Late Submissions",
    "tuition_encoded": "Tuition Status",
}


def prepare_data(df: pd.DataFrame) -> tuple:
    """Prepare features and labels from raw dataframe."""
    df = df.copy()
    df["tuition_encoded"] = df["tuition_payment_status"].map(TUITION_MAP).fillna(0)
    X = df[FEATURE_COLUMNS].values
    y = df["dropped_out"].values if "dropped_out" in df.columns else None
    return X, y, df


def train_model():
    """Train LightGBM classifier on synthetic data."""
    print("Loading training data...")
    df = pd.read_csv(DATA_PATH)
    X, y, _ = prepare_data(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training on {len(X_train)} samples, testing on {len(X_test)}...")

    model = lgb.LGBMClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        num_leaves=31,
        min_child_samples=10,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )

    model.fit(X_train, y_train, feature_name=FEATURE_COLUMNS)

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print("\n--- Model Evaluation ---")
    print(classification_report(y_test, y_pred, target_names=["Retained", "Dropped Out"]))
    print(f"AUC-ROC: {roc_auc_score(y_test, y_proba):.4f}")

    # Save
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

    return model


def load_model():
    """Load trained model from disk."""
    if not os.path.exists(MODEL_PATH):
        print("No trained model found. Training now...")
        return train_model()
    return joblib.load(MODEL_PATH)


def predict_risk(model, df: pd.DataFrame) -> pd.DataFrame:
    """Run inference on a dataframe, return risk scores 0-100."""
    X, _, processed_df = prepare_data(df)
    probas = model.predict_proba(X)[:, 1]
    risk_scores = (probas * 100).round(1)

    processed_df["risk_score"] = risk_scores
    processed_df["risk_tier"] = pd.cut(
        risk_scores,
        bins=[-1, 35, 65, 100],
        labels=["Stable", "At-Risk", "Critical"],
    )

    return processed_df


if __name__ == "__main__":
    from app.data.generate_data import generate_dataset
    generate_dataset()
    train_model()
