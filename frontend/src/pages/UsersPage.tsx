import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    PersonRegular,
    SearchRegular,
    AddRegular,
    EditRegular,
    DeleteRegular,
    KeyResetRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    ChevronLeftRegular,
    ChevronRightRegular,
    FilterRegular,
    ArrowDownloadRegular,
    PeopleTeamRegular,
    PersonAddRegular,
    CheckboxCheckedRegular,
    SquareRegular,
    InfoRegular,
    MailRegular,
    PhoneRegular,
    BuildingRegular,
    PersonRegular as PersonIcon,
} from '@fluentui/react-icons';

interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    designation: string | null;
    phone: string | null;
    mobileNumber: string | null;
    role: string;
    department: string | null;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
    profileImage: string | null;
    bio: string | null;
    _count?: {
        projectMembership: number;
        projectsHeaded: number;
    };
}

interface Project {
    id: string;
    code: string;
    title: string;
    status: string;
    category: string;
}

const roleOptions = [
    { value: 'ADMIN', label: 'Administrator' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'DIRECTOR_GENERAL', label: 'Director General' },
    { value: 'SUPERVISOR', label: 'Head, BKMD' },
    { value: 'PROJECT_HEAD', label: 'Principal Investigator' },
    { value: 'EMPLOYEE', label: 'Scientist/Staff' },
    { value: 'RC_MEMBER', label: 'RC Member' },
    { value: 'EXTERNAL_OWNER', label: 'External Partner' },
];

const roleColors: Record<string, string> = {
    ADMIN: 'bg-danger-100 text-danger-700',
    DIRECTOR: 'bg-purple-100 text-purple-700',
    DIRECTOR_GENERAL: 'bg-accent-100 text-accent-700',
    SUPERVISOR: 'bg-primary-100 text-primary-700',
    PROJECT_HEAD: 'bg-success-100 text-success-700',
    EMPLOYEE: 'bg-secondary-100 text-secondary-700',
    RC_MEMBER: 'bg-warning-100 text-warning-700',
    EXTERNAL_OWNER: 'bg-info-100 text-info-700',
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function UsersPage() {
    const { accessToken, user: currentUser } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [assignRole, setAssignRole] = useState('Team Member');
    const [assigning, setAssigning] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        designation: '',
        phone: '',
        mobileNumber: '',
        role: 'EMPLOYEE',
        department: '',
        password: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Check if current user can manage staff
    const canManageStaff = ['ADMIN', 'SUPERVISOR', 'DIRECTOR', 'DIRECTOR_GENERAL'].includes(currentUser?.role || '');

    useEffect(() => {
        fetchUsers();
        if (canManageStaff) {
            fetchProjects();
        }
    }, [page, roleFilter, statusFilter, searchQuery]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
            });
            if (roleFilter) params.append('role', roleFilter);
            if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
            if (searchQuery) params.append('search', searchQuery);

            const response = await fetch(`${API_BASE}/users?${params}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();
            setUsers(data.users || data);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const response = await fetch(`${API_BASE}/projects?limit=500`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await response.json();
            setProjects(data.projects || data || []);
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to create user');
            }

            setShowCreateModal(false);
            resetForm();
            fetchUsers();
            setSuccessMessage('User created successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setSaving(true);
        setError('');

        try {
            const updateData = { ...formData };
            if (!updateData.password) delete (updateData as any).password;

            const response = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update user');
            }

            setShowEditModal(false);
            setSelectedUser(null);
            resetForm();
            fetchUsers();
            setSuccessMessage('User updated successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAssign = async () => {
        if (selectedUsers.size === 0 || !selectedProjectId) {
            setError('Please select users and a project');
            return;
        }

        setAssigning(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/staff/assign-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    staffIds: Array.from(selectedUsers),
                    projectId: selectedProjectId,
                    role: assignRole
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to assign users');
            }

            setShowAssignModal(false);
            setSelectedUsers(new Set());
            setSelectedProjectId('');
            setSuccessMessage(`Successfully assigned ${data.results?.assigned?.length || selectedUsers.size} user(s) to project. ${data.results?.notified?.length || 0} notification(s) sent.`);
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAssigning(false);
        }
    };

    const handleToggleActive = async (user: User) => {
        try {
            await fetch(`${API_BASE}/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ isActive: !user.isActive }),
            });
            fetchUsers();
        } catch (err) {
            console.error('Failed to toggle user status:', err);
        }
    };

    const handleResetPassword = async (userId: string, userEmail: string) => {
        const newPassword = prompt('Enter new password (min 8 characters):');
        if (!newPassword || newPassword.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/users/${userId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ password: newPassword, sendEmail: true }),
            });

            if (response.ok) {
                setSuccessMessage(`Password reset successfully. Email notification sent to ${userEmail}`);
                setTimeout(() => setSuccessMessage(''), 5000);
            } else {
                throw new Error('Failed to reset password');
            }
        } catch (err) {
            alert('Failed to reset password');
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) return;

        try {
            await fetch(`${API_BASE}/users/${user.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            fetchUsers();
            setSuccessMessage('User deleted successfully');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const openEditModal = (user: User) => {
        setSelectedUser(user);
        setFormData({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            designation: user.designation || '',
            phone: user.phone || '',
            mobileNumber: user.mobileNumber || '',
            role: user.role,
            department: user.department || '',
            password: '',
        });
        setShowEditModal(true);
    };

    const openProfileModal = (user: User) => {
        setSelectedUser(user);
        setShowProfileModal(true);
    };

    const toggleUserSelection = (userId: string) => {
        const newSelection = new Set(selectedUsers);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedUsers(newSelection);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const resetForm = () => {
        setFormData({
            email: '',
            firstName: '',
            lastName: '',
            designation: '',
            phone: '',
            mobileNumber: '',
            role: 'EMPLOYEE',
            department: '',
            password: '',
        });
        setError('');
    };

    const getRoleLabel = (role: string) => roleOptions.find(r => r.value === role)?.label || role;

    return (
        <div className="animate-fade-in space-y-6">
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
                    <h1 className="text-2xl font-display font-bold text-secondary-900">User Management</h1>
                    <p className="text-secondary-500 mt-1">Manage user accounts, roles, and project assignments</p>
                </div>
                <div className="flex items-center gap-3">
                    {canManageStaff && selectedUsers.size > 0 && (
                        <button
                            onClick={() => setShowAssignModal(true)}
                            className="btn-success flex items-center gap-2"
                        >
                            <PeopleTeamRegular className="w-5 h-5" />
                            Assign to Project ({selectedUsers.size})
                        </button>
                    )}
                    <button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <AddRegular className="w-5 h-5" />
                        Create User
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="premium-card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <SearchRegular className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium pl-10"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="input-premium w-48"
                    >
                        <option value="">All Roles</option>
                        {roleOptions.map(role => (
                            <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="input-premium w-40"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="premium-card overflow-hidden">
                <table className="table-premium">
                    <thead>
                        <tr>
                            {canManageStaff && (
                                <th className="w-12">
                                    <button onClick={toggleSelectAll} className="p-1 hover:bg-secondary-100 rounded">
                                        {selectedUsers.size === users.length && users.length > 0 ? (
                                            <CheckboxCheckedRegular className="w-5 h-5 text-primary-600" />
                                        ) : (
                                            <SquareRegular className="w-5 h-5 text-secondary-400" />
                                        )}
                                    </button>
                                </th>
                            )}
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Designation</th>
                            <th>Projects</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={canManageStaff ? 8 : 7}><div className="skeleton h-6 w-full" /></td>
                                </tr>
                            ))
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={canManageStaff ? 8 : 7} className="text-center py-8 text-secondary-500">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id} className={selectedUsers.has(user.id) ? 'bg-primary-50' : ''}>
                                    {canManageStaff && (
                                        <td>
                                            <button
                                                onClick={() => toggleUserSelection(user.id)}
                                                className="p-1 hover:bg-secondary-100 rounded"
                                            >
                                                {selectedUsers.has(user.id) ? (
                                                    <CheckboxCheckedRegular className="w-5 h-5 text-primary-600" />
                                                ) : (
                                                    <SquareRegular className="w-5 h-5 text-secondary-400" />
                                                )}
                                            </button>
                                        </td>
                                    )}
                                    <td>
                                        <button
                                            onClick={() => openProfileModal(user)}
                                            className="flex items-center gap-3 hover:bg-secondary-50 -m-2 p-2 rounded-lg transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-premium flex items-center justify-center text-white font-semibold overflow-hidden">
                                                {user.profileImage ? (
                                                    <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>{user.firstName?.[0]}{user.lastName?.[0]}</>
                                                )}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-medium text-secondary-900">
                                                    {user.firstName} {user.lastName}
                                                </p>
                                                {user.department && (
                                                    <p className="text-xs text-secondary-500">{user.department}</p>
                                                )}
                                            </div>
                                        </button>
                                    </td>
                                    <td className="text-secondary-600">{user.email}</td>
                                    <td>
                                        <span className={`badge ${roleColors[user.role] || 'bg-secondary-100 text-secondary-700'}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="text-secondary-600">{user.designation || '-'}</td>
                                    <td>
                                        {user._count ? (
                                            <div className="flex items-center gap-2">
                                                <span className="badge-info">{user._count.projectsHeaded} headed</span>
                                                <span className="badge-secondary">{user._count.projectMembership} member</span>
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td>
                                        {user.isActive ? (
                                            <span className="badge-success flex items-center gap-1 w-fit">
                                                <CheckmarkCircleRegular className="w-4 h-4" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="badge-secondary flex items-center gap-1 w-fit">
                                                <DismissCircleRegular className="w-4 h-4" />
                                                Inactive
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            {canManageStaff && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedUsers(new Set([user.id]));
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="p-2 hover:bg-primary-100 rounded-lg transition-colors"
                                                    title="Assign to Project"
                                                >
                                                    <PersonAddRegular className="w-4 h-4 text-primary-600" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <EditRegular className="w-4 h-4 text-secondary-600" />
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user.id, user.email)}
                                                className="p-2 hover:bg-warning-100 rounded-lg transition-colors"
                                                title="Reset Password"
                                            >
                                                <KeyResetRegular className="w-4 h-4 text-warning-600" />
                                            </button>
                                            <button
                                                onClick={() => handleToggleActive(user)}
                                                className={`p-2 rounded-lg transition-colors ${user.isActive
                                                    ? 'hover:bg-danger-100 text-danger-600'
                                                    : 'hover:bg-success-100 text-success-600'
                                                    }`}
                                                title={user.isActive ? 'Deactivate' : 'Activate'}
                                            >
                                                {user.isActive
                                                    ? <DismissCircleRegular className="w-4 h-4" />
                                                    : <CheckmarkCircleRegular className="w-4 h-4" />
                                                }
                                            </button>
                                            {currentUser?.role === 'ADMIN' && user.id !== currentUser.id && (
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-2 hover:bg-danger-100 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <DeleteRegular className="w-4 h-4 text-danger-600" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-secondary-100">
                        <p className="text-sm text-secondary-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="btn-ghost disabled:opacity-50"
                            >
                                <ChevronLeftRegular className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="btn-ghost disabled:opacity-50"
                            >
                                <ChevronRightRegular className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Assign to Project Modal */}
            {showAssignModal && (
                <div className="modal-backdrop" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900 flex items-center gap-2">
                                <PeopleTeamRegular className="w-6 h-6 text-primary-600" />
                                Assign Staff to Project
                            </h2>
                            <p className="text-secondary-500 mt-1">
                                {selectedUsers.size} user(s) selected for assignment
                            </p>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Select Project *</label>
                                <select
                                    value={selectedProjectId}
                                    onChange={e => setSelectedProjectId(e.target.value)}
                                    className="input-premium"
                                    required
                                >
                                    <option value="">Choose a project...</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.code} - {project.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Role in Project</label>
                                <select
                                    value={assignRole}
                                    onChange={e => setAssignRole(e.target.value)}
                                    className="input-premium"
                                >
                                    <option value="Team Member">Team Member</option>
                                    <option value="Co-Investigator">Co-Investigator</option>
                                    <option value="Technical Staff">Technical Staff</option>
                                    <option value="Research Associate">Research Associate</option>
                                    <option value="Project Assistant">Project Assistant</option>
                                </select>
                            </div>

                            <div className="bg-info-50 p-3 rounded-lg text-sm text-info-700">
                                <InfoRegular className="w-4 h-4 inline mr-2" />
                                Assigned staff will receive email and in-app notifications about their assignment.
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-6 border-t border-secondary-100">
                            <button
                                type="button"
                                onClick={() => { setShowAssignModal(false); setError(''); }}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkAssign}
                                disabled={assigning || !selectedProjectId}
                                className="btn-primary"
                            >
                                {assigning ? 'Assigning...' : 'Assign & Notify'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Profile Modal */}
            {showProfileModal && selectedUser && (
                <div className="modal-backdrop" onClick={() => setShowProfileModal(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                            <div className="h-24 bg-gradient-premium rounded-t-xl" />
                            <div className="absolute -bottom-12 left-6">
                                <div className="w-24 h-24 rounded-full bg-white p-1 shadow-lg">
                                    <div className="w-full h-full rounded-full bg-gradient-premium flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                                        {selectedUser.profileImage ? (
                                            <img src={selectedUser.profileImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <>{selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}</>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white"
                            >
                                <DismissCircleRegular className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="pt-16 pb-6 px-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-secondary-900">
                                        {selectedUser.firstName} {selectedUser.lastName}
                                    </h2>
                                    <p className="text-secondary-500">{selectedUser.designation || 'No designation'}</p>
                                </div>
                                <span className={`badge ${roleColors[selectedUser.role] || 'bg-secondary-100'}`}>
                                    {getRoleLabel(selectedUser.role)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                                    <MailRegular className="w-5 h-5 text-primary-600" />
                                    <div>
                                        <p className="text-xs text-secondary-500">Email</p>
                                        <p className="text-sm font-medium">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                                    <PhoneRegular className="w-5 h-5 text-primary-600" />
                                    <div>
                                        <p className="text-xs text-secondary-500">Phone</p>
                                        <p className="text-sm font-medium">{selectedUser.phone || selectedUser.mobileNumber || 'Not provided'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                                    <BuildingRegular className="w-5 h-5 text-primary-600" />
                                    <div>
                                        <p className="text-xs text-secondary-500">Department</p>
                                        <p className="text-sm font-medium">{selectedUser.department || 'Not assigned'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-secondary-50 rounded-lg">
                                    <PersonIcon className="w-5 h-5 text-primary-600" />
                                    <div>
                                        <p className="text-xs text-secondary-500">Status</p>
                                        <p className="text-sm font-medium">{selectedUser.isActive ? 'Active' : 'Inactive'}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedUser.bio && (
                                <div className="mt-6">
                                    <h3 className="text-sm font-medium text-secondary-700 mb-2">Bio</h3>
                                    <p className="text-secondary-600">{selectedUser.bio}</p>
                                </div>
                            )}

                            {canManageStaff && (
                                <div className="flex gap-3 mt-6 pt-6 border-t border-secondary-100">
                                    <button
                                        onClick={() => {
                                            setShowProfileModal(false);
                                            openEditModal(selectedUser);
                                        }}
                                        className="btn-secondary flex items-center gap-2"
                                    >
                                        <EditRegular className="w-4 h-4" />
                                        Edit Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowProfileModal(false);
                                            setSelectedUsers(new Set([selectedUser.id]));
                                            setShowAssignModal(true);
                                        }}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        <PersonAddRegular className="w-4 h-4" />
                                        Assign to Project
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900">Create New User</h2>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="input-premium"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="input-premium"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Password *</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="input-premium"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Role *</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="input-premium"
                                        required
                                    >
                                        {roleOptions.map(role => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                        className="input-premium"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-premium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        className="input-premium"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-secondary-100">
                            <h2 className="text-xl font-semibold text-secondary-900">Edit User</h2>
                        </div>
                        <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        className="input-premium"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        className="input-premium"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="input-premium"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-1">New Password (leave blank to keep current)</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="input-premium"
                                    minLength={8}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Role *</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        className="input-premium"
                                        required
                                    >
                                        {roleOptions.map(role => (
                                            <option key={role.value} value={role.value}>{role.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Designation</label>
                                    <input
                                        type="text"
                                        value={formData.designation}
                                        onChange={e => setFormData({ ...formData, designation: e.target.value })}
                                        className="input-premium"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-premium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                                        className="input-premium"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
