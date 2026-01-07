import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    CalendarRegular,
    AddRegular,
    PeopleRegular,
    DocumentRegular,
    ClockRegular,
    CheckmarkCircleRegular,
    ArrowRightRegular,
    EditRegular,
    BookRegular,
    VideoRegular,
    DismissRegular,
    ArrowDownloadRegular,
    SaveRegular,
} from '@fluentui/react-icons';

interface RCMeeting {
    id: string;
    meetingNumber: number;
    title: string;
    date: string;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    venue: string | null;
    description: string | null;
    agendaItems?: AgendaItem[];
}

interface AgendaItem {
    id: string;
    itemNumber: number;
    title: string;
    type: string;
    presenter: string | null;
    projectCode?: string;
    projectTitle?: string;
}

interface Project {
    id: string;
    code: string;
    title: string;
    status: string;
}

const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-primary-100 text-primary-700',
    IN_PROGRESS: 'bg-warning-100 text-warning-700',
    COMPLETED: 'bg-success-100 text-success-700',
    CANCELLED: 'bg-secondary-100 text-secondary-700',
};

const statusLabels: Record<string, string> = {
    SCHEDULED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function RCMeetingsPage() {
    const { accessToken, user } = useAuthStore();
    const [meetings, setMeetings] = useState<RCMeeting[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showAgendaModal, setShowAgendaModal] = useState(false);
    const [showAgendaBookModal, setShowAgendaBookModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<RCMeeting | null>(null);
    const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        date: '',
        venue: '',
        description: '',
    });

    const canManage = ['ADMIN', 'DIRECTOR', 'DIRECTOR_GENERAL', 'SUPERVISOR'].includes(user?.role || '');

    useEffect(() => {
        fetchMeetings();
        fetchProjects();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/rc-meetings`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setMeetings(data);
            } else {
                // Use mock data if API not available
                setMeetings([
                    { id: '1', meetingNumber: 176, title: '176th Research Council Meeting', date: '2025-02-15', status: 'SCHEDULED', venue: 'Conference Hall, CSIR-SERC', description: null },
                    { id: '2', meetingNumber: 175, title: '175th Research Council Meeting', date: '2025-01-20', status: 'SCHEDULED', venue: 'Conference Hall, CSIR-SERC', description: null },
                    { id: '3', meetingNumber: 174, title: '174th Research Council Meeting', date: '2024-10-15', status: 'COMPLETED', venue: 'Conference Hall, CSIR-SERC', description: null },
                ]);
            }
        } catch (err) {
            console.error('Failed to fetch meetings:', err);
            setMeetings([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/projects?limit=100`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setProjects(data.projects || data || []);
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        }
    };

    const handleScheduleMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const nextNumber = Math.max(...meetings.map(m => m.meetingNumber), 0) + 1;

            const response = await fetch(`${API_BASE}/rc-meetings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    ...formData,
                    meetingNumber: nextNumber,
                }),
            });

            if (response.ok) {
                setShowScheduleModal(false);
                setFormData({ title: '', date: '', venue: '', description: '' });
                fetchMeetings();
            } else {
                // Add locally for demo
                const newMeeting: RCMeeting = {
                    id: Date.now().toString(),
                    meetingNumber: nextNumber,
                    title: formData.title || `${nextNumber}th Research Council Meeting`,
                    date: formData.date,
                    status: 'SCHEDULED',
                    venue: formData.venue,
                    description: formData.description,
                };
                setMeetings([newMeeting, ...meetings]);
                setShowScheduleModal(false);
                setFormData({ title: '', date: '', venue: '', description: '' });
            }
        } catch (err) {
            console.error('Failed to schedule meeting:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleViewAgenda = (meeting: RCMeeting) => {
        setSelectedMeeting(meeting);
        setShowAgendaModal(true);
    };

    const handleGenerateAgendaBook = (meeting: RCMeeting) => {
        setSelectedMeeting(meeting);
        setSelectedProjects([]);
        setShowAgendaBookModal(true);
    };

    const downloadAgendaBook = async () => {
        if (!selectedMeeting) return;
        setGenerating(true);

        try {
            // In production, this would call an API to generate PDF
            const response = await fetch(`${API_BASE}/rc-meetings/${selectedMeeting.id}/agenda-book`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ projectIds: selectedProjects }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `RC_${selectedMeeting.meetingNumber}_Agenda_Book.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // Demo: show alert
                alert(`Agenda Book for RC Meeting #${selectedMeeting.meetingNumber} would be generated with ${selectedProjects.length} selected projects.`);
            }
        } catch (err) {
            alert(`Generating Agenda Book for RC Meeting #${selectedMeeting.meetingNumber}...`);
        } finally {
            setGenerating(false);
            setShowAgendaBookModal(false);
        }
    };

    const upcomingMeetings = meetings.filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
    const pastMeetings = meetings.filter(m => m.status === 'COMPLETED' || m.status === 'CANCELLED');

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="premium-card p-6">
                            <div className="skeleton h-4 w-32 mb-2" />
                            <div className="skeleton h-8 w-16" />
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
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Research Council Meetings</h1>
                    <p className="text-secondary-500 mt-1">Manage RC meetings, agendas, and minutes</p>
                </div>
                {canManage && (
                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <AddRegular className="w-5 h-5" />
                        Schedule Meeting
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="premium-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                        <CalendarRegular className="w-6 h-6 text-primary-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{meetings.length}</p>
                    <p className="text-sm text-secondary-500">Total Meetings</p>
                </div>
                <div className="premium-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-success-100 flex items-center justify-center mb-3">
                        <ClockRegular className="w-6 h-6 text-success-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{upcomingMeetings.length}</p>
                    <p className="text-sm text-secondary-500">Upcoming</p>
                </div>
                <div className="premium-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-accent-100 flex items-center justify-center mb-3">
                        <CheckmarkCircleRegular className="w-6 h-6 text-accent-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{pastMeetings.length}</p>
                    <p className="text-sm text-secondary-500">Completed</p>
                </div>
                <div className="premium-card p-6 text-center">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-warning-100 flex items-center justify-center mb-3">
                        <BookRegular className="w-6 h-6 text-warning-600" />
                    </div>
                    <p className="text-2xl font-bold text-secondary-900">{projects.length}</p>
                    <p className="text-sm text-secondary-500">Active Projects</p>
                </div>
            </div>

            {/* Upcoming Meetings */}
            {upcomingMeetings.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold text-secondary-900 mb-4">Upcoming Meetings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {upcomingMeetings.map(meeting => (
                            <div key={meeting.id} className="premium-card p-6 border-l-4 border-primary-500">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[meeting.status]}`}>
                                                {statusLabels[meeting.status]}
                                            </span>
                                            <span className="text-sm text-secondary-500">#{meeting.meetingNumber}</span>
                                        </div>
                                        <h3 className="font-semibold text-secondary-900 text-lg">{meeting.title}</h3>
                                        <div className="mt-3 space-y-1">
                                            <p className="text-sm text-secondary-600 flex items-center gap-2">
                                                <CalendarRegular className="w-4 h-4" />
                                                {new Date(meeting.date).toLocaleDateString('en-IN', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-sm text-secondary-600 flex items-center gap-2">
                                                <VideoRegular className="w-4 h-4" />
                                                {meeting.venue || 'TBD'}
                                            </p>
                                        </div>
                                    </div>
                                    {canManage && (
                                        <button className="btn-ghost p-2">
                                            <EditRegular className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => handleViewAgenda(meeting)}
                                        className="btn-secondary flex-1 text-sm py-2"
                                    >
                                        <DocumentRegular className="w-4 h-4 mr-1" />
                                        View Agenda
                                    </button>
                                    {canManage && (
                                        <button
                                            onClick={() => handleGenerateAgendaBook(meeting)}
                                            className="btn-primary flex-1 text-sm py-2"
                                        >
                                            <BookRegular className="w-4 h-4 mr-1" />
                                            Generate Agenda Book
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Past Meetings */}
            <div>
                <h2 className="text-lg font-semibold text-secondary-900 mb-4">Meeting History</h2>
                <div className="premium-card overflow-hidden">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Meeting #</th>
                                <th>Title</th>
                                <th>Date</th>
                                <th>Venue</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pastMeetings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-secondary-500">
                                        No completed meetings yet
                                    </td>
                                </tr>
                            ) : (
                                pastMeetings.map(meeting => (
                                    <tr key={meeting.id}>
                                        <td>
                                            <span className="font-mono font-medium">#{meeting.meetingNumber}</span>
                                        </td>
                                        <td className="font-medium text-secondary-900">{meeting.title}</td>
                                        <td className="text-secondary-600">
                                            {new Date(meeting.date).toLocaleDateString('en-IN')}
                                        </td>
                                        <td className="text-secondary-600">{meeting.venue || '-'}</td>
                                        <td>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[meeting.status]}`}>
                                                {statusLabels[meeting.status]}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewAgenda(meeting)}
                                                    className="btn-ghost text-sm"
                                                >
                                                    Agenda
                                                </button>
                                                <button className="btn-ghost text-sm flex items-center gap-1">
                                                    Minutes <ArrowRightRegular className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Meeting Modal */}
            {showScheduleModal && (
                <div className="modal-backdrop" onClick={() => setShowScheduleModal(false)}>
                    <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-secondary-900">Schedule RC Meeting</h2>
                            <button onClick={() => setShowScheduleModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <DismissRegular className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleScheduleMeeting} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Meeting Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={`${Math.max(...meetings.map(m => m.meetingNumber), 0) + 1}th Research Council Meeting`}
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Date *</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Venue *</label>
                                <input
                                    type="text"
                                    value={formData.venue}
                                    onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                    placeholder="Conference Hall, CSIR-SERC"
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="input-premium"
                                    placeholder="Meeting description or notes..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? 'Scheduling...' : 'Schedule Meeting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Agenda Modal */}
            {showAgendaModal && selectedMeeting && (
                <div className="modal-backdrop" onClick={() => setShowAgendaModal(false)}>
                    <div className="modal-content max-w-3xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-secondary-900">Meeting Agenda</h2>
                                <p className="text-sm text-secondary-500 mt-1">RC Meeting #{selectedMeeting.meetingNumber}</p>
                            </div>
                            <button onClick={() => setShowAgendaModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <DismissRegular className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="bg-secondary-50 rounded-xl p-6 text-center">
                                <BookRegular className="w-12 h-12 mx-auto text-secondary-400 mb-3" />
                                <h3 className="font-semibold text-secondary-900 mb-2">Agenda Items</h3>
                                <p className="text-secondary-500 mb-4">
                                    Add projects and topics to the meeting agenda
                                </p>
                                {canManage && (
                                    <button className="btn-primary">
                                        <AddRegular className="w-4 h-4 mr-2" />
                                        Add Agenda Item
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Generate Agenda Book Modal */}
            {showAgendaBookModal && selectedMeeting && (
                <div className="modal-backdrop" onClick={() => setShowAgendaBookModal(false)}>
                    <div className="modal-content max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-secondary-900">Generate Agenda Book</h2>
                                <p className="text-sm text-secondary-500 mt-1">
                                    Select projects to include in RC Meeting #{selectedMeeting.meetingNumber} Agenda Book
                                </p>
                            </div>
                            <button onClick={() => setShowAgendaBookModal(false)} className="p-2 hover:bg-secondary-100 rounded-lg">
                                <DismissRegular className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-auto">
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-sm text-secondary-600">
                                    Selected: <span className="font-semibold">{selectedProjects.length}</span> projects
                                </p>
                                <button
                                    onClick={() => setSelectedProjects(projects.map(p => p.id))}
                                    className="btn-ghost text-sm"
                                >
                                    Select All
                                </button>
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {projects.map(project => (
                                    <label
                                        key={project.id}
                                        className="flex items-center gap-3 p-3 border border-secondary-200 rounded-xl hover:bg-secondary-50 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedProjects.includes(project.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedProjects([...selectedProjects, project.id]);
                                                } else {
                                                    setSelectedProjects(selectedProjects.filter(id => id !== project.id));
                                                }
                                            }}
                                            className="w-4 h-4 text-primary-600"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-secondary-900">{project.code}</p>
                                            <p className="text-sm text-secondary-600 truncate">{project.title}</p>
                                        </div>
                                        <span className={`badge ${project.status === 'ACTIVE' ? 'badge-success' :
                                                project.status === 'COMPLETED' ? 'badge-secondary' : 'badge-warning'
                                            }`}>
                                            {project.status}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-secondary-100 flex justify-end gap-3">
                            <button onClick={() => setShowAgendaBookModal(false)} className="btn-secondary">
                                Cancel
                            </button>
                            <button
                                onClick={downloadAgendaBook}
                                disabled={selectedProjects.length === 0 || generating}
                                className="btn-primary flex items-center gap-2"
                            >
                                <ArrowDownloadRegular className="w-5 h-5" />
                                {generating ? 'Generating...' : 'Generate PDF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
