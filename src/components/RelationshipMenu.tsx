import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, X, FileText, Plus, MinusCircle, Link2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import TaskPicker from './TaskPicker';
import DocPicker from './DocPicker';
import '../styles/RelationshipMenu.css';

interface RelationshipMenuProps {
    taskId: string;
    onClose: () => void;
    inline?: boolean;
    mode?: 'grid' | 'list';
    isModal?: boolean;
    modalPicker?: boolean;
}

const RelationshipMenu: React.FC<RelationshipMenuProps> = ({ taskId, onClose, inline, mode = 'grid', isModal, modalPicker }) => {
    const { tasks, addRelationship, updateTask, removeRelationship } = useAppStore();
    const [pickerType, setPickerType] = useState<'waiting' | 'blocking' | 'linked' | 'custom' | 'doc' | null>(null);

    const activeTask = tasks.find(t => t.id === taskId);
    const relationships = activeTask?.relationships || [];

    const handleSelectTask = (targetId: string) => {
        if (pickerType && pickerType !== 'doc') {
            // Check for duplicates
            const isDuplicate = relationships.some(r => r.taskId === targetId && r.type === pickerType);
            if (!isDuplicate) {
                addRelationship(taskId, {
                    type: pickerType,
                    taskId: targetId
                });
            }
        }
        setPickerType(null);
        if (!inline && mode === 'grid') onClose();
    };

    const handleSelectDoc = (docId: string) => {
        updateTask(taskId, { linkedDocId: docId });
        setPickerType(null);
        if (!inline && mode === 'grid') onClose();
    };

    const renderPicker = () => {
        if (!pickerType) return null;

        const isDoc = pickerType === 'doc';
        const PickerComponent = isDoc ? DocPicker : TaskPicker;

        const pickerContent = (
            <div className="inline-picker-container">
                <div className="inline-picker-header">
                    <button className="back-btn" onClick={() => setPickerType(null)}>← Back</button>
                    <span className="picker-title">Select {isDoc ? 'Doc' : 'Task'}</span>
                </div>
                <PickerComponent
                    onSelect={isDoc ? handleSelectDoc : handleSelectTask}
                    onClose={() => setPickerType(null)}
                    {...(!isDoc ? { excludeTaskId: taskId } : {})}
                />
            </div>
        );

        // If we want the picker to pop up, wrap it in the modal overlay
        if (modalPicker) {
            return (
                <div className="relationship-modal-overlay" onClick={() => setPickerType(null)}>
                    <div className="relationship-menu-container is-modal" onClick={e => e.stopPropagation()}>
                        {pickerContent}
                    </div>
                </div>
            );
        }

        return (
            <div className={(inline || mode === 'list') ? "inline-picker-wrapper" : "picker-overlay"}>
                {pickerContent}
            </div>
        );
    };

    const renderGrid = () => {
        // In inline mode, the picker replaces the grid entirely
        if (inline && pickerType) return renderPicker();

        return (
            <div className={`relationship-grid ${inline ? 'inline' : ''}`}>
                <button className="rel-grid-btn" onClick={() => setPickerType('linked')}>
                    <div className="rel-icon-box"><CheckCircle2 size={16} /></div>
                    <span>Link Task</span>
                </button>
                <button className="rel-grid-btn" onClick={() => setPickerType('waiting')}>
                    <div className="rel-icon-box"><AlertCircle size={16} /></div>
                    <span>Waiting on</span>
                </button>
                <button className="rel-grid-btn" onClick={() => setPickerType('blocking')}>
                    <div className="rel-icon-box"><MinusCircle size={16} /></div>
                    <span>Blocking</span>
                </button>
                <button className="rel-grid-btn" onClick={() => setPickerType('doc')}>
                    <div className="rel-icon-box"><FileText size={16} /></div>
                    <span>Link Doc</span>
                </button>
                <button className="rel-grid-btn" onClick={() => setPickerType('custom')}>
                    <div className="rel-icon-box"><Plus size={16} /></div>
                    <span>Custom</span>
                </button>
                {!inline && renderPicker()}
            </div>
        );
    };

    const renderList = () => {
        const sections = [
            { type: 'waiting', label: 'Waiting On', icon: <AlertCircle size={16} style={{ color: '#b45309' }} />, addLabel: 'Add waiting on task' },
            { type: 'blocking', label: 'Blocking', icon: <MinusCircle size={16} style={{ color: '#dc2626' }} />, addLabel: 'Add task that is blocked' },
            { type: 'linked', label: 'Linked', icon: <Link2 size={16} style={{ color: '#64748b' }} />, addLabel: 'Add linked task' },
        ];

        return (
            <div className="relationship-list-view">
                <div className="rel-list-header">
                    <div className="header-top">
                        <h3>Dependencies</h3>
                        {!inline && <button className="icon-btn-ghost" onClick={onClose}><X size={18} /></button>}
                    </div>
                    <p>See what this task depends on and what depends on it.</p>
                </div>

                {pickerType ? renderPicker() : (
                    <div className="rel-list-sections">
                        {sections.map(sec => (
                            <div key={sec.type} className="rel-section">
                                <div className="sec-header">
                                    {sec.icon}
                                    <span>{sec.label}</span>
                                </div>
                                <div className="sec-content">
                                    {relationships.filter(r => r.type === sec.type).map(rel => {
                                        const t = tasks.find(x => x.id === rel.taskId);
                                        return (
                                            <div key={rel.id} className="rel-item-pill">
                                                <span className="rel-item-name">{t?.name || 'Unknown Task'}</span>
                                                <button
                                                    className="remove-rel-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeRelationship(taskId, rel.id);
                                                    }}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button className="add-rel-inline-btn" onClick={() => setPickerType(sec.type as any)}>
                                        <Plus size={14} />
                                        <span>{sec.addLabel}</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const header = !inline && mode === 'grid' && (
        <div className="relationship-menu-header">
            <h3>Add Relationship</h3>
            <button className="icon-btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>
    );

    const body = mode === 'list' ? renderList() : renderGrid();

    if (inline) return <div className="relationship-menu-context inline">{body}</div>;

    const menu = (
        <div className={`relationship-menu-container ${mode === 'list' ? 'list-mode' : ''} ${isModal ? 'is-modal' : ''}`} onClick={e => e.stopPropagation()}>
            {header}
            {body}
        </div>
    );

    if (isModal) {
        return (
            <div className="relationship-modal-overlay" onClick={onClose}>
                {menu}
            </div>
        );
    }

    return menu;
};

export default RelationshipMenu;
