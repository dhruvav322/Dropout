import csv
import random
from faker import Faker
import os
import sys

# Make sure we can import the generator logic
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))
from app.data.generate_data import generate_student, COLUMNS

def create_pitch_dataset():
    # Use a different seed so it doesn't match the pre-loaded data exactly
    Faker.seed(2026)
    random.seed(2026)
    
    NUM_STUDENTS = 450
    OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "Pitch_Dataset_450.csv")
    
    students = [generate_student(i + 500) for i in range(NUM_STUDENTS)]
    
    # We drop the 'dropped_out' label because in the real world (when uploading), 
    # the university doesn't know who dropped out yet. That's what the ML model predicts!
    upload_columns = [c for c in COLUMNS if c != "dropped_out"]
    
    # Remove the label from the dictionaries
    for s in students:
        if "dropped_out" in s:
            del s["dropped_out"]

    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=upload_columns)
        writer.writeheader()
        writer.writerows(students)
        
    print(f"✅ Generated {NUM_STUDENTS} students for the pitch!")
    print(f"📂 Saved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    create_pitch_dataset()
