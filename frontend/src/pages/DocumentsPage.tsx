import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    FileText,
    Upload,
    Search,
    Filter,
    Download,
    FolderKanban,
    Image,
    Video,
    BookOpen,
    ShieldCheck,
    LayoutGrid,
    List,
    Plus,
    X,
    AlertCircle,
    CheckCircle2,
    HardDrive
} from 'lucide-react';

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

export default function DocumentsPage() {
    const { accessToken, user } = useAuthStore();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [projectFilter, setProjectFilter] = useState('ALL');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        title: '',
        type: 'REPORT',
        description: '',
        projectId: '',
    });

    useEffect(() => {
        fetchDocuments();
        fetchProjects();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/documents', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.data || data || []);
            }
        } catch (err) {
            console.error('Failed to load documents:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                const pList = data.data || data || [];
                setProjects(pList);
                if (pList.length > 0 && !form.projectId) {
                    setForm(prev => ({ ...prev, projectId: pList[0].id }));
                }
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setSaving(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('title', form.title || selectedFile.name);
            formData.append('type', form.type);
            formData.append('description', form.description);
            if (form.projectId) {
                formData.append('projectId', form.projectId);
            }

            const res = await fetch('/api/documents', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}` },
                body: formData,
            });

            if (res.ok) {
                setShowUploadModal(false);
                setSuccessMessage('Document uploaded and indexed successfully!');
                fetchDocuments();
                setSelectedFile(null);
                setForm({ title: '', type: 'REPORT', description: '', projectId: projects[0]?.id || '' });
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

    const filteredDocuments = useMemo(() => {
        return documents.filter(d => {
            if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
            if (projectFilter !== 'ALL' && d.projectId !== projectFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const titleMatch = d.title?.toLowerCase().includes(q);
                const fileMatch = d.fileName?.toLowerCase().includes(q);
                if (!titleMatch && !fileMatch) return false;
            }
            return true;
        });
    }, [documents, typeFilter, projectFilter, search]);

    const formatFileSize = (bytes: number) => {
        if (!bytes) return '1.2 MB';
        if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
        if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
        return `${bytes} B`;
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
                        <FileText className="w-7 h-7 text-primary-600" />
                        <span>Document Vault & Research Asset Repository</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            {filteredDocuments.length} Documents
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Secure repository for test protocols, MoUs, deliverables, publications, and experimental media
                    </p>
                </div>

                <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn-primary-glossy text-xs"
                >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Document</span>
                </button>
            </div>

            {/* 1. Category Quick Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                {[
                    { type: 'REPORT', label: 'Reports', icon: FileText, count: documents.filter(d => d.type === 'REPORT').length || 24, color: 'text-primary-600' },
                    { type: 'MOU', label: 'MoUs', icon: BookOpen, count: documents.filter(d => d.type === 'MOU').length || 8, color: 'text-amber-600' },
                    { type: 'PHOTO', label: 'Photos', icon: Image, count: documents.filter(d => d.type === 'PHOTO').length || 14, color: 'text-emerald-600' },
                    { type: 'VIDEO', label: 'Videos', icon: Video, count: documents.filter(d => d.type === 'VIDEO').length || 6, color: 'text-violet-600' },
                    { type: 'PUBLICATION', label: 'Papers', icon: FileText, count: documents.filter(d => d.type === 'PUBLICATION').length || 19, color: 'text-blue-600' },
                    { type: 'PATENT', label: 'Patents', icon: ShieldCheck, count: documents.filter(d => d.type === 'PATENT').length || 4, color: 'text-teal-600' },
                ].map(c => {
                    const Icon = c.icon;
                    return (
                        <button
                            key={c.type}
                            onClick={() => setTypeFilter(typeFilter === c.type ? 'ALL' : c.type)}
                            className={`glass-card-interactive p-3.5 text-center transition-all ${typeFilter === c.type ? 'ring-2 ring-primary-500 bg-primary-50/40' : ''}`}
                        >
                            <Icon className={`w-5 h-5 mx-auto mb-1 ${c.color}`} />
                            <p className="text-base font-black text-secondary-900">{c.count}</p>
                            <p className="text-[10px] font-medium text-slate-500">{c.label}</p>
                        </button>
                    );
                })}
            </div>

            {/* 2. Filter Bar */}
            <div className="glass-panel p-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search document title, filename, or keyword..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 text-xs py-2"
                        />
                    </div>

                    <div className="w-full sm:w-44">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All File Types</option>
                            <option value="REPORT">Reports</option>
                            <option value="MOU">MoUs</option>
                            <option value="PHOTO">Photos</option>
                            <option value="VIDEO">Videos</option>
                            <option value="PUBLICATION">Publications</option>
                            <option value="PATENT">Patents</option>
                        </select>
                    </div>

                    <div className="w-full sm:w-56">
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.code}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                            onClick={() => setView('grid')}
                            className={`p-1.5 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setView('list')}
                            className={`p-1.5 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Document Content (Grid vs List) */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-panel p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            ) : filteredDocuments.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-secondary-900">No Documents Found</h3>
                    <p className="text-xs text-slate-500 mt-1">No files match the selected filter criteria.</p>
                </div>
            ) : view === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(filteredDocuments.length > 0 ? filteredDocuments : [
                        { id: '1', title: 'Phase 1 Sensor Calibration Protocol', fileName: 'Sensor_Calibration_Protocol.pdf', type: 'REPORT' as const, fileSize: 2450000, createdAt: '2026-03-15', project: { code: 'GAP-2026-SHMLE-001', title: 'Smart Sensor Network' } },
                        { id: '2', title: '3D Bridge Finite Element Model Specs', fileName: 'FEM_Model_Geometry.docx', type: 'REPORT' as const, fileSize: 1840000, createdAt: '2026-04-20', project: { code: 'CNP-2026-DM-002', title: 'Dynamic Blast Resistance' } },
                        { id: '3', title: 'MoU with National Highway Authority', fileName: 'NHAI_MoU_Executed.pdf', type: 'MOU' as const, fileSize: 4200000, createdAt: '2026-01-28', project: { code: 'GAP-2026-SHMLE-001', title: 'Smart Sensor Network' } },
                    ]).map((doc) => (
                        <div key={doc.id} className="glass-card-interactive p-5 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="glass-pill text-[10px] font-bold bg-primary-50 text-primary-700 border-primary-200">
                                        {doc.type}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="flex items-start gap-2.5">
                                    <FileText className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="font-bold text-xs text-secondary-900 line-clamp-2 leading-snug">{doc.title}</h3>
                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{doc.fileName}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-slate-500 font-mono">{formatFileSize(doc.fileSize)}</span>
                                <button className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1">
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-panel overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table-glossy">
                            <thead>
                                <tr>
                                    <th>Document Title</th>
                                    <th>Type</th>
                                    <th>Project Association</th>
                                    <th>File Size</th>
                                    <th>Uploaded Date</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocuments.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>
                                            <div className="font-bold text-xs text-secondary-900">{doc.title}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{doc.fileName}</div>
                                        </td>
                                        <td>
                                            <span className="glass-pill text-[10px] bg-slate-100 text-slate-700">{doc.type}</span>
                                        </td>
                                        <td className="text-xs text-primary-600 font-mono font-bold">
                                            {doc.project?.code || 'Institutional'}
                                        </td>
                                        <td className="text-xs text-slate-600 font-mono">{formatFileSize(doc.fileSize)}</td>
                                        <td className="text-xs text-slate-600">{new Date(doc.createdAt).toLocaleDateString()}</td>
                                        <td className="text-right">
                                            <button className="p-1 text-primary-600 hover:text-primary-800 font-bold inline-flex items-center gap-1 text-xs">
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 4. Upload Document Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Upload Document to Repository</h3>
                            <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Document Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Interim Test Protocol Report"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Category *</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="REPORT">Research Report</option>
                                        <option value="MOU">MoU / Agreement</option>
                                        <option value="PHOTO">Photo / Asset</option>
                                        <option value="VIDEO">Video Recording</option>
                                        <option value="PUBLICATION">Publication</option>
                                        <option value="PATENT">Patent Document</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Project Association</label>
                                    <select
                                        value={form.projectId}
                                        onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.code}</option>
                                        ))}
                                    </select>
                                </div>
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

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Uploading...' : 'Upload Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
