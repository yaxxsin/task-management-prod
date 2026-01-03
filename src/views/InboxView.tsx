import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import {
    Inbox,
    MessageSquare,
    AtSign,
    CheckCircle2,
    Clock,
    Search,
    Mail,
    UserPlus,
    Archive,
    Check
} from 'lucide-react';
import '../styles/InboxView.css';
import { API_ENDPOINTS } from '../config/api';

interface InboxViewProps {
    onTaskClick?: (taskId: string) => void;
}

const InboxView: React.FC<InboxViewProps> = ({ onTaskClick }) => {
    const { token } = useAuthStore();
    const {
        notifications,
        markNotificationAsRead,
        clearNotification,
        markAllNotificationsAsRead
    } = useAppStore();

    const [invitations, setInvitations] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'mentions' | 'assigned' | 'invites'>('all');
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    useEffect(() => {
        if (token) {
            fetchInvitations();
        }
    }, [token]);

    const fetchInvitations = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.INVITATIONS, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInvitations(data);
            }
        } catch (e) {
            console.error('Failed to fetch invitations', e);
        }
    };

    const handleAcceptInvitation = async (invite: any) => {
        try {
            const res = await fetch(`${API_ENDPOINTS.INVITATIONS}/${invite.id}/accept`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setInvitations(prev => prev.filter(i => i.id !== invite.id));
                window.location.reload();
            }
        } catch (e) {
            console.error('Failed to accept invite', e);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'mention': return <AtSign size={16} className="text-blue-500" />;
            case 'assigned': return <UserPlus size={16} className="text-green-500" />;
            case 'invite': return <Mail size={16} className="text-purple-500" />;
            case 'comment': return <MessageSquare size={16} className="text-gray-500" />;
            case 'overdue': return <Clock size={16} className="text-red-500" />;
            default: return <Inbox size={16} className="text-gray-500" />;
        }
    };

    const allItems = [
        ...invitations.map(inv => ({
            id: inv.id,
            type: 'invite',
            title: 'Space Invitation',
            message: `You have been invited to join a ${inv.resource_type}`,
            time: inv.created_at,
            isRead: false, // Invites are always "unread" until handled
            raw: inv
        })),
        ...notifications.map(notif => ({
            id: notif.id,
            type: notif.type === 'task_assigned' ? 'assigned' :
                notif.type === 'mention' ? 'mention' :
                    notif.type === 'overdue' ? 'overdue' : 'all',
            title: notif.title,
            message: notif.message,
            time: notif.createdAt,
            isRead: notif.isRead,
            raw: notif
        }))
    ];

    const filteredItems = allItems.filter(item => {
        if (filter === 'unread' && item.isRead) return false;
        if (activeTab === 'invites' && item.type !== 'invite') return false;
        if (activeTab === 'mentions' && item.type !== 'mention') return false;
        if (activeTab === 'assigned' && item.type !== 'assigned') return false;
        return true;
    });

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="inbox-view">
            <header className="inbox-header">
                <div className="inbox-title-row">
                    <h1>Inbox</h1>
                    <div className="inbox-controls">
                        <div className="inbox-tabs">
                            <button
                                className={`inbox-tab ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                All
                            </button>
                            <button
                                className={`inbox-tab ${activeTab === 'assigned' ? 'active' : ''}`}
                                onClick={() => setActiveTab('assigned')}
                            >
                                Assigned
                            </button>
                            <button
                                className={`inbox-tab ${activeTab === 'mentions' ? 'active' : ''}`}
                                onClick={() => setActiveTab('mentions')}
                            >
                                Mentions
                            </button>
                            <button
                                className={`inbox-tab ${activeTab === 'invites' ? 'active' : ''}`}
                                onClick={() => setActiveTab('invites')}
                            >
                                Invites
                                {invitations.length > 0 && <span className="badge">{invitations.length}</span>}
                            </button>
                        </div>

                        <div className="filter-search-row">
                            <div className="search-wrapper">
                                <Search size={14} />
                                <input type="text" placeholder="Search inbox..." />
                            </div>
                            <div className="filter-toggles">
                                <button
                                    className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                                    onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
                                >
                                    Unread only
                                </button>
                            </div>
                            <button
                                className="mark-all-btn"
                                onClick={markAllNotificationsAsRead}
                            >
                                <CheckCircle2 size={16} />
                                Mark all read
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="inbox-content">
                {filteredItems.length === 0 ? (
                    <div className="inbox-empty">
                        <div className="empty-icon-wrapper">
                            <CheckCircle2 size={48} />
                        </div>
                        <h3>All caught up!</h3>
                        <p>You have no new notifications.</p>
                    </div>
                ) : (
                    <div className="inbox-list">
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                className={`inbox-item ${!item.isRead ? 'unread' : ''}`}
                                onClick={() => {
                                    if (item.raw.taskId && onTaskClick) {
                                        onTaskClick(item.raw.taskId);
                                    }
                                }}
                                style={{ cursor: item.raw.taskId ? 'pointer' : 'default' }}
                            >
                                <div className="item-icon">
                                    {getIconForType(item.type)}
                                </div>
                                <div className="item-main">
                                    <div className="item-header">
                                        <span className="item-title">{item.title}</span>
                                        <span className="item-time">{formatTime(item.time)}</span>
                                    </div>
                                    <div className="item-body">
                                        <p>{item.message}</p>

                                        {item.type === 'invite' && (
                                            <div className="invite-actions">
                                                <button
                                                    className="btn-accept-invite"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAcceptInvitation(item.raw);
                                                    }}
                                                >
                                                    Accept Invitation
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="item-actions">
                                    {item.type !== 'invite' && (
                                        <button
                                            className="action-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                item.isRead ? clearNotification(item.id) : markNotificationAsRead(item.id);
                                            }}
                                            title={item.isRead ? "Clear" : "Mark as read"}
                                        >
                                            {item.isRead ? <Archive size={16} /> : <Check size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InboxView;
