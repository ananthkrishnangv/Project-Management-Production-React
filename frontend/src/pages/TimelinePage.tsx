import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
    CalendarRegular,
    FilterRegular,
    ZoomInRegular,
    ZoomOutRegular,
    ArrowDownloadRegular,
    FlagRegular,
    CheckmarkCircleRegular,
    ClockRegular,
    AlertRegular,
} from '@fluentui/react-icons';

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

const statusColors: Record<string, { bg: string; bar: string }> = {
    NOT_STARTED: { bg: 'bg-secondary-100', bar: 'bg-secondary-400' },
    IN_PROGRESS: { bg: 'bg-primary-100', bar: 'bg-primary-500' },
    COMPLETED: { bg: 'bg-success-100', bar: 'bg-success-500' },
    OVERDUE: { bg: 'bg-danger-100', bar: 'bg-danger-500' },
};

export default function TimelinePage() {
    const { accessToken } = useAuthStore();
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const ganttRef = useRef<HTMLDivElement>(null);

    // Mock milestones data
    const mockMilestones: Milestone[] = [
        { id: '1', projectId: 'p1', projectCode: 'GAP-2024-SHM-001', projectTitle: 'Structural Health Monitoring', title: 'Phase 1: Sensor Installation', startDate: '2024-01-15', endDate: '2024-06-30', progress: 100, status: 'COMPLETED', category: 'GAP' },
        { id: '2', projectId: 'p1', projectCode: 'GAP-2024-SHM-001', projectTitle: 'Structural Health Monitoring', title: 'Phase 2: Data Collection', startDate: '2024-07-01', endDate: '2024-12-31', progress: 75, status: 'IN_PROGRESS', category: 'GAP' },
        { id: '3', projectId: 'p1', projectCode: 'GAP-2024-SHM-001', projectTitle: 'Structural Health Monitoring', title: 'Phase 3: Analysis & Report', startDate: '2025-01-01', endDate: '2025-06-30', progress: 0, status: 'NOT_STARTED', category: 'GAP' },
        { id: '4', projectId: 'p2', projectCode: 'CNP-2024-TT-003', projectTitle: 'Technology Transfer', title: 'Technology Documentation', startDate: '2024-03-01', endDate: '2024-09-30', progress: 100, status: 'COMPLETED', category: 'CNP' },
        { id: '5', projectId: 'p2', projectCode: 'CNP-2024-TT-003', projectTitle: 'Technology Transfer', title: 'Training Workshop', startDate: '2024-10-01', endDate: '2024-12-15', progress: 50, status: 'OVERDUE', category: 'CNP' },
        { id: '6', projectId: 'p3', projectCode: 'GAP-2024-WE-001', projectTitle: 'Wind Engineering', title: 'Wind Tunnel Tests', startDate: '2024-02-15', endDate: '2024-08-31', progress: 100, status: 'COMPLETED', category: 'GAP' },
        { id: '7', projectId: 'p3', projectCode: 'GAP-2024-WE-001', projectTitle: 'Wind Engineering', title: 'CFD Simulation', startDate: '2024-09-01', endDate: '2025-02-28', progress: 40, status: 'IN_PROGRESS', category: 'GAP' },
        { id: '8', projectId: 'p4', projectCode: 'OLP-2024-CT-001', projectTitle: 'Concrete Technology', title: 'Material Testing', startDate: '2024-04-01', endDate: '2024-10-31', progress: 100, status: 'COMPLETED', category: 'OLP' },
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setMilestones(mockMilestones);
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const filteredMilestones = milestones.filter(m => {
        const matchesCategory = !categoryFilter || m.category === categoryFilter;
        const matchesStatus = !statusFilter || m.status === statusFilter;
        return matchesCategory && matchesStatus;
    });

    // Group milestones by project
    const groupedByProject = filteredMilestones.reduce((acc, m) => {
        if (!acc[m.projectCode]) {
            acc[m.projectCode] = { title: m.projectTitle, milestones: [] };
        }
        acc[m.projectCode].milestones.push(m);
        return acc;
    }, {} as Record<string, { title: string; milestones: Milestone[] }>);

    // Calculate timeline range
    const allDates = milestones.flatMap(m => [new Date(m.startDate), new Date(m.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    const getBarPosition = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const startOffset = Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return {
            left: `${(startOffset / totalDays) * 100}%`,
            width: `${(duration / totalDays) * 100}%`,
        };
    };

    // Generate months for header
    const months: { label: string; width: number }[] = [];
    let current = new Date(minDate);
    while (current <= maxDate) {
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
        const effectiveStart = monthStart < minDate ? minDate : monthStart;
        const effectiveEnd = monthEnd > maxDate ? maxDate : monthEnd;
        const days = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        months.push({
            label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            width: (days / totalDays) * 100,
        });
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    const stats = {
        total: milestones.length,
        completed: milestones.filter(m => m.status === 'COMPLETED').length,
        inProgress: milestones.filter(m => m.status === 'IN_PROGRESS').length,
        overdue: milestones.filter(m => m.status === 'OVERDUE').length,
    };

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

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-secondary-900">Project Timeline</h1>
                    <p className="text-secondary-500 mt-1">Interactive Gantt chart for project milestones</p>
                </div>
                <button className="btn-secondary flex items-center gap-2">
                    <ArrowDownloadRegular className="w-5 h-5" />
                    Export Timeline
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="premium-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                        <FlagRegular className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-secondary-900">{stats.total}</p>
                        <p className="text-sm text-secondary-500">Total Milestones</p>
                    </div>
                </div>
                <div className="premium-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
                        <CheckmarkCircleRegular className="w-6 h-6 text-success-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-success-600">{stats.completed}</p>
                        <p className="text-sm text-secondary-500">Completed</p>
                    </div>
                </div>
                <div className="premium-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                        <ClockRegular className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-primary-600">{stats.inProgress}</p>
                        <p className="text-sm text-secondary-500">In Progress</p>
                    </div>
                </div>
                <div className="premium-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center">
                        <AlertRegular className="w-6 h-6 text-danger-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-danger-600">{stats.overdue}</p>
                        <p className="text-sm text-secondary-500">Overdue</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="premium-card p-4">
                <div className="flex flex-wrap gap-4">
                    <div className="relative">
                        <FilterRegular className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
                        <select
                            className="input-premium pl-12 min-w-40"
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            <option value="GAP">Grant-in-Aid (GAP)</option>
                            <option value="CNP">Consultancy (CNP)</option>
                            <option value="OLP">Other Lab (OLP)</option>
                        </select>
                    </div>
                    <div className="relative">
                        <select
                            className="input-premium min-w-40"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="NOT_STARTED">Not Started</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Gantt Chart */}
            <div className="premium-card overflow-hidden">
                <div className="p-4 border-b border-secondary-100">
                    <h3 className="font-semibold text-secondary-900">Gantt Chart</h3>
                </div>

                <div className="overflow-x-auto" ref={ganttRef}>
                    <div className="min-w-[1000px]">
                        {/* Timeline Header */}
                        <div className="flex border-b border-secondary-200 bg-secondary-50">
                            <div className="w-72 flex-shrink-0 p-3 font-medium text-secondary-700 border-r border-secondary-200">
                                Project / Milestone
                            </div>
                            <div className="flex-1 flex">
                                {months.map((month, i) => (
                                    <div
                                        key={i}
                                        className="text-center text-xs font-medium text-secondary-600 py-2 border-r border-secondary-200"
                                        style={{ width: `${month.width}%` }}
                                    >
                                        {month.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Today Line */}
                        <div className="relative">
                            {Object.entries(groupedByProject).map(([code, project], projectIndex) => (
                                <div key={code}>
                                    {/* Project Header */}
                                    <div className="flex border-b border-secondary-100 bg-secondary-50/50">
                                        <div className="w-72 flex-shrink-0 p-3 border-r border-secondary-200">
                                            <span className="font-mono text-sm font-medium text-primary-600">{code}</span>
                                            <p className="text-xs text-secondary-500 truncate">{project.title}</p>
                                        </div>
                                        <div className="flex-1" />
                                    </div>

                                    {/* Milestones */}
                                    {project.milestones.map((milestone, i) => {
                                        const position = getBarPosition(milestone.startDate, milestone.endDate);
                                        const colors = statusColors[milestone.status];
                                        return (
                                            <div key={milestone.id} className="flex border-b border-secondary-100 hover:bg-secondary-50/50">
                                                <div className="w-72 flex-shrink-0 p-3 border-r border-secondary-200">
                                                    <p className="text-sm font-medium text-secondary-800 truncate pl-4">
                                                        {milestone.title}
                                                    </p>
                                                    <p className="text-xs text-secondary-400 pl-4">
                                                        {new Date(milestone.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(milestone.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="flex-1 relative py-3 px-2">
                                                    <div
                                                        className={`absolute h-8 rounded-lg ${colors.bg} shadow-sm cursor-pointer group transition-all hover:shadow-md`}
                                                        style={{ left: position.left, width: position.width }}
                                                        title={`${milestone.title} - ${milestone.progress}%`}
                                                    >
                                                        <div
                                                            className={`h-full rounded-lg ${colors.bar} transition-all`}
                                                            style={{ width: `${milestone.progress}%` }}
                                                        />
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-secondary-700">
                                                            {milestone.progress}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="p-4 border-t border-secondary-100 flex flex-wrap gap-4">
                    {Object.entries(statusColors).map(([status, colors]) => (
                        <div key={status} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded ${colors.bar}`} />
                            <span className="text-sm text-secondary-600">{status.replace('_', ' ')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
