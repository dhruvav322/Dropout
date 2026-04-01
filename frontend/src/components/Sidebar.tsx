import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar() {
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
          to="/"
          className="sidebar__link"
          id="nav-filter"
        >
          <span className="material-symbols-outlined">filter_alt</span>
          <span>Filter</span>
        </NavLink>
        <NavLink
          to="/"
          className="sidebar__link"
          id="nav-settings"
        >
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className="sidebar__user">
        <div className="avatar" style={{ background: 'var(--primary-container)', color: 'white' }}>
          UA
        </div>
        <div>
          <p className="sidebar__user-name">University Admin</p>
          <p className="sidebar__user-role">Lead Registrar</p>
        </div>
      </div>
    </aside>
  );
}
