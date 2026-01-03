import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/CreateDocModal.css';

interface CreateDocModalProps {
    spaceId: string;
    onClose: () => void;
}

const CreateDocModal: React.FC<CreateDocModalProps> = ({ spaceId, onClose }) => {
    const { addDoc, spaces } = useAppStore();
    const [name, setName] = useState('');

    // Simulate current user
    const userId = 'user-1';
    const userName = 'Me';

    const space = spaces.find(s => s.id === spaceId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            addDoc({
                name: name.trim(),
                content: '', // Start with empty content
                spaceId: spaceId,
                userId: userId,
                userName: userName
            });
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-doc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            padding: '6px',
                            background: 'var(--info-light)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileText size={18} color="#3b82f6" />
                        </div>
                        <h3>Create Doc in {space?.name}</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="task-form">
                    <div className="form-group">
                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Doc Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Project Specs, Meeting Notes"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div className="modal-footer" style={{ marginTop: '32px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!name.trim()}>Create Doc</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDocModal;
