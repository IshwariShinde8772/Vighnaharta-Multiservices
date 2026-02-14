import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkEnquiry from './pages/WorkEnquiry';
import Accounts from './pages/Accounts';
import ManualEntry from './pages/ManualEntry';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import PendingWork from './pages/PendingWork';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Placeholder components for now
const DashboardPlaceholder = () => <Dashboard />;
const WorkEnquiryPlaceholder = () => <WorkEnquiry />;
const AccountsPlaceholder = () => <Accounts />;
const ManualEntryPlaceholder = () => <ManualEntry />;
const SettingsPlaceholder = () => <Settings />;
const ReportsPlaceholder = () => <Reports />;
const PendingWorkPlaceholder = () => <PendingWork />;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPlaceholder />} />
            <Route path="enquiry" element={<WorkEnquiryPlaceholder />} />
            <Route path="pending" element={<PendingWorkPlaceholder />} />
            <Route path="accounts" element={<AccountsPlaceholder />} />
            <Route path="manual-entry" element={<ManualEntryPlaceholder />} />
            <Route path="settings" element={<SettingsPlaceholder />} />
            <Route path="reports" element={<ReportsPlaceholder />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
