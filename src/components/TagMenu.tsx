import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, MoreHorizontal, X, Trash2, Check } from 'lucide-react';
import { type Tag } from '../types';
import '../styles/TagMenu.css';

interface TagMenuProps {
    tags: Tag[];
    selectedTagIds: string[];
    onToggleTag: (tagId: string) => void;
    onCreateTag: (tag: Omit<Tag, 'id'>) => void;
    onUpdateTag: (tagId: string, updates: Partial<Tag>) => void;
    onDeleteTag: (tagId: string) => void;
    onClose: () => void;
    triggerElement?: HTMLElement | null;
}

const COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#10b981',
    '#3b82f6', '#8b5cf6', '#ec4899', '#64748b',
    '#71717a', '#a1a1aa'
];

const TagMenu: React.FC<TagMenuProps> = ({
    tags,
    selectedTagIds,
    onToggleTag,
    onCreateTag,
    onUpdateTag,
    onDeleteTag,
    onClose,
    triggerElement
}) => {
    const [search, setSearch] = useState('');
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    // Creation state
    const [isCreating, setIsCreating] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);

    const menuRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

    React.useLayoutEffect(() => {
        if (!menuRef.current) return;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const menuWidth = 240; // Default width for tag menu

        if (triggerElement) {
            const rect = triggerElement.getBoundingClientRect();
            const menuHeight = menuRef.current.offsetHeight;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 10001,
                width: `${menuWidth}px`,
                visibility: 'visible'
            };

            // Horizontal positioning
            let left = rect.left;
            if (left + menuWidth > viewportWidth - 10) left = viewportWidth - menuWidth - 10;
            if (left < 10) left = 10;
            newStyle.left = `${left}px`;

            // Vertical positioning
            if (rect.bottom + menuHeight + 10 > viewportHeight && rect.top > menuHeight + 10) {
                newStyle.bottom = `${viewportHeight - rect.top + 8}px`;
                newStyle.top = 'auto';
            } else {
                newStyle.top = `${rect.bottom + 8}px`;
            }

            setStyle(newStyle);
        } else {
            const rect = menuRef.current.getBoundingClientRect();
            const newStyle: React.CSSProperties = { visibility: 'visible' };

            // Vertical adjustment
            if (rect.bottom > viewportHeight) {
                newStyle.top = 'auto';
                newStyle.bottom = '100%';
                newStyle.marginTop = '0';
                newStyle.marginBottom = '8px';
            }

            // Horizontal adjustment
            if (rect.right > viewportWidth) {
                newStyle.right = '0';
                newStyle.left = 'auto';
            } else if (rect.left < 0) {
                newStyle.left = '0';
                newStyle.right = 'auto';
            }

            setStyle(newStyle);
        }
    }, [triggerElement, tags.length, isCreating, editingTagId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const filteredTags = tags.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const startEditing = (tag: Tag, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTagId(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
    };

    const saveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingTagId && editName.trim()) {
            onUpdateTag(editingTagId, { name: editName, color: editColor });
            setEditingTagId(null);
        }
    };

    const cancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingTagId(null);
    };

    const confirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingTagId) {
            onDeleteTag(editingTagId);
            setEditingTagId(null);
        }
    };

    const handleCreate = () => {
        if (newTagName.trim()) {
            onCreateTag({ name: newTagName, color: newTagColor });
            setNewTagName('');
            setIsCreating(false);
            setSearch(''); // Clear search if filtered
        }
    };

    const content = (
        <div className="tag-menu-dropdown" ref={menuRef} style={style} onClick={e => e.stopPropagation()}>
            <div className="tag-menu-header">
                <Search size={14} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search or create tags..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                    }}
                    autoFocus
                />
            </div>

            <div className="tag-list-content">
                {filteredTags.length === 0 && search && (
                    <div className="no-tags-found" onClick={() => { setIsCreating(true); setNewTagName(search); }}>
                        <span>Create "{search}"</span>
                        <div className="tag-preview-badge" style={{ backgroundColor: newTagColor }}>{search}</div>
                    </div>
                )}

                {filteredTags.map(tag => {
                    const isEditing = editingTagId === tag.id;
                    const isSelected = selectedTagIds.includes(tag.id);

                    if (isEditing) {
                        return (
                            <div key={tag.id} className="tag-edit-row">
                                <div className="tag-edit-inputs">
                                    <div className="color-picker-trigger" style={{ backgroundColor: editColor }}>
                                        <input
                                            type="color"
                                            className="color-input-hidden"
                                            value={editColor}
                                            onChange={e => setEditColor(e.target.value)}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className="edit-name-input"
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                    />
                                </div>
                                <div className="tag-edit-actions">
                                    <button className="action-btn save" onClick={saveEdit}><Check size={18} /></button>
                                    <button className="action-btn delete" onClick={confirmDelete}><Trash2 size={18} /></button>
                                    <button className="action-btn cancel" onClick={cancelEdit}><X size={18} /></button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={tag.id}
                            className={`tag-item-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => onToggleTag(tag.id)}
                        >
                            <div className="tag-checkbox">
                                {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span
                                className="tag-pill-display"
                                style={{
                                    backgroundColor: tag.color + '20',
                                    color: tag.color,
                                    borderColor: tag.color + '40'
                                }}
                            >
                                <span className="dot" style={{ backgroundColor: tag.color }}></span>
                                {tag.name}
                            </span>
                            <button
                                className="edit-tag-btn"
                                onClick={(e) => startEditing(tag, e)}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="tag-menu-footer">
                {!isCreating ? (
                    <button className="create-new-btn" onClick={() => setIsCreating(true)}>
                        <Plus size={14} /> Create new tag
                    </button>
                ) : (
                    <div className="create-tag-form">
                        <div className="create-form-header">
                            <span>New Tag</span>
                            <button onClick={() => setIsCreating(false)}><X size={14} /></button>
                        </div>
                        <div className="create-input-row">
                            <div className="color-picker-trigger" style={{ backgroundColor: newTagColor }}>
                                <input
                                    type="color"
                                    className="color-input-hidden"
                                    value={newTagColor}
                                    onChange={e => setNewTagColor(e.target.value)}
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Tag name"
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                autoFocus
                            />
                        </div>
                        <div className="color-palette">
                            {COLORS.map(c => (
                                <div
                                    key={c}
                                    className={`color-swatch-mini ${newTagColor === c ? 'active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setNewTagColor(c)}
                                />
                            ))}
                        </div>
                        <button
                            className="btn-save-tag"
                            disabled={!newTagName.trim()}
                            onClick={handleCreate}
                        >
                            Create Tag
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return triggerElement ? createPortal(content, document.body) : content;
};

export default TagMenu;
