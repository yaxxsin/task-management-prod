import React, { useState } from 'react';
import { X, Search, Chrome, FileText, Layout, Video, File, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import '../styles/AddBookmarkModal.css';

interface AddBookmarkModalProps {
    onClose: () => void;
    spaceId: string;
}

interface RecentItem {
    id: string;
    name: string;
    type: 'clip' | 'doc' | 'dashboard' | 'list' | 'task';
    icon: any;
    location: string;
    timestamp: string;
}

const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({ onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { tasks, lists, clips, dashboards, spaces } = useAppStore();

    // Build recent items from various sources
    const recentItems: RecentItem[] = [
        ...clips.slice(0, 2).map(clip => ({
            id: clip.id,
            name: clip.name,
            type: 'clip' as const,
            icon: Video,
            location: 'in',
            timestamp: getRelativeTime(clip.createdAt)
        })),
        ...dashboards.slice(0, 1).map(dashboard => ({
            id: dashboard.id,
            name: dashboard.name,
            type: 'dashboard' as const,
            icon: Layout,
            location: dashboard.spaceId ? `in ${spaces.find(s => s.id === dashboard.spaceId)?.name || 'Space'}` : 'in',
            timestamp: getRelativeTime(dashboard.updatedAt)
        })),
        ...tasks.slice(0, 2).map(task => ({
            id: task.id,
            name: task.name,
            type: 'task' as const,
            icon: File,
            location: `in ${spaces.find(s => s.id === task.spaceId)?.name || 'Space'}`,
            timestamp: getRelativeTime(task.updatedAt)
        })),
        ...lists.slice(0, 2).map(list => ({
            id: list.id,
            name: list.name,
            type: 'list' as const,
            icon: FileText,
            location: `in ${spaces.find(s => s.id === list.spaceId)?.name || 'Space'}`,
            timestamp: '5 months ago'
        })),
    ];

    function getRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
        if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
        if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
        if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
        return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }

    const filteredItems = searchQuery
        ? recentItems.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : recentItems;

    const externalServices = [
        { name: 'Chrome', icon: Chrome, color: '#4285F4' },
        { name: 'Notion', icon: FileText, color: '#000000' },
        { name: 'Google Drive', icon: File, color: '#4285F4' },
        { name: 'Dropbox', icon: File, color: '#0061FF' },
        { name: 'GitHub', icon: File, color: '#181717' },
        { name: 'Figma', icon: File, color: '#F24E1E' },
        { name: 'Slack', icon: File, color: '#4A154B' },
        { name: 'YouTube', icon: Video, color: '#FF0000' },
    ];

    return (
        <div className="bookmark-modal-overlay" onClick={onClose}>
            <div className="add-bookmark-modal" onClick={e => e.stopPropagation()}>
                <div className="bookmark-modal-header">
                    <h2>Add a bookmark</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="bookmark-modal-subtitle">
                    Bookmark any ClickUp item like a task, or a link from external tools.
                </div>

                <div className="external-services">
                    {externalServices.slice(0, 8).map((service, index) => (
                        <div key={index} className="service-icon" title={service.name}>
                            <service.icon size={20} style={{ color: service.color }} />
                        </div>
                    ))}
                    <div className="service-more">and more</div>
                </div>

                <div className="bookmark-search-container">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search ClickUp or paste any link..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bookmark-search-input"
                        autoFocus
                    />
                </div>

                <div className="bookmark-recent-section">
                    <div className="recent-header">Recent</div>
                    <div className="recent-items-list">
                        {filteredItems.length > 0 ? (
                            filteredItems.map((item) => (
                                <div key={item.id} className="recent-bookmark-item">
                                    <div className="recent-item-icon">
                                        <item.icon size={16} />
                                    </div>
                                    <div className="recent-item-content">
                                        <div className="recent-item-name">{item.name}</div>
                                        <div className="recent-item-meta">
                                            {item.location && <span className="item-location">{item.location}</span>}
                                        </div>
                                    </div>
                                    <div className="recent-item-timestamp">{item.timestamp}</div>
                                    <button className="bookmark-add-btn" title="Add bookmark">
                                        <ExternalLink size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="no-results">
                                <p>No items found. Paste a URL to bookmark an external link.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddBookmarkModal;
