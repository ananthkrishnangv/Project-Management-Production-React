import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    SettingsRegular,
    MailRegular,
    ShieldRegular,
    DatabaseRegular,
    SaveRegular,
    ArrowSyncRegular,
    CheckmarkCircleRegular,
    AlertRegular,
    ArrowDownloadRegular,
    DeleteRegular,
    CalendarRegular,
    ColorRegular,
} from '@fluentui/react-icons';

interface Settings {
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        fromEmail: string;
        fromName: string;
    };
    portal: {
        name: string;
        tagline: string;
        primaryColor: string;
    };
    backup: {
        autoBackup: boolean;
        backupFrequency: 'daily' | 'weekly' | 'monthly';
        backupTime: string;
        retentionDays: number;
    };
    notifications: {
        emailNotifications: boolean;
        milestoneReminders: boolean;
        mouExpiryAlerts: boolean;
        budgetAlerts: boolean;
    };
}

interface Backup {
    id: string;
    filename: string;
    size: number;
    createdAt: string;
    type: 'manual' | 'scheduled';
}

export default function SettingsPage() {
    const { accessToken, user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'smtp' | 'portal' | 'notifications' | 'backup'>('smtp');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [settings, setSettings] = useState<Settings>({
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            user: 'ictserc@gmail.com',
            pass: '••••••••••••',
            fromEmail: 'noreply@serc.res.in',
            fromName: 'CSIR-SERC Portal',
        },
        portal: {
            name: 'CSIR-SERC Project Management Portal',
            tagline: 'Structural Engineering Research Centre',
            primaryColor: '#0369cc',
        },
        backup: {
            autoBackup: true,
            backupFrequency: 'daily',
            backupTime: '02:00',
            retentionDays: 30,
        },
        notifications: {
            emailNotifications: true,
            milestoneReminders: true,
            mouExpiryAlerts: true,
            budgetAlerts: true,
        },
    });

    const [backups, setBackups] = useState<Backup[]>([
        { id: '1', filename: 'backup_2024-12-31_02-00.sql.gz', size: 45000000, createdAt: '2024-12-31T02:00:00', type: 'scheduled' },
        { id: '2', filename: 'backup_2024-12-30_02-00.sql.gz', size: 44500000, createdAt: '2024-12-30T02:00:00', type: 'scheduled' },
        { id: '3', filename: 'backup_manual_2024-12-28.sql.gz', size: 44200000, createdAt: '2024-12-28T14:30:00', type: 'manual' },
    ]);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        setSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    const handleTestEmail = async () => {
        setTestingEmail(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setMessage({ type: 'success', text: 'Test email sent successfully!' });
        setTestingEmail(false);
        setTimeout(() => setMessage(null), 3000);
    };

    const handleCreateBackup = async () => {
        setCreatingBackup(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const newBackup: Backup = {
            id: Date.now().toString(),
            filename: `backup_manual_${new Date().toISOString().split('T')[0]}.sql.gz`,
            size: 45500000,
            createdAt: new Date().toISOString(),
            type: 'manual',
        };
        setBackups([newBackup, ...backups]);
        setMessage({ type: 'success', text: 'Backup created successfully!' });
        setCreatingBackup(false);
        setTimeout(() => setMessage(null), 3000);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
        if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    const isAdmin = user?.role === 'ADMIN';

    if (!isAdmin) {
        return (
            <div className="animate-fade-in">
                <div className="premium-card p-12 text-center">
                    <ShieldRegular className="w-16 h-16 mx-auto text-secondary-300 mb-4" />
                    <h2 className="text-xl font-semibold text-secondary-900 mb-2">Access Denied</h2>
                    <p className="text-secondary-500">You don't have permission to access system settings.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="skeleton h-8 w-64" />
                <div className="premium-card p-6">
                    <div className="skeleton h-96 w-full" />
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'smtp', label: 'Email/SMTP', icon: MailRegular },
        { id: 'portal', label: 'Portal Settings', icon: ColorRegular },
        { id: 'notifications', label: 'Notifications', icon: AlertRegular },
        { id: 'backup', label: 'Backup & Restore', icon: DatabaseRegular },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">System Settings</h1>
                    <p className="text-secondary-500 mt-1">Configure portal settings, email, and backups</p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-success-50 border border-success-200'
                        : 'bg-danger-50 border border-danger-200'
                    }`}>
                    <CheckmarkCircleRegular className={`w-5 h-5 ${message.type === 'success' ? 'text-success-500' : 'text-danger-500'}`} />
                    <span className={message.type === 'success' ? 'text-success-700' : 'text-danger-700'}>
                        {message.text}
                    </span>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Tabs */}
                <div className="lg:w-64 flex-shrink-0">
                    <div className="premium-card p-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${activeTab === tab.id
                                        ? 'bg-primary-50 text-primary-600'
                                        : 'text-secondary-600 hover:bg-secondary-50'
                                    }`}
                            >
                                <tab.icon className="w-5 h-5" />
                                <span className="font-medium">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                    {activeTab === 'smtp' && (
                        <div className="premium-card p-6 space-y-6">
                            <h3 className="text-lg font-semibold text-secondary-900">SMTP Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">SMTP Host</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={settings.smtp.host}
                                        onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Port</label>
                                    <input
                                        type="number"
                                        className="input-premium"
                                        value={settings.smtp.port}
                                        onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, port: parseInt(e.target.value) } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Username</label>
                                    <input
                                        type="email"
                                        className="input-premium"
                                        value={settings.smtp.user}
                                        onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, user: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Password</label>
                                    <input
                                        type="password"
                                        className="input-premium"
                                        value={settings.smtp.pass}
                                        onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, pass: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">From Email</label>
                                    <input
                                        type="email"
                                        className="input-premium"
                                        value={settings.smtp.fromEmail}
                                        onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, fromEmail: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">From Name</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={settings.smtp.fromName}
                                        onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, fromName: e.target.value } })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleTestEmail} disabled={testingEmail} className="btn-secondary flex items-center gap-2">
                                    {testingEmail ? <ArrowSyncRegular className="w-5 h-5 animate-spin" /> : <MailRegular className="w-5 h-5" />}
                                    {testingEmail ? 'Sending...' : 'Send Test Email'}
                                </button>
                                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                    {saving ? <ArrowSyncRegular className="w-5 h-5 animate-spin" /> : <SaveRegular className="w-5 h-5" />}
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            {/* Backup Actions */}
                            <div className="premium-card p-6">
                                <h3 className="text-lg font-semibold text-secondary-900 mb-4">Backup & Restore</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-medium text-secondary-800 mb-3">Manual Backup</h4>
                                        <p className="text-sm text-secondary-500 mb-4">
                                            Create an immediate backup of the database and application files.
                                        </p>
                                        <button
                                            onClick={handleCreateBackup}
                                            disabled={creatingBackup}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            {creatingBackup ? (
                                                <ArrowSyncRegular className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <DatabaseRegular className="w-5 h-5" />
                                            )}
                                            {creatingBackup ? 'Creating Backup...' : 'Create Backup Now'}
                                        </button>
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-secondary-800 mb-3">Automatic Backup</h4>
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.backup.autoBackup}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        backup: { ...settings.backup, autoBackup: e.target.checked }
                                                    })}
                                                    className="w-5 h-5 text-primary-600 rounded border-secondary-300"
                                                />
                                                <span className="text-secondary-700">Enable automatic backups</span>
                                            </label>
                                            <div className="flex gap-3">
                                                <select
                                                    className="input-premium"
                                                    value={settings.backup.backupFrequency}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        backup: { ...settings.backup, backupFrequency: e.target.value as any }
                                                    })}
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                                <input
                                                    type="time"
                                                    className="input-premium"
                                                    value={settings.backup.backupTime}
                                                    onChange={(e) => setSettings({
                                                        ...settings,
                                                        backup: { ...settings.backup, backupTime: e.target.value }
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Backup List */}
                            <div className="premium-card overflow-hidden">
                                <div className="p-4 border-b border-secondary-100">
                                    <h4 className="font-semibold text-secondary-900">Backup History</h4>
                                </div>
                                <table className="table-premium">
                                    <thead>
                                        <tr>
                                            <th>Filename</th>
                                            <th>Type</th>
                                            <th>Size</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.map(backup => (
                                            <tr key={backup.id}>
                                                <td className="font-mono text-sm">{backup.filename}</td>
                                                <td>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${backup.type === 'scheduled'
                                                            ? 'bg-primary-100 text-primary-700'
                                                            : 'bg-secondary-100 text-secondary-700'
                                                        }`}>
                                                        {backup.type}
                                                    </span>
                                                </td>
                                                <td>{formatFileSize(backup.size)}</td>
                                                <td className="text-secondary-500">
                                                    {new Date(backup.createdAt).toLocaleString('en-IN')}
                                                </td>
                                                <td>
                                                    <div className="flex gap-1">
                                                        <button className="p-2 hover:bg-secondary-100 rounded-lg" title="Download">
                                                            <ArrowDownloadRegular className="w-4 h-4 text-secondary-500" />
                                                        </button>
                                                        <button className="p-2 hover:bg-secondary-100 rounded-lg" title="Delete">
                                                            <DeleteRegular className="w-4 h-4 text-danger-500" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="premium-card p-6 space-y-6">
                            <h3 className="text-lg font-semibold text-secondary-900">Notification Settings</h3>
                            <div className="space-y-4">
                                {[
                                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Send email notifications for important events' },
                                    { key: 'milestoneReminders', label: 'Milestone Reminders', description: 'Notify project heads about upcoming milestones' },
                                    { key: 'mouExpiryAlerts', label: 'MoU Expiry Alerts', description: 'Alert about MoUs expiring within 30 days' },
                                    { key: 'budgetAlerts', label: 'Budget Alerts', description: 'Notify when budget utilization exceeds 80%' },
                                ].map(item => (
                                    <label key={item.key} className="flex items-start gap-4 p-4 bg-secondary-50 rounded-xl cursor-pointer hover:bg-secondary-100">
                                        <input
                                            type="checkbox"
                                            checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                notifications: { ...settings.notifications, [item.key]: e.target.checked }
                                            })}
                                            className="w-5 h-5 mt-0.5 text-primary-600 rounded border-secondary-300"
                                        />
                                        <div>
                                            <p className="font-medium text-secondary-900">{item.label}</p>
                                            <p className="text-sm text-secondary-500">{item.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                {saving ? <ArrowSyncRegular className="w-5 h-5 animate-spin" /> : <SaveRegular className="w-5 h-5" />}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'portal' && (
                        <div className="premium-card p-6 space-y-6">
                            <h3 className="text-lg font-semibold text-secondary-900">Portal Configuration</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Portal Name</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={settings.portal.name}
                                        onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, name: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Tagline</label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        value={settings.portal.tagline}
                                        onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, tagline: e.target.value } })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">Primary Color</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="color"
                                            className="w-12 h-12 rounded-lg border border-secondary-200 cursor-pointer"
                                            value={settings.portal.primaryColor}
                                            onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, primaryColor: e.target.value } })}
                                        />
                                        <input
                                            type="text"
                                            className="input-premium flex-1"
                                            value={settings.portal.primaryColor}
                                            onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, primaryColor: e.target.value } })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                {saving ? <ArrowSyncRegular className="w-5 h-5 animate-spin" /> : <SaveRegular className="w-5 h-5" />}
                                {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
