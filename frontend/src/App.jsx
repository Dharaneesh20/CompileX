import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Import Bootstrap CSS First
import 'bootstrap/dist/css/bootstrap.min.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import FrameworkIDE from './pages/FrameworkIDE';

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!token) return <Navigate to="/auth" />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/editor/:projectId"
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/framework/:wsId"
        element={
          <ProtectedRoute>
            <FrameworkIDE />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cooking"
        element={
          <div className="min-h-screen bg-slate-900 text-white d-flex align-items-center justify-content-center">
            <div className="glass-panel p-5 text-center" style={{ maxWidth: '500px' }}>
              <h2 className="fs-3 fw-bold mb-4">What We Are Cooking</h2>
              <ul className="text-slate-300 text-start">
                <li>Framework support (Django, MERN, etc)</li>
                <li>Real-time code sharing</li>
                <li>AI code suggestions</li>
              </ul>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
