import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    ArchiveRegular,
    FolderRegular,
    DocumentRegular,
    CalendarRegular,
    SearchRegular,
    ChevronDownRegular,
    ArrowDownloadRegular,
    EyeRegular,
    FilterRegular,
    ClockRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    DismissRegular,
} from '@fluentui/react-icons';

interface ArchivedProject {
    id: string;
    code: string;
    title: string;
    category: string;
    status: string;
    completedAt?: string;
    archivedAt: string;
    projectHead?: { firstName: string; lastName: string };
}

interface ArchivedReport {
    id: string;
    type: string;
    period: string;
    projectCode?: string;
    generatedAt: string;
    downloadUrl?: string;
}

interface ArchivedAgenda {
    id: string;
    meetingNumber: number;
    date: string;
    projectCount: number;
    archivedAt: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ArchivePage() {
    const { accessToken } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'projects' | 'reports' | 'agendas'>('projects');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [yearFilter, setYearFilter] = useState<string>('');

    // Data
    const [projects, setProjects] = useState<ArchivedProject[]>([]);
    const [reports, setReports] = useState<ArchivedReport[]>([]);
    const [agendas, setAgendas] = useState<ArchivedAgenda[]>([]);

    // Preview modal
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewContent, setPreviewContent] = useState<any>(null);

    // Generate year options (last 10 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

    useEffect(() => {
        fetchData();
    }, [activeTab, yearFilter, search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (yearFilter) params.append('year', yearFilter);
            if (search) params.append('search', search);

            if (activeTab === 'projects') {
                params.append('status', 'COMPLETED,CANCELLED');
                const res = await fetch(`${API_BASE}/projects?${params}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data.data || []);
                }
            } else if (activeTab === 'reports') {
                const res = await fetch(`${API_BASE}/reports/archived?${params}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setReports(data || []);
                }
            } else if (activeTab === 'agendas') {
                params.append('status', 'COMPLETED');
                const res = await fetch(`${API_BASE}/rc-meetings?${params}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setAgendas(data.data || []);
                }
            }
        } catch (err) {
            console.error('Failed to fetch archive data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const blob = await res.blob();
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(downloadUrl);
            }
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    const statusColors: Record<string, string> = {
        COMPLETED: 'bg-success-100 text-success-700 border-success-200',
        CANCELLED: 'bg-danger-100 text-danger-700 border-danger-200',
    };

    const typeLabels: Record<string, string> = {
        MONTHLY: 'Monthly Report',
        QUARTERLY: 'Quarterly Report',
        HALF_YEARLY: 'Half-Yearly Report',
        ANNUAL: 'Annual Report',
        COMPLETION: 'Completion Report',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Archive</h1>
                    <p className="text-secondary-500 mt-1">
                        Access completed projects, past reports, and RC meeting agendas
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="premium-card">
                <div className="flex border-b border-secondary-200">
                    {[
                        { id: 'projects', label: 'Completed Projects', icon: FolderRegular },
                        { id: 'reports', label: 'Generated Reports', icon: DocumentRegular },
                        { id: 'agendas', label: 'RC Agendas', icon: CalendarRegular },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50'
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-secondary-100 flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-premium pl-12"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="input-premium pr-10 min-w-[150px]"
                        >
                            <option value="">All Years</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                        <ChevronDownRegular className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="flex items-center gap-4 p-4 border border-secondary-100 rounded-lg">
                                    <div className="skeleton w-12 h-12 rounded-lg" />
                                    <div className="flex-1">
                                        <div className="skeleton h-4 w-1/3 mb-2" />
                                        <div className="skeleton h-3 w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activeTab === 'projects' ? (
                        <div className="space-y-4">
                            {projects.length === 0 ? (
                                <div className="text-center py-12">
                                    <ArchiveRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">No archived projects</h3>
                                    <p className="text-secondary-500">Completed and cancelled projects will appear here</p>
                                </div>
                            ) : (
                                projects.map(project => (
                                    <div
                                        key={project.id}
                                        className="flex items-center gap-4 p-4 border border-secondary-100 rounded-lg hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-gradient-premium flex items-center justify-center text-white">
                                            <FolderRegular className="w-6 h-6" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-sm text-primary-600">{project.code}</span>
                                                <span className={`badge border text-xs ${statusColors[project.status] || 'bg-secondary-100'}`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-secondary-900">{project.title}</h4>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-secondary-500">
                                                <span>{project.projectHead?.firstName} {project.projectHead?.lastName}</span>
                                                <span className="flex items-center gap-1">
                                                    <ClockRegular className="w-4 h-4" />
                                                    Archived: {new Date(project.archivedAt || project.completedAt || '').toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="btn-ghost">
                                            <EyeRegular className="w-5 h-5 mr-1" />
                                            View
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : activeTab === 'reports' ? (
                        <div className="space-y-4">
                            {reports.length === 0 ? (
                                <div className="text-center py-12">
                                    <DocumentRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">No archived reports</h3>
                                    <p className="text-secondary-500">Generated reports will appear here</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {reports.map(report => (
                                        <div
                                            key={report.id}
                                            className="p-4 border border-secondary-100 rounded-lg hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2 rounded-lg bg-primary-100">
                                                    <DocumentRegular className="w-6 h-6 text-primary-600" />
                                                </div>
                                                <span className="text-xs text-secondary-500">
                                                    {new Date(report.generatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h4 className="font-medium text-secondary-900 mb-1">
                                                {typeLabels[report.type] || report.type}
                                            </h4>
                                            <p className="text-sm text-secondary-500 mb-3">
                                                Period: {report.period}
                                            </p>
                                            {report.projectCode && (
                                                <p className="text-xs text-primary-600 font-mono mb-3">
                                                    {report.projectCode}
                                                </p>
                                            )}
                                            <button
                                                onClick={() => report.downloadUrl && handleDownload(report.downloadUrl, `report_${report.id}.pdf`)}
                                                className="btn-ghost text-sm w-full"
                                            >
                                                <ArrowDownloadRegular className="w-4 h-4 mr-1" />
                                                Download
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {agendas.length === 0 ? (
                                <div className="text-center py-12">
                                    <CalendarRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">No archived agendas</h3>
                                    <p className="text-secondary-500">Past RC meeting agendas will appear here</p>
                                </div>
                            ) : (
                                agendas.map(agenda => (
                                    <div
                                        key={agenda.id}
                                        className="flex items-center gap-4 p-4 border border-secondary-100 rounded-lg hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
                                    >
                                        <div className="w-12 h-12 rounded-lg bg-accent-100 flex items-center justify-center">
                                            <CalendarRegular className="w-6 h-6 text-accent-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-secondary-900">
                                                RC Meeting #{agenda.meetingNumber}
                                            </h4>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-secondary-500">
                                                <span>{new Date(agenda.date).toLocaleDateString()}</span>
                                                <span>{agenda.projectCount} projects</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="btn-ghost">
                                                <EyeRegular className="w-5 h-5 mr-1" />
                                                View
                                            </button>
                                            <button className="btn-ghost">
                                                <ArrowDownloadRegular className="w-5 h-5 mr-1" />
                                                PDF
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-success-100">
                            <CheckmarkCircleRegular className="w-8 h-8 text-success-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{projects.filter(p => p.status === 'COMPLETED').length}</p>
                            <p className="text-sm text-secondary-500">Completed Projects</p>
                        </div>
                    </div>
                </div>
                <div className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-primary-100">
                            <DocumentRegular className="w-8 h-8 text-primary-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{reports.length}</p>
                            <p className="text-sm text-secondary-500">Generated Reports</p>
                        </div>
                    </div>
                </div>
                <div className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-accent-100">
                            <CalendarRegular className="w-8 h-8 text-accent-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-secondary-900">{agendas.length}</p>
                            <p className="text-sm text-secondary-500">RC Meetings Held</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
