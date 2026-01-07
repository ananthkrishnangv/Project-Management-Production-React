import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
    MoneyRegular,
    ArrowTrendingRegular,
    ArrowDownloadRegular,
    AddRegular,
    CurrencyDollarEuroRegular,
    WalletRegular,
    ReceiptRegular,
    AlertRegular,
    ArrowSyncRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    ArrowSwapRegular,
    DocumentBulletListRegular,
    CalendarRegular,
    FilterRegular,
    SearchRegular,
    ArchiveRegular,
    InfoRegular,
} from '@fluentui/react-icons';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

interface Budget {
    id: string;
    projectId: string;
    project?: { code: string; title: string; category: string };
    fiscalYear: string;
    category: string;
    amountINR: number;
    utilized: number;
}

interface BudgetRequest {
    id: string;
    projectId: string;
    project: { code: string; title: string };
    requestedBy: { firstName: string; lastName: string; email: string };
    category: string;
    amount: number;
    justification: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIALLY_APPROVED';
    createdAt: string;
}

interface Project {
    id: string;
    code: string;
    title: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const budgetCategories = [
    'MANPOWER', 'EQUIPMENT', 'TRAVEL', 'CONSUMABLES', 'OVERHEAD', 'CONTINGENCY', 'OTHER'
];

const categoryLabels: Record<string, string> = {
    MANPOWER: 'Manpower',
    EQUIPMENT: 'Equipment',
    TRAVEL: 'Travel',
    CONSUMABLES: 'Consumables',
    OVERHEAD: 'Overhead',
    CONTINGENCY: 'Contingency',
    OTHER: 'Other'
};

export default function FinancePage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [exchangeRate, setExchangeRate] = useState(84.50);
    const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'requests' | 'transfers'>('overview');
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [pendingRequests, setPendingRequests] = useState<BudgetRequest[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Modal states
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);

    // Form data
    const [allocateData, setAllocateData] = useState({ projectId: '', category: 'EQUIPMENT', amount: '', fiscalYear: '' });
    const [transferData, setTransferData] = useState({
        fromProjectId: '', toProjectId: '', fromCategory: 'EQUIPMENT', toCategory: 'EQUIPMENT', amount: '', reason: ''
    });
    const [requestData, setRequestData] = useState({ projectId: '', category: 'EQUIPMENT', amount: '', justification: '' });
    const [archiveData, setArchiveData] = useState({ fiscalYear: '', carryForwardPercent: '100' });
    const [saving, setSaving] = useState(false);

    // Permission check
    const canManageBudget = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role || '');

    function getCurrentFiscalYear(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        if (month >= 4) {
            return `${year}-${(year + 1).toString().slice(2)}`;
        }
        return `${year - 1}-${year.toString().slice(2)}`;
    }

    useEffect(() => {
        fetchData();
    }, [fiscalYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch budget summary
            const summaryRes = await fetch(`${API_BASE}/budgets/summary/${fiscalYear}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (summaryRes.ok) {
                const data = await summaryRes.json();
                setBudgets(data.budgets || []);
            }

            // Fetch pending requests (for admins)
            if (canManageBudget) {
                const reqRes = await fetch(`${API_BASE}/budgets/requests/pending`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (reqRes.ok) {
                    const data = await reqRes.json();
                    setPendingRequests(data || []);
                }
            }

            // Fetch projects
            const projRes = await fetch(`${API_BASE}/projects?limit=500`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (projRes.ok) {
                const data = await projRes.json();
                setProjects(data.data || data.projects || []);
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAllocateBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/budgets/allocate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    projectId: allocateData.projectId,
                    category: allocateData.category,
                    amount: parseFloat(allocateData.amount),
                    fiscalYear: allocateData.fiscalYear || fiscalYear
                })
            });

            if (!response.ok) throw new Error('Failed to allocate budget');

            setShowAllocateModal(false);
            setAllocateData({ projectId: '', category: 'EQUIPMENT', amount: '', fiscalYear: '' });
            setSuccessMessage('Budget allocated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleTransferBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/budgets/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    fromProjectId: transferData.fromProjectId,
                    toProjectId: transferData.toProjectId,
                    fromCategory: transferData.fromCategory,
                    toCategory: transferData.toCategory,
                    amount: parseFloat(transferData.amount),
                    reason: transferData.reason
                })
            });

            if (!response.ok) throw new Error('Failed to transfer budget');

            setShowTransferModal(false);
            setTransferData({ fromProjectId: '', toProjectId: '', fromCategory: 'EQUIPMENT', toCategory: 'EQUIPMENT', amount: '', reason: '' });
            setSuccessMessage('Budget transferred successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRequestBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/budgets/requests/${requestData.projectId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    category: requestData.category,
                    amount: parseFloat(requestData.amount),
                    justification: requestData.justification
                })
            });

            if (!response.ok) throw new Error('Failed to submit budget request');

            setShowRequestModal(false);
            setRequestData({ projectId: '', category: 'EQUIPMENT', amount: '', justification: '' });
            setSuccessMessage('Budget request submitted successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleApproveRequest = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
        try {
            const response = await fetch(`${API_BASE}/budgets/requests/${requestId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({ action })
            });

            if (!response.ok) throw new Error('Failed to process request');

            setSuccessMessage(`Request ${action.toLowerCase()} successfully`);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchData();
        } catch (err) {
            console.error('Failed to approve request:', err);
        }
    };

    const handleArchiveBudgets = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/budgets/archive`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    fiscalYear: archiveData.fiscalYear || fiscalYear,
                    carryForwardPercent: parseInt(archiveData.carryForwardPercent)
                })
            });

            if (!response.ok) throw new Error('Failed to archive budgets');

            setShowArchiveModal(false);
            setArchiveData({ fiscalYear: '', carryForwardPercent: '100' });
            setSuccessMessage('Budgets archived successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount: number, showCrore = true) => {
        if (showCrore && amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(2)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(2)} L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    // Calculate totals
    const totalAllocated = budgets.reduce((sum, b) => sum + b.amountINR, 0);
    const totalUtilized = budgets.reduce((sum, b) => sum + (b.utilized || 0), 0);
    const utilizationPercent = totalAllocated > 0 ? Math.round((totalUtilized / totalAllocated) * 100) : 0;

    // Group by category
    const byCategory = budgetCategories.map(cat => {
        const catBudgets = budgets.filter(b => b.category === cat);
        return {
            category: cat,
            allocated: catBudgets.reduce((sum, b) => sum + b.amountINR, 0),
            utilized: catBudgets.reduce((sum, b) => sum + (b.utilized || 0), 0)
        };
    }).filter(c => c.allocated > 0);

    const categoryChartData = {
        labels: byCategory.map(b => categoryLabels[b.category] || b.category),
        datasets: [{
            data: byCategory.map(b => b.allocated),
            backgroundColor: [
                'rgba(3, 105, 204, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(100, 116, 139, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(34, 197, 94, 0.8)',
            ],
            borderWidth: 0,
        }],
    };

    const utilizationChartData = {
        labels: byCategory.map(b => categoryLabels[b.category] || b.category),
        datasets: [
            {
                label: 'Allocated (₹L)',
                data: byCategory.map(b => b.allocated / 100000),
                backgroundColor: 'rgba(3, 105, 204, 0.3)',
                borderColor: '#0369cc',
                borderWidth: 2,
            },
            {
                label: 'Utilized (₹L)',
                data: byCategory.map(b => b.utilized / 100000),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                borderWidth: 2,
            },
        ],
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="premium-card p-6">
                            <div className="skeleton h-4 w-24 mb-2" />
                            <div className="skeleton h-8 w-32" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Success Message */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 p-4 bg-success-50 border border-success-200 rounded-lg text-success-700 shadow-lg animate-fade-in flex items-center gap-2">
                    <CheckmarkCircleRegular className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Financial Dashboard</h1>
                    <p className="text-secondary-500 mt-1">Budget management, allocations, and transfers</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={fiscalYear}
                        onChange={e => setFiscalYear(e.target.value)}
                        className="input-premium"
                    >
                        <option value="2024-25">FY 2024-25</option>
                        <option value="2023-24">FY 2023-24</option>
                        <option value="2025-26">FY 2025-26</option>
                    </select>
                    {canManageBudget && (
                        <>
                            <button onClick={() => setShowAllocateModal(true)} className="btn-primary flex items-center gap-2">
                                <AddRegular className="w-5 h-5" />
                                Allocate Budget
                            </button>
                            <button onClick={() => setShowTransferModal(true)} className="btn-secondary flex items-center gap-2">
                                <ArrowSwapRegular className="w-5 h-5" />
                                Transfer
                            </button>
                        </>
                    )}
                    <button onClick={() => setShowRequestModal(true)} className="btn-ghost flex items-center gap-2">
                        <DocumentBulletListRegular className="w-5 h-5" />
                        Request Budget
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-secondary-200 pb-2">
                {['overview', 'budgets', 'requests', 'transfers'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-secondary-600 hover:bg-secondary-50'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        {tab === 'requests' && pendingRequests.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-danger-100 text-danger-700 rounded-full text-xs">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Total Allocated</p>
                                    <p className="text-2xl font-bold text-secondary-900 mt-1">{formatCurrency(totalAllocated)}</p>
                                    <p className="text-sm text-secondary-500 mt-1">FY {fiscalYear}</p>
                                </div>
                                <div className="p-3 bg-primary-100 rounded-xl">
                                    <WalletRegular className="w-6 h-6 text-primary-600" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Total Utilized</p>
                                    <p className="text-2xl font-bold text-success-600 mt-1">{formatCurrency(totalUtilized)}</p>
                                    <p className="text-sm text-secondary-500 mt-1">{utilizationPercent}% used</p>
                                </div>
                                <div className="p-3 bg-success-100 rounded-xl">
                                    <ReceiptRegular className="w-6 h-6 text-success-600" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Remaining</p>
                                    <p className="text-2xl font-bold text-warning-600 mt-1">{formatCurrency(totalAllocated - totalUtilized)}</p>
                                    <p className="text-sm text-secondary-500 mt-1">{100 - utilizationPercent}% available</p>
                                </div>
                                <div className="p-3 bg-warning-100 rounded-xl">
                                    <MoneyRegular className="w-6 h-6 text-warning-600" />
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-secondary-500">Pending Requests</p>
                                    <p className="text-2xl font-bold text-info-600 mt-1">{pendingRequests.length}</p>
                                    <p className="text-sm text-secondary-500 mt-1">awaiting approval</p>
                                </div>
                                <div className="p-3 bg-info-100 rounded-xl">
                                    <AlertRegular className="w-6 h-6 text-info-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Budget by Category</h3>
                            <div className="h-64">
                                <Doughnut
                                    data={categoryChartData}
                                    options={{
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'right' } }
                                    }}
                                />
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Allocation vs Utilization</h3>
                            <div className="h-64">
                                <Bar
                                    data={utilizationChartData}
                                    options={{
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top' } },
                                        scales: { y: { beginAtZero: true, title: { display: true, text: '₹ Lakhs' } } }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'budgets' && (
                <div className="premium-card overflow-hidden">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Category</th>
                                <th>Allocated</th>
                                <th>Utilized</th>
                                <th>Remaining</th>
                                <th>Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {budgets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-secondary-500">
                                        No budget entries for FY {fiscalYear}
                                    </td>
                                </tr>
                            ) : (
                                budgets.map(budget => {
                                    const remaining = budget.amountINR - (budget.utilized || 0);
                                    const utilPct = budget.amountINR > 0 ? Math.round(((budget.utilized || 0) / budget.amountINR) * 100) : 0;
                                    return (
                                        <tr key={budget.id}>
                                            <td>
                                                <div>
                                                    <p className="font-medium text-secondary-900">{budget.project?.code || 'N/A'}</p>
                                                    <p className="text-xs text-secondary-500 truncate max-w-48">{budget.project?.title}</p>
                                                </div>
                                            </td>
                                            <td><span className="badge-info">{categoryLabels[budget.category] || budget.category}</span></td>
                                            <td className="font-medium">{formatCurrency(budget.amountINR, false)}</td>
                                            <td className="text-success-600">{formatCurrency(budget.utilized || 0, false)}</td>
                                            <td className={remaining < 0 ? 'text-danger-600' : 'text-secondary-600'}>{formatCurrency(remaining, false)}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-20 h-2 bg-secondary-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${utilPct > 90 ? 'bg-danger-500' : utilPct > 70 ? 'bg-warning-500' : 'bg-success-500'}`}
                                                            style={{ width: `${Math.min(100, utilPct)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-secondary-600">{utilPct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="premium-card overflow-hidden">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Requested By</th>
                                <th>Category</th>
                                <th>Amount</th>
                                <th>Justification</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-secondary-500">
                                        No pending budget requests
                                    </td>
                                </tr>
                            ) : (
                                pendingRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <p className="font-medium text-secondary-900">{req.project.code}</p>
                                        </td>
                                        <td>{req.requestedBy.firstName} {req.requestedBy.lastName}</td>
                                        <td><span className="badge-info">{categoryLabels[req.category] || req.category}</span></td>
                                        <td className="font-medium">{formatCurrency(req.amount, false)}</td>
                                        <td className="max-w-48 truncate">{req.justification}</td>
                                        <td>{new Date(req.createdAt).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            {canManageBudget && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApproveRequest(req.id, 'APPROVED')}
                                                        className="p-2 hover:bg-success-100 rounded-lg text-success-600"
                                                    >
                                                        <CheckmarkCircleRegular className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveRequest(req.id, 'REJECTED')}
                                                        className="p-2 hover:bg-danger-100 rounded-lg text-danger-600"
                                                    >
                                                        <DismissCircleRegular className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'transfers' && canManageBudget && (
                <div className="premium-card p-8 text-center">
                    <ArchiveRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">Budget Transfers & Archives</h3>
                    <p className="text-secondary-500 mb-6">Manage budget transfers and year-end archival</p>
                    <div className="flex justify-center gap-4">
                        <button onClick={() => setShowTransferModal(true)} className="btn-primary">
                            <ArrowSwapRegular className="w-5 h-5 mr-2" />
                            New Transfer
                        </button>
                        <button onClick={() => setShowArchiveModal(true)} className="btn-secondary">
                            <ArchiveRegular className="w-5 h-5 mr-2" />
                            Archive Year-End
                        </button>
                    </div>
                </div>
            )}

            {/* Allocate Budget Modal */}
            {showAllocateModal && (
                <div className="modal-backdrop" onClick={() => setShowAllocateModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900">Allocate Budget</h2>
                        </div>
                        <form onSubmit={handleAllocateBudget} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">{error}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Project *</label>
                                <select
                                    value={allocateData.projectId}
                                    onChange={e => setAllocateData({ ...allocateData, projectId: e.target.value })}
                                    className="input-premium"
                                    required
                                >
                                    <option value="">Select project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Category *</label>
                                <select
                                    value={allocateData.category}
                                    onChange={e => setAllocateData({ ...allocateData, category: e.target.value })}
                                    className="input-premium"
                                    required
                                >
                                    {budgetCategories.map(cat => (
                                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Amount (₹) *</label>
                                <input
                                    type="number"
                                    value={allocateData.amount}
                                    onChange={e => setAllocateData({ ...allocateData, amount: e.target.value })}
                                    className="input-premium"
                                    placeholder="e.g., 500000"
                                    required
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Fiscal Year</label>
                                <input
                                    type="text"
                                    value={allocateData.fiscalYear || fiscalYear}
                                    onChange={e => setAllocateData({ ...allocateData, fiscalYear: e.target.value })}
                                    className="input-premium"
                                    placeholder="e.g., 2024-25"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowAllocateModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Allocating...' : 'Allocate'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transfer Budget Modal */}
            {showTransferModal && (
                <div className="modal-backdrop" onClick={() => setShowTransferModal(false)}>
                    <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900">Transfer Budget</h2>
                        </div>
                        <form onSubmit={handleTransferBudget} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">{error}</div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">From Project *</label>
                                    <select
                                        value={transferData.fromProjectId}
                                        onChange={e => setTransferData({ ...transferData, fromProjectId: e.target.value })}
                                        className="input-premium"
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.code}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">To Project *</label>
                                    <select
                                        value={transferData.toProjectId}
                                        onChange={e => setTransferData({ ...transferData, toProjectId: e.target.value })}
                                        className="input-premium"
                                        required
                                    >
                                        <option value="">Select...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.code}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">From Category</label>
                                    <select
                                        value={transferData.fromCategory}
                                        onChange={e => setTransferData({ ...transferData, fromCategory: e.target.value })}
                                        className="input-premium"
                                    >
                                        {budgetCategories.map(cat => (
                                            <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">To Category</label>
                                    <select
                                        value={transferData.toCategory}
                                        onChange={e => setTransferData({ ...transferData, toCategory: e.target.value })}
                                        className="input-premium"
                                    >
                                        {budgetCategories.map(cat => (
                                            <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Amount (₹) *</label>
                                <input
                                    type="number"
                                    value={transferData.amount}
                                    onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                                    className="input-premium"
                                    required
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Reason *</label>
                                <textarea
                                    value={transferData.reason}
                                    onChange={e => setTransferData({ ...transferData, reason: e.target.value })}
                                    className="input-premium"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowTransferModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Transferring...' : 'Transfer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Request Budget Modal */}
            {showRequestModal && (
                <div className="modal-backdrop" onClick={() => setShowRequestModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900">Request Budget</h2>
                        </div>
                        <form onSubmit={handleRequestBudget} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">{error}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Project *</label>
                                <select
                                    value={requestData.projectId}
                                    onChange={e => setRequestData({ ...requestData, projectId: e.target.value })}
                                    className="input-premium"
                                    required
                                >
                                    <option value="">Select project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Category *</label>
                                <select
                                    value={requestData.category}
                                    onChange={e => setRequestData({ ...requestData, category: e.target.value })}
                                    className="input-premium"
                                    required
                                >
                                    {budgetCategories.map(cat => (
                                        <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Amount (₹) *</label>
                                <input
                                    type="number"
                                    value={requestData.amount}
                                    onChange={e => setRequestData({ ...requestData, amount: e.target.value })}
                                    className="input-premium"
                                    required
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Justification *</label>
                                <textarea
                                    value={requestData.justification}
                                    onChange={e => setRequestData({ ...requestData, justification: e.target.value })}
                                    className="input-premium"
                                    rows={4}
                                    required
                                    minLength={10}
                                    placeholder="Explain why this budget is needed..."
                                />
                            </div>
                            <div className="bg-info-50 p-3 rounded-lg text-sm text-info-700">
                                <InfoRegular className="w-4 h-4 inline mr-2" />
                                Request will be sent to Head, BKMD for approval
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowRequestModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Submitting...' : 'Submit Request'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Archive Modal */}
            {showArchiveModal && (
                <div className="modal-backdrop" onClick={() => setShowArchiveModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900">Archive Year-End Budgets</h2>
                        </div>
                        <form onSubmit={handleArchiveBudgets} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">{error}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Fiscal Year to Archive</label>
                                <input
                                    type="text"
                                    value={archiveData.fiscalYear || fiscalYear}
                                    onChange={e => setArchiveData({ ...archiveData, fiscalYear: e.target.value })}
                                    className="input-premium"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Carry Forward Percentage</label>
                                <input
                                    type="number"
                                    value={archiveData.carryForwardPercent}
                                    onChange={e => setArchiveData({ ...archiveData, carryForwardPercent: e.target.value })}
                                    className="input-premium"
                                    min="0"
                                    max="100"
                                />
                                <p className="text-xs text-secondary-500 mt-1">Remaining budget to carry forward to next year</p>
                            </div>
                            <div className="bg-warning-50 p-3 rounded-lg text-sm text-warning-700">
                                <AlertRegular className="w-4 h-4 inline mr-2" />
                                This action will archive all budget entries for the fiscal year
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowArchiveModal(false)} className="btn-secondary">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Archiving...' : 'Archive'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
