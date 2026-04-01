import './Header.css';

interface HeaderProps {
  institution?: string;
}

export default function Header({ institution }: HeaderProps) {
  return (
    <header className="top-header" id="top-header">
      <div className="top-header__left">
        <span className="top-header__brand">Sovereign Scholar</span>
      </div>
      <div className="top-header__right">
        <div className="top-header__search">
          <span className="material-symbols-outlined">search</span>
          <input
            className="top-header__search-input"
            type="text"
            placeholder="Search records..."
            id="search-input"
          />
        </div>
        {institution && (
          <span className="top-header__institution">{institution}</span>
        )}
        <button className="btn-ghost" id="profile-btn">
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </div>
    </header>
  );
}
