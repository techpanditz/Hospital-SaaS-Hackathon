import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './state/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import PatientsPage from './pages/dashboard/PatientsPage';
import UsersPage from './pages/dashboard/UsersPage';
import PrescriptionsPage from './pages/dashboard/PrescriptionsPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import EmailVerified from "./pages/EmailVerified";
import ApiDocs from "./pages/ApiDocs";




function PrivateRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Marketing landing */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/api-docs" element={<ApiDocs />} />


      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email/:token" element={<EmailVerified />} />
      <Route path="/verify-email/:token" element={<div>Verifying...</div>} />
      

      {/* App */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="/app/users" element={<UsersPage />} />
        <Route path="prescriptions" element={<PrescriptionsPage />} />
        
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
