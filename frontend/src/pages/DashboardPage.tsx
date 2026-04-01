import { useEffect } from 'react';
import { motion } from 'framer-motion';
import StatCard from '../components/StatCard';
import RiskDonut from '../components/RiskDonut';
import StudentTable from '../components/StudentTable';
import { useDashboard } from '../hooks/useStudentData';
import { useInstitution } from '../context/InstitutionContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();
  const { setInstitution } = useInstitution();

  // Push the real institution name from the API into shared context
  useEffect(() => {
    if (data?.institution) {
      setInstitution(data.institution);
    }
  }, [data?.institution, setInstitution]);

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner material-symbols-outlined" style={{ fontSize: 32 }}>progress_activity</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-error">
        <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--error)' }}>error</span>
        <h2>Unable to load dashboard</h2>
        <p className="text-muted">{error}</p>
        <p className="text-muted" style={{ marginTop: 8 }}>Ensure the backend service is running and accessible</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      className="dashboard-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      id="dashboard-page"
    >
      <header className="page-header">
        <h1>Retention Overview</h1>
        <p className="text-muted" style={{ maxWidth: 600 }}>
          System-wide analysis of student engagement and academic risk factors.
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}.
        </p>
      </header>

      {/* Metric Cards — Intentional Asymmetry */}
      <div className="grid-12 dashboard-metrics">
        <div className="col-4">
          <StatCard
            icon="person"
            label="Total Population"
            value={data.total_students}
            subtitle={`${((data.at_risk_count + data.critical_count) / data.total_students * 100).toFixed(1)}% flagged`}
            delay={0}
          />
        </div>
        <div className="col-8">
          <div className="card">
            <RiskDonut
              critical={data.critical_count}
              atRisk={data.at_risk_count}
              stable={data.stable_count}
              centerValue={data.at_risk_count + data.critical_count}
              centerLabel="At-Risk"
            />
          </div>
        </div>
      </div>

      {/* Student Table */}
      <StudentTable
        students={data.students}
        reportId={data.report_id}
      />
    </motion.div>
  );
}
