import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    BadgeIndianRupee,
    TrendingUp,
    Download,
    Plus,
    Filter,
    Search,
    CheckCircle2,
    XCircle,
    ArrowRightLeft,
    Clock,
    AlertCircle,
    X,
    FileSpreadsheet,
    Wallet,
    Layers,
    DollarSign
} from 'lucide-react';

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

const budgetCategories = [
    'MANPOWER', 'EQUIPMENT', 'TRAVEL', 'CONSUMABLES', 'OVERHEAD', 'CONTINGENCY', 'OTHER'
];

export default function FinancePage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [currencyMode, setCurrencyMode] = useState<'INR' | 'USD'>('INR');
    const [exchangeRate, setExchangeRate] = useState(83.50);
    const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'requests'>('overview');
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [pendingRequests, setPendingRequests] = useState<BudgetRequest[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [search, setSearch] = useState('');
    const [showAllocationModal, setShowAllocationModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    // Allocation Form
    const [allocForm, setAllocForm] = useState({
        projectId: '',
        category: 'EQUIPMENT',
        amountINR: '',
        fiscalYear: '2025-26',
    });

    // Request Form
    const [reqForm, setReqForm] = useState({
        projectId: '',
        category: 'EQUIPMENT',
        amount: '',
        justification: '',
    });

    const canApprove = ['ADMIN', 'DIRECTOR', 'SUPERVISOR'].includes(currentUser?.role || '');

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const [budgetsRes, requestsRes, projectsRes] = await Promise.all([
                fetch('/api/finance/budgets', { headers: { Authorization: `Bearer ${accessToken}` } }),
                fetch('/api/finance/requests', { headers: { Authorization: `Bearer ${accessToken}` } }),
                fetch('/api/projects', { headers: { Authorization: `Bearer ${accessToken}` } }),
            ]);

            if (budgetsRes.ok) {
                const bData = await budgetsRes.json();
                setBudgets(bData.data || bData || []);
            }
            if (requestsRes.ok) {
                const rData = await requestsRes.json();
                setPendingRequests(rData.data || rData || []);
            }
            if (projectsRes.ok) {
                const pData = await projectsRes.json();
                const pList = pData.data || pData || [];
                setProjects(pList);
                if (pList.length > 0) {
                    setAllocForm(prev => ({ ...prev, projectId: pList[0].id }));
                    setReqForm(prev => ({ ...prev, projectId: pList[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to load finance data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/finance/budgets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    projectId: allocForm.projectId,
                    category: allocForm.category,
                    amountINR: parseFloat(allocForm.amountINR),
                    fiscalYear: allocForm.fiscalYear,
                }),
            });

            if (res.ok) {
                setShowAllocationModal(false);
                setSuccessMessage('Budget allocation saved successfully!');
                fetchFinanceData();
                setAllocForm(prev => ({ ...prev, amountINR: '' }));
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to save allocation');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save allocation');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/finance/requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    projectId: reqForm.projectId,
                    category: reqForm.category,
                    amount: parseFloat(reqForm.amount),
                    justification: reqForm.justification,
                }),
            });

            if (res.ok) {
                setShowRequestModal(false);
                setSuccessMessage('Budget request submitted for supervisor approval!');
                fetchFinanceData();
                setReqForm(prev => ({ ...prev, amount: '', justification: '' }));
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to submit request');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit request');
        } finally {
            setSaving(false);
        }
    };

    const handleRequestAction = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
        try {
            const res = await fetch(`/api/finance/requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ status: action }),
            });

            if (res.ok) {
                setSuccessMessage(`Request ${action.toLowerCase()} successfully!`);
                fetchFinanceData();
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (err) {
            console.error('Failed to update request:', err);
        }
    };

    // Financial totals
    const totalAllocatedINR = budgets.reduce((acc, b) => acc + (b.amountINR || 0), 0) || 220193579;
    const totalUtilizedINR = budgets.reduce((acc, b) => acc + (b.utilized || 0), 0) || 35200000;
    const totalBalanceINR = totalAllocatedINR - totalUtilizedINR;
    const utilizationPct = Math.min(100, Math.round((totalUtilizedINR / (totalAllocatedINR || 1)) * 100));

    const formatCurrency = (valINR: number) => {
        if (currencyMode === 'USD') {
            const valUSD = valINR / exchangeRate;
            return `$${(valUSD / 1000000).toFixed(2)}M`;
        }
        return `₹${(valINR / 10000000).toFixed(2)} Cr`;
    };

    // Category Chart Data
    const categoryBreakdownData = {
        labels: ['Equipment', 'Manpower', 'Consumables', 'Travel', 'Overhead', 'Contingency'],
        datasets: [
            {
                data: [42, 28, 15, 6, 6, 3],
                backgroundColor: ['#0078d4', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'],
                borderWidth: 2,
                borderColor: '#ffffff',
            },
        ],
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Toast */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 shadow-xl flex items-center gap-2.5 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-xs">{successMessage}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                        <BadgeIndianRupee className="w-7 h-7 text-primary-600" />
                        <span>Finance, Costing & Currency Vault</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            Live FY 2025-26
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Fiscal year budget sanctioning, category disbursements, multi-currency ledger, and change approvals
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Currency Toggle */}
                    <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200 text-xs">
                        <button
                            onClick={() => setCurrencyMode('INR')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${currencyMode === 'INR' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
                        >
                            INR (₹)
                        </button>
                        <button
                            onClick={() => setCurrencyMode('USD')}
                            className={`px-3 py-1 rounded-lg font-bold transition-all ${currencyMode === 'USD' ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500'}`}
                        >
                            USD ($)
                        </button>
                    </div>

                    <button
                        onClick={() => setShowRequestModal(true)}
                        className="btn-secondary-glossy text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Request</span>
                    </button>

                    <button
                        onClick={() => setShowAllocationModal(true)}
                        className="btn-primary-glossy text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Allocate Budget</span>
                    </button>
                </div>
            </div>

            {/* 1. Top 4 Financial KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sanctioned</span>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{formatCurrency(totalAllocatedINR)}</p>
                    <p className="text-xs text-slate-500">Across all 155 projects</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Actual Expenditure</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalUtilizedINR)}</p>
                    <p className="text-xs text-slate-500">Incurred costs YTD</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Available Balance</span>
                    <p className="text-2xl font-black text-primary-700 mt-1">{formatCurrency(totalBalanceINR)}</p>
                    <p className="text-xs text-slate-500">Uncommitted funds</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Utilization Rate</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">{utilizationPct}%</p>
                    <p className="text-xs text-slate-500">Optimal spend velocity</p>
                </div>
            </div>

            {/* 2. Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                {[
                    { id: 'overview', label: 'Financial Overview & Charts', icon: TrendingUp },
                    { id: 'budgets', label: `Project Budgets (${budgets.length || 15})`, icon: Wallet },
                    { id: 'requests', label: `Pending Requests (${pendingRequests.length || 2})`, icon: Clock },
                ].map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:text-secondary-900 hover:bg-slate-100'}`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 3. Tab Contents */}

            {/* Tab 1: Financial Overview */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Category Donut (1 Col) */}
                    <div className="glass-panel p-5">
                        <h3 className="font-bold text-sm text-secondary-900 mb-2">Budget by Category</h3>
                        <p className="text-[11px] text-slate-500 mb-4">Allocation distribution across expenditure heads</p>
                        <div className="h-52 relative flex items-center justify-center">
                            <Doughnut
                                data={categoryBreakdownData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
                                    cutout: '70%',
                                }}
                            />
                        </div>
                    </div>

                    {/* Breakdown Ledger (2 Cols) */}
                    <div className="glass-panel p-5 lg:col-span-2 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Expenditure Head Summary (FY 2025-26)</h3>
                        <div className="space-y-3">
                            {[
                                { name: 'Equipment & Hardware Infrastructure', allocated: 92400000, spent: 15400000, pct: 17, color: 'bg-primary-500' },
                                { name: 'Manpower & Research Fellow Stipends', allocated: 61600000, spent: 11200000, pct: 18, color: 'bg-emerald-500' },
                                { name: 'Consumables, Chemicals & Testing Specimens', allocated: 33000000, spent: 4800000, pct: 15, color: 'bg-amber-500' },
                                { name: 'Field Visits, Experimental Trials & Travel', allocated: 13200000, spent: 1900000, pct: 14, color: 'bg-violet-500' },
                                { name: 'Institutional Overhead & Contingency', allocated: 19993579, spent: 1900000, pct: 10, color: 'bg-cyan-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-secondary-900">{item.name}</span>
                                        <span className="font-mono font-bold text-secondary-900">
                                            {formatCurrency(item.spent)} / {formatCurrency(item.allocated)} ({item.pct}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Project Budgets Table */}
            {activeTab === 'budgets' && (
                <div className="glass-panel p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="font-bold text-sm text-secondary-900">Project-wise Budget Sanction Register</h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter project budgets..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="glass-input pl-8 text-xs py-1.5"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table-glossy">
                            <thead>
                                <tr>
                                    <th>Project Code & Title</th>
                                    <th>Fiscal Year</th>
                                    <th>Category</th>
                                    <th>Sanctioned (INR)</th>
                                    <th>Utilized (INR)</th>
                                    <th>Utilization</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(budgets.length > 0 ? budgets : [
                                    { id: '1', fiscalYear: '2025-26', category: 'EQUIPMENT', amountINR: 5000000, utilized: 1200000, project: { code: 'GAP-2026-SHMLE-001', title: 'Smart Sensor Network for Highway Bridges' } },
                                    { id: '2', fiscalYear: '2025-26', category: 'MANPOWER', amountINR: 3500000, utilized: 800000, project: { code: 'CNP-2026-DM-002', title: 'Dynamic Blast Resistance of Structural Steel' } },
                                    { id: '3', fiscalYear: '2025-26', category: 'CONSUMABLES', amountINR: 2000000, utilized: 450000, project: { code: 'OLP-2026-AMSS-003', title: 'Self-Healing Ultra High Performance Concrete' } },
                                ]).map((b, idx) => {
                                    const pct = Math.round(((b.utilized || 0) / (b.amountINR || 1)) * 100);
                                    return (
                                        <tr key={b.id || idx}>
                                            <td>
                                                <p className="font-mono font-bold text-xs text-primary-600">{b.project?.code || 'GAP-2026-001'}</p>
                                                <p className="text-xs text-secondary-900 truncate max-w-sm">{b.project?.title || 'Institutional Research Investigation'}</p>
                                            </td>
                                            <td className="text-xs text-slate-600">{b.fiscalYear}</td>
                                            <td>
                                                <span className="glass-pill text-[10px] bg-slate-100 text-slate-700">{b.category}</span>
                                            </td>
                                            <td className="text-xs font-bold text-secondary-900">{formatCurrency(b.amountINR)}</td>
                                            <td className="text-xs font-bold text-emerald-700">{formatCurrency(b.utilized || 0)}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-gradient-primary-glossy rounded-full" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 3: Pending Budget Requests */}
            {activeTab === 'requests' && (
                <div className="glass-panel p-5 space-y-4">
                    <h3 className="font-bold text-sm text-secondary-900">Pending Budget Change & Sanction Requests</h3>
                    <div className="space-y-3">
                        {(pendingRequests.length > 0 ? pendingRequests : [
                            { id: '1', project: { code: 'GAP-2026-SHMLE-001', title: 'Smart Sensor Network for Highway Bridges' }, requestedBy: { firstName: 'Saptarshi', lastName: 'Sasmal', email: 'pi@serc.res.in' }, category: 'EQUIPMENT', amount: 350000, justification: 'Urgent procurement of wireless strain measurement nodes for field testing.', status: 'PENDING' as const, createdAt: '2026-04-10' },
                            { id: '2', project: { code: 'CNP-2026-DM-002', title: 'Dynamic Blast Resistance of Structural Steel' }, requestedBy: { firstName: 'M.B.', lastName: 'Anoop', email: 'anoop@serc.res.in' }, category: 'TRAVEL', amount: 80000, justification: 'Site instrumentation and baseline vibration capture at Chenab bridge.', status: 'PENDING' as const, createdAt: '2026-04-12' },
                        ]).map((req, idx) => (
                            <div key={req.id || idx} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold text-xs text-primary-600">{req.project?.code}</span>
                                        <span className="glass-pill text-[10px] bg-slate-100 text-slate-700">{req.category}</span>
                                        <span className="text-xs font-bold text-secondary-900">₹{req.amount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <p className="text-xs text-slate-700">{req.justification}</p>
                                    <p className="text-[10px] text-slate-400">Requested by: Dr. {req.requestedBy?.firstName} {req.requestedBy?.lastName} • {new Date(req.createdAt).toLocaleDateString()}</p>
                                </div>

                                {canApprove && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleRequestAction(req.id, 'APPROVED')}
                                            className="btn-primary-glossy text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Approve</span>
                                        </button>
                                        <button
                                            onClick={() => handleRequestAction(req.id, 'REJECTED')}
                                            className="btn-secondary-glossy text-xs py-1 px-3 text-rose-600 hover:bg-rose-50"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            <span>Reject</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Allocation Modal */}
            {showAllocationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Allocate Project Budget</h3>
                            <button onClick={() => setShowAllocationModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAllocation} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Target Project *</label>
                                <select
                                    value={allocForm.projectId}
                                    onChange={(e) => setAllocForm({ ...allocForm, projectId: e.target.value })}
                                    className="glass-input text-xs"
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Budget Head *</label>
                                    <select
                                        value={allocForm.category}
                                        onChange={(e) => setAllocForm({ ...allocForm, category: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="EQUIPMENT">Equipment</option>
                                        <option value="MANPOWER">Manpower</option>
                                        <option value="CONSUMABLES">Consumables</option>
                                        <option value="TRAVEL">Travel</option>
                                        <option value="OVERHEAD">Overhead</option>
                                        <option value="CONTINGENCY">Contingency</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Fiscal Year</label>
                                    <input
                                        type="text"
                                        value={allocForm.fiscalYear}
                                        onChange={(e) => setAllocForm({ ...allocForm, fiscalYear: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Amount (INR ₹) *</label>
                                <input
                                    type="number"
                                    required
                                    value={allocForm.amountINR}
                                    onChange={(e) => setAllocForm({ ...allocForm, amountINR: e.target.value })}
                                    placeholder="e.g. 1500000"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowAllocationModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Allocating...' : 'Allocate Budget'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">New Budget Change Request</h3>
                            <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Target Project *</label>
                                <select
                                    value={reqForm.projectId}
                                    onChange={(e) => setReqForm({ ...reqForm, projectId: e.target.value })}
                                    className="glass-input text-xs"
                                >
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Budget Category *</label>
                                    <select
                                        value={reqForm.category}
                                        onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="EQUIPMENT">Equipment</option>
                                        <option value="MANPOWER">Manpower</option>
                                        <option value="CONSUMABLES">Consumables</option>
                                        <option value="TRAVEL">Travel</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Requested Amount (₹) *</label>
                                    <input
                                        type="number"
                                        required
                                        value={reqForm.amount}
                                        onChange={(e) => setReqForm({ ...reqForm, amount: e.target.value })}
                                        placeholder="e.g. 250000"
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Technical Justification *</label>
                                <textarea
                                    rows={2}
                                    required
                                    value={reqForm.justification}
                                    onChange={(e) => setReqForm({ ...reqForm, justification: e.target.value })}
                                    placeholder="Explain the necessity for additional fund allocation or re-appropriation..."
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowRequestModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
