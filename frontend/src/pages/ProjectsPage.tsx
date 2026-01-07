import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    AddRegular,
    SearchRegular,
    FilterRegular,
    GridRegular,
    ListRegular,
    ChevronDownRegular,
    FolderRegular,
    CalendarRegular,
    PeopleTeamRegular,
    MoneyRegular,
    ArrowRightRegular,
    DismissRegular,
    CheckmarkCircleRegular,
    ClockRegular,
    InfoRegular,
    AlertRegular,
} from '@fluentui/react-icons';

interface Project {
    id: string;
    code: string;
    title: string;
    category: 'GAP' | 'CNP' | 'OLP' | 'EFP';
    status: string;
    progress: number;
    vertical?: { name: string; code: string };
    projectHead?: { firstName: string; lastName: string };
    startDate: string;
    endDate: string;
    _count?: { staff: number; milestones: number };
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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ProjectsPage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [projects, setProjects] = useState<Project[]>([]);
    const [verticals, setVerticals] = useState<Vertical[]>([]);
    const [staff, setStaff] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Form state for creating project
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'GAP',
        customCategory: '',
        verticalId: '',
        specialArea: '',
        projectHeadId: '',
        startDate: '',
        endDate: '',
        objectives: '',
        methodology: '',
        expectedOutcome: '',
    });
    const [saving, setSaving] = useState(false);
    const [previewCode, setPreviewCode] = useState('');

    // Check if user can create projects
    const canCreate = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(currentUser?.role || '');

    useEffect(() => {
        fetchProjects();
        fetchVerticals();
        fetchStaff();
    }, [categoryFilter, statusFilter, search]);

    // Generate preview code when category or vertical changes
    useEffect(() => {
        if (formData.category && formData.verticalId) {
            const vertical = verticals.find(v => v.id === formData.verticalId);
            const year = new Date().getFullYear();
            const cat = formData.category === 'CUSTOM' ? formData.customCategory.toUpperCase().slice(0, 3) : formData.category;
            setPreviewCode(`${cat}-${year}-${vertical?.code || 'XX'}-XXX`);
        } else {
            setPreviewCode('');
        }
    }, [formData.category, formData.verticalId, formData.customCategory, verticals]);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('limit', '100');
            if (categoryFilter) params.append('category', categoryFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);

            const res = await fetch(`${API_BASE}/projects?${params}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });

            if (res.ok) {
                const data = await res.json();
                setProjects(data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchVerticals = async () => {
        try {
            const res = await fetch(`${API_BASE}/verticals`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setVerticals(data || []);
            }
        } catch (error) {
            console.error('Failed to fetch verticals:', error);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await fetch(`${API_BASE}/staff?limit=500`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStaff(data.data || data || []);
            }
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.verticalId || !formData.projectHeadId || !formData.startDate || !formData.endDate) {
            setError('Please fill in all required fields');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const payload = {
                title: formData.title,
                description: formData.description || undefined,
                category: formData.category === 'CUSTOM' ? formData.customCategory : formData.category,
                verticalId: formData.verticalId,
                specialAreaId: undefined, // Handle if needed
                specialArea: formData.specialArea || undefined,
                projectHeadId: formData.projectHeadId,
                startDate: formData.startDate,
                endDate: formData.endDate,
                objectives: formData.objectives || undefined,
                methodology: formData.methodology || undefined,
                expectedOutcome: formData.expectedOutcome || undefined,
            };

            const res = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const newProject = await res.json();
                setSuccessMessage(`Project ${newProject.code} created successfully!`);
                setTimeout(() => setSuccessMessage(''), 5000);
                setShowCreateModal(false);
                resetForm();
                fetchProjects();
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to create project');
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
            verticalId: '',
            specialArea: '',
            projectHeadId: '',
            startDate: '',
            endDate: '',
            objectives: '',
            methodology: '',
            expectedOutcome: '',
        });
        setPreviewCode('');
        setError('');
    };

    const categoryColors: Record<string, string> = {
        GAP: 'bg-primary-100 text-primary-700 border-primary-200',
        CNP: 'bg-success-100 text-success-700 border-success-200',
        OLP: 'bg-accent-100 text-accent-700 border-accent-200',
        EFP: 'bg-warning-100 text-warning-700 border-warning-200',
    };

    const categoryLabels: Record<string, string> = {
        GAP: 'Grant-in-Aid',
        CNP: 'Consultancy',
        OLP: 'Other Lab',
        EFP: 'Ext. Funded',
    };

    const statusColors: Record<string, string> = {
        ACTIVE: 'bg-success-500',
        COMPLETED: 'bg-primary-500',
        PENDING_APPROVAL: 'bg-warning-500',
        ON_HOLD: 'bg-secondary-400',
        DRAFT: 'bg-secondary-300',
        CANCELLED: 'bg-danger-500',
    };

    const statusLabels: Record<string, string> = {
        ACTIVE: 'Active',
        COMPLETED: 'Completed',
        PENDING_APPROVAL: 'Pending Approval',
        ON_HOLD: 'On Hold',
        DRAFT: 'Draft',
        CANCELLED: 'Cancelled',
    };

    const getProgressColor = (progress: number) => {
        if (progress >= 80) return 'bg-success-500';
        if (progress >= 50) return 'bg-primary-500';
        if (progress >= 25) return 'bg-warning-500';
        return 'bg-secondary-300';
    };

    const getDaysRemaining = (endDate: string) => {
        const end = new Date(endDate);
        const now = new Date();
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const displayProjects = projects;

    return (
        <div className="space-y-6 animate-fade-in">
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
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Projects</h1>
                    <p className="text-secondary-500 mt-1">
                        Manage research projects, track progress, and monitor milestones
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <AddRegular className="w-5 h-5" />
                        <span>New Project</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="premium-card p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <SearchRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search projects by code, title, or project head..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-premium pl-12"
                        />
                    </div>

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="input-premium pr-10 min-w-[180px]"
                        >
                            <option value="">All Categories</option>
                            <option value="GAP">Grant-in-Aid (GAP)</option>
                            <option value="CNP">Consultancy (CNP)</option>
                            <option value="OLP">Other Lab (OLP)</option>
                            <option value="EFP">Ext. Funded (EFP)</option>
                        </select>
                        <ChevronDownRegular className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-premium pr-10 min-w-[180px]"
                        >
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="PENDING_APPROVAL">Pending Approval</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ON_HOLD">On Hold</option>
                        </select>
                        <ChevronDownRegular className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
                    </div>

                    {/* View Toggle */}
                    <div className="flex rounded-xl border border-secondary-200 overflow-hidden">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-3 transition-colors ${view === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            <GridRegular className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-3 transition-colors ${view === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-secondary-500 hover:bg-secondary-50'}`}
                        >
                            <ListRegular className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Projects Grid/List */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="premium-card p-6">
                            <div className="skeleton h-4 w-24 mb-4" />
                            <div className="skeleton h-6 w-full mb-2" />
                            <div className="skeleton h-4 w-3/4 mb-4" />
                            <div className="skeleton h-2 w-full" />
                        </div>
                    ))}
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayProjects.map((project) => {
                        const daysRemaining = getDaysRemaining(project.endDate);
                        return (
                            <Link
                                key={project.id}
                                to={`/projects/${project.id}`}
                                className="premium-card p-6 group"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <span className={`badge border ${categoryColors[project.category] || 'bg-secondary-100 text-secondary-700'}`}>
                                        {categoryLabels[project.category] || project.category}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                                        <span className="text-xs text-secondary-500">{statusLabels[project.status]}</span>
                                    </div>
                                </div>

                                {/* Code */}
                                <p className="text-sm font-mono text-primary-600 mb-2">{project.code}</p>

                                {/* Title */}
                                <h3 className="font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-3">
                                    {project.title}
                                </h3>

                                {/* Vertical */}
                                <p className="text-sm text-secondary-500 mb-4">
                                    {project.vertical?.name || 'N/A'}
                                </p>

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-secondary-500">Progress</span>
                                        <span className="text-sm font-semibold text-secondary-700">{project.progress}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-bar-fill ${getProgressColor(project.progress)}`}
                                            style={{ width: `${project.progress}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center gap-4 text-xs text-secondary-500 border-t border-secondary-100 pt-4">
                                    <div className="flex items-center gap-1">
                                        <PeopleTeamRegular className="w-4 h-4" />
                                        <span>{project._count?.staff || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <FolderRegular className="w-4 h-4" />
                                        <span>{project._count?.milestones || 0} milestones</span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${daysRemaining < 30 ? 'text-warning-600' : ''} ${daysRemaining < 0 ? 'text-danger-600' : ''}`}>
                                        <ClockRegular className="w-4 h-4" />
                                        <span>
                                            {daysRemaining < 0
                                                ? `${Math.abs(daysRemaining)}d overdue`
                                                : `${daysRemaining}d left`}
                                        </span>
                                    </div>
                                </div>

                                {/* Project Head */}
                                <div className="mt-4 pt-4 border-t border-secondary-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs font-semibold">
                                            {project.projectHead?.firstName?.[0] || 'P'}{project.projectHead?.lastName?.[0] || 'H'}
                                        </div>
                                        <span className="text-sm text-secondary-700">
                                            {project.projectHead?.firstName || 'Unknown'} {project.projectHead?.lastName || ''}
                                        </span>
                                    </div>
                                    <ArrowRightRegular className="w-5 h-5 text-secondary-400 group-hover:text-primary-500 transition-colors" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="premium-card overflow-hidden">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Project</th>
                                <th>Category</th>
                                <th>Vertical</th>
                                <th>Project Head</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayProjects.map((project) => (
                                <tr key={project.id}>
                                    <td>
                                        <div>
                                            <p className="font-mono text-sm text-primary-600">{project.code}</p>
                                            <p className="font-medium text-secondary-900 max-w-xs truncate">{project.title}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge border ${categoryColors[project.category] || 'bg-secondary-100'}`}>
                                            {categoryLabels[project.category] || project.category}
                                        </span>
                                    </td>
                                    <td>{project.vertical?.name || 'N/A'}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-premium flex items-center justify-center text-white text-xs">
                                                {project.projectHead?.firstName?.[0] || 'P'}{project.projectHead?.lastName?.[0] || 'H'}
                                            </div>
                                            <span>{project.projectHead?.firstName || 'Unknown'} {project.projectHead?.lastName || ''}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${statusColors[project.status]}`} />
                                            <span>{statusLabels[project.status]}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3 min-w-[120px]">
                                            <div className="flex-1 progress-bar">
                                                <div
                                                    className={`progress-bar-fill ${getProgressColor(project.progress)}`}
                                                    style={{ width: `${project.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium w-10 text-right">{project.progress}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <Link
                                            to={`/projects/${project.id}`}
                                            className="btn-ghost text-sm"
                                        >
                                            View
                                            <ArrowRightRegular className="w-4 h-4 ml-1" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Empty State */}
            {displayProjects.length === 0 && !loading && (
                <div className="premium-card p-12 text-center">
                    <FolderRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">No projects found</h3>
                    <p className="text-secondary-500 mb-6">
                        {search || categoryFilter || statusFilter
                            ? 'Try adjusting your filters or search terms'
                            : 'Get started by creating your first project'}
                    </p>
                    {!search && !categoryFilter && !statusFilter && canCreate && (
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                            <AddRegular className="w-5 h-5 mr-2" />
                            Create Project
                        </button>
                    )}
                </div>
            )}

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-200 flex items-center justify-between flex-shrink-0">
                            <div>
                                <h2 className="text-xl font-display font-bold text-secondary-900">Create New Project</h2>
                                {previewCode && (
                                    <p className="text-sm text-primary-600 mt-1">
                                        Auto-generated code: <span className="font-mono font-semibold">{previewCode}</span>
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => { setShowCreateModal(false); resetForm(); }}
                                className="p-2 rounded-lg hover:bg-secondary-100 transition-colors"
                            >
                                <DismissRegular className="w-5 h-5 text-secondary-500" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject} className="flex-1 overflow-auto">
                            <div className="p-6 space-y-4">
                                {error && (
                                    <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm flex items-center gap-2">
                                        <AlertRegular className="w-5 h-5" />
                                        {error}
                                    </div>
                                )}

                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Project Title <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Enter project title"
                                        className="input-premium"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of the project"
                                        className="input-premium"
                                        rows={3}
                                    />
                                </div>

                                {/* Category and Vertical */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                                            Category <span className="text-danger-500">*</span>
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="input-premium"
                                            required
                                        >
                                            <option value="GAP">Grant-in-Aid (GAP)</option>
                                            <option value="CNP">Consultancy (CNP)</option>
                                            <option value="OLP">Other Lab (OLP)</option>
                                            <option value="EFP">Externally Funded (EFP)</option>
                                            <option value="CUSTOM">Create New Category...</option>
                                        </select>
                                    </div>
                                    {formData.category === 'CUSTOM' && (
                                        <div>
                                            <label className="block text-sm font-medium text-secondary-700 mb-1">
                                                Custom Category Code <span className="text-danger-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.customCategory}
                                                onChange={(e) => setFormData({ ...formData, customCategory: e.target.value.toUpperCase().slice(0, 3) })}
                                                placeholder="e.g., SPC"
                                                className="input-premium"
                                                maxLength={3}
                                                required
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                                            Vertical <span className="text-danger-500">*</span>
                                        </label>
                                        <select
                                            value={formData.verticalId}
                                            onChange={(e) => setFormData({ ...formData, verticalId: e.target.value })}
                                            className="input-premium"
                                            required
                                        >
                                            <option value="">Select vertical...</option>
                                            {verticals.map(v => (
                                                <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Special Area */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Special Area (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.specialArea}
                                        onChange={(e) => setFormData({ ...formData, specialArea: e.target.value })}
                                        placeholder="e.g., Heritage Structures, Offshore Platforms"
                                        className="input-premium"
                                    />
                                </div>

                                {/* Project Head */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                                        Project Head <span className="text-danger-500">*</span>
                                    </label>
                                    <select
                                        value={formData.projectHeadId}
                                        onChange={(e) => setFormData({ ...formData, projectHeadId: e.target.value })}
                                        className="input-premium"
                                        required
                                    >
                                        <option value="">Select project head...</option>
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.firstName} {s.lastName} {s.designation ? `(${s.designation})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                                            Start Date <span className="text-danger-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="input-premium"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                                            End Date <span className="text-danger-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="input-premium"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Objectives */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Objectives</label>
                                    <textarea
                                        value={formData.objectives}
                                        onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                                        placeholder="Key objectives of the project"
                                        className="input-premium"
                                        rows={2}
                                    />
                                </div>

                                {/* Methodology */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Methodology</label>
                                    <textarea
                                        value={formData.methodology}
                                        onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                                        placeholder="Research methodology"
                                        className="input-premium"
                                        rows={2}
                                    />
                                </div>

                                {/* Expected Outcome */}
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Expected Outcome</label>
                                    <textarea
                                        value={formData.expectedOutcome}
                                        onChange={(e) => setFormData({ ...formData, expectedOutcome: e.target.value })}
                                        placeholder="Expected outcomes and deliverables"
                                        className="input-premium"
                                        rows={2}
                                    />
                                </div>

                                <div className="p-3 bg-info-50 border border-info-200 rounded-lg text-info-700 text-sm">
                                    <InfoRegular className="w-4 h-4 inline mr-2" />
                                    Project will be created in DRAFT status. Submit for approval after adding team members and budget.
                                </div>
                            </div>

                            <div className="p-6 border-t border-secondary-200 flex justify-end gap-3 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary"
                                >
                                    {saving ? 'Creating...' : 'Create Project'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
