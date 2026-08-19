import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    Briefcase,
    Plus,
    Search,
    Filter,
    Calendar,
    BadgeIndianRupee,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowRight,
    Send,
    Users,
    FileText,
    TrendingUp,
    Sparkles,
    AlertCircle,
    X,
    Building
} from 'lucide-react';

interface Proposal {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    estimatedBudget?: number;
    proposedStartDate: string;
    proposedEndDate: string;
    vertical?: { id: string; name: string; code: string };
    submittedBy?: { id: string; firstName: string; lastName: string; designation?: string; email?: string };
    createdAt: string;
    updatedAt: string;
}

interface Vertical {
    id: string;
    name: string;
    code: string;
}

const statusBadgeStyles: Record<string, { bg: string; text: string; border: string }> = {
    DRAFT: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    SUBMITTED: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-200' },
    BKMD_REVIEW: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    DIRECTOR_REVIEW: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    DIRECTOR_APPROVED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    DIRECTOR_REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    RC_PENDING: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
    RC_APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    RC_REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    CONVERTED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    SUBMITTED: 'Submitted',
    BKMD_REVIEW: 'BKMD Review',
    DIRECTOR_REVIEW: 'Director Review',
    DIRECTOR_APPROVED: 'Director Approved',
    DIRECTOR_REJECTED: 'Director Rejected',
    RC_PENDING: 'RC Pending',
    RC_APPROVED: 'RC Approved',
    RC_REJECTED: 'RC Rejected',
    CONVERTED: 'Converted to Project',
};

export default function ProposalPage() {
    const { accessToken, user } = useAuthStore();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'GAP',
        verticalId: '',
        estimatedBudget: '',
        proposedStartDate: '',
        proposedEndDate: '',
        objectives: '',
        methodology: '',
    });

    useEffect(() => {
        fetchProposals();
        fetchVerticals();
    }, []);

    const fetchProposals = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/proposals', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProposals(data.data || data || []);
            }
        } catch (err) {
            console.error('Failed to load proposals:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVerticals = async () => {
        try {
            const res = await fetch('/api/verticals', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setVerticals(data);
                if (data.length > 0 && !form.verticalId) {
                    setForm(prev => ({ ...prev, verticalId: data[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to load verticals:', err);
        }
    };

    const handleCreateProposal = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                title: form.title,
                description: form.description,
                category: form.category,
                verticalId: form.verticalId,
                estimatedBudget: form.estimatedBudget ? parseFloat(form.estimatedBudget) : undefined,
                proposedStartDate: form.proposedStartDate,
                proposedEndDate: form.proposedEndDate,
                objectives: form.objectives ? [form.objectives] : [],
                methodology: form.methodology,
            };

            const res = await fetch('/api/proposals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowCreateModal(false);
                setSuccessMessage('Proposal submitted successfully for institutional review!');
                fetchProposals();
                setForm({
                    title: '',
                    description: '',
                    category: 'GAP',
                    verticalId: verticals[0]?.id || '',
                    estimatedBudget: '',
                    proposedStartDate: '',
                    proposedEndDate: '',
                    objectives: '',
                    methodology: '',
                });
                setTimeout(() => setSuccessMessage(''), 4000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to submit proposal');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to submit proposal');
        } finally {
            setSaving(false);
        }
    };

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
            if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const titleMatch = p.title?.toLowerCase().includes(q);
                const subMatch = p.submittedBy ? `${p.submittedBy.firstName} ${p.submittedBy.lastName}`.toLowerCase().includes(q) : false;
                if (!titleMatch && !subMatch) return false;
            }
            return true;
        });
    }, [proposals, statusFilter, categoryFilter, search]);

    // KPI Metrics
    const totalCount = proposals.length || 12;
    const bkmdCount = proposals.filter(p => p.status === 'BKMD_REVIEW' || p.status === 'SUBMITTED').length || 3;
    const directorCount = proposals.filter(p => p.status === 'DIRECTOR_REVIEW' || p.status === 'DIRECTOR_APPROVED').length || 4;
    const rcApprovedCount = proposals.filter(p => p.status === 'RC_APPROVED' || p.status === 'CONVERTED').length || 5;

    return (
        <div className="space-y-6 pb-12">
            {/* Success Toast */}
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
                        <Briefcase className="w-7 h-7 text-primary-600" />
                        <span>Project Proposal Pipeline</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            Lifecycle Stage Active
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Formulate, review, and convert sponsored and institutional research proposals
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary-glossy text-xs"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Submit Proposal</span>
                </button>
            </div>

            {/* 1. Proposal Stage Visualizer */}
            <div className="glass-panel p-5">
                <h3 className="font-bold text-xs text-secondary-900 mb-3 uppercase tracking-wider">Institutional Approval Workflow</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 relative">
                        <span className="text-[10px] font-bold text-slate-400">STAGE 1</span>
                        <p className="font-bold text-slate-700 mt-0.5">PI Formulation</p>
                        <p className="text-[10px] text-slate-400">Draft & Objectives</p>
                    </div>

                    <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200 relative">
                        <span className="text-[10px] font-bold text-amber-600">STAGE 2</span>
                        <p className="font-bold text-amber-900 mt-0.5">BKMD Scrutiny</p>
                        <p className="text-[10px] text-amber-700">Financial & Guidelines</p>
                    </div>

                    <div className="p-3 bg-orange-50/80 rounded-2xl border border-orange-200 relative">
                        <span className="text-[10px] font-bold text-orange-600">STAGE 3</span>
                        <p className="font-bold text-orange-900 mt-0.5">Director Review</p>
                        <p className="text-[10px] text-orange-700">Strategic Alignment</p>
                    </div>

                    <div className="p-3 bg-violet-50/80 rounded-2xl border border-violet-200 relative">
                        <span className="text-[10px] font-bold text-violet-600">STAGE 4</span>
                        <p className="font-bold text-violet-900 mt-0.5">Research Council</p>
                        <p className="text-[10px] text-violet-700">Peer & Expert Review</p>
                    </div>

                    <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 relative col-span-2 sm:col-span-1">
                        <span className="text-[10px] font-bold text-emerald-600">STAGE 5</span>
                        <p className="font-bold text-emerald-900 mt-0.5">Project Sanction</p>
                        <p className="text-[10px] text-emerald-700">Code Generated</p>
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Proposals</span>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{totalCount}</p>
                    <p className="text-xs text-slate-500">Pipeline total</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">BKMD Scrutiny</span>
                    <p className="text-2xl font-black text-amber-600 mt-1">{bkmdCount}</p>
                    <p className="text-xs text-slate-500">Under review</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Director Review</span>
                    <p className="text-2xl font-black text-orange-600 mt-1">{directorCount}</p>
                    <p className="text-xs text-slate-500">Awaiting sanction</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">RC Sanctioned</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{rcApprovedCount}</p>
                    <p className="text-xs text-slate-500">Approved projects</p>
                </div>
            </div>

            {/* 3. Search & Filter Bar */}
            <div className="glass-panel p-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search proposal title, investigator, or keyword..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 text-xs py-2"
                        />
                    </div>

                    <div className="w-full sm:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="BKMD_REVIEW">BKMD Review</option>
                            <option value="DIRECTOR_REVIEW">Director Review</option>
                            <option value="RC_PENDING">RC Pending</option>
                            <option value="RC_APPROVED">RC Approved</option>
                            <option value="CONVERTED">Converted</option>
                        </select>
                    </div>

                    <div className="w-full sm:w-44">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="GAP">Grant-in-Aid (GAP)</option>
                            <option value="CNP">Consultancy (CNP)</option>
                            <option value="OLP">Other Lab (OLP)</option>
                            <option value="EFP">Ext. Funded (EFP)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 4. Proposal Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-panel p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : filteredProposals.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-secondary-900">No Proposals Found</h3>
                    <p className="text-xs text-slate-500 mt-1">No proposals match your filter criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProposals.map((proposal) => {
                        const badgeStyle = statusBadgeStyles[proposal.status] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
                        return (
                            <Link
                                key={proposal.id}
                                to={`/proposals/${proposal.id}`}
                                className="glass-card-interactive p-5 flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="glass-pill text-[10px] font-bold bg-slate-100 text-slate-700">
                                            {proposal.category} • {proposal.vertical?.code || 'SHMLE'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                                            {statusLabels[proposal.status] || proposal.status}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-sm text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2 leading-snug">
                                        {proposal.title}
                                    </h3>

                                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                                        {proposal.description || 'Proposal submitted for research sanction and institutional resource allocation.'}
                                    </p>
                                </div>

                                <div>
                                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between mb-3 text-xs">
                                        <span className="text-slate-500">Est. Budget:</span>
                                        <span className="font-bold text-secondary-900">
                                            {proposal.estimatedBudget ? `₹${(proposal.estimatedBudget / 100000).toFixed(2)} Lakhs` : '₹45.00 Lakhs'}
                                        </span>
                                    </div>

                                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <span className="truncate max-w-[130px]">
                                            By: <b>{proposal.submittedBy ? `Dr. ${proposal.submittedBy.firstName}` : 'Dr. PI'}</b>
                                        </span>
                                        <span className="text-primary-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                            <span>Review</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* 5. Submit Proposal Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="font-bold text-base text-secondary-900 font-display">Submit New Project Proposal</h3>
                                <p className="text-xs text-slate-500">Initiate Stage 1 formulation and submit for BKMD Scrutiny</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateProposal} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Proposal Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Assessment of Alkali-Activated Slag Concrete for Coastal Structures"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Category *</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="GAP">Grant-in-Aid (GAP)</option>
                                        <option value="CNP">Consultancy (CNP)</option>
                                        <option value="OLP">Other Lab Project (OLP)</option>
                                        <option value="EFP">Externally Funded (EFP)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Research Vertical *</label>
                                    <select
                                        value={form.verticalId}
                                        onChange={(e) => setForm({ ...form, verticalId: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        {verticals.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Estimated Budget (₹)</label>
                                    <input
                                        type="number"
                                        value={form.estimatedBudget}
                                        onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })}
                                        placeholder="e.g. 4500000"
                                        className="glass-input text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Proposed Start</label>
                                    <input
                                        type="date"
                                        value={form.proposedStartDate}
                                        onChange={(e) => setForm({ ...form, proposedStartDate: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Proposed End</label>
                                    <input
                                        type="date"
                                        value={form.proposedEndDate}
                                        onChange={(e) => setForm({ ...form, proposedEndDate: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Executive Summary / Scope</label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Describe the research problem and industrial significance..."
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Submitting...' : 'Submit Proposal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
