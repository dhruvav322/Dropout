import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useInstitution } from '../context/InstitutionContext';
import './Sidebar.css';

export default function Sidebar() {
  const { institution } = useInstitution();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generate initials from institution name dynamically
  const initials = institution
    ? institution.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  const handleMockLink = (e: React.MouseEvent, message: string) => {
    e.preventDefault(); // Prevent navigating
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <>
      <aside className="sidebar" id="sidebar">
        <div className="sidebar__brand">
          <p className="label-xs">Admin Portal</p>
          <p className="sidebar__title">Retention Management</p>
        </div>

        <nav className="sidebar__nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard Overview</span>
          </NavLink>
          
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="material-symbols-outlined">dataset</span>
            <span>Data Ingestion</span>
          </NavLink>

          {/* Separation Header */}
          <div style={{ marginTop: 16, marginBottom: 8, paddingLeft: 16, fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.05em' }}>
            OPERATIONS
          </div>

          <a href="#" className="sidebar__link" onClick={(e) => handleMockLink(e, "Directory managed from Dashboard overview")}>
            <span className="material-symbols-outlined">groups</span>
            <span>Student Directory</span>
          </a>

          <a href="#" className="sidebar__link" onClick={(e) => handleMockLink(e, "Loading Intervention Workflow Engine...")}>
            <span className="material-symbols-outlined">assignment_turned_in</span>
            <span>Active Interventions</span>
          </a>

          <a href="#" className="sidebar__link" onClick={(e) => handleMockLink(e, "Connection established to University Exchange Server")}>
            <span className="material-symbols-outlined">mail</span>
            <span>Mail Gateway</span>
          </a>

          {/* Separation Header */}
          <div style={{ marginTop: 16, marginBottom: 8, paddingLeft: 16, fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600, letterSpacing: '0.05em' }}>
            SYSTEM
          </div>

          <a href="#" className="sidebar__link" onClick={(e) => handleMockLink(e, "Access Denied: Configuration locked by IT Permissions.")}>
            <span className="material-symbols-outlined">settings</span>
            <span>Global Settings</span>
          </a>
        </nav>

        <div className="sidebar__user">
          <div className="avatar" style={{ background: 'var(--primary-container)', color: 'white' }}>
            {initials}
          </div>
          <div>
            <p className="sidebar__user-name">{institution || 'DropoutRadar'}</p>
            <p className="sidebar__user-role">Retention Admin</p>
          </div>
        </div>
      </aside>

      {/* Interactive Toast for mock links */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--surface-container-highest)',
          color: 'var(--on-surface)',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease forwards'
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>info</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
