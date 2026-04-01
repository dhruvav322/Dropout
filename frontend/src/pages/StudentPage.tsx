import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ShapBars from '../components/ShapBars';
import CounselorNote from '../components/CounselorNote';
import RiskBadge from '../components/RiskBadge';
import { useStudent } from '../hooks/useStudentData';
import { generateNote, type CounselorNote as CounselorNoteType } from '../services/api';
import './StudentPage.css';

/* ---- Gender-aware avatar ---- */
const FEMALE_NAMES = new Set([
  'mary','patricia','jennifer','linda','barbara','elizabeth','susan','jessica',
  'sarah','karen','lisa','nancy','betty','margaret','sandra','ashley','dorothy',
  'kimberly','emily','donna','michelle','carol','amanda','melissa','deborah',
  'stephanie','rebecca','sharon','laura','cynthia','kathleen','amy','angela',
  'shirley','anna','brenda','pamela','emma','nicole','helen','samantha','katherine',
  'christine','debra','rachel','carolyn','janet','catherine','maria','heather',
  'diane','ruth','julie','olivia','joyce','virginia','victoria','kelly','lauren',
  'christina','joan','evelyn','judith','megan','andrea','cheryl','hannah','jacqueline',
  'martha','gloria','teresa','ann','sara','madison','frances','kathryn','janice',
  'jean','abigail','alice','judy','sophia','grace','denise','amber','doris',
  'marilyn','danielle','beverly','isabella','theresa','diana','natalie','brittany',
  'charlotte','marie','kayla','alexis','lori','priya','ananya','kavita','neha','pooja',
  'shreya','aisha','fatima','meera','divya','tanvi','riya','isha','sakshi','zara',
]);

function getGender(name: string): 'female' | 'male' {
  const first = name.split(' ')[0].toLowerCase();
  return FEMALE_NAMES.has(first) ? 'female' : 'male';
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0]?.[0]?.toUpperCase() || '?';
}

/* ---- Toast notification ---- */
function InterventionToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      className="intervention-toast"
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18, color: '#16a34a' }}>check_circle</span>
      <span>{message}</span>
    </motion.div>
  );
}

export default function StudentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('report_id') || undefined;
  const navigate = useNavigate();

  const { student, loading, error } = useStudent(studentId!, reportId);
  const [counselorNote, setCounselorNote] = useState<CounselorNoteType | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-generate counselor note when student loads
  useEffect(() => {
    if (!student || !student.top_factors || student.top_factors.length === 0) return;

    setNoteLoading(true);
    const timer = setTimeout(() => {
      generateNote({
        student_name: student.name,
        risk_score: student.risk_score,
        risk_tier: student.risk_tier,
        top_factors: student.top_factors!,
        intervention_type: student.intervention?.type || 'General Counseling',
        department: student.department,
        year: student.year,
      })
        .then(setCounselorNote)
        .catch(console.error)
        .finally(() => setNoteLoading(false));
    }, 800);

    return () => clearTimeout(timer);
  }, [student]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner material-symbols-outlined" style={{ fontSize: 32 }}>progress_activity</div>
        <p>Loading student profile...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="page-error">
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--error)' }}>error</span>
        <h2>Student not found</h2>
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  function getRiskScoreClass(tier: string): string {
    if (tier === 'Critical') return 'risk-score--critical';
    if (tier === 'At-Risk') return 'risk-score--at-risk';
    return 'risk-score--stable';
  }

  const gender = getGender(student.name);
  const initials = getInitials(student.name);

  const interventions = [
    { label: 'Send Counseling Email', icon: 'mail', primary: true, toast: `📧 Counseling email queued for ${student.name}` },
    { label: 'Schedule Meeting', icon: 'calendar_month', primary: false, toast: `📅 Meeting request sent to ${student.name}'s advisor` },
    ...(student.intervention
      ? [{ label: student.intervention.action, icon: student.intervention.icon, primary: false, danger: student.risk_tier === 'Critical', toast: `⚡ ${student.intervention.action} initiated for ${student.name}` }]
      : []),
    { label: 'Academic Support Referral', icon: 'school', primary: false, toast: `🎓 Academic support referral created for ${student.name}` },
  ];

  function handleIntervention(item: typeof interventions[0]) {
    setToast(item.toast);
  }

  return (
    <motion.div
      className="student-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      id="student-page"
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && <InterventionToast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Back Navigation */}
      <button className="btn btn-ghost student-page__back" onClick={() => navigate(-1)} id="back-btn">
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Dashboard
      </button>

      {/* Student Profile Header */}
      <motion.div
        className="student-page__profile"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="student-page__profile-left">
          <div className={`student-page__avatar student-page__avatar--${gender}`}>
            <span className="student-page__initials">{initials}</span>
            <span className={`student-page__gender-icon material-symbols-outlined`}>
              {gender === 'female' ? 'face_3' : 'face_6'}
            </span>
            <RiskBadge tier={student.risk_tier} pulse />
          </div>
          <div>
            <p className="label-xs">Student Profile</p>
            <h1 className="student-page__name">{student.name}</h1>
            <div className="student-page__meta">
              <span className="student-page__meta-chip">#{student.student_id}</span>
              {student.year && (
                <span className="student-page__meta-chip">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>school</span>
                  {student.year} | {student.department}
                </span>
              )}
              <span className={`student-page__meta-chip student-page__meta-chip--gender`}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  {gender === 'female' ? 'female' : 'male'}
                </span>
                {gender === 'female' ? 'Female' : 'Male'}
              </span>
            </div>
          </div>
        </div>

        <div className="student-page__score-block">
          <p className="label-xs">Calculated Risk Score</p>
          <span className={`student-page__big-score ${getRiskScoreClass(student.risk_tier)}`}>
            {Math.round(student.risk_score)}
            <span className="student-page__score-suffix">/100</span>
          </span>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        className="student-page__quick-stats"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="quick-stat">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>schedule</span>
          <div>
            <span className="quick-stat__value">{student.attendance_pct.toFixed(1)}%</span>
            <span className="quick-stat__label">Attendance</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>grade</span>
          <div>
            <span className="quick-stat__value">{student.avg_grade.toFixed(1)}</span>
            <span className="quick-stat__label">Avg Grade</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>devices</span>
          <div>
            <span className="quick-stat__value">{student.lms_logins_per_week.toFixed(1)}</span>
            <span className="quick-stat__label">LMS/wk</span>
          </div>
        </div>
        <div className="quick-stat">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
          <div>
            <span className={`quick-stat__value ${student.tuition_payment_status !== 'Paid' ? 'quick-stat__value--warn' : ''}`}>{student.tuition_payment_status}</span>
            <span className="quick-stat__label">Tuition</span>
          </div>
        </div>
      </motion.div>

      {/* SHAP Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ShapBars
          factors={student.top_factors || []}
          title="Intervention Analysis Factors"
        />
      </motion.div>

      {/* AI Counselor Note */}
      <div style={{ marginTop: 'var(--spacing-8)' }}>
        <CounselorNote
          note={counselorNote?.note || null}
          loading={noteLoading}
          priority={counselorNote?.priority}
          generatedBy={counselorNote?.generated_by}
        />
      </div>

      {/* Recommended Interventions */}
      <motion.div
        className="student-page__interventions"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <p className="label-xs" style={{ marginBottom: 'var(--spacing-4)' }}>Recommended Interventions</p>
        <div className="intervention-list">
          {interventions.map((item, idx) => (
            <div
              key={idx}
              className={`intervention-item ${item.primary ? 'intervention-item--primary' : ''} ${(item as {danger?: boolean}).danger ? 'intervention-item--danger' : ''}`}
              id={`intervention-${idx}`}
              onClick={() => handleIntervention(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleIntervention(item)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.label}</span>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
