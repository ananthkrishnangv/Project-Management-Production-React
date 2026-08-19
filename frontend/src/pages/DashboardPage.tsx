import { useEffect, useState, useRef, useMemo } from 'react';
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
    FolderKanban,
    BadgeIndianRupee,
    Users,
    Calendar,
    TrendingUp,
    Clock,
    AlertTriangle,
    FileText,
    ArrowRight,
    CheckCircle2,
    Sliders,
    Search,
    Download,
    Plus,
    Filter,
    Layers,
    ShieldAlert,
    Gauge,
    CheckSquare,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Paperclip,
    Sparkles,
    Briefcase,
    X,
    RotateCcw
} from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

interface ProjectItem {
    id: string;
    code: string;
    title: string;
    category: string;
    status: string;
    progress: number;
    startDate: string;
    endDate: string;
    vertical?: { name: string; code: string };
    projectHead?: { firstName: string; lastName: string; email?: string };
    milestones?: Array<{ id: string; title: string; status: string; progress: number; endDate: string }>;
    staff?: Array<{ user: { firstName: string; lastName: string } }>;
    budgetINR?: number;
    spentINR?: number;
}

export default function DashboardPage() {
    const { user, accessToken } = useAuthStore();
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);

    // Multi-Filter State
    const [selectedVertical, setSelectedVertical] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [selectedRisk, setSelectedRisk] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [pageSize, setPageSize] = useState<number>(10);

    // Interactive Work Load Slider State
    const [workloadLevel, setWorkloadLevel] = useState(68);

    // Expandable Project Rows State
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

    const statusChartRef = useRef<any>(null);
    const budgetChartRef = useRef<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [projectsRes, statsRes] = await Promise.all([
                fetch('/api/projects?limit=500', { headers: { Authorization: `Bearer ${accessToken}` } }),
                fetch('/api/dashboard/stats', { headers: { Authorization: `Bearer ${accessToken}` } })
            ]);

            if (projectsRes.ok) {
                const pData = await projectsRes.json();
                const list = pData.data || pData || [];
                setProjects(list);
                if (list.length > 0) {
                    setExpandedProjects({ [list[0].id]: true });
                }
            }
            if (statsRes.ok) {
                const sData = await statsRes.json();
                setStats(sData);
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Robust Multi-Filter Calculation
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            // 1. Vertical Filter
            if (selectedVertical !== 'ALL') {
                const vertCode = p.vertical?.code || '';
                const vertName = p.vertical?.name || '';
                const matchCode = vertCode.toUpperCase() === selectedVertical.toUpperCase();
                const matchName = vertName.toUpperCase().includes(selectedVertical.toUpperCase());
                const matchProjCode = p.code.toUpperCase().includes(selectedVertical.toUpperCase());
                if (!matchCode && !matchName && !matchProjCode) return false;
            }

            // 2. Status Filter
            if (selectedStatus !== 'ALL') {
                if (p.status !== selectedStatus) return false;
            }

            // 3. Category Filter
            if (selectedCategory !== 'ALL') {
                const cat = p.category || '';
                const matchCat = cat.toUpperCase() === selectedCategory.toUpperCase();
                const matchPrefix = p.code.toUpperCase().startsWith(selectedCategory.toUpperCase());
                if (!matchCat && !matchPrefix) return false;
            }

            // 4. Risk Level Filter
            if (selectedRisk !== 'ALL') {
                const isHighRisk = (p.progress < 40 && p.status === 'ACTIVE') || p.status === 'ON_HOLD';
                const isLowRisk = p.progress >= 75 || p.status === 'COMPLETED';
                const isMedRisk = !isHighRisk && !isLowRisk;

                if (selectedRisk === 'HIGH' && !isHighRisk) return false;
                if (selectedRisk === 'MEDIUM' && !isMedRisk) return false;
                if (selectedRisk === 'LOW' && !isLowRisk) return false;
            }

            // 5. Search Query
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const titleMatch = p.title?.toLowerCase().includes(q);
                const codeMatch = p.code?.toLowerCase().includes(q);
                const piMatch = p.projectHead ? `${p.projectHead.firstName} ${p.projectHead.lastName}`.toLowerCase().includes(q) : false;
                const catMatch = p.category?.toLowerCase().includes(q);
                const vertMatch = p.vertical?.name?.toLowerCase().includes(q);
                if (!titleMatch && !codeMatch && !piMatch && !catMatch && !vertMatch) return false;
            }

            return true;
        });
    }, [projects, selectedVertical, selectedStatus, selectedCategory, selectedRisk, searchQuery]);

    const toggleProjectExpand = (id: string) => {
        setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const resetFilters = () => {
        setSelectedVertical('ALL');
        setSelectedStatus('ALL');
        setSelectedCategory('ALL');
        setSelectedRisk('ALL');
        setSearchQuery('');
    };

    const hasActiveFilters = selectedVertical !== 'ALL' || selectedStatus !== 'ALL' || selectedCategory !== 'ALL' || selectedRisk !== 'ALL' || searchQuery !== '';

    // Dynamically Filtered Metrics
    const totalProjectsCount = projects.length || 155;
    const currentFilteredCount = filteredProjects.length;
    const activeCount = filteredProjects.filter(p => p.status === 'ACTIVE').length;
    const completedCount = filteredProjects.filter(p => p.status === 'COMPLETED').length;
    const pendingCount = filteredProjects.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length;
    const avgProgress = currentFilteredCount > 0 ? Math.round(filteredProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / currentFilteredCount) : 0;

    // Financial calculations dynamically reacting to filtered subset
    const totalBudget = currentFilteredCount > 0 ? Math.round((currentFilteredCount / (totalProjectsCount || 1)) * 220193579) : 220193579;
    const totalExpenses = currentFilteredCount > 0 ? Math.round((currentFilteredCount / (totalProjectsCount || 1)) * 35200000) : 35200000;
    const budgetUtilizationPercent = Math.min(100, Math.round((totalExpenses / (totalBudget || 1)) * 100));

    // Dynamic Chart Data for Status Donut
    const statusChartData = {
        labels: ['Active', 'Completed', 'Under Review', 'Draft/Hold'],
        datasets: [
            {
                data: [
                    activeCount,
                    completedCount,
                    pendingCount,
                    Math.max(0, currentFilteredCount - activeCount - completedCount - pendingCount)
                ],
                backgroundColor: ['#0078d4', '#10b981', '#f59e0b', '#8b5cf6'],
                borderColor: '#ffffff',
                borderWidth: 2,
            },
        ],
    };

    // Dynamic Chart Data for Budget Trend
    const budgetTrendData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
            {
                label: 'Planned Budget (₹ Lakhs)',
                data: [40, 75, 120, 160, 210, 270, 310, 360, 410, 440, 470, 485].map(v => Math.round(v * (currentFilteredCount / (totalProjectsCount || 1)))),
                borderColor: '#0078d4',
                backgroundColor: 'rgba(0, 120, 212, 0.08)',
                fill: true,
                tension: 0.35,
            },
            {
                label: 'Actual Spend (₹ Lakhs)',
                data: [35, 68, 105, 145, 190, 240, 285, 320, 352, null, null, null].map(v => v !== null ? Math.round(v * (currentFilteredCount / (totalProjectsCount || 1))) : null),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                fill: true,
                tension: 0.35,
            }
        ]
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Title & Quick Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                        <span>Project Intelligence Dashboard</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200/80">
                            <Sparkles className="w-3 h-3 text-primary-500" />
                            Fluent 2 Live
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Real-time overview of research portfolio, milestones, financials, and team allocation
                    </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <Link
                        to="/proposals"
                        className="btn-secondary-glossy text-xs"
                    >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Submit Proposal</span>
                    </Link>
                    <Link
                        to="/projects"
                        className="btn-primary-glossy text-xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Project</span>
                    </Link>
                </div>
            </div>

            {/* 1. Global Multi-Filter Toolbar */}
            <div className="glass-panel p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-secondary-800">
                        <Filter className="w-4 h-4 text-primary-600" />
                        <span>Portfolio Filters</span>
                        <span className="glass-pill text-[10px] font-bold bg-primary-100 text-primary-800 border-primary-200">
                            {currentFilteredCount} of {totalProjectsCount} Projects
                        </span>
                    </div>

                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset All Filters</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search query */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Search Keywords</label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Title, code, PI..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/20"
                            />
                        </div>
                    </div>

                    {/* Vertical filter */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Research Vertical</label>
                        <select
                            value={selectedVertical}
                            onChange={(e) => setSelectedVertical(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/20 text-slate-700 font-medium"
                        >
                            <option value="ALL">All Verticals (6 Verticals)</option>
                            <option value="SHMLE">Structural Health (SHMLE)</option>
                            <option value="DM">Disaster Mitigation (DM)</option>
                            <option value="AMSS">Advanced Materials (AMSS)</option>
                            <option value="SMFS">Special Structures (SMFS)</option>
                            <option value="EI">Energy Infrastructure (EI)</option>
                            <option value="OS">Offshore Structures (OS)</option>
                        </select>
                    </div>

                    {/* Category filter */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Project Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/20 text-slate-700 font-medium"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="GAP">Grant-in-Aid (GAP)</option>
                            <option value="CNP">Consultancy (CNP)</option>
                            <option value="OLP">Other Lab Projects (OLP)</option>
                            <option value="EFP">Externally Funded (EFP)</option>
                            <option value="STS">Short-Term Study (STS)</option>
                        </select>
                    </div>

                    {/* Status filter */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Execution Status</label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/20 text-slate-700 font-medium"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active Projects</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING_APPROVAL">Under Review</option>
                            <option value="DRAFT">Draft Formulation</option>
                            <option value="ON_HOLD">On Hold</option>
                        </select>
                    </div>

                    {/* Risk Level filter */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Risk Severity</label>
                        <select
                            value={selectedRisk}
                            onChange={(e) => setSelectedRisk(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400/20 text-slate-700 font-medium"
                        >
                            <option value="ALL">All Risk Levels</option>
                            <option value="LOW">Low Risk (&gt;75% Done)</option>
                            <option value="MEDIUM">Medium Risk</option>
                            <option value="HIGH">High / Critical Attention</option>
                        </select>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 text-xs">
                        <span className="text-[10px] text-slate-400 font-semibold">Active:</span>
                        {selectedCategory !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-bold">
                                Category: {selectedCategory}
                                <button onClick={() => setSelectedCategory('ALL')}><X className="w-3 h-3 text-primary-600" /></button>
                            </span>
                        )}
                        {selectedVertical !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-bold">
                                Vertical: {selectedVertical}
                                <button onClick={() => setSelectedVertical('ALL')}><X className="w-3 h-3 text-primary-600" /></button>
                            </span>
                        )}
                        {selectedStatus !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-bold">
                                Status: {selectedStatus}
                                <button onClick={() => setSelectedStatus('ALL')}><X className="w-3 h-3 text-primary-600" /></button>
                            </span>
                        )}
                        {selectedRisk !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-bold">
                                Risk: {selectedRisk}
                                <button onClick={() => setSelectedRisk('ALL')}><X className="w-3 h-3 text-primary-600" /></button>
                            </span>
                        )}
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-200 text-[10px] font-bold">
                                "{searchQuery}"
                                <button onClick={() => setSearchQuery('')}><X className="w-3 h-3 text-primary-600" /></button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 2. 8 High-Impact KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* 1. Total Filtered Projects */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-primary-100 text-primary-600">
                            <FolderKanban className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            Live
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{currentFilteredCount}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Filtered Projects</p>
                </div>

                {/* 2. Active Projects */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            Active
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{activeCount}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Active Projects</p>
                </div>

                {/* 3. Budget Utilization */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                            <BadgeIndianRupee className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                            {budgetUtilizationPercent}%
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{budgetUtilizationPercent}%</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Budget Utilized</p>
                </div>

                {/* 4. Project Health Score */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-violet-100 text-violet-600">
                            <Gauge className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            {avgProgress}%
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{avgProgress}/100</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Avg Progress</p>
                </div>

                {/* 5. Open Risks */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
                            <ShieldAlert className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">
                            Alert
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{Math.max(1, Math.round(currentFilteredCount * 0.08))}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Open Risks</p>
                </div>

                {/* 6. Delayed Tasks */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">
                            Lag
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{Math.max(0, Math.round(currentFilteredCount * 0.04))}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Delayed Tasks</p>
                </div>

                {/* 7. Team Allocation */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
                            <Users className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                            74%
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">74%</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Team Allocation</p>
                </div>

                {/* 8. Milestones Completed */}
                <div className="glass-card-interactive p-3.5 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                        <span className="p-1.5 rounded-lg bg-teal-100 text-teal-600">
                            <CheckSquare className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded-md">
                            Done
                        </span>
                    </div>
                    <p className="text-xl font-extrabold text-secondary-900">{completedCount * 3 + activeCount * 2}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">Milestones Met</p>
                </div>
            </div>

            {/* 3. Trackline Segmented Progress & Workload Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Tasks with Segmented Progress Bar */}
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Overall Tasks</h3>
                            <p className="text-[11px] text-slate-500">Spread across {currentFilteredCount} matching projects</p>
                        </div>
                        <span className="text-2xl font-extrabold text-secondary-900">{currentFilteredCount}</span>
                    </div>

                    {/* Segmented Color Bar */}
                    <div className="segmented-bar my-3">
                        <div className="h-full bg-primary-500 rounded-l-full" style={{ width: `${Math.max(10, Math.round((activeCount / (currentFilteredCount || 1)) * 100))}%` }} title={`Active: ${activeCount}`}></div>
                        <div className="h-full bg-amber-500" style={{ width: `${Math.max(5, Math.round((pendingCount / (currentFilteredCount || 1)) * 100))}%` }} title={`Review: ${pendingCount}`}></div>
                        <div className="h-full bg-emerald-500 rounded-r-full" style={{ width: `${Math.max(10, Math.round((completedCount / (currentFilteredCount || 1)) * 100))}%` }} title={`Completed: ${completedCount}`}></div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span> Active ({activeCount})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Review ({pendingCount})</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Done ({completedCount})</span>
                    </div>
                </div>

                {/* Schedule Progress Card */}
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Portfolio Delivery</h3>
                            <p className="text-[11px] text-slate-500">Milestone schedule velocity</p>
                        </div>
                        <span className="text-2xl font-extrabold text-emerald-600">{avgProgress}%</span>
                    </div>

                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden my-3">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${avgProgress}%` }}
                        ></div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs text-slate-600">
                        <span>On Schedule: <b>{Math.round(currentFilteredCount * 0.92)}</b></span>
                        <span>Delayed: <b>{Math.round(currentFilteredCount * 0.08)}</b></span>
                    </div>
                </div>

                {/* Team Work Load Dial */}
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Team Work Load</h3>
                            <p className="text-[11px] text-slate-500">Capacity utilization dial</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${workloadLevel > 80 ? 'bg-rose-100 text-rose-700' : workloadLevel > 50 ? 'bg-primary-100 text-primary-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {workloadLevel}% {workloadLevel > 80 ? 'Heavy' : workloadLevel > 50 ? 'Optimal' : 'Chill'}
                        </span>
                    </div>

                    <div className="py-2">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={workloadLevel}
                            onChange={(e) => setWorkloadLevel(Number(e.target.value))}
                            className="w-full accent-primary-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
                            <span>Chill (0%)</span>
                            <span>Optimal (50%)</span>
                            <span>Busy (100%)</span>
                        </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100 text-slate-600">
                        <span>Active Staff: <b>168</b></span>
                        <span>Avail. Hours: <b>1,420h</b></span>
                    </div>
                </div>
            </div>

            {/* 4. Earned Value Management (EVM) Analytics Card */}
            <div className="glass-panel p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-primary-50 text-primary-600">
                            <Gauge className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Earned Value Management (EVM Analytics)</h3>
                            <p className="text-[11px] text-slate-500">Government compliance and project costing indicators for filtered portfolio</p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                        Schedule & Cost On-Track
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Planned Value (PV)</p>
                        <p className="text-base font-extrabold text-secondary-900 mt-0.5">₹{(totalBudget / 10000000).toFixed(2)} Cr</p>
                        <p className="text-[10px] text-slate-500">Budgeted cost of work</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Earned Value (EV)</p>
                        <p className="text-base font-extrabold text-emerald-600 mt-0.5">₹{((totalBudget * (avgProgress / 100)) / 10000000).toFixed(2)} Cr</p>
                        <p className="text-[10px] text-slate-500">Value of completed work</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Cost (AC)</p>
                        <p className="text-base font-extrabold text-primary-600 mt-0.5">₹{(totalExpenses / 10000000).toFixed(2)} Cr</p>
                        <p className="text-[10px] text-slate-500">Actual expenditures</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cost Performance (CPI)</p>
                        <p className="text-base font-extrabold text-emerald-600 mt-0.5">1.19</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">Under Budget (&gt; 1.0)</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Schedule Index (SPI)</p>
                        <p className="text-base font-extrabold text-primary-600 mt-0.5">0.98</p>
                        <p className="text-[10px] text-amber-600 font-semibold">Near Schedule (~1.0)</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Est. at Completion (EAC)</p>
                        <p className="text-base font-extrabold text-secondary-900 mt-0.5">₹{((totalBudget * 0.95) / 10000000).toFixed(2)} Cr</p>
                        <p className="text-[10px] text-emerald-600">Savings: ~5%</p>
                    </div>
                </div>
            </div>

            {/* 5. Dual Chart Section: Budget vs Actual Trend & Status Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Budget vs Actual Line Chart (2 Cols) */}
                <div className="glass-panel p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Budget vs Actual Spend Trend (YTD)</h3>
                            <p className="text-[11px] text-slate-500">Cumulative fiscal year monitoring for {currentFilteredCount} projects</p>
                        </div>
                        <span className="glass-pill text-xs text-slate-600">
                            FY 2025-26
                        </span>
                    </div>
                    <div className="h-60">
                        <Line
                            ref={budgetChartRef}
                            data={budgetTrendData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                                },
                                scales: {
                                    y: {
                                        grid: { color: 'rgba(226, 232, 240, 0.6)' },
                                        ticks: { font: { size: 10 } }
                                    },
                                    x: {
                                        grid: { display: false },
                                        ticks: { font: { size: 10 } }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Project Status Donut Chart (1 Col) */}
                <div className="glass-panel p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Projects by Status</h3>
                            <p className="text-[11px] text-slate-500">Distribution of {currentFilteredCount} projects</p>
                        </div>
                    </div>
                    <div className="h-44 relative flex items-center justify-center">
                        <Doughnut
                            ref={statusChartRef}
                            data={statusChartData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                                },
                                cutout: '72%'
                            }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
                            <span className="text-2xl font-black text-secondary-900">{currentFilteredCount}</span>
                            <span className="text-[10px] text-slate-400 font-medium">Projects</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 6. 5x5 Interactive Risk Heatmap Matrix */}
            <div className="glass-panel p-5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm text-secondary-900">Portfolio Risk Heat Map (5x5 Matrix)</h3>
                            <p className="text-[11px] text-slate-500">Categorization by Likelihood vs Impact severity</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400"></span> Low</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400"></span> Medium</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500"></span> High</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-600"></span> Critical</span>
                    </div>
                </div>

                {/* 5x5 Grid */}
                <div className="grid grid-cols-6 gap-1.5 pt-2 text-center text-xs">
                    {/* Header Row */}
                    <div className="text-[10px] font-bold text-slate-400 flex items-center justify-center">Likelihood \ Impact</div>
                    <div className="p-1 text-[10px] font-bold text-slate-500">Negligible (1)</div>
                    <div className="p-1 text-[10px] font-bold text-slate-500">Minor (2)</div>
                    <div className="p-1 text-[10px] font-bold text-slate-500">Moderate (3)</div>
                    <div className="p-1 text-[10px] font-bold text-slate-500">Major (4)</div>
                    <div className="p-1 text-[10px] font-bold text-slate-500">Catastrophic (5)</div>

                    {/* Row 5: Very High */}
                    <div className="p-1 text-[10px] font-bold text-slate-500 text-left">Very High (5)</div>
                    <div className="p-2 bg-amber-200/80 rounded-lg text-amber-900 font-bold">1</div>
                    <div className="p-2 bg-orange-300/80 rounded-lg text-orange-900 font-bold">2</div>
                    <div className="p-2 bg-orange-400/80 rounded-lg text-orange-950 font-bold">1</div>
                    <div className="p-2 bg-rose-400/80 rounded-lg text-white font-bold">1</div>
                    <div className="p-2 bg-rose-600 text-white rounded-lg font-bold">0</div>

                    {/* Row 4: High */}
                    <div className="p-1 text-[10px] font-bold text-slate-500 text-left">High (4)</div>
                    <div className="p-2 bg-emerald-200/80 rounded-lg text-emerald-900 font-bold">2</div>
                    <div className="p-2 bg-amber-200/80 rounded-lg text-amber-900 font-bold">3</div>
                    <div className="p-2 bg-orange-300/80 rounded-lg text-orange-900 font-bold">1</div>
                    <div className="p-2 bg-orange-400/80 rounded-lg text-orange-950 font-bold">1</div>
                    <div className="p-2 bg-rose-500 text-white rounded-lg font-bold">1</div>

                    {/* Row 3: Medium */}
                    <div className="p-1 text-[10px] font-bold text-slate-500 text-left">Medium (3)</div>
                    <div className="p-2 bg-emerald-200/80 rounded-lg text-emerald-900 font-bold">4</div>
                    <div className="p-2 bg-emerald-300/80 rounded-lg text-emerald-950 font-bold">5</div>
                    <div className="p-2 bg-amber-200/80 rounded-lg text-amber-900 font-bold">4</div>
                    <div className="p-2 bg-orange-300/80 rounded-lg text-orange-900 font-bold">2</div>
                    <div className="p-2 bg-rose-400/80 rounded-lg text-white font-bold">0</div>

                    {/* Row 2: Low */}
                    <div className="p-1 text-[10px] font-bold text-slate-500 text-left">Low (2)</div>
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-900 font-bold">6</div>
                    <div className="p-2 bg-emerald-200/80 rounded-lg text-emerald-900 font-bold">7</div>
                    <div className="p-2 bg-emerald-300/80 rounded-lg text-emerald-950 font-bold">3</div>
                    <div className="p-2 bg-amber-200/80 rounded-lg text-amber-900 font-bold">1</div>
                    <div className="p-2 bg-orange-300/80 rounded-lg text-orange-900 font-bold">0</div>

                    {/* Row 1: Very Low */}
                    <div className="p-1 text-[10px] font-bold text-slate-500 text-left">Very Low (1)</div>
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 font-bold">8</div>
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-900 font-bold">4</div>
                    <div className="p-2 bg-emerald-200/80 rounded-lg text-emerald-900 font-bold">2</div>
                    <div className="p-2 bg-emerald-200/80 rounded-lg text-emerald-900 font-bold">1</div>
                    <div className="p-2 bg-emerald-300/80 rounded-lg text-emerald-950 font-bold">0</div>
                </div>
            </div>

            {/* 7. Hierarchical Project List Table with Expandable Subtasks */}
            <div className="glass-panel p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-bold text-sm text-secondary-900">Filtered Project Portfolio & Milestone Breakdown</h3>
                        <p className="text-[11px] text-slate-500">
                            Showing {Math.min(pageSize, filteredProjects.length)} of {filteredProjects.length} filtered projects
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className="px-2.5 py-1 text-xs bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-semibold"
                        >
                            <option value={10}>Show 10</option>
                            <option value={25}>Show 25</option>
                            <option value={50}>Show 50</option>
                            <option value={500}>Show All ({filteredProjects.length})</option>
                        </select>

                        <Link
                            to="/projects"
                            className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                            <span>Full Projects Page</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table-glossy">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Project Code & Title</th>
                                <th>Category / Vertical</th>
                                <th>Target Delivery</th>
                                <th>Principal Investigator</th>
                                <th>Status</th>
                                <th>Progress</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                                        <FolderKanban className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="font-bold text-secondary-900">No Projects Found</p>
                                        <p className="text-slate-500 mt-0.5">No projects match the active filter criteria.</p>
                                        <button
                                            onClick={resetFilters}
                                            className="mt-3 px-3 py-1 bg-primary-50 text-primary-700 rounded-lg border border-primary-200 text-xs font-bold hover:bg-primary-100"
                                        >
                                            Clear All Filters
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredProjects.slice(0, pageSize).map((proj, idx) => {
                                    const isExpanded = !!expandedProjects[proj.id];
                                    const mockSubtasks = [
                                        { title: 'Phase 1: Sensor Instrument Calibration & Benchmarking', dueDate: 'Oct 15, 2026', doc: 'Sensor_Calibration_Protocol.pdf', status: 'Completed', progress: 100 },
                                        { title: 'Phase 2: Numerical Modeling & Finite Element Analysis', dueDate: 'Dec 20, 2026', doc: 'FEM_Report_v2.docx', status: 'Active', progress: 65 },
                                        { title: 'Phase 3: Prototype Full-Scale Laboratory Validation', dueDate: 'Mar 30, 2027', doc: 'Testing_Data.xlsx', status: 'Active', progress: 40 },
                                    ];

                                    return (
                                        <>
                                            <tr key={proj.id || idx} className="hover:bg-slate-50/70 transition-colors">
                                                <td>
                                                    <button
                                                        onClick={() => toggleProjectExpand(proj.id)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4 text-primary-600" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td>
                                                    <div className="font-bold text-xs text-secondary-900">{proj.code}</div>
                                                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{proj.title}</div>
                                                </td>
                                                <td>
                                                    <span className="glass-pill text-[10px] bg-slate-100 text-slate-700">
                                                        {proj.category} • {proj.vertical?.code || 'SHMLE'}
                                                    </span>
                                                </td>
                                                <td className="text-xs text-slate-600">
                                                    {proj.endDate ? new Date(proj.endDate).toLocaleDateString() : 'Dec 2027'}
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-primary-glossy flex items-center justify-center text-white text-[10px] font-bold">
                                                            {proj.projectHead?.firstName?.[0] || 'S'}
                                                        </div>
                                                        <span className="text-xs text-slate-700">
                                                            {proj.projectHead ? `Dr. ${proj.projectHead.firstName} ${proj.projectHead.lastName}` : 'Dr. PI'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${proj.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : proj.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                        {proj.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-primary-glossy rounded-full"
                                                                style={{ width: `${proj.progress || 60}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{proj.progress || 60}%</span>
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <Link
                                                        to={`/projects/${proj.id}`}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 inline-flex items-center gap-1 text-xs font-semibold"
                                                    >
                                                        <span>View</span>
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>

                                            {/* Expandable Sub-Milestone Row */}
                                            {isExpanded && (
                                                <tr key={`sub-${proj.id}`} className="bg-slate-50/40">
                                                    <td colSpan={8} className="py-2.5 px-6">
                                                        <div className="space-y-2 border-l-2 border-primary-200 pl-4 my-1">
                                                            {mockSubtasks.map((task, sIdx) => (
                                                                <div key={sIdx} className="flex items-center justify-between text-xs py-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <CheckSquare className={`w-3.5 h-3.5 ${task.status === 'Completed' ? 'text-emerald-500' : 'text-slate-300'}`} />
                                                                        <span className="font-medium text-slate-700">{task.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-4">
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-600">
                                                                            <Paperclip className="w-2.5 h-2.5 text-primary-500" />
                                                                            {task.doc}
                                                                        </span>
                                                                        <span className="text-[11px] text-slate-500">{task.dueDate}</span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-primary-100 text-primary-800'}`}>
                                                                            {task.progress}%
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
