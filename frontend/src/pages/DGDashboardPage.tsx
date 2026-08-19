import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
    Building,
    FolderKanban,
    BadgeIndianRupee,
    TrendingUp,
    Users,
    Calendar,
    ShieldAlert,
    CheckCircle2,
    Clock,
    Search,
    Filter,
    Download,
    Eye,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Sparkles,
    FileText,
    BookOpen,
    Layers,
    X,
    Award,
    Globe,
    Compass,
    Target,
    Zap
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

interface ProjectDetail {
    id: string;
    code: string;
    title: string;
    status: string;
    category: string;
    progress: number;
    budgetINR: number;
    spentINR: number;
    projectHead: string;
    vertical: string;
    sponsor?: string;
    objectives?: string[];
    startDate?: string;
    endDate?: string;
    milestonesCount?: number;
    publicationsCount?: number;
}

export default function DGDashboardPage() {
    const { accessToken } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
    const [exchangeRate, setExchangeRate] = useState(83.50);
    const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'rc' | 'outputs'>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVertical, setSelectedVertical] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
    const [selectedProjectForModal, setSelectedProjectForModal] = useState<ProjectDetail | null>(null);

    const categoryChartRef = useRef<any>(null);
    const budgetTrendChartRef = useRef<any>(null);

    // Mock Comprehensive DG Strategic Projects
    const strategicProjects: ProjectDetail[] = [
        {
            id: 'p1',
            code: 'GAP-2026-SHMLE-001',
            title: 'Wireless Smart Sensor Network for Long-Span Highway and Railway Bridges',
            status: 'ACTIVE',
            category: 'GAP',
            progress: 78,
            budgetINR: 52000000,
            spentINR: 38400000,
            projectHead: 'Dr. Saptarshi Sasmal',
            vertical: 'Structural Health Monitoring & Life Extension',
            sponsor: 'National Highways Authority of India (NHAI)',
            startDate: '2025-01-15',
            endDate: '2027-06-30',
            milestonesCount: 6,
            publicationsCount: 4,
            objectives: [
                'Development of self-calibrating wireless piezoelectric accelerometers.',
                'Field telemetry and structural dynamic response capture on major railway bridges.',
                'Formulation of AI-driven crack propagation and damage prognosis models.'
            ]
        },
        {
            id: 'p2',
            code: 'CNP-2026-DM-002',
            title: 'Dynamic Blast and Impact Resistance Assessment of High-Strength Structural Steel Frameworks',
            status: 'ACTIVE',
            category: 'CNP',
            progress: 62,
            budgetINR: 38000000,
            spentINR: 24500000,
            projectHead: 'Dr. M.B. Anoop',
            vertical: 'Disaster Mitigation',
            sponsor: 'Defence Research & Development Organisation (DRDO)',
            startDate: '2025-04-01',
            endDate: '2027-03-31',
            milestonesCount: 5,
            publicationsCount: 3,
            objectives: [
                'Shock-tube dynamic explosion simulations on composite wall assemblies.',
                'Validation of energy-absorbing ductile connection details.',
                'Development of design guidelines for defense critical infrastructure protection.'
            ]
        },
        {
            id: 'p3',
            code: 'OLP-2026-AMSS-003',
            title: 'Alkali-Activated Slag & Geopolymer Concrete for Severe Marine Coastal Environments',
            status: 'ACTIVE',
            category: 'OLP',
            progress: 85,
            budgetINR: 28000000,
            spentINR: 21000000,
            projectHead: 'Dr. K. Ramanjaneyulu',
            vertical: 'Advanced Materials for Sustainable Structure',
            sponsor: 'CSIR Institutional Research Grant',
            startDate: '2024-08-01',
            endDate: '2026-12-31',
            milestonesCount: 4,
            publicationsCount: 6,
            objectives: [
                'Low-carbon cement replacement using industrial granulated blast furnace slag.',
                'Accelerated chloride migration and corrosion resistance benchmarks.',
                'Life cycle assessment (LCA) and CO2 emission reduction indexing.'
            ]
        },
        {
            id: 'p4',
            code: 'GAP-2026-EI-004',
            title: 'Fatigue Life and Hydrodynamic Wave Loading on Offshore Wind Turbine Gravity Foundations',
            status: 'ACTIVE',
            category: 'GAP',
            progress: 54,
            budgetINR: 44000000,
            spentINR: 23800000,
            projectHead: 'Dr. N. Anand',
            vertical: 'Energy Infrastructure',
            sponsor: 'Ministry of New and Renewable Energy (MNRE)',
            startDate: '2025-06-01',
            endDate: '2028-05-31',
            milestonesCount: 7,
            publicationsCount: 2,
            objectives: [
                'Hydrodynamic wave basin testing of 1:50 scaled gravity base foundations.',
                'Stochastic wind-wave coupled cyclic degradation modeling.',
                'Seabed scouring protection strategies for Gulf of Mannar offshore zone.'
            ]
        },
        {
            id: 'p5',
            code: 'CNP-2026-SMFS-005',
            title: 'Aeroelastic Wind Tunnel Testing and Vibration Mitigation for 400m Tall Skyscraper',
            status: 'ACTIVE',
            category: 'CNP',
            progress: 90,
            budgetINR: 19500000,
            spentINR: 18200000,
            projectHead: 'Dr. P. Srinivasan',
            vertical: 'Special and Multi functional Structures',
            sponsor: 'Larsen & Toubro Ltd. (L&T Construction)',
            startDate: '2025-02-01',
            endDate: '2026-10-31',
            milestonesCount: 3,
            publicationsCount: 1,
            objectives: [
                'Boundary layer wind tunnel pressure tap measurements on high-rise model.',
                'Tuned mass damper (TMD) optimization for occupant comfort during cyclones.',
                'Structural wind load coefficient certification.'
            ]
        },
        {
            id: 'p6',
            code: 'EFP-2026-OS-006',
            title: 'Autonomous Underwater Robotic NDT Vehicle for Deep Sea Pipeline Defect Mapping',
            status: 'ACTIVE',
            category: 'EFP',
            progress: 45,
            budgetINR: 38693579,
            spentINR: 17500000,
            projectHead: 'Dr. G. Ramesh',
            vertical: 'Offshore Structures',
            sponsor: 'Oil and Natural Gas Corporation (ONGC)',
            startDate: '2025-09-01',
            endDate: '2028-08-31',
            milestonesCount: 6,
            publicationsCount: 2,
            objectives: [
                'Ultrasonic guided wave sensor integration on submersible ROV platform.',
                'Real-time acoustic telemetry and automated wall thinning identification.',
                'Deep sea trials at Krishna Godavari offshore basin.'
            ]
        }
    ];

    useEffect(() => {
        fetchDGData();
    }, []);

    const fetchDGData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/dashboard/director', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const result = await res.json();
                if (result.exchangeRate) setExchangeRate(result.exchangeRate);
            }
        } catch (err) {
            console.error('Failed to load DG overview:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amountINR: number) => {
        if (currency === 'USD') {
            const amountUSD = amountINR / exchangeRate;
            return `$${(amountUSD / 1000000).toFixed(2)}M`;
        }
        return `₹${(amountINR / 10000000).toFixed(2)} Cr`;
    };

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredProjects = useMemo(() => {
        return strategicProjects.filter(p => {
            if (selectedVertical !== 'ALL' && p.vertical !== selectedVertical) return false;
            if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
            if (selectedStatus !== 'ALL' && p.status !== selectedStatus) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const titleMatch = p.title.toLowerCase().includes(q);
                const codeMatch = p.code.toLowerCase().includes(q);
                const piMatch = p.projectHead.toLowerCase().includes(q);
                const sponsorMatch = p.sponsor?.toLowerCase().includes(q);
                if (!titleMatch && !codeMatch && !piMatch && !sponsorMatch) return false;
            }
            return true;
        });
    }, [strategicProjects, selectedVertical, selectedCategory, selectedStatus, searchQuery]);

    // Financial Totals
    const totalPortfolioValue = 220193579;
    const totalExpenditure = 35200000;
    const totalBalance = totalPortfolioValue - totalExpenditure;
    const overallUtilization = Math.round((totalExpenditure / totalPortfolioValue) * 100);

    // Chart: Category Donut Data
    const categoryChartData = {
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

    // Chart: Multi-Year Funding Growth
    const fundingGrowthData = {
        labels: ['FY 2022-23', 'FY 2023-24', 'FY 2024-25', 'FY 2025-26 (Curr)', 'FY 2026-27 (Est)'],
        datasets: [
            {
                label: 'Grant-in-Aid & Missions (₹ Cr)',
                data: [9.4, 11.2, 14.5, 18.4, 21.0],
                backgroundColor: 'rgba(0, 120, 212, 0.8)',
                borderRadius: 8,
            },
            {
                label: 'Industrial Consultancy (₹ Cr)',
                data: [1.8, 2.4, 3.1, 3.6, 4.5],
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 8,
            },
        ],
    };

    return (
        <div className="space-y-6 pb-12">
            {/* 1. Executive DG Institutional Header */}
            <div className="glass-panel p-6 bg-gradient-to-r from-secondary-900 via-primary-950 to-secondary-900 text-white rounded-3xl relative overflow-hidden shadow-2xl">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md p-2.5 border border-white/20 flex items-center justify-center shrink-0 shadow-lg">
                            <Building className="w-8 h-8 text-accent-300" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-accent-300 bg-accent-400/20 px-2.5 py-0.5 rounded-full border border-accent-400/30">
                                    CSIR Directorate Level
                                </span>
                                <span className="text-[10px] text-slate-300">
                                    Director General Strategic Intelligence
                                </span>
                            </div>
                            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight font-display text-white">
                                Institutional Portfolio & Research Intelligence Console
                            </h1>
                            <p className="text-xs text-slate-300 max-w-3xl">
                                Real-time executive oversight across 155 active research projects, multi-crore industrial sponsorships, Research Council governance, and technology transfer benchmarks.
                            </p>
                        </div>
                    </div>

                    {/* Quick Currency & Export Action Bar */}
                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <div className="flex items-center p-1 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-xs">
                            <button
                                onClick={() => setCurrency('INR')}
                                className={`px-3 py-1 rounded-lg font-bold transition-all ${currency === 'INR' ? 'bg-white text-secondary-900 shadow-sm' : 'text-slate-300'}`}
                            >
                                INR (₹)
                            </button>
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-3 py-1 rounded-lg font-bold transition-all ${currency === 'USD' ? 'bg-white text-secondary-900 shadow-sm' : 'text-slate-300'}`}
                            >
                                USD ($)
                            </button>
                        </div>

                        <Link
                            to="/reports"
                            className="px-4 py-2 rounded-xl bg-accent-400 hover:bg-accent-300 text-secondary-900 font-bold text-xs flex items-center gap-2 transition-colors shadow-lg"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Executive Dossier</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* 2. Top 8 DG Macro Portfolio KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Portfolio Value</span>
                    <p className="text-xl font-black text-secondary-900 mt-1">{formatCurrency(totalPortfolioValue)}</p>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">+14.2% YoY</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Projects</span>
                    <p className="text-xl font-black text-primary-700 mt-1">146</p>
                    <span className="text-[9px] font-bold text-slate-500">155 Total</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Govt / Grants</span>
                    <p className="text-xl font-black text-secondary-900 mt-1">{formatCurrency(184000000)}</p>
                    <span className="text-[9px] font-bold text-primary-700">83.5% Share</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Industry Inflow</span>
                    <p className="text-xl font-black text-emerald-700 mt-1">{formatCurrency(36193579)}</p>
                    <span className="text-[9px] font-bold text-emerald-700">37 Clients</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RC Adherence</span>
                    <p className="text-xl font-black text-secondary-900 mt-1">96%</p>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">78th Session</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Key Missions</span>
                    <p className="text-xl font-black text-amber-700 mt-1">12</p>
                    <span className="text-[9px] font-bold text-amber-700">National Priority</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patents & IPR</span>
                    <p className="text-xl font-black text-violet-700 mt-1">8 Filed</p>
                    <span className="text-[9px] font-bold text-violet-700">42 SCI Papers</span>
                </div>

                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scientists</span>
                    <p className="text-xl font-black text-secondary-900 mt-1">168</p>
                    <span className="text-[9px] font-bold text-slate-500">100% Active</span>
                </div>
            </div>

            {/* 3. Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 overflow-x-auto">
                {[
                    { id: 'overview', label: 'Institutional Macro Analytics', icon: Compass },
                    { id: 'projects', label: `Strategic Projects Intelligence (${filteredProjects.length})`, icon: FolderKanban },
                    { id: 'rc', label: 'RC Council Governance', icon: Calendar },
                    { id: 'outputs', label: 'Patents & Tech Transfers', icon: Award },
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

            {/* 4. Tab Contents */}

            {/* Tab 1: Institutional Macro Analytics */}
            {activeTab === 'overview' && (
                <div className="space-y-5">
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Category Distribution Donut */}
                        <div className="glass-panel p-5">
                            <h3 className="font-bold text-sm text-secondary-900 mb-1">Portfolio Distribution by Category</h3>
                            <p className="text-[11px] text-slate-500 mb-4">Total 155 sanctioned research projects</p>
                            <div className="h-60 relative flex items-center justify-center">
                                <Doughnut
                                    ref={categoryChartRef}
                                    data={categoryChartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } },
                                        cutout: '70%',
                                    }}
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                                    <span className="text-2xl font-black text-secondary-900">155</span>
                                    <span className="text-[10px] text-slate-400 font-medium">Projects</span>
                                </div>
                            </div>
                        </div>

                        {/* Multi-Year Growth Trend Bar Chart */}
                        <div className="glass-panel p-5 lg:col-span-2">
                            <h3 className="font-bold text-sm text-secondary-900 mb-1">Institutional Research Funding Trajectory</h3>
                            <p className="text-[11px] text-slate-500 mb-4">Grant-in-Aid vs Industrial Sponsorship Growth (₹ Crores)</p>
                            <div className="h-60">
                                <Bar
                                    ref={budgetTrendChartRef}
                                    data={fundingGrowthData}
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

                    {/* Research Verticals Breakdown Cards */}
                    <div className="glass-panel p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-secondary-900">Research Verticals Capacity & Output</h3>
                                <p className="text-[11px] text-slate-500">Resource deployment across the 6 institutional pillars</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                                { code: 'SHMLE', name: 'Structural Health Monitoring & Life Extension', count: 154, budgetINR: 218000000, lead: 'Dr. Saptarshi Sasmal', status: 'Highest Output' },
                                { code: 'DM', name: 'Disaster Mitigation & Blast Resistance', count: 1, budgetINR: 38000000, lead: 'Dr. M.B. Anoop', status: 'Defense Critical' },
                                { code: 'AMSS', name: 'Advanced Materials for Sustainable Structures', count: 4, budgetINR: 28000000, lead: 'Dr. K. Ramanjaneyulu', status: 'Green Cement' },
                                { code: 'EI', name: 'Energy Infrastructure (Wind & Power)', count: 2, budgetINR: 44000000, lead: 'Dr. N. Anand', status: 'Renewables' },
                                { code: 'SMFS', name: 'Special & Multi-Functional Structures', count: 2, budgetINR: 19500000, lead: 'Dr. P. Srinivasan', status: 'High-Rise Aero' },
                                { code: 'OS', name: 'Offshore & Marine Structures', count: 1, budgetINR: 38693579, lead: 'Dr. G. Ramesh', status: 'Deep Sea NDT' },
                            ].map((v, idx) => (
                                <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono font-bold text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded-lg border border-primary-200">
                                            {v.code}
                                        </span>
                                        <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                            {v.status}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-secondary-900 leading-snug">{v.name}</h4>
                                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>Budget: <b>{formatCurrency(v.budgetINR)}</b></span>
                                        <span>Lead: <b>{v.lead}</b></span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Strategic Projects Intelligence */}
            {activeTab === 'projects' && (
                <div className="space-y-4">
                    {/* Filter Toolbar */}
                    <div className="glass-panel p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Filter by title, code, PI, or sponsor..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="glass-input pl-10 text-xs py-2"
                                />
                            </div>

                            <div>
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="glass-input text-xs py-2"
                                >
                                    <option value="ALL">All Categories</option>
                                    <option value="GAP">Grant-in-Aid (GAP)</option>
                                    <option value="CNP">Consultancy (CNP)</option>
                                    <option value="OLP">Other Lab (OLP)</option>
                                    <option value="EFP">Ext. Funded (EFP)</option>
                                </select>
                            </div>

                            <div>
                                <select
                                    value={selectedVertical}
                                    onChange={(e) => setSelectedVertical(e.target.value)}
                                    className="glass-input text-xs py-2"
                                >
                                    <option value="ALL">All Verticals</option>
                                    <option value="Structural Health Monitoring & Life Extension">Structural Health (SHMLE)</option>
                                    <option value="Disaster Mitigation">Disaster Mitigation (DM)</option>
                                    <option value="Advanced Materials for Sustainable Structure">Advanced Materials (AMSS)</option>
                                    <option value="Energy Infrastructure">Energy Infrastructure (EI)</option>
                                    <option value="Special and Multi functional Structures">Special Structures (SMFS)</option>
                                    <option value="Offshore Structures">Offshore Structures (OS)</option>
                                </select>
                            </div>

                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedVertical('ALL'); }}
                                className="btn-secondary-glossy text-xs justify-center"
                            >
                                <span>Reset Filters</span>
                            </button>
                        </div>
                    </div>

                    {/* Projects Table */}
                    <div className="glass-panel overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="table-glossy">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}></th>
                                        <th>Project Code & Title</th>
                                        <th>Sponsor / Client</th>
                                        <th>Sanctioned Budget</th>
                                        <th>Principal Investigator</th>
                                        <th>Progress</th>
                                        <th className="text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProjects.map((p, idx) => {
                                        const isExpanded = !!expandedRows[p.id];
                                        return (
                                            <>
                                                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td>
                                                        <button
                                                            onClick={() => toggleRow(p.id)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                        >
                                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-primary-600" /> : <ChevronRight className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="font-mono font-bold text-xs text-primary-600">{p.code}</span>
                                                            <span className="glass-pill text-[9px] bg-slate-100 text-slate-700">{p.category}</span>
                                                        </div>
                                                        <div className="text-xs font-semibold text-secondary-900 line-clamp-1 max-w-md">{p.title}</div>
                                                    </td>
                                                    <td className="text-xs text-slate-600 truncate max-w-xs font-medium">
                                                        {p.sponsor || 'Government of India'}
                                                    </td>
                                                    <td className="text-xs font-bold text-secondary-900">
                                                        {formatCurrency(p.budgetINR)}
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                            <div className="w-5 h-5 rounded-full bg-gradient-primary-glossy text-white flex items-center justify-center text-[9px] font-bold">
                                                                {p.projectHead[4] || 'S'}
                                                            </div>
                                                            <span className="truncate">{p.projectHead}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-gradient-primary-glossy rounded-full" style={{ width: `${p.progress}%` }}></div>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-700">{p.progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-right">
                                                        <button
                                                            onClick={() => setSelectedProjectForModal(p)}
                                                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 inline-flex items-center gap-1 text-xs font-bold"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Inspect</span>
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* Expandable Project Objectives & Scope */}
                                                {isExpanded && (
                                                    <tr key={`exp-${p.id}`} className="bg-slate-50/50">
                                                        <td colSpan={7} className="py-3 px-6">
                                                            <div className="space-y-2 border-l-2 border-primary-300 pl-4 text-xs">
                                                                <p className="font-bold text-secondary-900">Research Objectives & Strategic Deliverables:</p>
                                                                <ul className="space-y-1 text-slate-600">
                                                                    {p.objectives?.map((obj, oIdx) => (
                                                                        <li key={oIdx} className="flex items-start gap-1.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0"></span>
                                                                            <span>{obj}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                                <div className="pt-2 flex items-center gap-6 text-[11px] text-slate-500">
                                                                    <span>Timeline: <b>{p.startDate}</b> to <b>{p.endDate}</b></span>
                                                                    <span>Expenditure Incurred: <b className="text-emerald-700">{formatCurrency(p.spentINR)}</b></span>
                                                                    <span>Milestones: <b>{p.milestonesCount} Deliverables</b></span>
                                                                    <span>SCI Papers: <b>{p.publicationsCount} Publications</b></span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: RC Council Governance */}
            {activeTab === 'rc' && (
                <div className="glass-panel p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Research Council (RC) Strategic Sanction Log</h3>
                            <p className="text-[11px] text-slate-500">Decisions, peer appraisals, and policy sanctions</p>
                        </div>
                        <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                            78th RC Active
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {[
                            { session: '78th RC Session', date: 'September 24, 2026', agenda: 'Annual Grant-in-Aid Portfolio & Coastal Resilience Sanctions', status: 'Scheduled', quorum: 'Confirmed' },
                            { session: '77th RC Session', date: 'March 18, 2026', agenda: 'Appraisal of Ultra-High Performance Geopolymer Concrete', status: 'Completed', quorum: 'Approved' },
                            { session: '76th RC Session', date: 'September 12, 2025', agenda: 'Chenab Bridge Vibration Monitoring Technology Transfer', status: 'Completed', quorum: 'Approved' },
                        ].map((rc, idx) => (
                            <div key={idx} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-secondary-900">{rc.session}</h4>
                                        <span className="text-[10px] text-slate-400">({rc.date})</span>
                                    </div>
                                    <p className="text-xs text-slate-600">{rc.agenda}</p>
                                </div>
                                <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                                    {rc.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 4: Patents & Tech Transfers */}
            {activeTab === 'outputs' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Patents Filed */}
                    <div className="glass-panel p-5 space-y-3">
                        <h3 className="font-bold text-sm text-secondary-900">Intellectual Property & Patents Filed</h3>
                        <div className="space-y-2.5">
                            {[
                                { title: 'Self-Calibrating Wireless Piezoelectric Sensor for Bridge Defect Detection', appNo: '202641012345', status: 'Filed', year: '2026' },
                                { title: 'Alkali-Activated Zero-Cement Eco-Concrete Composition', appNo: '202541098765', status: 'Published', year: '2025' },
                                { title: 'Ductile Blast-Energy Dissipation Steel Joint Connector', appNo: '202541045678', status: 'Granted', year: '2025' },
                            ].map((pat, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-secondary-900">{pat.title}</p>
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">App: {pat.appNo} • {pat.year}</p>
                                    </div>
                                    <span className="glass-pill text-[10px] font-bold bg-primary-50 text-primary-700 border-primary-200">
                                        {pat.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technology Transfers */}
                    <div className="glass-panel p-5 space-y-3">
                        <h3 className="font-bold text-sm text-secondary-900">Commercial Technology Transfers (ToT)</h3>
                        <div className="space-y-2.5">
                            {[
                                { tech: 'Structural Health Telemetry System', industry: 'National Highways Authority of India (NHAI)', status: 'Active MoU', royalty: '₹45 Lakhs' },
                                { tech: 'Precast Geopolymer Modular Blocks', industry: 'UltraTech Cement Ltd.', status: 'Commercialized', royalty: '₹80 Lakhs' },
                                { tech: 'Wind Damper Algorithm', industry: 'Larsen & Toubro Construction', status: 'Implemented', royalty: '₹35 Lakhs' },
                            ].map((tot, idx) => (
                                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-secondary-900">{tot.tech}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">Transferred to: {tot.industry}</p>
                                    </div>
                                    <span className="glass-pill text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                                        {tot.royalty}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Executive Project Detail Quick-View Modal */}
            {selectedProjectForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white/95 shadow-2xl rounded-3xl border border-slate-200 space-y-4">
                        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="font-mono font-bold text-xs text-primary-700 bg-primary-50 px-2.5 py-1 rounded-xl border border-primary-200">
                                    {selectedProjectForModal.code}
                                </span>
                                <h3 className="font-bold text-base text-secondary-900 font-display mt-2">
                                    {selectedProjectForModal.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">{selectedProjectForModal.vertical}</p>
                            </div>
                            <button
                                onClick={() => setSelectedProjectForModal(null)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400">Budget</span>
                                <p className="font-bold text-secondary-900 mt-0.5">{formatCurrency(selectedProjectForModal.budgetINR)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400">Incurred Spend</span>
                                <p className="font-bold text-emerald-700 mt-0.5">{formatCurrency(selectedProjectForModal.spentINR)}</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400">Progress</span>
                                <p className="font-bold text-primary-700 mt-0.5">{selectedProjectForModal.progress}%</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-400">Sponsor</span>
                                <p className="font-bold text-secondary-900 mt-0.5 truncate">{selectedProjectForModal.sponsor}</p>
                            </div>
                        </div>

                        {/* Objectives List */}
                        <div className="space-y-2 text-xs">
                            <p className="font-bold text-secondary-900">Key Institutional Objectives:</p>
                            <ul className="space-y-1.5 text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {selectedProjectForModal.objectives?.map((obj, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 mt-0.5 shrink-0" />
                                        <span>{obj}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                                Principal Investigator: <b>{selectedProjectForModal.projectHead}</b>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedProjectForModal(null)}
                                    className="btn-secondary-glossy text-xs"
                                >
                                    Close
                                </button>
                                <Link
                                    to={`/projects/${selectedProjectForModal.id}`}
                                    className="btn-primary-glossy text-xs"
                                >
                                    <span>Open Full Console</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
