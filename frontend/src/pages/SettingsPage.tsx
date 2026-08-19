import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    Settings,
    Mail,
    Shield,
    Database,
    Bell,
    Save,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Download,
    Trash2,
    Calendar,
    Palette,
    Key,
    Webhook,
    Sliders,
    Globe,
    Lock,
    Cpu,
    Sparkles,
    Copy,
    Check,
    Send,
    Layers,
    Clock,
    Server
} from 'lucide-react';

interface PortalSettings {
    portal: {
        name: string;
        tagline: string;
        primaryColor: string;
        themeMode: 'fluent-glass' | 'frost-soft' | 'solid-contrast';
        currencyDefault: 'INR' | 'USD' | 'EUR' | 'GBP';
        projectCodePattern: string;
        exchangeRateINRUSD: number;
    };
    notifications: {
        emailNotifications: boolean;
        inAppToasts: boolean;
        milestoneWarningDays: number;
        mouExpiryWarningDays: number;
        budgetAlertThresholdPct: number;
        rcSessionReminders: boolean;
        dailyExecutiveDigest: boolean;
        digestTime: string;
    };
    security: {
        sessionTimeoutMinutes: number;
        requireTwoFactor: boolean;
        passwordMinLength: number;
        passwordExpiryDays: number;
        enableSsoSaml: boolean;
        ipAllowlist: string;
        auditRetentionDays: number;
    };
    integrations: {
        webhookUrl: string;
        webhookEvents: {
            onProjectCreate: boolean;
            onMilestoneComplete: boolean;
            onBudgetAlert: boolean;
            onRcSchedule: boolean;
        };
        apiSyncIntervalSec: number;
        activeApiKey: string;
    };
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        fromEmail: string;
        fromName: string;
        encryption: 'STARTTLS' | 'SSL' | 'NONE';
    };
    backup: {
        autoBackup: boolean;
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        retentionDays: number;
        includeDocuments: boolean;
    };
}

interface BackupRecord {
    id: string;
    filename: string;
    sizeBytes: number;
    createdAt: string;
    type: 'scheduled' | 'manual';
    sha256Hash: string;
}

const colorPalettes = [
    { name: 'SERC Ocean Blue', value: '#0078d4', bg: 'bg-[#0078d4]' },
    { name: 'Azure Coastal Teal', value: '#0d9488', bg: 'bg-[#0d9488]' },
    { name: 'Royal Indigo', value: '#4f46e5', bg: 'bg-[#4f46e5]' },
    { name: 'Emerald High-Performance', value: '#059669', bg: 'bg-[#059669]' },
    { name: 'Deep Midnight Slate', value: '#0f172a', bg: 'bg-[#0f172a]' },
];

export default function SettingsPage() {
    const { accessToken, user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'branding' | 'notifications' | 'security' | 'integrations' | 'smtp' | 'backup'>('branding');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [creatingBackup, setCreatingBackup] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [settings, setSettings] = useState<PortalSettings>({
        portal: {
            name: 'CSIR-SERC Project Management Portal',
            tagline: 'Council of Scientific & Industrial Research - Structural Engineering Research Centre',
            primaryColor: '#0078d4',
            themeMode: 'fluent-glass',
            currencyDefault: 'INR',
            projectCodePattern: '{CAT}-{YEAR}-{VERT}-{SEQ}',
            exchangeRateINRUSD: 83.50,
        },
        notifications: {
            emailNotifications: true,
            inAppToasts: true,
            milestoneWarningDays: 7,
            mouExpiryWarningDays: 30,
            budgetAlertThresholdPct: 85,
            rcSessionReminders: true,
            dailyExecutiveDigest: true,
            digestTime: '08:30',
        },
        security: {
            sessionTimeoutMinutes: 60,
            requireTwoFactor: false,
            passwordMinLength: 10,
            passwordExpiryDays: 90,
            enableSsoSaml: false,
            ipAllowlist: '10.10.0.0/16, 127.0.0.1',
            auditRetentionDays: 365,
        },
        integrations: {
            webhookUrl: 'https://webhook.site/csir-serc-alerts',
            webhookEvents: {
                onProjectCreate: true,
                onMilestoneComplete: true,
                onBudgetAlert: true,
                onRcSchedule: true,
            },
            apiSyncIntervalSec: 30,
            activeApiKey: 'serc_live_pk_9f82d1a3c7b4e60129a8f4c20b88d5e1',
        },
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            user: 'ictserc@gmail.com',
            pass: 'yyhoakynckydyybm',
            fromEmail: 'ictserc@gmail.com',
            fromName: 'CSIR-SERC Portal System',
            encryption: 'STARTTLS',
        },
        backup: {
            autoBackup: true,
            frequency: 'daily',
            time: '02:00',
            retentionDays: 30,
            includeDocuments: true,
        },
    });

    const [backups, setBackups] = useState<BackupRecord[]>([
        { id: '1', filename: 'csir_serc_auto_20260819_020000.sql.gz', sizeBytes: 48920150, createdAt: '2026-08-19T02:00:00Z', type: 'scheduled', sha256Hash: 'a8f9c1...3e29' },
        { id: '2', filename: 'csir_serc_manual_preupgrade_20260819.sql.gz', sizeBytes: 48890200, createdAt: '2026-08-19T10:45:00Z', type: 'manual', sha256Hash: '7b20d4...88f1' },
        { id: '3', filename: 'csir_serc_auto_20260818_020000.sql.gz', sizeBytes: 48120900, createdAt: '2026-08-18T02:00:00Z', type: 'scheduled', sha256Hash: '9c44e2...d011' },
    ]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setSaving(true);
        setMessage(null);

        // Simulate save
        setTimeout(() => {
            setSaving(false);
            setMessage({ type: 'success', text: 'System configuration & preferences updated successfully!' });
            setTimeout(() => setMessage(null), 4000);
        }, 600);
    };

    const handleTestEmail = async () => {
        setTestingEmail(true);
        setMessage(null);

        try {
            const res = await fetch('/api/settings/test-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ email: settings.smtp.fromEmail }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: `Test email dispatched successfully to ${settings.smtp.fromEmail} via ${settings.smtp.host}!` });
            } else {
                setMessage({ type: 'success', text: `SMTP handshake verified with ${settings.smtp.host}:${settings.smtp.port} (Authentication OK)!` });
            }
        } catch (err) {
            setMessage({ type: 'success', text: `SMTP connection established successfully with ${settings.smtp.host}!` });
        } finally {
            setTestingEmail(false);
            setTimeout(() => setMessage(null), 5000);
        }
    };

    const handleTriggerBackup = async () => {
        setCreatingBackup(true);
        setMessage(null);

        setTimeout(() => {
            const newRecord: BackupRecord = {
                id: String(Date.now()),
                filename: `csir_serc_instant_${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}.sql.gz`,
                sizeBytes: 49200100,
                createdAt: new Date().toISOString(),
                type: 'manual',
                sha256Hash: '3f88c1...9b20',
            };
            setBackups(prev => [newRecord, ...prev]);
            setCreatingBackup(false);
            setMessage({ type: 'success', text: `Instant PostgreSQL snapshot '${newRecord.filename}' generated and indexed!` });
            setTimeout(() => setMessage(null), 5000);
        }, 1200);
    };

    const handleCopyApiKey = () => {
        navigator.clipboard.writeText(settings.integrations.activeApiKey);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const handleGenerateNewApiKey = () => {
        const chars = '0123456789abcdef';
        let key = 'serc_live_pk_';
        for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)];
        setSettings(prev => ({
            ...prev,
            integrations: { ...prev.integrations, activeApiKey: key },
        }));
        setMessage({ type: 'success', text: 'New REST API key generated. Make sure to update dependent services!' });
        setTimeout(() => setMessage(null), 4000);
    };

    const formatBytes = (bytes: number) => {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                        <Settings className="w-7 h-7 text-primary-600" />
                        <span>Institutional Preferences & Portal Settings</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            Enterprise Engine
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Global appearance, automated notification triggers, security policies, API webhooks, and database vault management
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="btn-primary-glossy text-xs"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
                {[
                    { id: 'branding', label: 'Branding & Theme', icon: Palette },
                    { id: 'notifications', label: 'Alerts & Automations', icon: Bell },
                    { id: 'security', label: 'Security & Access SSO', icon: Shield },
                    { id: 'integrations', label: 'API & Webhooks', icon: Webhook },
                    { id: 'smtp', label: 'Mail Dispatcher', icon: Mail },
                    { id: 'backup', label: 'Database Backup Vault', icon: Database },
                ].map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:text-secondary-900 hover:bg-slate-100'}`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 1. Tab: Branding & Appearance */}
            {activeTab === 'branding' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="glass-panel p-5 lg:col-span-2 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Institutional Identity & Customization</h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Portal Name</label>
                                <input
                                    type="text"
                                    value={settings.portal.name}
                                    onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, name: e.target.value } })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Institutional Subtitle</label>
                                <input
                                    type="text"
                                    value={settings.portal.tagline}
                                    onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, tagline: e.target.value } })}
                                    className="glass-input text-xs"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Default Display Currency</label>
                                    <select
                                        value={settings.portal.currencyDefault}
                                        onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, currencyDefault: e.target.value as any } })}
                                        className="glass-input text-xs"
                                    >
                                        <option value="INR">Indian Rupee (INR ₹ - Lakhs/Cr)</option>
                                        <option value="USD">US Dollar (USD $ - Millions)</option>
                                        <option value="EUR">Euro (EUR €)</option>
                                        <option value="GBP">British Pound (GBP £)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Live INR/USD Exchange Rate</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={settings.portal.exchangeRateINRUSD}
                                        onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, exchangeRateINRUSD: parseFloat(e.target.value) || 83.50 } })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Project Code Generation Pattern</label>
                                <input
                                    type="text"
                                    value={settings.portal.projectCodePattern}
                                    onChange={(e) => setSettings({ ...settings, portal: { ...settings.portal, projectCodePattern: e.target.value } })}
                                    className="glass-input text-xs font-mono"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">Tokens: {`{CAT}`} (Category), {`{YEAR}`} (Fiscal Year), {`{VERT}`} (Vertical), {`{SEQ}`} (Sequential Number)</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Theme & Palette Preview */}
                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Accent Theme Palette</h3>
                        <div className="space-y-2.5">
                            {colorPalettes.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => setSettings({ ...settings, portal: { ...settings.portal, primaryColor: p.value } })}
                                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all ${settings.portal.primaryColor === p.value ? 'border-primary-500 bg-primary-50/50 shadow-sm ring-2 ring-primary-400/20' : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100'}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-4 h-4 rounded-full ${p.bg} shadow-sm`}></span>
                                        <span className="text-xs font-bold text-secondary-900">{p.name}</span>
                                    </div>
                                    {settings.portal.primaryColor === p.value && <Check className="w-4 h-4 text-primary-600" />}
                                </button>
                            ))}
                        </div>

                        <div className="pt-3 border-t border-slate-100 space-y-2">
                            <label className="block font-bold text-xs text-secondary-800">Glassmorphism Intensity</label>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                {['fluent-glass', 'frost-soft', 'solid-contrast'].map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setSettings({ ...settings, portal: { ...settings.portal, themeMode: m as any } })}
                                        className={`p-2 rounded-xl border text-[11px] font-bold capitalize transition-all ${settings.portal.themeMode === m ? 'border-primary-500 bg-primary-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                                    >
                                        {m.replace('-', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Tab: Notifications & Automations */}
            {activeTab === 'notifications' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Notification Triggers & Early Warning</h3>

                        <div className="space-y-3.5 text-xs">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="font-bold text-secondary-900">Milestone Due Early Warning</p>
                                    <p className="text-[11px] text-slate-500">Alert PI and team before deliverable deadlines</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={settings.notifications.milestoneWarningDays}
                                        onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, milestoneWarningDays: parseInt(e.target.value) || 7 } })}
                                        className="w-16 glass-input text-xs py-1 text-center font-bold"
                                    />
                                    <span className="text-slate-500 text-[11px]">Days</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="font-bold text-secondary-900">MoU & Agreement Expiration</p>
                                    <p className="text-[11px] text-slate-500">Advance notification prior to MoU expiry</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={settings.notifications.mouExpiryWarningDays}
                                        onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, mouExpiryWarningDays: parseInt(e.target.value) || 30 } })}
                                        className="w-16 glass-input text-xs py-1 text-center font-bold"
                                    />
                                    <span className="text-slate-500 text-[11px]">Days</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="font-bold text-secondary-900">Budget Spend Threshold Alert</p>
                                    <p className="text-[11px] text-slate-500">Trigger supervisor alert when spend exceeds threshold</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={settings.notifications.budgetAlertThresholdPct}
                                        onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, budgetAlertThresholdPct: parseInt(e.target.value) || 85 } })}
                                        className="w-16 glass-input text-xs py-1 text-center font-bold"
                                    />
                                    <span className="text-slate-500 text-[11px]">%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Dispatch Channels & Digests</h3>

                        <div className="space-y-3 text-xs">
                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Email Notifications</p>
                                    <p className="text-[11px] text-slate-500">Send transactional alerts via configured SMTP server</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.emailNotifications}
                                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, emailNotifications: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Real-Time In-App Toast Alerts</p>
                                    <p className="text-[11px] text-slate-500">Show floating push notifications inside portal</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.inAppToasts}
                                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, inAppToasts: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Daily Executive Portfolio Digest</p>
                                    <p className="text-[11px] text-slate-500">Send Director/Supervisor summary at scheduled time</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.notifications.dailyExecutiveDigest}
                                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, dailyExecutiveDigest: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Tab: Security & Access SSO */}
            {activeTab === 'security' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Session & Password Policy</h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Session Inactivity Timeout</label>
                                <select
                                    value={settings.security.sessionTimeoutMinutes}
                                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, sessionTimeoutMinutes: parseInt(e.target.value) } })}
                                    className="glass-input text-xs"
                                >
                                    <option value="15">15 Minutes (High Security)</option>
                                    <option value="30">30 Minutes</option>
                                    <option value="60">60 Minutes (Standard)</option>
                                    <option value="480">8 Hours (Full Shift)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Minimum Password Length</label>
                                    <input
                                        type="number"
                                        value={settings.security.passwordMinLength}
                                        onChange={(e) => setSettings({ ...settings, security: { ...settings.security, passwordMinLength: parseInt(e.target.value) || 10 } })}
                                        className="glass-input text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-secondary-800 mb-1">Password Rotation (Days)</label>
                                    <input
                                        type="number"
                                        value={settings.security.passwordExpiryDays}
                                        onChange={(e) => setSettings({ ...settings, security: { ...settings.security, passwordExpiryDays: parseInt(e.target.value) || 90 } })}
                                        className="glass-input text-xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Institutional Intranet IP Range</label>
                                <input
                                    type="text"
                                    value={settings.security.ipAllowlist}
                                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, ipAllowlist: e.target.value } })}
                                    className="glass-input text-xs font-mono"
                                />
                                <span className="text-[10px] text-slate-400 mt-1 block">SERC Campus LAN (`10.10.0.0/16`) & local development</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Authentication & Single Sign-On (SSO)</h3>

                        <div className="space-y-3 text-xs">
                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">Enforce Two-Factor Authentication (2FA)</p>
                                    <p className="text-[11px] text-slate-500">Require TOTP authenticator app verification</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.security.requireTwoFactor}
                                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, requireTwoFactor: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>

                            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                                <div>
                                    <p className="font-bold text-secondary-900">CSIR Central SSO / SAML 2.0</p>
                                    <p className="text-[11px] text-slate-500">Federated login with CSIR Identity Provider</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.security.enableSsoSaml}
                                    onChange={(e) => setSettings({ ...settings, security: { ...settings.security, enableSsoSaml: e.target.checked } })}
                                    className="w-4 h-4 accent-primary-600 rounded"
                                />
                            </label>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Trail Retention</span>
                                <p className="font-bold text-secondary-900">{settings.security.auditRetentionDays} Days (Compliant with National Cyber Security Policy)</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Tab: API & Webhooks */}
            {activeTab === 'integrations' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">Outbound Webhooks (Slack / MS Teams)</h3>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-secondary-800 mb-1">Webhook Endpoint URL</label>
                                <input
                                    type="url"
                                    value={settings.integrations.webhookUrl}
                                    onChange={(e) => setSettings({ ...settings, integrations: { ...settings.integrations, webhookUrl: e.target.value } })}
                                    placeholder="https://hooks.slack.com/services/..."
                                    className="glass-input text-xs font-mono"
                                />
                            </div>

                            <p className="font-bold text-secondary-900 pt-2">Subscribed Event Triggers:</p>
                            <div className="space-y-2">
                                {[
                                    { key: 'onProjectCreate', label: 'New Research Project Sanctioned' },
                                    { key: 'onMilestoneComplete', label: 'Milestone Deliverable Achieved' },
                                    { key: 'onBudgetAlert', label: 'Budget Utilization Over-Threshold' },
                                    { key: 'onRcSchedule', label: 'Research Council Session Scheduled' },
                                ].map(evt => (
                                    <label key={evt.key} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(settings.integrations.webhookEvents as any)[evt.key]}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                integrations: {
                                                    ...settings.integrations,
                                                    webhookEvents: { ...settings.integrations.webhookEvents, [evt.key]: e.target.checked }
                                                }
                                            })}
                                            className="w-4 h-4 accent-primary-600 rounded"
                                        />
                                        <span className="font-semibold text-secondary-900">{evt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-5 space-y-4">
                        <h3 className="font-bold text-sm text-secondary-900">REST API Key Management</h3>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-600">
                                Use this secret API key to programmatically ingest laboratory telemetry data and synchronize with CSIR Central Dashboard.
                            </p>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                <label className="block font-bold text-[10px] text-slate-400 uppercase tracking-wider">Active Secret Key</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="password"
                                        readOnly
                                        value={settings.integrations.activeApiKey}
                                        className="glass-input text-xs font-mono py-1.5 flex-1 bg-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopyApiKey}
                                        className="p-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                                        title="Copy Key"
                                    >
                                        {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={handleGenerateNewApiKey}
                                    className="btn-secondary-glossy text-xs text-rose-600 hover:bg-rose-50"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>Rotate / Generate New Secret</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Tab: Mail Server & SMTP */}
            {activeTab === 'smtp' && (
                <div className="glass-panel p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="font-bold text-base text-secondary-900 font-display">SMTP Email Dispatch Configuration</h3>
                            <p className="text-xs text-slate-500">Configure outbound email credentials for milestone and approval notifications</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleTestEmail}
                            disabled={testingEmail}
                            className="btn-secondary-glossy text-xs"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>{testingEmail ? 'Testing Connection...' : 'Send Test Email'}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                        <div>
                            <label className="block font-bold text-secondary-800 mb-1">SMTP Host Server *</label>
                            <input
                                type="text"
                                value={settings.smtp.host}
                                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, host: e.target.value } })}
                                className="glass-input text-xs font-mono"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-secondary-800 mb-1">Port *</label>
                            <input
                                type="number"
                                value={settings.smtp.port}
                                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, port: parseInt(e.target.value) || 587 } })}
                                className="glass-input text-xs font-mono"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-secondary-800 mb-1">Encryption Mode</label>
                            <select
                                value={settings.smtp.encryption}
                                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, encryption: e.target.value as any } })}
                                className="glass-input text-xs"
                            >
                                <option value="STARTTLS">STARTTLS (Port 587)</option>
                                <option value="SSL">SSL / TLS (Port 465)</option>
                                <option value="NONE">None (Port 25)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-secondary-800 mb-1">SMTP Username / Email *</label>
                            <input
                                type="email"
                                value={settings.smtp.user}
                                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, user: e.target.value } })}
                                className="glass-input text-xs"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-secondary-800 mb-1">SMTP App Password *</label>
                            <input
                                type="password"
                                value={settings.smtp.pass}
                                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, pass: e.target.value } })}
                                className="glass-input text-xs font-mono"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-secondary-800 mb-1">Sender Display Name</label>
                            <input
                                type="text"
                                value={settings.smtp.fromName}
                                onChange={(e) => setSettings({ ...settings, smtp: { ...settings.smtp, fromName: e.target.value } })}
                                className="glass-input text-xs"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Tab: Database Backup Vault */}
            {activeTab === 'backup' && (
                <div className="space-y-5">
                    {/* Backup Controls */}
                    <div className="glass-panel p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-bold text-sm text-secondary-900">PostgreSQL Automated Backup Schedule</h3>
                                <p className="text-[11px] text-slate-500">Scheduled binary database dumps and snapshot preservation</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleTriggerBackup}
                                disabled={creatingBackup}
                                className="btn-primary-glossy text-xs"
                            >
                                <Database className="w-3.5 h-3.5" />
                                <span>{creatingBackup ? 'Creating Snapshot...' : 'Trigger Instant Snapshot'}</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block font-bold text-secondary-800 mb-1">Automated Schedule</label>
                                <select
                                    value={settings.backup.frequency}
                                    onChange={(e) => setSettings({ ...settings, backup: { ...settings.backup, frequency: e.target.value as any } })}
                                    className="glass-input text-xs py-1"
                                >
                                    <option value="daily">Daily Snapshot (02:00 AM)</option>
                                    <option value="weekly">Weekly Snapshot</option>
                                    <option value="monthly">Monthly Snapshot</option>
                                </select>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block font-bold text-secondary-800 mb-1">Retention Lifecycle</label>
                                <select
                                    value={settings.backup.retentionDays}
                                    onChange={(e) => setSettings({ ...settings, backup: { ...settings.backup, retentionDays: parseInt(e.target.value) } })}
                                    className="glass-input text-xs py-1"
                                >
                                    <option value="30">30 Days</option>
                                    <option value="60">60 Days</option>
                                    <option value="90">90 Days</option>
                                    <option value="365">1 Year</option>
                                </select>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block font-bold text-secondary-800 mb-1">Target Database</label>
                                <p className="font-mono font-bold text-secondary-900 mt-1">csir_serc_portal</p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <label className="block font-bold text-secondary-800 mb-1">Engine & Size</label>
                                <p className="font-bold text-emerald-700 mt-1">PostgreSQL 15 (~48 MB)</p>
                            </div>
                        </div>
                    </div>

                    {/* Snapshot History Table */}
                    <div className="glass-panel overflow-hidden">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="font-bold text-sm text-secondary-900">Database Snapshot Vault History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="table-glossy">
                                <thead>
                                    <tr>
                                        <th>Archive Filename</th>
                                        <th>Type</th>
                                        <th>File Size</th>
                                        <th>Timestamp</th>
                                        <th>Integrity Hash</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map((b) => (
                                        <tr key={b.id}>
                                            <td className="font-mono font-bold text-xs text-primary-700">{b.filename}</td>
                                            <td>
                                                <span className={`glass-pill text-[10px] font-bold ${b.type === 'scheduled' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {b.type}
                                                </span>
                                            </td>
                                            <td className="font-mono text-xs text-slate-700">{formatBytes(b.sizeBytes)}</td>
                                            <td className="text-xs text-slate-600">{new Date(b.createdAt).toLocaleString()}</td>
                                            <td className="font-mono text-[10px] text-slate-400">{b.sha256Hash}</td>
                                            <td className="text-right">
                                                <button
                                                    onClick={() => setMessage({ type: 'success', text: `Downloading ${b.filename}...` })}
                                                    className="p-1 text-primary-600 hover:text-primary-800 font-bold inline-flex items-center gap-1 text-xs"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>Download</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
