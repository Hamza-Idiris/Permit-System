import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ApplicantWorkflow from './pages/ApplicantWorkflow';
import MyApplications from './pages/MyApplications';
import Notifications from './pages/Notifications';
import StaffNotifications from './pages/StaffNotifications';
import StaffDashboard from './pages/StaffDashboard';
import StaffReview from './pages/StaffReview';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import UserManagement from './pages/UserManagement';
import DistrictManagement from './pages/DistrictManagement';
import BuildingTypesManagement from './pages/BuildingTypesManagement';
import AllApplications from './pages/AllApplications';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import ApprovedPermits from './pages/ApprovedPermits';
import ForgotPassword from './pages/ForgotPassword';
import ChangePassword from './pages/ChangePassword';
import Sidebar from './components/Sidebar';

// Mock Component for Admin Dashboard
const AdminDashboard = () => (
  <div className="p-12">
    <h1 className="text-2xl font-bold text-navy mb-4">Admin Dashboard</h1>
    <p>Welcome to the admin panel. Manage permits and users here.</p>
  </div>
);

// Mock Component for Inspector Scanner
const InspectorScanner = () => (
  <div className="flex h-screen bg-gray-50">
    <Sidebar />
    <div className="p-12">
      <h1 className="text-2xl font-bold text-navy mb-4">Mashiinka Baaritaanka (Inspector)</h1>
      <p className="text-gray-500">Scan permits and submit inspection reports.</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            {/* Common Protected Routes ... */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['superadmin', 'staff', 'applicant', 'inspector']}>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/change-password" element={
              <ProtectedRoute allowedRoles={['superadmin', 'staff', 'applicant', 'inspector']}>
                <ChangePassword />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/staff" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/districts" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <DistrictManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/building-types" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <BuildingTypesManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/applicants" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/inspectors" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/all-permits" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <AllApplications />
              </ProtectedRoute>
            } />
            <Route path="/admin/reports" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Reports />
              </ProtectedRoute>
            } />

            {/* Staff Routes */}
            <Route path="/staff/dashboard" element={
              <ProtectedRoute allowedRoles={['staff', 'superadmin']}>
                <StaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/review/:id" element={
              <ProtectedRoute allowedRoles={['staff', 'superadmin']}>
                <StaffReview />
              </ProtectedRoute>
            } />
            <Route path="/staff/approved" element={
              <ProtectedRoute allowedRoles={['staff', 'superadmin']}>
                <ApprovedPermits />
              </ProtectedRoute>
            } />
            <Route path="/staff/notifications" element={
              <ProtectedRoute allowedRoles={['staff', 'superadmin']}>
                <StaffNotifications />
              </ProtectedRoute>
            } />

            {/* Applicant Routes */}
            <Route path="/applicant/home" element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <ApplicantWorkflow />
              </ProtectedRoute>
            } />
            <Route path="/applicant/applications" element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <MyApplications />
              </ProtectedRoute>
            } />
            <Route path="/applicant/notifications" element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/applicant/profile" element={
              <ProtectedRoute allowedRoles={['applicant']}>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Inspector Routes */}
            <Route path="/inspector/scanner" element={
              <ProtectedRoute allowedRoles={['inspector']}>
                <InspectorScanner />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
