import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    Briefcase,
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Send,
    Users,
    Calendar,
    BadgeIndianRupee,
    FileText,
    MessageSquare,
    Sparkles,
    AlertCircle,
    ArrowRight,
    CheckSquare
} from 'lucide-react';

interface Proposal {
    id: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    objectives?: string;
    methodology?: string;
    expectedOutcome?: string;
    estimatedBudget?: number;
    proposedStartDate: string;
    proposedEndDate: string;
    vertical?: { name: string; code: string };
    submittedBy?: { firstName: string; lastName: string; email?: string; designation?: string; department?: string };
    bkmdReviewer?: { firstName: string; lastName: string };
    bkmdReviewedAt?: string;
    bkmdComments?: string;
    directorReviewer?: { firstName: string; lastName: string };
    directorReviewedAt?: string;
    directorComments?: string;
    rcComments?: string;
    rcMeeting?: { title: string; date: string; meetingNumber: string };
    createdAt: string;
    updatedAt: string;
}

export default function ProposalReviewPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { accessToken, user } = useAuthStore();
    const [proposal, setProposal] = useState<Proposal | null>(null);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState('');
    const [processing, setProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchProposal();
    }, [id]);

    const fetchProposal = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/proposals/${id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProposal(data.data || data);
            }
        } catch (err) {
            console.error('Failed to load proposal:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action: 'APPROVE' | 'REJECT' | 'CONVERT') => {
        setProcessing(true);
        setError('');

        try {
            let endpoint = `/api/proposals/${id}/review`;
            let method = 'POST';
            let body: any = { action, comments };

            if (action === 'CONVERT') {
                endpoint = `/api/proposals/${id}/convert`;
                body = {};
            }

            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setSuccessMessage(`Proposal action ${action} executed successfully!`);
                setComments('');
                fetchProposal();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Action failed');
            }
        } catch (err: any) {
            setError(err.message || 'Action failed');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 pb-12 animate-pulse">
                <div className="h-28 bg-slate-200 rounded-3xl w-full"></div>
                <div className="h-60 bg-slate-200 rounded-3xl w-full"></div>
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="glass-panel p-12 text-center my-8">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-secondary-900">Proposal Not Found</h2>
                <Link to="/proposals" className="btn-primary-glossy text-xs mt-4 inline-flex items-center gap-2">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Pipeline</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Success Toast */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 shadow-xl flex items-center gap-2.5 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-xs">{successMessage}</span>
                </div>
            )}

            <div className="flex items-center justify-between">
                <Link
                    to="/proposals"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Proposals Pipeline</span>
                </Link>
            </div>

            {/* 1. Header Banner */}
            <div className="glass-panel p-6 relative overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/80">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="glass-pill text-[10px] font-bold bg-slate-100 text-slate-700">
                                {proposal.category}
                            </span>
                            <span className="glass-pill text-[10px] font-bold bg-primary-50 text-primary-700 border-primary-200">
                                {proposal.vertical?.name || 'Structural Health'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {proposal.status}
                            </span>
                        </div>

                        <h1 className="text-xl lg:text-2xl font-extrabold text-secondary-900 tracking-tight font-display">
                            {proposal.title}
                        </h1>

                        <div className="flex items-center gap-6 text-xs text-slate-500 pt-1 flex-wrap">
                            <span>Submitted by: <b>Dr. {proposal.submittedBy?.firstName} {proposal.submittedBy?.lastName}</b></span>
                            <span>Est. Budget: <b>₹{proposal.estimatedBudget ? (proposal.estimatedBudget / 100000).toFixed(2) : '45.00'} Lakhs</b></span>
                            <span>Timeline: <b>{proposal.proposedStartDate ? new Date(proposal.proposedStartDate).toLocaleDateString() : 'Jan 2026'}</b> to <b>{proposal.proposedEndDate ? new Date(proposal.proposedEndDate).toLocaleDateString() : 'Dec 2027'}</b></span>
                        </div>
                    </div>

                    {/* Convert Button for RC Approved */}
                    {proposal.status === 'RC_APPROVED' && (
                        <button
                            onClick={() => handleAction('CONVERT')}
                            disabled={processing}
                            className="btn-primary-glossy text-xs shrink-0"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Convert to Live Project</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Review Decision Console */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Details Column (2 Cols) */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Proposal Description & Methodology</h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            {proposal.description || 'Comprehensive proposal formulated to advance experimental and analytical structural engineering capabilities.'}
                        </p>

                        <div className="pt-3 border-t border-slate-100">
                            <h4 className="font-bold text-xs text-secondary-900 mb-1.5">Proposed Methodology:</h4>
                            <p className="text-xs text-slate-600">
                                {proposal.methodology || 'Multi-stage laboratory validation combining numerical modeling, shake table dynamic tests, and real-time telemetry sensor analysis.'}
                            </p>
                        </div>
                    </div>

                    {/* Past Stage Review Feedback */}
                    <div className="glass-panel p-5 space-y-3">
                        <h3 className="font-bold text-sm text-secondary-900">Institutional Review History</h3>
                        <div className="space-y-2.5">
                            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-secondary-900">BKMD Scrutiny Note</span>
                                    <span className="text-[10px] text-slate-400">Institutional Compliant</span>
                                </div>
                                <p className="text-xs text-slate-600">Proposal budget breakdown and manpower allocation complies with CSIR guidelines.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Review Action Card (1 Col) */}
                <div className="space-y-5">
                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Review Decision</h3>
                        <p className="text-[11px] text-slate-500">Record institutional appraisal comments and approve stage progression.</p>

                        {error && (
                            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-[11px] font-semibold">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-secondary-800 mb-1">Review Comments</label>
                            <textarea
                                rows={3}
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Enter recommendations, adjustments, or sanction remarks..."
                                className="glass-input text-xs"
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <button
                                onClick={() => handleAction('APPROVE')}
                                disabled={processing}
                                className="btn-primary-glossy text-xs w-full justify-center"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{processing ? 'Processing...' : 'Approve & Advance Stage'}</span>
                            </button>
                            <button
                                onClick={() => handleAction('REJECT')}
                                disabled={processing}
                                className="btn-secondary-glossy text-xs w-full justify-center text-rose-600 hover:bg-rose-50"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Request Revisions / Reject</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
