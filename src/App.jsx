import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Nav from './components/layout/Nav';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import SetPassword from './pages/SetPassword';
import Dashboard from './pages/Dashboard';
import { MyHours, SubmitHours } from './pages/Hours';
import AdminHours from './pages/AdminHours';
import AdminUsers from './pages/AdminUsers';
import AdminHouseholds from './pages/AdminHouseholds';
import HouseholdPage from './pages/HouseholdPage';
import ChangePassword from './pages/ChangePassword';
import Register from './pages/Register';
import AdminProjects from './pages/AdminProjects';
import BulkHours from './pages/BulkHours';
import Reports from './pages/Reports';
import Rewards from './pages/Rewards';
import Resources from './pages/Resources';
import AdminResources from './pages/AdminResources';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><span className="spinner" /></div>;
  if (!user)   return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><span className="spinner" /></div>;
  if (!user)       return <Navigate to="/login" replace />;
  if (!user.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <>
      <Nav />
      <main>{children}</main>
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Login />} />
      <Route path="/register"        element={<Register />} />
      <Route path="/set-password"    element={<SetPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Member routes */}
      <Route path="/dashboard" element={
        <RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>
      } />
      <Route path="/hours" element={
        <RequireAuth><AppLayout><MyHours /></AppLayout></RequireAuth>
      } />
      <Route path="/hours/submit" element={
        <RequireAuth><AppLayout><SubmitHours /></AppLayout></RequireAuth>
      } />

      {/* Admin routes */}
      <Route path="/admin/hours" element={
        <RequireAdmin><AppLayout><AdminHours /></AppLayout></RequireAdmin>
      } />
      <Route path="/admin/users" element={
        <RequireAdmin><AppLayout><AdminUsers /></AppLayout></RequireAdmin>
      } />
      <Route path="/admin/households" element={
        <RequireAdmin><AppLayout><AdminHouseholds /></AppLayout></RequireAdmin>
      } />
      <Route path="/household" element={
        <RequireAuth><AppLayout><HouseholdPage /></AppLayout></RequireAuth>
      } />
      <Route path="/change-password" element={
        <RequireAuth><AppLayout><ChangePassword /></AppLayout></RequireAuth>
      } />
      <Route path="/admin/projects" element={
        <RequireAdmin><AppLayout><AdminProjects /></AppLayout></RequireAdmin>
      } />
      <Route path="/admin/bulk-hours" element={
        <RequireAdmin><AppLayout><BulkHours /></AppLayout></RequireAdmin>
      } />
      <Route path="/admin/reports" element={
        <RequireAdmin><AppLayout><Reports /></AppLayout></RequireAdmin>
      } />
      <Route path="/admin/rewards" element={
        <RequireAdmin><AppLayout><Rewards /></AppLayout></RequireAdmin>
      } />
      <Route path="/admin/resources" element={
        <RequireAdmin><AppLayout><AdminResources /></AppLayout></RequireAdmin>
      } />
      <Route path="/resources" element={
        <RequireAuth><AppLayout><Resources /></AppLayout></RequireAuth>
      } />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
