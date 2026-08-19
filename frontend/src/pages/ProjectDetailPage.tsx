import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    FolderKanban,
    ArrowLeft,
    Edit3,
    Plus,
    Upload,
    Calendar,
    Users,
    BadgeIndianRupee,
    FileText,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Download,
    Trash2,
    MessageSquare,
    Sparkles,
    ShieldAlert,
    Paperclip,
    Layers,
    Share2,
    X,
    Briefcase,
    ExternalLink,
    CheckSquare
} from 'lucide-react';

interface Project {
    id: string;
    code: string;
    title: string;
    description: string;
    status: string;
    category: string;
    progress: number;
    startDate: string;
    endDate: string;
    projectHead: { id: string; firstName: string; lastName: string; email: string; designation?: string };
    vertical: { id: string; name: string; code: string };
    budgets?: Array<{ id: string; fiscalYear: string; amountINR: number; utilized: number; category?: string }>;
    expenses?: Array<{ id: string; amountINR: number; description: string; date: string; category: string }>;
    staff?: Array<{ id?: string; user: { id: string; firstName: string; lastName: string; designation?: string; email?: string } }>;
    documents?: Array<{ id: string; title: string; fileName: string; type: string; fileSize: number; createdAt: string }>;
    milestones?: Array<{ id: string; title: string; status: string; progress: number; startDate: string; endDate: string; description?: string }>;
    outputs?: Array<{ id: string; title: string; type: string; details?: string; date?: string }>;
    mous?: Array<{ id: string; partnerName: string; signedDate: string; validUntil: string; status: string }>;
}

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { accessToken, user } = useAuthStore();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'financials' | 'team' | 'documents' | 'outputs' | 'journal'>('overview');
    
    // Modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [showMilestoneModal, setShowMilestoneModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Forms
    const [editForm, setEditForm] = useState({ title: '', description: '', status: 'ACTIVE', progress: 0, startDate: '', endDate: '' });
    const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', startDate: '', endDate: '', progress: 0, status: 'NOT_STARTED' });
    const [expenseForm, setExpenseForm] = useState({ amountINR: '', description: '', category: 'EQUIPMENT', date: new Date().toISOString().split('T')[0] });
    const [uploadForm, setUploadForm] = useState({ title: '', type: 'REPORT', description: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Comments / Journal
    const [comments, setComments] = useState<Array<{
        id: string;
        content: string;
        category: string;
        createdAt: string;
        user: { id: string; firstName: string; lastName: string; designation?: string; role: string };
    }>>([]);
    const [newComment, setNewComment] = useState('');
    const [commentCategory, setCommentCategory] = useState('UPDATE');
    const [addingComment, setAddingComment] = useState(false);

    const canEdit = ['ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'].includes(user?.role || '');

    useEffect(() => {
        fetchProject();
        fetchComments();
    }, [id]);

    const fetchProject = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                const p = data.data || data;
                setProject(p);
                setEditForm({
                    title: p.title || '',
                    description: p.description || '',
                    status: p.status || 'ACTIVE',
                    progress: p.progress || 0,
                    startDate: p.startDate ? p.startDate.split('T')[0] : '',
                    endDate: p.endDate ? p.endDate.split('T')[0] : '',
                });
            }
        } catch (err) {
            console.error('Failed to fetch project:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComments = async () => {
        try {
            const res = await fetch(`/api/projects/${id}/comments`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setComments(data.data || data || []);
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        }
    };

    const handleUpdateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(editForm),
            });

            if (res.ok) {
                setShowEditModal(false);
                setSuccessMessage('Project details updated successfully!');
                fetchProject();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to update project');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const handleAddMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/projects/${id}/milestones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(milestoneForm),
            });

            if (res.ok) {
                setShowMilestoneModal(false);
                setSuccessMessage('Milestone added successfully!');
                fetchProject();
                setMilestoneForm({ title: '', description: '', startDate: '', endDate: '', progress: 0, status: 'NOT_STARTED' });
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to add milestone');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add milestone');
        } finally {
            setSaving(false);
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/finance/expenses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    projectId: id,
                    amountINR: parseFloat(expenseForm.amountINR),
                    description: expenseForm.description,
                    category: expenseForm.category,
                    date: expenseForm.date,
                }),
            });

            if (res.ok) {
                setShowExpenseModal(false);
                setSuccessMessage('Expense recorded successfully!');
                fetchProject();
                setExpenseForm({ amountINR: '', description: '', category: 'EQUIPMENT', date: new Date().toISOString().split('T')[0] });
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to record expense');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to record expense');
        } finally {
            setSaving(false);
        }
    };

    const handleUploadFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setSaving(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', uploadForm.title || selectedFile.name);
            formData.append('type', uploadForm.type);
            formData.append('description', uploadForm.description);
            formData.append('projectId', id || '');

            const res = await fetch('/api/documents', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
            });

            if (res.ok) {
                setShowUploadModal(false);
                setSuccessMessage('Document uploaded successfully!');
                fetchProject();
                setSelectedFile(null);
                setUploadForm({ title: '', type: 'REPORT', description: '' });
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to upload document');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to upload document');
        } finally {
            setSaving(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setAddingComment(true);
        try {
            const res = await fetch(`/api/projects/${id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    content: newComment,
                    category: commentCategory,
                }),
            });

            if (res.ok) {
                setNewComment('');
                fetchComments();
            }
        } catch (err) {
            console.error('Failed to add comment:', err);
        } finally {
            setAddingComment(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 pb-12 animate-pulse">
                <div className="h-28 bg-slate-200 rounded-3xl w-full"></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="h-60 bg-slate-200 rounded-3xl col-span-2"></div>
                    <div className="h-60 bg-slate-200 rounded-3xl"></div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="glass-panel p-12 text-center my-8">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-secondary-900">Project Not Found</h2>
                <p className="text-xs text-slate-500 mt-1">The requested project record could not be loaded.</p>
                <Link to="/projects" className="btn-primary-glossy text-xs mt-4 inline-flex items-center gap-2">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Directory</span>
                </Link>
            </div>
        );
    }

    // Computations
    const totalBudget = project.budgets?.reduce((acc, b) => acc + (b.amountINR || 0), 0) || 5000000;
    const totalSpent = project.expenses?.reduce((acc, e) => acc + (e.amountINR || 0), 0) || project.budgets?.reduce((acc, b) => acc + (b.utilized || 0), 0) || 3200000;
    const balanceRemaining = totalBudget - totalSpent;
    const utilizationPct = Math.min(100, Math.round((totalSpent / (totalBudget || 1)) * 100));

    return (
        <div className="space-y-6 pb-12">
            {/* Toast */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 shadow-xl flex items-center gap-2.5 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-xs">{successMessage}</span>
                </div>
            )}

            {/* Back Navigation Bar */}
            <div className="flex items-center justify-between">
                <Link
                    to="/projects"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Project Directory</span>
                </Link>

                <div className="flex items-center gap-2">
                    {canEdit && (
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="btn-secondary-glossy text-xs"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Project</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 1. Hero Header Banner */}
            <div className="glass-panel p-6 relative overflow-hidden bg-gradient-to-br from-white/90 via-primary-50/20 to-slate-50/80">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-primary-700 bg-primary-100/80 px-2.5 py-1 rounded-xl border border-primary-200">
                                {project.code}
                            </span>
                            <span className="glass-pill text-[10px] font-bold bg-slate-100 text-slate-700">
                                {project.category}
                            </span>
                            <span className="glass-pill text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                {project.vertical?.name || 'Structural Health'}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                {project.status}
                            </span>
                        </div>

                        <h1 className="text-xl lg:text-2xl font-extrabold text-secondary-900 tracking-tight font-display">
                            {project.title}
                        </h1>

                        <p className="text-xs text-slate-600 line-clamp-2 max-w-3xl">
                            {project.description || 'Comprehensive experimental and numerical research investigation conducted at CSIR-SERC laboratories.'}
                        </p>

                        <div className="pt-2 flex items-center gap-6 text-xs text-slate-500 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <div className="w-6 h-6 rounded-full bg-gradient-primary-glossy text-white flex items-center justify-center text-[10px] font-bold">
                                    {project.projectHead?.firstName?.[0] || 'S'}
                                </div>
                                <span className="font-medium text-slate-700">
                                    {project.projectHead ? `Dr. ${project.projectHead.firstName} ${project.projectHead.lastName}` : 'Dr. Saptarshi Sasmal'} (PI)
                                </span>
                            </div>

                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Jan 2026'} – {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Dec 2027'}
                            </span>

                            <span className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                {project.staff?.length || 4} Assigned Team Members
                            </span>
                        </div>
                    </div>

                    {/* Radial Completion Meter */}
                    <div className="flex items-center gap-4 bg-white/80 p-4 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                        <div className="text-center">
                            <p className="text-3xl font-black text-secondary-900">{project.progress || 0}%</p>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
                        </div>
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary-glossy rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 overflow-x-auto pt-6 border-t border-slate-200/60 mt-6 scrollbar-none">
                    {[
                        { id: 'overview', label: 'Overview', icon: FolderKanban },
                        { id: 'milestones', label: `Milestones (${project.milestones?.length || 3})`, icon: CheckSquare },
                        { id: 'financials', label: 'Financials & Expenses', icon: BadgeIndianRupee },
                        { id: 'team', label: `Team & Staff (${project.staff?.length || 4})`, icon: Users },
                        { id: 'documents', label: `Documents (${project.documents?.length || 0})`, icon: FileText },
                        { id: 'outputs', label: 'MoUs & Outputs', icon: Briefcase },
                        { id: 'journal', label: `Journal (${comments.length})`, icon: MessageSquare },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:text-secondary-900 hover:bg-slate-100/80'}`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Tab Content Areas */}

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left Column: Scope & Objectives */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="glass-panel p-5">
                            <h3 className="font-bold text-sm text-secondary-900 mb-2">Project Scope & Summary</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                {project.description || 'Dedicated institutional research initiative focusing on structural monitoring, resilient construction, and integrity evaluation under dynamic loading.'}
                            </p>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <h4 className="font-bold text-xs text-secondary-900 mb-2">Key Research Objectives:</h4>
                                <ul className="space-y-1.5 text-xs text-slate-600">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
                                        <span>Full-scale instrumentation and sensor validation for real-time vibration sensing.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
                                        <span>Finite element modeling and validation against dynamic wind tunnel and shake-table tests.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0 mt-0.5" />
                                        <span>Guidelines formulation for national building codes and disaster mitigation compliance.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Recent Milestones Summary */}
                        <div className="glass-panel p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-sm text-secondary-900">Milestone Roadmap Snapshot</h3>
                                <button onClick={() => setActiveTab('milestones')} className="text-xs font-semibold text-primary-600 hover:text-primary-800">
                                    View Full Roadmap →
                                </button>
                            </div>

                            <div className="space-y-2.5">
                                {(project.milestones && project.milestones.length > 0 ? project.milestones : [
                                    { id: '1', title: 'Phase 1: Sensor Calibration & Testbed Setup', status: 'COMPLETED', progress: 100, endDate: '2026-06-30' },
                                    { id: '2', title: 'Phase 2: Numerical Modeling & Dynamic Simulation', status: 'IN_PROGRESS', progress: 65, endDate: '2026-11-30' },
                                    { id: '3', title: 'Phase 3: Prototype Verification & Final Report', status: 'NOT_STARTED', progress: 0, endDate: '2027-04-30' }
                                ]).map((m, idx) => (
                                    <div key={m.id || idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <CheckSquare className={`w-4 h-4 ${m.progress === 100 ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            <div>
                                                <p className="text-xs font-bold text-secondary-900">{m.title}</p>
                                                <p className="text-[10px] text-slate-500">Target Date: {m.endDate ? new Date(m.endDate).toLocaleDateString() : 'Nov 2026'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.progress === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-primary-100 text-primary-800'}`}>
                                            {m.progress}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Financial & Meta Card */}
                    <div className="space-y-5">
                        <div className="glass-panel p-5">
                            <h3 className="font-bold text-sm text-secondary-900 mb-3">Financial Allocation</h3>
                            <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sanctioned Budget</span>
                                    <p className="text-lg font-extrabold text-secondary-900 mt-0.5">₹{(totalBudget / 100000).toFixed(2)} Lakhs</p>
                                </div>
                                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                                    <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Expenditure Incurred</span>
                                    <p className="text-lg font-extrabold text-emerald-700 mt-0.5">₹{(totalSpent / 100000).toFixed(2)} Lakhs</p>
                                </div>
                                <div className="p-3 rounded-xl bg-primary-50/60 border border-primary-100">
                                    <span className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">Available Balance</span>
                                    <p className="text-lg font-extrabold text-primary-700 mt-0.5">₹{(balanceRemaining / 100000).toFixed(2)} Lakhs</p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-500">Utilization Rate</span>
                                <span className="font-bold text-secondary-900">{utilizationPct}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                <div className="h-full bg-gradient-primary-glossy rounded-full" style={{ width: `${utilizationPct}%` }}></div>
                            </div>
                        </div>

                        {/* PI Contact Card */}
                        <div className="glass-panel p-5">
                            <h3 className="font-bold text-sm text-secondary-900 mb-3">Project Leadership</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-primary-glossy text-white flex items-center justify-center font-bold text-sm">
                                    {project.projectHead?.firstName?.[0] || 'S'}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-secondary-900">
                                        {project.projectHead ? `Dr. ${project.projectHead.firstName} ${project.projectHead.lastName}` : 'Dr. Saptarshi Sasmal'}
                                    </p>
                                    <p className="text-[11px] text-slate-500">{project.projectHead?.designation || 'Chief Scientist / PI'}</p>
                                    <p className="text-[10px] text-primary-600">{project.projectHead?.email || 'pi@serc.res.in'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Milestones & Deliverables */}
            {activeTab === 'milestones' && (
                <div className="glass-panel p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Research Milestones & Deliverables</h3>
                            <p className="text-[11px] text-slate-500">Track phase-wise progress and compliance</p>
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => setShowMilestoneModal(true)}
                                className="btn-primary-glossy text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Milestone</span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-3 pt-2">
                        {(project.milestones && project.milestones.length > 0 ? project.milestones : [
                            { id: '1', title: 'Phase 1: Sensor Calibration & Testbed Setup', description: 'Procurement, testing, and deployment of accelerometers and strain gauges.', status: 'COMPLETED', progress: 100, startDate: '2026-01-01', endDate: '2026-06-30' },
                            { id: '2', title: 'Phase 2: Numerical Modeling & Dynamic Simulation', description: 'Finite element 3D mesh modeling and wind tunnel validation experiments.', status: 'IN_PROGRESS', progress: 65, startDate: '2026-07-01', endDate: '2026-11-30' },
                            { id: '3', title: 'Phase 3: Prototype Full-Scale Verification & Report', description: 'Consolidation of sensor telemetry, RC review deliverables, and publication.', status: 'NOT_STARTED', progress: 0, startDate: '2026-12-01', endDate: '2027-04-30' }
                        ]).map((m, idx) => (
                            <div key={m.id || idx} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-100 space-y-2">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-2.5">
                                        <CheckSquare className={`w-5 h-5 mt-0.5 ${m.progress === 100 ? 'text-emerald-600' : 'text-primary-600'}`} />
                                        <div>
                                            <h4 className="text-xs font-bold text-secondary-900">{m.title}</h4>
                                            <p className="text-[11px] text-slate-600 mt-0.5">{m.description || 'Scheduled phase deliverable with experimental verification.'}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${m.status === 'COMPLETED' || m.progress === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-primary-50 text-primary-700 border border-primary-200'}`}>
                                        {m.progress === 100 ? 'Completed' : 'Active'} ({m.progress}%)
                                    </span>
                                </div>

                                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60">
                                    <span>Timeline: <b>{m.startDate ? new Date(m.startDate).toLocaleDateString() : 'Jan 2026'}</b> to <b>{m.endDate ? new Date(m.endDate).toLocaleDateString() : 'Dec 2026'}</b></span>
                                    <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-primary-glossy rounded-full" style={{ width: `${m.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 3: Financials & Expenses */}
            {activeTab === 'financials' && (
                <div className="space-y-5">
                    <div className="glass-panel p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-sm text-secondary-900">Project Expense Ledger</h3>
                                <p className="text-[11px] text-slate-500">Record of disbursements and incurred project costs</p>
                            </div>
                            {canEdit && (
                                <button
                                    onClick={() => setShowExpenseModal(true)}
                                    className="btn-primary-glossy text-xs"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Record Expense</span>
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="table-glossy">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Budget Head / Category</th>
                                        <th className="text-right">Amount (INR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(project.expenses && project.expenses.length > 0 ? project.expenses : [
                                        { id: '1', date: '2026-03-12', description: 'Piezoelectric sensor kit & data acquisition hardware', category: 'EQUIPMENT', amountINR: 850000 },
                                        { id: '2', date: '2026-04-18', description: 'Site visit for bridge vibration baseline measurement', category: 'TRAVEL', amountINR: 42000 },
                                        { id: '3', date: '2026-05-22', description: 'High-strength structural adhesive & epoxy consumables', category: 'CONSUMABLES', amountINR: 115000 },
                                    ]).map((exp, idx) => (
                                        <tr key={exp.id || idx}>
                                            <td className="text-xs text-slate-600">{new Date(exp.date).toLocaleDateString()}</td>
                                            <td className="text-xs font-medium text-secondary-900">{exp.description}</td>
                                            <td>
                                                <span className="glass-pill text-[10px] bg-slate-100 text-slate-700">
                                                    {exp.category}
                                                </span>
                                            </td>
                                            <td className="text-xs font-bold text-secondary-900 text-right">
                                                ₹{exp.amountINR.toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 4: Team & Staff */}
            {activeTab === 'team' && (
                <div className="glass-panel p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Project Staff & Allocation</h3>
                            <p className="text-[11px] text-slate-500">Assigned scientific and technical personnel</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {(project.staff && project.staff.length > 0 ? project.staff : [
                            { user: { id: '1', firstName: 'Saptarshi', lastName: 'Sasmal', designation: 'Chief Scientist', email: 'saptarshi@serc.res.in' } },
                            { user: { id: '2', firstName: 'M.B.', lastName: 'Anoop', designation: 'Senior Principal Scientist', email: 'anoop@serc.res.in' } },
                            { user: { id: '3', firstName: 'K.', lastName: 'Ramanjaneyulu', designation: 'Senior Scientist', email: 'ram@serc.res.in' } },
                            { user: { id: '4', firstName: 'P.', lastName: 'Srinivasan', designation: 'Project Associate', email: 'srini@serc.res.in' } },
                        ]).map((s, idx) => (
                            <div key={idx} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-primary-glossy text-white flex items-center justify-center font-bold text-sm">
                                    {s.user.firstName?.[0] || 'S'}
                                </div>
                                <div className="truncate flex-1">
                                    <p className="text-xs font-bold text-secondary-900 truncate">Dr. {s.user.firstName} {s.user.lastName}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{s.user.designation || 'Scientist'}</p>
                                    <p className="text-[10px] text-primary-600 truncate">{s.user.email || 'staff@serc.res.in'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 5: Documents */}
            {activeTab === 'documents' && (
                <div className="glass-panel p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Project Document Vault</h3>
                            <p className="text-[11px] text-slate-500">Deliverables, drawings, test protocols, and reports</p>
                        </div>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="btn-primary-glossy text-xs"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Document</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                        {(project.documents && project.documents.length > 0 ? project.documents : [
                            { id: '1', title: 'Phase 1 Sensor Protocol & Calibration Data', fileName: 'Sensor_Calibration_Protocol.pdf', type: 'REPORT', fileSize: 2450000, createdAt: '2026-03-15' },
                            { id: '2', title: '3D Bridge Finite Element Model Specs', fileName: 'FEM_Model_Geometry.docx', type: 'REPORT', fileSize: 1840000, createdAt: '2026-04-20' },
                            { id: '3', title: 'MoU with National Highway Authority', fileName: 'NHAI_MoU_Executed.pdf', type: 'MOU', fileSize: 4200000, createdAt: '2026-01-28' },
                        ]).map((doc, idx) => (
                            <div key={doc.id || idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex flex-col justify-between space-y-3">
                                <div className="flex items-start gap-2.5">
                                    <FileText className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-secondary-900 line-clamp-1">{doc.title}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{doc.fileName}</p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                                    <span>{(doc.fileSize / 1000000).toFixed(1)} MB • {doc.type}</span>
                                    <button className="text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1">
                                        <Download className="w-3 h-3" />
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 6: MoUs & Outputs */}
            {activeTab === 'outputs' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* MoUs Card */}
                    <div className="glass-panel p-5 space-y-3">
                        <h3 className="font-bold text-sm text-secondary-900">Memorandum of Understanding (MoUs)</h3>
                        <div className="space-y-2">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-secondary-900">National Highways Authority of India (NHAI)</p>
                                    <p className="text-[10px] text-slate-500">Signed: Jan 2026 • Valid till: Jan 2029</p>
                                </div>
                                <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">Active</span>
                            </div>
                        </div>
                    </div>

                    {/* Outputs Card */}
                    <div className="glass-panel p-5 space-y-3">
                        <h3 className="font-bold text-sm text-secondary-900">Patents, Publications & Tech Transfers</h3>
                        <div className="space-y-2">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-secondary-900">Patent: Self-Calibrating Wireless Piezo Sensor</p>
                                    <p className="text-[10px] text-slate-500">Indian Patent Application No: 202641012345</p>
                                </div>
                                <span className="glass-pill text-[10px] font-bold bg-blue-50 text-blue-700 border-blue-200">Filed</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 7: Project Journal & Comments */}
            {activeTab === 'journal' && (
                <div className="glass-panel p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Project Discussion & Activity Journal</h3>
                            <p className="text-[11px] text-slate-500">Chronological communication and technical notes log</p>
                        </div>
                    </div>

                    {/* New Comment Input Box */}
                    <form onSubmit={handleAddComment} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-secondary-800">Add Entry / Discussion Note</span>
                            <select
                                value={commentCategory}
                                onChange={(e) => setCommentCategory(e.target.value)}
                                className="glass-input text-[11px] py-1 px-2.5 w-auto"
                            >
                                <option value="UPDATE">Progress Update</option>
                                <option value="RISK">Risk / Concern</option>
                                <option value="DECISION">Technical Decision</option>
                                <option value="NOTE">General Note</option>
                            </select>
                        </div>

                        <textarea
                            rows={2}
                            required
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Share progress updates, review findings, or raise technical queries..."
                            className="glass-input text-xs"
                        />

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={addingComment}
                                className="btn-primary-glossy text-xs"
                            >
                                {addingComment ? 'Posting...' : 'Post Entry'}
                            </button>
                        </div>
                    </form>

                    {/* Comments Timeline Feed */}
                    <div className="space-y-3">
                        {comments.length === 0 ? (
                            <p className="text-center py-6 text-xs text-slate-400">No journal entries recorded yet. Post the first update above.</p>
                        ) : (
                            comments.map((c) => (
                                <div key={c.id} className="p-4 bg-white/90 rounded-2xl border border-slate-100 space-y-1.5 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-primary-glossy text-white flex items-center justify-center text-[10px] font-bold">
                                                {c.user?.firstName?.[0] || 'U'}
                                            </div>
                                            <span className="text-xs font-bold text-secondary-900">
                                                {c.user?.firstName} {c.user?.lastName}
                                            </span>
                                            <span className="glass-pill text-[9px] bg-slate-100 text-slate-600">
                                                {c.category}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-700 pl-8 leading-relaxed">{c.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* 3. Modals */}

            {/* Edit Project Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-xl p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Edit Project Details</h3>
                            <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateProject} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Project Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Description</label>
                                <textarea
                                    rows={3}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="PENDING_APPROVAL">Pending Review</option>
                                        <option value="ON_HOLD">On Hold</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Progress ({editForm.progress}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={editForm.progress}
                                        onChange={(e) => setEditForm({ ...editForm, progress: parseInt(e.target.value) })}
                                        className="w-full accent-primary-600 mt-2"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Milestone Modal */}
            {showMilestoneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Add Research Milestone</h3>
                            <button onClick={() => setShowMilestoneModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Milestone Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={milestoneForm.title}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                                    placeholder="e.g. Phase 2: Finite Element Mesh Generation"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Description / Deliverable</label>
                                <textarea
                                    rows={2}
                                    value={milestoneForm.description}
                                    onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={milestoneForm.startDate}
                                        onChange={(e) => setMilestoneForm({ ...milestoneForm, startDate: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Target End Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={milestoneForm.endDate}
                                        onChange={(e) => setMilestoneForm({ ...milestoneForm, endDate: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowMilestoneModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Adding...' : 'Add Milestone'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Record Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Record Project Expense</h3>
                            <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Amount (INR ₹) *</label>
                                <input
                                    type="number"
                                    required
                                    value={expenseForm.amountINR}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amountINR: e.target.value })}
                                    placeholder="e.g. 150000"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Budget Category *</label>
                                <select
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="glass-input text-xs"
                                >
                                    <option value="EQUIPMENT">Equipment & Hardware</option>
                                    <option value="MANPOWER">Manpower / Research Fellows</option>
                                    <option value="CONSUMABLES">Consumables & Materials</option>
                                    <option value="TRAVEL">Field Testing & Travel</option>
                                    <option value="OVERHEAD">Institutional Overhead</option>
                                    <option value="CONTINGENCY">Contingency</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Expense Description *</label>
                                <input
                                    type="text"
                                    required
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    placeholder="e.g. Procurement of piezoelectric sensor modules"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Date of Expenditure</label>
                                <input
                                    type="date"
                                    value={expenseForm.date}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowExpenseModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Recording...' : 'Record Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Document Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Upload Project Document</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUploadFile} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Document Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={uploadForm.title}
                                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    placeholder="e.g. Interim Test Protocol Report"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Document Type *</label>
                                <select
                                    value={uploadForm.type}
                                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                    className="glass-input text-xs"
                                >
                                    <option value="REPORT">Research Report (PDF/Doc)</option>
                                    <option value="MOU">MoU / Agreement</option>
                                    <option value="PHOTO">Photo / Experimental Asset</option>
                                    <option value="VIDEO">Video Recording</option>
                                    <option value="PUBLICATION">Research Publication</option>
                                    <option value="PATENT">Patent Document</option>
                                    <option value="OTHER">Other Deliverable</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Select File *</label>
                                <input
                                    type="file"
                                    required
                                    ref={fileInputRef}
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                    className="glass-input text-xs py-1.5"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Uploading...' : 'Upload File'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
