import React, { useState } from 'react';
import {
    List as ListIcon,
    Calendar,
    LayoutGrid,
    FileText,
    Table,
    BarChart3,
    Activity,
    Users,
    Lightbulb,
    Kanban,
    GanttChart,
    FormInput,
    Clock,
    Network,
    Search,
    X
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/ViewSelectorModal.css';
import type { ViewType } from '../types';

interface ViewOption {
    id: ViewType;
    name: string;
    description: string;
    icon: React.ElementType;
    category: 'popular' | 'more';
}

const VIEW_OPTIONS: ViewOption[] = [
    {
        id: 'list',
        name: 'List',
        description: 'Track tasks, bugs, people & more',
        icon: ListIcon,
        category: 'popular'
    },
    {
        id: 'gantt',
        name: 'Gantt',
        description: 'Plan dependencies & time',
        icon: GanttChart,
        category: 'popular'
    },
    {
        id: 'calendar',
        name: 'Calendar',
        description: 'Plan, schedule, & delegate',
        icon: Calendar,
        category: 'popular'
    },
    {
        id: 'docs',
        name: 'Doc',
        description: 'Collaborate & document anything',
        icon: FileText,
        category: 'popular'
    },
    {
        id: 'kanban',
        name: 'Board - Kanban',
        description: 'Move tasks between columns',
        icon: Kanban,
        category: 'popular'
    },
    {
        id: 'forms',
        name: 'Form',
        description: 'Collect, track, & report data',
        icon: FormInput,
        category: 'popular'
    },
    {
        id: 'table',
        name: 'Table',
        description: 'Structured table format',
        icon: Table,
        category: 'more'
    },
    {
        id: 'dashboards',
        name: 'Dashboard',
        description: 'Track metrics & insights',
        icon: BarChart3,
        category: 'more'
    },
    {
        id: 'timesheet',
        name: 'Timeline',
        description: 'See tasks by start & due date',
        icon: Clock,
        category: 'more'
    },
    {
        id: 'pulse',
        name: 'Activity',
        description: 'Real-time activity feed',
        icon: Activity,
        category: 'more'
    },
    {
        id: 'list',
        name: 'Workload',
        description: 'Visualize team capacity',
        icon: LayoutGrid,
        category: 'more'
    },
    {
        id: 'whiteboards',
        name: 'Whiteboard',
        description: 'Visualize & brainstorm ideas',
        icon: Lightbulb,
        category: 'more'
    },
    {
        id: 'teams',
        name: 'Team',
        description: 'Monitor work being done',
        icon: Users,
        category: 'more'
    },
    {
        id: 'list',
        name: 'Mind Map',
        description: 'Visual brainstorming of ideas',
        icon: Network,
        category: 'more'
    }
];

interface ViewSelectorModalProps {
    onClose: () => void;
    onSelectView: (viewType: ViewType) => void;
}

const ViewSelectorModal: React.FC<ViewSelectorModalProps> = ({ onClose, onSelectView }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [viewName, setViewName] = useState('');
    const [showNameInput, setShowNameInput] = useState(false);
    const [selectedViewType, setSelectedViewType] = useState<ViewType | null>(null);

    const { addSavedView, currentSpaceId, currentListId, addDashboard, setCurrentDashboardId } = useAppStore();

    const filteredViews = VIEW_OPTIONS.filter(view =>
        view.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        view.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const popularViews = filteredViews.filter(v => v.category === 'popular');
    const moreViews = filteredViews.filter(v => v.category === 'more');

    const handleSelectViewType = (viewType: ViewType, defaultName: string) => {
        setSelectedViewType(viewType);
        setViewName(defaultName);
        setShowNameInput(true);
    };

    const handleCreateView = () => {
        if (!selectedViewType || !viewName.trim()) return;

        let dashboardId: string | undefined;

        if (selectedViewType === 'dashboards') {
            dashboardId = addDashboard({
                name: viewName.trim(),
                spaceId: currentSpaceId === 'everything' ? undefined : currentSpaceId,
                listId: currentListId || undefined,
                items: [
                    { id: '1', type: 'stat', title: 'Total Tasks', size: 'small', config: { metric: 'total' } },
                    { id: '2', type: 'stat', title: 'Completed', size: 'small', config: { metric: 'completed' } },
                    { id: '3', type: 'stat', title: 'In Progress', size: 'small', config: { metric: 'inprogress' } },
                    { id: '4', type: 'stat', title: 'Urgent', size: 'small', config: { metric: 'urgent' } }
                ]
            });
            setCurrentDashboardId(dashboardId);
        }

        addSavedView({
            name: viewName.trim(),
            viewType: selectedViewType,
            spaceId: currentSpaceId === 'everything' ? undefined : currentSpaceId,
            listId: currentListId || undefined,
            isPinned,
            isPrivate,
            dashboardId
        });

        // Switch to the newly created view
        onSelectView(selectedViewType);
        onClose();
    };

    const handleCancel = () => {
        setShowNameInput(false);
        setSelectedViewType(null);
        setViewName('');
        setIsPinned(false);
        setIsPrivate(false);
    };

    if (showNameInput && selectedViewType) {
        return (
            <>
                <div className="view-selector-overlay" onClick={onClose}></div>
                <div className="view-selector-modal view-name-modal">
                    <div className="view-name-header">
                        <h2>Name your view</h2>
                        <button className="close-btn" onClick={onClose}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="view-name-content">
                        <div className="form-group">
                            <label>View Name</label>
                            <input
                                type="text"
                                placeholder="Enter view name..."
                                value={viewName}
                                onChange={(e) => setViewName(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateView();
                                    if (e.key === 'Escape') handleCancel();
                                }}
                            />
                        </div>

                        <div className="view-options">
                            <label className="view-option-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isPinned}
                                    onChange={(e) => setIsPinned(e.target.checked)}
                                />
                                <span>Pin view</span>
                            </label>
                            <label className="view-option-checkbox">
                                <input
                                    type="checkbox"
                                    checked={isPrivate}
                                    onChange={(e) => setIsPrivate(e.target.checked)}
                                />
                                <span>Private view</span>
                            </label>
                        </div>
                    </div>

                    <div className="view-name-footer">
                        <button className="btn-secondary" onClick={handleCancel}>Cancel</button>
                        <button
                            className="btn-primary"
                            onClick={handleCreateView}
                            disabled={!viewName.trim()}
                        >
                            Create View
                        </button>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="view-selector-overlay" onClick={onClose}></div>
            <div className="view-selector-modal">
                <div className="view-selector-search">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search views..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <button className="close-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                <div className="view-selector-content">
                    {popularViews.length > 0 && (
                        <div className="view-section">
                            <h3 className="view-section-title">Popular</h3>
                            <div className="view-grid">
                                {popularViews.map((view, index) => {
                                    const Icon = view.icon;
                                    return (
                                        <button
                                            key={`${view.id}-${index}`}
                                            className="view-option"
                                            onClick={() => handleSelectViewType(view.id, view.name)}
                                        >
                                            <div className="view-icon">
                                                <Icon size={20} />
                                            </div>
                                            <div className="view-info">
                                                <div className="view-name">{view.name}</div>
                                                <div className="view-description">{view.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {moreViews.length > 0 && (
                        <div className="view-section">
                            <h3 className="view-section-title">More views</h3>
                            <div className="view-grid">
                                {moreViews.map((view, index) => {
                                    const Icon = view.icon;
                                    return (
                                        <button
                                            key={`${view.id}-${index}`}
                                            className="view-option"
                                            onClick={() => handleSelectViewType(view.id, view.name)}
                                        >
                                            <div className="view-icon">
                                                <Icon size={20} />
                                            </div>
                                            <div className="view-info">
                                                <div className="view-name">{view.name}</div>
                                                <div className="view-description">{view.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ViewSelectorModal;

