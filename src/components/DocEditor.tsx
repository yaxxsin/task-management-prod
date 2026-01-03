import React, { useState } from 'react';
import {
    X,
    ChevronLeft,
    MoreVertical,
    Share2,
    Star,
    Save
} from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import type { Doc } from '../types';
import '../styles/DocEditor.css';

interface DocEditorProps {
    doc: Doc;
    onClose: () => void;
    onUpdate: (docId: string, updates: Partial<Doc>) => void;
}

const DocEditor: React.FC<DocEditorProps> = ({ doc, onClose, onUpdate }) => {
    const [title, setTitle] = useState(doc.name);
    const [content, setContent] = useState(doc.content);

    const handleSave = () => {
        onUpdate(doc.id, { name: title, content });
        onClose();
    };

    return (
        <div className="doc-editor-overlay">
            <div className="doc-editor-container">
                <div className="doc-editor-header">
                    <div className="header-left">
                        <button className="back-btn" onClick={onClose}>
                            <ChevronLeft size={20} />
                            <span>Back to Docs</span>
                        </button>
                        <div className="vertical-divider"></div>
                        <input
                            className="doc-title-input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document Title"
                        />
                    </div>
                    <div className="header-right">
                        <button className="icon-btn-ghost"><Star size={18} /></button>
                        <button className="icon-btn-ghost"><Share2 size={18} /></button>
                        <button className="icon-btn-ghost"><MoreVertical size={18} /></button>
                        <button className="btn-save" onClick={handleSave}>
                            <Save size={16} /> Save
                        </button>
                        <button className="close-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>
                <div className="doc-editor-body">
                    <div className="editor-scroller">
                        <div className="editor-paper">
                            <RichTextEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Start writing your document..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocEditor;
