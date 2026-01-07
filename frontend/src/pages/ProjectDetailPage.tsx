import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    ArrowLeftRegular,
    EditRegular,
    FolderRegular,
    CalendarRegular,
    PersonRegular,
    MoneyRegular,
    DocumentRegular,
    ChartMultipleRegular,
    AddRegular,
    ArrowUploadRegular,
    ArrowDownloadRegular,
    DeleteRegular,
    CheckmarkCircleRegular,
    DismissRegular,
    ClockRegular,
    TargetRegular,
} from '@fluentui/react-icons';

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
    projectHead: { id: string; firstName: string; lastName: string; email: string };
    vertical: { id: string; name: string; code: string };
    budgets?: Array<{ id: string; fiscalYear: string; amountINR: number; utilized: number }>;
    staff?: Array<{ user: { id: string; firstName: string; lastName: string; designation: string } }>;
    documents?: Array<{ id: string; title: string; fileName: string; type: string; fileSize: number; createdAt: string }>;
    milestones?: Array<{ id: string; title: string; status: string; startDate: string; endDate: string }>;
}

const statusColors: Record<string, string> = {
    ACTIVE: 'bg-success-100 text-success-700 border-success-300',
    COMPLETED: 'bg-primary-100 text-primary-700 border-primary-300',
    PENDING_APPROVAL: 'bg-warning-100 text-warning-700 border-warning-300',
    ON_HOLD: 'bg-secondary-100 text-secondary-700 border-secondary-300',
    DRAFT: 'bg-secondary-100 text-secondary-600 border-secondary-200',
    CANCELLED: 'bg-danger-100 text-danger-700 border-danger-300',
};

const categoryLabels: Record<string, string> = {
    GAP: 'Grant-in-Aid',
    CNP: 'Consultancy',
    OLP: 'Other Lab',
    EFP: 'External Funded',
};

const formatFileSize = (bytes: number) => {
    if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
    if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
    return `${bytes} B`;
};

export default function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { accessToken, user } = useAuthStore();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'team' | 'budget' | 'timeline'>('overview');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadForm, setUploadForm] = useState({ title: '', type: 'REPORT', description: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${id}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProject(data);
            } else {
                navigate('/projects');
            }
        } catch (error) {
            console.error('Failed to fetch project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0]);
            if (!uploadForm.title) {
                setUploadForm(prev => ({ ...prev, title: e.target.files![0].name.replace(/\.[^.]+$/, '') }));
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !uploadForm.title) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', uploadForm.title);
            formData.append('type', uploadForm.type);
            formData.append('projectId', id!);
            if (uploadForm.description) formData.append('description', uploadForm.description);

            const res = await fetch('/api/documents/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: formData,
            });

            if (res.ok) {
                setShowUploadModal(false);
                setSelectedFile(null);
                setUploadForm({ title: '', type: 'REPORT', description: '' });
                fetchProject();
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: { id: string; fileName: string }) => {
        try {
            const res = await fetch(`/api/documents/${doc.id}/download`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = doc.fileName;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const daysRemaining = project ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
    const totalBudget = project?.budgets?.reduce((sum, b) => sum + b.amountINR, 0) || 0;
    const totalUtilized = project?.budgets?.reduce((sum, b) => sum + b.utilized, 0) || 0;

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-10 w-64" />
                <div className="premium-card p-6">
                    <div className="skeleton h-8 w-96 mb-4" />
                    <div className="skeleton h-4 w-full mb-2" />
                    <div className="skeleton h-4 w-3/4" />
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="text-center py-16">
                <FolderRegular className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-secondary-900">Project not found</h2>
                <button onClick={() => navigate('/projects')} className="btn-primary mt-4">
                    Back to Projects
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-start gap-4">
                <button
                    onClick={() => navigate('/projects')}
                    className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                    <ArrowLeftRegular className="w-6 h-6 text-secondary-500" />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm bg-secondary-100 px-3 py-1 rounded-lg">{project.code}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[project.status]}`}>
                            {project.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-secondary-500 bg-secondary-50 px-2 py-1 rounded">
                            {categoryLabels[project.category] || project.category}
                        </span>
                    </div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">{project.title}</h1>
                    <p className="text-secondary-500 mt-1">{project.vertical.name}</p>
                </div>
                <button className="btn-secondary flex items-center gap-2">
                    <EditRegular className="w-5 h-5" />
                    Edit Project
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="premium-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <TargetRegular className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{project.progress}%</p>
                            <p className="text-xs text-secondary-500">Progress</p>
                        </div>
                    </div>
                </div>
                <div className="premium-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                            <ClockRegular className="w-5 h-5 text-success-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{daysRemaining > 0 ? daysRemaining : 0}</p>
                            <p className="text-xs text-secondary-500">Days Left</p>
                        </div>
                    </div>
                </div>
                <div className="premium-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
                            <MoneyRegular className="w-5 h-5 text-warning-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">
                                ₹{(totalBudget / 100000).toFixed(1)}L
                            </p>
                            <p className="text-xs text-secondary-500">Total Budget</p>
                        </div>
                    </div>
                </div>
                <div className="premium-card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                            <PersonRegular className="w-5 h-5 text-accent-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{(project.staff?.length || 0) + 1}</p>
                            <p className="text-xs text-secondary-500">Team Members</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-secondary-100 p-1 rounded-xl w-fit">
                {(['overview', 'documents', 'team', 'budget', 'timeline'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-white shadow-sm text-primary-600' : 'text-secondary-600 hover:text-secondary-900'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Description</h3>
                            <p className="text-secondary-600 whitespace-pre-wrap">
                                {project.description || 'No description provided.'}
                            </p>
                        </div>
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Project Timeline</h3>
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-xs text-secondary-500 mb-1">Start Date</p>
                                    <p className="font-medium text-secondary-900">
                                        {new Date(project.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex-1 h-2 bg-secondary-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-premium rounded-full"
                                        style={{ width: `${project.progress}%` }}
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-secondary-500 mb-1">End Date</p>
                                    <p className="font-medium text-secondary-900">
                                        {new Date(project.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Project Head</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-premium flex items-center justify-center text-white font-semibold">
                                    {project.projectHead.firstName[0]}{project.projectHead.lastName[0]}
                                </div>
                                <div>
                                    <p className="font-medium text-secondary-900">
                                        {project.projectHead.firstName} {project.projectHead.lastName}
                                    </p>
                                    <p className="text-sm text-secondary-500">{project.projectHead.email}</p>
                                </div>
                            </div>
                        </div>
                        <div className="premium-card p-6">
                            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Budget Utilization</h3>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-secondary-900">
                                    {totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0}%
                                </p>
                                <p className="text-sm text-secondary-500">
                                    ₹{(totalUtilized / 100000).toFixed(1)}L of ₹{(totalBudget / 100000).toFixed(1)}L
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'documents' && (
                <div className="premium-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-secondary-900">Project Documents</h3>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <AddRegular className="w-5 h-5" />
                            Upload Document
                        </button>
                    </div>
                    {project.documents && project.documents.length > 0 ? (
                        <div className="space-y-3">
                            {project.documents.map(doc => (
                                <div key={doc.id} className="flex items-center gap-4 p-4 bg-secondary-50 rounded-xl hover:bg-primary-50 transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                                        <DocumentRegular className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-secondary-900">{doc.title}</p>
                                        <p className="text-sm text-secondary-500">
                                            {doc.type} • {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        className="p-2 hover:bg-secondary-200 rounded-lg"
                                    >
                                        <ArrowDownloadRegular className="w-5 h-5 text-secondary-500" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <DocumentRegular className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                            <p className="text-secondary-500">No documents uploaded yet</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'team' && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-6">Team Members</h3>
                    <div className="space-y-3">
                        {/* Project Head */}
                        <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-200">
                            <div className="w-12 h-12 rounded-full bg-gradient-premium flex items-center justify-center text-white font-semibold">
                                {project.projectHead.firstName[0]}{project.projectHead.lastName[0]}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-secondary-900">
                                    {project.projectHead.firstName} {project.projectHead.lastName}
                                </p>
                                <p className="text-sm text-secondary-500">Project Head / PI</p>
                            </div>
                            <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">Lead</span>
                        </div>
                        {/* Staff */}
                        {project.staff?.map(s => (
                            <div key={s.user.id} className="flex items-center gap-4 p-4 bg-secondary-50 rounded-xl">
                                <div className="w-12 h-12 rounded-full bg-secondary-200 flex items-center justify-center text-secondary-600 font-semibold">
                                    {s.user.firstName[0]}{s.user.lastName[0]}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-secondary-900">
                                        {s.user.firstName} {s.user.lastName}
                                    </p>
                                    <p className="text-sm text-secondary-500">{s.user.designation || 'Team Member'}</p>
                                </div>
                            </div>
                        ))}
                        {(!project.staff || project.staff.length === 0) && (
                            <p className="text-center text-secondary-500 py-4">No additional team members</p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'budget' && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-6">Budget Allocation</h3>
                    {project.budgets && project.budgets.length > 0 ? (
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Fiscal Year</th>
                                    <th>Allocated (₹)</th>
                                    <th>Utilized (₹)</th>
                                    <th>Remaining (₹)</th>
                                    <th>Utilization %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.budgets.map(b => (
                                    <tr key={b.id}>
                                        <td className="font-medium">{b.fiscalYear}</td>
                                        <td>₹{(b.amountINR / 100000).toFixed(2)} L</td>
                                        <td>₹{(b.utilized / 100000).toFixed(2)} L</td>
                                        <td>₹{((b.amountINR - b.utilized) / 100000).toFixed(2)} L</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="w-20 h-2 bg-secondary-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary-500 rounded-full"
                                                        style={{ width: `${Math.min(100, (b.utilized / b.amountINR) * 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm">{Math.round((b.utilized / b.amountINR) * 100)}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12">
                            <MoneyRegular className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                            <p className="text-secondary-500">No budget allocations yet</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'timeline' && (
                <div className="premium-card p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-6">Project Milestones</h3>
                    {project.milestones && project.milestones.length > 0 ? (
                        <div className="space-y-4">
                            {project.milestones.map((m, idx) => (
                                <div key={m.id} className="flex items-start gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${m.status === 'COMPLETED' ? 'bg-success-500 text-white' :
                                                m.status === 'IN_PROGRESS' ? 'bg-primary-500 text-white' :
                                                    'bg-secondary-200 text-secondary-500'
                                            }`}>
                                            {m.status === 'COMPLETED' ? (
                                                <CheckmarkCircleRegular className="w-5 h-5" />
                                            ) : (
                                                <span className="text-sm font-medium">{idx + 1}</span>
                                            )}
                                        </div>
                                        {idx < (project.milestones?.length || 0) - 1 && (
                                            <div className="w-0.5 h-12 bg-secondary-200 my-1" />
                                        )}
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <p className="font-medium text-secondary-900">{m.title}</p>
                                        <p className="text-sm text-secondary-500">
                                            {new Date(m.startDate).toLocaleDateString('en-IN')} - {new Date(m.endDate).toLocaleDateString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <CalendarRegular className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
                            <p className="text-secondary-500">No milestones defined yet</p>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-secondary-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-premium-lg w-full max-w-md animate-scale-in">
                        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                            <h3 className="text-xl font-semibold text-secondary-900">Upload Document</h3>
                            <button
                                onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                                className="p-2 hover:bg-secondary-100 rounded-lg"
                            >
                                <DismissRegular className="w-5 h-5 text-secondary-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer ${selectedFile ? 'border-success-500 bg-success-50' : 'border-secondary-300 hover:border-primary-400'
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckmarkCircleRegular className="w-6 h-6 text-success-500" />
                                        <span className="font-medium">{selectedFile.name}</span>
                                    </div>
                                ) : (
                                    <>
                                        <ArrowUploadRegular className="w-8 h-8 mx-auto text-secondary-400 mb-2" />
                                        <p className="text-secondary-600">Click to select file</p>
                                    </>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={uploadForm.title}
                                    onChange={e => setUploadForm({ ...uploadForm, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Type</label>
                                <select
                                    className="input-premium"
                                    value={uploadForm.type}
                                    onChange={e => setUploadForm({ ...uploadForm, type: e.target.value })}
                                >
                                    <option value="REPORT">Report</option>
                                    <option value="PHOTO">Photo</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="PUBLICATION">Publication</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3 p-6 border-t border-secondary-200">
                            <button onClick={() => setShowUploadModal(false)} className="flex-1 btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                className="flex-1 btn-primary"
                                disabled={uploading || !selectedFile}
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
