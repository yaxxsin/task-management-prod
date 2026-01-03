import React, { useMemo } from 'react';
import AssigneeMenu from '../components/AssigneeMenu';
import {
    Plus,
    Search,
    Filter,
    ArrowUpDown,
    ChevronRight,
    ChevronDown,
    Calendar as CalendarIcon,
    MoreHorizontal,
    GripVertical,
    Flag,
    Tag as TagIcon,
    Pencil,
    Users,
    Settings2,
    Lock,
    ArrowLeftToLine,
    ArrowRightToLine,
    Zap,
    EyeOff,
    Copy,
    Trash2,
    ArrowDownWideNarrow,
    Check
} from 'lucide-react';
import ContextMenu from '../components/ContextMenu';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore, DEFAULT_STATUSES } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { format, isPast, isToday } from 'date-fns';
import type { Task, ColumnSetting, Tag, Status } from '../types';
import TaskOptionsMenu from '../components/TaskOptionsMenu';
import DatePicker from '../components/DatePicker';
import TagMenu from '../components/TagMenu';
import ViewHeader from '../components/ViewHeader';
import StatusEditorModal from '../components/StatusEditorModal';
import CreateFieldSidebar from '../components/CreateFieldSidebar';
import '../styles/ListView.css';
import '../styles/TaskOptionsMenu.css';
import '../styles/CreateFieldSidebar.css';

interface ListViewProps {
    onAddTask: () => void;
    onTaskClick: (taskId: string) => void;
    isTableMode?: boolean;
}

interface ColumnHeaderProps {
    column: ColumnSetting;
    onSort?: () => void;
    onResize: (e: React.PointerEvent, columnId: string) => void;
    onRename?: (columnId: string, newName: string) => void;
    onContextMenu?: (e: React.MouseEvent, columnId: string) => void;
    isTableMode?: boolean;
}

const SortableColumnHeader: React.FC<ColumnHeaderProps> = ({ column, onResize, onRename, onContextMenu, isTableMode }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(column.name);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (editValue.trim() && editValue !== column.name && onRename) {
            onRename(column.id, editValue.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setEditValue(column.name);
            setIsEditing(false);
        }
    };
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: column.id });

    // FIX: Do not apply transform to sticky 'name' column to prevent breaking position: sticky
    // We accept that the name column won't animate during reordering, but it will remain sticky.
    // UPDATE: We MUST apply transform for dnd to work visually. We accept sticky might break during drag.
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        width: column.width,
        flex: column.id === 'name' && !column.width ? 1 : 'none',
        minWidth: (column.id === 'name' || column.id === 'dueDate' || column.id === 'priority' || column.id === 'status') ? 'unset' : undefined,
        opacity: isDragging ? 0.5 : 1,
        left: column.id === 'name' ? (30 + (isTableMode ? 50 : 0)) : undefined,
        zIndex: isDragging ? 9999 : undefined,
        touchAction: 'none'
    };

    const handleResizePointerDown = (e: React.PointerEvent) => {
        // IMPORTANT: Prevent dnd-kit from picking this up as a drag start
        e.stopPropagation();
        e.preventDefault();

        // Capture pointer to track movement even outside the element
        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        onResize(e, column.id);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`column-header-cell ${column.id === 'name' ? 'sticky-column sticky-column-header name-cell' : ''}`}
            data-column={column.id}
            {...attributes}
            {...listeners}
            onContextMenu={(e) => {
                e.preventDefault();
                onContextMenu?.(e, column.id);
            }}
        >
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="column-name-edit-input"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span onDoubleClick={() => onRename && setIsEditing(true)}>{column.name}</span>
            )}
            <ArrowUpDown size={12} className="sort-icon" />
            <div
                className="column-resizer"
                onPointerDown={handleResizePointerDown}
                onClick={(e) => e.stopPropagation()}
                style={{ touchAction: 'none' }}
            />
        </div>
    );
};

interface ActivePopover {
    taskId: string;
    field: 'priority' | 'date' | 'tags' | 'assignees' | string;
    element: HTMLElement;
}

const CalculationRow: React.FC<{
    columns: ColumnSetting[];
    tasks: Task[];
    onCalculationChange: (columnId: string, type: ColumnSetting['calculationType']) => void;
    isTableMode?: boolean;
}> = ({ columns, tasks, onCalculationChange, isTableMode }) => {
    const renderCalculationValue = (col: ColumnSetting) => {
        if (!col.calculationType || col.calculationType === 'none') {
            return (
                <div className="calculation-trigger" onClick={(e) => {
                    e.stopPropagation();
                    onCalculationChange(col.id, 'sum');
                }}>
                    Calculate <ChevronDown size={12} />
                </div>
            );
        }

        const getAllFilteredValues = (taskList: Task[]): any[] => {
            let all: any[] = [];
            taskList.forEach(t => {
                const val = t.customFieldValues?.[col.id];
                if (val !== undefined && val !== null) all.push(val);
                if (t.subtasks && t.subtasks.length > 0) {
                    all = [...all, ...getAllFilteredValues(t.subtasks as any)];
                }
            });
            return all;
        };

        const allValues = getAllFilteredValues(tasks);

        if (col.type === 'checkbox') {
            const checkedCount = allValues.filter(v => v === true).length;
            return (
                <div className="calculation-value">
                    <span className="calc-label">Checked:</span> {checkedCount}
                </div>
            );
        }

        const numericValues = allValues
            .map(v => Number(v))
            .filter(v => !isNaN(v));

        let result: number | string = 0;
        switch (col.calculationType) {
            case 'sum': result = numericValues.reduce((a, b) => a + b, 0); break;
            case 'avg': result = numericValues.length ? (numericValues.reduce((a, b) => a + b, 0) / numericValues.length).toFixed(2) : 0; break;
            case 'min': result = numericValues.length ? Math.min(...numericValues) : 0; break;
            case 'max': result = numericValues.length ? Math.max(...numericValues) : 0; break;
            case 'count': result = numericValues.length; break;
        }

        const currency = col.currency === 'USD' ? '$' : col.currency === 'EUR' ? '€' : col.currency === 'GBP' ? '£' : col.currency === 'JPY' ? '¥' : '';

        return (
            <div className="calculation-value" onClick={() => {
                const types: ColumnSetting['calculationType'][] = ['sum', 'avg', 'min', 'max', 'count', 'none'];
                const currentIndex = types.indexOf(col.calculationType || 'none');
                const nextType = types[(currentIndex + 1) % types.length];
                onCalculationChange(col.id, nextType);
            }}>
                <span className="calc-label">{col.calculationType?.toUpperCase() || 'CALC'}:</span>
                {col.type === 'money' && currency}
                {result}
            </div>
        );
    };

    return (
        <div className="calculation-row">
            <div className="drag-handle-placeholder sticky-column drag-handle-sticky" style={{ width: 30 }}></div>
            {isTableMode && <div className="task-cell index-cell sticky-column index-cell-sticky" style={{ width: 50 }}></div>}
            {columns.filter(c => c.visible).map(col => (
                <div key={col.id} className={`task-cell calculation-cell ${col.id === 'name' ? 'sticky-column' : ''}`} style={{
                    width: col.width,
                    flex: (!col.width && col.id === 'name') ? 1 : 'none',
                    justifyContent: col.type === 'number' ? 'flex-end' : 'flex-start',
                    left: col.id === 'name' ? 30 + (isTableMode ? 50 : 0) : undefined
                }}>
                    {(col.type === 'number' || col.type === 'money' || col.type === 'checkbox') && renderCalculationValue(col)}
                </div>
            ))}
            <div style={{ width: 50 }}></div>
        </div>
    );
};

interface SortableRowProps {
    task: Task;
    columns: ColumnSetting[];
    onTaskClick: (taskId: string) => void;
    getPriorityColor: (priority: Task['priority']) => string;
    getDateStatus: (dateStr?: string) => string | null;
    tags: Tag[];
    onOpenMenu: (taskId: string, trigger: HTMLElement, mousePos?: { x: number, y: number }) => void;
    isMenuOpen: boolean;
    onCloseMenu: () => void;
    onDuplicate: (taskId: string) => void;
    onArchive: (taskId: string) => void;
    onDelete: (taskId: string) => void;
    onConvertToDoc: (task: Task) => void;
    onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
    activePopover: ActivePopover | null;
    setActivePopover: (popover: ActivePopover | null) => void;
    onAddTag: (tag: Omit<Tag, 'id'>) => void;
    onUpdateTag: (tagId: string, updates: Partial<Tag>) => void;
    onDeleteTag: (tagId: string) => void;
    onStartTimer: () => void;
    menuTrigger: HTMLElement | null;

    rowIndex?: number;
    isTableMode?: boolean;
    menuMousePos?: { x: number, y: number } | null;
}

const priorities: any[] = ['low', 'medium', 'high', 'urgent'];

interface SubtaskRowItemProps {
    task: any;
    columns: ColumnSetting[];
    onTaskClick: (taskId: string) => void;
    getPriorityColor: (priority: any) => string;
    getDateStatus: (dateStr?: string) => string | null;
    tags: Tag[];
    parentId: string;
    onUpdateSubtask: (parentId: string, subtaskId: string, updates: any) => void;
    activePopover: ActivePopover | null;
    setActivePopover: (popover: ActivePopover | null) => void;
    onOpenMenu: (taskId: string, trigger: HTMLElement, mousePos?: { x: number, y: number }) => void;
    isMenuOpen: boolean;
    onCloseMenu: () => void;
    menuTrigger: HTMLElement | null;
    menuMousePos?: { x: number, y: number } | null;

    onDeleteSubtask: (parentId: string, subtaskId: string) => void;
    isTableMode?: boolean;
}

const SubtaskRowItem: React.FC<SubtaskRowItemProps> = ({
    task,
    columns,
    onTaskClick,
    getPriorityColor,
    getDateStatus,
    onUpdateSubtask,
    parentId,
    activePopover,
    setActivePopover,
    onOpenMenu,
    isMenuOpen,
    onCloseMenu,
    menuTrigger,
    menuMousePos,
    onDeleteSubtask,
    tags,
    isTableMode
}) => {
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameValue, setRenameValue] = React.useState(task.name);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameSubmit = () => {
        if (renameValue.trim() && renameValue !== task.name) {
            onUpdateSubtask(parentId, task.id, { name: renameValue.trim() });
        }
        setIsRenaming(false);
    };

    const renderCell = (col: ColumnSetting) => {
        switch (col.id) {
            case 'name':
                return (
                    <div className="task-cell name-cell sticky-column" style={{
                        width: col.width,
                        flex: (!col.width && col.id === 'name') ? 1 : 'none',
                        minWidth: col.id === 'name' ? 'unset' : undefined,
                        overflow: 'visible', paddingLeft: '48px',
                        left: 30 + (isTableMode ? 50 : 0)
                    }}>
                        <div className="task-cell-inner" style={{ overflow: 'visible' }}>
                            <div className="subtask-indent-line"></div>
                            <input
                                type="checkbox"
                                checked={task.status === 'COMPLETED'}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onUpdateSubtask(parentId, task.id, { status: e.target.checked ? 'COMPLETED' : 'TO DO' });
                                }}
                            />
                            {isRenaming ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={renameValue}
                                    onChange={e => setRenameValue(e.target.value)}
                                    onBlur={handleRenameSubmit}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleRenameSubmit();
                                        if (e.key === 'Escape') { setRenameValue(task.name); setIsRenaming(false); }
                                        e.stopPropagation();
                                    }}
                                    onClick={e => e.stopPropagation()}
                                    className="task-name-input"
                                    style={{ flex: 1, minWidth: 0, height: 24, padding: '0 4px', border: '1px solid var(--primary)', borderRadius: 4, background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                />
                            ) : (
                                <span className="task-name" style={{ color: task.status === 'COMPLETED' ? 'var(--text-tertiary)' : 'inherit', textDecoration: task.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                                    {task.name}
                                </span>
                            )}
                            <div className="task-tags">
                                {task.tags?.map((tagId: string) => {
                                    const tag = tags.find(t => t.id === tagId);
                                    if (!tag) return null;
                                    return (
                                        <span key={tagId} className="tag-pill" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                            {tag.name}
                                        </span>
                                    );
                                })}
                                {activePopover?.taskId === task.id && activePopover?.field === 'tags' && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100 }}>
                                        <TagMenu
                                            tags={tags}
                                            selectedTagIds={task.tags || []}
                                            onToggleTag={(tagId) => {
                                                const currentTags: string[] = task.tags || [];
                                                const newTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
                                                onUpdateSubtask(parentId, task.id, { tags: newTags });
                                            }}
                                            onClose={() => setActivePopover(null)}
                                            onCreateTag={() => { }}
                                            onUpdateTag={() => { }}
                                            onDeleteTag={() => { }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'assignee':
                return (
                    <div className="task-cell assignee-cell" style={{ width: col.width }}>
                        <div className="assignee-avatar">
                            {task.assignee?.[0] || '?'}
                        </div>
                        <span>{task.assignee || 'Unassigned'}</span>
                    </div>
                );
            case 'dueDate':
                return (
                    <div className="task-cell date-cell" style={{ width: col.width, minWidth: 'unset' }}>
                        <div
                            className={`date-badge-interactive ${task.dueDate ? getDateStatus(task.dueDate) : 'empty'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePopover({ taskId: task.id, field: 'date', element: e.currentTarget });
                            }}
                        >
                            <CalendarIcon size={12} />
                            {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '-'}
                        </div>
                        {activePopover?.taskId === task.id && activePopover?.field === 'date' && (
                            <DatePicker
                                initialDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                onSelect={(date) => {
                                    onUpdateSubtask(parentId, task.id, { dueDate: date?.toISOString() });
                                    setActivePopover(null);
                                }}
                                onClose={() => setActivePopover(null)}
                                triggerElement={activePopover.element}
                            />
                        )}
                    </div>
                );
            case 'priority':
                return (
                    <div className="task-cell priority-cell" style={{ width: col.width, minWidth: 'unset', overflow: 'visible', position: 'relative' }}>
                        <div
                            className="priority-badge-interactive"
                            style={{ color: getPriorityColor(task.priority), display: 'flex', alignItems: 'center' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePopover({ taskId: task.id, field: 'priority', element: e.currentTarget });
                            }}
                        >
                            <Flag size={12} style={{ color: getPriorityColor(task.priority), marginRight: 6 }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>{task.priority || '-'}</span>
                        </div>
                        {activePopover?.taskId === task.id && activePopover?.field === 'priority' && (
                            <div className="inline-popover priority-popover" onClick={e => e.stopPropagation()} style={{ zIndex: 101 }}>
                                {priorities.map((p: any) => (
                                    <div
                                        key={p}
                                        className="popover-item"
                                        style={{ color: getPriorityColor(p), fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}
                                        onClick={() => {
                                            onUpdateSubtask(parentId, task.id, { priority: p });
                                            setActivePopover(null);
                                        }}
                                    >
                                        <Flag size={12} style={{ marginRight: 8 }} />
                                        {p}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'status':
                return (
                    <div className="task-cell status-cell" style={{ width: col.width, minWidth: 'unset' }}>
                        <span className="status-pill">{task.status}</span>
                    </div>
                );
            default: {
                if (col.type === 'number' || col.type === 'money') {
                    const value = task.customFieldValues?.[col.id] || '';
                    const currency = col.currency === 'USD' ? '$' : col.currency === 'EUR' ? '€' : col.currency === 'GBP' ? '£' : col.currency === 'JPY' ? '¥' : '';
                    return (
                        <div className="task-cell" style={{ width: col.width }}>
                            <div className="custom-number-input-wrapper">
                                {col.type === 'money' && <span className="custom-field-currency">{currency}</span>}
                                <input
                                    type="number"
                                    value={value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        onUpdateSubtask(parentId, task.id, {
                                            customFieldValues: {
                                                ...(task.customFieldValues || {}),
                                                [col.id]: val === '' ? undefined : Number(val)
                                            }
                                        });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="custom-field-input"
                                    placeholder="--"
                                    step={col.decimals ? 1 / Math.pow(10, col.decimals) : 1}
                                />
                            </div>
                        </div>
                    );
                }

                if (col.type === 'dropdown' || col.type === 'labels' || col.type === 'custom-dropdown' || col.id.startsWith('dropdown')) {
                    const selectedId = task.customFieldValues?.[col.id];
                    const selectedOption = col.options?.find(o => o.id === selectedId);

                    return (
                        <div className="task-cell" style={{ width: col.width, position: 'relative', overflow: 'visible' }}>
                            <div
                                className="custom-dropdown-badge"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopover({ taskId: task.id, field: col.id, element: e.currentTarget });
                                }}
                                style={{ background: selectedOption ? selectedOption.color + '20' : 'var(--bg-hover)', color: selectedOption ? selectedOption.color : 'var(--text-tertiary)' }}
                            >
                                {selectedOption && <div className="dot" style={{ background: selectedOption.color, width: 6, height: 6, borderRadius: '50%' }}></div>}
                                {selectedOption ? selectedOption.name : '--'}
                                <ChevronDown size={12} />
                            </div>

                            {activePopover?.taskId === task.id && activePopover?.field === col.id && (
                                <div className="dropdown-popover" onClick={e => e.stopPropagation()}>
                                    {col.options?.map(opt => (
                                        <div
                                            key={opt.id}
                                            className="dropdown-popover-item"
                                            onClick={() => {
                                                onUpdateSubtask(parentId, task.id, {
                                                    customFieldValues: {
                                                        ...(task.customFieldValues || {}),
                                                        [col.id]: opt.id
                                                    }
                                                });
                                                setActivePopover(null);
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className="dot" style={{ background: opt.color }}></div>
                                                {opt.name}
                                            </div>
                                            {selectedId === opt.id && <Check size={14} style={{ color: 'var(--primary)' }} />}
                                        </div>
                                    ))}
                                    <div
                                        className="dropdown-popover-item"
                                        style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', marginTop: 4 }}
                                        onClick={() => {
                                            onUpdateSubtask(parentId, task.id, {
                                                customFieldValues: {
                                                    ...(task.customFieldValues || {}),
                                                    [col.id]: undefined
                                                }
                                            });
                                            setActivePopover(null);
                                        }}
                                    >
                                        Clear value
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }

                if (col.type === 'checkbox') {
                    const isChecked = task.customFieldValues?.[col.id] === true;
                    return (
                        <div className="task-cell" style={{ width: col.width }}>
                            <div className="custom-checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                        onUpdateSubtask(parentId, task.id, {
                                            customFieldValues: {
                                                ...(task.customFieldValues || {}),
                                                [col.id]: e.target.checked
                                            }
                                        });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="custom-checkbox-input"
                                />
                            </div>
                        </div>
                    );
                }

                if (col.type === 'date') {
                    const dateVal = task.customFieldValues?.[col.id];
                    return (
                        <div className="task-cell date-cell" style={{ width: col.width, minWidth: 'unset', position: 'relative', overflow: 'visible' }}>
                            <div
                                className={`date-badge-interactive ${dateVal ? getDateStatus(dateVal) : 'empty'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopover({ taskId: task.id, field: col.id, element: e.currentTarget });
                                }}
                            >
                                <CalendarIcon size={12} />
                                {dateVal ? format(new Date(dateVal), 'MMM d') : 'Set Date'}
                            </div>
                            {activePopover?.taskId === task.id && activePopover?.field === col.id && (
                                <DatePicker
                                    initialDate={dateVal ? new Date(dateVal) : undefined}
                                    onSelect={(date) => {
                                        onUpdateSubtask(parentId, task.id, {
                                            customFieldValues: {
                                                ...(task.customFieldValues || {}),
                                                [col.id]: date ? date.toISOString() : undefined
                                            }
                                        });
                                        setActivePopover(null);
                                    }}
                                    onClose={() => setActivePopover(null)}
                                    triggerElement={activePopover.element}
                                />
                            )}
                        </div>
                    );
                }

                const displayValue = task.customFieldValues?.[col.id] ?? '-';
                return <div className="task-cell" style={{ width: col.width }}>{displayValue}</div>;
            }
        }
    };

    return (
        <div className="task-item-row subtask-item-row" onClick={() => onTaskClick(task.id)} onContextMenu={(e) => {
            e.preventDefault();
            onOpenMenu(task.id, e.currentTarget, { x: e.clientX, y: e.clientY });
        }}>
            <div className="drag-handle-placeholder sticky-column drag-handle-sticky" style={{ width: 30 }}></div>
            {isTableMode && <div className="task-cell index-cell sticky-column index-cell-sticky" style={{ width: 50 }}></div>}
            {columns.filter(c => c.visible).map(col => (
                <React.Fragment key={col.id}>
                    {renderCell(col)}
                </React.Fragment>
            ))}
            <div className="task-cell actions-cell" style={{ width: 50, position: 'relative', overflow: 'visible' }}>
                <button
                    className="icon-btn-ghost"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (isMenuOpen) onCloseMenu();
                        else onOpenMenu(task.id, e.currentTarget);
                    }}
                >
                    <MoreHorizontal size={16} />
                </button>
                {isMenuOpen && (
                    <TaskOptionsMenu
                        taskId={task.id}
                        onClose={onCloseMenu}
                        onRename={() => {
                            setRenameValue(task.name);
                            setIsRenaming(true);
                            onCloseMenu();
                        }}
                        onDelete={() => onDeleteSubtask(parentId, task.id)}
                        onDuplicate={() => { }}
                        onArchive={() => { }}
                        triggerElement={menuTrigger}
                        mousePos={menuMousePos}
                        onConvertToDoc={() => { }}
                        onStartTimer={() => { }}
                    />
                )}
            </div>
        </div>
    );
};

interface SortableRowPropsWithUpdateSubtask extends SortableRowProps {
    onUpdateSubtask: (parentId: string, subtaskId: string, updates: any) => void;
    onAddSubtask: (taskId: string, name: string) => void;
    onDeleteSubtask: (parentId: string, subtaskId: string) => void;
    openMenuTaskId: string | null;
}

const SortableRow: React.FC<SortableRowPropsWithUpdateSubtask> = ({
    task,
    columns,
    onTaskClick,
    getPriorityColor,
    getDateStatus,
    tags,
    onOpenMenu,
    isMenuOpen,
    onCloseMenu,
    onDuplicate,
    onArchive,
    onDelete,
    onConvertToDoc,
    onUpdateTask,
    activePopover,
    setActivePopover,
    onAddTag,
    onUpdateTag,
    onDeleteTag,
    onStartTimer,
    onUpdateSubtask,
    onAddSubtask,
    onDeleteSubtask,
    menuTrigger,
    menuMousePos,
    openMenuTaskId,
    rowIndex,
    isTableMode
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
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameValue, setRenameValue] = React.useState(task.name);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const [isAddingSubtask, setIsAddingSubtask] = React.useState(false);
    const [newSubtaskName, setNewSubtaskName] = React.useState('');
    const newSubtaskInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isAddingSubtask && newSubtaskInputRef.current) {
            newSubtaskInputRef.current.focus();
        }
    }, [isAddingSubtask]);

    React.useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameSubmit = () => {
        if (renameValue.trim() && renameValue !== task.name) {
            onUpdateTask(task.id, { name: renameValue.trim() });
        }
        setIsRenaming(false);
    };

    const handleSubtaskSubmit = () => {
        if (newSubtaskName.trim()) {
            onAddSubtask(task.id, newSubtaskName.trim());
            setIsAddingSubtask(false);
            setNewSubtaskName('');
        } else {
            setIsAddingSubtask(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setRenameValue(task.name);
            setIsRenaming(false);
        }
        e.stopPropagation();
    };

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 500 : (activePopover?.taskId === task.id ? 50 : 0),
        position: 'relative' as const, // Ensure z-index works
    };

    const priorities: Task['priority'][] = ['urgent', 'high', 'medium', 'low'];
    const hasSubtasks = task.subtasks && task.subtasks.length > 0;

    const renderCell = (col: ColumnSetting) => {
        switch (col.id) {
            case 'name':
                return (
                    <div className="task-cell name-cell sticky-column" style={{
                        width: col.width,
                        flex: (!col.width && col.id === 'name') ? 1 : 'none',
                        minWidth: col.id === 'name' ? 'unset' : undefined,
                        overflow: 'visible',
                        left: 30 + (isTableMode ? 50 : 0)
                    }}>
                        <div className="task-cell-inner" style={{ overflow: 'visible' }}>
                            <div
                                style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginRight: 4 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                            >
                                {hasSubtasks && (
                                    <div className={`subtask-toggle-btn ${isExpanded ? 'expanded' : ''}`}>
                                        <ChevronRight size={14} />
                                    </div>
                                )}
                            </div>

                            <input type="checkbox" readOnly checked={task.status === 'COMPLETED'} />

                            {isRenaming ? (
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={handleRenameSubmit}
                                    onKeyDown={handleKeyDown}
                                    onClick={(e) => e.stopPropagation()}
                                    className="task-name-input"
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        border: '1px solid #3b82f6',
                                        borderRadius: '4px',
                                        padding: '0 4px',
                                        fontSize: 'inherit',
                                        fontFamily: 'inherit',
                                        background: 'white',
                                        color: 'inherit',
                                        height: '24px'
                                    }}
                                />
                            ) : (
                                <span className="task-name">{task.name}</span>
                            )}
                            <div className="task-tags">
                                {task.tags?.map(tagId => {
                                    const tag = tags.find(t => t.id === tagId);
                                    if (!tag) return null;
                                    return (
                                        <span key={tagId} className="tag-pill" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                            {tag.name}
                                        </span>
                                    );
                                })}

                                {activePopover?.taskId === task.id && activePopover?.field === 'tags' && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100 }}>
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
                            </div>

                            {hasSubtasks && (
                                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 2, marginLeft: 6 }}>
                                    <div style={{ width: 1, height: 12, background: '#cbd5e1', transform: 'rotate(15deg)' }}></div>
                                    {task.subtasks!.length}
                                </div>
                            )}

                            <div className="row-hover-actions">
                                <button
                                    className="row-action-btn"
                                    title="Add subtask"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsAddingSubtask(true);
                                        setIsExpanded(true);
                                    }}
                                >
                                    <Plus size={18} />
                                </button>
                                <button
                                    className="row-action-btn"
                                    title="Edit tags"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActivePopover({ taskId: task.id, field: 'tags', element: e.currentTarget });
                                    }}
                                >
                                    <TagIcon size={18} />
                                </button>
                                <button
                                    className="row-action-btn"
                                    title="Rename"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameValue(task.name);
                                        setIsRenaming(true);
                                    }}
                                >
                                    <Pencil size={18} />
                                </button>
                            </div>

                        </div>
                    </div>
                );
            case 'assignee':
                return (
                    <div className="task-cell assignee-cell" style={{ width: col.width, position: 'relative', overflow: 'visible' }}>
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
                                        <div key={idx} className="assignee-avatar-xs" style={{ margin: 0, marginLeft: idx === 0 ? 0 : '-6px', border: '1.5px solid var(--bg-main)' }}>
                                            {name[0].toUpperCase()}
                                        </div>
                                    ))}
                                    {task.assignees.length > 2 && (
                                        <div className="assignee-avatar-xs" style={{ marginLeft: '-6px', fontSize: '9px', background: 'var(--bg-active)', border: '1.5px solid var(--bg-main)' }}>
                                            +{task.assignees.length - 2}
                                        </div>
                                    )}
                                </>
                            ) : task.assignee ? (
                                <div className="assignee-avatar-xs" style={{ margin: 0 }}>
                                    {task.assignee[0].toUpperCase()}
                                </div>
                            ) : (
                                <div className="assignee-avatar-xs dashed" style={{ margin: 0, borderStyle: 'dashed', background: 'transparent', color: 'var(--text-tertiary)' }}>
                                    <Users size={12} />
                                </div>
                            )}
                        </div>
                        <span style={{ fontSize: '13px', marginLeft: '4px' }}>
                            {task.assignees && task.assignees.length > 0
                                ? task.assignees.length === 1 ? task.assignees[0] : `${task.assignees.length} people`
                                : task.assignee || 'Unassigned'}
                        </span>
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
                    </div>
                );
            case 'dueDate':
                return (
                    <div className="task-cell date-cell" style={{ width: col.width, minWidth: 'unset', position: 'relative', overflow: 'visible' }}>
                        <div
                            className={`date-badge-interactive ${task.dueDate ? getDateStatus(task.dueDate) : 'empty'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePopover({ taskId: task.id, field: 'date', element: e.currentTarget });
                            }}
                        >
                            <CalendarIcon size={12} />
                            {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : 'Set Date'}
                        </div>
                        {activePopover?.taskId === task.id && activePopover?.field === 'date' && (
                            <DatePicker
                                initialDate={task.dueDate ? new Date(task.dueDate) : undefined}
                                onSelect={(date: Date | null) => {
                                    onUpdateTask(task.id, { dueDate: date ? date.toISOString() : undefined });
                                    setActivePopover(null);
                                }}
                                onClose={() => setActivePopover(null)}
                                triggerElement={activePopover.element}
                            />
                        )}
                    </div>
                );
            case 'priority':
                return (
                    <div className="task-cell priority-cell" style={{ width: col.width, minWidth: 'unset', position: 'relative', overflow: 'visible' }}>
                        <div
                            className="priority-badge-interactive"
                            style={{ color: getPriorityColor(task.priority) }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActivePopover({ taskId: task.id, field: 'priority', element: e.currentTarget });
                            }}
                        >
                            {task.priority || '-'}
                        </div>
                        {activePopover?.taskId === task.id && activePopover?.field === 'priority' && (
                            <div className="inline-popover priority-popover" onClick={e => e.stopPropagation()}>
                                {priorities.map(p => (
                                    <div
                                        key={p}
                                        className="popover-item"
                                        style={{ color: getPriorityColor(p), fontWeight: 700, textTransform: 'uppercase', fontSize: '11px' }}
                                        onClick={() => {
                                            onUpdateTask(task.id, { priority: p });
                                            setActivePopover(null);
                                        }}
                                    >
                                        <Flag size={12} style={{ marginRight: 8 }} />
                                        {p}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'status':
                return (
                    <div className="task-cell status-cell" style={{ width: col.width, minWidth: 'unset' }}>
                        <span className="status-pill">{task.status}</span>
                    </div>
                );
            default: {
                if (col.type === 'number' || col.type === 'money') {
                    const value = task.customFieldValues?.[col.id] || '';
                    const currency = col.currency === 'USD' ? '$' : col.currency === 'EUR' ? '€' : col.currency === 'GBP' ? '£' : col.currency === 'JPY' ? '¥' : '';
                    return (
                        <div className="task-cell" style={{ width: col.width }}>
                            <div className="custom-number-input-wrapper">
                                {col.type === 'money' && <span className="custom-field-currency">{currency}</span>}
                                <input
                                    type="number"
                                    value={value}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        onUpdateTask(task.id, {
                                            customFieldValues: {
                                                ...(task.customFieldValues || {}),
                                                [col.id]: val === '' ? undefined : Number(val)
                                            }
                                        });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="custom-field-input"
                                    placeholder="--"
                                    step={col.decimals ? 1 / Math.pow(10, col.decimals) : 1}
                                />
                            </div>
                        </div>
                    );
                }

                if (col.type === 'dropdown' || col.type === 'labels' || col.type === 'custom-dropdown' || col.id.startsWith('dropdown')) {
                    const selectedId = task.customFieldValues?.[col.id];
                    const selectedOption = col.options?.find(o => o.id === selectedId);

                    return (
                        <div className="task-cell" style={{ width: col.width, position: 'relative', overflow: 'visible' }}>
                            <div
                                className="custom-dropdown-badge"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopover({ taskId: task.id, field: col.id, element: e.currentTarget });
                                }}
                                style={{ background: selectedOption ? selectedOption.color + '20' : 'var(--bg-hover)', color: selectedOption ? selectedOption.color : 'var(--text-tertiary)' }}
                            >
                                {selectedOption && <div className="dot" style={{ background: selectedOption.color, width: 6, height: 6, borderRadius: '50%' }}></div>}
                                {selectedOption ? selectedOption.name : '--'}
                                <ChevronDown size={12} />
                            </div>

                            {activePopover?.taskId === task.id && activePopover?.field === col.id && (
                                <div className="dropdown-popover" onClick={e => e.stopPropagation()}>
                                    {col.options?.map(opt => (
                                        <div
                                            key={opt.id}
                                            className="dropdown-popover-item"
                                            onClick={() => {
                                                onUpdateTask(task.id, {
                                                    customFieldValues: {
                                                        ...(task.customFieldValues || {}),
                                                        [col.id]: opt.id
                                                    }
                                                });
                                                setActivePopover(null);
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div className="dot" style={{ background: opt.color }}></div>
                                                {opt.name}
                                            </div>
                                            {selectedId === opt.id && <Check size={14} style={{ color: 'var(--primary)' }} />}
                                        </div>
                                    ))}
                                    <div
                                        className="dropdown-popover-item"
                                        style={{ color: 'var(--text-tertiary)', borderTop: '1px solid var(--border)', marginTop: 4 }}
                                        onClick={() => {
                                            onUpdateTask(task.id, {
                                                customFieldValues: {
                                                    ...(task.customFieldValues || {}),
                                                    [col.id]: undefined
                                                }
                                            });
                                            setActivePopover(null);
                                        }}
                                    >
                                        Clear value
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }

                if (col.type === 'checkbox') {
                    const isChecked = task.customFieldValues?.[col.id] === true;
                    return (
                        <div className="task-cell" style={{ width: col.width }}>
                            <div className="custom-checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                        onUpdateTask(task.id, {
                                            customFieldValues: {
                                                ...(task.customFieldValues || {}),
                                                [col.id]: e.target.checked
                                            }
                                        });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="custom-checkbox-input"
                                />
                            </div>
                        </div>
                    );
                }

                if (col.type === 'date') {
                    const dateVal = task.customFieldValues?.[col.id];
                    return (
                        <div className="task-cell date-cell" style={{ width: col.width, minWidth: 'unset', position: 'relative', overflow: 'visible' }}>
                            <div
                                className={`date-badge-interactive ${dateVal ? getDateStatus(dateVal) : 'empty'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePopover({ taskId: task.id, field: col.id, element: e.currentTarget });
                                }}
                            >
                                <CalendarIcon size={12} />
                                {dateVal ? format(new Date(dateVal), 'MMM d') : 'Set Date'}
                            </div>
                            {activePopover?.taskId === task.id && activePopover?.field === col.id && (
                                <DatePicker
                                    initialDate={dateVal ? new Date(dateVal) : undefined}
                                    onSelect={(date) => {
                                        onUpdateTask(task.id, {
                                            customFieldValues: {
                                                ...(task.customFieldValues || {}),
                                                [col.id]: date ? date.toISOString() : undefined
                                            }
                                        });
                                        setActivePopover(null);
                                    }}
                                    onClose={() => setActivePopover(null)}
                                    triggerElement={activePopover.element}
                                />
                            )}
                        </div>
                    );
                }

                const displayValue = task.customFieldValues?.[col.id] ?? '-';
                return <div className="task-cell" style={{ width: col.width }}>{displayValue}</div>;
            }
        }
    };

    return (
        <div ref={setNodeRef} style={style} className="task-row-wrapper">
            <div
                className="task-item-row"
                onClick={() => onTaskClick(task.id)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    onOpenMenu(task.id, e.currentTarget, { x: e.clientX, y: e.clientY });
                }}
            >
                <div className="drag-handle sticky-column drag-handle-sticky" {...attributes} {...listeners}>
                    <GripVertical size={16} />
                </div>

                {isTableMode && (
                    <div className="task-cell index-cell sticky-column index-cell-sticky" style={{ width: 50, justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                        {rowIndex !== undefined ? rowIndex : '-'}
                    </div>
                )}
                {columns.filter(c => c.visible).map(col => (
                    <React.Fragment key={col.id}>
                        {renderCell(col)}
                    </React.Fragment>
                ))}
                <div className="task-cell actions-cell" style={{ width: 50, position: 'relative', overflow: 'visible' }}>
                    <button
                        className="icon-btn-ghost"
                        style={{ zIndex: 10, position: 'relative' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isMenuOpen) {
                                onCloseMenu();
                            } else {
                                onOpenMenu(task.id, e.currentTarget);
                            }
                        }}
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    {isMenuOpen && (
                        <TaskOptionsMenu
                            taskId={task.id}
                            onClose={onCloseMenu}
                            onRename={() => { onTaskClick(task.id); onCloseMenu(); }}
                            onDuplicate={() => onDuplicate(task.id)}
                            onArchive={() => onArchive(task.id)}
                            onDelete={() => onDelete(task.id)}
                            onConvertToDoc={() => onConvertToDoc(task)}
                            onStartTimer={onStartTimer}
                            triggerElement={menuTrigger}
                            mousePos={menuMousePos}
                        />
                    )}
                </div>
            </div>

            {((hasSubtasks && isExpanded) || isAddingSubtask) && (
                <div className="subtasks-container">
                    {task.subtasks?.map(st => (
                        <SubtaskRowItem
                            key={st.id}
                            task={st}
                            columns={columns}
                            onTaskClick={onTaskClick}
                            getPriorityColor={getPriorityColor}
                            getDateStatus={getDateStatus}
                            tags={tags}
                            onUpdateSubtask={onUpdateSubtask}
                            parentId={task.id}
                            activePopover={activePopover}
                            setActivePopover={setActivePopover}
                            onOpenMenu={onOpenMenu}
                            isMenuOpen={openMenuTaskId === st.id}
                            onCloseMenu={onCloseMenu}
                            menuTrigger={menuTrigger}
                            menuMousePos={menuMousePos}
                            onDeleteSubtask={onDeleteSubtask}
                            isTableMode={isTableMode}
                        />

                    ))}
                    {isAddingSubtask && (
                        <div className="task-item-row subtask-item-row">
                            <div className="drag-handle-placeholder sticky-column drag-handle-sticky" style={{ width: 30 }}></div>
                            {isTableMode && <div className="task-cell index-cell sticky-column index-cell-sticky" style={{ width: 50 }}></div>}
                            {columns.filter(c => c.visible).map(col => {
                                if (col.id === 'name') {
                                    return (
                                        <div key={col.id} className="task-cell name-cell sticky-column" style={{
                                            width: col.width,
                                            flex: (!col.width && col.id === 'name') ? 1 : 'none',
                                            minWidth: col.id === 'name' ? 'unset' : undefined,
                                            overflow: 'visible', paddingLeft: '48px',
                                            left: 30 + (isTableMode ? 50 : 0)
                                        }}>
                                            <div className="task-cell-inner" style={{ overflow: 'visible' }}>
                                                <div className="subtask-indent-line"></div>
                                                <input
                                                    ref={newSubtaskInputRef}
                                                    type="text"
                                                    className="task-name-input"
                                                    placeholder="Enter subtask name..."
                                                    value={newSubtaskName}
                                                    onChange={e => setNewSubtaskName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleSubtaskSubmit();
                                                        if (e.key === 'Escape') { setIsAddingSubtask(false); setNewSubtaskName(''); }
                                                        e.stopPropagation();
                                                    }}
                                                    onBlur={() => handleSubtaskSubmit()}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ flex: 1, border: '1px solid var(--primary)', borderRadius: 4, padding: '4px 8px', fontSize: 13, height: 28, background: 'var(--bg-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                        </div>
                                    );
                                }
                                return <div key={col.id} className={`task-cell ${col.id}-cell`} style={{ width: col.width }}></div>
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
const ListView: React.FC<ListViewProps> = ({ onAddTask, onTaskClick, isTableMode }) => {
    const {
        tasks,
        currentSpaceId,
        currentListId,
        addDoc,
        columnSettings,
        setColumnSettings,
        tags,
        addTag,
        updateTag,
        deleteTag,
        startTimer,
        updateSubtask,
        deleteSubtask,
        addStatus,
        spaces,
        lists,
        updateTask,
        deleteTask,
        duplicateTask,
        archiveTask,
        updateSpace,
        updateList,
        addSubtask
    } = useAppStore();
    const { user } = useAuthStore();
    const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());
    const [openMenuTaskId, setOpenMenuTaskId] = React.useState<string | null>(null);
    const [menuTrigger, setMenuTrigger] = React.useState<HTMLElement | null>(null);
    const [menuMousePos, setMenuMousePos] = React.useState<{ x: number, y: number } | null>(null);
    const [activePopover, setActivePopover] = React.useState<ActivePopover | null>(null);
    const [isAddingGroup, setIsAddingGroup] = React.useState(false);
    const [newGroupName, setNewGroupName] = React.useState('');
    const [isStatusEditorOpen, setIsStatusEditorOpen] = React.useState(false);
    const [groupBy, setGroupBy] = React.useState<'status' | 'none'>(isTableMode ? 'none' : 'status');
    const [isCreateFieldOpen, setIsCreateFieldOpen] = React.useState(false);

    const handleAddField = (field: { id: string; name: string; type: string; metadata?: any }) => {
        const targetId = currentListId || currentSpaceId;
        const currentCols = columnSettings[targetId] || columnSettings['default'] || [];

        const newCols: ColumnSetting[] = [...currentCols, {
            id: field.id + '_' + Date.now(),
            name: field.name,
            visible: true,
            width: 150,
            type: field.type,
            calculationType: (field.type === 'number' ? 'sum' : 'none') as ColumnSetting['calculationType'],
            options: field.metadata?.options,
            currency: field.metadata?.currency,
            decimals: field.metadata?.decimals
        }];

        setColumnSettings(targetId, newCols);
        setIsCreateFieldOpen(false);
    };

    const handleColumnRename = (columnId: string, newName: string) => {
        const targetId = currentListId || currentSpaceId;
        const currentCols = columnSettings[targetId] || columnSettings['default'] || [];
        const newCols = currentCols.map(c => c.id === columnId ? { ...c, name: newName } : c);
        setColumnSettings(targetId, newCols);
    };

    const handleColumnCalculationChange = (columnId: string, calcType: ColumnSetting['calculationType']) => {
        const targetId = currentListId || currentSpaceId;
        const currentCols = columnSettings[targetId] || columnSettings['default'] || [];
        const newCols = currentCols.map(c => c.id === columnId ? { ...c, calculationType: calcType } : c);
        setColumnSettings(targetId, newCols);
    };

    React.useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenuTaskId(null);
            setMenuTrigger(null);
            setMenuMousePos(null);
            setActivePopover(null);
        };
        // Only attach if menu or popover is open
        if (openMenuTaskId || activePopover) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [openMenuTaskId, activePopover]);

    const toggleGroup = (status: string) => {
        const newCollapsed = new Set(collapsedGroups);
        if (newCollapsed.has(status)) {
            newCollapsed.delete(status);
        } else {
            newCollapsed.add(status);
        }
        setCollapsedGroups(newCollapsed);
    };

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

    const [columnContextMenu, setColumnContextMenu] = React.useState<{
        x: number;
        y: number;
        columnId: string;
    } | null>(null);

    const handleColumnContextMenu = (e: React.MouseEvent, columnId: string) => {
        setColumnContextMenu({
            x: e.clientX,
            y: e.clientY,
            columnId
        });
    };

    const activeColumns = useMemo(() => {
        const targetId = currentListId || currentSpaceId;
        return columnSettings[targetId] || columnSettings['default'] || [];
    }, [columnSettings, currentListId, currentSpaceId]);

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

    const activeSpace = spaces.find(s => s.id === currentSpaceId);

    const activeList = lists.find(l => l.id === currentListId);

    const activeStatuses: Status[] = activeList?.statuses || activeSpace?.statuses || DEFAULT_STATUSES;

    const handleConfirmAddGroup = () => {
        if (!newGroupName.trim()) {
            setIsAddingGroup(false);
            return;
        }

        const targetId = (currentListId || currentSpaceId);
        const isSpace = !currentListId;

        addStatus(targetId, isSpace, {
            name: newGroupName.trim().toUpperCase(),
            color: '#64748b',
            type: 'inprogress'
        });

        setNewGroupName('');
        setIsAddingGroup(false);
    };

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return '#64748b';
        }
    };

    const getDateStatus = (dateStr?: string) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        if (isPast(date) && !isToday(date)) return 'overdue';
        if (isToday(date)) return 'today';
        return 'upcoming';
    };


    const handleTaskDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Status group dropping
        if (activeStatuses.some(s => s.name === overId)) {
            updateTask(activeId, { status: overId as Task['status'] });
            return;
        }

        // Row reordering or status change via row drop
        const overTask = tasks.find(t => t.id === overId);
        const activeTask = tasks.find(t => t.id === activeId);

        if (activeTask && overTask && activeTask.status !== overTask.status) {
            updateTask(activeId, { status: overTask.status });
        }
    };

    const handleColumnDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = activeColumns.findIndex(c => c.id === active.id);
        const newIndex = activeColumns.findIndex(c => c.id === over.id);

        const newColumns = arrayMove(activeColumns, oldIndex, newIndex);
        const targetId = currentListId || currentSpaceId || 'default';
        setColumnSettings(targetId, newColumns);
    };



    const handleSaveStatuses = (newStatuses: Status[]) => {
        const targetId = currentListId || currentSpaceId;
        const isSpace = !currentListId;

        if (isSpace) {
            updateSpace(targetId, { statuses: newStatuses });
        } else {
            updateList(targetId, { statuses: newStatuses });
        }
    };

    const handleColumnResize = (e: React.PointerEvent, columnId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.pageX;
        const column = activeColumns.find(c => c.id === columnId);
        if (!column) return;

        // Get actual current width from DOM to avoid jumping
        const headerCell = (e.currentTarget as HTMLElement).parentElement;
        const startWidth = headerCell ? headerCell.getBoundingClientRect().width : (column.width || 150);

        const onPointerMove = (moveEvent: PointerEvent) => {
            const delta = moveEvent.pageX - startX;
            const minWidth = columnId === 'name' ? 200 : 50;
            const newWidth = Math.max(minWidth, startWidth + delta);

            const newColumns = activeColumns.map(c =>
                c.id === columnId ? { ...c, width: newWidth } : c
            );
            const targetId = currentListId || currentSpaceId || 'default';
            setColumnSettings(targetId, newColumns);
        };

        const onPointerUp = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <div className="view-container list-view">
            <ViewHeader />

            <div className="toolbar" style={{ marginBottom: 24 }}>
                <div className="toolbar-left">
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}><Filter size={14} /> Filter</button>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}><ArrowUpDown size={14} /> Sort</button>
                    <button
                        className="btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '13px', background: groupBy === 'none' ? 'var(--bg-active)' : undefined }}
                        onClick={() => setGroupBy(prev => prev === 'status' ? 'none' : 'status')}
                    >
                        Group: {groupBy === 'status' ? 'Status' : 'None'}
                    </button>
                </div>
                <div className="toolbar-right">
                    <div className="toolbar-search">
                        <Search size={14} />
                        <input type="text" placeholder="Search tasks..." readOnly />
                    </div>
                    <button className="btn-primary" onClick={onAddTask} style={{ padding: '8px 16px' }}>
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>

            <div className="list-table-container">
                {/* Column Headers */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragEnd={handleColumnDragEnd}
                >
                    <div className="list-table-header">
                        <div className="drag-handle-placeholder sticky-column-header sticky-column drag-handle-sticky"></div>
                        {isTableMode && <div className="column-header-cell sticky-column-header sticky-column index-cell-sticky" style={{ width: 50, borderRight: '1px solid var(--border)' }}></div>}
                        <SortableContext
                            items={activeColumns.filter(c => c.visible).map(c => c.id)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {activeColumns.filter(c => c.visible).map(col => (
                                <SortableColumnHeader
                                    key={col.id}
                                    column={col}
                                    onResize={handleColumnResize}
                                    onRename={handleColumnRename}
                                    onContextMenu={handleColumnContextMenu}
                                    isTableMode={isTableMode}
                                />
                            ))}
                        </SortableContext>
                        <button
                            className="column-header-cell add-column-btn"
                            style={{
                                width: 50,
                                borderLeft: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                borderRight: 'none',
                                padding: 0
                            }}
                            onClick={() => setIsCreateFieldOpen(true)}
                            title="Add a Column"
                        >
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                border: '1px solid var(--border-strong)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-tertiary)',
                                background: 'var(--bg-surface)'
                            }}>
                                <Plus size={14} />
                            </div>
                        </button>
                    </div>
                </DndContext>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragEnd={handleTaskDragEnd}
                >
                    <div className="list-body">
                        {/* Flat List (Group: None) */}
                        {groupBy === 'none' && (
                            <SortableContext
                                items={filteredTasks.map(t => t.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="task-list">
                                    {filteredTasks.map((task, index) => (
                                        <SortableRow
                                            key={task.id}
                                            rowIndex={index + 1}
                                            isTableMode={isTableMode}
                                            task={task}
                                            columns={activeColumns}
                                            onTaskClick={onTaskClick}
                                            getPriorityColor={getPriorityColor}
                                            getDateStatus={getDateStatus}
                                            tags={tags}
                                            onOpenMenu={(id, trigger, mousePos) => {
                                                setOpenMenuTaskId(id);
                                                setMenuTrigger(trigger);
                                                setMenuMousePos(mousePos || null);
                                            }}
                                            isMenuOpen={openMenuTaskId === task.id}
                                            onCloseMenu={() => {
                                                setOpenMenuTaskId(null);
                                                setMenuTrigger(null);
                                                setMenuMousePos(null);
                                            }}
                                            onDuplicate={duplicateTask}
                                            onArchive={archiveTask}
                                            onDelete={deleteTask}
                                            onConvertToDoc={handleConvertToDoc}
                                            onUpdateTask={updateTask}
                                            activePopover={activePopover}
                                            setActivePopover={setActivePopover}
                                            onAddTag={addTag}
                                            onUpdateTag={updateTag}
                                            onDeleteTag={deleteTag}
                                            onStartTimer={() => {
                                                startTimer(task.id);
                                                setOpenMenuTaskId(null);
                                                setMenuTrigger(null);
                                            }}
                                            onUpdateSubtask={updateSubtask}
                                            onAddSubtask={(taskId, name) => addSubtask(taskId, { name, status: 'TO DO' })}
                                            onDeleteSubtask={deleteSubtask}
                                            openMenuTaskId={openMenuTaskId}
                                            menuTrigger={menuTrigger}
                                            menuMousePos={menuMousePos}
                                        />
                                    ))}
                                    <CalculationRow
                                        columns={activeColumns}
                                        tasks={filteredTasks}
                                        onCalculationChange={handleColumnCalculationChange}
                                        isTableMode={isTableMode}
                                    />
                                </div>
                            </SortableContext>
                        )}

                        {groupBy === 'status' && activeStatuses.map(statusObj => {
                            const statusTasks = filteredTasks.filter(t =>
                                t.status.toLowerCase() === statusObj.name.toLowerCase() ||
                                t.status === statusObj.id
                            );



                            if (statusTasks.length === 0) return null;

                            return (
                                <div key={statusObj.id} className="status-group-container">
                                    <DroppableStatusHeader
                                        status={statusObj.name}
                                        color={statusObj.color}
                                        count={statusTasks.length}
                                        isCollapsed={collapsedGroups.has(statusObj.name)}
                                        onToggle={() => toggleGroup(statusObj.name)}
                                    />
                                    {!collapsedGroups.has(statusObj.name) && (
                                        <SortableContext
                                            items={statusTasks.map(t => t.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="task-list">
                                                {statusTasks.map((task, index) => (
                                                    <SortableRow
                                                        key={task.id}
                                                        rowIndex={index + 1}
                                                        isTableMode={isTableMode}
                                                        task={task}
                                                        columns={activeColumns}
                                                        onTaskClick={onTaskClick}
                                                        // ... continuing existing props
                                                        getPriorityColor={getPriorityColor}
                                                        getDateStatus={getDateStatus}
                                                        tags={tags}
                                                        onOpenMenu={(id, trigger, mousePos) => {
                                                            setOpenMenuTaskId(id);
                                                            setMenuTrigger(trigger);
                                                            setMenuMousePos(mousePos || null);
                                                        }}
                                                        isMenuOpen={openMenuTaskId === task.id}
                                                        onCloseMenu={() => {
                                                            setOpenMenuTaskId(null);
                                                            setMenuTrigger(null);
                                                            setMenuMousePos(null);
                                                        }}
                                                        onDuplicate={duplicateTask}
                                                        onArchive={archiveTask}
                                                        onDelete={deleteTask}
                                                        onConvertToDoc={handleConvertToDoc}
                                                        onUpdateTask={updateTask}
                                                        activePopover={activePopover}
                                                        setActivePopover={setActivePopover}
                                                        onAddTag={addTag}
                                                        onUpdateTag={updateTag}
                                                        onDeleteTag={deleteTag}
                                                        onStartTimer={() => {
                                                            startTimer(task.id);
                                                            setOpenMenuTaskId(null);
                                                            setMenuTrigger(null);
                                                            setMenuMousePos(null);
                                                        }}
                                                        onUpdateSubtask={updateSubtask}
                                                        onAddSubtask={(taskId, name) => addSubtask(taskId, { name, status: 'TO DO' })}
                                                        onDeleteSubtask={deleteSubtask}
                                                        openMenuTaskId={openMenuTaskId}
                                                        menuTrigger={menuTrigger}
                                                        menuMousePos={menuMousePos}
                                                    />
                                                ))}
                                                <CalculationRow
                                                    columns={activeColumns}
                                                    tasks={statusTasks}
                                                    onCalculationChange={handleColumnCalculationChange}
                                                    isTableMode={isTableMode}
                                                />
                                                <button className="btn-inline-add" onClick={onAddTask}>
                                                    <div className="btn-inline-add-inner">
                                                        <Plus size={14} /> New Task
                                                    </div>
                                                </button>
                                            </div>
                                        </SortableContext>
                                    )}
                                </div>
                            );
                        })}

                        {/* Uncategorized Tasks Logic (Only show if Group By Status) */}
                        {groupBy === 'status' && (() => {
                            const uncategorizedTasks = filteredTasks.filter(t =>
                                !activeStatuses.some(s =>
                                    t.status.toLowerCase() === s.name.toLowerCase() ||
                                    t.status === s.id
                                )
                            );
                            // ... existing logic for uncategorized
                            if (uncategorizedTasks.length === 0) return null;

                            return (
                                <div className="status-group-container">
                                    <DroppableStatusHeader
                                        status="UNCATEGORIZED"
                                        color="#94a3b8"
                                        count={uncategorizedTasks.length}
                                        isCollapsed={collapsedGroups.has('UNCATEGORIZED')}
                                        onToggle={() => toggleGroup('UNCATEGORIZED')}
                                    />
                                    {!collapsedGroups.has('UNCATEGORIZED') && (
                                        <div className="task-list">
                                            {uncategorizedTasks.map((task, index) => (
                                                <SortableRow
                                                    key={task.id}
                                                    rowIndex={index + 1}
                                                    isTableMode={isTableMode}
                                                    task={task}
                                                    columns={activeColumns}
                                                    onTaskClick={onTaskClick}
                                                    getPriorityColor={getPriorityColor}
                                                    getDateStatus={getDateStatus}
                                                    tags={tags}
                                                    onOpenMenu={(id, trigger, mousePos) => {
                                                        setOpenMenuTaskId(id);
                                                        setMenuTrigger(trigger);
                                                        setMenuMousePos(mousePos || null);
                                                    }}
                                                    isMenuOpen={openMenuTaskId === task.id}
                                                    onCloseMenu={() => {
                                                        setOpenMenuTaskId(null);
                                                        setMenuTrigger(null);
                                                        setMenuMousePos(null);
                                                    }}
                                                    onDuplicate={duplicateTask}
                                                    onArchive={archiveTask}
                                                    onDelete={deleteTask}
                                                    onConvertToDoc={handleConvertToDoc}
                                                    onUpdateTask={updateTask}
                                                    activePopover={activePopover}
                                                    setActivePopover={setActivePopover}
                                                    onAddTag={addTag}
                                                    onUpdateTag={updateTag}
                                                    onDeleteTag={deleteTag}
                                                    onStartTimer={() => {
                                                        startTimer(task.id);
                                                        setOpenMenuTaskId(null);
                                                        setMenuTrigger(null);
                                                        setMenuMousePos(null);
                                                    }}
                                                    onUpdateSubtask={updateSubtask}
                                                    onAddSubtask={(taskId, name) => addSubtask(taskId, { name, status: 'TO DO' })}
                                                    onDeleteSubtask={deleteSubtask}
                                                    openMenuTaskId={openMenuTaskId}
                                                    menuTrigger={menuTrigger}
                                                    menuMousePos={menuMousePos}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="add-group-container">
                            {isAddingGroup ? (
                                <div className="add-group-input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="form-input"
                                        style={{ height: '36px', fontSize: '13px' }}
                                        placeholder="Group name..."
                                        value={newGroupName}
                                        onChange={(e) => setNewGroupName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleConfirmAddGroup();
                                            if (e.key === 'Escape') setIsAddingGroup(false);
                                        }}
                                        onBlur={() => {
                                            // Delay slightly to allow click on confirm button
                                            setTimeout(() => {
                                                // Optional: auto-save on blur or cancel
                                                // setIsAddingGroup(false);
                                            }, 200);
                                        }}
                                    />
                                    <button className="btn-primary" onClick={handleConfirmAddGroup}>Add</button>
                                    <button className="icon-btn-ghost" onClick={() => setIsAddingGroup(false)}><Plus size={16} style={{ transform: 'rotate(45deg)' }} /></button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                                    <button
                                        className="btn-add-group"
                                        onClick={() => setIsAddingGroup(true)}
                                    >
                                        <Plus size={14} /> Add Group
                                    </button>
                                    <button
                                        className="btn-add-group"
                                        style={{ width: 'auto', padding: '10px' }}
                                        onClick={() => setIsStatusEditorOpen(true)}
                                        title="Manage Statuses"
                                    >
                                        <Settings2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </DndContext>
            </div>

            {isStatusEditorOpen && (
                <StatusEditorModal
                    isOpen={isStatusEditorOpen}
                    onClose={() => setIsStatusEditorOpen(false)}
                    currentStatuses={activeStatuses}
                    onSave={handleSaveStatuses}
                />
            )}
            {isCreateFieldOpen && (
                <div className="create_field_sidebar_container">
                    <CreateFieldSidebar
                        onClose={() => setIsCreateFieldOpen(false)}
                        onAddField={handleAddField}
                    />
                </div>
            )}

            {columnContextMenu && (
                <ContextMenu
                    x={columnContextMenu.x}
                    y={columnContextMenu.y}
                    onClose={() => setColumnContextMenu(null)}
                    items={[
                        { label: 'Sort', icon: <ArrowUpDown size={14} />, onClick: () => { } },
                        { label: 'Sort entire column', icon: <ArrowDownWideNarrow size={14} />, onClick: () => { } },
                        { divider: true },
                        { label: 'Edit field', icon: <Settings2 size={14} />, onClick: () => { } },
                        { label: 'Privacy and permissions', icon: <Lock size={14} />, onClick: () => { } },
                        { divider: true },
                        {
                            label: 'Move to start', icon: <ArrowLeftToLine size={14} />, onClick: () => {
                                const targetId = currentListId || currentSpaceId;
                                const colToMove = activeColumns.find(c => c.id === columnContextMenu.columnId);
                                if (!colToMove) return;
                                const otherCols = activeColumns.filter(c => c.id !== columnContextMenu.columnId);
                                setColumnSettings(targetId, [colToMove, ...otherCols]);
                            }
                        },
                        {
                            label: 'Move to end', icon: <ArrowRightToLine size={14} />, onClick: () => {
                                const targetId = currentListId || currentSpaceId;
                                const colToMove = activeColumns.find(c => c.id === columnContextMenu.columnId);
                                if (!colToMove) return;
                                const otherCols = activeColumns.filter(c => c.id !== columnContextMenu.columnId);
                                setColumnSettings(targetId, [...otherCols, colToMove]);
                            }
                        },
                        { label: 'Automate', icon: <Zap size={14} />, onClick: () => { } },
                        { divider: true },
                        {
                            label: 'Hide column', icon: <EyeOff size={14} />, onClick: () => {
                                const targetId = currentListId || currentSpaceId;
                                const newCols = activeColumns.map(c =>
                                    c.id === columnContextMenu.columnId ? { ...c, visible: false } : c
                                );
                                setColumnSettings(targetId, newCols);
                            }
                        },
                        {
                            label: 'Duplicate', icon: <Copy size={14} />, onClick: () => {
                                const targetId = currentListId || currentSpaceId;
                                const colToDup = activeColumns.find(c => c.id === columnContextMenu.columnId);
                                if (!colToDup) return;
                                const newCol = { ...colToDup, id: colToDup.id + '_copy' + Date.now(), name: colToDup.name + ' (Copy)' };
                                const oldIndex = activeColumns.findIndex(c => c.id === columnContextMenu.columnId);
                                const newCols = [...activeColumns];
                                newCols.splice(oldIndex + 1, 0, newCol);
                                setColumnSettings(targetId, newCols);
                            }
                        },
                        {
                            label: 'Delete field', icon: <Trash2 size={14} />, danger: true, onClick: () => {
                                const targetId = currentListId || currentSpaceId;
                                const newCols = activeColumns.filter(c => c.id !== columnContextMenu.columnId);
                                setColumnSettings(targetId, newCols);
                            }
                        },
                    ]}
                />
            )}
        </div>
    );
};

const DroppableStatusHeader: React.FC<{
    status: string,
    color: string,
    count: number,
    isCollapsed: boolean,
    onToggle: () => void
}> = ({ status, color, count, isCollapsed, onToggle }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });

    return (
        <div
            ref={setNodeRef}
            className={`status-header ${isOver ? 'drag-over' : ''} ${isCollapsed ? 'collapsed' : ''}`}
            onClick={onToggle}
        >
            <div className="status-header-inner">
                <ChevronRight size={16} className={`expand-icon ${!isCollapsed ? 'expanded' : ''}`} />
                <span className="status-dot" style={{ backgroundColor: color }}></span>
                <span className="status-name">{status}</span>
                <span className="status-count">{count}</span>
            </div>
        </div>
    );
};

export default ListView;
