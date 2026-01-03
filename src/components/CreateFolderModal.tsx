import React, { useState } from 'react';
import {
    X, Layout, Users, Lock, Star,
    Briefcase, Code, GraduationCap,
    Music, Heart, Camera, Globe,
    Zap, Cloud, Moon, Book,
    Flag, Target, Coffee,
    Folder
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/TaskModal.css';

interface CreateFolderModalProps {
    spaceId: string;
    onClose: () => void;
    editingFolder?: { id: string; name: string; icon?: string; color?: string };
    onUpdate?: (id: string, updates: any) => void;
}

const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ spaceId, onClose, editingFolder, onUpdate }) => {
    const { addFolder, spaces } = useAppStore();
    const [name, setName] = useState(editingFolder?.name || '');
    const [icon, setIcon] = useState(editingFolder?.icon || 'folder');
    const [color, setColor] = useState(editingFolder?.color || '#3b82f6');

    const space = spaces.find(s => s.id === spaceId);

    const icons = [
        { id: 'folder', icon: Folder },
        { id: 'users', icon: Users },
        { id: 'layout', icon: Layout },
        { id: 'lock', icon: Lock },
        { id: 'star', icon: Star },
        { id: 'briefcase', icon: Briefcase },
        { id: 'code', icon: Code },
        { id: 'graduation', icon: GraduationCap },
        { id: 'book', icon: Book },
        { id: 'globe', icon: Globe },
        { id: 'zap', icon: Zap },
        { id: 'cloud', icon: Cloud },
        { id: 'moon', icon: Moon },
        { id: 'flag', icon: Flag },
        { id: 'target', icon: Target },
        { id: 'coffee', icon: Coffee },
        { id: 'heart', icon: Heart },
        { id: 'music', icon: Music },
        { id: 'camera', icon: Camera },
    ];

    const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#64748b',
        '#06b6d4', '#84cc16', '#f97316', '#db2777', '#4f46e5', '#14b8a6', '#f43f5e', '#78716c'
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            if (editingFolder && onUpdate) {
                onUpdate(editingFolder.id, { name: name.trim(), icon, color });
            } else {
                addFolder({
                    name: name.trim(),
                    spaceId: spaceId,
                    icon,
                    color
                });
            }
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div className="modal-header">
                    <h3>{editingFolder ? 'Update Folder' : `Create Folder in ${space?.name}`}</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="task-form">
                    <div className="form-group">
                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Folder Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Development, Marketing, Sprints"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Icon & Color</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', marginTop: '8px' }}>
                            {icons.map(item => {
                                const Icon = item.icon;
                                const isActive = icon === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className="icon-selector-btn"
                                        onClick={() => setIcon(item.id)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '2px solid',
                                            borderColor: isActive ? color : 'transparent',
                                            background: isActive ? `${color}15` : 'var(--bg-side)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        title={item.id}
                                    >
                                        <Icon size={18} color={isActive ? color : '#94a3b8'} strokeWidth={isActive ? 2.5 : 2} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        backgroundColor: c,
                                        border: color === c ? '3px solid white' : 'none',
                                        boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        padding: 0
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="modal-footer" style={{ marginTop: '32px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!name.trim()}>{editingFolder ? 'Update Folder' : 'Create Folder'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateFolderModal;
