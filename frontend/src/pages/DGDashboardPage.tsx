import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
    FolderRegular,
    MoneyRegular,
    PeopleTeamRegular,
    ArrowTrendingRegular,
    BuildingRegular,
    ChartMultipleRegular,
    DocumentRegular,
    CalendarRegular,
    AlertRegular,
    ArrowDownloadRegular,
} from '@fluentui/react-icons';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

interface DGDashboardData {
    overview: {
        totalProjects: number;
        activeProjects: number;
        completedProjects: number;
        pendingProjects: number;
        totalStaff: number;
        expiringMoUs: number;
    };
    financial: {
        totalBudgetINR: number;
        totalBudgetUSD: number;
        totalExpensesINR: number;
        totalExpensesUSD: number;
        utilizationPercent: number;
        remainingINR: number;
        remainingUSD: number;
        exchangeRate: number;
        cashFlowReceivedINR: number;
        cashFlowUtilizedINR: number;
    };
    projectsByCategory: Array<{ category: string; count: number }>;
    projectsByStatus: Array<{ status: string; count: number }>;
    recentProjects: Array<{ id: string; code: string; title: string; status: string; category: string; projectHead: string; vertical: string }>;
    upcomingMeetings: Array<{ id: string; title: string; meetingNumber: number; date: string; status: string }>;
}

export default function DGDashboardPage() {
    const { accessToken } = useAuthStore();
    const [data, setData] = useState<DGDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

    useEffect(() => {
        fetchDashboardData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/dg-dashboard/overview', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch DG dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number, curr: 'INR' | 'USD' = currency) => {
        if (curr === 'USD') {
            if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
            if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
            return `$${amount.toFixed(2)}`;
        }
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const getCategoryLabel = (cat: string) => {
        const labels: Record<string, string> = {
            GAP: 'Grant-in-Aid',
            CNP: 'Consultancy',
            OLP: 'Other Lab',
            EFP: 'External Funded',
        };
        return labels[cat] || cat;
    };

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            ACTIVE: 'Active',
            COMPLETED: 'Completed',
            PENDING_APPROVAL: 'Pending Approval',
            ON_HOLD: 'On Hold',
            DRAFT: 'Draft',
            CANCELLED: 'Cancelled',
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            ACTIVE: 'bg-success-500',
            COMPLETED: 'bg-primary-500',
            PENDING_APPROVAL: 'bg-warning-500',
            ON_HOLD: 'bg-secondary-400',
            DRAFT: 'bg-secondary-300',
            CANCELLED: 'bg-danger-500',
        };
        return colors[status] || 'bg-secondary-400';
    };

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

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <AlertRegular className="w-16 h-16 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">Unable to load dashboard data</p>
                </div>
            </div>
        );
    }

    // Chart data
    const categoryChartData = {
        labels: (data.projectsByCategory || []).map(p => getCategoryLabel(p.category)),
        datasets: [{
            data: (data.projectsByCategory || []).map(p => p.count),
            backgroundColor: ['#0369cc', '#10b981', '#f59e0b', '#8b5cf6'],
            borderWidth: 0,
        }],
    };

    const statusChartData = {
        labels: (data.projectsByStatus || []).map(p => getStatusLabel(p.status)),
        datasets: [{
            data: (data.projectsByStatus || []).map(p => p.count),
            backgroundColor: ['#10b981', '#0369cc', '#f59e0b', '#64748b', '#94a3b8', '#ef4444'],
            borderWidth: 0,
        }],
    };

    const budgetVsExpenseData = {
        labels: ['Budget', 'Expenses', 'Remaining'],
        datasets: [{
            label: currency === 'INR' ? 'Amount (₹)' : 'Amount ($)',
            data: currency === 'INR'
                ? [data.financial.totalBudgetINR, data.financial.totalExpensesINR, data.financial.remainingINR]
                : [data.financial.totalBudgetUSD, data.financial.totalExpensesUSD, data.financial.remainingUSD],
            backgroundColor: ['#0369cc', '#f59e0b', '#10b981'],
            borderRadius: 8,
        }],
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Premium Header Banner */}
            <div className="glass-card p-8 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">
                            Director General Dashboard
                        </h1>
                        <p className="text-primary-100 mt-2">
                            CSIR-SERC Research Portfolio Overview • Real-time Analytics
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-xl p-1">
                            <button
                                onClick={() => setCurrency('INR')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currency === 'INR' ? 'bg-white text-primary-700' : 'text-white hover:bg-white/10'}`}
                            >
                                ₹ INR
                            </button>
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currency === 'USD' ? 'bg-white text-primary-700' : 'text-white hover:bg-white/10'}`}
                            >
                                $ USD
                            </button>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-white transition-all">
                            <ArrowDownloadRegular className="w-5 h-5" />
                            Export Report
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics Row with Glassmorphism */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Total Projects</p>
                            <p className="text-4xl font-bold text-secondary-900 mt-2">{data.overview.totalProjects}</p>
                            <p className="text-sm text-success-600 mt-1">{data.overview.activeProjects} Active</p>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-primary-500 flex items-center justify-center text-white shadow-lg">
                            <FolderRegular className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                <div className="kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Total Budget</p>
                            <p className="text-4xl font-bold text-secondary-900 mt-2">
                                {formatCurrency(currency === 'INR' ? data.financial.totalBudgetINR : data.financial.totalBudgetUSD)}
                            </p>
                            <p className="text-sm text-secondary-500 mt-1">
                                {data.financial.utilizationPercent}% Utilized
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-success-500 flex items-center justify-center text-white shadow-lg">
                            <MoneyRegular className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                <div className="kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Research Staff</p>
                            <p className="text-4xl font-bold text-secondary-900 mt-2">{data.overview.totalStaff}</p>
                            <p className="text-sm text-secondary-500 mt-1">Scientists & Officers</p>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-accent-500 flex items-center justify-center text-white shadow-lg">
                            <PeopleTeamRegular className="w-7 h-7" />
                        </div>
                    </div>
                </div>

                <div className="kpi-card group">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-secondary-500">Cash Flow Received</p>
                            <p className="text-4xl font-bold text-secondary-900 mt-2">
                                {formatCurrency(data.financial.cashFlowReceivedINR / (currency === 'USD' ? data.financial.exchangeRate : 1))}
                            </p>
                            <p className="text-sm text-secondary-500 mt-1">
                                {formatCurrency(data.financial.cashFlowUtilizedINR / (currency === 'USD' ? data.financial.exchangeRate : 1))} Utilized
                            </p>
                        </div>
                        <div className="w-14 h-14 rounded-xl bg-warning-500 flex items-center justify-center text-white shadow-lg">
                            <ArrowTrendingRegular className="w-7 h-7" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projects by Category */}
                <div className="chart-container">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Projects by Type</h3>
                    <div className="h-64 flex items-center justify-center">
                        <Doughnut
                            data={categoryChartData}
                            options={{
                                cutout: '65%',
                                plugins: { legend: { position: 'bottom', labels: { padding: 20 } } },
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                        />
                    </div>
                </div>

                {/* Projects by Status */}
                <div className="chart-container">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Projects by Status</h3>
                    <div className="h-64 flex items-center justify-center">
                        <Doughnut
                            data={statusChartData}
                            options={{
                                cutout: '65%',
                                plugins: { legend: { position: 'bottom', labels: { padding: 20 } } },
                                responsive: true,
                                maintainAspectRatio: false,
                            }}
                        />
                    </div>
                </div>

                {/* Budget Overview */}
                <div className="chart-container">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Budget Overview</h3>
                    <div className="h-64">
                        <Bar
                            data={budgetVsExpenseData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                                    x: { grid: { display: false } },
                                },
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Recent Projects & Upcoming Meetings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Projects */}
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                        <FolderRegular className="w-5 h-5" />
                        Recent Projects
                    </h3>
                    <div className="space-y-3">
                        {(data.recentProjects || []).map(project => (
                            <div key={project.id} className="flex items-center gap-4 p-3 rounded-xl bg-secondary-50 hover:bg-primary-50 transition-colors">
                                <div className="flex-1">
                                    <p className="font-medium text-secondary-900">{project.title}</p>
                                    <p className="text-sm text-secondary-500">
                                        {project.code} • {project.projectHead} • {project.vertical}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-secondary-200 text-secondary-700">
                                        {getCategoryLabel(project.category)}
                                    </span>
                                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(project.status)}`}>
                                        {getStatusLabel(project.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!data.recentProjects || data.recentProjects.length === 0) && (
                            <p className="text-center text-secondary-500 py-8">No recent projects</p>
                        )}
                    </div>
                </div>

                {/* Upcoming RC Meetings */}
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                        <CalendarRegular className="w-5 h-5" />
                        Upcoming RC Meetings
                    </h3>
                    <div className="space-y-3">
                        {(data.upcomingMeetings || []).map(meeting => (
                            <div key={meeting.id} className="flex items-center gap-4 p-3 rounded-xl bg-secondary-50 hover:bg-primary-50 transition-colors">
                                <div className="w-14 h-14 rounded-xl bg-gradient-premium flex flex-col items-center justify-center text-white">
                                    <span className="text-xs font-medium">
                                        {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
                                    </span>
                                    <span className="text-lg font-bold">
                                        {new Date(meeting.date).getDate()}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-secondary-900">{meeting.title}</p>
                                    <p className="text-sm text-secondary-500">
                                        Meeting #{meeting.meetingNumber}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {(!data.upcomingMeetings || data.upcomingMeetings.length === 0) && (
                            <p className="text-center text-secondary-500 py-8">No upcoming meetings</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Exchange Rate Banner */}
            <div className="premium-card p-4 bg-gradient-to-r from-primary-50 to-accent-50 border-primary-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ChartMultipleRegular className="w-6 h-6 text-primary-500" />
                        <span className="text-secondary-700">
                            <strong>Exchange Rate:</strong> 1 USD = ₹{data.financial.exchangeRate.toFixed(2)} INR
                        </span>
                    </div>
                    <span className="text-sm text-secondary-500">
                        Data as of {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                </div>
            </div>
        </div>
    );
}
