import React, { useState } from 'react';
import { Search, X, Link2, Circle, Plus, ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/TaskPicker.css';

interface TaskPickerProps {
    onSelect: (taskId: string) => void;
    onClose: () => void;
    excludeTaskId?: string;
}

const TaskPicker: React.FC<TaskPickerProps> = ({ onSelect, onClose, excludeTaskId }) => {
    const { tasks, spaces, lists, folders } = useAppStore();
    const [search, setSearch] = useState('');
    const [isBrowsing, setIsBrowsing] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [selectedSpaceId] = useState<string>(spaces[0]?.id || '');

    const filteredTasks = tasks.filter(t =>
        (excludeTaskId ? t.id !== excludeTaskId : true) &&
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const getTaskPath = (task: any) => {
        const space = spaces.find(s => s.id === task.spaceId);
        const list = lists.find(l => l.id === task.listId);
        if (space && list) return `${space.name} / ${list.name}`;
        if (space) return space.name;
        return '';
    };

    const toggleFolder = (folderId: string) => {
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) newExpanded.delete(folderId);
        else newExpanded.add(folderId);
        setExpandedFolders(newExpanded);
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes('todo')) return '#94a3b8';
        if (s.includes('progress')) return '#f59e0b';
        if (s.includes('completed') || s.includes('done')) return '#10b981';
        return '#cbd5e1';
    };

    const renderBrowseView = () => {
        const space = spaces.find(s => s.id === selectedSpaceId);
        const spaceFolders = folders.filter(f => f.spaceId === selectedSpaceId);
        const rootLists = lists.filter(l => l.spaceId === selectedSpaceId && !l.folderId);

        return (
            <div className="picker-browse-view">
                <div className="browse-breadcrumb">
                    <button onClick={() => setIsBrowsing(false)}>Recent/Search</button>
                </div>

                <div className="space-selector-section">
                    <span className="section-label-tiny">SPACE</span>
                    <div className="space-selector-header">
                        <h3>{space?.name || 'Select Space'}</h3>
                        <ChevronDown size={14} />
                    </div>
                </div>

                <div className="hierarchy-tree">
                    {spaceFolders.map(folder => (
                        <div key={folder.id} className="folder-node">
                            <div className="node-item folder-item" onClick={() => toggleFolder(folder.id)}>
                                {expandedFolders.has(folder.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <Folder size={14} fill="#94a3b8" color="#94a3b8" />
                                <span>{folder.name}</span>
                            </div>

                            {expandedFolders.has(folder.id) && (
                                <div className="node-children">
                                    {lists.filter(l => l.folderId === folder.id).map(list => (
                                        <div key={list.id} className="list-node">
                                            <div className="node-item list-item">
                                                <ChevronRight size={14} />
                                                <Circle size={8} />
                                                <span>{list.name}</span>
                                            </div>
                                            <div className="list-tasks-browse">
                                                {tasks
                                                    .filter(t => t.listId === list.id && (excludeTaskId ? t.id !== excludeTaskId : true))
                                                    .map(task => (
                                                        <div key={task.id} className="task-browse-item" onClick={() => onSelect(task.id)}>
                                                            <Circle size={14} color={getStatusColor(task.status)} />
                                                            <span className="task-name-text">{task.name}</span>
                                                            <span className="task-id-text">#{task.id.substring(0, 8)}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {rootLists.map(list => (
                        <div key={list.id} className="list-node">
                            <div className="node-item list-item">
                                <ChevronRight size={14} />
                                <Circle size={8} />
                                <span>{list.name}</span>
                            </div>
                            <div className="list-tasks-browse">
                                {tasks
                                    .filter(t => t.listId === list.id && (excludeTaskId ? t.id !== excludeTaskId : true))
                                    .map(task => (
                                        <div key={task.id} className="task-browse-item" onClick={() => onSelect(task.id)}>
                                            <Circle size={14} color={getStatusColor(task.status)} />
                                            <span className="task-name-text">{task.name}</span>
                                            <span className="task-id-text">#{task.id.substring(0, 8)}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="task-picker-popover detailed-picker">
            <div className="task-picker-header">
                <Search size={18} className="search-icon" />
                <input
                    autoFocus
                    placeholder="Search for task (or subtask) name, ID, or URL"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="header-actions">
                    <Plus size={18} className="plus-icon" />
                    <button onClick={onClose} className="close-btn"><X size={18} /></button>
                </div>
            </div>

            {isBrowsing ? renderBrowseView() : (
                <>
                    <div className="picker-meta-header">
                        <span className="section-label">Recent</span>
                        <button className="browse-btn" onClick={() => setIsBrowsing(true)}>Browse tasks</button>
                    </div>

                    <div className="task-picker-list">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="task-picker-item detailed-item"
                                    onClick={() => onSelect(task.id)}
                                >
                                    <div className="item-left">
                                        <div className="status-icon">
                                            <Circle size={14} fill={getStatusColor(task.status)} color={getStatusColor(task.status)} />
                                        </div>
                                        <div className="item-info">
                                            <span className="task-name">{task.name}</span>
                                            <div className="task-path">
                                                <Link2 size={12} />
                                                <span>{getTaskPath(task)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="item-right">
                                        {task.assignee && (
                                            <div className="assignee-avatar-xs" style={{ background: '#7c3aed' }}>
                                                {task.assignee[0]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">No tasks found</div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default TaskPicker;
