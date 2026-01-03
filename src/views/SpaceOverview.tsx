import React, { useState } from 'react';
import { useAppStore, DEFAULT_STATUSES } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import {
    FileText,
    Bookmark,
    Folder,
    Plus,
    Filter,
    Clock,
    RefreshCw,
    MoreHorizontal,
    List as ListIcon,
    Layout
} from 'lucide-react';
import '../styles/SpaceOverview.css';
import CreateListModal from '../components/CreateListModal';
import CreateFolderModal from '../components/CreateFolderModal';
import AddBookmarkModal from '../components/AddBookmarkModal';
import CreateDocModal from '../components/CreateDocModal';
import { format } from 'date-fns';

const SpaceOverview: React.FC = () => {
    const { spaces, lists, tasks, folders, docs, currentSpaceId, setCurrentListId, setCurrentView } = useAppStore();
    const { user: currentUser } = useAuthStore();
    const [isCreateListOpen, setIsCreateListOpen] = useState(false);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false);
    const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);

    const isEverything = currentSpaceId === 'everything';
    const currentSpace = spaces.find(s => s.id === currentSpaceId) || (isEverything ? {
        id: 'everything',
        name: 'Everything',
        icon: 'star',
        color: '#3b82f6',
        statuses: DEFAULT_STATUSES,
        isDefault: true,
        taskCount: tasks.length
    } : null);

    const spaceLists = isEverything ? lists : lists.filter(l => l.spaceId === currentSpaceId);
    const spaceFolders = isEverything ? folders : folders.filter(f => f.spaceId === currentSpaceId);
    const spaceDocs = isEverything ? docs : docs.filter(d => d.spaceId === currentSpaceId);

    // Calculate Workload by Status
    const spaceTasks = isEverything ? tasks : tasks.filter(t => t.spaceId === currentSpaceId);
    const statusCounts = spaceTasks.reduce((acc, task) => {
        const status = task.status || 'TO DO';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const totalTasks = spaceTasks.length;

    // Simple color map for statuses
    const statusColors: Record<string, string> = {
        'TO DO': '#87909e',
        'IN PROGRESS': '#3b82f6',
        'COMPLETED': '#10b981',
        'CLOSED': '#10b981',
        'BACKLOG': '#64748b',
        'UPDATE REQUIRED': '#f59e0b'
    };

    // Calculate Pie Chart Segments
    let currentAngle = 0;
    const segments = Object.entries(statusCounts).map(([status, count]) => {
        const percentage = (count / totalTasks) * 100;
        const angle = (count / totalTasks) * 360;
        const start = currentAngle;
        currentAngle += angle;
        // console.log(status, count, percentage, angle, start);
        return {
            status,
            count,
            percentage,
            color: statusColors[status] || '#cbd5e1',
            pathData: describeArc(100, 100, 80, start, start + angle)
        };
    });

    // Helper for SVG Arc
    function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        const d = [
            "M", start.x, start.y,
            "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            "L", x, y
        ].join(" ");
        return d;
    }

    const handleListClick = (listId: string) => {
        setCurrentListId(listId);
        setCurrentView('list');
    };

    if (!currentSpace) return <div>Space not found</div>;

    return (
        <div className="space-overview">
            {/* Header */}
            <div className="overview-header">
                <button className="btn-configure" style={{ border: '1px solid var(--border)', background: 'white' }}>
                    <Filter size={14} /> Filters
                </button>
                <div className="header-controls">
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Hide</span>
                    <div className="refresh-info">
                        <RefreshCw size={12} /> Refreshed: just now
                    </div>
                    <div className="auto-refresh-badge">
                        <Clock size={12} style={{ marginRight: 4 }} /> Auto refresh: On
                    </div>
                </div>
            </div>

            <div className="widgets-grid">
                {/* Recent Widget */}
                <div className="overview-card">
                    <div className="card-header">Recent</div>
                    <div className="card-content">
                        {spaceLists.length > 0 ? (
                            spaceLists.slice(0, 3).map(list => (
                                <div key={list.id} className="recent-list-item" onClick={() => handleListClick(list.id)} style={{ cursor: 'pointer' }}>
                                    <ListIcon size={16} className="recent-list-icon" />
                                    <span style={{ fontWeight: 500 }}>{list.name}</span>
                                    <span className="recent-list-location">in {spaces.find(s => s.id === list.spaceId)?.name || 'Unknown Space'}</span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-text">No recent lists</div>
                        )}
                        {/* Mock Timeline Item - Keeping mock for UI consistency if empty */}
                        {spaceLists.length > 0 && (
                            <div className="recent-list-item">
                                <Layout size={16} className="recent-list-icon" />
                                <span style={{ fontWeight: 500 }}>TIMELINE {currentSpace.name}</span>
                                <span className="recent-list-location">in {currentSpace.name}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Docs Widget */}
                <div className="overview-card">
                    <div className="card-header">Docs</div>
                    {spaceDocs.length > 0 ? (
                        <div className="card-content" style={{ gap: '8px' }}>
                            {spaceDocs.map(doc => (
                                <div key={doc.id} className="recent-list-item" style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
                                    <FileText size={16} className="recent-list-icon" />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 500 }}>{doc.name}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Updated {format(new Date(doc.updatedAt), 'MMM d')}</span>
                                    </div>
                                </div>
                            ))}
                            <button className="btn-card-action" style={{ marginTop: 'auto', alignSelf: 'flex-start' }} onClick={() => setIsCreateDocOpen(true)}>Add a Doc</button>
                        </div>
                    ) : (
                        <div className="empty-card-state">
                            <div className="empty-icon">
                                <FileText size={48} strokeWidth={1} />
                            </div>
                            <div className="empty-text">There are no Docs in this location yet.</div>
                            <button className="btn-card-action" onClick={() => setIsCreateDocOpen(true)}>Add a Doc</button>
                        </div>
                    )}
                </div>

                {/* Bookmarks Widget */}
                <div className="overview-card">
                    <div className="card-header">Bookmarks</div>
                    <div className="empty-card-state">
                        <div className="empty-icon">
                            <Bookmark size={48} strokeWidth={1} />
                        </div>
                        <div className="empty-text">Bookmarks make it easy to save ClickUp items or any URL from around the web.</div>
                        <button className="btn-card-action" onClick={() => setIsAddBookmarkOpen(true)}>Add Bookmark</button>
                    </div>
                </div>

                {/* Folders Widget */}
                <div className="overview-card full-width-section" style={{ gridColumn: 'span 3', minHeight: '200px' }}>
                    <div className="card-header">Folders</div>
                    {spaceFolders.length > 0 ? (
                        <div className="card-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {spaceFolders.map(folder => {
                                const folderListsCount = lists.filter(l => l.folderId === folder.id).length;
                                return (
                                    <div key={folder.id} style={{
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        padding: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        background: 'var(--bg-side)'
                                    }}>
                                        <Folder size={24} style={{ color: '#64748b' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{folder.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{folderListsCount} Lists</div>
                                        </div>
                                    </div>
                                );
                            })}
                            <button className="btn-card-action" onClick={() => setIsCreateFolderOpen(true)} style={{ height: 'fit-content', alignSelf: 'center' }}>
                                <Plus size={14} style={{ marginRight: '4px' }} /> Add Folder
                            </button>
                        </div>
                    ) : (
                        <div className="empty-card-state">
                            <div className="empty-icon">
                                <Folder size={48} strokeWidth={1} />
                            </div>
                            <div className="empty-text">Add new Folder to your Space</div>
                            <button className="btn-card-action" onClick={() => setIsCreateFolderOpen(true)}>Add Folder</button>
                        </div>
                    )}
                </div>

                {/* Lists Widget (Table) */}
                <div className="overview-card lists-table-card">
                    <div className="card-header">
                        Lists
                        <Plus size={16} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={() => setIsCreateListOpen(true)} />
                    </div>
                    <div className="card-content">
                        <table className="lists-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Color</th>
                                    <th>Progress</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Priority</th>
                                    <th>Owner</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {spaceLists.map(list => {
                                    const listTasks = tasks.filter(t => t.listId === list.id);
                                    const completed = listTasks.filter(t => t.status === 'COMPLETED' || t.status === 'CLOSED').length;
                                    const total = listTasks.length;
                                    const progress = total > 0 ? (completed / total) * 100 : 0;
                                    let endDate = '-';
                                    if (total > 0) {
                                        // find max due date
                                        const dueDates = listTasks.map(t => t.dueDate ? new Date(t.dueDate).getTime() : 0).filter(d => d > 0);
                                        if (dueDates.length > 0) {
                                            endDate = format(new Date(Math.max(...dueDates)), 'MMM d');
                                        }
                                    }

                                    return (
                                        <tr key={list.id} onClick={() => handleListClick(list.id)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ListIcon size={14} color="var(--text-secondary)" />
                                                    {list.name}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: list.color || '#64748b' }}></div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="list-progress-bar">
                                                        <div className="list-progress-fill" style={{ width: `${progress}%`, backgroundColor: list.color || 'var(--primary)' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{completed}/{total}</span>
                                                </div>
                                            </td>
                                            <td><div style={{ color: 'var(--text-secondary)' }}>-</div></td>
                                            <td><div style={{ color: 'var(--text-secondary)' }}>{endDate}</div></td>
                                            <td>
                                                <div style={{ color: 'var(--text-secondary)' }}><Filter size={14} /></div>
                                            </td>
                                            <td>
                                                {(() => {
                                                    const listSpace = spaces.find(s => s.id === list.spaceId);
                                                    const isOwner = listSpace?.ownerId === currentUser?.id || !listSpace?.ownerId;
                                                    const ownerName = listSpace?.ownerName || (isOwner ? (currentUser?.name || 'Me') : 'Workspace Owner');
                                                    return (
                                                        <div
                                                            className="owner-badge-xs"
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: isOwner ? 'var(--primary)' : '#e2e8f0',
                                                                color: isOwner ? 'white' : 'var(--text-main)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '10px',
                                                                fontWeight: 700
                                                            }}
                                                            title={ownerName}
                                                        >
                                                            {ownerName[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td><Plus size={14} color="var(--text-secondary)" /></td>
                                        </tr>
                                    );
                                })}
                                <tr className="add-list-row" style={{ cursor: 'pointer' }} onClick={() => setIsCreateListOpen(true)}>
                                    <td colSpan={8} style={{ color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Plus size={14} /> New List
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Resources */}
                <div className="overview-card" style={{ gridColumn: 'span 1' }}>
                    <div className="card-header">
                        Resources
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <Layout size={14} />
                            <Plus size={14} />
                            <MoreHorizontal size={14} />
                        </div>
                    </div>
                    <div className="card-content">
                        <div className="drop-zone">
                            <div style={{ textAlign: 'center' }}>
                                <div>Drop files here or <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>attach</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workload by Status */}
                <div className="overview-card" style={{ gridColumn: 'span 2' }}>
                    <div className="card-header">Workload by Status</div>
                    <div className="card-content" style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {totalTasks === 0 ? (
                            <div className="empty-text" style={{ flex: 1, textAlign: 'center' }}>No tasks in this space</div>
                        ) : (
                            <>
                                <div className="workload-chart-container">
                                    <svg width="200" height="200" viewBox="0 0 200 200">
                                        {segments.map((seg, i) => (
                                            <path
                                                key={i}
                                                d={seg.pathData}
                                                fill={seg.color}
                                                stroke="white"
                                                strokeWidth="2"
                                            />
                                        ))}
                                        {/* Inner Circle for donut effect if needed, user image shows pie but I can make it solid */}
                                    </svg>
                                </div>
                                <div className="pie-chart-legend">
                                    {segments.map(seg => (
                                        <div key={seg.status} className="legend-item">
                                            <div className="legend-color" style={{ backgroundColor: seg.color }}></div>
                                            <span>{seg.status}</span>
                                            <span style={{ fontWeight: 600 }}>{seg.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>

            {isCreateListOpen && currentSpace && (
                <CreateListModal
                    spaceId={currentSpace.id}
                    onClose={() => setIsCreateListOpen(false)}
                />
            )}
            {isCreateFolderOpen && currentSpace && (
                <CreateFolderModal
                    spaceId={currentSpace.id}
                    onClose={() => setIsCreateFolderOpen(false)}
                />
            )}
            {isAddBookmarkOpen && currentSpace && (
                <AddBookmarkModal
                    spaceId={currentSpace.id}
                    onClose={() => setIsAddBookmarkOpen(false)}
                />
            )}
            {isCreateDocOpen && currentSpace && (
                <CreateDocModal
                    spaceId={currentSpace.id}
                    onClose={() => setIsCreateDocOpen(false)}
                />
            )}
        </div>
    );
};

export default SpaceOverview;
