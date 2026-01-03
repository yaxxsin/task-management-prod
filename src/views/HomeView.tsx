import React, { useState, useMemo } from 'react';
import {
    History,
    CheckCircle2,
    Clock,
    Calendar,
    Star,
    Plus,
    Play,
    Square
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { format, isToday, parseISO, isSameDay, startOfWeek, endOfWeek } from 'date-fns';
import '../styles/HomeView.css';

interface HomeViewProps {
    onAddTask: () => void;
    onTaskClick: (taskId: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onAddTask, onTaskClick }) => {
    const { tasks, startTimer, stopTimer, activeTimer } = useAppStore();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'To Do' | 'Done' | 'Delegated'>('To Do');

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const todayTasks = useMemo(() =>
        tasks.filter(t => t.dueDate && isToday(parseISO(t.dueDate)) && t.status.toUpperCase() !== 'COMPLETED'),
        [tasks]);

    const overdueTasks = useMemo(() =>
        tasks.filter(t => t.dueDate && !isToday(parseISO(t.dueDate)) && parseISO(t.dueDate) < new Date() && t.status.toUpperCase() !== 'COMPLETED'),
        [tasks]);

    const recents = useMemo(() =>
        [...tasks].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3),
        [tasks]);

    const filteredWorkTasks = useMemo(() => {
        if (activeTab === 'To Do') {
            return tasks.filter(t => t.status.toUpperCase() !== 'COMPLETED');
        } else if (activeTab === 'Done') {
            return tasks.filter(t => t.status.toUpperCase() === 'COMPLETED');
        } else {
            // Delegated - for now just high priority tasks as a placeholder if no assignee logic
            const currentName = user?.name || 'Jundee';
            return tasks.filter(t => t.assignee && t.assignee !== currentName);
        }
    }, [tasks, activeTab, user]);

    const workGroupTasks = useMemo(() => {
        return filteredWorkTasks.filter(t => t.dueDate && isToday(parseISO(t.dueDate)));
    }, [filteredWorkTasks]);

    // Calculate time tracking
    const { todayTotal, weekTotal } = useMemo(() => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

        let today = 0;
        let week = 0;

        tasks.forEach(task => {
            task.timeEntries?.forEach(entry => {
                const entryDate = new Date(entry.date);
                if (isSameDay(entryDate, now)) {
                    today += entry.duration;
                }
                if (entryDate >= weekStart && entryDate <= weekEnd) {
                    week += entry.duration;
                }
            });
        });

        return { todayTotal: today, weekTotal: week };
    }, [tasks]);

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    };

    return (
        <div className="home-container">
            <div className="home-header">
                <div className="header-top">
                    <div>
                        <h1>{getGreeting()}, {user?.name.split(' ')[0] || 'there'}</h1>
                        <p>Here's what's happening with your projects today.</p>
                    </div>
                    <button className="btn-primary" onClick={onAddTask}>
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </div>

            <div className="home-content-grid">
                <div className="home-main-col">
                    {/* Recents Section */}
                    <section className="home-section">
                        <div className="section-header">
                            <div className="title-group">
                                <History size={18} />
                                <h3>Recents</h3>
                            </div>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>See all</button>
                        </div>
                        <div className="recents-grid">
                            {recents.map(task => (
                                <div key={task.id} className="recent-card" onClick={() => onTaskClick(task.id)}>
                                    <div className="recent-icon">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div className="recent-info">
                                        <span className="recent-name">{task.name}</span>
                                        <span className="recent-meta">Updated {format(parseISO(task.updatedAt), 'MMM d')}</span>
                                    </div>
                                    <Star size={14} className="star-icon" />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* My Work Section */}
                    <section className="home-section">
                        <div className="section-header">
                            <div className="title-group">
                                <CheckCircle2 size={18} />
                                <h3>My Work</h3>
                            </div>
                            <div className="work-tabs">
                                <button
                                    className={`tab ${activeTab === 'To Do' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('To Do')}
                                >To Do</button>
                                <button
                                    className={`tab ${activeTab === 'Done' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('Done')}
                                >Done</button>
                                <button
                                    className={`tab ${activeTab === 'Delegated' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('Delegated')}
                                >Delegated</button>
                            </div>
                        </div>

                        <div className="work-groups">
                            <div className="work-group">
                                <div className="group-header">
                                    <span>Today</span>
                                    <span className="count">{workGroupTasks.length}</span>
                                </div>
                                <div className="group-tasks">
                                    {workGroupTasks.length > 0 ? workGroupTasks.map(task => (
                                        <div key={task.id} className="home-task-item" onClick={() => onTaskClick(task.id)}>
                                            <div className="task-left">
                                                <div className={`checkbox ${task.status.toUpperCase() === 'COMPLETED' ? 'checked' : ''}`}>
                                                    {task.status.toUpperCase() === 'COMPLETED' && <CheckCircle2 size={12} />}
                                                </div>
                                                <span>{task.name}</span>
                                            </div>
                                            <div className="task-right">
                                                <span className={`priority-tag ${task.priority}`}>{task.priority}</span>
                                            </div>
                                        </div>
                                    )) : <div className="empty-tasks">No tasks for today</div>}
                                </div>
                                <button className="add-task-inline" onClick={onAddTask}>+ Add Task</button>
                            </div>

                            {activeTab === 'To Do' && overdueTasks.length > 0 && (
                                <div className="work-group overdue">
                                    <div className="group-header">
                                        <span>Overdue</span>
                                        <span className="count">{overdueTasks.length}</span>
                                    </div>
                                    <div className="group-tasks">
                                        {overdueTasks.map(task => (
                                            <div key={task.id} className="home-task-item" onClick={() => onTaskClick(task.id)}>
                                                <div className="task-left">
                                                    <div className="checkbox"></div>
                                                    <span>{task.name}</span>
                                                </div>
                                                <div className="task-right">
                                                    <span className="date overdue">{task.dueDate}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <div className="home-side-col">
                    {/* Agenda Section */}
                    <section className="home-section">
                        <div className="section-header">
                            <div className="title-group">
                                <Calendar size={18} />
                                <h3>Agenda</h3>
                            </div>
                        </div>
                        <div className="agenda-card">
                            <div className="agenda-date">
                                <span className="day-name">{format(new Date(), 'EEE')}</span>
                                <span className="day-num">{format(new Date(), 'd')}</span>
                            </div>
                            <div className="agenda-events">
                                {todayTasks.length > 0 ? todayTasks.slice(0, 4).map(task => (
                                    <div key={task.id} className="agenda-event" onClick={() => onTaskClick(task.id)}>
                                        <span className="time">All day</span>
                                        <span className="event-name">{task.name}</span>
                                    </div>
                                )) : <div className="empty-agenda">Clean slate for today!</div>}
                            </div>
                        </div>
                    </section>

                    {/* Time Tracking Section */}
                    <section className="home-section">
                        <div className="section-header">
                            <div className="title-group">
                                <Clock size={18} />
                                <h3>Time Tracking</h3>
                            </div>
                        </div>
                        <div className="time-tracking-card">
                            <div className="time-stat">
                                <span className="label">Today</span>
                                <span className="value">{formatDuration(todayTotal)}</span>
                            </div>
                            <div className="time-stat">
                                <span className="label">This week</span>
                                <span className="value">{formatDuration(weekTotal)}</span>
                            </div>
                            {activeTimer ? (
                                <button className="btn-primary stop" onClick={stopTimer} style={{ marginTop: '16px', width: '100%', background: '#ef4444' }}>
                                    <Square size={14} style={{ marginRight: '8px' }} /> Stop Timer
                                </button>
                            ) : (
                                <button className="btn-primary" onClick={() => recents[0] && startTimer(recents[0].id)} style={{ marginTop: '16px', width: '100%' }}>
                                    <Play size={14} style={{ marginRight: '8px' }} /> Start Timer
                                </button>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default HomeView;
