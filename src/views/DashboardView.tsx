import React, { useState, useMemo } from 'react';
import {
    Plus,
    Layout as LayoutIcon,
    BarChart3,
    PieChart,
    Activity,
    ArrowLeft,
    Search,
    ChevronDown,
    Layers,
    X
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';

import { useAppStore } from '../store/useAppStore';
import DashboardCard from '../components/DashboardCard';
import ViewHeader from '../components/ViewHeader';
import { generateUUID } from '../utils/uuid';
import '../styles/DashboardView.css';

const DashboardView: React.FC = () => {
    const {
        currentSpaceId,
        currentListId,
        tasks,
        dashboards,
        currentDashboardId,
        setCurrentDashboardId,
        addDashboard,
        updateDashboard,
        deleteDashboard,
        spaces,
        lists,
    } = useAppStore();

    const [isAddingChart, setIsAddingChart] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeHubTab, setActiveHubTab] = useState<'All' | 'My' | 'Shared' | 'Private'>('All');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const currentDashboard = useMemo(() =>
        dashboards.find(d => d.id === currentDashboardId),
        [dashboards, currentDashboardId]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!currentDashboard) return;

        if (over && active.id !== over.id) {
            const oldIndex = currentDashboard.items.findIndex((item) => item.id === active.id);
            const newIndex = currentDashboard.items.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(currentDashboard.items, oldIndex, newIndex);
            updateDashboard(currentDashboard.id, { items: newItems });
        }
    };

    const handleResize = (id: string) => {
        if (!currentDashboard) return;
        const item = currentDashboard.items.find(i => i.id === id);
        if (!item) return;

        const sizes: ('small' | 'medium' | 'large' | 'full')[] = ['small', 'medium', 'large', 'full'];
        const currentIndex = sizes.indexOf(item.size);
        const nextSize = sizes[(currentIndex + 1) % sizes.length];

        const newItems = currentDashboard.items.map(i => i.id === id ? { ...i, size: nextSize } : i);
        updateDashboard(currentDashboard.id, { items: newItems });
    };

    const addNewChart = (type: any, title: string) => {
        if (!currentDashboard) return;
        const newItem = {
            id: generateUUID(),
            type,
            title,
            size: 'medium' as const,
            config: type === 'stat' ? { metric: 'total' } : {}
        };
        updateDashboard(currentDashboard.id, { items: [...currentDashboard.items, newItem] });
        setIsAddingChart(false);
    };

    const handleDeleteCard = (id: string) => {
        if (!currentDashboard) return;
        updateDashboard(currentDashboard.id, {
            items: currentDashboard.items.filter(i => i.id !== id)
        });
    };

    const handleCreateTemplate = (type: 'Task Management' | 'AI Team Center' | 'Project Management') => {
        const items: any[] = []; // Using any[] to match the loose typing in addNewChart, but ideally should be DashboardItem[]

        if (type === 'Task Management') {
            items.push(
                {
                    id: generateUUID(),
                    type: 'stat',
                    title: 'Total Tasks',
                    size: 'small',
                    config: { metric: 'total' }
                },
                {
                    id: generateUUID(),
                    type: 'stat',
                    title: 'Completed',
                    size: 'small',
                    config: { metric: 'completed' }
                },
                {
                    id: generateUUID(),
                    type: 'stat',
                    title: 'Urgent',
                    size: 'small',
                    config: { metric: 'urgent' }
                },
                {
                    id: generateUUID(),
                    type: 'stat',
                    title: 'In Progress',
                    size: 'small',
                    config: { metric: 'inprogress' }
                },
                {
                    id: generateUUID(),
                    type: 'bar',
                    title: 'Task Distribution',
                    size: 'medium',
                    config: {}
                },
                {
                    id: generateUUID(),
                    type: 'priority',
                    title: 'By Priority',
                    size: 'medium',
                    config: {}
                }
            );
        } else if (type === 'Project Management') {
            items.push(
                {
                    id: generateUUID(),
                    type: 'pie',
                    title: 'Completion Rate',
                    size: 'medium',
                    config: {}
                },
                {
                    id: generateUUID(),
                    type: 'bar',
                    title: 'Project Status',
                    size: 'medium',
                    config: {}
                },
                {
                    id: generateUUID(),
                    type: 'stat',
                    title: 'Total Tasks',
                    size: 'small',
                    config: { metric: 'total' }
                }
            );
        } else if (type === 'AI Team Center') {
            items.push(
                {
                    id: generateUUID(),
                    type: 'stat',
                    title: 'Team Activity',
                    size: 'medium',
                    config: { metric: 'total' } // Placeholder
                }
            );
        }

        const newId = addDashboard({
            name: type,
            items: items
        });
        setCurrentDashboardId(newId);
    };

    const handleCreateNew = () => {
        const newId = addDashboard({
            name: 'New Dashboard',
            items: []
        });
        setCurrentDashboardId(newId);
    };

    const getLocationName = (spaceId?: string, listId?: string) => {
        if (listId) {
            const list = lists.find(l => l.id === listId);
            return list ? `in ${list.name}` : 'in List';
        }
        if (spaceId) {
            const space = spaces.find(s => s.id === spaceId);
            return space ? `in ${space.name}` : 'in Space';
        }
        return 'Personal';
    };

    // --- Hub Rendering ---
    if (!currentDashboardId || !currentDashboard) {
        return (
            <div className="view-container dashboard-hub">
                <div className="view-header dash-header">
                    <div className="breadcrumb">
                        <BarChart3 size={20} className="header-icon" />
                        <span className="space-name">Dashboards</span>
                    </div>
                    <div className="view-controls">
                        <div className="search-box">
                            <Search size={14} />
                            <input
                                type="text"
                                placeholder="Search Dashboards"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn-primary" onClick={handleCreateNew}>
                            New Dashboard
                        </button>
                    </div>
                </div>

                <div className="hub-content">
                    <section className="hub-section templates">
                        <div className="section-header">
                            <h3>Start with a template</h3>
                            <button className="icon-btn"><X size={14} /></button>
                        </div>
                        <div className="template-grid">
                            <div className="template-card" onClick={() => handleCreateTemplate('Task Management')}>
                                <div className="template-icon blue"><Layers size={24} /></div>
                                <div className="template-info">
                                    <h4>Task Management</h4>
                                    <span>Manage & prioritize tasks</span>
                                </div>
                            </div>
                            <div className="template-card" onClick={() => handleCreateTemplate('AI Team Center')}>
                                <div className="template-icon purple"><Activity size={24} /></div>
                                <div className="template-info">
                                    <h4>AI Team Center</h4>
                                    <span>View team activity with AI</span>
                                </div>
                            </div>
                            <div className="template-card" onClick={() => handleCreateTemplate('Project Management')}>
                                <div className="template-icon orange"><BarChart3 size={24} /></div>
                                <div className="template-info">
                                    <h4>Project Management</h4>
                                    <span>Analyze project progress and metrics</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="hub-overview-grid">
                        <section className="hub-card-section">
                            <h3>Recent</h3>
                            <div className="compact-list">
                                {dashboards
                                    .filter(d => (!currentSpaceId || currentSpaceId === 'everything' || d.spaceId === currentSpaceId) && (!currentListId || d.listId === currentListId))
                                    .slice(0, 3)
                                    .map(dash => (
                                        <div key={dash.id} className="compact-item" onClick={() => setCurrentDashboardId(dash.id)}>
                                            <BarChart3 size={14} />
                                            <span className="name">{dash.name}</span>
                                            <span className="location">• {getLocationName(dash.spaceId, dash.listId)}</span>
                                        </div>
                                    ))}
                            </div>
                        </section>
                        <section className="hub-card-section">
                            <h3>Favorites</h3>
                            <div className="empty-state">
                                <BarChart3 size={32} />
                                <p>Your favorited Dashboards will show here.</p>
                            </div>
                        </section>
                        <section className="hub-card-section">
                            <h3>Created by Me</h3>
                            <div className="compact-list">
                                {dashboards
                                    .filter(d => d.ownerId === 'user-1')
                                    .filter(d => (!currentSpaceId || currentSpaceId === 'everything' || d.spaceId === currentSpaceId) && (!currentListId || d.listId === currentListId))
                                    .slice(0, 3)
                                    .map(dash => (
                                        <div key={dash.id} className="compact-item" onClick={() => setCurrentDashboardId(dash.id)}>
                                            <BarChart3 size={14} />
                                            <span className="name">{dash.name}</span>
                                            <span className="location">• {getLocationName(dash.spaceId, dash.listId)}</span>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    </div>

                    <section className="hub-table-section">
                        <div className="table-filters">
                            <div className="tabs">
                                {['All', 'My Dashboards', 'Shared', 'Private', 'Workspace'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`tab ${activeHubTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveHubTab(tab as any)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="table-search">
                                <Search size={14} />
                                <span>Search</span>
                            </div>
                        </div>

                        <table className="dash-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Location</th>
                                    <th>Date viewed <ChevronDown size={14} /></th>
                                    <th>Date updated</th>
                                    <th>Owner</th>
                                    <th>Sharing</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboards.map(dash => (
                                    <tr key={dash.id} onClick={() => setCurrentDashboardId(dash.id)}>
                                        <td>
                                            <div className="td-name">
                                                <BarChart3 size={14} />
                                                {dash.name}
                                            </div>
                                        </td>
                                        <td><div className="td-location"><Layers size={12} /> {getLocationName(dash.spaceId, dash.listId).replace('in ', '')}</div></td>
                                        <td>Just now</td>
                                        <td>{new Date(dash.updatedAt).toLocaleDateString()}</td>
                                        <td><div className="user-avatar-sm">JM</div></td>
                                        <td><div className="user-avatar-sm">JM</div></td>
                                        <td onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete dashboard "${dash.name}"?`)) {
                                                deleteDashboard(dash.id);
                                            }
                                        }}>
                                            <button className="icon-btn"><X size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="view-container">
            <ViewHeader />
            <div className="view-header-overlay-controls">
                <button className="btn-primary" onClick={() => setIsAddingChart(!isAddingChart)}>
                    <Plus size={16} /> Add Chart
                </button>
            </div>

            <div className="dashboard-content">
                {isAddingChart && (
                    <div className="add-chart-bar">
                        <div className="bar-header">
                            <h4>Select Chart Type</h4>
                            <button className="icon-btn" onClick={() => setIsAddingChart(false)}>
                                <ArrowLeft size={16} /> Back
                            </button>
                        </div>
                        <div className="chart-options">
                            <button className="chart-opt-btn" onClick={() => addNewChart('stat', 'New Metric')}>
                                <LayoutIcon size={20} />
                                <span>Stat Card</span>
                            </button>
                            <button className="chart-opt-btn" onClick={() => addNewChart('bar', 'Task Distribution')}>
                                <BarChart3 size={20} />
                                <span>Bar Chart</span>
                            </button>
                            <button className="chart-opt-btn" onClick={() => addNewChart('pie', 'Progress Wheel')}>
                                <PieChart size={20} />
                                <span>Pie Chart</span>
                            </button>
                            <button className="chart-opt-btn" onClick={() => addNewChart('priority', 'Priority Level')}>
                                <Activity size={20} />
                                <span>Priority Map</span>
                            </button>
                        </div>
                    </div>
                )}

                <div className="dashboard-grid">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToFirstScrollableAncestor]}
                    >
                        <SortableContext
                            items={currentDashboard.items.map(i => i.id)}
                            strategy={rectSortingStrategy}
                        >
                            {currentDashboard.items.map((item) => (
                                <DashboardCard
                                    key={item.id}
                                    item={item}
                                    tasks={tasks}
                                    onDelete={handleDeleteCard}
                                    onResize={handleResize}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
