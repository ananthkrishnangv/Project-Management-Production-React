import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    PersonRegular,
    AddRegular,
    SearchRegular,
    FilterRegular,
    MailRegular,
    PhoneRegular,
    CalendarRegular,
    CheckmarkCircleRegular,
    DismissRegular,
    PersonSettingsRegular,
    KeyRegular,
    FolderRegular,
    EditRegular,
    ChevronDownRegular,
    AlertRegular,
    LinkRegular,
    SaveRegular,
} from '@fluentui/react-icons';

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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function StaffPage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

    // Selected staff for bulk operations
    const [selectedStaff, setSelectedStaff] = useState<string[]>([]);

    // Modals
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

    // Edit form
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobileNumber: '',
        department: '',
        designation: '',
    });

    // Assign to project
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [assigning, setAssigning] = useState(false);

    // Permission checks
    const canManageStaff = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(currentUser?.role || '');
    const canResetPassword = ['ADMIN', 'SUPERVISOR'].includes(currentUser?.role || '');
    const canAssignToProject = ['ADMIN', 'SUPERVISOR', 'DIRECTOR'].includes(currentUser?.role || '');

    useEffect(() => {
        fetchStaff();
        if (canAssignToProject) {
            fetchProjects();
        }
    }, [search, roleFilter]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('limit', '500');
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);

            const res = await fetch(`${API_BASE}/staff?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (res.ok) {
                const data = await res.json();
                setStaff(data.data || data || []);
            } else {
                setError('Failed to load staff list');
            }
        } catch (err) {
            console.error('Failed to fetch staff:', err);
            setError('Failed to load staff list');
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects?limit=500`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProjects(data.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        }
    };

    const handleSelectStaff = (id: string) => {
        if (selectedStaff.includes(id)) {
            setSelectedStaff(selectedStaff.filter(s => s !== id));
        } else {
            setSelectedStaff([...selectedStaff, id]);
        }
    };

    const handleSelectAll = () => {
        if (selectedStaff.length === filteredStaff.length) {
            setSelectedStaff([]);
        } else {
            setSelectedStaff(filteredStaff.map(s => s.id));
        }
    };

    const handleViewProfile = (member: StaffMember) => {
        setSelectedMember(member);
        setEditForm({
            firstName: member.firstName || '',
            lastName: member.lastName || '',
            email: member.email || '',
            phone: member.phone || '',
            mobileNumber: member.mobileNumber || '',
            department: member.department || '',
            designation: member.designation || '',
        });
        setShowProfileModal(true);
    };

    const handleSaveProfile = async () => {
        if (!selectedMember) return;

        try {
            const res = await fetch(`${API_BASE}/users/${selectedMember.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(editForm),
            });

            if (res.ok) {
                setSuccessMessage('Profile updated successfully');
                setTimeout(() => setSuccessMessage(''), 3000);
                setShowProfileModal(false);
                fetchStaff();
            } else {
                setError('Failed to update profile');
            }
        } catch (err) {
            setError('Failed to update profile');
        }
    };

    const handleResetPassword = async () => {
        if (!selectedMember) return;

        try {
            const res = await fetch(`${API_BASE}/users/${selectedMember.id}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (res.ok) {
                setSuccessMessage(`Password reset email sent to ${selectedMember.email}`);
                setTimeout(() => setSuccessMessage(''), 5000);
                setShowResetPasswordModal(false);
            } else {
                setError('Failed to reset password');
            }
        } catch (err) {
            setError('Failed to reset password');
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedProjectId || selectedStaff.length === 0) return;

        setAssigning(true);
        try {
            const res = await fetch(`${API_BASE}/projects/${selectedProjectId}/staff/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ userIds: selectedStaff }),
            });

            if (res.ok) {
                const result = await res.json();
                setSuccessMessage(`${selectedStaff.length} staff member(s) assigned to project successfully`);
                setTimeout(() => setSuccessMessage(''), 5000);
                setShowAssignModal(false);
                setSelectedStaff([]);
                setSelectedProjectId('');
                fetchStaff();
            } else {
                setError('Failed to assign staff to project');
            }
        } catch (err) {
            setError('Failed to assign staff to project');
        } finally {
            setAssigning(false);
        }
    };

    const handleSingleAssign = async (staffId: string) => {
        if (!selectedProjectId) return;

        try {
            const res = await fetch(`${API_BASE}/projects/${selectedProjectId}/staff`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ userId: staffId, role: 'MEMBER' }),
            });

            if (res.ok) {
                setSuccessMessage('Staff assigned to project successfully');
                setTimeout(() => setSuccessMessage(''), 3000);
                fetchStaff();
            } else {
                setError('Failed to assign staff');
            }
        } catch (err) {
            setError('Failed to assign staff');
        }
    };

    const filteredStaff = staff.filter(s => {
        const matchesSearch = !search ||
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase()) ||
            s.designation?.toLowerCase().includes(search.toLowerCase());
        const matchesRole = !roleFilter || s.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const roleLabels: Record<string, string> = {
        ADMIN: 'Administrator',
        SUPERVISOR: 'Head, BKMD',
        DIRECTOR: 'Director',
        DIRECTOR_GENERAL: 'DG, CSIR',
        PROJECT_HEAD: 'Project Head',
        EMPLOYEE: 'Staff',
        RC_MEMBER: 'RC Member',
        EXTERNAL_OWNER: 'External',
    };

    const roleColors: Record<string, string> = {
        ADMIN: 'bg-danger-100 text-danger-700 border-danger-200',
        SUPERVISOR: 'bg-primary-100 text-primary-700 border-primary-200',
        DIRECTOR: 'bg-accent-100 text-accent-700 border-accent-200',
        DIRECTOR_GENERAL: 'bg-warning-100 text-warning-700 border-warning-200',
        PROJECT_HEAD: 'bg-success-100 text-success-700 border-success-200',
        EMPLOYEE: 'bg-secondary-100 text-secondary-700 border-secondary-200',
        RC_MEMBER: 'bg-info-100 text-info-700 border-info-200',
        EXTERNAL_OWNER: 'bg-secondary-100 text-secondary-600 border-secondary-200',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Success/Error Messages */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50 p-4 bg-success-50 border border-success-200 rounded-lg text-success-700 shadow-lg animate-fade-in flex items-center gap-2">
                    <CheckmarkCircleRegular className="w-5 h-5" />
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="fixed top-4 right-4 z-50 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 shadow-lg animate-fade-in flex items-center gap-2">
                    <AlertRegular className="w-5 h-5" />
                    {error}
                    <button onClick={() => setError('')} className="ml-2">
                        <DismissRegular className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Staff Management</h1>
                    <p className="text-secondary-500 mt-1">
                        View and manage staff members, assign to projects, and update profiles
                    </p>
                </div>
                {selectedStaff.length > 0 && canAssignToProject && (
                    <button
                        onClick={() => setShowAssignModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <LinkRegular className="w-5 h-5" />
                        <span>Assign {selectedStaff.length} Selected to Project</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="premium-card p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or designation..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-premium pl-12"
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="input-premium pr-10 min-w-[180px]"
                        >
                            <option value="">All Roles</option>
                            <option value="ADMIN">Administrator</option>
                            <option value="SUPERVISOR">Head, BKMD</option>
                            <option value="DIRECTOR">Director</option>
                            <option value="PROJECT_HEAD">Project Head</option>
                            <option value="EMPLOYEE">Staff</option>
                            <option value="RC_MEMBER">RC Member</option>
                        </select>
                        <ChevronDownRegular className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Staff Table */}
            <div className="premium-card overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="skeleton w-10 h-10 rounded-full" />
                                <div className="flex-1">
                                    <div className="skeleton h-4 w-1/3 mb-2" />
                                    <div className="skeleton h-3 w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="p-12 text-center">
                        <PersonRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                        <h3 className="text-lg font-semibold text-secondary-900 mb-2">No staff members found</h3>
                        <p className="text-secondary-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <table className="table-premium">
                        <thead>
                            <tr>
                                {canAssignToProject && (
                                    <th className="w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedStaff.length === filteredStaff.length}
                                            onChange={handleSelectAll}
                                            className="rounded border-secondary-300"
                                        />
                                    </th>
                                )}
                                <th>Staff Member</th>
                                <th>Contact</th>
                                <th>Role</th>
                                <th>Projects</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStaff.map((member) => (
                                <tr key={member.id} className="group">
                                    {canAssignToProject && (
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedStaff.includes(member.id)}
                                                onChange={() => handleSelectStaff(member.id)}
                                                className="rounded border-secondary-300"
                                            />
                                        </td>
                                    )}
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-premium flex items-center justify-center text-white font-semibold text-sm">
                                                {member.firstName?.[0]}{member.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium text-secondary-900">
                                                    {member.firstName} {member.lastName}
                                                </p>
                                                <p className="text-sm text-secondary-500">{member.designation || 'No designation'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-1 text-sm text-secondary-600">
                                                <MailRegular className="w-4 h-4" />
                                                <span>{member.email}</span>
                                            </div>
                                            {member.mobileNumber && (
                                                <div className="flex items-center gap-1 text-sm text-secondary-500">
                                                    <PhoneRegular className="w-4 h-4" />
                                                    <span>{member.mobileNumber}</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge border ${roleColors[member.role] || 'bg-secondary-100'}`}>
                                            {roleLabels[member.role] || member.role}
                                        </span>
                                    </td>
                                    <td>
                                        {member.projects && member.projects.length > 0 ? (
                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                {member.projects.slice(0, 2).map(p => (
                                                    <span
                                                        key={p.projectId}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-700 rounded text-xs"
                                                        title={p.project?.title}
                                                    >
                                                        <FolderRegular className="w-3 h-3" />
                                                        {p.project?.code || 'Project'}
                                                    </span>
                                                ))}
                                                {member.projects.length > 2 && (
                                                    <span className="text-xs text-secondary-500">
                                                        +{member.projects.length - 2} more
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-sm text-secondary-400">No projects</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className={`flex items-center gap-2 ${member.isActive ? 'text-success-600' : 'text-secondary-400'}`}>
                                            <div className={`w-2 h-2 rounded-full ${member.isActive ? 'bg-success-500' : 'bg-secondary-300'}`} />
                                            <span className="text-sm">{member.isActive ? 'Active' : 'Inactive'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleViewProfile(member)}
                                                className="p-2 rounded-lg hover:bg-secondary-100 text-secondary-600"
                                                title="View/Edit Profile"
                                            >
                                                <PersonSettingsRegular className="w-5 h-5" />
                                            </button>
                                            {canResetPassword && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMember(member);
                                                        setShowResetPasswordModal(true);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-warning-100 text-warning-600"
                                                    title="Reset Password"
                                                >
                                                    <KeyRegular className="w-5 h-5" />
                                                </button>
                                            )}
                                            {canAssignToProject && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedStaff([member.id]);
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-primary-100 text-primary-600"
                                                    title="Assign to Project"
                                                >
                                                    <AddRegular className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Profile Modal */}
            {showProfileModal && selectedMember && (
                <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-200 flex items-center justify-between">
                            <h2 className="text-xl font-display font-bold text-secondary-900">
                                {canManageStaff ? 'Edit Profile' : 'View Profile'}
                            </h2>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="p-2 rounded-lg hover:bg-secondary-100"
                            >
                                <DismissRegular className="w-5 h-5 text-secondary-500" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-premium flex items-center justify-center text-white text-2xl font-bold">
                                    {selectedMember.firstName?.[0]}{selectedMember.lastName?.[0]}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-secondary-900">
                                        {selectedMember.firstName} {selectedMember.lastName}
                                    </h3>
                                    <p className="text-secondary-500">{selectedMember.designation}</p>
                                    <span className={`badge border mt-1 ${roleColors[selectedMember.role]}`}>
                                        {roleLabels[selectedMember.role]}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editForm.firstName}
                                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editForm.lastName}
                                        onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={editForm.mobileNumber}
                                        onChange={e => setEditForm({ ...editForm, mobileNumber: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={editForm.department}
                                        onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={editForm.designation}
                                        onChange={e => setEditForm({ ...editForm, designation: e.target.value })}
                                        className="input-premium"
                                        disabled={!canManageStaff}
                                    />
                                </div>
                            </div>

                            {/* Projects Assigned */}
                            {selectedMember.projects && selectedMember.projects.length > 0 && (
                                <div className="mt-6">
                                    <h4 className="text-sm font-medium text-secondary-700 mb-2">Projects Assigned</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedMember.projects.map(p => (
                                            <span
                                                key={p.projectId}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm"
                                            >
                                                <FolderRegular className="w-4 h-4" />
                                                {p.project?.code}: {p.project?.title?.slice(0, 30)}...
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-secondary-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            {canManageStaff && (
                                <button
                                    onClick={handleSaveProfile}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <SaveRegular className="w-5 h-5" />
                                    Save Changes
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign to Project Modal */}
            {showAssignModal && (
                <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-200 flex items-center justify-between">
                            <h2 className="text-xl font-display font-bold text-secondary-900">Assign to Project</h2>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="p-2 rounded-lg hover:bg-secondary-100"
                            >
                                <DismissRegular className="w-5 h-5 text-secondary-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-secondary-600 mb-4">
                                Assign {selectedStaff.length} selected staff member(s) to a project.
                            </p>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">
                                    Select Project <span className="text-danger-500">*</span>
                                </label>
                                <select
                                    value={selectedProjectId}
                                    onChange={e => setSelectedProjectId(e.target.value)}
                                    className="input-premium"
                                >
                                    <option value="">Choose a project...</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.code} - {p.title.slice(0, 50)}...
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-4 p-3 bg-info-50 border border-info-200 rounded-lg text-info-700 text-sm">
                                Staff members will be notified about their assignment via email.
                            </div>
                        </div>
                        <div className="p-6 border-t border-secondary-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkAssign}
                                disabled={!selectedProjectId || assigning}
                                className="btn-primary"
                            >
                                {assigning ? 'Assigning...' : 'Assign to Project'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPasswordModal && selectedMember && (
                <div className="modal-backdrop" onClick={() => setShowResetPasswordModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-200 flex items-center justify-between">
                            <h2 className="text-xl font-display font-bold text-secondary-900">Reset Password</h2>
                            <button
                                onClick={() => setShowResetPasswordModal(false)}
                                className="p-2 rounded-lg hover:bg-secondary-100"
                            >
                                <DismissRegular className="w-5 h-5 text-secondary-500" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700 mb-4">
                                <p className="font-medium mb-1">Are you sure?</p>
                                <p className="text-sm">
                                    This will generate a new password and send it to {selectedMember.email}.
                                </p>
                            </div>
                            <p className="text-secondary-600">
                                Staff member: <strong>{selectedMember.firstName} {selectedMember.lastName}</strong>
                            </p>
                        </div>
                        <div className="p-6 border-t border-secondary-200 flex justify-end gap-3">
                            <button
                                onClick={() => setShowResetPasswordModal(false)}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPassword}
                                className="btn-primary bg-warning-500 hover:bg-warning-600"
                            >
                                Reset & Send Email
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
