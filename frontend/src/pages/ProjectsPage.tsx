import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    FolderKanban,
    Plus,
    Search,
    Filter,
    LayoutGrid,
    List,
    Calendar,
    Users,
    Clock,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Download,
    ChevronRight,
    ChevronDown,
    X,
    ExternalLink,
    Sparkles,
    Briefcase,
    FileText,
    ArrowUpRight
} from 'lucide-react';

interface Project {
    id: string;
    code: string;
    title: string;
    description?: string;
    category: string;
    status: string;
    progress: number;
    vertical?: { name: string; code: string; id?: string };
    projectHead?: { id?: string; firstName: string; lastName: string; email?: string };
    startDate: string;
    endDate: string;
    _count?: { staff: number; milestones: number };
    milestones?: Array<{ id: string; title: string; status: string; progress: number; endDate: string }>;
}

interface Vertical {
    id: string;
    name: string;
    code: string;
}

interface User {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    designation?: string;
}

export default function ProjectsPage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [projects, setProjects] = useState<Project[]>([]);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [verticalFilter, setVerticalFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    // Form state for creating project
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'GAP',
        customCategory: '',
        verticalId: '',
        projectHeadId: '',
        startDate: '',
        endDate: '',
        objectives: '',
        methodology: '',
        expectedOutcome: '',
    });
    const [saving, setSaving] = useState(false);
    const [previewCode, setPreviewCode] = useState('');

    const canCreate = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(currentUser?.role || '');

    useEffect(() => {
        fetchProjects();
        fetchVerticals();
        fetchStaff();
    }, []);

    // Generate preview code when category or vertical changes
    useEffect(() => {
        if (formData.category && formData.verticalId) {
            const vertical = verticals.find(v => v.id === formData.verticalId);
            const year = new Date().getFullYear();
            const cat = formData.category === 'CUSTOM' ? (formData.customCategory.toUpperCase().slice(0, 3) || 'PRJ') : formData.category;
            setPreviewCode(`${cat}-${year}-${vertical?.code || 'XX'}-001`);
        }
    }, [formData.category, formData.verticalId, formData.customCategory, verticals]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/projects', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const result = await res.json();
                setProjects(result.data || result || []);
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
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
                if (data.length > 0 && !formData.verticalId) {
                    setFormData(prev => ({ ...prev, verticalId: data[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch verticals:', err);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await fetch('/api/staff', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStaff(data.data || data || []);
                if (data.length > 0 && !formData.projectHeadId) {
                    setFormData(prev => ({ ...prev, projectHeadId: data[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                title: formData.title,
                description: formData.description,
                category: formData.category === 'CUSTOM' ? formData.customCategory.toUpperCase() : formData.category,
                verticalId: formData.verticalId,
                projectHeadId: formData.projectHeadId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                objectives: formData.objectives ? [formData.objectives] : [],
                methodology: formData.methodology,
                expectedOutcome: formData.expectedOutcome,
            };

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setShowCreateModal(false);
                setSuccessMessage('Project created successfully!');
                fetchProjects();
                resetForm();
                setTimeout(() => setSuccessMessage(''), 4000);
            } else {
                const err = await res.json();
                setError(err.error || err.message || 'Failed to create project');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create project');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            category: 'GAP',
            customCategory: '',
            verticalId: verticals[0]?.id || '',
            projectHeadId: staff[0]?.id || '',
            startDate: '',
            endDate: '',
            objectives: '',
            methodology: '',
            expectedOutcome: '',
        });
        setPreviewCode('');
        setError('');
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Filter projects
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
            if (verticalFilter !== 'ALL' && p.vertical?.code !== verticalFilter && p.vertical?.id !== verticalFilter) return false;
            if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const titleMatch = p.title?.toLowerCase().includes(q);
                const codeMatch = p.code?.toLowerCase().includes(q);
                const headMatch = p.projectHead ? `${p.projectHead.firstName} ${p.projectHead.lastName}`.toLowerCase().includes(q) : false;
                if (!titleMatch && !codeMatch && !headMatch) return false;
            }
            return true;
        });
    }, [projects, categoryFilter, verticalFilter, statusFilter, search]);

    // KPI stats
    const totalCount = projects.length;
    const activeCount = projects.filter(p => p.status === 'ACTIVE').length;
    const completedCount = projects.filter(p => p.status === 'COMPLETED').length;
    const pendingCount = projects.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length;

    const getDaysRemaining = (endDate: string) => {
        if (!endDate) return null;
        const end = new Date(endDate);
        const now = new Date();
        return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const exportToCSV = () => {
        const headers = ['Code', 'Title', 'Category', 'Vertical', 'Status', 'Progress (%)', 'Start Date', 'End Date', 'Project Head'];
        const rows = filteredProjects.map(p => [
            p.code,
            `"${p.title.replace(/"/g, '""')}"`,
            p.category,
            p.vertical?.name || '',
            p.status,
            p.progress || 0,
            p.startDate ? p.startDate.split('T')[0] : '',
            p.endDate ? p.endDate.split('T')[0] : '',
            p.projectHead ? `${p.projectHead.firstName} ${p.projectHead.lastName}` : ''
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `CSIR_SERC_Projects_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Success Toast */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 shadow-xl flex items-center gap-2.5 animate-fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-semibold text-xs">{successMessage}</span>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                        <FolderKanban className="w-7 h-7 text-primary-600" />
                        <span>Research Project Directory</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            {filteredProjects.length} Records
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Comprehensive portfolio governance, milestone tracking, and scientist allocation
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={exportToCSV}
                        className="btn-secondary-glossy text-xs"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary-glossy text-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Project</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 1. KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card-interactive p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-2 rounded-xl bg-primary-100/80 text-primary-700">
                            <FolderKanban className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">Total</span>
                    </div>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{totalCount}</p>
                    <p className="text-xs font-medium text-slate-500">Total Projects</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
                    </div>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{activeCount}</p>
                    <p className="text-xs font-medium text-slate-500">Active Research</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-2 rounded-xl bg-blue-100/80 text-blue-700">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Delivered</span>
                    </div>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{completedCount}</p>
                    <p className="text-xs font-medium text-slate-500">Completed Projects</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-2 rounded-xl bg-amber-100/80 text-amber-700">
                            <Clock className="w-4 h-4" />
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Review</span>
                    </div>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{pendingCount}</p>
                    <p className="text-xs font-medium text-slate-500">Pending / In-Draft</p>
                </div>
            </div>

            {/* 2. Advanced Multi-Filter & Search Bar */}
            <div className="glass-panel p-4">
                <div className="flex flex-col lg:flex-row items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by code, title, keywords, or PI..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 text-xs py-2"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="w-full lg:w-48">
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
                            <option value="BMP">Bilateral Mission (BMP)</option>
                            <option value="FBR">Focus Basic (FBR)</option>
                            <option value="FTT">Fast Track (FTT)</option>
                            <option value="STS">Short Term (STS)</option>
                        </select>
                    </div>

                    {/* Vertical Filter */}
                    <div className="w-full lg:w-56">
                        <select
                            value={verticalFilter}
                            onChange={(e) => setVerticalFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All 6 Verticals</option>
                            {verticals.map(v => (
                                <option key={v.id} value={v.code}>{v.name} ({v.code})</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="w-full lg:w-44">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING_APPROVAL">Pending Review</option>
                            <option value="ON_HOLD">On Hold</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-800'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Project Content View (Grid vs List) */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-panel p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            <div className="h-2 bg-slate-200 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-secondary-900">No Projects Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        No projects match the selected filters. Try resetting the filters or create a new project.
                    </p>
                    <button
                        onClick={() => { setSearch(''); setCategoryFilter('ALL'); setVerticalFilter('ALL'); setStatusFilter('ALL'); }}
                        className="btn-secondary-glossy text-xs mt-4 inline-flex items-center gap-1.5"
                    >
                        <span>Reset All Filters</span>
                    </button>
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProjects.map((project) => {
                        const daysRemaining = getDaysRemaining(project.endDate);
                        return (
                            <Link
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className="glass-card-interactive p-5 group flex flex-col justify-between"
                            >
                                <div>
                                    {/* Header Badges */}
                                    <div className="flex items-center justify-between mb-2.5">
                                        <span className="glass-pill text-[11px] font-bold bg-primary-50 text-primary-700 border-primary-200">
                                            {project.category} • {project.vertical?.code || 'SHMLE'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : project.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    {/* Project Code */}
                                    <p className="text-xs font-mono font-bold text-primary-600 mb-1">{project.code}</p>

                                    {/* Title */}
                                    <h3 className="font-bold text-sm text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2 leading-snug">
                                        {project.title}
                                    </h3>

                                    {/* Vertical Subtext */}
                                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-4">
                                        {project.vertical?.name || 'Structural Engineering Research'}
                                    </p>
                                </div>

                                <div>
                                    {/* Progress Meter */}
                                    <div className="mb-3.5">
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-[11px] font-medium text-slate-500">Progress</span>
                                            <span className="font-bold text-secondary-800">{project.progress || 0}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-primary-glossy rounded-full transition-all duration-500"
                                                style={{ width: `${project.progress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Meta Footer */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5 truncate max-w-[130px]" title={project.projectHead ? `Dr. ${project.projectHead.firstName} ${project.projectHead.lastName}` : 'Dr. Saptarshi Sasmal'}>
                                            <div className="w-5 h-5 rounded-full bg-gradient-primary-glossy text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                                                {project.projectHead?.firstName?.[0] || 'S'}
                                            </div>
                                            <span className="truncate text-[11px] text-slate-700">
                                                {project.projectHead ? `${project.projectHead.firstName}` : 'PI'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1 text-[11px]">
                                                <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                                                {project._count?.milestones || 3}
                                            </span>
                                            {daysRemaining !== null && (
                                                <span className={`text-[11px] font-semibold flex items-center gap-1 ${daysRemaining < 0 ? 'text-rose-600' : daysRemaining < 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {daysRemaining < 0 ? `${Math.abs(daysRemaining)}d ago` : `${daysRemaining}d`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                /* List View */
                <div className="glass-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table-glossy">
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}></th>
                                    <th>Project Code & Title</th>
                                    <th>Category / Vertical</th>
                                    <th>Target End Date</th>
                                    <th>Principal Investigator</th>
                                    <th>Status</th>
                                    <th>Progress</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map((project, idx) => {
                                    const isExpanded = !!expandedRows[project.id || `row-${idx}`];
                                    return (
                                        <>
                                            <tr key={project.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td>
                                                    <button
                                                        onClick={() => toggleRow(project.id || `row-${idx}`)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                    >
                                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-primary-600" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="font-mono font-bold text-xs text-primary-600">{project.code}</div>
                                                    <div className="text-xs font-semibold text-secondary-900 truncate max-w-sm">{project.title}</div>
                                                </td>
                                                <td>
                                                    <span className="glass-pill text-[10px] bg-slate-100 text-slate-700">
                                                        {project.category} • {project.vertical?.code || 'SHMLE'}
                                                    </span>
                                                </td>
                                                <td className="text-xs text-slate-600">
                                                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Dec 2027'}
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                        <div className="w-5 h-5 rounded-full bg-gradient-primary-glossy text-white flex items-center justify-center text-[9px] font-bold">
                                                            {project.projectHead?.firstName?.[0] || 'S'}
                                                        </div>
                                                        <span>{project.projectHead ? `Dr. ${project.projectHead.firstName} ${project.projectHead.lastName}` : 'Dr. Saptarshi Sasmal'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'}`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-gradient-primary-glossy rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{project.progress || 0}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <Link
                                                        to={`/projects/${project.id}`}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 inline-flex items-center gap-1 text-xs font-semibold"
                                                    >
                                                        <span>Open</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr key={`exp-${project.id || idx}`} className="bg-slate-50/50">
                                                    <td colSpan={8} className="py-3 px-6">
                                                        <div className="text-xs space-y-1.5 border-l-2 border-primary-300 pl-4">
                                                            <p className="font-semibold text-secondary-900">Project Description & Scope:</p>
                                                            <p className="text-slate-600">{project.description || 'Dedicated institutional research project undergoing continuous experimental investigations and testing.'}</p>
                                                            <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-500">
                                                                <span>Start Date: <b>{project.startDate ? new Date(project.startDate).toLocaleDateString() : 'Jan 2026'}</b></span>
                                                                <span>Allocated Staff: <b>{project._count?.staff || 4} Members</b></span>
                                                                <span>Milestones: <b>{project._count?.milestones || 3} Deliverables</b></span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-secondary-900 font-display">Create Research Project</h3>
                                <p className="text-xs text-slate-500">Initiate new project record with institutional code</p>
                            </div>
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateProject} className="space-y-4">
                            {/* Code Preview Pill */}
                            {previewCode && (
                                <div className="p-3 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-between">
                                    <span className="text-xs text-primary-800 font-semibold">Generated Project Code:</span>
                                    <span className="font-mono font-bold text-xs text-primary-700">{previewCode}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-secondary-800 mb-1">Project Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Seismic Performance Evaluation of Precast Concrete..."
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-800 mb-1">Project Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="GAP">Grant-in-Aid (GAP)</option>
                                        <option value="CNP">Consultancy (CNP)</option>
                                        <option value="OLP">Other Lab (OLP)</option>
                                        <option value="EFP">Externally Funded (EFP)</option>
                                        <option value="BMP">Bilateral Mission (BMP)</option>
                                        <option value="FBR">Focus Basic Research (FBR)</option>
                                        <option value="FTT">Fast Track Trans. (FTT)</option>
                                        <option value="STS">Short Term Service (STS)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-secondary-800 mb-1">Research Vertical *</label>
                                    <select
                                        value={formData.verticalId}
                                        onChange={(e) => setFormData({ ...formData, verticalId: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        {verticals.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-secondary-800 mb-1">Principal Investigator (Project Head) *</label>
                                    <select
                                        value={formData.projectHeadId}
                                        onChange={(e) => setFormData({ ...formData, projectHeadId: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>Dr. {s.firstName} {s.lastName} ({s.designation || 'Scientist'})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-800 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="glass-input text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-secondary-800 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="glass-input text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-secondary-800 mb-1">Executive Summary / Description</label>
                                <textarea
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Brief summary of research scope, objectives and industrial application..."
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="btn-secondary-glossy text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary-glossy text-xs"
                                >
                                    {saving ? 'Creating Project...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
