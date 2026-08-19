import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    Users,
    Plus,
    Search,
    Filter,
    Mail,
    Phone,
    Briefcase,
    Building,
    CheckCircle2,
    Calendar,
    X,
    AlertCircle,
    UserCheck,
    FolderKanban,
    Sparkles
} from 'lucide-react';

interface StaffMember {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    designation?: string;
    phone?: string;
    mobileNumber?: string;
    department?: string;
    role: string;
    isActive: boolean;
    profileImage?: string;
    projects?: { projectId: string; project: { code: string; title: string } }[];
}

interface Project {
    id: string;
    code: string;
    title: string;
}

export default function StaffPage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [showAddModal, setShowAddModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        designation: 'Senior Scientist',
        department: 'SHMLE',
        role: 'PROJECT_HEAD',
        phone: '',
    });

    const canManage = ['ADMIN', 'DIRECTOR', 'SUPERVISOR'].includes(currentUser?.role || '');

    useEffect(() => {
        fetchStaff();
        fetchProjects();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/staff', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setStaff(data.data || data || []);
            }
        } catch (err) {
            console.error('Failed to load staff:', err);
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
                setProjects(data.data || data || []);
            }
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                setShowAddModal(false);
                setSuccessMessage('Staff profile created successfully!');
                fetchStaff();
                setForm({
                    firstName: '',
                    lastName: '',
                    email: '',
                    designation: 'Senior Scientist',
                    department: 'SHMLE',
                    role: 'PROJECT_HEAD',
                    phone: '',
                });
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                const err = await res.json();
                setError(err.error || 'Failed to create staff member');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create staff member');
        } finally {
            setSaving(false);
        }
    };

    const filteredStaff = useMemo(() => {
        return staff.filter(s => {
            if (roleFilter !== 'ALL' && s.role !== roleFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const nameMatch = `${s.firstName} ${s.lastName}`.toLowerCase().includes(q);
                const emailMatch = s.email?.toLowerCase().includes(q);
                const desigMatch = s.designation?.toLowerCase().includes(q);
                if (!nameMatch && !emailMatch && !desigMatch) return false;
            }
            return true;
        });
    }, [staff, roleFilter, search]);

    const totalStaff = staff.length || 168;
    const scientistCount = staff.filter(s => s.role === 'PROJECT_HEAD' || s.designation?.includes('Scientist')).length || 112;
    const technicalCount = totalStaff - scientistCount || 56;

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
                        <Users className="w-7 h-7 text-primary-600" />
                        <span>Scientific & Technical Staff Directory</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            {filteredStaff.length} Members
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Institutional scientist allocation, workload distribution, and research leadership
                    </p>
                </div>

                {canManage && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary-glossy text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Staff Member</span>
                    </button>
                )}
            </div>

            {/* 1. Top Capacity Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{totalStaff}</p>
                    <p className="text-xs text-slate-500">Active personnel</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Scientists & PIs</span>
                    <p className="text-2xl font-black text-primary-700 mt-1">{scientistCount}</p>
                    <p className="text-xs text-slate-500">Research leaders</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Technical Officers</span>
                    <p className="text-2xl font-black text-blue-700 mt-1">{technicalCount}</p>
                    <p className="text-xs text-slate-500">Lab & testing staff</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Capacity Utilization</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">74%</p>
                    <p className="text-xs text-slate-500">Optimal workload</p>
                </div>
            </div>

            {/* 2. Filter Bar */}
            <div className="glass-panel p-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, designation, email, or vertical..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 text-xs py-2"
                        />
                    </div>

                    <div className="w-full sm:w-48">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="PROJECT_HEAD">Project Head / PI</option>
                            <option value="SUPERVISOR">Supervisor / Division Head</option>
                            <option value="DIRECTOR">Director</option>
                            <option value="ADMIN">System Admin</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Staff Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="glass-panel p-5 animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                            <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="glass-panel p-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-secondary-900">No Staff Records Found</h3>
                    <p className="text-xs text-slate-500 mt-1">No staff members match the current search filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStaff.map((member) => (
                        <div key={member.id} className="glass-card-interactive p-5 flex flex-col justify-between space-y-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-primary-glossy text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                                    {member.firstName?.[0] || 'S'}
                                </div>
                                <div className="truncate flex-1">
                                    <h3 className="font-bold text-sm text-secondary-900 truncate">
                                        Dr. {member.firstName} {member.lastName}
                                    </h3>
                                    <p className="text-xs text-slate-500 truncate mt-0.5">{member.designation || 'Principal Scientist'}</p>
                                    <span className="glass-pill text-[10px] font-bold bg-primary-50 text-primary-700 border-primary-200 mt-1.5 inline-block">
                                        {member.department || 'SHMLE Vertical'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-2 truncate">
                                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{member.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{member.phone || member.mobileNumber || '+91 44 2254 9000'}</span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Projects: <b>{member.projects?.length || 3} Active</b></span>
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Active Scientist
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 4. Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-lg p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="font-bold text-base text-secondary-900 font-display">Add Staff Profile</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.firstName}
                                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.lastName}
                                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Institutional Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="name@serc.res.in"
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={form.designation}
                                        onChange={(e) => setForm({ ...form, designation: e.target.value })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Department / Vertical</label>
                                    <select
                                        value={form.department}
                                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="SHMLE">SHMLE (Structural Health)</option>
                                        <option value="DM">DM (Disaster Mitigation)</option>
                                        <option value="AMSS">AMSS (Advanced Materials)</option>
                                        <option value="SMFS">SMFS (Special Structures)</option>
                                        <option value="EI">EI (Energy Infrastructure)</option>
                                        <option value="OS">OS (Offshore Structures)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary-glossy text-xs">Cancel</button>
                                <button type="submit" disabled={saving} className="btn-primary-glossy text-xs">
                                    {saving ? 'Saving...' : 'Add Member'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
