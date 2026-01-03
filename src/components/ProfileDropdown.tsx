import React from 'react';
import {
    User,
    Palette,
    Settings,
    Bell,
    Command,
    Gift,
    Download,
    HelpCircle,
    Trash2,
    LogOut,
    Smile,
    ChevronRight,
    Volume2
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import '../styles/ProfileDropdown.css';

interface ProfileDropdownProps {
    onOpenSettings: (tab?: string) => void;
    position?: 'left' | 'right';
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onOpenSettings, position = 'right' }) => {
    const { user, logout } = useAuthStore();

    if (!user) return null;

    const initials = user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleLogout = () => {
        // All data cleanup is handled automatically in useAuthStore.logout()
        logout();
    };

    return (
        <div
            className="profile-dropdown"
            onClick={(e) => e.stopPropagation()}
            style={{ [position]: '16px' }}
        >
            <div className="profile-dropdown-header">
                <div className="profile-avatar-large">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                    ) : (
                        initials
                    )}
                    <div className="status-indicator"></div>
                </div>
                <div className="profile-info">
                    <span className="profile-name">{user.name}</span>
                    <span className="profile-status-text" style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.email}</span>
                </div>
            </div>

            <button className="dropdown-item status-box" onClick={() => onOpenSettings('profile')}>
                <Smile size={16} className="dropdown-item-icon" />
                <span>Set status</span>
            </button>

            <div className="profile-dropdown-section">
                <button className="dropdown-item" onClick={() => onOpenSettings('notifications')}>
                    <Volume2 size={18} className="dropdown-item-icon" />
                    <span>Mute notifications</span>
                    <ChevronRight size={14} className="chevron" />
                </button>
            </div>

            <div className="profile-dropdown-section">
                <button className="dropdown-item" onClick={() => onOpenSettings('profile')}>
                    <User size={18} className="dropdown-item-icon" />
                    <span>Profile</span>
                </button>
                <button className="dropdown-item" onClick={() => onOpenSettings('themes')}>
                    <Palette size={18} className="dropdown-item-icon" />
                    <span>Themes</span>
                </button>
                <button className="dropdown-item" onClick={() => onOpenSettings('settings')}>
                    <Settings size={18} className="dropdown-item-icon" />
                    <span>Settings</span>
                </button>
                <button className="dropdown-item" onClick={() => onOpenSettings('notifications')}>
                    <Bell size={18} className="dropdown-item-icon" />
                    <span>Notification settings</span>
                </button>
            </div>

            <div className="profile-dropdown-section">
                <button className="dropdown-item" onClick={() => onOpenSettings('shortcuts')}>
                    <Command size={18} className="dropdown-item-icon" />
                    <span>Keyboard shortcuts</span>
                </button>
                <button className="dropdown-item" onClick={() => onOpenSettings('referrals')}>
                    <Gift size={18} className="dropdown-item-icon" />
                    <span>Referrals</span>
                </button>
                <button className="dropdown-item" onClick={() => onOpenSettings('downloads')}>
                    <Download size={18} className="dropdown-item-icon" />
                    <span>Download apps</span>
                </button>
                <button className="dropdown-item" onClick={() => onOpenSettings('help')}>
                    <HelpCircle size={18} className="dropdown-item-icon" />
                    <span>Help</span>
                </button>
            </div>

            <div className="profile-dropdown-section">
                <button className="dropdown-item" onClick={() => onOpenSettings('trash')}>
                    <Trash2 size={18} className="dropdown-item-icon" />
                    <span>Trash</span>
                </button>
                <button className="dropdown-item" onClick={handleLogout}>
                    <LogOut size={18} className="dropdown-item-icon" />
                    <span>Log out</span>
                </button>
            </div>

            {/* <div className="promo-banner">
                <div className="promo-content">
                    <span className="promo-title">A New Era of AR Gen is Here</span>
                    <span className="promo-subtitle">Polished, powerful, and perfectly crafted.</span>
                    <button className="btn-try" onClick={() => onOpenSettings('settings')}>Try 4.0</button>
                </div>
            </div> */}
        </div>
    );
};

export default ProfileDropdown;
