import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useApp } from '../store/appStore.js';

const LINKS = [
  ['/', 'Home'],
  ['/human-body', 'Human Body'],
  ['/cars', 'Cars'],
  ['/motorcycles', 'Motorcycles'],
  ['/buildings', 'Buildings'],
  ['/appliances', 'Appliances'],
  ['/upload', 'Upload Your Image'],
  ['/projects', 'My Projects'],
  ['/about', 'About'],
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { theme, toggleTheme, user, openAuth, logout, accounts } = useApp();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <header className="nav">
      <Link to="/" className="brand" aria-label="Explore3D home">
        <img src="/favicon.svg" alt="" />
        <span>Explore<span className="grad-text">3D</span></span>
      </Link>
      <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
        {LINKS.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
        ))}
      </nav>
      <div className="nav-right">
        <button className="icon-btn" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
        {user ? (
          <>
            <span className="chip" title={user.email}><Icon name="user" size={14} />{user.name}</span>
            <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out"><Icon name="logout" /></button>
          </>
        ) : accounts ? (
          <button className="btn btn-sm" onClick={() => openAuth(true)}>Sign in</button>
        ) : null}
        <button className="icon-btn nav-burger" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>
    </header>
  );
}
