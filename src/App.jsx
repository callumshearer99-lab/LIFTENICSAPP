import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Exercises from './pages/Exercises.jsx';
import ExerciseDetail from './pages/ExerciseDetail.jsx';
import Plans from './pages/Plans.jsx';
import PlanDetail from './pages/PlanDetail.jsx';
import PlanBuilder from './pages/PlanBuilder.jsx';
import Community from './pages/Community.jsx';
import Login from './pages/Login.jsx';

const NAV = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/plans', label: 'Plans', icon: '▤' },
  { to: '/exercises', label: 'Exercises', icon: '◎' },
  { to: '/community', label: 'Community', icon: '✉' },
];

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted center">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src="/icon.svg" alt="" width="28" height="28" />
          Liftenics
        </NavLink>
        <nav className="topnav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="account">
          {user ? (
            <>
              <span className="muted">@{user.username}</span>
              <button className="btn ghost small" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="btn small">
              Log in
            </NavLink>
          )}
        </div>
      </header>

      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:slug" element={<ExerciseDetail />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/plans/new" element={<RequireAuth><PlanBuilder /></RequireAuth>} />
          <Route path="/plans/:slug" element={<PlanDetail />} />
          <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
          <Route path="/community/:channel" element={<RequireAuth><Community /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<p className="center muted">Page not found.</p>} />
        </Routes>
      </main>

      <nav className="bottomnav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <span aria-hidden="true">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
