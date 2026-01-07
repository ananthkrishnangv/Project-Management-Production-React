import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    DocumentRegular,
    AddRegular,
    SearchRegular,
    FilterRegular,
    ArrowDownloadRegular,
    FolderRegular,
    ImageRegular,
    VideoRegular,
    DocumentPdfRegular,
    GridRegular,
    ListRegular,
    EyeRegular,
    DeleteRegular,
    ShareRegular,
    AlertRegular,
    CheckmarkCircleRegular,
    DismissRegular,
    ArrowUploadRegular,
} from '@fluentui/react-icons';

interface Document {
    id: string;
    title: string;
    fileName: string;
    type: 'REPORT' | 'MOU' | 'PHOTO' | 'VIDEO' | 'PUBLICATION' | 'PATENT' | 'OTHER';
    description?: string;
    projectId?: string;
    project?: { code: string; title: string };
    uploadedBy?: { firstName: string; lastName: string };
    createdAt: string;
    fileSize: number;
    mimeType: string;
    sha256Hash?: string;
}

interface Project {
    id: string;
    code: string;
    title: string;
}

const typeIcons: Record<string, typeof DocumentRegular> = {
    REPORT: DocumentPdfRegular,
    MOU: DocumentRegular,
    PHOTO: ImageRegular,
    VIDEO: VideoRegular,
    PUBLICATION: DocumentRegular,
    PATENT: DocumentRegular,
    OTHER: FolderRegular,
};

const typeColors: Record<string, string> = {
    REPORT: 'bg-primary-100 text-primary-700',
    MOU: 'bg-warning-100 text-warning-700',
    PHOTO: 'bg-success-100 text-success-700',
    VIDEO: 'bg-purple-100 text-purple-700',
    PUBLICATION: 'bg-accent-100 text-accent-700',
    PATENT: 'bg-danger-100 text-danger-700',
    OTHER: 'bg-secondary-100 text-secondary-700',
};

const formatFileSize = (bytes: number) => {
    if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
    if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
    return `${bytes} B`;
};

export default function DocumentsPage() {
    const { accessToken, user } = useAuthStore();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadForm, setUploadForm] = useState({
        title: '',
        type: 'REPORT' as string,
        description: '',
        projectId: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDocuments();
        fetchProjects();
    }, []);

    const fetchDocuments = async () => {
        try {
            const res = await fetch('/api/documents/', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const result = await res.json();
                // API returns { data: documents, pagination: {...} }
                setDocuments(Array.isArray(result.data) ? result.data : []);
            }
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects?limit=100', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects || data || []);
            }
        } catch (error) {
            console.error('Failed to fetch projects:', error);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setSelectedFile(droppedFile);
            if (!uploadForm.title) {
                setUploadForm(prev => ({ ...prev, title: droppedFile.name.replace(/\.[^.]+$/, '') }));
            }
        }
    }, [uploadForm.title]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0]);
            if (!uploadForm.title) {
                setUploadForm(prev => ({ ...prev, title: e.target.files![0].name.replace(/\.[^.]+$/, '') }));
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !uploadForm.title || !uploadForm.type) {
            setUploadError('Please select a file and provide title and type');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', uploadForm.title);
            formData.append('type', uploadForm.type);
            if (uploadForm.description) formData.append('description', uploadForm.description);
            if (uploadForm.projectId) formData.append('projectId', uploadForm.projectId);

            const res = await fetch('/api/documents/', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                body: formData,
            });

            if (res.ok) {
                setShowUploadModal(false);
                setSelectedFile(null);
                setUploadForm({ title: '', type: 'REPORT', description: '', projectId: '' });
                fetchDocuments();
            } else {
                const data = await res.json();
                setUploadError(data.error || 'Upload failed');
            }
        } catch (error: any) {
            setUploadError(error.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: Document) => {
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

    const handleDelete = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;

        try {
            const res = await fetch(`/api/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                fetchDocuments();
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.project?.code || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !typeFilter || doc.type === typeFilter;
        return matchesSearch && matchesType;
    });

    const stats = {
        total: documents.length,
        reports: documents.filter(d => d.type === 'REPORT').length,
        mous: documents.filter(d => d.type === 'MOU').length,
        publications: documents.filter(d => d.type === 'PUBLICATION').length,
    };

    const canDelete = user?.role && ['ADMIN', 'DIRECTOR', 'SUPERVISOR', 'PROJECT_HEAD'].includes(user.role);

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-64" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="premium-card p-6">
                            <div className="skeleton h-12 w-12 rounded-xl mb-3" />
                            <div className="skeleton h-4 w-16" />
                        </div>
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
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Document Management</h1>
                    <p className="text-secondary-500 mt-1">Manage project documents, MoUs, publications, and media</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <AddRegular className="w-5 h-5" />
                    Upload Document
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="premium-card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-primary-100 flex items-center justify-center mb-2">
                        <DocumentRegular className="w-5 h-5 text-primary-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{stats.total}</p>
                    <p className="text-xs text-secondary-500">Total Documents</p>
                </div>
                <div className="premium-card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-success-100 flex items-center justify-center mb-2">
                        <DocumentPdfRegular className="w-5 h-5 text-success-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{stats.reports}</p>
                    <p className="text-xs text-secondary-500">Reports</p>
                </div>
                <div className="premium-card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-warning-100 flex items-center justify-center mb-2">
                        <DocumentRegular className="w-5 h-5 text-warning-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{stats.mous}</p>
                    <p className="text-xs text-secondary-500">MoUs</p>
                </div>
                <div className="premium-card p-4 text-center">
                    <div className="w-10 h-10 mx-auto rounded-lg bg-accent-100 flex items-center justify-center mb-2">
                        <DocumentRegular className="w-5 h-5 text-accent-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{stats.publications}</p>
                    <p className="text-xs text-secondary-500">Publications</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="premium-card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search documents by name or project code..."
                            className="input-premium pl-12"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <FilterRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <select
                            className="input-premium pl-12 min-w-44"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="REPORT">Reports</option>
                            <option value="MOU">MoUs</option>
                            <option value="PHOTO">Photos</option>
                            <option value="VIDEO">Videos</option>
                            <option value="PUBLICATION">Publications</option>
                            <option value="PATENT">Patents</option>
                        </select>
                    </div>
                    <div className="flex border border-secondary-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-3 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'bg-white text-secondary-500'}`}
                        >
                            <GridRegular className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-3 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-secondary-500'}`}
                        >
                            <ListRegular className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Document List/Grid */}
            {viewMode === 'list' ? (
                <div className="premium-card overflow-hidden">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Document</th>
                                <th>Type</th>
                                <th>Project</th>
                                <th>Uploaded By</th>
                                <th>Size</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDocuments.map(doc => {
                                const Icon = typeIcons[doc.type] || DocumentRegular;
                                return (
                                    <tr key={doc.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg ${typeColors[doc.type] || typeColors.OTHER} flex items-center justify-center`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-secondary-900 truncate max-w-xs">{doc.title}</p>
                                                    <p className="text-xs text-secondary-500">{doc.fileName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[doc.type] || typeColors.OTHER}`}>
                                                {doc.type}
                                            </span>
                                        </td>
                                        <td>
                                            {doc.project?.code && (
                                                <span className="font-mono text-sm bg-secondary-100 px-2 py-1 rounded">
                                                    {doc.project.code}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-secondary-600">
                                            {doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : 'Unknown'}
                                        </td>
                                        <td className="text-secondary-500">{formatFileSize(doc.fileSize)}</td>
                                        <td className="text-secondary-500">
                                            {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-2 hover:bg-secondary-100 rounded-lg"
                                                    title="Download"
                                                >
                                                    <ArrowDownloadRegular className="w-4 h-4 text-secondary-500" />
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(doc.id)}
                                                        className="p-2 hover:bg-danger-100 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <DeleteRegular className="w-4 h-4 text-danger-500" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredDocuments.length === 0 && (
                        <div className="p-12 text-center">
                            <DocumentRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No documents found</h3>
                            <p className="text-secondary-500">Upload your first document to get started</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDocuments.map(doc => {
                        const Icon = typeIcons[doc.type] || DocumentRegular;
                        return (
                            <div key={doc.id} className="premium-card p-4 group">
                                <div className={`w-full h-32 rounded-xl ${typeColors[doc.type] || typeColors.OTHER} flex items-center justify-center mb-4`}>
                                    <Icon className="w-12 h-12 opacity-50" />
                                </div>
                                <h4 className="font-medium text-secondary-900 truncate">{doc.title}</h4>
                                <p className="text-sm text-secondary-500 mt-1">{formatFileSize(doc.fileSize)}</p>
                                {doc.project?.code && (
                                    <p className="text-xs font-mono bg-secondary-100 px-2 py-1 rounded mt-2 inline-block">
                                        {doc.project.code}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleDownload(doc)}
                                        className="flex-1 btn-primary py-2 text-sm"
                                    >
                                        Download
                                    </button>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-2 bg-danger-100 text-danger-600 rounded-lg"
                                        >
                                            <DeleteRegular className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredDocuments.length === 0 && (
                        <div className="col-span-full premium-card p-12 text-center">
                            <DocumentRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No documents found</h3>
                            <p className="text-secondary-500">Upload your first document to get started</p>
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-secondary-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-premium-lg w-full max-w-lg animate-scale-in">
                        <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                            <h3 className="text-xl font-semibold text-secondary-900">Upload Document</h3>
                            <button
                                onClick={() => { setShowUploadModal(false); setSelectedFile(null); setUploadError(''); }}
                                className="p-2 hover:bg-secondary-100 rounded-lg"
                            >
                                <DismissRegular className="w-5 h-5 text-secondary-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Drop Zone */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver
                                    ? 'border-primary-500 bg-primary-50'
                                    : selectedFile
                                        ? 'border-success-500 bg-success-50'
                                        : 'border-secondary-300 hover:border-primary-400'
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <CheckmarkCircleRegular className="w-8 h-8 text-success-500" />
                                        <div className="text-left">
                                            <p className="font-medium text-secondary-900">{selectedFile.name}</p>
                                            <p className="text-sm text-secondary-500">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <ArrowUploadRegular className="w-10 h-10 mx-auto text-secondary-400 mb-2" />
                                        <p className="font-medium text-secondary-700">Drag & drop or click to select</p>
                                        <p className="text-sm text-secondary-500 mt-1">PDF, images, videos, documents</p>
                                    </>
                                )}
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={uploadForm.title}
                                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    placeholder="Document title"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Type *</label>
                                <select
                                    className="input-premium"
                                    value={uploadForm.type}
                                    onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                >
                                    <option value="REPORT">Report</option>
                                    <option value="MOU">MoU</option>
                                    <option value="PHOTO">Photo</option>
                                    <option value="VIDEO">Video</option>
                                    <option value="PUBLICATION">Publication</option>
                                    <option value="PATENT">Patent</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {/* Project */}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Link to Project (optional)</label>
                                <select
                                    className="input-premium"
                                    value={uploadForm.projectId}
                                    onChange={(e) => setUploadForm({ ...uploadForm, projectId: e.target.value })}
                                >
                                    <option value="">No project</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                                <textarea
                                    className="input-premium"
                                    rows={2}
                                    value={uploadForm.description}
                                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>

                            {/* Error */}
                            {uploadError && (
                                <div className="p-3 bg-danger-50 text-danger-700 rounded-lg text-sm">
                                    {uploadError}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 p-6 border-t border-secondary-200">
                            <button
                                onClick={() => { setShowUploadModal(false); setSelectedFile(null); setUploadError(''); }}
                                className="flex-1 btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                className="flex-1 btn-primary flex items-center justify-center gap-2"
                                disabled={uploading || !selectedFile}
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <ArrowUploadRegular className="w-5 h-5" />
                                        Upload
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
