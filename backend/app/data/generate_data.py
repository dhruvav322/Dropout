"""
Faker-based synthetic student dataset generator.
Produces ~200 students with literature-backed features for dropout prediction.
"""

import csv
import os
import random
from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

NUM_STUDENTS = 450
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "sample_students.csv")

COLUMNS = [
    "student_id",
    "name",
    "department",
    "year",
    "first_semester_credits_approved",
    "tuition_payment_status",
    "first_assignment_delay_hours",
    "forum_messages_posted",
    "attendance_pct",
    "lms_logins_per_week",
    "library_logins_per_week",
    "avg_grade",
    "counselor_visits",
    "late_submissions",
    "dropped_out",
]

DEPARTMENTS = [
    "Computer Science", "Mechanical Engineering", "Business Administration",
    "Psychology", "Biology", "Mathematics", "Economics", "English Literature",
    "Electrical Engineering", "Civil Engineering",
]

TUITION_STATUSES = ["Paid", "Delayed", "Unpaid"]


def generate_student(sid: int) -> dict:
    """Generate a single student record with realistic dropout correlations."""
    # Base random features
    attendance = round(random.gauss(75, 18), 1)
    attendance = max(10, min(100, attendance))

    credits_approved = random.choice(range(2, 21))
    lms_logins = round(random.gauss(12, 6), 1)
    lms_logins = max(0, lms_logins)
    library_logins = round(random.gauss(3, 2.5), 1)
    library_logins = max(0, library_logins)
    forum_messages = max(0, int(random.gauss(8, 6)))
    avg_grade = round(random.gauss(65, 18), 1)
    avg_grade = max(10, min(100, avg_grade))
    counselor_visits = max(0, int(random.gauss(1, 1.5)))
    late_submissions = max(0, int(random.gauss(3, 4)))
    first_delay = round(max(0, random.gauss(24, 30)), 1)

    # Tuition — weighted distribution
    tuition = random.choices(
        TUITION_STATUSES, weights=[0.6, 0.25, 0.15], k=1
    )[0]

    # --- Dropout probability (correlated with features) ---
    risk_score = 0.0

    # Low attendance increases risk
    if attendance < 60:
        risk_score += 0.3
    elif attendance < 75:
        risk_score += 0.1

    # Low credits approved
    if credits_approved < 8:
        risk_score += 0.25
    elif credits_approved < 12:
        risk_score += 0.1

    # Financial stress
    if tuition == "Unpaid":
        risk_score += 0.3
    elif tuition == "Delayed":
        risk_score += 0.15

    # High assignment delay
    if first_delay > 48:
        risk_score += 0.25
    elif first_delay > 24:
        risk_score += 0.1

    # Low engagement
    if forum_messages < 3:
        risk_score += 0.15
    if lms_logins < 6:
        risk_score += 0.15

    # Low grades
    if avg_grade < 45:
        risk_score += 0.25
    elif avg_grade < 55:
        risk_score += 0.1

    # Add noise
    risk_score += random.gauss(0, 0.1)
    risk_score = max(0, min(1, risk_score))

    # ~15% dropout rate (realistic baseline)
    dropped_out = 1 if risk_score > 0.65 else 0

    return {
        "student_id": f"STU{sid:04d}",
        "name": fake.name(),
        "department": random.choice(DEPARTMENTS),
        "year": random.choice(["Freshman", "Sophomore", "Junior", "Senior"]),
        "first_semester_credits_approved": credits_approved,
        "tuition_payment_status": tuition,
        "first_assignment_delay_hours": first_delay,
        "forum_messages_posted": forum_messages,
        "attendance_pct": attendance,
        "lms_logins_per_week": lms_logins,
        "library_logins_per_week": library_logins,
        "avg_grade": avg_grade,
        "counselor_visits": counselor_visits,
        "late_submissions": late_submissions,
        "dropped_out": dropped_out,
    }


def generate_dataset():
    """Generate the full dataset and write to CSV."""
    students = [generate_student(i + 1) for i in range(NUM_STUDENTS)]

    dropout_count = sum(s["dropped_out"] for s in students)
    print(f"Generated {NUM_STUDENTS} students. Dropout rate: {dropout_count/NUM_STUDENTS*100:.1f}%")

    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(students)

    print(f"Dataset saved to {OUTPUT_PATH}")
    return students


if __name__ == "__main__":
    generate_dataset()
