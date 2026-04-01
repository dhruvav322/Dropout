import { motion } from 'framer-motion';
import type { ShapFactor } from '../services/api';
import './ShapBars.css';

interface ShapBarsProps {
  factors: ShapFactor[];
  title?: string;
}

export default function ShapBars({ factors, title = 'Intervention Analysis Factors' }: ShapBarsProps) {
  const maxAbs = Math.max(...factors.map(f => Math.abs(f.shap_value)), 0.01);

  const iconMap: Record<string, string> = {
    attendance_pct: 'event_busy',
    tuition_encoded: 'payments',
    first_assignment_delay_hours: 'assignment_late',
    avg_grade: 'grade',
    lms_logins_per_week: 'computer',
    forum_messages_posted: 'forum',
    library_logins_per_week: 'local_library',
    counselor_visits: 'psychology',
    late_submissions: 'schedule',
    first_semester_credits_approved: 'description',
  };

  function formatRawValue(feature: string, value: number): string {
    if (feature === 'attendance_pct') return `${value.toFixed(0)}%`;
    if (feature === 'tuition_encoded') {
      return value === 0 ? 'Paid' : value === 1 ? 'Delayed' : 'Unpaid';
    }
    if (feature === 'first_assignment_delay_hours') return `+${value.toFixed(1)} Days Avg.`;
    if (feature === 'first_semester_credits_approved') return `${value}/18 Units`;
    if (feature === 'avg_grade') return `${value.toFixed(0)}%`;
    if (feature === 'forum_messages_posted') return value <= 3 ? 'Low' : value <= 8 ? 'Moderate' : 'High';
    return value.toFixed(1);
  }

  return (
    <div className="shap-bars card" id="shap-analysis">
      <div className="shap-bars__header">
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>analytics</span>
        <h3>{title}</h3>
      </div>

      <div className="shap-bars__list">
        {factors.map((factor, idx) => {
          const barWidth = (Math.abs(factor.shap_value) / maxAbs) * 100;
          const isRisk = factor.direction === 'risk_increasing';

          return (
            <motion.div
              key={factor.feature}
              className="shap-bar-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + idx * 0.12 }}
            >
              <div className="shap-bar-item__header">
                <div className="shap-bar-item__label">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {iconMap[factor.feature] || 'info'}
                  </span>
                  <span>{factor.display_name}</span>
                </div>
                <span className={`shap-bar-item__value ${isRisk ? 'shap-bar-item__value--risk' : ''}`}>
                  {formatRawValue(factor.feature, factor.raw_value)}
                </span>
              </div>
              <div className="progress-track" style={{ height: 8 }}>
                <motion.div
                  className={`progress-fill ${isRisk ? 'progress-fill--critical' : 'progress-fill--at-risk'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + idx * 0.12, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
