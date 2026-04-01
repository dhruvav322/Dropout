import { NavLink } from 'react-router-dom';
import { useInstitution } from '../context/InstitutionContext';
import './Sidebar.css';

export default function Sidebar() {
  const { institution } = useInstitution();

  // Generate initials from institution name dynamically
  const initials = institution
    ? institution.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'DR';

  return (
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
          id="nav-dashboard"
        >
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/upload"
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
          id="nav-upload"
        >
          <span className="material-symbols-outlined">add_circle</span>
          <span>Upload</span>
        </NavLink>
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
          }
          id="nav-settings"
        >
          <span className="material-symbols-outlined">manufacturing</span>
          <span>Admin Console</span>
        </NavLink>
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
  );
}
