import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useCompetitionStore } from './store/competitionStore';
import { useSocket } from './hooks/useSocket';

// Competition flow pages
import Round1Game       from './pages/game/Round1Game';
import QualifyScreen    from './pages/game/QualifyScreen';
import Round2Game       from './pages/game/Round2Game';
import FinalLeaderboard from './pages/game/FinalLeaderboard';

// Auth + support pages
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import AdminPanel  from './pages/admin/AdminPanel';
import LiveLeaderboard from './pages/LiveLeaderboard';

// Layout
import Layout         from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

/**
 * CompetitionRouter — after login, players are immediately sent to
 * the correct competition phase based on their persisted state.
 */
function CompetitionRouter() {
  const { phase } = useCompetitionStore();

  switch (phase) {
    case 'round1_img1':
    case 'round1_img2':
      return <Navigate to="/game/round1" replace />;
    case 'qualifying':
      return <Navigate to="/game/qualify" replace />;
    case 'round2':
      return <Navigate to="/game/round2" replace />;
    case 'final':
      return <Navigate to="/game/final" replace />;
    default:
      return <Navigate to="/game/round1" replace />;
  }
}

function App() {
  const { initializeAuth, isAuthenticated } = useAuthStore();

  useSocket();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public */}
          <Route
            path="/login"
            element={
              isAuthenticated
                ? <Navigate to={useAuthStore.getState().user?.role === 'admin' ? '/admin' : '/game'} replace />
                : <Login />
            }
          />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          {/* Live leaderboard — public, no auth needed, for projector display */}
          <Route path="/live" element={<LiveLeaderboard />} />

          {/* Protected competition flow — no Layout chrome, fullscreen */}
          <Route element={<ProtectedRoute />}>
            {/* /game → smart redirect to correct phase */}
            <Route path="/game"        element={<CompetitionRouter />} />
            <Route path="/game/round1" element={<Round1Game />} />
            <Route path="/game/qualify" element={<QualifyScreen />} />
            <Route path="/game/round2" element={<Round2Game />} />
            <Route path="/game/final"  element={<FinalLeaderboard />} />

            {/* Support pages (still accessible for admin + leaderboard) */}
            <Route element={<Layout />}>
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/admin"       element={<AdminPanel />} />
            </Route>
          </Route>

          {/* Root redirect */}
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? '/game' : '/login'} replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
