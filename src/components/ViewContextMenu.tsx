import React, { useState, useEffect } from 'react';
import {
    Pencil,
    Link,
    Star,
    Settings,
    Pin,
    Lock,
    Shield,
    Save,
    Home,
    Download,
    FileText,
    FolderInput,
    Copy,
    Trash2,
    Share2,
    ChevronRight
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { SavedView } from '../types';
import ConfirmDialog from './ConfirmDialog';
import '../styles/ViewContextMenu.css';

interface ViewContextMenuProps {
    view: SavedView;
    position: { x: number; y: number };
    onClose: () => void;
}

const ViewContextMenu: React.FC<ViewContextMenuProps> = ({ view, position, onClose }) => {
    const { updateSavedView } = useAppStore();
    const [showRenameInput, setShowRenameInput] = useState(false);
    const [newName, setNewName] = useState(view.name);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        // Don't add click-outside listener if confirm dialog is showing
        if (showDeleteConfirm) {
            return;
        }

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // Don't close if clicking inside the menu
            if (!target.closest('.view-context-menu')) {
                onClose();
            }
        };

        // Delay adding the listener to prevent immediate closure
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside, true);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside, true);
        };
    }, [onClose, showDeleteConfirm]);

    const handleRename = () => {
        if (newName.trim() && newName !== view.name) {
            updateSavedView(view.id, { name: newName.trim() });
        }
        setShowRenameInput(false);
        onClose();
    };

    const handleToggle = (field: 'isPinned' | 'isPrivate') => {
        updateSavedView(view.id, { [field]: !view[field] });
    };

    const handleDuplicate = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        const { addSavedView } = useAppStore.getState();
        addSavedView({
            name: `${view.name} (Copy)`,
            viewType: view.viewType,
            spaceId: view.spaceId,
            listId: view.listId,
            isPinned: false,
            isPrivate: view.isPrivate
        });
        onClose();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        // Prevent deletion of default views
        const defaultViewIds = ['default-list', 'default-kanban', 'default-calendar', 'default-gantt'];
        if (defaultViewIds.includes(view.id)) {
            alert('Cannot delete default views. You can create custom views instead.');
            onClose();
            return;
        }

        // Show custom confirm dialog
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        try {
            const { deleteSavedView: deleteFunc } = useAppStore.getState();
            deleteFunc(view.id);
            setShowDeleteConfirm(false);
            onClose();
        } catch (error) {
            console.error('Error deleting view:', error);
            alert('Failed to delete view. Please try again.');
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    const handleCopyLink = () => {
        // In a real app, this would copy a shareable link
        navigator.clipboard.writeText(`${window.location.origin}?view=${view.id}`);
        onClose();
    };

    if (showRenameInput) {
        return (
            <div className="view-context-menu" style={{ top: position.y, left: position.x }}>
                <div className="rename-input-container">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename();
                            if (e.key === 'Escape') {
                                setShowRenameInput(false);
                                onClose();
                            }
                        }}
                        autoFocus
                        onBlur={handleRename}
                    />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="view-context-menu" style={{ top: position.y, left: position.x }}>
                <button className="menu-item" onClick={() => setShowRenameInput(true)}>
                    <Pencil size={16} />
                    <span>Rename</span>
                </button>

                <button className="menu-item" onClick={handleCopyLink}>
                    <Link size={16} />
                    <span>Copy link to view</span>
                </button>

                <button className="menu-item">
                    <Star size={16} />
                    <span>Add to favorites</span>
                </button>

                <button className="menu-item">
                    <Settings size={16} />
                    <span>Customize view</span>
                </button>

                <div className="menu-divider"></div>

                <button className="menu-item toggle-item" onClick={() => handleToggle('isPinned')}>
                    <Pin size={16} />
                    <span>Pin view</span>
                    <div className={`toggle-switch ${view.isPinned ? 'active' : ''}`}>
                        <div className="toggle-slider"></div>
                    </div>
                </button>

                <button className="menu-item toggle-item" onClick={() => handleToggle('isPrivate')}>
                    <Lock size={16} />
                    <span>Private view</span>
                    <div className={`toggle-switch ${view.isPrivate ? 'active' : ''}`}>
                        <div className="toggle-slider"></div>
                    </div>
                </button>

                <button className="menu-item toggle-item">
                    <Shield size={16} />
                    <span>Protect view</span>
                    <div className="toggle-switch">
                        <div className="toggle-slider"></div>
                    </div>
                </button>

                <button className="menu-item toggle-item">
                    <Save size={16} />
                    <span>Autosave for me</span>
                    <div className="toggle-switch">
                        <div className="toggle-slider"></div>
                    </div>
                </button>

                <button className="menu-item toggle-item">
                    <Home size={16} />
                    <span>Set as default view</span>
                    <div className="toggle-switch">
                        <div className="toggle-slider"></div>
                    </div>
                </button>

                <div className="menu-divider"></div>

                <button className="menu-item submenu-item">
                    <Download size={16} />
                    <span>Export view</span>
                    <ChevronRight size={14} className="submenu-arrow" />
                </button>

                <button className="menu-item submenu-item">
                    <FileText size={16} />
                    <span>Templates</span>
                    <ChevronRight size={14} className="submenu-arrow" />
                </button>

                <button className="menu-item submenu-item">
                    <FolderInput size={16} />
                    <span>Move</span>
                    <ChevronRight size={14} className="submenu-arrow" />
                </button>

                <button className="menu-item" onClick={handleDuplicate}>
                    <Copy size={16} />
                    <span>Duplicate view</span>
                </button>

                <div className="menu-divider"></div>

                <button className="menu-item danger" onClick={handleDelete}>
                    <Trash2 size={16} />
                    <span>Delete view</span>
                </button>

                <div className="menu-divider"></div>

                <button className="menu-item primary-action">
                    <Share2 size={16} />
                    <span>Sharing & Permissions</span>
                </button>
            </div>

            {showDeleteConfirm && (
                <ConfirmDialog
                    title="Delete View"
                    message={`Are you sure you want to delete "${view.name}"? This action cannot be undone.`}
                    confirmLabel="Delete"
                    cancelLabel="Cancel"
                    onConfirm={handleConfirmDelete}
                    onCancel={handleCancelDelete}
                    danger
                />
            )}
        </>
    );
};

export default ViewContextMenu;
