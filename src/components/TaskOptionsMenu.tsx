import React from 'react';
import { createPortal } from 'react-dom';
import {
    Link2,
    Copy,
    ExternalLink,
    Edit2,
    Repeat,
    Box,
    Copy as DuplicateIcon,
    Clock,
    BellOff,
    Mail,
    Plus,
    GitMerge,
    ArrowRight,
    Play,
    Link as LinkIcon,
    Archive,
    Trash2,
    Shield,
    ChevronRight
} from 'lucide-react';
import RelationshipMenu from './RelationshipMenu';
import '../styles/TaskOptionsMenu.css';

interface TaskOptionsMenuProps {
    onClose: () => void;
    onRename: () => void;
    onDuplicate: () => void;
    onArchive: () => void;
    onDelete: () => void;
    onConvertToDoc?: () => void;
    onStartTimer?: () => void;
    onMove?: () => void;
    taskId: string;
    triggerElement?: HTMLElement | null;
    mousePos?: { x: number; y: number } | null;
}

const TaskOptionsMenu: React.FC<TaskOptionsMenuProps> = ({
    onClose,
    onRename,
    onDuplicate,
    onArchive,
    onDelete,
    onConvertToDoc,
    onStartTimer,
    onMove,
    taskId,
    triggerElement,
    mousePos
}) => {
    const [isRelationshipMenuOpen, setIsRelationshipMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState<React.CSSProperties>({ visibility: 'hidden' });

    React.useLayoutEffect(() => {
        if (!menuRef.current) return;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const PADDING = 10;

        const menuWidth = menuRef.current.offsetWidth || 280;
        const menuHeight = menuRef.current.offsetHeight || 400;

        const newStyle: React.CSSProperties = {
            position: 'fixed',
            zIndex: 10000,
            visibility: 'visible',
            minWidth: '280px'
        };

        if (mousePos) {
            let left = mousePos.x;
            let top = mousePos.y;

            // Adjust horizontal
            if (left + menuWidth > viewportWidth - PADDING) {
                left = left - menuWidth;
            }
            if (left < PADDING) left = PADDING;

            // Adjust vertical
            if (top + menuHeight > viewportHeight - PADDING) {
                top = top - menuHeight;
            }
            if (top < PADDING) top = PADDING;

            newStyle.left = `${left}px`;
            newStyle.top = `${top}px`;
            newStyle.bottom = 'auto';
        } else if (triggerElement) {
            const rect = triggerElement.getBoundingClientRect();

            // Horizontal positioning: align right edge with trigger's right edge
            let left = rect.right - menuWidth;
            if (left < PADDING) left = PADDING;
            if (left + menuWidth > viewportWidth - PADDING) left = viewportWidth - menuWidth - PADDING;

            newStyle.left = `${left}px`;

            // Vertical positioning
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow >= menuHeight + PADDING) {
                newStyle.top = `${rect.bottom + 8}px`;
                newStyle.bottom = 'auto';
            } else if (spaceAbove >= menuHeight + PADDING) {
                newStyle.bottom = `${viewportHeight - rect.top + 8}px`;
                newStyle.top = 'auto';
            } else {
                if (spaceBelow > spaceAbove) {
                    newStyle.top = `${rect.bottom + 8}px`;
                    newStyle.maxHeight = `${spaceBelow - PADDING * 2}px`;
                    newStyle.overflowY = 'auto';
                } else {
                    newStyle.bottom = `${viewportHeight - rect.top + 8}px`;
                    newStyle.top = 'auto';
                    newStyle.maxHeight = `${spaceAbove - PADDING * 2}px`;
                    newStyle.overflowY = 'auto';
                }
            }
        }

        setStyle(newStyle);
    }, [triggerElement, mousePos, isRelationshipMenuOpen]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
        onClose();
    };

    const handleCopyID = () => {
        navigator.clipboard.writeText(taskId);
        alert('Task ID copied to clipboard!');
        onClose();
    };

    const handleNewTab = () => {
        window.open(window.location.href, '_blank');
        onClose();
    };

    const content = (
        <div
            ref={menuRef}
            className="task-options-menu"
            style={style}
            onClick={e => e.stopPropagation()}
        >
            <div className="menu-header-row">
                <button onClick={handleCopyLink}>
                    <Link2 size={14} />
                    <span>Copy link</span>
                </button>
                <div className="menu-divider-v"></div>
                <button onClick={handleCopyID}>
                    <Copy size={14} />
                    <span>Copy ID</span>
                </button>
                <div className="menu-divider-v"></div>
                <button onClick={handleNewTab}>
                    <ExternalLink size={14} />
                    <span>New tab</span>
                </button>
            </div>

            <div className="menu-main-content">
                <button className="menu-item" onClick={onRename}>
                    <Edit2 className="menu-icon" size={18} />
                    <span className="menu-label">Rename</span>
                </button>

                <button className="menu-item has-chevron" onClick={onConvertToDoc}>
                    <Repeat className="menu-icon" size={18} />
                    <span className="menu-label">Convert to Doc</span>
                    <ChevronRight size={14} className="chevron-right" />
                </button>

                <button className="menu-item has-chevron">
                    <Box className="menu-icon" size={18} />
                    <span className="menu-label">Task Type</span>
                    <ChevronRight size={14} className="chevron-right" />
                </button>

                <button className="menu-item" onClick={onDuplicate}>
                    <DuplicateIcon className="menu-icon" size={18} />
                    <span className="menu-label">Duplicate</span>
                </button>

                <button className="menu-item">
                    <Clock className="menu-icon" size={18} />
                    <span className="menu-label">Remind me</span>
                </button>

                <button className="menu-item">
                    <BellOff className="menu-icon" size={18} />
                    <span className="menu-label">Unfollow task</span>
                </button>

                <button className="menu-item">
                    <Mail className="menu-icon" size={18} />
                    <span className="menu-label">Send email to task</span>
                </button>

                <button className="menu-item has-chevron">
                    <Plus className="menu-icon" size={18} />
                    <span className="menu-label">Add To</span>
                    <ChevronRight size={14} className="chevron-right" />
                </button>

                <button className="menu-item">
                    <GitMerge className="menu-icon" size={18} />
                    <span className="menu-label">Merge</span>
                </button>

                <button className="menu-item" onClick={onMove}>
                    <ArrowRight className="menu-icon" size={18} />
                    <span className="menu-label">Move</span>
                </button>

                <button className="menu-item" onClick={onStartTimer}>
                    <Play className="menu-icon" size={18} />
                    <span className="menu-label">Start timer</span>
                </button>

                <div className="menu-divider-h"></div>

                <div className="menu-item-group" style={{ position: 'relative' }}>
                    <button
                        className={`menu-item has-chevron ${isRelationshipMenuOpen ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsRelationshipMenuOpen(!isRelationshipMenuOpen);
                        }}
                    >
                        <LinkIcon className="menu-icon" size={18} />
                        <span className="menu-label">Dependencies</span>
                        <ChevronRight size={14} className={`chevron-right ${isRelationshipMenuOpen ? 'rotated' : ''}`} />
                    </button>
                    {isRelationshipMenuOpen && (
                        <RelationshipMenu
                            taskId={taskId}
                            onClose={() => setIsRelationshipMenuOpen(false)}
                            mode="list"
                            isModal={true}
                        />
                    )}
                </div>

                <button className="menu-item" onClick={onArchive}>
                    <Archive className="menu-icon" size={18} />
                    <span className="menu-label">Archive</span>
                </button>

                <button className="menu-item danger" onClick={onDelete}>
                    <Trash2 className="menu-icon" size={18} />
                    <span className="menu-label">Delete</span>
                </button>
            </div>

            <div className="menu-footer">
                <button className="btn-sharing">
                    <Shield size={20} />
                    <span>Sharing & Permissions</span>
                </button>
            </div>
        </div>
    );

    return triggerElement ? createPortal(content, document.body) : content;
};

export default TaskOptionsMenu;
