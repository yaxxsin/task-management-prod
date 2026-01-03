import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    Plus,
    MoreHorizontal,
    GripVertical,
    Trash2,
    Palette,
    Edit2
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Status } from '../types';
import { generateUUID } from '../utils/uuid';
import '../styles/StatusEditorModal.css';

interface StatusEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentStatuses: Status[];
    onSave: (statuses: Status[]) => void;
}

// Draggable Status Item Component
const SortableStatusItem = ({ status, onUpdate, onDelete }: { status: Status, onUpdate: (id: string, updates: Partial<Status>) => void, onDelete: (id: string) => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: status.id });

    const [showMenu, setShowMenu] = useState(false);
    const [showColorPalette, setShowColorPalette] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
                setShowColorPalette(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#64748b', '#ec4899', '#06b6d4'];

    const handleColorChange = (color: string) => {
        onUpdate(status.id, { color });
        setShowColorPalette(false);
        setShowMenu(false);
    };

    const handleRenameClick = () => {
        setShowMenu(false);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="status-edit-row">
            <div className="status-drag-handle" {...attributes} {...listeners}>
                <GripVertical size={14} />
            </div>

            <div className="status-color-picker" onClick={() => {
                const currentIndex = colors.indexOf(status.color);
                const nextColor = colors[(currentIndex + 1) % colors.length];
                onUpdate(status.id, { color: nextColor });
            }}>
                <div className="status-color-dot" style={{ backgroundColor: status.color }}></div>
            </div>

            <input
                ref={inputRef}
                className="status-name-input"
                value={status.name}
                onChange={(e) => onUpdate(status.id, { name: e.target.value })}
            />

            <div className="status-actions">
                <button
                    type="button"
                    className="icon-btn-ghost-sm"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Direct delete, no confirm needed inside this modal as changes are provisional
                        onDelete(status.id);
                    }}
                >
                    <Trash2 size={14} />
                </button>
                <button
                    type="button"
                    className={`icon-btn-ghost-sm ${showMenu ? 'active' : ''}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(!showMenu);
                    }}
                >
                    <MoreHorizontal size={14} />
                </button>

                {showMenu && (
                    <div className="status-item-menu" ref={menuRef}>
                        {showColorPalette ? (
                            <div className="color-palette-grid">
                                {colors.map(c => (
                                    <div
                                        key={c}
                                        className="color-swatch"
                                        style={{ backgroundColor: c }}
                                        onClick={() => handleColorChange(c)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <>
                                <button className="status-menu-item" onClick={handleRenameClick}>
                                    <Edit2 size={14} />
                                    <span>Rename</span>
                                </button>
                                <button className="status-menu-item" onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPalette(true);
                                }}>
                                    <Palette size={14} />
                                    <span>Change color</span>
                                </button>
                                <div className="menu-divider-h" style={{ margin: '4px 0', borderBottom: '1px solid var(--border)' }}></div>
                                <button className="status-menu-item danger" onClick={() => onDelete(status.id)}>
                                    <Trash2 size={14} />
                                    <span>Delete</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusEditorModal: React.FC<StatusEditorModalProps> = ({ isOpen, onClose, currentStatuses, onSave }) => {
    const [statuses, setStatuses] = useState<Status[]>(JSON.parse(JSON.stringify(currentStatuses)));

    // Group statuses by Type for display
    const activeStatuses = statuses.filter(s => ['todo', 'inprogress'].includes(s.type));
    const doneStatuses = statuses.filter(s => s.type === 'done');
    const closedStatuses = statuses.filter(s => s.type === 'closed');

    // Dnd Sensors
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = statuses.findIndex((s) => s.id === active.id);
            const newIndex = statuses.findIndex((s) => s.id === over?.id);
            setStatuses((items) => arrayMove(items, oldIndex, newIndex));
        }
    };

    const handleUpdateStatus = (id: string, updates: Partial<Status>) => {
        setStatuses(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleDeleteStatus = (id: string) => {
        setStatuses(prev => prev.filter(s => s.id !== id));
    };

    const handleAddStatus = (type: Status['type']) => {
        const newStatus: Status = {
            id: generateUUID(),
            name: 'NEW STATUS',
            color: '#64748b',
            type: type
        };
        setStatuses(prev => [...prev, newStatus]);
    };

    const handleSave = () => {
        onSave(statuses);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay">
            <div className="modal-content status-editor-modal">
                <div className="modal-header">
                    <h2>Edit List statuses</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="status-editor-body">
                    <div className="status-editor-sidebar">
                        <div className="input-group">
                            <label>Status type</label>
                            <label className="radio-option">
                                <input type="radio" name="statusType" disabled />
                                <span>Inherit from Space</span>
                            </label>
                            <label className="radio-option">
                                <input type="radio" name="statusType" defaultChecked />
                                <span>Use custom statuses</span>
                            </label>
                        </div>

                        <div className="input-group">
                            <label>Status template</label>
                            <select className="form-select" disabled>
                                <option>Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="status-editor-main">
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Active Group */}
                            <div className="status-group-section">
                                <div className="group-header">
                                    <span>Active</span>
                                    <button className="icon-btn-ghost-sm" onClick={() => handleAddStatus('inprogress')}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="status-list-frame">
                                    <SortableContext
                                        items={activeStatuses.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {activeStatuses.map(status => (
                                            <SortableStatusItem
                                                key={status.id}
                                                status={status}
                                                onUpdate={handleUpdateStatus}
                                                onDelete={handleDeleteStatus}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                                <button className="add-status-btn-dashed" onClick={() => handleAddStatus('inprogress')}>
                                    <Plus size={14} /> Add status
                                </button>
                            </div>

                            {/* Done Group */}
                            <div className="status-group-section">
                                <div className="group-header">
                                    <span>Done</span>
                                    <button className="icon-btn-ghost-sm" onClick={() => handleAddStatus('done')}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="status-list-frame">
                                    <SortableContext
                                        items={doneStatuses.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {doneStatuses.map(status => (
                                            <SortableStatusItem
                                                key={status.id}
                                                status={status}
                                                onUpdate={handleUpdateStatus}
                                                onDelete={handleDeleteStatus}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                                <button className="add-status-btn-dashed" onClick={() => handleAddStatus('done')}>
                                    <Plus size={14} /> Add status
                                </button>
                            </div>

                            {/* Closed Group */}
                            <div className="status-group-section">
                                <div className="group-header">
                                    <span>Closed</span>
                                    <button className="icon-btn-ghost-sm" onClick={() => handleAddStatus('closed')}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <div className="status-list-frame">
                                    <SortableContext
                                        items={closedStatuses.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {closedStatuses.map(status => (
                                            <SortableStatusItem
                                                key={status.id}
                                                status={status}
                                                onUpdate={handleUpdateStatus}
                                                onDelete={handleDeleteStatus}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>
                                <button className="add-status-btn-dashed" onClick={() => handleAddStatus('closed')}>
                                    <Plus size={14} /> Add status
                                </button>
                            </div>
                        </DndContext>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-text">Save as template</button>
                    <div style={{ flex: 1 }}></div>
                    <button className="btn-primary" onClick={handleSave}>Apply changes</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default StatusEditorModal;
