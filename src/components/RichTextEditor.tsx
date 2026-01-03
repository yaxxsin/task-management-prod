import React, { useRef, useEffect } from 'react';
import {
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Type
} from 'lucide-react';
import '../styles/RichTextEditor.css';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, readOnly }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current && !readOnly) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value: string = '') => {
        if (readOnly) return;
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    return (
        <div className={`rich-text-editor-container ${readOnly ? 'read-only' : ''}`}>
            {!readOnly && (
                <div className="rte-toolbar">
                    <button type="button" onClick={() => execCommand('bold')} title="Bold"><Bold size={16} /></button>
                    <button type="button" onClick={() => execCommand('italic')} title="Italic"><Italic size={16} /></button>
                    <button type="button" onClick={() => execCommand('underline')} title="Underline"><Underline size={16} /></button>
                    <div className="rte-divider"></div>
                    <button type="button" onClick={() => execCommand('formatBlock', '<h1>')} title="H1"><Heading1 size={16} /></button>
                    <button type="button" onClick={() => execCommand('formatBlock', '<h2>')} title="H2"><Heading2 size={16} /></button>
                    <button type="button" onClick={() => execCommand('formatBlock', '<p>')} title="Text"><Type size={16} /></button>
                    <div className="rte-divider"></div>
                    <button type="button" onClick={() => execCommand('insertUnorderedList')} title="Bullet List"><List size={16} /></button>
                    <button type="button" onClick={() => execCommand('insertOrderedList')} title="Numbered List"><ListOrdered size={16} /></button>
                </div>
            )}
            <div
                ref={editorRef}
                className="rte-content"
                contentEditable={!readOnly}
                onInput={handleInput}
                data-placeholder={placeholder}
                onKeyDown={(e) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
                    }
                }}
            />
        </div>
    );
};

export default RichTextEditor;
