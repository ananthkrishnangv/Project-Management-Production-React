import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    Calendar,
    Plus,
    Users,
    Clock,
    FileText,
    CheckCircle2,
    XCircle,
    Building,
    MapPin,
    ArrowRight,
    Sparkles,
    AlertCircle,
    X,
    Layers
} from 'lucide-react';

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

export default function RCMeetingsPage() {
    const { accessToken, user } = useAuthStore();
    const [meetings, setMeetings] = useState<RCMeeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showAgendaModal, setShowAgendaModal] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        title: '',
        meetingNumber: '',
        date: '',
        venue: 'Main Auditorium, CSIR-SERC',
        description: '',
    });

    const [agendaForm, setAgendaForm] = useState({
        title: '',
        itemNumber: '1',
        type: 'PROPOSAL_REVIEW',
        presenter: '',
        projectCode: '',
    });

    const canManage = ['ADMIN', 'DIRECTOR', 'SUPERVISOR'].includes(user?.role || '');

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/rc-meetings', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMeetings(data.data || data || []);
            }
        } catch (err) {
            console.error('Failed to load RC meetings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/rc-meetings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    meetingNumber: parseInt(form.meetingNumber) || 78,
                    date: form.date,
                    venue: form.venue,
                    description: form.description,
                }),
            });

            if (res.ok) {
                setShowScheduleModal(false);
                setSuccessMessage('RC Meeting scheduled successfully!');
                fetchMeetings();
                setForm({ title: '', meetingNumber: '', date: '', venue: 'Main Auditorium, CSIR-SERC', description: '' });
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to schedule meeting');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to schedule meeting');
        } finally {
            setSaving(false);
        }
    };

    const handleAddAgenda = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch(`/api/rc-meetings/${selectedMeetingId}/agenda`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(agendaForm),
            });

            if (res.ok) {
                setShowAgendaModal(false);
                setSuccessMessage('Agenda item added successfully!');
                fetchMeetings();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to add agenda item');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to add agenda item');
        } finally {
            setSaving(false);
        }
    };

    const upcomingMeeting = meetings.find(m => m.status === 'SCHEDULED') || {
        id: '1',
        meetingNumber: 78,
        title: '78th Research Council Meeting (Annual Portfolio Review)',
        date: '2026-09-24',
        status: 'SCHEDULED' as const,
        venue: 'Main Auditorium, CSIR-SERC',
        description: 'Comprehensive review of sponsored Grant-in-Aid and bilateral mission projects.',
        agendaItems: [
            { id: '1', itemNumber: 1, title: 'Review of GAP-2026-SHMLE-001 (Bridge Health Monitoring)', type: 'PROJECT_REVIEW', presenter: 'Dr. Saptarshi Sasmal' },
            { id: '2', itemNumber: 2, title: 'Appraisal of Alkali-Activated Slag Concrete Proposal', type: 'PROPOSAL_APPRAISAL', presenter: 'Dr. M.B. Anoop' },
            { id: '3', itemNumber: 3, title: 'Commercialization of Self-Healing Concrete Patent', type: 'TECH_TRANSFER', presenter: 'Dr. K. Ramanjaneyulu' },
        ]
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
                        <Calendar className="w-7 h-7 text-primary-600" />
                        <span>Research Council (RC) Governance</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            RC Session 78
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Convening of Research Council committee, agenda management, and strategic sanctions
                    </p>
                </div>

                {canManage && (
                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="btn-primary-glossy text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule RC Meeting</span>
                    </button>
                )}
            </div>

            {/* 1. Upcoming RC Meeting Hero Banner */}
            <div className="glass-panel p-6 bg-gradient-to-br from-white/95 via-primary-50/30 to-slate-50/90 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="glass-pill text-[10px] font-bold bg-primary-100 text-primary-800 border-primary-200">
                                UPCOMING SESSION
                            </span>
                            <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                RC #{upcomingMeeting.meetingNumber}
                            </span>
                        </div>

                        <h2 className="text-xl font-extrabold text-secondary-900 font-display">
                            {upcomingMeeting.title}
                        </h2>

                        <p className="text-xs text-slate-600 max-w-2xl">
                            {upcomingMeeting.description}
                        </p>

                        <div className="flex items-center gap-5 text-xs text-slate-500 pt-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                <Calendar className="w-4 h-4 text-primary-600" />
                                {new Date(upcomingMeeting.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                {upcomingMeeting.venue || 'Main Auditorium'}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-slate-400" />
                                {upcomingMeeting.agendaItems?.length || 3} Agenda Items
                            </span>
                        </div>
                    </div>

                    <div className="p-4 bg-white/90 rounded-2xl border border-slate-200 text-center shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Date</span>
                        <p className="text-xl font-black text-primary-700 mt-1">{new Date(upcomingMeeting.date).toLocaleDateString()}</p>
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">
                            Quorum Confirmed
                        </span>
                    </div>
                </div>
            </div>

            {/* 2. Agenda Items Section */}
            <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm text-secondary-900">RC Meeting Agenda Items</h3>
                        <p className="text-[11px] text-slate-500">Scheduled presentations and project reviews</p>
                    </div>
                    {canManage && (
                        <button
                            onClick={() => { setSelectedMeetingId(upcomingMeeting.id); setShowAgendaModal(true); }}
                            className="btn-secondary-glossy text-xs"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Agenda Item</span>
                        </button>
                    )}
                </div>

                <div className="space-y-3 pt-2">
                    {(upcomingMeeting.agendaItems || []).map((item) => (
                        <div key={item.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-xl bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                                    {item.itemNumber}
                                </span>
                                <div>
                                    <h4 className="text-xs font-bold text-secondary-900">{item.title}</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Presenter: <b>{item.presenter || 'Principal Investigator'}</b></p>
                                </div>
                            </div>
                            <span className="glass-pill text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                                {item.type}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 3. Schedule Meeting Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Schedule RC Meeting</h3>
                            <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleScheduleMeeting} className="space-y-3 text-xs">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                    <label className="block font-bold text-secondary-800 mb-1">Session Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="e.g. 79th RC Meeting"
                                        className="glass-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Meeting No. *</label>
                                    <input
                                        type="number"
                                        required
                                        value={form.meetingNumber}
                                        onChange={(e) => setForm({ ...form, meetingNumber: e.target.value })}
                                        placeholder="79"
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Venue</label>
                                    <input
                                        type="text"
                                        value={form.venue}
                                        onChange={(e) => setForm({ ...form, venue: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Description / Focus Area</label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Scope of review, key project portfolios to be evaluated..."
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Scheduling...' : 'Schedule Meeting'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
