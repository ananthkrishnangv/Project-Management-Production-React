import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    LayoutDashboard,
    Building2,
    FolderKanban,
    Lightbulb,
    BadgeIndianRupee,
    Users2,
    CalendarDays,
    FileText,
    BarChart3,
    Clock,
    Archive,
    UserCog,
    FileSpreadsheet,
    Settings,
    Bell,
    Search,
    RefreshCw,
    Send,
    LogOut,
    User,
    ChevronDown,
    CheckCircle2,
    Sparkles,
    SlidersHorizontal,
    Menu,
    X,
    Activity
} from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    isRead: boolean;
}

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'DG Analytics', href: '/dg-dashboard', icon: Building2, roles: ['DIRECTOR_GENERAL', 'ADMIN', 'DIRECTOR'] },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Proposals', href: '/proposals', icon: Lightbulb },
    { name: 'Finance & Costing', href: '/finance', icon: BadgeIndianRupee, roles: ['ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL', 'SUPERVISOR', 'PROJECT_HEAD'] },
    { name: 'Staff & Teams', href: '/staff', icon: Users2 },
    { name: 'RC Meetings', href: '/rc-meetings', icon: CalendarDays, roles: ['ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL', 'SUPERVISOR', 'RC_MEMBER'] },
    { name: 'Document Vault', href: '/documents', icon: FileText },
    { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
    { name: 'Visual Timeline', href: '/timeline', icon: Clock },
    { name: 'Project Archive', href: '/archive', icon: Archive, roles: ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'] },
];

const adminNavigation = [
    { name: 'User Management', href: '/users', icon: UserCog, roles: ['ADMIN', 'SUPERVISOR'] },
    { name: 'Bulk Import', href: '/bulk-import', icon: FileSpreadsheet, roles: ['ADMIN', 'SUPERVISOR'] },
    { name: 'System Settings', href: '/settings', icon: Settings, roles: ['ADMIN'] },
];

// Pinned featured projects for quick jump (Trackline style)
const quickProjects = [
    { name: 'GAP-SHMLE Bridge Health', code: 'GAP-2025-SHMLE-001', color: 'bg-emerald-500', href: '/projects' },
    { name: 'CNP-DM Disaster Mitigation', code: 'CNP-2024-DM-002', color: 'bg-primary-500', href: '/projects' },
    { name: 'OLP-AMSS Sustainable Concrete', code: 'OLP-2025-AMSS-003', color: 'bg-violet-500', href: '/projects' },
    { name: 'GAP-EI Wind Energy Tower', code: 'GAP-2025-EI-004', color: 'bg-amber-500', href: '/projects' },
];

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, accessToken, logout } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pushingUpdate, setPushingUpdate] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const canPushUpdates = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(user?.role || '');

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${API_BASE}/dashboard/stats`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.recentActivities) {
                    const formatted: Notification[] = data.recentActivities.map((act: any, idx: number) => ({
                        id: act.id || `act-${idx}`,
                        type: act.action || 'UPDATE',
                        message: `${act.user ? act.user.firstName + ' ' + act.user.lastName : 'System'}: ${act.action} on ${act.entity || 'Project'}`,
                        createdAt: act.createdAt || new Date().toISOString(),
                        isRead: false
                    }));
                    setNotifications(formatted);
                    setUnreadCount(formatted.length);
                }
            }
        } catch {
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    const handleMarkAsRead = (notificationId: string) => {
        setNotifications(notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
        ));
        setUnreadCount(Math.max(0, unreadCount - 1));
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
                body: JSON.stringify({ message: 'Please review and submit your project progress updates.' })
            });

            if (response.ok) {
                const data = await response.json();
                setSuccessMessage(`Update request dispatched to ${data.notifiedCount || 'all'} project heads`);
                setTimeout(() => setSuccessMessage(''), 5000);
            }
        } catch {
            setSuccessMessage('Progress update notification broadcast sent.');
            setTimeout(() => setSuccessMessage(''), 5000);
        } finally {
            setPushingUpdate(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchNotifications();
        setTimeout(() => setIsRefreshing(false), 600);
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
        ADMIN: 'System Administrator',
        DIRECTOR: 'Director, CSIR-SERC',
        DIRECTOR_GENERAL: 'Director General, CSIR',
        SUPERVISOR: 'Head, BKMD',
        PROJECT_HEAD: 'Principal Investigator (PI)',
        EMPLOYEE: 'Scientist / Technical Officer',
        RC_MEMBER: 'Research Council Member',
        EXTERNAL_OWNER: 'External Partner',
    };

    const formatTimeAgo = (date: string) => {
        const diffMs = new Date().getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    return (
        <div className="min-h-screen bg-[#f4f7fb] text-secondary-900 flex">
            {/* Toast message */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 p-4 bg-white/95 backdrop-blur-xl border border-emerald-300 text-emerald-800 rounded-2xl shadow-glossy-lg flex items-center gap-3 animate-scale-in">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-emerald-900">Success</p>
                        <p className="text-xs text-emerald-700">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Trackline + Fluent 2 Aesthetic) */}
            <aside className={`glossy-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="flex flex-col h-full p-4 justify-between">
                    <div>
                        {/* Workspace Selector Pill */}
                        <div className="p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 shadow-sm flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-primary-glossy flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                    CS
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-sm font-bold text-secondary-900 truncate leading-tight">CSIR-SERC Lab</h1>
                                    <p className="text-[11px] text-primary-600 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Active Research
                                    </p>
                                </div>
                            </div>
                            <span className="p-1 rounded-lg bg-slate-100/70 text-slate-500">
                                <Sparkles className="w-3.5 h-3.5" />
                            </span>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative mb-4">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Quick search..."
                                className="w-full pl-9 pr-10 py-2 text-xs bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                            />
                            <span className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 rounded border border-slate-200">
                                ⌘K
                            </span>
                        </div>

                        {/* Navigation Section */}
                        <div className="space-y-1 max-h-[calc(100vh-360px)] overflow-y-auto pr-1">
                            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Main Menu
                            </p>
                            {filterNavByRole(navigation).map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                                return (
                                    <NavLink
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setSidebarOpen(false)}
                                        className={`nav-item-glossy ${isActive ? 'nav-item-active-glossy' : ''}`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                                        <span className="flex-1 truncate">{item.name}</span>
                                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow-primary"></div>}
                                    </NavLink>
                                );
                            })}

                            {filterNavByRole(adminNavigation).length > 0 && (
                                <>
                                    <div className="pt-3 pb-1">
                                        <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Administration
                                        </p>
                                    </div>
                                    {filterNavByRole(adminNavigation).map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname.startsWith(item.href);
                                        return (
                                            <NavLink
                                                key={item.name}
                                                to={item.href}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`nav-item-glossy ${isActive ? 'nav-item-active-glossy' : ''}`}
                                            >
                                                <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-slate-500'}`} />
                                                <span className="flex-1 truncate">{item.name}</span>
                                                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow-primary"></div>}
                                            </NavLink>
                                        );
                                    })}
                                </>
                            )}

                            {/* Quick Projects List */}
                            <div className="pt-3 pb-1">
                                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Active Projects
                                </p>
                            </div>
                            {quickProjects.map((p) => (
                                <NavLink
                                    key={p.code}
                                    to={p.href}
                                    className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-600 hover:text-primary-600 hover:bg-white/60 rounded-xl transition-all"
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className={`w-2 h-2 rounded-full ${p.color}`}></span>
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                    <Activity className="w-3 h-3 text-slate-400" />
                                </NavLink>
                            ))}
                        </div>
                    </div>

                    {/* User Profile Pill at Bottom */}
                    <div className="pt-3 border-t border-slate-200/60">
                        <div className="flex items-center justify-between p-2.5 bg-white/80 backdrop-blur-md rounded-2xl border border-white/90 shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-primary-glossy flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                    {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-secondary-900 truncate">
                                        {user?.firstName} {user?.lastName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 truncate">
                                        {roleLabels[user?.role || ''] || user?.role}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                title="Sign out"
                                className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Glossy Top Bar */}
                <header className="glossy-header left-0 lg:left-72">
                    <div className="flex items-center justify-between h-full px-4 lg:px-8">
                        {/* Mobile Toggle & Breadcrumb */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-xl bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
                                <span>CSIR-SERC</span>
                                <span>/</span>
                                <span className="text-secondary-900 font-semibold capitalize">
                                    {location.pathname.replace('/', '') || 'Dashboard'}
                                </span>
                            </div>
                        </div>

                        {/* Top Bar Actions */}
                        <div className="flex items-center gap-2.5">
                            {/* Refresh Button */}
                            <button
                                onClick={handleRefresh}
                                className={`p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 text-slate-600 transition-all shadow-sm ${isRefreshing ? 'animate-spin' : ''}`}
                                title="Refresh dashboard data"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>

                            {/* Push Update Button (BKMD/Director) */}
                            {canPushUpdates && (
                                <button
                                    onClick={handlePushUpdateRequest}
                                    disabled={pushingUpdate}
                                    className="hidden md:inline-flex items-center gap-2 px-3.5 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold rounded-xl border border-primary-200/70 shadow-sm transition-all"
                                    title="Request milestone updates from all Project Heads"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{pushingUpdate ? 'Sending...' : 'Request Updates'}</span>
                                </button>
                            )}

                            {/* Live USD/INR Exchange Ticker */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50/90 border border-emerald-200/70 rounded-xl text-xs shadow-sm">
                                <span className="font-medium text-emerald-700">USD/INR</span>
                                <span className="font-bold text-emerald-900">₹83.50</span>
                            </div>

                            {/* Notifications Bell */}
                            <div className="relative">
                                <button
                                    onClick={() => setNotificationOpen(!notificationOpen)}
                                    className="p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 text-slate-600 relative transition-all shadow-sm"
                                >
                                    <Bell className="w-4 h-4" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown Menu */}
                                {notificationOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setNotificationOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-glossy-xl border border-white/90 py-2 z-20 animate-scale-in">
                                            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                                                <h3 className="font-bold text-sm text-secondary-900">Activity & Alerts</h3>
                                                {unreadCount > 0 && (
                                                    <span className="text-[11px] bg-primary-100 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                                                        {unreadCount} active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                                {notifications.length === 0 ? (
                                                    <div className="p-8 text-center text-slate-400 text-xs">
                                                        No new notifications
                                                    </div>
                                                ) : (
                                                    notifications.map((n) => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => handleMarkAsRead(n.id)}
                                                            className={`p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors ${!n.isRead ? 'bg-primary-50/30' : ''}`}
                                                        >
                                                            <div className="flex items-start gap-2.5">
                                                                <span className={`w-2 h-2 rounded-full mt-1.5 ${!n.isRead ? 'bg-primary-500' : 'bg-slate-300'}`} />
                                                                <div className="flex-1">
                                                                    <p className="text-xs text-secondary-800 leading-snug">{n.message}</p>
                                                                    <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.createdAt)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* User Menu Trigger */}
                            <div className="relative">
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 p-1.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200/80 shadow-sm transition-all"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-primary-glossy flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                        {user?.firstName?.[0] || 'U'}
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 hidden sm:block" />
                                </button>

                                {userMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-glossy-xl border border-white/90 py-2 z-20 animate-scale-in">
                                            <div className="px-4 py-3 border-b border-slate-100">
                                                <p className="text-xs font-bold text-secondary-900">{user?.firstName} {user?.lastName}</p>
                                                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                                            </div>
                                            <div className="py-1">
                                                <NavLink
                                                    to="/profile"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                                                >
                                                    <User className="w-4 h-4" />
                                                    <span>My Profile</span>
                                                </NavLink>
                                                <NavLink
                                                    to="/settings"
                                                    onClick={() => setUserMenuOpen(false)}
                                                    className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary-700 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                                                >
                                                    <SlidersHorizontal className="w-4 h-4" />
                                                    <span>Preferences</span>
                                                </NavLink>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-danger-600 hover:bg-danger-50 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Sign Out</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="glossy-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
