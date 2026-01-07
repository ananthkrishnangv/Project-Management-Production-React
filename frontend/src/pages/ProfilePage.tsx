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
} from '@fluentui/react-icons';

interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    designation: string | null;
    phone: string | null;
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
    role: string;
    status: string;
}

interface LoginHistory {
    id: string;
    timestamp: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
}

export default function ProfilePage() {
    const { user, accessToken, logout } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [profile, setProfile] = useState<UserProfile>({
        id: user?.id || '',
        email: user?.email || '',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        designation: user?.designation || null,
        phone: '',
        role: user?.role || 'EMPLOYEE',
        profileImage: null,
        twoFactorEnabled: false,
        lastLogin: new Date().toISOString(),
        createdAt: '2024-01-15T10:30:00',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Mock data
    const [projects] = useState<Project[]>([
        { id: '1', code: 'GAP-2024-SHM-001', title: 'Structural Health Monitoring', role: 'Project Head', status: 'ACTIVE' },
        { id: '2', code: 'CNP-2024-TT-003', title: 'Technology Transfer Initiative', role: 'Team Member', status: 'ACTIVE' },
    ]);

    const [documents] = useState([
        { id: '1', name: 'Q4 Progress Report.pdf', uploadedAt: '2024-12-28' },
        { id: '2', name: 'Project Proposal.docx', uploadedAt: '2024-12-15' },
    ]);

    const [loginHistory] = useState<LoginHistory[]>([
        { id: '1', timestamp: '2024-12-31T09:15:00', ipAddress: '10.10.100.45', userAgent: 'Chrome 120', success: true },
        { id: '2', timestamp: '2024-12-30T14:20:00', ipAddress: '10.10.100.45', userAgent: 'Chrome 120', success: true },
        { id: '3', timestamp: '2024-12-30T10:05:00', ipAddress: '192.168.1.100', userAgent: 'Firefox 121', success: false },
    ]);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setEditing(false);
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
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
            const res = await fetch('/api/users/change-password', {
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
        SUPERVISOR: 'Head, BKMD',
        PROJECT_HEAD: 'Principal Investigator',
        EMPLOYEE: 'Scientist/Staff',
        EXTERNAL_OWNER: 'External Partner',
    };

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
                    <p className="text-secondary-500 mt-1">Manage your account settings and preferences</p>
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
                                            className="input-premium pl-12"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Phone</label>
                                    <div className="relative">
                                        <PhoneRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                        <input
                                            type="tel"
                                            className="input-premium pl-12"
                                            value={profile.phone || ''}
                                            placeholder="+91"
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Designation</label>
                                    <div className="relative">
                                        <BuildingRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                                        <input
                                            type="text"
                                            className="input-premium pl-12"
                                            value={profile.designation || ''}
                                            onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                                            disabled={!editing}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Role Badge */}
                        <div className="mt-6 p-4 bg-secondary-50 rounded-xl">
                            <p className="text-sm text-secondary-500">System Role</p>
                            <p className="font-semibold text-secondary-900">{roleLabels[profile.role]}</p>
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
                            <h3 className="font-semibold text-secondary-900">My Projects</h3>
                        </div>
                        <div className="space-y-3">
                            {projects.map(project => (
                                <div key={project.id} className="p-3 bg-secondary-50 rounded-xl">
                                    <p className="font-mono text-sm text-primary-600">{project.code}</p>
                                    <p className="text-sm font-medium text-secondary-900 truncate">{project.title}</p>
                                    <p className="text-xs text-secondary-500">{project.role}</p>
                                </div>
                            ))}
                            {projects.length === 0 && (
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
                                        <span className="text-sm text-secondary-700 truncate">{doc.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Login History */}
                    <div className="premium-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <ClockRegular className="w-5 h-5 text-accent-600" />
                            <h3 className="font-semibold text-secondary-900">Recent Activity</h3>
                        </div>
                        <div className="space-y-3">
                            {loginHistory.slice(0, 5).map(login => (
                                <div key={login.id} className="flex items-center gap-3">
                                    {login.success ? (
                                        <CheckmarkCircleRegular className="w-4 h-4 text-success-500" />
                                    ) : (
                                        <DismissCircleRegular className="w-4 h-4 text-danger-500" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-secondary-700">
                                            {login.success ? 'Login successful' : 'Failed attempt'}
                                        </p>
                                        <p className="text-xs text-secondary-400">
                                            {new Date(login.timestamp).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
