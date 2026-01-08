import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    HomeRegular,
    FolderRegular,
    MoneyRegular,
    PeopleTeamRegular,
    CalendarRegular,
    DocumentRegular,
    ChartMultipleRegular,
    TimelineRegular,
    SettingsRegular,
    PersonRegular,
    SignOutRegular,
    NavigationRegular,
    DismissRegular,
    AlertRegular,
    ChevronDownRegular,
    ArrowSyncRegular,
    BuildingMultipleRegular,
    ArrowUploadRegular,
    SendRegular,
    CheckmarkCircleRegular,
    MailRegular,
    ArchiveRegular,
} from '@fluentui/react-icons';

interface Notification {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeRegular },
    { name: 'DG Dashboard', href: '/dg-dashboard', icon: BuildingMultipleRegular, roles: ['DIRECTOR_GENERAL', 'ADMIN', 'DIRECTOR'] },
    { name: 'Projects', href: '/projects', icon: FolderRegular },
    { name: 'Finance', href: '/finance', icon: MoneyRegular, roles: ['ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL', 'SUPERVISOR', 'PROJECT_HEAD'] },
    { name: 'Staff', href: '/staff', icon: PeopleTeamRegular },
    { name: 'RC Meetings', href: '/rc-meetings', icon: CalendarRegular, roles: ['ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL', 'SUPERVISOR', 'RC_MEMBER'] },
    { name: 'Documents', href: '/documents', icon: DocumentRegular },
    { name: 'Reports', href: '/reports', icon: ChartMultipleRegular },
    { name: 'Timeline', href: '/timeline', icon: TimelineRegular },
    { name: 'Archive', href: '/archive', icon: ArchiveRegular, roles: ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'] },
];

const adminNavigation = [
    { name: 'Users', href: '/users', icon: PersonRegular, roles: ['ADMIN', 'SUPERVISOR'] },
    { name: 'Bulk Import', href: '/bulk-import', icon: ArrowUploadRegular, roles: ['ADMIN', 'SUPERVISOR'] },
    { name: 'Settings', href: '/settings', icon: SettingsRegular, roles: ['ADMIN'] },
];

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const { user, accessToken, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushingUpdate, setPushingUpdate] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Check if current user can push update requests
    const canPushUpdates = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(user?.role || '');

    useEffect(() => {
        fetchNotifications();
        // Refresh every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${API_BASE}/notifications?limit=10`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || data || []);
                setUnreadCount(data.unreadCount || data.filter((n: Notification) => !n.isRead).length || 0);
            }
        } catch (err) {
            // Fallback placeholder notifications
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            setNotifications(notifications.map(n =>
                n.id === notificationId ? { ...n, isRead: true } : n
            ));
            setUnreadCount(Math.max(0, unreadCount - 1));
        } catch (err) {
            console.error('Failed to mark notification as read');
        }
    };

    const handlePushUpdateRequest = async () => {
        if (pushingUpdate) return;
        setPushingUpdate(true);

        try {
            const response = await fetch(`${API_BASE}/staff/push-update-request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({ message: 'Please submit your project progress updates at the earliest.' })
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(`Update request sent to ${data.notifiedCount || 'all'} project head(s)`);
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch (err) {
            console.error('Failed to push update request');
        } finally {
            setPushingUpdate(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filterNavByRole = (nav: typeof navigation) => {
        return nav.filter(item => {
            if (!item.roles) return true;
            return item.roles.includes(user?.role || '');
        });
    };

    const roleLabels: Record<string, string> = {
        ADMIN: 'Administrator',
        DIRECTOR: 'Director',
        DIRECTOR_GENERAL: 'Director General',
        SUPERVISOR: 'Head, BKMD',
        PROJECT_HEAD: 'Principal Investigator',
        EMPLOYEE: 'Scientist',
        RC_MEMBER: 'RC Member',
        EXTERNAL_OWNER: 'External Partner',
    };

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <div className="min-h-screen bg-surface-muted">
            {/* Success Message Toast */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 p-4 bg-success-50 border border-success-200 rounded-lg text-success-700 shadow-lg animate-fade-in flex items-center gap-2">
                    <CheckmarkCircleRegular className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-secondary-900/50 z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-secondary-100">
                        <div className="flex items-center gap-3">
                            <img
                                src="/images/CSIR-LOGO-PNG-200px.jpg"
                                alt="CSIR Logo"
                                className="logo-image"
                            />
                            <div>
                                <h1 className="text-lg font-display font-bold text-primary-700">CSIR-SERC</h1>
                                <p className="text-xs text-secondary-500">Project Portal</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        <p className="px-4 py-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                            Main Menu
                        </p>
                        {filterNavByRole(navigation).map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                                }
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.name}</span>
                            </NavLink>
                        ))}

                        {filterNavByRole(adminNavigation).length > 0 && (
                            <>
                                <div className="pt-4 pb-2">
                                    <p className="px-4 py-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                                        Administration
                                    </p>
                                </div>
                                {filterNavByRole(adminNavigation).map((item) => (
                                    <NavLink
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={({ isActive }) =>
                                            `nav-link ${isActive ? 'nav-link-active' : ''}`
                                        }
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </NavLink>
                                ))}
                            </>
                        )}
                    </nav>

                    {/* User Info at bottom */}
                    <div className="p-4 border-t border-secondary-100">
                        <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-gradient-premium flex items-center justify-center text-white font-semibold">
                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-secondary-900 truncate">
                                    {user?.firstName} {user?.lastName}
                                </p>
                                <p className="text-xs text-secondary-500 truncate">
                                    {roleLabels[user?.role || '']}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Header */}
            <header className="header left-0 lg:left-72">
                <div className="flex items-center justify-between h-full px-4 lg:px-8">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                    >
                        {sidebarOpen ? (
                            <DismissRegular className="w-6 h-6 text-secondary-600" />
                        ) : (
                            <NavigationRegular className="w-6 h-6 text-secondary-600" />
                        )}
                    </button>

                    {/* Page Title */}
                    <div className="hidden lg:block">
                        <h2 className="text-lg font-semibold text-secondary-900">
                            Welcome back, {user?.firstName}
                        </h2>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-3">
                        {/* Refresh Page Button */}
                        <button
                            onClick={() => window.location.reload()}
                            className="p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                            title="Refresh page"
                        >
                            <ArrowSyncRegular className="w-5 h-5 text-secondary-600" />
                        </button>

                        {/* Push Update Button (for Head, BKMD and above) */}
                        {canPushUpdates && (
                            <button
                                onClick={handlePushUpdateRequest}
                                disabled={pushingUpdate}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                                title="Request project updates from all project heads"
                            >
                                <SendRegular className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {pushingUpdate ? 'Sending...' : 'Request Updates'}
                                </span>
                            </button>
                        )}

                        {/* Currency Rate Display */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-success-50 rounded-lg">
                            <span className="text-xs font-medium text-success-700">USD/INR</span>
                            <span className="text-sm font-bold text-success-800">₹83.50</span>
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setNotificationOpen(!notificationOpen)}
                                className="relative p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                            >
                                <AlertRegular className="w-6 h-6 text-secondary-600" />
                                {unreadCount > 0 && (
                                    <span className="notification-dot">{unreadCount}</span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {notificationOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setNotificationOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-premium-lg border border-secondary-200 z-20 animate-scale-in overflow-hidden">
                                        <div className="p-4 border-b border-secondary-100 flex items-center justify-between">
                                            <h3 className="font-semibold text-secondary-900">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                                    {unreadCount} new
                                                </span>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-secondary-500">
                                                    <MailRegular className="w-8 h-8 mx-auto mb-2 text-secondary-300" />
                                                    <p className="text-sm">No notifications yet</p>
                                                </div>
                                            ) : (
                                                notifications.map(notification => (
                                                    <div
                                                        key={notification.id}
                                                        onClick={() => handleMarkAsRead(notification.id)}
                                                        className={`p-4 border-b border-secondary-50 cursor-pointer hover:bg-secondary-50 transition-colors ${!notification.isRead ? 'bg-primary-50/30' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-primary-500' : 'bg-transparent'
                                                                }`} />
                                                            <div className="flex-1">
                                                                <p className="text-sm text-secondary-700">{notification.message}</p>
                                                                <p className="text-xs text-secondary-400 mt-1">
                                                                    {formatTimeAgo(notification.createdAt)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="p-3 border-t border-secondary-100">
                                                <NavLink
                                                    to="/notifications"
                                                    onClick={() => setNotificationOpen(false)}
                                                    className="block text-center text-sm text-primary-600 hover:text-primary-700"
                                                >
                                                    View all notifications
                                                </NavLink>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* User Menu */}
                        <div className="relative">
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-sm font-semibold">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                                <ChevronDownRegular className="w-4 h-4 text-secondary-500 hidden md:block" />
                            </button>

                            {/* Dropdown Menu */}
                            {userMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setUserMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-premium-lg border border-secondary-200 py-2 z-20 animate-scale-in">
                                        <div className="px-4 py-3 border-b border-secondary-100">
                                            <p className="text-sm font-medium text-secondary-900">{user?.firstName} {user?.lastName}</p>
                                            <p className="text-xs text-secondary-500">{user?.email}</p>
                                        </div>
                                        <NavLink
                                            to="/settings"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-2 text-secondary-700 hover:bg-secondary-50 transition-colors"
                                        >
                                            <SettingsRegular className="w-5 h-5" />
                                            <span>Settings</span>
                                        </NavLink>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-2 text-danger-600 hover:bg-danger-50 transition-colors"
                                        >
                                            <SignOutRegular className="w-5 h-5" />
                                            <span>Sign Out</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

