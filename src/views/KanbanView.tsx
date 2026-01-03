import React from 'react';
import { type Status } from '../types';
import AssigneeMenu from '../components/AssigneeMenu';
import {
    Plus,
    PlusCircle,
    Pencil,
    MoreHorizontal,
    MessageSquare,
    CheckSquare,
    Search,
    Filter,
    ArrowUpDown,
    ChevronRight,
    Calendar as CalendarIcon,
    X,
    Check,
    ChevronDown,
    User,
    Users,
    CircleDashed,
    Flag,
    Tag as TagIcon
} from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore, DEFAULT_STATUSES } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import type { Task, Tag } from '../types';
import TaskOptionsMenu from '../components/TaskOptionsMenu';
import ViewHeader from '../components/ViewHeader';
import '../styles/KanbanView.css';
import '../styles/TaskOptionsMenu.css';
import QuickAddSubtask from '../components/QuickAddSubtask';
import TagMenu from '../components/TagMenu';
import type { Subtask } from '../types';

interface KanbanViewProps {
    onAddTask: (status?: string) => void;
    onTaskClick: (taskId: string) => void;
}

interface ActivePopover {
    taskId: string;
    field: 'priority' | 'date' | 'tags' | 'assignees';
    element: HTMLElement;
}

interface SortableCardProps {
    task: Task;
    onTaskClick: (taskId: string) => void;
    tags: Tag[];
    onOpenMenu: (taskId: string, trigger: HTMLElement, mousePos?: { x: number, y: number }) => void;
    isMenuOpen: boolean;
    onCloseMenu: () => void;
    menuTrigger: HTMLElement | null;
    menuMousePos?: { x: number, y: number } | null;
    onDuplicate: (taskId: string) => void;
    onArchive: (taskId: string) => void;
    onDelete: (taskId: string) => void;
    onConvertToDoc: (task: Task) => void;
    isAddingSubtask: boolean;
    onStartAddSubtask: (taskId: string) => void;
    onCancelAddSubtask: () => void;
    onAddSubtask: (subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onAddTag: (tag: Omit<Tag, 'id'>) => void;
    onUpdateTag: (tagId: string, updates: Partial<Tag>) => void;
    onDeleteTag: (tagId: string) => void;
    activePopover: ActivePopover | null;
    setActivePopover: (popover: ActivePopover | null) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({
    task,
    onTaskClick,
    tags,
    onOpenMenu,
    isMenuOpen,
    onCloseMenu,
    onDuplicate,
    onArchive,
    onDelete,
    onConvertToDoc,
    isAddingSubtask,
    onStartAddSubtask,
    onCancelAddSubtask,
    onAddSubtask,
    onUpdateTask,
    onAddTag,
    onUpdateTag,
    onDeleteTag,
    activePopover,
    setActivePopover,
    menuTrigger,
    menuMousePos
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const [isExpanded, setIsExpanded] = React.useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="kanban-card"
            onClick={() => onTaskClick(task.id)}
            onContextMenu={(e) => {
                e.preventDefault();
                onOpenMenu(task.id, e.currentTarget, { x: e.clientX, y: e.clientY });
            }}
        >
            <div className="card-tags">
                {task.tags?.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                        <span
                            key={tagId}
                            className="tag-pill-kanban"
                            style={{
                                backgroundColor: `${tag.color}20`,
                                border: `1px solid ${tag.color}60`
                            }}
                            title={tag.name}
                        >
                            <TagIcon size={12} style={{ color: tag.color, fill: tag.color, fillOpacity: 0.2 }} />
                            {tag.name}
                        </span>
                    );
                })}
            </div>
            <div className="card-header">
                <h4 className="card-title">{task.name}</h4>
                <div className="card-hover-actions">
                    <button
                        className="hover-action-item"
                        onClick={(e) => { e.stopPropagation(); onStartAddSubtask(task.id); }}
                        title="Add subtask"
                    >
                        <PlusCircle size={18} />
                    </button>
                    <button
                        className="hover-action-item"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActivePopover({ taskId: task.id, field: 'tags', element: e.currentTarget });
                        }}
                        title="Edit tags"
                    >
                        <TagIcon size={18} />
                    </button>
                    <button
                        className="hover-action-item"
                        onClick={(e) => { e.stopPropagation(); onTaskClick(task.id); }}
                        title="Rename"
                    >
                        <Pencil size={18} />
                    </button>
                    <div style={{ position: 'relative', overflow: 'visible' }}>
                        <button
                            className="hover-action-item"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isMenuOpen) {
                                    onCloseMenu();
                                } else {
                                    onOpenMenu(task.id, e.currentTarget);
                                }
                            }}
                            title="More actions"
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {activePopover?.taskId === task.id && activePopover?.field === 'tags' && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100 }}>
                                <TagMenu
                                    tags={tags}
                                    selectedTagIds={task.tags || []}
                                    onToggleTag={(tagId) => {
                                        const currentTags = task.tags || [];
                                        const newTags = currentTags.includes(tagId)
                                            ? currentTags.filter(t => t !== tagId)
                                            : [...currentTags, tagId];
                                        onUpdateTask(task.id, { tags: newTags });
                                    }}
                                    onCreateTag={onAddTag}
                                    onUpdateTag={onUpdateTag}
                                    onDeleteTag={onDeleteTag}
                                    onClose={() => setActivePopover(null)}
                                    triggerElement={activePopover.element}
                                />
                            </div>
                        )}
                        {isMenuOpen && (
                            <TaskOptionsMenu
                                taskId={task.id}
                                onClose={onCloseMenu}
                                onRename={() => { onTaskClick(task.id); onCloseMenu(); }}
                                onDuplicate={() => onDuplicate(task.id)}
                                onArchive={() => onArchive(task.id)}
                                onDelete={() => onDelete(task.id)}
                                onConvertToDoc={() => onConvertToDoc(task)}
                                onStartTimer={() => { alert('Timer started for task ' + task.id); onCloseMenu(); }}
                                triggerElement={menuTrigger}
                                mousePos={menuMousePos}
                            />
                        )}
                    </div>
                </div>
            </div>
            <div className="card-meta">
                {task.dueDate && (
                    <div className="card-date">
                        <CalendarIcon size={12} />
                        {task.dueDate}
                    </div>
                )}
                <div className="card-footer">
                    <div className="card-icons">
                        <div className={`priority-icon ${task.priority ? 'has-priority' : ''}`} title={`Priority: ${task.priority || 'None'}`}>
                            <Flag size={14} className={task.priority ? `text-priority-${task.priority}` : 'text-priority-none'} />
                        </div>
                        {task.subtasks && task.subtasks.length > 0 && (
                            <span><CheckSquare size={14} /> {task.subtasks.length}</span>
                        )}
                        {task.comments && task.comments.length > 0 && (
                            <span><MessageSquare size={14} /> {task.comments.length}</span>
                        )}
                    </div>
                    <div
                        className="involved-stack"
                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActivePopover({ taskId: task.id, field: 'assignees', element: e.currentTarget });
                        }}
                    >
                        {(task.assignees && task.assignees.length > 0) ? (
                            <>
                                {task.assignees.slice(0, 2).map((name, idx) => (
                                    <div key={idx} className="assignee-avatar-xs" style={{ margin: 0, marginLeft: idx === 0 ? 0 : '-6px', border: '1.5px solid var(--bg-surface)' }}>
                                        {name[0].toUpperCase()}
                                    </div>
                                ))}
                                {task.assignees.length > 2 && (
                                    <div className="assignee-avatar-xs" style={{ marginLeft: '-6px', fontSize: '9px', background: 'var(--bg-active)', border: '1.5px solid var(--bg-surface)' }}>
                                        +{task.assignees.length - 2}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="assignee-avatar-xs dashed" style={{ margin: 0, borderStyle: 'dashed', background: 'transparent', color: 'var(--text-tertiary)' }}>
                                <Users size={12} />
                            </div>
                        )}
                    </div>
                </div>

                {activePopover?.taskId === task.id && activePopover?.field === 'assignees' && (
                    <AssigneeMenu
                        taskId={task.id}
                        spaceId={task.spaceId}
                        listId={task.listId}
                        assignees={task.assignees || []}
                        onUpdateAssignees={(newAssignees) => {
                            onUpdateTask(task.id, { assignees: newAssignees });
                        }}
                        onClose={() => setActivePopover(null)}
                        triggerElement={activePopover.element}
                    />
                )}

                {task.subtasks && task.subtasks.length > 0 && (
                    <>
                        <div
                            className="subtask-toggle-bar"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{task.subtasks.length} subtask{task.subtasks.length > 1 ? 's' : ''}</span>
                        </div>

                        {isExpanded && (
                            <div className="subtasks-list">
                                {task.subtasks.map(subtask => (
                                    <div key={subtask.id} className="subtask-card" onClick={(e) => {
                                        e.stopPropagation();
                                        onTaskClick(subtask.id);
                                    }}>
                                        <div className="subtask-header">
                                            <span className="subtask-title">{subtask.name}</span>
                                        </div>
                                        <div className="subtask-footer">
                                            <div className="subtask-option-pill">
                                                <CircleDashed size={10} className="status-spinner-icon" />
                                                <span>{subtask.status || 'TO DO'}</span>
                                            </div>

                                            <div className="subtask-option-icon" title="Assignees">
                                                <div className="involved-stack" style={{ display: 'flex', alignItems: 'center' }}>
                                                    {(subtask.assignees && subtask.assignees.length > 0) ? (
                                                        <>
                                                            {subtask.assignees.slice(0, 2).map((name, idx) => (
                                                                <div key={idx} className="assignee-avatar-xs" style={{ margin: 0, marginLeft: idx === 0 ? 0 : '-6px', border: '1.5px solid var(--bg-surface)', width: '14px', height: '14px', fontSize: '8px' }}>
                                                                    {name[0].toUpperCase()}
                                                                </div>
                                                            ))}
                                                        </>
                                                    ) : subtask.assignee ? (
                                                        <div className="assignee-avatar-xs" style={{ margin: 0, width: '14px', height: '14px', fontSize: '8px' }}>
                                                            {subtask.assignee[0].toUpperCase()}
                                                        </div>
                                                    ) : (
                                                        <User size={12} />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="subtask-option-icon" title="Due Date">
                                                <CalendarIcon size={12} />
                                                {subtask.dueDate && <span className="option-text-xs">{subtask.dueDate.substring(5, 10)}</span>}
                                            </div>

                                            <div className={`subtask-option-icon ${subtask.priority ? 'has-priority' : ''}`} title="Priority">
                                                <Flag size={12} className={subtask.priority ? `text-priority-${subtask.priority}` : ''} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            {isAddingSubtask && (
                <div onClick={e => e.stopPropagation()} style={{ marginTop: '12px', cursor: 'default' }}>
                    <QuickAddSubtask
                        onAdd={(subtask) => onAddSubtask(subtask)}
                        onCancel={onCancelAddSubtask}
                    />
                </div>
            )}
        </div>
    );
};

interface KanbanColumnProps {
    status: Task['status'];
    color: string;
    tasks: Task[];
    onAddTask: (status?: string) => void;
    onTaskClick: (taskId: string) => void;
    tags: Tag[];
    onConvertToDoc: (task: Task) => void;
    onStartAddSubtask: (taskId: string) => void;
    onCancelAddSubtask: () => void;
    onAddSubtask: (taskId: string, subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => void;
    addSubtaskTaskId: string | null;
    openMenuTaskId: string | null;
    onOpenMenu: (taskId: string, trigger: HTMLElement, mousePos?: { x: number, y: number }) => void;
    onCloseMenu: () => void;
    menuTrigger: HTMLElement | null;
    menuMousePos?: { x: number, y: number } | null;
    onDuplicate: (taskId: string) => void;
    onArchive: (taskId: string) => void;
    onDelete: (taskId: string) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    onAddTag: (tag: Omit<Tag, 'id'>) => void;
    onUpdateTag: (tagId: string, updates: Partial<Tag>) => void;
    onDeleteTag: (tagId: string) => void;
    activePopover: ActivePopover | null;
    setActivePopover: (popover: ActivePopover | null) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
    status,
    color,
    tasks,
    onAddTask,
    onTaskClick,
    tags,
    openMenuTaskId,
    onOpenMenu,
    onCloseMenu,
    menuTrigger,
    menuMousePos,
    onDuplicate,
    onArchive,
    onDelete,
    onConvertToDoc,
    addSubtaskTaskId,
    onStartAddSubtask,
    onCancelAddSubtask,
    onAddSubtask,
    onUpdateTask,
    onAddTag,
    onUpdateTag,
    onDeleteTag,
    activePopover,
    setActivePopover
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });

    return (
        <div ref={setNodeRef} className={`kanban-column ${isOver ? 'drag-over' : ''}`}>
            <div className="column-header" style={{ borderTop: `3px solid ${color}`, backgroundColor: 'var(--bg-side)', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                <div className="column-title">
                    <h3 style={{ color: color }}>{status}</h3>
                    <span className="column-count">{tasks.length}</span>
                </div>
                <div className="column-actions">
                    <button className="icon-btn-ghost" onClick={() => onAddTask(status)}><Plus size={16} /></button>
                    <button className="icon-btn-ghost"><MoreHorizontal size={16} /></button>
                </div>
            </div>
            <SortableContext
                id={status}
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="column-tasks">
                    {tasks.map(task => (
                        <SortableCard
                            key={task.id}
                            task={task}
                            onTaskClick={onTaskClick}
                            tags={tags}
                            isAddingSubtask={addSubtaskTaskId === task.id}
                            onStartAddSubtask={onStartAddSubtask}
                            onCancelAddSubtask={onCancelAddSubtask}
                            onAddSubtask={(subtask) => onAddSubtask(task.id, subtask)}
                            onUpdateTask={onUpdateTask}
                            onAddTag={onAddTag}
                            onUpdateTag={onUpdateTag}
                            onDeleteTag={onDeleteTag}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
                            onDuplicate={onDuplicate}
                            onArchive={onArchive}
                            onDelete={onDelete}
                            onConvertToDoc={onConvertToDoc}
                            onOpenMenu={onOpenMenu}
                            isMenuOpen={openMenuTaskId === task.id}
                            onCloseMenu={onCloseMenu}
                            menuTrigger={menuTrigger}
                            menuMousePos={menuMousePos}
                        />
                    ))}
                    <button className="btn-add-card" onClick={() => onAddTask(status)}>
                        <Plus size={14} /> Add Task
                    </button>
                </div>
            </SortableContext>
        </div>
    );
};

const KanbanView: React.FC<KanbanViewProps> = ({ onAddTask, onTaskClick }) => {
    const {
        tasks,
        currentSpaceId,
        currentListId,
        updateTask,
        deleteTask,
        duplicateTask,
        archiveTask,
        addDoc,
        addStatus,
        addSubtask,
        tags,
        addTag,
        updateTag,
        deleteTag,
        spaces,
        lists,
    } = useAppStore();
    const { user } = useAuthStore();
    const [activePopover, setActivePopover] = React.useState<ActivePopover | null>(null);
    const [activeId, setActiveId] = React.useState<string | null>(null);
    const [openMenuTaskId, setOpenMenuTaskId] = React.useState<string | null>(null);
    const [menuTrigger, setMenuTrigger] = React.useState<HTMLElement | null>(null);
    const [menuMousePos, setMenuMousePos] = React.useState<{ x: number, y: number } | null>(null);
    const [isAddingColumn, setIsAddingColumn] = React.useState(false);
    const [newColumnName, setNewColumnName] = React.useState('');
    const [addSubtaskTaskId, setAddSubtaskTaskId] = React.useState<string | null>(null);

    const handleOpenMenu = (taskId: string, trigger: HTMLElement, mousePos?: { x: number, y: number }) => {
        setOpenMenuTaskId(taskId);
        setMenuTrigger(trigger);
        setMenuMousePos(mousePos || null);
    };

    React.useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenuTaskId(null);
            setMenuTrigger(null);
            setMenuMousePos(null);
        };
        if (openMenuTaskId) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuTaskId]);

    const handleConvertToDoc = (task: Task) => {
        if (!task.description) {
            alert('This task has no description to convert!');
            return;
        }

        const docId = addDoc({
            name: `${task.name} - Specification`,
            content: task.description,
            userId: user?.id || 'user-1',
            userName: user?.name || 'Jundee',
            spaceId: task.spaceId
        });

        updateTask(task.id, { linkedDocId: docId });
        alert('Converted to Doc successfully!');
        setOpenMenuTaskId(null);
    };

    const activeList = lists.find(l => l.id === currentListId);
    const activeSpace = spaces.find(s => s.id === currentSpaceId);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const filteredTasks = tasks.filter(task => {
        const matchesSpace = currentSpaceId === 'everything' || task.spaceId === currentSpaceId;
        const matchesList = !currentListId || task.listId === currentListId;
        return matchesSpace && matchesList;
    });


    const boardStatuses: Status[] = activeList?.statuses || activeSpace?.statuses || DEFAULT_STATUSES;

    const handleAddColumn = () => {
        if (!newColumnName.trim()) return;

        const targetId = (currentListId || currentSpaceId);
        const isSpace = !currentListId;

        addStatus(targetId, isSpace, {
            name: newColumnName.toUpperCase(),
            color: '#64748b',
            type: 'inprogress'
        });
        setNewColumnName('');
        setIsAddingColumn(false);
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeTaskId = active.id as string;
        const overId = over.id as string;

        // If dropped over a column
        if (boardStatuses.some(col => col.name === overId)) {
            updateTask(activeTaskId, { status: overId });
            return;
        }

        // If dropped over another task
        const overTask = tasks.find(t => t.id === overId);
        const activeTaskObj = tasks.find(t => t.id === activeTaskId);
        if (overTask && activeTaskObj && overTask.status !== activeTaskObj.status) {
            updateTask(activeTaskId, { status: overTask.status });
        }
    };

    const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

    return (
        <div className="view-container kanban-view">
            <ViewHeader />

            <div className="toolbar">
                <div className="toolbar-left">
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}><Filter size={14} /> Filter</button>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}><ArrowUpDown size={14} /> Sort</button>
                </div>
                <div className="toolbar-right">
                    <div className="toolbar-search">
                        <Search size={14} />
                        <input type="text" placeholder="Search tasks..." readOnly />
                    </div>
                    <button className="btn-primary" onClick={() => onAddTask()} style={{ padding: '8px 16px' }}>
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="kanban-board">
                    {boardStatuses.map(col => (
                        <KanbanColumn
                            key={col.id}
                            status={col.name}
                            color={col.color}
                            tasks={filteredTasks.filter(t =>
                                t.status.toLowerCase() === col.name.toLowerCase() ||
                                t.status === col.id
                            )}
                            onAddTask={onAddTask}
                            onTaskClick={onTaskClick}
                            tags={tags}
                            openMenuTaskId={openMenuTaskId}
                            onOpenMenu={handleOpenMenu}
                            onCloseMenu={() => { setOpenMenuTaskId(null); setMenuTrigger(null); setMenuMousePos(null); }}
                            menuTrigger={menuTrigger}
                            menuMousePos={menuMousePos}
                            onDuplicate={duplicateTask}
                            onArchive={archiveTask}
                            onDelete={deleteTask}
                            onConvertToDoc={handleConvertToDoc}
                            addSubtaskTaskId={addSubtaskTaskId}
                            onStartAddSubtask={setAddSubtaskTaskId}
                            onCancelAddSubtask={() => setAddSubtaskTaskId(null)}
                            onAddSubtask={(taskId, subtask) => {
                                addSubtask(taskId, subtask);
                                setAddSubtaskTaskId(null);
                            }}
                            onUpdateTask={updateTask}
                            onAddTag={addTag}
                            onUpdateTag={updateTag}
                            onDeleteTag={deleteTag}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
                        />
                    ))}
                    <div className="add-column-container">
                        {!isAddingColumn ? (
                            <div className="add-column-btn" onClick={() => setIsAddingColumn(true)}>
                                <Plus size={18} />
                                <span>Add Group</span>
                            </div>
                        ) : (
                            <div className="add-column-form" style={{
                                padding: '16px',
                                backgroundColor: 'var(--bg-side)',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                minWidth: '320px'
                            }}>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Column Name"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleAddColumn();
                                        if (e.key === 'Escape') {
                                            setIsAddingColumn(false);
                                            setNewColumnName('');
                                        }
                                    }}
                                    style={{
                                        background: 'var(--bg-surface)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-main)',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        fontSize: '14px',
                                        width: '100%'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleAddColumn}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '6px',
                                            background: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Check size={14} /> Add
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsAddingColumn(false);
                                            setNewColumnName('');
                                        }}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '6px',
                                            background: 'transparent',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            fontWeight: 500,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <DragOverlay>
                    {activeTask ? (
                        <div className="kanban-card dragging">
                            <h4 className="card-title">{activeTask.name}</h4>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

        </div>
    );
};

export default KanbanView;
