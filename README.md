# 🎓 Sovereign Scholar — Predictive Retention Management

A state-of-the-art early warning system designed to predict and prevent student dropout using machine learning and generative AI.

## 🚀 Overview

Sovereign Scholar transforms raw student demographic, academic, and behavioral data into actionable insights for university administrators. By employing a robust LightGBM predictive model and Explainable AI (SHAP), the system calculates individualized risk scores and identifies the specific factors threatening a student's success (e.g., LMS inactivity, tuition delays, attendance drops). 

It pairs these insights with **Gemini-powered AI Counselor Notes** to suggest immediate, hyper-personalized intervention paths.

---

## ✨ Key Features

- **📊 Dynamic Data Ingestion**: Upload institutional SV datasets containing grades, attendance, forum activity, and financial data for instantaneous scoring.
- **🤖 Explainable Machine Learning**: Uses a trained LightGBM model combined with SHAP analysis to provide "Why?" behind every risk score—ensuring administrators don't just see a score, but understand the root cause.
- **🧠 Generative AI Counselor Notes**: Integrates with the Google Gemini API to draft real-time, context-aware intervention strategies for at-risk students based on their specific risk factors.
- **🛡️ Enterprise-Grade Security**: Fully hardened backend with prompt/log injection defenses, Token Bucket rate-limiting, content security policies (CSP), and regex-validated path routing.
- **🎨 State-of-the-art UI/UX**: Built with React and Framer Motion, featuring dynamic gender-aware avatars, real-time client-side search, intelligent pagination, and animated toast notifications.

---

## 🛠️ Technology Stack

**Frontend (Client-side)**
- **Framework**: React 18 + Vite (TypeScript)
- **Styling**: Vanilla CSS (CSS Variables, Flexbox/Grid)
- **Animation**: Framer Motion
- **Icons**: Google Material Symbols
- **Hosting**: Vercel

**Backend (Server-side & ML)**
- **API Framework**: FastAPI (Python)
- **Machine Learning**: LightGBM, Scikit-Learn
- **Explainable AI**: SHAP (SHapley Additive exPlanations)
- **Generative AI**: Google Gemini API (`gemini-2.0-flash`)
- **Data Processing**: Pandas, NumPy
- **Hosting**: Render

---

## 🚦 Getting Started

### 1. Backend Setup

Navigate to the `backend` directory and set up the Python environment:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Environment Setup
cp .env.example .env
# Open .env and add your GEMINI_API_KEY and configure DEMO_INSTITUTION

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

Navigate to the `frontend` directory and install the Node.js packages:

```bash
cd frontend
npm install

# Run the development server
npm run dev
```

Your frontend will now be accessible at `http://localhost:5173`.

---

## 🔐 Security Architecture

Sovereign Scholar has been rigorously audited and secured:
- **Zero Hardcoded Data**: All contextual information flows dynamically via contexts.
- **AI Prompt Protection**: All user-supplied inputs undergo aggressive regex sanitization and keyword stripping before dispatching to the Gemini API to prevent prompt override attacks.
- **Rate Limiting**: Multi-tiered token bucket rate limiters protect endpoints against brute force and DDoS attacks.
- **Security Headers**: API responses enforce strict `Content-Security-Policy` and `Permissions-Policy` to block framing, XSS, and unauthorized hardware access.

---

## 📁 Repository Structure

```text
Dropout/
│
├── backend/                  # FastAPI Application & ML Models
│   ├── app/
│   │   ├── api/              # API Route Handlers (Dashboard, Gemini, Upload)
│   │   ├── ml/               # LightGBM Model & SHAP Explainer
│   │   ├── data/             # CSV processing and Dataset Generation
│   │   ├── security.py       # Anti-injection & Rate Limiting Middleware
│   │   └── main.py           # Application Entrypoint
│   └── requirements.txt      # Python Dependencies
│
├── frontend/                 # React UI Web Application
│   ├── src/
│   │   ├── components/       # Reusable UI (Sidebar, Headers, Tables)
│   │   ├── context/          # Global Contexts (InstitutionContext, SearchContext)
│   │   ├── pages/            # View Layouts (Dashboard, StudentProfile, Upload)
│   │   ├── services/         # API Fetch abstraction
│   │   └── App.tsx           # Router Configuration
│   └── package.json          # Node Dependencies
```
