import React, { useState, useEffect } from 'react';
import { Search, Calendar, Grid, FileText, ChevronDown, Sparkles } from 'lucide-react';
import ProfileDropdown from './ProfileDropdown';
import NotificationCenter from './NotificationCenter';
import '../styles/Header.css';

interface HeaderProps {
    onAddTask: () => void;
    onOpenReport: () => void;
    onOpenAI: () => void;
    onOpenSettings: (tab?: string) => void;
    onTaskClick?: (taskId: string) => void;
}

import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';

const ActiveTimerDisplay: React.FC = () => {
    const { activeTimer, stopTimer, tasks } = useAppStore();
    const [elapsed, setElapsed] = useState('00:00:00');

    useEffect(() => {
        if (!activeTimer) return;

        const interval = setInterval(() => {
            const start = new Date(activeTimer.startTime).getTime();
            const now = new Date().getTime();
            const diff = now - start;

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setElapsed(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        }, 1000);

        return () => clearInterval(interval);
    }, [activeTimer]);

    if (!activeTimer) return null;

    const taskName = tasks.find(t => t.id === activeTimer.taskId)?.name || 'Unknown Task';

    return (
        <div className="active-timer-pill">
            <div className="timer-dot"></div>
            <span className="timer-time">{elapsed}</span>
            <span className="timer-task">{taskName}</span>
            <button className="timer-stop-btn" onClick={stopTimer}>
                <div className="stop-icon"></div>
            </button>
        </div>
    );
};

const Header: React.FC<HeaderProps> = ({ onAddTask, onOpenReport, onOpenAI, onOpenSettings, onTaskClick }) => {
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('right');
    const { user } = useAuthStore();

    useEffect(() => {
        const handleClickOutside = () => setShowProfileDropdown(false);
        if (showProfileDropdown) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [showProfileDropdown]);

    const toggleDropdown = (e: React.MouseEvent, pos: 'left' | 'right') => {
        e.stopPropagation();
        if (showProfileDropdown && dropdownPosition === pos) {
            setShowProfileDropdown(false);
        } else {
            setDropdownPosition(pos);
            setShowProfileDropdown(true);
        }
    };

    const initials = user?.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'U';

    return (
        <header className="top-header">
            <div className="header-left">
                <div
                    className="logo"
                    onClick={(e) => toggleDropdown(e, 'left')}
                    style={{ cursor: 'pointer' }}
                >
                    TS
                </div>
                <div className="header-icons">
                    <NotificationCenter onTaskClick={onTaskClick} />
                    <button className="icon-btn"><Calendar size={18} /></button>
                </div>
                <div className="search-bar">
                    <Search size={16} />
                    <input type="text" placeholder="Search" />
                </div>
            </div>

            <div className="header-right">
                <button className="btn-ai" onClick={onOpenAI}>
                    <Sparkles size={16} /> AI
                </button>
                <ActiveTimerDisplay />
                <button className="btn-primary" onClick={onOpenReport}>
                    <FileText size={16} /> Generate Report
                </button>
                <button className="btn-new" onClick={onAddTask}>New</button>

                <div className="header-utility-icons">
                    <button className="icon-btn"><Grid size={18} /></button>
                </div>

                <div
                    className="user-profile"
                    onClick={(e) => toggleDropdown(e, 'right')}
                >
                    <div className="profile-circle" style={{ overflow: 'hidden' }}>
                        {user?.avatarUrl ? (
                            <img
                                src={user.avatarUrl}
                                alt={user.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            initials
                        )}
                    </div>
                    <ChevronDown size={14} />
                </div>
            </div>

            {showProfileDropdown && (
                <ProfileDropdown
                    onOpenSettings={(tab) => {
                        setShowProfileDropdown(false);
                        onOpenSettings(tab);
                    }}
                    position={dropdownPosition}
                />
            )}
        </header>
    );
};

export default Header;
