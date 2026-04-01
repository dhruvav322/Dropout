import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  setAdminKey,
  getAdminHealth,
  getAuditLog,
  getModelStats,
  retrainModel,
  type SystemHealth,
  type AuditEvent,
  type ModelStats,
} from '../services/api';
import './AdminPage.css';

// ---- Auth Gate ----

function AuthGate({ onAuth }: { onAuth: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAdminKey(key);

    try {
      await getAdminHealth();
      onAuth();
    } catch {
      setError('Invalid API key. Access denied.');
      setAdminKey('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-auth-gate">
      <motion.div
        className="admin-auth-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="admin-auth-icon">
          <span className="material-symbols-outlined" style={{ fontSize: 40 }}>shield_lock</span>
        </div>
        <h2>System Administration</h2>
        <p className="admin-auth-subtitle">
          This area is restricted to authorized personnel only.
          Enter your API key to continue.
        </p>

        <form onSubmit={handleSubmit} className="admin-auth-form">
          <div className="admin-input-group">
            <span className="material-symbols-outlined admin-input-icon">key</span>
            <input
              type="password"
              placeholder="Enter API key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="admin-input"
              id="admin-key-input"
              autoFocus
            />
          </div>

          {error && (
            <motion.p
              className="admin-auth-error"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
              {error}
            </motion.p>
          )}

          <button type="submit" className="admin-auth-btn" disabled={!key || loading} id="admin-login-btn">
            {loading ? (
              <span className="material-symbols-outlined spinner" style={{ fontSize: 18 }}>progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_open</span>
                Authenticate
              </>
            )}
          </button>
        </form>

        <p className="admin-auth-footer">
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>encrypted</span>
          Secured by DropoutRadar v2.0
        </p>
      </motion.div>
    </div>
  );
}


// ---- Admin Dashboard ----

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [retraining, setRetraining] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'model' | 'danger'>('overview');

  // Check if already authed
  useEffect(() => {
    const key = sessionStorage.getItem('admin_api_key');
    if (key) {
      getAdminHealth().then(() => setAuthed(true)).catch(() => {});
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [h, a, m] = await Promise.all([
        getAdminHealth(),
        getAuditLog(30),
        getModelStats(),
      ]);
      setHealth(h);
      setAuditLog(a.events);
      setAuditTotal(a.total_since_boot);
      setModelStats(m);
    } catch (e) {
      console.error('Admin data load failed', e);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, [authed, loadData]);

  if (!authed) {
    return <AuthGate onAuth={() => { setAuthed(true); }} />;
  }

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await retrainModel();
      await loadData();
    } catch (e) {
      console.error('Retrain failed', e);
    } finally {
      setRetraining(false);
    }
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return '#f87171';
      case 'warning': return '#fbbf24';
      case 'info': return '#60a5fa';
      default: return '#94a3b8';
    }
  };

  const actionIcon = (action: string) => {
    switch (action) {
      case 'UPLOAD_CSV': return 'upload_file';
      case 'VIEW_DASHBOARD': return 'dashboard';
      case 'VIEW_STUDENT': return 'person_search';
      case 'GENERATE_NOTE': return 'psychology';
      case 'ADMIN_LOGIN': return 'shield_lock';
      case 'ADMIN_HEALTH_CHECK': return 'monitor_heart';
      case 'ADMIN_RETRAIN': return 'model_training';
      case 'SYSTEM_BOOT': return 'power_settings_new';
      default: return 'info';
    }
  };

  return (
    <motion.div
      className="admin-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      id="admin-page"
    >
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-header__left">
          <span className="material-symbols-outlined" style={{ color: '#60a5fa', fontSize: 24 }}>terminal</span>
          <div>
            <h1 className="admin-title">System Administration</h1>
            <p className="admin-subtitle">DropoutRadar Control Plane • v2.0.0</p>
          </div>
        </div>
        <div className="admin-header__right">
          {health && (
            <div className="admin-status-pill">
              <span className="admin-status-dot" />
              {health.status}
            </div>
          )}
          <span className="admin-uptime">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            {health?.uptime || '...'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {(['overview', 'audit', 'model', 'danger'] as const).map((tab) => (
          <button
            key={tab}
            className={`admin-tab ${activeTab === tab ? 'admin-tab--active' : ''} ${tab === 'danger' ? 'admin-tab--danger' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {tab === 'overview' ? 'monitoring' : tab === 'audit' ? 'assignment' : tab === 'model' ? 'model_training' : 'warning'}
            </span>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ---- OVERVIEW TAB ---- */}
        {activeTab === 'overview' && health && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="admin-grid">
              {/* System Metrics */}
              <div className="admin-card admin-card--highlight">
                <div className="admin-card__header">
                  <span className="material-symbols-outlined">memory</span>
                  <span>System Resources</span>
                </div>
                <div className="admin-metric-grid">
                  <div className="admin-metric">
                    <span className="admin-metric__value">{health.system.memory_usage_mb}</span>
                    <span className="admin-metric__label">MB Memory</span>
                  </div>
                  <div className="admin-metric">
                    <span className="admin-metric__value">{health.system.cpu_percent}%</span>
                    <span className="admin-metric__label">CPU</span>
                  </div>
                  <div className="admin-metric">
                    <span className="admin-metric__value">{health.system.pid}</span>
                    <span className="admin-metric__label">PID</span>
                  </div>
                  <div className="admin-metric">
                    <span className="admin-metric__value">{health.system.python_version}</span>
                    <span className="admin-metric__label">Python</span>
                  </div>
                </div>
              </div>

              {/* Data Status */}
              <div className="admin-card">
                <div className="admin-card__header">
                  <span className="material-symbols-outlined">database</span>
                  <span>Data Store</span>
                </div>
                <div className="admin-metric-grid">
                  <div className="admin-metric">
                    <span className="admin-metric__value">{health.data.reports_in_memory}</span>
                    <span className="admin-metric__label">Reports</span>
                  </div>
                  <div className="admin-metric">
                    <span className="admin-metric__value">{health.data.total_students_loaded}</span>
                    <span className="admin-metric__label">Students</span>
                  </div>
                </div>
              </div>

              {/* Security Status */}
              <div className="admin-card">
                <div className="admin-card__header">
                  <span className="material-symbols-outlined">security</span>
                  <span>Security Layer</span>
                </div>
                <div className="admin-check-list">
                  {health.security && Object.entries(health.security).map(([key, val]) => (
                    <div key={key} className="admin-check-item">
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16, color: val ? '#34d399' : '#f87171' }}>
                        {val ? 'check_circle' : 'cancel'}
                      </span>
                      <span>{key.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit Summary */}
              <div className="admin-card">
                <div className="admin-card__header">
                  <span className="material-symbols-outlined">assignment</span>
                  <span>Event Activity</span>
                </div>
                <div className="admin-metric" style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <span className="admin-metric__value" style={{ fontSize: '3rem' }}>{auditTotal}</span>
                  <span className="admin-metric__label">Total events since boot</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ---- AUDIT LOG TAB ---- */}
        {activeTab === 'audit' && (
          <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="admin-card admin-card--full">
              <div className="admin-card__header">
                <span className="material-symbols-outlined">receipt_long</span>
                <span>Live Audit Trail</span>
                <span className="admin-badge">{auditLog.length} events</span>
              </div>
              <div className="admin-audit-scroll">
                {auditLog.map((event) => (
                  <motion.div
                    key={event.id}
                    className="admin-audit-row"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="admin-audit-row__left">
                      <span
                        className="admin-audit-severity"
                        style={{ background: severityColor(event.severity) }}
                      />
                      <span className="material-symbols-outlined admin-audit-icon">
                        {actionIcon(event.action)}
                      </span>
                      <div className="admin-audit-row__content">
                        <span className="admin-audit-action">{event.action}</span>
                        <span className="admin-audit-detail">{event.details}</span>
                      </div>
                    </div>
                    <div className="admin-audit-row__right">
                      <span className="admin-audit-actor">{event.actor}</span>
                      <span className="admin-audit-time">
                        {new Date(event.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="admin-audit-ip">{event.ip_address}</span>
                    </div>
                  </motion.div>
                ))}
                {auditLog.length === 0 && (
                  <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No audit events recorded yet.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ---- MODEL TAB ---- */}
        {activeTab === 'model' && modelStats && (
          <motion.div key="model" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="admin-grid">
              <div className="admin-card admin-card--wide">
                <div className="admin-card__header">
                  <span className="material-symbols-outlined">model_training</span>
                  <span>LightGBM Feature Importance</span>
                </div>
                <div style={{ height: 320, padding: '0.5rem 1rem 1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={modelStats.feature_importance}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fill: '#cbd5e1', fontSize: 11 }}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: 8,
                          fontSize: 12,
                          color: '#e2e8f0',
                        }}
                      />
                      <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                        {modelStats.feature_importance.map((_, i) => (
                          <Cell key={i} fill={i < 3 ? '#60a5fa' : '#334155'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="admin-card">
                <div className="admin-card__header">
                  <span className="material-symbols-outlined">tune</span>
                  <span>Hyperparameters</span>
                </div>
                <div className="admin-param-list">
                  {[
                    ['Algorithm', modelStats.algorithm],
                    ['Estimators', modelStats.n_estimators],
                    ['Max Depth', modelStats.max_depth],
                    ['Learning Rate', modelStats.learning_rate],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="admin-param-row">
                      <span className="admin-param-label">{label}</span>
                      <span className="admin-param-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ---- DANGER ZONE TAB ---- */}
        {activeTab === 'danger' && (
          <motion.div key="danger" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="admin-card admin-card--danger">
              <div className="admin-card__header">
                <span className="material-symbols-outlined" style={{ color: '#f87171' }}>warning</span>
                <span style={{ color: '#f87171' }}>Danger Zone</span>
              </div>
              <p className="admin-danger-desc">
                These actions are irreversible and affect the production system.
                Proceed with extreme caution.
              </p>

              <div className="admin-danger-actions">
                <div className="admin-danger-item">
                  <div>
                    <h4>Retrain Model</h4>
                    <p>Re-run LightGBM training on the current dataset. This will replace the active model.</p>
                  </div>
                  <button
                    className="admin-danger-btn admin-danger-btn--warning"
                    onClick={handleRetrain}
                    disabled={retraining}
                    id="retrain-btn"
                  >
                    {retraining ? (
                      <span className="material-symbols-outlined spinner" style={{ fontSize: 16 }}>progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>model_training</span>
                    )}
                    {retraining ? 'Training...' : 'Retrain Now'}
                  </button>
                </div>

                <div className="admin-danger-item">
                  <div>
                    <h4>Purge All Reports</h4>
                    <p>Delete all analysis reports from memory. This cannot be undone.</p>
                  </div>
                  <button className="admin-danger-btn admin-danger-btn--critical" id="purge-btn">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_forever</span>
                    Purge All
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
