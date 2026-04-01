import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ShapBars from '../components/ShapBars';
import CounselorNote from '../components/CounselorNote';
import RiskBadge from '../components/RiskBadge';
import { useStudent } from '../hooks/useStudentData';
import { generateNote, type CounselorNote as CounselorNoteType } from '../services/api';
import './StudentPage.css';

export default function StudentPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('report_id') || undefined;
  const navigate = useNavigate();

  const { student, institution, loading, error } = useStudent(studentId!, reportId);
  const [counselorNote, setCounselorNote] = useState<CounselorNoteType | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);

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
    }, 800); // Slight delay for dramatic effect

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

  const interventions = [
    { label: 'Send Counseling Email', icon: 'mail', primary: true },
    { label: 'Schedule Meeting', icon: 'calendar_month', primary: false },
    ...(student.intervention
      ? [{ label: student.intervention.action, icon: student.intervention.icon, primary: false, danger: student.risk_tier === 'Critical' }]
      : []),
    { label: 'Academic Support Referral', icon: 'school', primary: false },
  ];

  return (
    <motion.div
      className="student-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      id="student-page"
    >
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
          <div className="student-page__avatar">
            <span className="material-symbols-outlined" style={{ fontSize: 48 }}>person</span>
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

      {/* Top Navigation Tabs */}
      <div className="student-page__tabs" style={{ marginBottom: 'var(--spacing-8)' }}>
        <button className="student-page__tab student-page__tab--active">Dashboard</button>
        <button className="student-page__tab">Academic Record</button>
        <button className="student-page__tab">Interventions</button>
      </div>

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
