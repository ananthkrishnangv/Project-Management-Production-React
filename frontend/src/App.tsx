import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import FinancePage from './pages/FinancePage';
import StaffPage from './pages/StaffPage';
import RCMeetingsPage from './pages/RCMeetingsPage';
import DocumentsPage from './pages/DocumentsPage';
import ReportsPage from './pages/ReportsPage';
import TimelinePage from './pages/TimelinePage';
import SettingsPage from './pages/SettingsPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import DGDashboardPage from './pages/DGDashboardPage';
import BulkImportPage from './pages/BulkImportPage';
import ArchivePage from './pages/ArchivePage';

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="dg-dashboard" element={<DGDashboardPage />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:id" element={<ProjectDetailPage />} />
                    <Route path="finance" element={<FinancePage />} />
                    <Route path="staff" element={<StaffPage />} />
                    <Route path="rc-meetings" element={<RCMeetingsPage />} />
                    <Route path="documents" element={<DocumentsPage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="timeline" element={<TimelinePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="users" element={<UsersPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="bulk-import" element={<BulkImportPage />} />
                    <Route path="archive" element={<ArchivePage />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
