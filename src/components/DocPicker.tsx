import React, { useState } from 'react';
import { Search, X, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/TaskPicker.css'; // Reusing TaskPicker styles for consistency

interface DocPickerProps {
    onSelect: (docId: string) => void;
    onClose: () => void;
}

const DocPicker: React.FC<DocPickerProps> = ({ onSelect, onClose }) => {
    const { docs } = useAppStore();
    const [search, setSearch] = useState('');

    const filteredDocs = docs.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="task-picker-popover">
            <div className="task-picker-header">
                <Search size={14} className="search-icon" />
                <input
                    autoFocus
                    placeholder="Search docs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button onClick={onClose} className="close-btn"><X size={14} /></button>
            </div>
            <div className="task-picker-list">
                {filteredDocs.length > 0 ? (
                    filteredDocs.map(doc => (
                        <div
                            key={doc.id}
                            className="task-picker-item"
                            onClick={() => onSelect(doc.id)}
                        >
                            <FileText size={14} className="task-id" />
                            <span className="task-name">{doc.name}</span>
                        </div>
                    ))
                ) : (
                    <div className="no-results">No documents found</div>
                )}
            </div>
        </div>
    );
};

export default DocPicker;
