import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    User,
    Mail,
    Phone,
    Building,
    Lock,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Briefcase,
    Save,
    Eye,
    EyeOff,
    Sparkles,
    FolderKanban,
    Award,
    Key,
    Clock,
    Monitor
} from 'lucide-react';

export default function ProfilePage() {
    const { user, accessToken, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [profile, setProfile] = useState({
        firstName: user?.firstName || 'Director',
        lastName: user?.lastName || 'CSIR-SERC',
        email: user?.email || 'director@serc.res.in',
        designation: user?.designation || 'Director & Head of Laboratory',
        department: user?.department || 'Directorate',
        phone: user?.phone || '+91 44 2254 2135',
        mobile: '+91 94440 12345',
        employeeId: 'SERC-DIR-001',
        bio: 'Leading structural dynamics, earthquake engineering, offshore infrastructure resilience, and advanced materials research.',
        twoFactorEnabled: true,
        notificationPreferences: {
            emailDigest: true,
            milestoneAlerts: true,
            proposalReviews: true,
            budgetApprovals: true,
        },
        defaultCurrency: 'INR',
        themePreference: 'fluent-glass',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        setTimeout(() => {
            setSaving(false);
            if (user) {
                setUser({
                    ...user,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    designation: profile.designation,
                    phone: profile.phone,
                    department: profile.department,
                });
            }
            setMessage({ type: 'success', text: 'Personal preferences and profile updated successfully!' });
            setTimeout(() => setMessage(null), 4000);
        }, 500);
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        setChangingPassword(true);
        setTimeout(() => {
            setChangingPassword(false);
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setMessage({ type: 'success', text: 'Security credentials and password updated successfully!' });
            setTimeout(() => setMessage(null), 4000);
        }, 600);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Notification Toast */}
            {message && (
                <div className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-xl flex items-center gap-2.5 animate-fade-in ${message.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                    <span className="font-semibold text-xs">{message.text}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                    <User className="w-7 h-7 text-primary-600" />
                    <span>Scientist Profile & User Preferences</span>
                    <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                        {user?.role || 'DIRECTOR'}
                    </span>
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                    Manage your personal scientist credentials, communication preferences, and security access
                </p>
            </div>

            {/* Hero Profile Banner */}
            <div className="glass-panel p-6 bg-gradient-to-r from-white via-primary-50/40 to-slate-50 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-primary-glossy text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                            {profile.firstName[0] || 'D'}
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-secondary-900 font-display">
                                    Dr. {profile.firstName} {profile.lastName}
                                </h2>
                                <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Active Scientist
                                </span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium">{profile.designation} • {profile.department}</p>
                            <p className="text-[11px] text-slate-400 font-mono">ID: {profile.employeeId} • {profile.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="p-3 bg-white/80 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-400 block font-bold">Role Access</span>
                            <span className="font-bold text-primary-700">{user?.role || 'DIRECTOR'}</span>
                        </span>
                        <span className="p-3 bg-white/80 rounded-2xl border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-400 block font-bold">2FA Status</span>
                            <span className="font-bold text-emerald-700">Protected</span>
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Personal Information Form (2 Cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSaveProfile} className="glass-panel p-6 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900 pb-2 border-b border-slate-100">Personal & Academic Details</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">First Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Last Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Official Email</label>
                                <input
                                    type="email"
                                    disabled
                                    value={profile.email}
                                    className="glass-input text-xs bg-slate-100/70 text-slate-500 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Designation</label>
                                <input
                                    type="text"
                                    value={profile.designation}
                                    onChange={(e) => setProfile({ ...profile, designation: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Department / Vertical</label>
                                <input
                                    type="text"
                                    value={profile.department}
                                    onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Phone / Ext.</label>
                                <input
                                    type="text"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-xs text-secondary-800 mb-1">Research Specialization & Bio</label>
                            <textarea
                                rows={3}
                                value={profile.bio}
                                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                                className="glass-input text-xs"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary-glossy text-xs"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{saving ? 'Saving...' : 'Update Scientist Profile'}</span>
                            </button>
                        </div>
                    </form>

                    {/* Personal Notification Preferences */}
                    <div className="glass-panel p-6 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900 pb-2 border-b border-slate-100">Personal Alert Subscriptions</h3>

                        <div className="space-y-3 text-xs">
                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Milestone Deadlines & Status Changes</p>
                                    <p className="text-[11px] text-slate-500">Receive alerts when deliverables in your projects are updated</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={profile.notificationPreferences.milestoneAlerts}
                                    onChange={(e) => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, milestoneAlerts: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Proposal Scrutiny & Sanction Reviews</p>
                                    <p className="text-[11px] text-slate-500">Get notified when proposals require director or BKMD approval</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={profile.notificationPreferences.proposalReviews}
                                    onChange={(e) => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, proposalReviews: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Budget Change Requests</p>
                                    <p className="text-[11px] text-slate-500">Notify upon fund re-allocation or contingency disbursements</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={profile.notificationPreferences.budgetApprovals}
                                    onChange={(e) => setProfile({ ...profile, notificationPreferences: { ...profile.notificationPreferences, budgetApprovals: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Security, Password & Active Sessions (1 Col) */}
                <div className="space-y-6">
                    {/* Change Password */}
                    <form onSubmit={handleChangePassword} className="glass-panel p-6 space-y-3.5">
                        <h3 className="font-bold text-sm text-secondary-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-primary-600" />
                            <span>Security & Password</span>
                        </h3>

                        <div className="text-xs space-y-3">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPass ? 'text' : 'password'}
                                        required
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        className="glass-input text-xs pr-9"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPass ? 'text' : 'password'}
                                        required
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        className="glass-input text-xs pr-9"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass(!showNewPass)}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={changingPassword}
                                className="btn-secondary-glossy text-xs w-full justify-center mt-2"
                            >
                                <Key className="w-3.5 h-3.5" />
                                <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                            </button>
                        </div>
                    </form>

                    {/* Active Login Sessions */}
                    <div className="glass-panel p-6 space-y-3">
                        <h3 className="font-bold text-sm text-secondary-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-emerald-600" />
                            <span>Active Login Sessions</span>
                        </h3>

                        <div className="space-y-2.5 text-xs">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-secondary-900">Current Workstation</span>
                                    <span className="glass-pill text-[9px] font-bold bg-emerald-50 text-emerald-700">Active Now</span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-mono">10.10.200.36 • SERC Intranet</p>
                                <p className="text-[10px] text-slate-400">Chrome / Windows 11 Enterprise</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
