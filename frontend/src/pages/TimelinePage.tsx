import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    Calendar,
    Filter,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Layers,
    Search,
    ChevronRight,
    Flag,
    TrendingUp,
    Sparkles
} from 'lucide-react';

interface Milestone {
    id: string;
    projectId: string;
    projectCode: string;
    projectTitle: string;
    title: string;
    startDate: string;
    endDate: string;
    progress: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
    category: string;
}

export default function TimelinePage() {
    const { accessToken } = useAuthStore();
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [projects, setProjects] = useState<{ id: string; code: string; title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [projectFilter, setProjectFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    const mockMilestones: Milestone[] = [
        { id: '1', projectId: 'p1', projectCode: 'GAP-2026-SHMLE-001', projectTitle: 'Structural Health Monitoring of Bridges', title: 'Phase 1: Wireless Sensor Calibration & Lab Setup', startDate: '2026-01-15', endDate: '2026-06-30', progress: 100, status: 'COMPLETED', category: 'GAP' },
        { id: '2', projectId: 'p1', projectCode: 'GAP-2026-SHMLE-001', projectTitle: 'Structural Health Monitoring of Bridges', title: 'Phase 2: Full-Scale Dynamic Vibration Testing', startDate: '2026-07-01', endDate: '2026-11-30', progress: 65, status: 'IN_PROGRESS', category: 'GAP' },
        { id: '3', projectId: 'p1', projectCode: 'GAP-2026-SHMLE-001', projectTitle: 'Structural Health Monitoring of Bridges', title: 'Phase 3: Machine Learning Anomaly Detection Integration', startDate: '2026-12-01', endDate: '2027-04-30', progress: 0, status: 'NOT_STARTED', category: 'GAP' },
        { id: '4', projectId: 'p2', projectCode: 'CNP-2026-DM-002', projectTitle: 'Dynamic Blast Resistance of High-Strength Steel', title: 'Phase 1: Finite Element Shock-Wave Simulation', startDate: '2026-02-01', endDate: '2026-08-31', progress: 100, status: 'COMPLETED', category: 'CNP' },
        { id: '5', projectId: 'p2', projectCode: 'CNP-2026-DM-002', projectTitle: 'Dynamic Blast Resistance of High-Strength Steel', title: 'Phase 2: Controlled Explosive Chamber Testing', startDate: '2026-09-01', endDate: '2026-12-15', progress: 45, status: 'IN_PROGRESS', category: 'CNP' },
        { id: '6', projectId: 'p3', projectCode: 'OLP-2026-AMSS-003', projectTitle: 'Alkali-Activated Slag Concrete Testing', title: 'Phase 1: Chemical Synthesis & Microstructural SEM', startDate: '2026-03-01', endDate: '2026-09-30', progress: 100, status: 'COMPLETED', category: 'OLP' },
        { id: '7', projectId: 'p3', projectCode: 'OLP-2026-AMSS-003', projectTitle: 'Alkali-Activated Slag Concrete Testing', title: 'Phase 2: Accelerated Chloride Ingress & Durability', startDate: '2026-10-01', endDate: '2027-03-31', progress: 30, status: 'IN_PROGRESS', category: 'OLP' },
        { id: '8', projectId: 'p4', projectCode: 'GAP-2026-EI-004', projectTitle: 'Offshore Wind Turbine Foundation Fatigue', title: 'Phase 1: Cyclic Wave Basin Hydrodynamic Trials', startDate: '2026-04-01', endDate: '2026-10-31', progress: 85, status: 'IN_PROGRESS', category: 'GAP' },
    ];

    useEffect(() => {
        fetchMilestones();
    }, []);

    const fetchMilestones = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/projects', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                const pList = data.data || data || [];
                setProjects(pList);
            }
            setMilestones(mockMilestones);
        } catch (err) {
            console.error('Failed to load milestones:', err);
            setMilestones(mockMilestones);
        } finally {
            setLoading(false);
        }
    };

    const filteredMilestones = useMemo(() => {
        return milestones.filter(m => {
            if (categoryFilter !== 'ALL' && m.category !== categoryFilter) return false;
            if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
            if (projectFilter !== 'ALL' && m.projectId !== projectFilter && m.projectCode !== projectFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const titleMatch = m.title.toLowerCase().includes(q);
                const codeMatch = m.projectCode.toLowerCase().includes(q);
                if (!titleMatch && !codeMatch) return false;
            }
            return true;
        });
    }, [milestones, categoryFilter, statusFilter, projectFilter, search]);

    const completedCount = milestones.filter(m => m.status === 'COMPLETED').length;
    const activeCount = milestones.filter(m => m.status === 'IN_PROGRESS').length;
    const overdueCount = milestones.filter(m => m.status === 'OVERDUE').length;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-secondary-900 tracking-tight font-display flex items-center gap-2.5">
                        <Calendar className="w-7 h-7 text-primary-600" />
                        <span>Visual Timeline & Milestone Gantt Schedule</span>
                        <span className="glass-pill text-primary-700 bg-primary-50/80 border-primary-200">
                            Roadmap Active
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Timeline roadmaps, critical deliverable paths, and phase progression schedules
                    </p>
                </div>
            </div>

            {/* 1. KPI Milestone Health Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Deliverables</span>
                    <p className="text-2xl font-black text-secondary-900 mt-1">{milestones.length}</p>
                    <p className="text-xs text-slate-500">Across all projects</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Milestones Achieved</span>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{completedCount}</p>
                    <p className="text-xs text-slate-500">100% completed</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">Active Execution</span>
                    <p className="text-2xl font-black text-primary-700 mt-1">{activeCount}</p>
                    <p className="text-xs text-slate-500">In-progress phases</p>
                </div>

                <div className="glass-card-interactive p-4">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Schedule Adherence</span>
                    <p className="text-2xl font-black text-amber-700 mt-1">96%</p>
                    <p className="text-xs text-slate-500">On-track delivery</p>
                </div>
            </div>

            {/* 2. Filter Bar */}
            <div className="glass-panel p-4">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter timeline deliverables by keyword or project code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="glass-input pl-10 text-xs py-2"
                        />
                    </div>

                    <div className="w-full sm:w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="NOT_STARTED">Upcoming</option>
                        </select>
                    </div>

                    <div className="w-full sm:w-44">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="glass-input text-xs py-2"
                        >
                            <option value="ALL">All Categories</option>
                            <option value="GAP">GAP</option>
                            <option value="CNP">CNP</option>
                            <option value="OLP">OLP</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 3. Gantt Roadmap Timeline Schedule */}
            <div className="glass-panel p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-sm text-secondary-900">Fiscal Milestone Schedule Gantt (2026 - 2027)</h3>
                    <span className="glass-pill text-[10px] font-bold bg-primary-50 text-primary-700">
                        Monthly Schedule View
                    </span>
                </div>

                <div className="space-y-3.5 pt-2">
                    {filteredMilestones.map((milestone) => {
                        const start = new Date(milestone.startDate);
                        const end = new Date(milestone.endDate);
                        return (
                            <div key={milestone.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-2.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <span className="font-mono font-bold text-xs text-primary-700 bg-primary-100/80 px-2 py-0.5 rounded-lg border border-primary-200">
                                            {milestone.projectCode}
                                        </span>
                                        <h4 className="font-bold text-xs text-secondary-900">{milestone.title}</h4>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold self-start sm:self-auto ${milestone.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-primary-50 text-primary-700 border border-primary-200'}`}>
                                        {milestone.status === 'COMPLETED' ? 'Completed' : 'Active'} ({milestone.progress}%)
                                    </span>
                                </div>

                                {/* Schedule Bar */}
                                <div className="space-y-1">
                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden relative">
                                        <div
                                            className={`h-full rounded-full ${milestone.status === 'COMPLETED' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-primary-glossy'}`}
                                            style={{ width: `${milestone.progress}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                        <span>Start: <b>{start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</b></span>
                                        <span>Target Delivery: <b>{end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</b></span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
