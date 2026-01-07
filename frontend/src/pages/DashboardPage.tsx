import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    FolderRegular,
    MoneyRegular,
    PeopleTeamRegular,
    CalendarRegular,
    ArrowTrendingRegular,
    ClockRegular,
    AlertRegular,
    DocumentRegular,
    ArrowRightRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    ClockAlarmRegular,
} from '@fluentui/react-icons';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

interface DashboardData {
    kpis: {
        totalProjects: number;
        activeProjects: number;
        totalStaff: number;
        pendingApprovals: number;
        overdueMilestones: number;
        expiringMoUs: number;
    };
    financial: {
        totalBudgetINR: number;
        totalExpensesINR: number;
        utilizationPercent: number;
        remainingINR: number;
    };
    projectsByStatus: Array<{ status: string; count: number }>;
    projectsByCategory: Array<{ category: string; count: number }>;
    upcomingMeetings: Array<{ id: string; title: string; date: string; number: number }>;
}

export default function DashboardPage() {
    const { user, accessToken } = useAuthStore();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const endpoint = user?.role === 'DIRECTOR' ? '/api/dashboard/director'
                : user?.role === 'SUPERVISOR' ? '/api/dashboard/supervisor'
                    : '/api/dashboard/project-head';

            const res = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mock data for demonstration
    const mockData: DashboardData = {
        kpis: {
            totalProjects: 47,
            activeProjects: 32,
            totalStaff: 156,
            pendingApprovals: 5,
            overdueMilestones: 3,
            expiringMoUs: 2,
        },
        financial: {
            totalBudgetINR: 1250000000,
            totalExpensesINR: 875000000,
            utilizationPercent: 70,
            remainingINR: 375000000,
        },
        projectsByStatus: [
            { status: 'ACTIVE', count: 32 },
            { status: 'COMPLETED', count: 8 },
            { status: 'PENDING_APPROVAL', count: 5 },
            { status: 'ON_HOLD', count: 2 },
        ],
        projectsByCategory: [
            { category: 'GAP', count: 25 },
            { category: 'CNP', count: 15 },
            { category: 'OLP', count: 7 },
        ],
        upcomingMeetings: [
            { id: '1', title: '175th Research Council Meeting', date: '2025-01-15', number: 175 },
            { id: '2', title: 'Project Review Meeting', date: '2025-01-22', number: 176 },
        ],
    };

    // Safely merge API data with defaults
    const displayData: DashboardData = data ? {
        kpis: {
            totalProjects: data.kpis?.totalProjects ?? 0,
            activeProjects: data.kpis?.activeProjects ?? 0,
            totalStaff: data.kpis?.totalStaff ?? 0,
            pendingApprovals: data.kpis?.pendingApprovals ?? 0,
            overdueMilestones: data.kpis?.overdueMilestones ?? 0,
            expiringMoUs: data.kpis?.expiringMoUs ?? 0,
        },
        financial: {
            totalBudgetINR: data.financial?.totalBudgetINR ?? 0,
            totalExpensesINR: data.financial?.totalExpensesINR ?? 0,
            utilizationPercent: data.financial?.utilizationPercent ?? 0,
            remainingINR: data.financial?.remainingINR ?? 0,
        },
        projectsByStatus: data.projectsByStatus ?? [],
        projectsByCategory: data.projectsByCategory ?? [],
        upcomingMeetings: data.upcomingMeetings ?? [],
    } : mockData;

    // Chart configurations - ensure arrays have values
    const statusCounts = [
        displayData.projectsByStatus.find(p => p.status === 'ACTIVE')?.count ?? 0,
        displayData.projectsByStatus.find(p => p.status === 'COMPLETED')?.count ?? 0,
        displayData.projectsByStatus.find(p => p.status === 'PENDING_APPROVAL')?.count ?? 0,
        displayData.projectsByStatus.find(p => p.status === 'ON_HOLD')?.count ?? 0,
    ];

    const statusChartData = {
        labels: ['Active', 'Completed', 'Pending', 'On Hold'],
        datasets: [{
            data: statusCounts,
            backgroundColor: [
                '#10b981', // success
                '#0369cc', // primary
                '#f59e0b', // warning
                '#64748b', // secondary
            ],
            borderWidth: 0,
            hoverOffset: 8,
        }],
    };

    const categoryCounts = [
        displayData.projectsByCategory.find(p => p.category === 'GAP')?.count ?? 0,
        displayData.projectsByCategory.find(p => p.category === 'CNP')?.count ?? 0,
        displayData.projectsByCategory.find(p => p.category === 'OLP')?.count ?? 0,
    ];

    const categoryChartData = {
        labels: ['Grant-in-Aid', 'Consultancy', 'Other Lab'],
        datasets: [{
            label: 'Projects',
            data: categoryCounts,
            backgroundColor: [
                'rgba(3, 105, 204, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
            ],
            borderColor: [
                '#0369cc',
                '#10b981',
                '#f59e0b',
            ],
            borderWidth: 2,
            borderRadius: 8,
        }],
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const kpiCards = [
        {
            title: 'Active Projects',
            value: displayData.kpis.activeProjects,
            total: displayData.kpis.totalProjects,
            icon: FolderRegular,
            color: 'bg-primary-500',
            trend: '+3 this month',
            trendUp: true,
        },
        {
            title: 'Budget Utilized',
            value: `${displayData.financial.utilizationPercent}%`,
            subtitle: formatCurrency(displayData.financial.totalBudgetINR),
            icon: MoneyRegular,
            color: 'bg-success-500',
            trend: formatCurrency(displayData.financial.remainingINR) + ' remaining',
            trendUp: true,
        },
        {
            title: 'Research Staff',
            value: displayData.kpis.totalStaff,
            icon: PeopleTeamRegular,
            color: 'bg-accent-500',
            trend: 'Scientists & Officers',
            trendUp: true,
        },
        {
            title: 'Pending Actions',
            value: displayData.kpis.pendingApprovals + displayData.kpis.overdueMilestones,
            icon: ClockAlarmRegular,
            color: displayData.kpis.pendingApprovals > 0 ? 'bg-warning-500' : 'bg-secondary-400',
            trend: `${displayData.kpis.pendingApprovals} approvals, ${displayData.kpis.overdueMilestones} overdue`,
            trendUp: false,
        },
    ];

    const quickActions = [
        { label: 'Create Project', href: '/projects?action=create', icon: FolderRegular },
        { label: 'View Reports', href: '/reports', icon: DocumentRegular },
        { label: 'RC Meetings', href: '/rc-meetings', icon: CalendarRegular },
        { label: 'Manage Staff', href: '/staff', icon: PeopleTeamRegular },
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="premium-card p-6">
                            <div className="skeleton h-4 w-24 mb-4" />
                            <div className="skeleton h-8 w-16 mb-2" />
                            <div className="skeleton h-3 w-32" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">
                        {user?.role === 'DIRECTOR' ? 'Director Dashboard' :
                            user?.role === 'SUPERVISOR' ? 'Supervisor Dashboard' :
                                'My Dashboard'}
                    </h1>
                    <p className="text-secondary-500 mt-1">
                        Overview of research projects and key metrics
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary-500">
                    <ClockRegular className="w-4 h-4" />
                    <span>Last updated: {new Date().toLocaleString('en-IN')}</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((kpi, index) => (
                    <div
                        key={index}
                        className="kpi-card group"
                        style={{ '--tw-shadow-color': kpi.color.replace('bg-', '') } as React.CSSProperties}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-secondary-500">{kpi.title}</p>
                                <p className="text-3xl font-bold text-secondary-900 mt-2">
                                    {kpi.value}
                                    {kpi.total && (
                                        <span className="text-lg font-normal text-secondary-400">/{kpi.total}</span>
                                    )}
                                </p>
                                {kpi.subtitle && (
                                    <p className="text-sm text-secondary-500 mt-1">{kpi.subtitle}</p>
                                )}
                            </div>
                            <div className={`w-12 h-12 rounded-xl ${kpi.color} flex items-center justify-center text-white shadow-premium transition-transform duration-300 group-hover:scale-110`}>
                                <kpi.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className={`mt-4 flex items-center gap-1 text-sm ${kpi.trendUp ? 'text-success-600' : 'text-secondary-500'}`}>
                            {kpi.trendUp && <ArrowTrendingRegular className="w-4 h-4" />}
                            <span>{kpi.trend}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Status Chart */}
                <div className="chart-container">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-secondary-900">Project Status</h3>
                        <Link to="/projects" className="btn-ghost text-sm">
                            View All <ArrowRightRegular className="w-4 h-4 ml-1" />
                        </Link>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="w-48 h-48">
                            <Doughnut
                                data={statusChartData}
                                options={{
                                    cutout: '70%',
                                    plugins: {
                                        legend: { display: false },
                                    },
                                    responsive: true,
                                    maintainAspectRatio: true,
                                }}
                            />
                        </div>
                        <div className="flex-1 space-y-3">
                            {[
                                { label: 'Active', count: displayData.projectsByStatus[0]?.count || 0, color: 'bg-success-500' },
                                { label: 'Completed', count: displayData.projectsByStatus[1]?.count || 0, color: 'bg-primary-500' },
                                { label: 'Pending Approval', count: displayData.projectsByStatus[2]?.count || 0, color: 'bg-warning-500' },
                                { label: 'On Hold', count: displayData.projectsByStatus[3]?.count || 0, color: 'bg-secondary-400' },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                                    <span className="text-sm text-secondary-600 flex-1">{item.label}</span>
                                    <span className="text-sm font-semibold text-secondary-900">{item.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Projects by Category Chart */}
                <div className="chart-container">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-secondary-900">Projects by Category</h3>
                    </div>
                    <div className="h-64">
                        <Bar
                            data={categoryChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        grid: { color: 'rgba(0,0,0,0.05)' },
                                    },
                                    x: {
                                        grid: { display: false },
                                    },
                                },
                                plugins: {
                                    legend: { display: false },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Actions & Upcoming */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((action, index) => (
                            <Link
                                key={index}
                                to={action.href}
                                className="flex flex-col items-center justify-center p-4 rounded-xl bg-secondary-50 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group"
                            >
                                <action.icon className="w-6 h-6 mb-2 text-secondary-400 group-hover:text-primary-500 transition-colors" />
                                <span className="text-sm font-medium text-center">{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Upcoming RC Meetings */}
                <div className="lg:col-span-2 premium-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-secondary-900">Upcoming RC Meetings</h3>
                        <Link to="/rc-meetings" className="btn-ghost text-sm">
                            View All <ArrowRightRegular className="w-4 h-4 ml-1" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {displayData.upcomingMeetings.map((meeting) => (
                            <Link
                                key={meeting.id}
                                to={`/rc-meetings/${meeting.id}`}
                                className="flex items-center gap-4 p-4 rounded-xl bg-secondary-50 hover:bg-primary-50 transition-colors group"
                            >
                                <div className="w-14 h-14 rounded-xl bg-gradient-premium flex flex-col items-center justify-center text-white">
                                    <span className="text-xs font-medium">
                                        {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </span>
                                    <span className="text-lg font-bold">
                                        {new Date(meeting.date).getDate()}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-secondary-900 group-hover:text-primary-600 transition-colors">
                                        {meeting.title}
                                    </p>
                                    <p className="text-sm text-secondary-500">
                                        Meeting #{meeting.number} • {new Date(meeting.date).toLocaleDateString('en-IN', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                                <ArrowRightRegular className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors" />
                            </Link>
                        ))}

                        {displayData.upcomingMeetings.length === 0 && (
                            <div className="text-center py-8 text-secondary-500">
                                <CalendarRegular className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No upcoming meetings scheduled</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alert Cards - Only show if there are alerts */}
            {(displayData.kpis.overdueMilestones > 0 || displayData.kpis.expiringMoUs > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {displayData.kpis.overdueMilestones > 0 && (
                        <div className="flex items-start gap-4 p-6 bg-danger-50 border border-danger-200 rounded-2xl">
                            <div className="w-12 h-12 rounded-xl bg-danger-500 flex items-center justify-center text-white flex-shrink-0">
                                <DismissCircleRegular className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-danger-900">Overdue Milestones</h4>
                                <p className="text-sm text-danger-700 mt-1">
                                    {displayData.kpis.overdueMilestones} milestone{displayData.kpis.overdueMilestones > 1 ? 's are' : ' is'} past their deadline.
                                    Immediate attention required.
                                </p>
                                <Link to="/timeline" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-danger-700 hover:text-danger-800">
                                    View Timeline <ArrowRightRegular className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {displayData.kpis.expiringMoUs > 0 && (
                        <div className="flex items-start gap-4 p-6 bg-warning-50 border border-warning-200 rounded-2xl">
                            <div className="w-12 h-12 rounded-xl bg-warning-500 flex items-center justify-center text-white flex-shrink-0">
                                <AlertRegular className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-warning-900">Expiring MoUs</h4>
                                <p className="text-sm text-warning-700 mt-1">
                                    {displayData.kpis.expiringMoUs} MoU{displayData.kpis.expiringMoUs > 1 ? 's are' : ' is'} expiring within 30 days.
                                    Review and renew if needed.
                                </p>
                                <Link to="/documents?type=MOU" className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-warning-700 hover:text-warning-800">
                                    View MoUs <ArrowRightRegular className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
