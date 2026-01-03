import React, { useState } from 'react';
import { X, Search, Folder, Check, ChevronRight, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/TaskModal.css'; // Reusing modal styles for consistency

interface MoveModalProps {
    onClose: () => void;
    item: {
        type: 'folder' | 'list';
        id: string;
        name: string;
        currentSpaceId: string;
    };
}

const MoveModal: React.FC<MoveModalProps> = ({ onClose, item }) => {
    const { spaces, folders, updateFolder, updateList } = useAppStore();
    const [search, setSearch] = useState('');
    const [expandedSpaceIds, setExpandedSpaceIds] = useState<Set<string>>(new Set());

    // Filter spaces and folders based on search
    const filteredSpaces = spaces.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        folders.some(f => f.spaceId === s.id && f.name.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleSpace = (spaceId: string) => {
        const newSet = new Set(expandedSpaceIds);
        if (newSet.has(spaceId)) {
            newSet.delete(spaceId);
        } else {
            newSet.add(spaceId);
        }
        setExpandedSpaceIds(newSet);
    };

    const handleMove = (targetSpaceId: string, targetFolderId?: string) => {
        // Prevent moving to self location
        // Although the UI allows re-selecting current, usually it's a no-op.

        if (item.type === 'folder') {
            updateFolder(item.id, { spaceId: targetSpaceId });
        } else {
            // Moving a List
            updateList(item.id, { spaceId: targetSpaceId, folderId: targetFolderId });
        }
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '0', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px' }}>Move {item.name}</h3>
                        <button className="close-btn" onClick={onClose}><X size={18} /></button>
                    </div>
                    <div className="search-box" style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search spaces & folders..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text-main)', fontSize: '14px' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                    <div style={{ padding: '0 16px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                        Select Destination
                    </div>

                    {filteredSpaces.map(space => {
                        const spaceFolders = folders.filter(f => f.spaceId === space.id);
                        const isExpanded = expandedSpaceIds.has(space.id) || search.length > 0;
                        const hasFolders = spaceFolders.length > 0;

                        return (
                            <div key={space.id}>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        background: item.currentSpaceId === space.id && !item.id /* Rough check for current */ ? 'var(--bg-hover)' : 'transparent'
                                    }}
                                    className="move-item-row"
                                    onClick={() => {
                                        // If search is active or clicking directly, handle logic
                                        // If filtering, we might want to select.
                                        // Default behavior: moving lists to Space Root or Folder?
                                        // If item is Folder, it always moves to Space Root.
                                        // If item is List, it can move to Space Root.
                                        handleMove(space.id);
                                    }}
                                >
                                    <div
                                        onClick={(e) => { e.stopPropagation(); toggleSpace(space.id); }}
                                        style={{ visibility: hasFolders && item.type === 'list' ? 'visible' : 'hidden', display: 'flex' }}
                                    >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                    <div
                                        style={{ width: '20px', height: '20px', borderRadius: '4px', background: space.color || '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}
                                    >
                                        {space.name[0]}
                                    </div>
                                    <span style={{ fontSize: '14px', flex: 1 }}>{space.name}</span>
                                    {item.currentSpaceId === space.id && item.type === 'folder' && <Check size={14} color="var(--primary)" />}
                                </div>

                                {isExpanded && item.type === 'list' && (
                                    <div style={{ marginLeft: '0px' }}>
                                        {spaceFolders.map(folder => (
                                            <div
                                                key={folder.id}
                                                style={{
                                                    padding: '8px 16px 8px 48px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                }}
                                                className="move-item-row folder-row"
                                                onClick={() => handleMove(space.id, folder.id)}
                                            >
                                                <Folder size={14} color={folder.color || 'var(--text-secondary)'} />
                                                <span style={{ fontSize: '13px' }}>{folder.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <style>{`
                .move-item-row:hover {
                    background-color: var(--bg-hover) !important;
                }
            `}</style>
        </div>
    );
};

export default MoveModal;
