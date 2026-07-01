import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './pages/Dashboard';
import UploadCall from './pages/UploadCall';
import CallDetail from './pages/CallDetail';
import Login from './pages/Login';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
  const avatar = user.user_metadata?.avatar_url;
  const initial = name.charAt(0).toUpperCase();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <nav style={navStyles.nav}>
      <div style={navStyles.brand}>SalesCoach AI</div>
      <div style={navStyles.links}>
        <NavLink to="/" end style={({ isActive }) => ({ ...navStyles.link, ...(isActive ? navStyles.active : {}) })}>Dashboard</NavLink>
        <NavLink to="/upload" style={({ isActive }) => ({ ...navStyles.link, ...(isActive ? navStyles.active : {}) })}>New Call</NavLink>

      </div>
      <div style={navStyles.userArea}>
        {avatar
          ? <img src={avatar} alt={name} style={navStyles.avatarImg} />
          : <div style={navStyles.avatar}>{initial}</div>
        }
        <div>
          <div style={navStyles.userName}>{name}</div>
          <div style={navStyles.userEmail}>{user.email}</div>
        </div>
        <button onClick={handleLogout} style={navStyles.logoutBtn}>Sign out</button>
      </div>

    </nav>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
          <Nav />
          <Routes>
            <Route path="/login"    element={<PublicRoute><Login mode="login" /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Login mode="register" /></PublicRoute>} />
            <Route path="/"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/upload"   element={<PrivateRoute><UploadCall /></PrivateRoute>} />
            <Route path="/calls/:id" element={<PrivateRoute><CallDetail /></PrivateRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

const navStyles = {
  nav: { background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
  brand: { fontWeight: 800, fontSize: 18, color: '#6366f1', letterSpacing: '-0.5px' },
  links: { display: 'flex', gap: 4 },
  link: { textDecoration: 'none', color: '#64748b', fontWeight: 500, fontSize: 14, padding: '6px 14px', borderRadius: 8 },
  active: { color: '#6366f1', background: '#eef2ff', fontWeight: 700 },
  userArea: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 },
  avatarImg: { width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  userName: { fontSize: 13, fontWeight: 600, color: '#1e293b' },
  userEmail: { fontSize: 11, color: '#94a3b8' },
  logoutBtn: { background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, color: '#64748b', marginLeft: 4 },
};
