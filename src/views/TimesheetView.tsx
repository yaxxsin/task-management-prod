import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    Settings,
    Tag,
    DollarSign,
    Briefcase,
    Play,
    Square,
    Search,
    X
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isToday } from 'date-fns';
import type { Task } from '../types';
import '../styles/TimesheetView.css';
import '../styles/ListView.css'; // Re-using variables if needed

const TimesheetView: React.FC = () => {
    const { tasks, currentSpaceId, startTimer, stopTimer, activeTimer } = useAppStore();
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 })); // Sunday start

    // Manage manually added tasks to the view
    const [manualTaskIds, setManualTaskIds] = useState<string[]>([]);

    // Add task dropdown state
    const [showAddTask, setShowAddTask] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);

    const weekDays = useMemo(() =>
        Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
        , [currentWeekStart]);

    const prevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
    const nextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

    const formatDuration = (minutes: number) => {
        if (minutes === 0) return '0h';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) return `${hours}h`;
        if (hours === 0) return `${mins}m`;
        return `${hours}h ${mins}m`;
    };

    const getTaskDailyTotal = (task: Task, day: Date) => {
        if (!task.timeEntries) return 0;
        return task.timeEntries
            .filter(entry => isSameDay(new Date(entry.date), day))
            .reduce((acc, curr) => acc + curr.duration, 0);
    };

    const getTaskWeeklyTotal = (task: Task) => {
        return weekDays.reduce((acc, day) => acc + getTaskDailyTotal(task, day), 0);
    };

    // Determine which tasks to show
    // 1. Tasks belonging to current space
    // 2. AND (Have time entries this week OR Are the active timer task OR have been manually added)
    const visibleTasks = useMemo(() => {
        return tasks.filter(task => {
            // Space filter
            if (currentSpaceId !== 'everything' && task.spaceId !== currentSpaceId) return false;

            // Visibility filter
            const hasTimeEntriesThisWeek = task.timeEntries?.some(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= currentWeekStart && entryDate <= addDays(currentWeekStart, 7);
            });

            const isActive = activeTimer?.taskId === task.id;
            const isManuallyAdded = manualTaskIds.includes(task.id);

            return hasTimeEntriesThisWeek || isActive || isManuallyAdded;
        });
    }, [tasks, currentSpaceId, currentWeekStart, activeTimer, manualTaskIds]);

    const getDailyTotal = (day: Date) => {
        return visibleTasks.reduce((acc, task) => acc + getTaskDailyTotal(task, day), 0);
    };

    const getWeeklyGrandTotal = () => {
        return visibleTasks.reduce((acc, task) => acc + getTaskWeeklyTotal(task), 0);
    };

    const handleTaskAdd = (taskId: string) => {
        if (!manualTaskIds.includes(taskId)) {
            setManualTaskIds([...manualTaskIds, taskId]);
        }
        setShowAddTask(false);
        setSearchQuery('');
    };

    // Filter for the "Add Task" dropdown
    const availableTasks = tasks.filter(task =>
        (currentSpaceId === 'everything' || task.spaceId === currentSpaceId) &&
        !visibleTasks.find(vt => vt.id === task.id) &&
        task.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hasTasks = visibleTasks.length > 0;

    return (
        <div className="view-container">
            {/* Header with Tabs */}
            <div className="view-header">
                <div className="header-left">
                    <span className="page-title">Timesheets</span>
                    <div className="h-divider"></div>
                    <div className="ts-tabs">
                        <button className="ts-tab active">My timesheet</button>
                        <button className="ts-tab">All timesheets</button>
                        <button className="ts-tab">Approvals</button>
                    </div>
                </div>
                <button className={`btn-configure ${showSettings ? 'active' : ''}`} onClick={() => setShowSettings(!showSettings)}>
                    <Settings size={14} /> Configure
                </button>
            </div>

            {/* Controls Bar */}
            <div className="ts-controls-bar">
                {/* Date Navigation */}
                <div className="date-nav">
                    <button className="icon-btn-ghost" onClick={prevWeek}><ChevronLeft size={16} /></button>
                    <button className="icon-btn-ghost" onClick={nextWeek}><ChevronRight size={16} /></button>
                    <div className="date-range-display">
                        {format(currentWeekStart, 'MMM d')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), 'MMM d')}
                    </div>
                </div>

                {/* Filters Row */}
                <div className="filter-row">
                    <div className="filter-left">
                        <button className="filter-pill"><DollarSign size={13} /> Billable status</button>
                        <button className="filter-pill"><Tag size={13} /> Tag</button>
                        <button className="filter-pill"><Clock size={13} /> Tracked time</button>
                    </div>
                    <div className="view-toggle">
                        <button className="toggle-option active"><Briefcase size={14} /> Timesheet</button>
                        <button className="toggle-option"><span style={{ fontSize: '12px' }}>☰</span> Time entries</button>
                    </div>
                </div>
            </div>

            {/* Timesheet Grid */}
            <div className="timesheet-grid">
                {/* Grid Header Row */}
                <div className="grid-header">
                    <div className="col-task-header">Task / Location</div>
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className={`col-day-header ${isToday(day) ? 'today' : ''}`}>
                            <div className="day-meta">
                                {format(day, 'EEE')}, {format(day, 'MMM d')}
                            </div>
                            <div className="day-total">
                                {formatDuration(getDailyTotal(day))}
                            </div>
                        </div>
                    ))}
                    <div className="col-total-header">
                        <span className="day-meta">Total</span>
                        <span className="day-total">{formatDuration(getWeeklyGrandTotal())}</span>
                    </div>
                </div>

                {/* Grid Body */}
                <div className="grid-body">
                    {!hasTasks ? (
                        <div className="empty-state">
                            <div className="empty-icon-circle">
                                <Clock size={32} strokeWidth={1.5} />
                            </div>
                            <div className="empty-title">No time entries for this week</div>
                            <div className="empty-subtitle">Add tasks or track time to begin.</div>
                            <button className="btn-track-time" onClick={() => setShowAddTask(true)}>
                                <Clock size={16} /> Track time
                            </button>
                        </div>
                    ) : (
                        <div>
                            {visibleTasks.map(task => {
                                const weeklyTotal = getTaskWeeklyTotal(task);
                                const isTimerRunning = activeTimer?.taskId === task.id;

                                return (
                                    <div key={task.id} className="task-row">
                                        <div className="col-task-cell">
                                            <div className="flex items-center" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                                                {/* Timer Button */}
                                                <div className="timer-btn-wrapper">
                                                    {isTimerRunning ? (
                                                        <button
                                                            className="btn-timer stop"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                stopTimer();
                                                            }}
                                                            title="Stop timer"
                                                        >
                                                            <Square size={12} fill="currentColor" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn-timer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                startTimer(task.id);
                                                            }}
                                                            title="Start timer"
                                                        >
                                                            <Play size={14} fill="currentColor" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <div className="ts-task-name">{task.name}</div>
                                                    <div className="ts-task-project">Team Space / Tasks</div>
                                                </div>
                                            </div>
                                        </div>
                                        {weekDays.map(day => {
                                            const total = getTaskDailyTotal(task, day);
                                            return (
                                                <div key={day.toISOString()} className="col-time-cell">
                                                    <input
                                                        type="text"
                                                        placeholder="–"
                                                        value={total > 0 ? formatDuration(total) : ''}
                                                        readOnly
                                                        className="ts-time-input"
                                                    />
                                                </div>
                                            );
                                        })}
                                        <div className="col-total-cell">
                                            {formatDuration(weeklyTotal)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Add Task Button with Popover */}
            <div className="add-task-container" style={{ position: 'fixed', bottom: '32px', left: '280px', zIndex: 100 }}>
                {showAddTask && (
                    <div className="add-task-popover">
                        <div className="popover-search">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search for task name..."
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button onClick={() => setShowAddTask(false)} className="icon-btn-ghost">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="popover-list">
                            {availableTasks.length === 0 ? (
                                <div className="popover-empty">No matching tasks found</div>
                            ) : (
                                availableTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="popover-item"
                                        onClick={() => handleTaskAdd(task.id)}
                                    >
                                        <div className="popover-item-name">{task.name}</div>
                                        <div className="popover-item-path">Team Space</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                <button
                    className="btn-add-task-floating"
                    onClick={() => setShowAddTask(!showAddTask)}
                    style={{ position: 'static' }} // Override specific static positioning since parent handles fixed
                >
                    <Plus size={18} /> Add task
                </button>
            </div>

            {/* Settings Overlay */}
            {showSettings && (
                <>
                    <div className="settings-overlay" onClick={() => setShowSettings(false)} />
                    <div className="settings-panel">
                        <div className="settings-header">
                            <div className="flex items-center gap-2">
                                <Settings size={18} />
                                <span className="settings-title">Settings</span>
                            </div>
                            <button className="icon-btn-ghost" onClick={() => setShowSettings(false)}>
                                <div className="settings-close-icon"></div>
                            </button>
                        </div>
                        <div className="settings-content">
                            <div className="settings-group">
                                <label>My Capacity</label>
                                <div className="settings-select-wrapper">
                                    <select className="settings-select" defaultValue="weekly">
                                        <option value="weekly">Weekly</option>
                                        <option value="daily">Daily</option>
                                    </select>
                                    <ChevronRight size={14} className="select-arrow" style={{ transform: 'rotate(90deg)' }} />
                                </div>
                            </div>
                            <div className="settings-group">
                                <label>Weekly Hours <span className="info-icon">i</span></label>
                                <div className="settings-input-wrapper">
                                    <input type="text" className="settings-input" defaultValue="40h" />
                                    <button className="input-clear-btn">
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                            <button className="btn-primary full-width" onClick={() => setShowSettings(false)}>
                                Save
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TimesheetView;
