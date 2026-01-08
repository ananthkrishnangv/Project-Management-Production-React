import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    PersonRegular,
    EditRegular,
    SaveRegular,
    LockClosedRegular,
    MailRegular,
    PhoneRegular,
    BuildingRegular,
    FolderRegular,
    DocumentRegular,
    ClockRegular,
    CheckmarkCircleRegular,
    DismissCircleRegular,
    ArrowSyncRegular,
    EyeRegular,
    EyeOffRegular,
    CallRegular,
    ChatRegular,
} from '@fluentui/react-icons';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    designation: string | null;
    phone: string | null;
    mobileNumber: string | null;
    landlineNumber: string | null;
    whatsappNumber: string | null;
    alternateEmail: string | null;
    bio: string | null;
    department: string | null;
    employeeId: string | null;
    role: string;
    profileImage: string | null;
    twoFactorEnabled: boolean;
    lastLogin: string | null;
    createdAt: string;
}

interface Project {
    id: string;
    code: string;
    title: string;
    status: string;
    category?: string;
    role?: string;
}

interface ProjectMembership {
    id: string;
    role: string | null;
    project: Project;
}

interface DocumentInfo {
    id: string;
    title: string;
    fileName: string;
    createdAt: string;
}

interface LoginHistory {
    createdAt: string;
    ipAddress: string | null;
    userAgent: string | null;
}

export default function ProfilePage() {
    const { user, accessToken, logout, setUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [profile, setProfile] = useState<UserProfile>({
        id: '',
        email: '',
        firstName: '',
        lastName: '',
        designation: null,
        phone: null,
        mobileNumber: null,
        landlineNumber: null,
        whatsappNumber: null,
        alternateEmail: null,
        bio: null,
        department: null,
        employeeId: null,
        role: 'EMPLOYEE',
        profileImage: null,
        twoFactorEnabled: false,
        lastLogin: null,
        createdAt: new Date().toISOString(),
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [projects, setProjects] = useState<Project[]>([]);
    const [projectMemberships, setProjectMemberships] = useState<ProjectMembership[]>([]);
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_BASE}/users/profile`, {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProfile({
                    id: data.id,
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    designation: data.designation,
                    phone: data.phone,
                    mobileNumber: data.mobileNumber,
                    landlineNumber: data.landlineNumber,
                    whatsappNumber: data.whatsappNumber,
                    alternateEmail: data.alternateEmail,
                    bio: data.bio,
                    department: data.department,
                    employeeId: data.employeeId,
                    role: data.role,
                    profileImage: data.profileImage,
                    twoFactorEnabled: data.twoFactorEnabled || false,
                    lastLogin: data.lastLogin,
                    createdAt: data.createdAt,
                });
                // Combine projects headed and project memberships
                const headed = (data.projectsHeaded || []).map((p: Project) => ({
                    ...p,
                    role: 'Project Head'
                }));
                setProjects(headed);
                setProjectMemberships(data.projectMembership || []);
                setDocuments(data.documentsUploaded || []);
                setLoginHistory(data.recentLogins || []);
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    phone: profile.phone,
                    mobileNumber: profile.mobileNumber,
                    landlineNumber: profile.landlineNumber,
                    whatsappNumber: profile.whatsappNumber,
                    designation: profile.designation,
                    bio: profile.bio,
                    department: profile.department,
                }),
            });

            if (res.ok) {
                const updatedUser = await res.json();
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
                setEditing(false);
                // Update the auth store with new user data
                if (user) {
                    setUser({
                        ...user,
                        firstName: updatedUser.firstName,
                        lastName: updatedUser.lastName,
                        designation: updatedUser.designation,
                    });
                }
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 5000);
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match!' });
            return;
        }
        if (passwordForm.newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters!' });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/users/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword,
                }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully! Please login again.' });
                setChangingPassword(false);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => logout(), 2000);
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
        }
        setSaving(false);
        setTimeout(() => setMessage(null), 5000);
    };

    const roleLabels: Record<string, string> = {
        ADMIN: 'Administrator',
        DIRECTOR: 'Director',
        DIRECTOR_GENERAL: 'Director General',
        SUPERVISOR: 'Head, BKMD',
        PROJECT_HEAD: 'Principal Investigator',
        EMPLOYEE: 'Scientist/Staff',
        RC_MEMBER: 'Research Council Member',
        EXTERNAL_OWNER: 'External Partner',
    };

    const departmentOptions = [
        'ASTAR', 'WIND', 'SSL', 'SMD', 'CSMD', 'FSTD', 'BKMD', 'ICT', 'Admin', 'Other'
    ];

    // Combine all projects for display
    const allProjects = [
        ...projects,
        ...projectMemberships.map(pm => ({
            id: pm.project.id,
            code: pm.project.code,
            title: pm.project.title,
            status: pm.project.status,
            category: pm.project.category,
            role: pm.role || 'Team Member',
        }))
    ];

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-64" />
                <div className="premium-card p-6">
                    <div className="flex gap-6">
                        <div className="skeleton w-32 h-32 rounded-full" />
                        <div className="flex-1 space-y-3">
                            <div className="skeleton h-6 w-48" />
                            <div className="skeleton h-4 w-32" />
                            <div className="skeleton h-4 w-64" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">My Profile</h1>
                    <p className="text-secondary-500 mt-1">Manage your personal information and preferences</p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200'
                    }`}>
                    {message.type === 'success' ? (
                        <CheckmarkCircleRegular className="w-5 h-5 text-success-500" />
                    ) : (
                        <DismissCircleRegular className="w-5 h-5 text-danger-500" />
                    )}
                    <span className={message.type === 'success' ? 'text-success-700' : 'text-danger-700'}>
                        {message.text}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="premium-card p-6">
                        <div className="flex items-start justify-between mb-6">
                            <h3 className="text-lg font-semibold text-secondary-900">Personal Information</h3>
                            {!editing ? (
                                <button onClick={() => setEditing(true)} className="btn-ghost flex items-center gap-2">
                                    <EditRegular className="w-5 h-5" />
                                    Edit
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
                                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                                        {saving ? <ArrowSyncRegular className="w-5 h-5 animate-spin" /> : <SaveRegular className="w-5 h-5" />}
                                        Save
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Avatar */}
                            <div className="flex flex-col items-center">
                                <div className="w-32 h-32 rounded-full bg-gradient-premium flex items-center justify-center text-white text-4xl font-bold shadow-premium">
                                    {profile.firstName[0]}{profile.lastName[0]}
                                </div>
                                {editing && (
                                    <button className="mt-3 text-sm text-primary-600 hover:underline">
                                        Change Photo
                                    </button>
                                )}
                                {profile.employeeId && (
                                    <p className="mt-2 text-sm text-secondary-500">ID: {profile.employeeId}</p>
                                )}
                            </div>

                            {/* Form Fields */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">First Name</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={profile.firstName}
                                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={profile.lastName}
                                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Email</label>
                                    <div className="relative">
                                        <MailRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                        <input
                                            type="email"
                                            className="input-premium pl-12 bg-secondary-50"
                                            value={profile.email}
                                            disabled
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Alternate Email</label>
                                    <div className="relative">
                                        <MailRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                        <input
                                            type="email"
                                            className="input-premium pl-12"
                                            value={profile.alternateEmail || ''}
                                            placeholder="personal@email.com"
                                            onChange={(e) => setProfile({ ...profile, alternateEmail: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Designation</label>
                                    <div className="relative">
                                        <PersonRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                        <input
                                            type="text"
                                            className="input-premium pl-12"
                                            value={profile.designation || ''}
                                            onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Department</label>
                                    <div className="relative">
                                        <BuildingRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                        {editing ? (
                                            <select
                                                className="input-premium pl-12"
                                                value={profile.department || ''}
                                                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                            >
                                                <option value="">Select Department</option>
                                                {departmentOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                className="input-premium pl-12"
                                                value={profile.department || ''}
                                                disabled
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="mt-6">
                            <label className="block text-sm font-medium text-secondary-700 mb-2">Bio / About</label>
                            <textarea
                                className="input-premium h-24 resize-none"
                                value={profile.bio || ''}
                                placeholder="A brief description about yourself..."
                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                disabled={!editing}
                            />
                        </div>

                        {/* Role Badge */}
                        <div className="mt-6 p-4 bg-secondary-50 rounded-xl">
                            <p className="text-sm text-secondary-500">System Role</p>
                            <p className="font-semibold text-secondary-900">{roleLabels[profile.role] || profile.role}</p>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="premium-card p-6">
                        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">Mobile Number</label>
                                <div className="relative">
                                    <PhoneRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                    <input
                                        type="tel"
                                        className="input-premium pl-12"
                                        value={profile.mobileNumber || profile.phone || ''}
                                        placeholder="+91"
                                        onChange={(e) => setProfile({ ...profile, mobileNumber: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">Landline</label>
                                <div className="relative">
                                    <CallRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                    <input
                                        type="tel"
                                        className="input-premium pl-12"
                                        value={profile.landlineNumber || ''}
                                        placeholder="044-XXXXXXXX"
                                        onChange={(e) => setProfile({ ...profile, landlineNumber: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">WhatsApp Number</label>
                                <div className="relative">
                                    <ChatRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success-500" />
                                    <input
                                        type="tel"
                                        className="input-premium pl-12"
                                        value={profile.whatsappNumber || ''}
                                        placeholder="+91"
                                        onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                                        disabled={!editing}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Change */}
                    <div className="premium-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                                    <LockClosedRegular className="w-5 h-5 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-secondary-900">Password & Security</h3>
                                    <p className="text-sm text-secondary-500">Update your password</p>
                                </div>
                            </div>
                            {!changingPassword && (
                                <button onClick={() => setChangingPassword(true)} className="btn-secondary">
                                    Change Password
                                </button>
                            )}
                        </div>

                        {changingPassword && (
                            <div className="mt-4 space-y-4 border-t border-secondary-100 pt-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            className="input-premium pr-12"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400"
                                        >
                                            {showCurrentPassword ? <EyeOffRegular className="w-5 h-5" /> : <EyeRegular className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            className="input-premium pr-12"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400"
                                        >
                                            {showNewPassword ? <EyeOffRegular className="w-5 h-5" /> : <EyeRegular className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Confirm New Password</label>
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        className="input-premium"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setChangingPassword(false)} className="btn-ghost">Cancel</button>
                                    <button onClick={handleChangePassword} disabled={saving} className="btn-primary flex items-center gap-2">
                                        {saving ? <ArrowSyncRegular className="w-5 h-5 animate-spin" /> : <LockClosedRegular className="w-5 h-5" />}
                                        Update Password
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* My Projects */}
                    <div className="premium-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <FolderRegular className="w-5 h-5 text-primary-600" />
                            <h3 className="font-semibold text-secondary-900">My Projects ({allProjects.length})</h3>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                            {allProjects.map(project => (
                                <div key={project.id} className="p-3 bg-secondary-50 rounded-xl hover:bg-secondary-100 transition-colors">
                                    <p className="font-mono text-sm text-primary-600">{project.code}</p>
                                    <p className="text-sm font-medium text-secondary-900 truncate">{project.title}</p>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-secondary-500">{project.role}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${project.status === 'ACTIVE' ? 'bg-success-100 text-success-700' :
                                                project.status === 'COMPLETED' ? 'bg-primary-100 text-primary-700' :
                                                    'bg-secondary-100 text-secondary-700'
                                            }`}>
                                            {project.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {allProjects.length === 0 && (
                                <p className="text-sm text-secondary-500 text-center py-4">No projects assigned</p>
                            )}
                        </div>
                    </div>

                    {/* My Documents */}
                    <div className="premium-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <DocumentRegular className="w-5 h-5 text-success-600" />
                            <h3 className="font-semibold text-secondary-900">My Uploads</h3>
                        </div>
                        <div className="space-y-2">
                            {documents.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-secondary-50 rounded-lg">
                                    <div className="flex items-center gap-2 truncate">
                                        <DocumentRegular className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                                        <span className="text-sm text-secondary-700 truncate">{doc.title || doc.fileName}</span>
                                    </div>
                                    <span className="text-xs text-secondary-400">{new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <p className="text-sm text-secondary-500 text-center py-4">No documents uploaded</p>
                            )}
                        </div>
                    </div>

                    {/* Login History */}
                    <div className="premium-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ClockRegular className="w-5 h-5 text-accent-600" />
                            <h3 className="font-semibold text-secondary-900">Recent Activity</h3>
                        </div>
                        <div className="space-y-3">
                            {loginHistory.slice(0, 5).map((login, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                    <CheckmarkCircleRegular className="w-4 h-4 text-success-500" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-secondary-700">Login successful</p>
                                        <p className="text-xs text-secondary-400">
                                            {new Date(login.createdAt).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {loginHistory.length === 0 && (
                                <p className="text-sm text-secondary-500 text-center py-4">No recent activity</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
