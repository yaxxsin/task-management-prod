import React, { useState, useRef, useEffect } from 'react';
import {
    CornerDownLeft,
    User,
    Calendar,
    Flag,

} from 'lucide-react';
import type { Priority, Subtask } from '../types';

interface QuickAddSubtaskProps {
    onAdd: (subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'> & { assignee?: string, dueDate?: string, priority?: Priority }) => void;
    onCancel: () => void;
}

const QuickAddSubtask: React.FC<QuickAddSubtaskProps> = ({ onAdd, onCancel }) => {
    const [name, setName] = useState('');
    const [priority, setPriority] = useState<Priority>('low');
    const [assignee, setAssignee] = useState<string | undefined>(undefined);
    // const [dueDate, setDueDate] = useState<string | undefined>(undefined); // Keep simple for now
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }

        // Handle click outside if needed? 
        // For now, rely on X button or simple dismissal
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!name.trim()) return;

        onAdd({
            name,
            status: 'todo',
            priority,
            assignee
        });
        setName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Prevent dnd-kit from capturing key events (especially Space)
        e.stopPropagation();

        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    const togglePriority = () => {
        const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
        const idx = priorities.indexOf(priority);
        setPriority(priorities[(idx + 1) % priorities.length]);
    };

    const toggleAssignee = () => {
        setAssignee(prev => prev ? undefined : 'Jundee'); // Simple toggle for now
    };

    return (
        <div className="quick-add-subtask">
            <div className="quick-add-header">
                <input
                    ref={inputRef}
                    type="text"
                    className="quick-add-input"
                    placeholder="Subtask Name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="quick-add-save-btn"
                    onClick={() => handleSubmit()}
                    disabled={!name.trim()}
                >
                    Save <CornerDownLeft size={14} />
                </button>
            </div>
            <div className="quick-add-actions">
                <button
                    className={`action-pill ${assignee ? 'active' : ''}`}
                    onClick={toggleAssignee}
                    title="Assign to me"
                >
                    <User size={14} />
                    {assignee ? 'Assigned' : 'Add assignee'}
                </button>
                <button
                    className="action-pill"
                    title="Add dates (Not implemented)"
                >
                    <Calendar size={14} />
                    Add dates
                </button>
                <button
                    className={`action-pill ${priority !== 'low' ? 'active priority-' + priority : ''}`}
                    onClick={togglePriority}
                    title={`Priority: ${priority}`}
                >
                    <Flag size={14} />
                    {priority !== 'low' ? priority : 'Add priority'}
                </button>
            </div>
        </div>
    );
};

export default QuickAddSubtask;
