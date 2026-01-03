import React from 'react';
import {
    Plus,
    ChevronRight,
    Video,
    List as ListIcon,
    Kanban,
    Calendar as CalendarIcon,
    GanttChart,
    BarChart3,
    Clock,
    FileText,
    Star as StarIcon,
    Users,
    Layout,
    Lock,
    Briefcase,
    Code,
    GraduationCap,
    Book,
    Globe,
    Zap,
    Cloud,
    Moon,
    Flag,
    Target,
    Coffee,
    Heart,
    Music,
    Camera,
    CheckSquare,
    Hash
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { ViewType, SavedView } from '../types';
import ViewSelectorModal from './ViewSelectorModal';
import ViewContextMenu from './ViewContextMenu';

const IconMap: Record<string, any> = {
    'users': Users,
    'layout': Layout,
    'lock': Lock,
    'star': StarIcon,
    'briefcase': Briefcase,
    'code': Code,
    'graduation': GraduationCap,
    'book': Book,
    'globe': Globe,
    'zap': Zap,
    'cloud': Cloud,
    'moon': Moon,
    'flag': Flag,
    'target': Target,
    'coffee': Coffee,
    'heart': Heart,
    'music': Music,
    'camera': Camera,
    'list': ListIcon,
    'check-square': CheckSquare,
    'calendar': CalendarIcon,
    'hash': Hash,
    'dashboards': BarChart3,
    'docs': FileText,
    'clips': Video,
    'timesheet': Clock,
    'gantt': GanttChart,
    'kanban': Kanban
};

const ViewHeader: React.FC = () => {
    const {
        currentSpaceId,
        currentListId,
        currentView,
        setCurrentView,
        savedViews,
        spaces,
        lists,
        tasks,
        currentDashboardId,
        setCurrentDashboardId,
        dashboards
    } = useAppStore();

    const [showViewSelector, setShowViewSelector] = React.useState(false);
    const [contextMenu, setContextMenu] = React.useState<{ view: any; position: { x: number; y: number } } | null>(null);

    const isEverything = currentSpaceId === 'everything';
    const activeSpace = spaces.find(s => s.id === currentSpaceId) || (isEverything ? {
        id: 'everything',
        name: 'Everything',
        icon: 'star',
        color: '#3b82f6'
    } : null);
    const activeList = lists.find(l => l.id === currentListId);

    // For Dashboard context
    const currentDashboard = dashboards.find(d => d.id === currentDashboardId);

    // Resolve context for filtering saved views
    // If we're in a dashboard view, we might want to show views from its parent space/list
    const contextSpaceId = currentView === 'dashboards' && currentDashboard ? currentDashboard.spaceId : currentSpaceId;
    const contextListId = currentView === 'dashboards' && currentDashboard ? currentDashboard.listId : currentListId;

    const filteredTasks = tasks.filter(task => {
        const matchesSpace = contextSpaceId === 'everything' || task.spaceId === contextSpaceId;
        const matchesList = !contextListId || task.listId === contextListId;
        return matchesSpace && matchesList;
    });

    const renderIcon = (iconName: string, size = 16, color?: string) => {
        const IconComponent = IconMap[iconName] || StarIcon;
        return <IconComponent size={size} color={color} />;
    };

    const isViewActive = (savedView: SavedView) => {
        if (savedView.viewType === 'dashboards' && savedView.dashboardId) {
            return currentView === 'dashboards' && currentDashboardId === savedView.dashboardId;
        }
        return currentView === savedView.viewType;
    };

    const handleViewClick = (savedView: SavedView) => {
        setCurrentView(savedView.viewType);
        if (savedView.viewType === 'dashboards' && savedView.dashboardId) {
            setCurrentDashboardId(savedView.dashboardId);
        }
    };

    return (
        <div className="view-header">
            <div className="breadcrumb">
                {currentView === 'dashboards' && !currentDashboard?.spaceId && !currentDashboard?.listId ? (
                    <>
                        <button className="back-to-hub" title="Back to Hub" onClick={() => setCurrentDashboardId(null)}>
                            <BarChart3 size={18} />
                        </button>
                        <span className="space-name">{currentDashboard?.name || 'Dashboard'}</span>
                    </>
                ) : (
                    <>
                        <div className="breadcrumb-item">
                            {activeSpace && renderIcon(activeSpace.icon, 18, activeSpace.color || undefined)}
                            <span className="space-name">{activeSpace?.name || 'Space'}</span>
                        </div>
                        {currentListId && (
                            <>
                                <ChevronRight size={14} className="breadcrumb-separator" />
                                <div className="breadcrumb-item">
                                    {activeList?.icon && renderIcon(activeList.icon, 18, activeList.color || activeSpace?.color || undefined)}
                                    <span className="space-name">{activeList?.name}</span>
                                </div>
                            </>
                        )}
                        <span className="task-count">{filteredTasks.length}</span>
                    </>
                )}
            </div>

            <div className="view-controls">
                {savedViews
                    .filter(v => !v.spaceId || v.spaceId === contextSpaceId)
                    .filter(v => !v.listId || v.listId === contextListId)
                    .sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return 0;
                    })
                    .map(savedView => (
                        <button
                            key={savedView.id}
                            className={`view-mode-btn ${isViewActive(savedView) ? 'active' : ''}`}
                            onClick={() => handleViewClick(savedView)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                    view: savedView,
                                    position: { x: e.clientX, y: e.clientY }
                                });
                            }}
                        >
                            {savedView.name}
                        </button>
                    ))
                }
                <button className="view-mode-btn add-view-btn" onClick={() => setShowViewSelector(true)}>
                    <Plus size={14} /> View
                </button>
            </div>

            {showViewSelector && (
                <ViewSelectorModal
                    onClose={() => setShowViewSelector(false)}
                    onSelectView={(viewType: ViewType) => {
                        setCurrentView(viewType);
                    }}
                />
            )}

            {contextMenu && (
                <ViewContextMenu
                    view={contextMenu.view}
                    position={contextMenu.position}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
};

export default ViewHeader;
