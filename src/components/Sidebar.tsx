import React from 'react';
import {
    Home,
    Inbox,
    FileText,
    BarChart2,
    Clock,
    Plus,
    ChevronRight,
    ChevronLeft,
    Edit2,
    Trash2,
    Star as StarIcon,
    Layout,
    Users,
    Lock,
    Briefcase,
    Code,
    GraduationCap,
    Music,
    Heart,
    Camera,
    Globe,
    Zap,
    Cloud,
    Moon,
    Book,
    Flag,
    Target,
    Coffee,
    List as ListIcon,
    CheckSquare,
    Calendar,
    Hash,
    Folder,
    Video,
    Bot,
    Link,
    Droplet,
    Wand2,
    FileEdit,
    Disc,
    Tag,
    MoreHorizontal,
    EyeOff,
    Copy,
    Archive,
    LogOut,
    Download,
    StickyNote,
    Clipboard,
    ArrowRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import ContextMenu, { useContextMenu } from './ContextMenu';
import CreateSpaceModal from './CreateSpaceModal';
import CreateListModal from './CreateListModal';
import CreateFolderModal from './CreateFolderModal';
import MoveModal from './MoveModal';
import ShareSpaceModal from './ShareSpaceModal';
import '../styles/Sidebar.css';

const IconMap: Record<string, any> = {
    'home': Home,
    'inbox': Inbox,
    'docs': FileText,
    'dashboards': BarChart2,
    'timesheet': Clock,
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
    'calendar': Calendar,
    'hash': Hash,
    'clips': Video,
    'agents': Bot,
    'folder': Folder
};

const Sidebar: React.FC = () => {
    const {
        currentView,
        setCurrentView,
        spaces,
        folders,
        lists,
        currentSpaceId,
        setCurrentSpaceId,
        setCurrentListId,
        currentListId,
        deleteSpace,
        updateSpace,
        deleteFolder,
        updateFolder,
        deleteList,
        updateList,
        sidebarCollapsed,
        toggleSidebar,
        dashboards,
        currentDashboardId,
        setCurrentDashboardId,
        updateDashboard,
        deleteDashboard,
        leaveSpace,
        duplicateFolder,
        duplicateList,
        addDoc
    } = useAppStore();

    const [isCreateSpaceOpen, setIsCreateSpaceOpen] = React.useState(false);
    const [editingSpace, setEditingSpace] = React.useState<any>(null);
    const [editingFolder, setEditingFolder] = React.useState<any>(null);
    const [editingList, setEditingList] = React.useState<any>(null);
    const [sharingSpace, setSharingSpace] = React.useState<any>(null);
    const [renamingDashboardId, setRenamingDashboardId] = React.useState<string | null>(null);
    const [dashboardNewName, setDashboardNewName] = React.useState('');
    const [movingItem, setMovingItem] = React.useState<{ type: 'folder' | 'list', id: string, name: string, currentSpaceId: string } | null>(null);
    const [createListSpaceId, setCreateListSpaceId] = React.useState<string | null>(null);
    const [createListFolderId, setCreateListFolderId] = React.useState<string | null>(null);
    const [createFolderSpaceId, setCreateFolderSpaceId] = React.useState<string | null>(null);
    const [expandedSpaceIds, setExpandedSpaceIds] = React.useState<Set<string>>(new Set([currentSpaceId]));
    const [expandedFolderIds, setExpandedFolderIds] = React.useState<Set<string>>(new Set());
    const { showContextMenu, contextMenuProps, hideContextMenu } = useContextMenu();

    const toggleSpace = (e: React.MouseEvent, spaceId: string) => {
        e.stopPropagation();
        e.preventDefault();
        setExpandedSpaceIds(prev => {
            const next = new Set(prev);
            if (next.has(spaceId)) next.delete(spaceId);
            else next.add(spaceId);
            return next;
        });
    };

    const toggleFolder = (e: React.MouseEvent, folderId: string) => {
        e.stopPropagation();
        e.preventDefault();
        setExpandedFolderIds(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };

    const handleSpaceClick = (spaceId: string) => {
        setCurrentSpaceId(spaceId);
        setCurrentListId(null);
        setExpandedSpaceIds(prev => new Set(prev).add(spaceId));
        setCurrentView('space_overview');
    };

    const navItems = [
        { id: 'home', icon: Home, label: 'Home' },
        { id: 'inbox', icon: Inbox, label: 'Inbox' },
        { id: 'dashboards', icon: BarChart2, label: 'Dashboards' },
        { id: 'docs', icon: FileText, label: 'Docs' },
        { id: 'clips', icon: Video, label: 'Clips' },
        { id: 'timesheet', icon: Clock, label: 'Timesheets' },
        { id: 'agents', icon: Bot, label: 'Agents' },
    ];

    const renderIcon = (iconName: string, size = 18, color?: string) => {
        const IconComponent = IconMap[iconName] || StarIcon;
        return <IconComponent size={size} color={color} />;
    };

    const handleDragStart = (e: React.DragEvent, type: 'folder' | 'list', id: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/json', JSON.stringify({ type, id }));
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e: React.DragEvent, targetType: 'space' | 'folder', targetId: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json'));
            if (!data || !data.type || !data.id) return;

            const { type, id } = data;

            // Prevent dropping on itself
            if (id === targetId && type === targetType) return;

            if (type === 'list') {
                if (targetType === 'space') {
                    updateList(id, { spaceId: targetId, folderId: undefined });
                } else if (targetType === 'folder') {
                    const targetFolder = folders.find(f => f.id === targetId);
                    if (targetFolder) {
                        updateList(id, { spaceId: targetFolder.spaceId, folderId: targetId });
                    }
                }
            } else if (type === 'folder') {
                if (targetType === 'space') {
                    updateFolder(id, { spaceId: targetId });
                }
            }
        } catch (err) {
            console.error('Drop failed', err);
        }
    };

    return (
        <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <div className="workspace-selector">
                <div className="workspace-info">
                    <div className="workspace-avatar">M</div>
                    {!sidebarCollapsed && <span>My Workspace</span>}
                </div>
                <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
                    {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className="main-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const currentDash = dashboards.find(d => d.id === currentDashboardId);
                    const isGlobalDashboard = item.id === 'dashboards' &&
                        currentView === 'dashboards' &&
                        (!currentDashboardId || (!currentDash?.spaceId && !currentDash?.listId));

                    const isActive = item.id === 'dashboards' ? isGlobalDashboard : currentView === item.id;

                    return (
                        <a
                            key={item.id}
                            href="#"
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                setCurrentView(item.id as any);
                                if (item.id === 'dashboards') {
                                    setCurrentDashboardId(null);
                                }
                            }}
                        >
                            <Icon size={18} />
                            {!sidebarCollapsed && <span>{item.label}</span>}
                        </a>
                    );
                })}
            </nav>

            <div className="sidebar-section">
                <div className="section-header">
                    {!sidebarCollapsed && <span>SPACES</span>}
                    <button className="add-btn" onClick={() => setIsCreateSpaceOpen(true)}><Plus size={14} /></button>
                </div>
                <div className="spaces-list">
                    <a
                        href="#"
                        className={`nav-item space-item ${currentSpaceId === 'everything' ? 'active' : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            setCurrentSpaceId('everything');
                            setCurrentView('space_overview');
                            setCurrentListId(null);
                        }}
                    >
                        <div className="expand-icon-wrapper invisible">
                            <ChevronRight size={14} />
                        </div>
                        <div className="space-icon star-icon">
                            <StarIcon size={14} />
                        </div>
                        {!sidebarCollapsed && <span>Everything</span>}
                    </a>

                    {spaces.map(space => {
                        const isExpanded = expandedSpaceIds.has(space.id);
                        return (
                            <div key={space.id} className="space-item-container">
                                <div
                                    className={`nav-item space-item ${currentSpaceId === space.id ? 'active' : ''}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleSpaceClick(space.id);
                                    }}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, 'space', space.id)}
                                    onContextMenu={(e) => showContextMenu(e, [
                                        { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => setEditingSpace(space) },
                                        { label: 'Copy link', icon: <Link size={14} />, onClick: () => console.log('Copy link') },
                                        { divider: true, label: '', onClick: () => { } },
                                        {
                                            label: 'Create new',
                                            icon: <Plus size={14} />,
                                            subItems: [
                                                { label: 'List', icon: <ListIcon size={14} />, onClick: () => setCreateListSpaceId(space.id) },
                                                { label: 'Doc', icon: <FileText size={14} />, onClick: () => console.log('Create Doc') },
                                                { label: 'Form', icon: <Clipboard size={14} />, onClick: () => console.log('Create Form') },
                                                { label: 'Dashboard', icon: <BarChart2 size={14} />, onClick: () => { setCreateListSpaceId(space.id); /* TODO: specific dashboard creation */ } },
                                                { label: 'Whiteboard', icon: <StickyNote size={14} />, onClick: () => console.log('Create Whiteboard') },
                                                { divider: true, label: '', onClick: () => { } },
                                                { label: 'Folder', icon: <Folder size={14} />, onClick: () => setCreateFolderSpaceId(space.id) },
                                                { divider: true, label: '', onClick: () => { } },
                                                { label: 'From template', icon: <Wand2 size={14} />, onClick: () => console.log('From Template') },
                                                { label: 'Import', icon: <Download size={14} />, onClick: () => console.log('Import') },
                                            ]
                                        },
                                        { label: 'Color & Icon', icon: <Droplet size={14} />, onClick: () => setEditingSpace(space) },
                                        { label: 'Templates', icon: <Wand2 size={14} />, onClick: () => { } },
                                        { label: 'Automations', icon: <Zap size={14} />, onClick: () => { } },
                                        { label: 'Custom Fields', icon: <FileEdit size={14} />, onClick: () => { } },
                                        { label: 'Task statuses', icon: <Disc size={14} />, onClick: () => { } },
                                        { label: 'Tags', icon: <Tag size={14} />, onClick: () => { } },
                                        { label: 'More', icon: <MoreHorizontal size={14} />, onClick: () => { } },
                                        { divider: true, label: '', onClick: () => { } },
                                        { label: 'Add to Favorites', icon: <StarIcon size={14} />, onClick: () => { } },
                                        { label: 'Hide Space', icon: <EyeOff size={14} />, onClick: () => { } },
                                        { divider: true, label: '', onClick: () => { } },
                                        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => { } },
                                        { label: 'Archive', icon: <Archive size={14} />, onClick: () => { } },
                                        {
                                            label: space.isShared ? 'Leave Space' : 'Delete',
                                            icon: space.isShared ? <LogOut size={14} /> : <Trash2 size={14} />,
                                            onClick: () => space.isShared ? leaveSpace(space.id) : deleteSpace(space.id),
                                            danger: true
                                        },
                                        {
                                            label: 'Sharing & Permissions',
                                            icon: null,
                                            onClick: () => setSharingSpace(space),
                                            className: 'context-menu-share-btn'
                                        },
                                    ])}
                                >
                                    <div
                                        className="expand-icon-wrapper"
                                        onClick={(e) => toggleSpace(e, space.id)}
                                    >
                                        <ChevronRight size={14} className={`expand-icon ${isExpanded ? 'expanded' : ''}`} />
                                    </div>
                                    <div className="space-icon" style={{
                                        color: space.color || '#64748b',
                                        background: `${space.color || '#64748b'}20`
                                    }}>
                                        {renderIcon(space.icon || 'star', 14, space.color || '#64748b')}
                                    </div>
                                    {!sidebarCollapsed && <span className="space-name">{space.name}</span>}
                                </div>

                                {isExpanded && !sidebarCollapsed && (
                                    <div className="space-children">
                                        {folders.filter(f => f.spaceId === space.id && !f.isArchived).map(folder => {
                                            const isFolderExpanded = expandedFolderIds.has(folder.id);
                                            return (
                                                <div key={folder.id} className="folder-container">
                                                    <div
                                                        className="nav-item folder-item"
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={handleDragOver}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, 'folder', folder.id)}
                                                        onClick={(e) => toggleFolder(e, folder.id)}
                                                        onContextMenu={(e) => showContextMenu(e, [
                                                            { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => setEditingFolder(folder) },
                                                            { label: 'Copy link', icon: <Link size={14} />, onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/folder/${folder.id}`); } },
                                                            { divider: true, label: '', onClick: () => { } },
                                                            {
                                                                label: 'Create new',
                                                                icon: <Plus size={14} />,
                                                                subItems: [
                                                                    { label: 'List', icon: <ListIcon size={14} />, onClick: () => { setCreateListSpaceId(space.id); setCreateListFolderId(folder.id); } },
                                                                    {
                                                                        label: 'Doc',
                                                                        icon: <FileText size={14} />,
                                                                        onClick: () => {
                                                                            addDoc({
                                                                                name: 'New Doc',
                                                                                content: '',
                                                                                userId: 'user', // Default
                                                                                userName: 'User',
                                                                                spaceId: space.id
                                                                            });
                                                                            setCurrentView('docs');
                                                                            // Ideally navigate to doc
                                                                        }
                                                                    },
                                                                    { label: 'Form', icon: <Clipboard size={14} />, onClick: () => alert('Forms coming soon!') },
                                                                    { label: 'Whiteboard', icon: <StickyNote size={14} />, onClick: () => alert('Whiteboards coming soon!') },
                                                                ]
                                                            },
                                                            {
                                                                label: 'Color & Icon',
                                                                icon: <Droplet size={14} />,
                                                                onClick: () => setEditingFolder(folder)
                                                            },
                                                            { label: 'Templates', icon: <Wand2 size={14} />, onClick: () => { } },
                                                            { label: 'Automations', icon: <Zap size={14} />, onClick: () => { } },
                                                            { label: 'Custom Fields', icon: <FileEdit size={14} />, onClick: () => { } },
                                                            { label: 'Task statuses', icon: <Disc size={14} />, onClick: () => { } },
                                                            { label: 'More', icon: <MoreHorizontal size={14} />, onClick: () => { } },
                                                            { divider: true, label: '', onClick: () => { } },
                                                            { label: 'Add to Favorites', icon: <StarIcon size={14} />, onClick: () => { } },
                                                            { divider: true, label: '', onClick: () => { } },
                                                            { label: 'Move', icon: <ArrowRight size={14} />, onClick: () => setMovingItem({ type: 'folder', id: folder.id, name: folder.name, currentSpaceId: folder.spaceId }) },
                                                            { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateFolder(folder.id) },
                                                            { label: 'Archive', icon: <Archive size={14} />, onClick: () => updateFolder(folder.id, { isArchived: true }) },
                                                            { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteFolder(folder.id), danger: true },
                                                            { divider: true, label: '', onClick: () => { } },
                                                            {
                                                                label: 'Sharing & Permissions',
                                                                icon: null,
                                                                onClick: () => alert('Sharing settings coming soon'),
                                                                className: 'context-menu-share-btn'
                                                            },
                                                        ])}
                                                    >
                                                        <div className="expand-icon-wrapper">
                                                            <ChevronRight size={14} className={`expand-icon ${isFolderExpanded ? 'expanded' : ''}`} />
                                                        </div>
                                                        <div className="folder-icon-wrapper" style={{ marginRight: '8px' }}>
                                                            {renderIcon(folder.icon || 'folder', 14, folder.color)}
                                                        </div>
                                                        <span style={{ color: folder.color }}>{folder.name}</span>
                                                    </div>
                                                    {isFolderExpanded && (
                                                        <div className="folder-children">
                                                            {lists.filter(l => l.folderId === folder.id && !l.isArchived).map(list => (
                                                                <React.Fragment key={list.id}>
                                                                    <a
                                                                        href="#"
                                                                        className={`nav-item list-item ${currentListId === list.id ? 'active' : ''}`}
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, 'list', list.id)}
                                                                        onDragEnd={handleDragEnd}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            setCurrentSpaceId(space.id);
                                                                            setCurrentListId(list.id);
                                                                            if (!['list', 'kanban', 'calendar', 'gantt'].includes(currentView)) {
                                                                                setCurrentView('list');
                                                                            }
                                                                        }}
                                                                        onContextMenu={(e) => showContextMenu(e, [
                                                                            { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => setEditingList({ ...list, id: list.id, spaceId: space.id }) },
                                                                            { label: 'Copy link', icon: <Link size={14} />, onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/list/${list.id}`); } },
                                                                            { divider: true, label: '', onClick: () => { } },
                                                                            {
                                                                                label: 'Create new',
                                                                                icon: <Plus size={14} />,
                                                                                subItems: [
                                                                                    { label: 'Task', icon: <CheckSquare size={14} />, onClick: () => console.log('Create Task') },
                                                                                    { label: 'Doc', icon: <FileText size={14} />, onClick: () => console.log('Create Doc') },
                                                                                ]
                                                                            },
                                                                            {
                                                                                label: 'Color & Icon',
                                                                                icon: <Droplet size={14} />,
                                                                                onClick: () => setEditingList({ ...list, id: list.id, spaceId: space.id })
                                                                            },
                                                                            { label: 'Templates', icon: <Wand2 size={14} />, onClick: () => { } },
                                                                            { label: 'Automations', icon: <Zap size={14} />, onClick: () => { } },
                                                                            { label: 'Custom Fields', icon: <FileEdit size={14} />, onClick: () => { } },
                                                                            { label: 'Task statuses', icon: <Disc size={14} />, onClick: () => { } },
                                                                            { label: 'More', icon: <MoreHorizontal size={14} />, onClick: () => { } },
                                                                            { divider: true, label: '', onClick: () => { } },
                                                                            { label: 'Add to Favorites', icon: <StarIcon size={14} />, onClick: () => { } },
                                                                            { divider: true, label: '', onClick: () => { } },
                                                                            { label: 'Move', icon: <ArrowRight size={14} />, onClick: () => setMovingItem({ type: 'list', id: list.id, name: list.name, currentSpaceId: list.spaceId }) },
                                                                            { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateList(list.id) },
                                                                            { label: 'Archive', icon: <Archive size={14} />, onClick: () => updateList(list.id, { isArchived: true }) },
                                                                            { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteList(list.id), danger: true },
                                                                            { divider: true, label: '', onClick: () => { } },
                                                                            {
                                                                                label: 'Sharing & Permissions',
                                                                                icon: null,
                                                                                onClick: () => alert('Sharing settings coming soon'),
                                                                                className: 'context-menu-share-btn'
                                                                            },
                                                                        ])}
                                                                    >
                                                                        <div className="list-icon-wrapper">
                                                                            {list.icon ? renderIcon(list.icon, 14, list.color || space.color || undefined) : (
                                                                                <div className="list-dot" style={{ backgroundColor: list.color || space.color || '#64748b' }}></div>
                                                                            )}
                                                                        </div>
                                                                        <span>{list.name}</span>
                                                                    </a>
                                                                    {dashboards.filter(d => d.listId === list.id).map(dash => (
                                                                        <a
                                                                            key={dash.id}
                                                                            href="#"
                                                                            className={`nav-item dashboard-sub-item ${currentDashboardId === dash.id ? 'active' : ''}`}
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                setCurrentSpaceId(space.id);
                                                                                setCurrentListId(list.id);
                                                                                setCurrentDashboardId(dash.id);
                                                                                setCurrentView('dashboards');
                                                                            }}
                                                                            onContextMenu={(e) => showContextMenu(e, [
                                                                                { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => { setRenamingDashboardId(dash.id); setDashboardNewName(dash.name); } },
                                                                                { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteDashboard(dash.id), danger: true },
                                                                            ])}
                                                                        >
                                                                            <div className="list-icon-wrapper" style={{ paddingLeft: '12px' }}>
                                                                                <BarChart2 size={12} />
                                                                            </div>
                                                                            {renamingDashboardId === dash.id ? (
                                                                                <input
                                                                                    type="text"
                                                                                    value={dashboardNewName}
                                                                                    onChange={(e) => setDashboardNewName(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') {
                                                                                            updateDashboard(dash.id, { name: dashboardNewName });
                                                                                            setRenamingDashboardId(null);
                                                                                        }
                                                                                        if (e.key === 'Escape') setRenamingDashboardId(null);
                                                                                        e.stopPropagation();
                                                                                    }}
                                                                                    onBlur={() => {
                                                                                        if (dashboardNewName.trim()) {
                                                                                            updateDashboard(dash.id, { name: dashboardNewName });
                                                                                        }
                                                                                        setRenamingDashboardId(null);
                                                                                    }}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                    autoFocus
                                                                                    className="sidebar-rename-input"
                                                                                />
                                                                            ) : (
                                                                                <span>{dash.name}</span>
                                                                            )}
                                                                        </a>
                                                                    ))}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {lists.filter(l => l.spaceId === space.id && !l.folderId).map(list => (
                                            <React.Fragment key={list.id}>
                                                <a
                                                    href="#"
                                                    className={`nav-item list-item ${currentListId === list.id ? 'active' : ''}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, 'list', list.id)}
                                                    onDragEnd={handleDragEnd}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCurrentSpaceId(space.id); // Ensure correct space is active
                                                        setCurrentListId(list.id);
                                                        if (!['list', 'kanban', 'calendar', 'gantt'].includes(currentView)) {
                                                            setCurrentView('list');
                                                        }
                                                    }}
                                                    onContextMenu={(e) => showContextMenu(e, [
                                                        { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => setEditingList({ ...list, id: list.id, spaceId: space.id }) },
                                                        { label: 'Copy link', icon: <Link size={14} />, onClick: () => { navigator.clipboard.writeText(`${window.location.origin}/list/${list.id}`); } },
                                                        { divider: true, label: '', onClick: () => { } },
                                                        {
                                                            label: 'Create new',
                                                            icon: <Plus size={14} />,
                                                            subItems: [
                                                                { label: 'Task', icon: <CheckSquare size={14} />, onClick: () => console.log('Create Task') },
                                                                { label: 'Doc', icon: <FileText size={14} />, onClick: () => console.log('Create Doc') },
                                                            ]
                                                        },
                                                        {
                                                            label: 'Color & Icon',
                                                            icon: <Droplet size={14} />,
                                                            onClick: () => setEditingList({ ...list, id: list.id, spaceId: space.id })
                                                        },
                                                        { label: 'Templates', icon: <Wand2 size={14} />, onClick: () => { } },
                                                        { label: 'Automations', icon: <Zap size={14} />, onClick: () => { } },
                                                        { label: 'Custom Fields', icon: <FileEdit size={14} />, onClick: () => { } },
                                                        { label: 'Task statuses', icon: <Disc size={14} />, onClick: () => { } },
                                                        { label: 'More', icon: <MoreHorizontal size={14} />, onClick: () => { } },
                                                        { divider: true, label: '', onClick: () => { } },
                                                        { label: 'Add to Favorites', icon: <StarIcon size={14} />, onClick: () => { } },
                                                        { divider: true, label: '', onClick: () => { } },
                                                        { label: 'Move', icon: <ArrowRight size={14} />, onClick: () => setMovingItem({ type: 'list', id: list.id, name: list.name, currentSpaceId: list.spaceId }) },
                                                        { label: 'Duplicate', icon: <Copy size={14} />, onClick: () => duplicateList(list.id) },
                                                        { label: 'Archive', icon: <Archive size={14} />, onClick: () => updateList(list.id, { isArchived: true }) },
                                                        { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteList(list.id), danger: true },
                                                        { divider: true, label: '', onClick: () => { } },
                                                        {
                                                            label: 'Sharing & Permissions',
                                                            icon: null,
                                                            onClick: () => alert('Sharing settings coming soon'),
                                                            className: 'context-menu-share-btn'
                                                        },
                                                    ])}
                                                >
                                                    <div className="list-icon-wrapper">
                                                        {list.icon ? renderIcon(list.icon, 14, list.color || space.color || undefined) : <ListIcon size={14} color={list.color || space.color || undefined} />}
                                                    </div>
                                                    <span>{list.name}</span>
                                                </a>
                                                {dashboards.filter(d => d.listId === list.id).map(dash => (
                                                    <a
                                                        key={dash.id}
                                                        href="#"
                                                        className={`nav-item dashboard-sub-item ${currentDashboardId === dash.id ? 'active' : ''}`}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setCurrentSpaceId(space.id);
                                                            setCurrentListId(list.id);
                                                            setCurrentDashboardId(dash.id);
                                                            setCurrentView('dashboards');
                                                        }}
                                                        onContextMenu={(e) => showContextMenu(e, [
                                                            { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => { setRenamingDashboardId(dash.id); setDashboardNewName(dash.name); } },
                                                            { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteDashboard(dash.id), danger: true },
                                                        ])}
                                                    >
                                                        <div className="list-icon-wrapper" style={{ paddingLeft: '12px' }}>
                                                            <BarChart2 size={12} />
                                                        </div>
                                                        {renamingDashboardId === dash.id ? (
                                                            <input
                                                                type="text"
                                                                value={dashboardNewName}
                                                                onChange={(e) => setDashboardNewName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        updateDashboard(dash.id, { name: dashboardNewName });
                                                                        setRenamingDashboardId(null);
                                                                    }
                                                                    if (e.key === 'Escape') setRenamingDashboardId(null);
                                                                    e.stopPropagation();
                                                                }}
                                                                onBlur={() => {
                                                                    if (dashboardNewName.trim()) {
                                                                        updateDashboard(dash.id, { name: dashboardNewName });
                                                                    }
                                                                    setRenamingDashboardId(null);
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                                autoFocus
                                                                className="sidebar-rename-input"
                                                            />
                                                        ) : (
                                                            <span>{dash.name}</span>
                                                        )}
                                                    </a>
                                                ))}
                                            </React.Fragment>
                                        ))}

                                        {dashboards.filter(d => d.spaceId === space.id && !d.listId).map(dash => (
                                            <a
                                                key={dash.id}
                                                href="#"
                                                className={`nav-item dashboard-sub-item ${currentDashboardId === dash.id ? 'active' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentSpaceId(space.id);
                                                    setCurrentListId(null);
                                                    setCurrentDashboardId(dash.id);
                                                    setCurrentView('dashboards');
                                                }}
                                                onContextMenu={(e) => showContextMenu(e, [
                                                    { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => { setRenamingDashboardId(dash.id); setDashboardNewName(dash.name); } },
                                                    { label: 'Delete', icon: <Trash2 size={14} />, onClick: () => deleteDashboard(dash.id), danger: true },
                                                ])}
                                            >
                                                <div className="list-icon-wrapper">
                                                    <BarChart2 size={14} />
                                                </div>
                                                {renamingDashboardId === dash.id ? (
                                                    <input
                                                        type="text"
                                                        value={dashboardNewName}
                                                        onChange={(e) => setDashboardNewName(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                updateDashboard(dash.id, { name: dashboardNewName });
                                                                setRenamingDashboardId(null);
                                                            }
                                                            if (e.key === 'Escape') setRenamingDashboardId(null);
                                                            e.stopPropagation();
                                                        }}
                                                        onBlur={() => {
                                                            if (dashboardNewName.trim()) {
                                                                updateDashboard(dash.id, { name: dashboardNewName });
                                                            }
                                                            setRenamingDashboardId(null);
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                        className="sidebar-rename-input"
                                                    />
                                                ) : (
                                                    <span>{dash.name}</span>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {!sidebarCollapsed && (
                    <a href="#" className="nav-item create-space-btn" onClick={(e) => { e.preventDefault(); setIsCreateSpaceOpen(true); }}>
                        <Plus size={14} />
                        <span>New Space</span>
                    </a>
                )}
            </div>

            {isCreateSpaceOpen && <CreateSpaceModal onClose={() => setIsCreateSpaceOpen(false)} />}

            {movingItem && (
                <MoveModal
                    item={movingItem}
                    onClose={() => setMovingItem(null)}
                />
            )}

            {editingSpace && (
                <CreateSpaceModal
                    editingSpace={editingSpace}
                    onUpdate={updateSpace}
                    onClose={() => setEditingSpace(null)}
                />
            )}
            {editingList && (
                <CreateListModal
                    spaceId={editingList.spaceId}
                    editingList={editingList}
                    onUpdate={updateList}
                    onClose={() => setEditingList(null)}
                />
            )}
            {createListSpaceId && (
                <CreateListModal
                    spaceId={createListSpaceId}
                    folderId={createListFolderId || undefined}
                    onClose={() => { setCreateListSpaceId(null); setCreateListFolderId(null); }}
                />
            )}
            {createFolderSpaceId && (
                <CreateFolderModal
                    spaceId={createFolderSpaceId}
                    onClose={() => setCreateFolderSpaceId(null)}
                />
            )}
            {editingFolder && (
                <CreateFolderModal
                    spaceId={editingFolder.spaceId}
                    editingFolder={editingFolder}
                    onUpdate={updateFolder}
                    onClose={() => setEditingFolder(null)}
                />
            )}
            {sharingSpace && (
                <ShareSpaceModal
                    spaceId={sharingSpace.id}
                    spaceName={sharingSpace.name}
                    onClose={() => setSharingSpace(null)}
                />
            )}
            {contextMenuProps.visible && (
                <ContextMenu
                    x={contextMenuProps.x}
                    y={contextMenuProps.y}
                    items={contextMenuProps.items}
                    onClose={hideContextMenu}
                />
            )}
        </aside>
    );
};

export default Sidebar;
