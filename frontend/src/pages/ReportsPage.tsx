import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
    TrendingUp,
    Download,
    Filter,
    Calendar,
    BadgeIndianRupee,
    FolderKanban,
    Users,
    FileSpreadsheet,
    Layers,
    Sparkles,
    Image,
    Briefcase
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

export default function ReportsPage() {
    const { accessToken } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'portfolio' | 'financial' | 'verticals'>('portfolio');

    // Chart refs for export
    const categoryChartRef = useRef<any>(null);
    const monthlyChartRef = useRef<any>(null);
    const budgetChartRef = useRef<any>(null);

    const saveChart = (ref: any, name: string) => {
        if (ref?.current) {
            const url = ref.current.toBase64Image('image/png', 1);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${name}_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const categoryData = {
        labels: ['Externally Funded (EFP)', 'Consultancy (CNP)', 'Other Lab (OLP)', 'Grant-in-Aid (GAP)', 'Short Term (STS)'],
        datasets: [
            {
                data: [92, 37, 16, 9, 1],
                backgroundColor: ['#0078d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
                borderWidth: 2,
                borderColor: '#ffffff',
            },
        ],
    };

    const monthlyGrowthData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Milestones Completed',
                data: [14, 19, 24, 28, 35, 42, 48, 56, 62, 70, 78, 85],
                backgroundColor: 'rgba(0, 120, 212, 0.8)',
                borderRadius: 8,
            },
            {
                label: 'New Deliverables Initiated',
                data: [8, 12, 15, 14, 18, 20, 22, 25, 24, 28, 30, 32],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 8,
            },
        ],
    };

    const budgetComparisonData = {
        labels: ['Equipment', 'Manpower', 'Consumables', 'Travel', 'Overhead', 'Contingency'],
        datasets: [
            {
                label: 'Sanctioned Budget (₹ Lakhs)',
                data: [924, 616, 330, 132, 140, 60],
                backgroundColor: 'rgba(0, 120, 212, 0.3)',
                borderColor: '#0078d4',
                borderWidth: 2,
                borderRadius: 8,
            },
            {
                label: 'Actual Incurred Spend (₹ Lakhs)',
                data: [154, 112, 48, 19, 14, 5],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 8,
            },
        ],
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                        <TrendingUp className="w-7 h-7 text-primary-600" />
                        <span>Executive Reports & Analytical Intelligence</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            FY 2025-26
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        High-resolution analytical reporting, portfolio distributions, and financial burndown intelligence
                    </p>
                </div>
            </div>

            {/* 1. Top KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Portfolio Value</span>
                    <p className="text-2xl font-black text-secondary-900 mt-1">₹22.01 Cr</p>
                    <p className="text-xs text-slate-500">155 active & sanctioned projects</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Milestone Velocity</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">152 Met</p>
                    <p className="text-xs text-slate-500">+18 completed this quarter</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Research Publications</span>
                    <p className="text-2xl font-black text-primary-700 mt-1">42 Papers</p>
                    <p className="text-xs text-slate-500">Indexed SCI/Scopus</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Patents & IPR</span>
                    <p className="text-2xl font-black text-violet-700 mt-1">8 Filed</p>
                    <p className="text-xs text-slate-500">Commercial transfers</p>
                </div>
            </div>

            {/* 2. Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
                {[
                    { id: 'portfolio', label: 'Portfolio Analytics', icon: FolderKanban },
                    { id: 'financial', label: 'Financial Burndown', icon: BadgeIndianRupee },
                    { id: 'verticals', label: 'Research Verticals', icon: Layers },
                ].map(t => {
                    const Icon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id as any)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isActive ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:text-secondary-900 hover:bg-slate-100'}`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 3. Tab Contents */}

            {/* Tab 1: Portfolio Analytics */}
            {activeTab === 'portfolio' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Category Donut (1 Col) */}
                    <div className="glass-panel p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-bold text-sm text-secondary-900">Projects by Category</h3>
                                <p className="text-[11px] text-slate-500">Total 155 projects distribution</p>
                            </div>
                            <button
                                onClick={() => saveChart(categoryChartRef, 'Projects_By_Category')}
                                className="p-1 text-slate-400 hover:text-primary-600"
                                title="Download Chart as PNG"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-60 relative flex items-center justify-center">
                            <Doughnut
                                ref={categoryChartRef}
                                data={categoryData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
                                    cutout: '68%',
                                }}
                            />
                        </div>
                    </div>

                    {/* Monthly Throughput Bar Chart (2 Cols) */}
                    <div className="glass-panel p-5 lg:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-bold text-sm text-secondary-900">Monthly Milestone Throughput</h3>
                                <p className="text-[11px] text-slate-500">Completed vs Initiated deliverables YTD</p>
                            </div>
                            <button
                                onClick={() => saveChart(monthlyChartRef, 'Milestone_Throughput')}
                                className="p-1 text-slate-400 hover:text-primary-600"
                                title="Download Chart as PNG"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-60">
                            <Bar
                                ref={monthlyChartRef}
                                data={monthlyGrowthData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                                    scales: {
                                        y: { grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 10 } } },
                                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Financial Burndown */}
            {activeTab === 'financial' && (
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Sanctioned vs Incurred Spend by Head</h3>
                            <p className="text-[11px] text-slate-500">Equipment, Manpower, Consumables, and Overhead comparisons</p>
                        </div>
                        <button
                            onClick={() => saveChart(budgetChartRef, 'Budget_vs_Actual_Spend')}
                            className="p-1 text-slate-400 hover:text-primary-600"
                            title="Download Chart as PNG"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="h-72">
                        <Bar
                            ref={budgetChartRef}
                            data={budgetComparisonData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                                scales: {
                                    y: { grid: { color: 'rgba(226, 232, 240, 0.6)' }, ticks: { font: { size: 10 } } },
                                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                },
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Tab 3: Research Verticals */}
            {activeTab === 'verticals' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { code: 'SHMLE', name: 'Structural Health Monitoring & Life Extension', count: 154, budget: '₹21.8 Cr', lead: 'Dr. Saptarshi Sasmal' },
                        { code: 'DM', name: 'Disaster Mitigation', count: 1, budget: '₹22.5 Lakhs', lead: 'Dr. M.B. Anoop' },
                        { code: 'AMSS', name: 'Advanced Materials for Sustainable Structures', count: 4, budget: '₹85.0 Lakhs', lead: 'Dr. K. Ramanjaneyulu' },
                        { code: 'SMFS', name: 'Special & Multi-Functional Structures', count: 2, budget: '₹48.0 Lakhs', lead: 'Dr. P. Srinivasan' },
                        { code: 'EI', name: 'Energy Infrastructure', count: 2, budget: '₹55.0 Lakhs', lead: 'Dr. N. Anand' },
                        { code: 'OS', name: 'Offshore Structures', count: 1, budget: '₹32.0 Lakhs', lead: 'Dr. G. Ramesh' },
                    ].map((v, idx) => (
                        <div key={idx} className="glass-card-interactive p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-mono font-bold text-xs text-primary-700 bg-primary-50 px-2.5 py-1 rounded-xl border border-primary-200">
                                    {v.code}
                                </span>
                                <span className="glass-pill text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {v.count} Projects
                                </span>
                            </div>

                            <h3 className="font-bold text-xs text-secondary-900 leading-snug">{v.name}</h3>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Budget: <b>{v.budget}</b></span>
                                <span>Lead: <b>{v.lead}</b></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
