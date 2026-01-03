import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Maximize2,
    Trash2,
    Layout,
    CheckCircle2,
    Clock,
    AlertCircle,
    GripVertical
} from 'lucide-react';
import type { DashboardItem, Task } from '../types';

interface DashboardCardProps {
    item: DashboardItem;
    tasks: Task[];
    onDelete: (id: string) => void;
    onResize: (id: string) => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ item, tasks, onDelete, onResize }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const renderContent = () => {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status.toUpperCase() === 'COMPLETED').length;
        const inProgress = tasks.filter(t => t.status.toUpperCase() === 'IN PROGRESS').length;
        const todo = tasks.filter(t => t.status.toUpperCase() === 'TO DO' || t.status.toUpperCase() === 'BACKLOG').length;
        const urgent = tasks.filter(t => t.priority === 'urgent').length;

        switch (item.type) {
            case 'stat':
                const metric = item.config?.metric || 'total';
                let icon = <Layout size={20} />;
                let color = 'blue';
                let value = total;
                let label = 'Total Tasks';

                if (metric === 'completed') {
                    icon = <CheckCircle2 size={20} />;
                    color = 'green';
                    value = completed;
                    label = 'Completed';
                } else if (metric === 'inprogress') {
                    icon = <Clock size={20} />;
                    color = 'orange';
                    value = inProgress;
                    label = 'In Progress';
                } else if (metric === 'urgent') {
                    icon = <AlertCircle size={20} />;
                    color = 'red';
                    value = urgent;
                    label = 'Urgent';
                }

                return (
                    <div className="stat-content">
                        <div className={`stat-icon ${color}`}>
                            {icon}
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{label}</span>
                            <span className="stat-value">{value}</span>
                        </div>
                    </div>
                );

            case 'bar':
                const bars = [
                    { label: 'To Do', count: todo, color: 'blue' },
                    { label: 'In Progress', count: inProgress, color: 'orange' },
                    { label: 'Completed', count: completed, color: 'green' }
                ];
                return (
                    <div className="bar-chart-content">
                        <div className="bar-chart">
                            {bars.map(bar => (
                                <div key={bar.label} className="bar-item">
                                    <div className="bar-label">{bar.label}</div>
                                    <div className="bar-wrapper">
                                        <div
                                            className={`bar-fill ${bar.color}`}
                                            style={{ height: `${total > 0 ? (bar.count / total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="bar-count">{bar.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 'priority':
                const priorities = [
                    { name: 'urgent', color: 'urgent', count: urgent },
                    { name: 'high', color: 'high', count: tasks.filter(t => t.priority === 'high').length },
                    { name: 'medium', color: 'medium', count: tasks.filter(t => t.priority === 'medium').length },
                    { name: 'low', color: 'low', count: tasks.filter(t => t.priority === 'low').length }
                ];
                return (
                    <div className="priority-list">
                        {priorities.map(p => (
                            <div key={p.name} className="priority-item">
                                <div className="priority-info">
                                    <span className={`priority-dot ${p.color}`}></span>
                                    <span className="priority-name">{p.name}</span>
                                </div>
                                <span className="priority-count">{p.count}</span>
                            </div>
                        ))}
                    </div>
                );

            case 'pie':
                // Simple SVG Pie Chart placeholder
                const completionPercentage = total > 0 ? (completed / total) * 100 : 0;
                return (
                    <div className="pie-chart-content">
                        <svg viewBox="0 0 36 36" className="circular-chart">
                            <path className="circle-bg"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path className="circle"
                                strokeDasharray={`${completionPercentage}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                stroke="#10b981"
                            />
                            <text x="18" y="20.35" className="percentage">{Math.round(completionPercentage)}%</text>
                        </svg>
                        <div className="pie-label">Task Completion</div>
                    </div>
                );

            default:
                return <div>Unknown chart type</div>;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`dashboard-card-wrapper size-${item.size}`}
        >
            <div className="dashboard-card-inner">
                <div className="card-header">
                    <div className="header-left">
                        <div className="drag-handle" {...attributes} {...listeners}>
                            <GripVertical size={14} />
                        </div>
                        <h3>{item.title}</h3>
                    </div>
                    <div className="header-actions">
                        <button onClick={() => onResize(item.id)} title="Resize">
                            <Maximize2 size={14} />
                        </button>
                        <button onClick={() => onDelete(item.id)} title="Delete">
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default DashboardCard;
