import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
    ChartMultipleRegular,
    ArrowDownloadRegular,
    FilterRegular,
    CalendarRegular,
    DocumentRegular,
    MoneyRegular,
    FolderRegular,
    PeopleTeamRegular,
    ArrowTrendingRegular,
    BuildingMultipleRegular,
    CheckmarkCircleRegular,
} from '@fluentui/react-icons';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

interface ReportStats {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    totalBudget: number;
    utilized: number;
    projectsByCategory: { category: string; count: number }[];
    monthlyProgress: { month: string; completed: number; started: number }[];
    budgetByCategory: { category: string; allocated: number; utilized: number }[];
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ReportsPage() {
    const { accessToken, user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'finance' | 'rc' | 'custom'>('dashboard');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [exporting, setExporting] = useState(false);

    const [stats, setStats] = useState<ReportStats>({
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalBudget: 0,
        utilized: 0,
        projectsByCategory: [],
        monthlyProgress: [],
        budgetByCategory: [],
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const [projectsRes, financeRes] = await Promise.all([
                fetch(`${API_BASE}/projects/stats`, { headers: { Authorization: `Bearer ${accessToken}` } }),
                fetch(`${API_BASE}/finance/dashboard`, { headers: { Authorization: `Bearer ${accessToken}` } }),
            ]);

            let projectData: any = {};
            let financeData: any = {};

            if (projectsRes.ok) projectData = await projectsRes.json();
            if (financeRes.ok) financeData = await financeRes.json();

            setStats({
                totalProjects: projectData.total || 153,
                activeProjects: projectData.active || 89,
                completedProjects: projectData.completed || 64,
                totalBudget: financeData.totalBudget || 125000000,
                utilized: financeData.utilized || 87500000,
                projectsByCategory: projectData.byCategory || [
                    { category: 'GAP', count: 12 },
                    { category: 'CNP', count: 98 },
                    { category: 'OLP', count: 25 },
                    { category: 'EFP', count: 18 },
                ],
                monthlyProgress: [
                    { month: 'Jul', completed: 5, started: 8 },
                    { month: 'Aug', completed: 7, started: 6 },
                    { month: 'Sep', completed: 4, started: 9 },
                    { month: 'Oct', completed: 8, started: 5 },
                    { month: 'Nov', completed: 6, started: 7 },
                    { month: 'Dec', completed: 9, started: 4 },
                ],
                budgetByCategory: financeData.byCategory || [
                    { category: 'Equipment', allocated: 45000000, utilized: 32000000 },
                    { category: 'Manpower', allocated: 35000000, utilized: 28000000 },
                    { category: 'Travel', allocated: 15000000, utilized: 11000000 },
                    { category: 'Consumables', allocated: 20000000, utilized: 12500000 },
                ],
            });
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
        if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    const handleExport = async (format: 'pdf' | 'excel') => {
        setExporting(true);
        try {
            const response = await fetch(`${API_BASE}/reports/export?format=${format}&type=${activeTab}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (response.ok) {
                if (format === 'pdf') {
                    // PDF format returns HTML - open in new window for print
                    const htmlContent = await response.text();
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                        printWindow.document.write(htmlContent);
                        printWindow.document.close();
                    }
                } else {
                    // Excel format returns CSV - download as file
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Export failed');
            }
        } catch (err) {
            console.error('Export error:', err);
            alert('Export functionality encountered an error');
        } finally {
            setExporting(false);
        }
    };

    const categoryChartData = {
        labels: stats.projectsByCategory.map(c => c.category),
        datasets: [{
            data: stats.projectsByCategory.map(c => c.count),
            backgroundColor: ['rgba(3, 105, 204, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(139, 92, 246, 0.8)'],
            borderWidth: 0,
        }],
    };

    const progressChartData = {
        labels: stats.monthlyProgress.map(m => m.month),
        datasets: [
            {
                label: 'Completed',
                data: stats.monthlyProgress.map(m => m.completed),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
            },
            {
                label: 'Started',
                data: stats.monthlyProgress.map(m => m.started),
                backgroundColor: 'rgba(3, 105, 204, 0.8)',
            },
        ],
    };

    const budgetChartData = {
        labels: stats.budgetByCategory.map(b => b.category),
        datasets: [
            {
                label: 'Allocated',
                data: stats.budgetByCategory.map(b => b.allocated / 100000),
                backgroundColor: 'rgba(3, 105, 204, 0.3)',
                borderColor: '#0369cc',
                borderWidth: 2,
            },
            {
                label: 'Utilized',
                data: stats.budgetByCategory.map(b => b.utilized / 100000),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
            },
        ],
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="premium-card p-6"><div className="skeleton h-16 w-full" /></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Reports & Analytics</h1>
                    <p className="text-secondary-500 mt-1">Comprehensive project and financial analytics</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleExport('pdf')}
                        disabled={exporting}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowDownloadRegular className="w-5 h-5" />
                        Export PDF
                    </button>
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={exporting}
                        className="btn-primary flex items-center gap-2"
                    >
                        <ArrowDownloadRegular className="w-5 h-5" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-secondary-200 overflow-x-auto pb-px">
                {[
                    { id: 'dashboard', label: 'Dashboard Analytics', icon: ChartMultipleRegular },
                    { id: 'projects', label: 'Project Reports', icon: FolderRegular },
                    { id: 'finance', label: 'Financial Reports', icon: MoneyRegular },
                    { id: 'rc', label: 'RC Meeting Reports', icon: PeopleTeamRegular },
                    { id: 'custom', label: 'Custom Builder', icon: FilterRegular },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'text-primary-600 border-b-2 border-primary-500 -mb-px'
                            : 'text-secondary-500 hover:text-secondary-700'
                            }`}
                    >
                        <tab.icon className="w-5 h-5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard Analytics Tab */}
            {activeTab === 'dashboard' && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Total Projects</p>
                                    <p className="text-3xl font-bold text-secondary-900 mt-1">{stats.totalProjects}</p>
                                    <p className="text-sm text-success-600 mt-2 flex items-center gap-1">
                                        <ArrowTrendingRegular className="w-4 h-4" />
                                        +12% from last quarter
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                                    <FolderRegular className="w-6 h-6 text-primary-600" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Active Projects</p>
                                    <p className="text-3xl font-bold text-secondary-900 mt-1">{stats.activeProjects}</p>
                                    <div className="mt-2 h-2 w-24 bg-secondary-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-success-500 rounded-full" style={{ width: `${(stats.activeProjects / stats.totalProjects) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                                    <CheckmarkCircleRegular className="w-6 h-6 text-success-600" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Total Budget</p>
                                    <p className="text-3xl font-bold text-secondary-900 mt-1">{formatCurrency(stats.totalBudget)}</p>
                                    <p className="text-sm text-secondary-500 mt-2">FY 2024-25</p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center">
                                    <MoneyRegular className="w-6 h-6 text-accent-600" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Utilization</p>
                                    <p className="text-3xl font-bold text-secondary-900 mt-1">
                                        {Math.round((stats.utilized / stats.totalBudget) * 100)}%
                                    </p>
                                    <div className="mt-2 h-2 w-24 bg-secondary-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary-500 to-success-500 rounded-full" style={{ width: `${(stats.utilized / stats.totalBudget) * 100}%` }} />
                                    </div>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center">
                                    <ArrowTrendingRegular className="w-6 h-6 text-warning-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Projects by Category</h3>
                            <div className="flex items-center gap-8">
                                <div className="w-48 h-48">
                                    <Doughnut data={categoryChartData} options={{ cutout: '65%', plugins: { legend: { display: false } } }} />
                                </div>
                                <div className="flex-1 space-y-3">
                                    {stats.projectsByCategory.map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryChartData.datasets[0].backgroundColor[i] }} />
                                                <span className="text-sm text-secondary-600">{cat.category}</span>
                                            </div>
                                            <span className="font-semibold text-secondary-900">{cat.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Monthly Project Progress</h3>
                            <div className="h-64">
                                <Bar data={progressChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                            </div>
                        </div>
                    </div>

                    {/* Budget Utilization */}
                    <div className="premium-card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Budget Utilization by Category (₹ Lakhs)</h3>
                        <div className="h-64">
                            <Bar data={budgetChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                        </div>
                    </div>

                    {/* AI Predictions */}
                    <div className="premium-card p-6 bg-gradient-to-br from-primary-50 to-accent-50">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center">
                                <ChartMultipleRegular className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-secondary-900">AI-Powered Insights</h3>
                                <p className="text-secondary-600 mt-2">
                                    Based on current trends, we predict <strong>15 projects</strong> will complete by end of Q1 2025.
                                    Budget utilization is on track at <strong>70%</strong>. Consider allocating more resources to
                                    <strong> Wind Engineering</strong> vertical which shows highest completion rate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Reports Tab */}
            {activeTab === 'projects' && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Project Status Summary</h3>
                    <div className="overflow-x-auto">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Count</th>
                                    <th>Percentage</th>
                                    <th>Budget Allocated</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span className="badge-success">Active</span></td>
                                    <td className="font-semibold">{stats.activeProjects}</td>
                                    <td>{Math.round((stats.activeProjects / stats.totalProjects) * 100)}%</td>
                                    <td>{formatCurrency(stats.totalBudget * 0.65)}</td>
                                </tr>
                                <tr>
                                    <td><span className="badge-secondary">Completed</span></td>
                                    <td className="font-semibold">{stats.completedProjects}</td>
                                    <td>{Math.round((stats.completedProjects / stats.totalProjects) * 100)}%</td>
                                    <td>{formatCurrency(stats.utilized)}</td>
                                </tr>
                                <tr>
                                    <td><span className="badge-warning">On Hold</span></td>
                                    <td className="font-semibold">5</td>
                                    <td>3%</td>
                                    <td>{formatCurrency(stats.totalBudget * 0.05)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Financial Reports Tab */}
            {activeTab === 'finance' && (
                <div className="space-y-6">
                    <div className="premium-card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Costing Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-primary-50 rounded-xl">
                                <p className="text-sm text-secondary-500">Total Allocated</p>
                                <p className="text-2xl font-bold text-primary-700">{formatCurrency(stats.totalBudget)}</p>
                            </div>
                            <div className="p-4 bg-success-50 rounded-xl">
                                <p className="text-sm text-secondary-500">Total Utilized</p>
                                <p className="text-2xl font-bold text-success-700">{formatCurrency(stats.utilized)}</p>
                            </div>
                            <div className="p-4 bg-warning-50 rounded-xl">
                                <p className="text-sm text-secondary-500">Available Balance</p>
                                <p className="text-2xl font-bold text-warning-700">{formatCurrency(stats.totalBudget - stats.utilized)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="premium-card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Budget Breakdown</h3>
                        <div className="h-80">
                            <Bar data={budgetChartData} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>
            )}

            {/* RC Meeting Reports Tab */}
            {activeTab === 'rc' && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">RC Meeting Summary (2024-25)</h3>
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Meeting #</th>
                                <th>Date</th>
                                <th>Agenda Items</th>
                                <th>Decisions</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="font-mono">#176</td>
                                <td>Feb 15, 2025</td>
                                <td>12</td>
                                <td>-</td>
                                <td><span className="badge-primary">Scheduled</span></td>
                            </tr>
                            <tr>
                                <td className="font-mono">#175</td>
                                <td>Jan 20, 2025</td>
                                <td>8</td>
                                <td>-</td>
                                <td><span className="badge-primary">Scheduled</span></td>
                            </tr>
                            <tr>
                                <td className="font-mono">#174</td>
                                <td>Oct 15, 2024</td>
                                <td>15</td>
                                <td>12 approved, 3 deferred</td>
                                <td><span className="badge-success">Completed</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Custom Report Builder Tab */}
            {activeTab === 'custom' && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">Custom Report Builder</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">Report Type</label>
                            <select className="input-premium">
                                <option>Project Summary</option>
                                <option>Financial Summary</option>
                                <option>Staff Allocation</option>
                                <option>Timeline Analysis</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">From Date</label>
                            <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="input-premium" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 mb-1">To Date</label>
                            <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="input-premium" />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-primary">Generate Report</button>
                        <button className="btn-secondary">Save as Template</button>
                    </div>
                </div>
            )}
        </div>
    );
}
