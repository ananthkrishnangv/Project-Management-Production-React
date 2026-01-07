import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    PersonRegular,
    LockClosedRegular,
    EyeRegular,
    EyeOffRegular,
    ShieldCheckmarkRegular,
    ArrowRightRegular,
    BuildingRegular,
    PeopleTeamRegular,
    DocumentBulletListRegular,
    ChartMultipleRegular
} from '@fluentui/react-icons';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [show2FA, setShow2FA] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();

        const success = await login(email, password, show2FA ? twoFactorCode : undefined);

        if (success) {
            navigate('/dashboard');
        } else if (error === '2FA_REQUIRED') {
            setShow2FA(true);
        }
    };

    // Public statistics glimpse
    const publicStats = [
        { icon: <BuildingRegular className="w-6 h-6" />, value: '150+', label: 'Active Projects' },
        { icon: <PeopleTeamRegular className="w-6 h-6" />, value: '200+', label: 'Scientists' },
        { icon: <DocumentBulletListRegular className="w-6 h-6" />, value: '500+', label: 'Publications' },
        { icon: <ChartMultipleRegular className="w-6 h-6" />, value: '₹100Cr+', label: 'Research Value' },
    ];

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            {/* Background Image - CSIR SERC Main Building */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url('/images/CSIR SERC Main Building.png')`,
                }}
            >
                {/* Premium gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 via-primary-800/90 to-primary-900/80" />

                {/* Subtle pattern overlay */}
                <div
                    className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                />
            </div>

            {/* Left Side - Public Information */}
            <div className="hidden lg:flex lg:w-3/5 relative z-10 flex-col justify-between p-12">
                {/* Logo and Title */}
                <div className="flex items-center gap-4">
                    <img
                        src="/images/CSIR-LOGO-PNG-200px.jpg"
                        alt="CSIR Logo"
                        className="h-16 w-auto object-contain rounded-xl shadow-premium-lg bg-white p-1"
                    />
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white">CSIR-SERC</h1>
                        <p className="text-primary-200 text-sm">Structural Engineering Research Centre</p>
                    </div>
                </div>

                {/* Hero Content */}
                <div className="max-w-xl">
                    <h2 className="text-5xl font-display font-bold text-white leading-tight mb-6">
                        Project Management
                        <span className="block text-gradient-gold bg-clip-text text-transparent bg-gradient-to-r from-accent-400 to-accent-300">
                            Excellence
                        </span>
                    </h2>
                    <p className="text-xl text-primary-100 leading-relaxed mb-8">
                        Comprehensive research project governance, financial tracking, and
                        Research Council management for India's premier structural engineering institution.
                    </p>

                    {/* Public Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        {publicStats.map((stat, index) => (
                            <div
                                key={index}
                                className="glass-card p-4 flex items-center gap-4 backdrop-blur-md 
                         bg-white/10 border border-white/20 rounded-xl
                         transform transition-all duration-300 hover:bg-white/15 hover:-translate-y-1"
                            >
                                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center text-accent-400">
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                    <p className="text-sm text-primary-200">{stat.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <p className="text-primary-200 text-sm">
                        © {new Date().getFullYear()} Council of Scientific and Industrial Research
                    </p>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-2/5 relative z-10 flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    {/* Glass Card */}
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-premium-xl p-8 lg:p-10 border border-white/50">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                            <img
                                src="/images/CSIR-LOGO-PNG-200px.jpg"
                                alt="CSIR Logo"
                                className="h-12 w-auto object-contain rounded-lg shadow-premium"
                            />
                            <div>
                                <h1 className="text-xl font-display font-bold text-primary-700">CSIR-SERC</h1>
                                <p className="text-xs text-secondary-500">Project Management Portal</p>
                            </div>
                        </div>

                        {/* Welcome Text */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-display font-bold text-secondary-900 mb-2">
                                Welcome Back
                            </h2>
                            <p className="text-secondary-500">
                                Sign in to access your dashboard
                            </p>
                        </div>

                        {/* Login Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email Input */}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <PersonRegular className="w-5 h-5 text-secondary-400" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-premium pl-12"
                                        placeholder="you@serc.res.in"
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password Input */}
                            <div>
                                <label className="block text-sm font-medium text-secondary-700 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <LockClosedRegular className="w-5 h-5 text-secondary-400" />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-premium pl-12 pr-12"
                                        placeholder="••••••••"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-secondary-400 hover:text-secondary-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOffRegular className="w-5 h-5" />
                                        ) : (
                                            <EyeRegular className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* 2FA Input - Conditional */}
                            {show2FA && (
                                <div className="animate-slide-down">
                                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                                        Two-Factor Code
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <ShieldCheckmarkRegular className="w-5 h-5 text-secondary-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={twoFactorCode}
                                            onChange={(e) => setTwoFactorCode(e.target.value)}
                                            className="input-premium pl-12 text-center tracking-widest text-lg"
                                            placeholder="000000"
                                            maxLength={6}
                                            pattern="[0-9]*"
                                            inputMode="numeric"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="mt-2 text-sm text-secondary-500">
                                        Enter the 6-digit code from your authenticator app
                                    </p>
                                </div>
                            )}

                            {/* Error Message */}
                            {error && error !== '2FA_REQUIRED' && (
                                <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl text-danger-700 text-sm animate-slide-down">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full btn-primary flex items-center justify-center gap-2 py-4"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRightRegular className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Security Notice */}
                        <div className="mt-8 pt-6 border-t border-secondary-200">
                            <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-xl">
                                <ShieldCheckmarkRegular className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-primary-900">Secure Government Portal</p>
                                    <p className="text-xs text-primary-600 mt-1">
                                        This portal is restricted to authorized CSIR-SERC personnel only.
                                        All activities are logged for security audit.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Help Link */}
                    <p className="mt-6 text-center text-white/80 text-sm">
                        Having trouble signing in?{' '}
                        <a href="mailto:ictserc@gmail.com" className="text-accent-400 hover:text-accent-300 font-medium">
                            Contact IT Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
