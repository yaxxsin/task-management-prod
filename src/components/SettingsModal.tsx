import React, { useState, useEffect } from 'react';
import {
    X, User, Palette, Settings, Bell, Command,
    Gift, Download, HelpCircle, Trash2, LogOut,
    Check, Moon, Sun, Monitor, Coffee, Sparkles, Globe
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import '../styles/SettingsModal.css';

interface SettingsModalProps {
    onClose: () => void;
    initialTab?: string;
}

// Declare QRCode type from CDN
declare const QRCode: any;

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, initialTab = 'profile' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const { theme, setTheme, accentColor, setAccentColor, aiConfig, setAIConfig, notificationSettings, updateNotificationSettings } = useAppStore();
    const { user } = useAuthStore();
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [isFetchingModels, setIsFetchingModels] = useState(false);
    const [ollamaError, setOllamaError] = useState<string | null>(null);

    const fetchOllamaModels = async (host: string) => {
        if (!host) return;
        setIsFetchingModels(true);
        setOllamaError(null);
        try {
            const response = await fetch(`${host}/api/tags`);
            if (!response.ok) throw new Error('Failed to fetch models');
            const data = await response.json();
            const names = data.models?.map((m: any) => m.name) || [];
            setOllamaModels(names);

            // If current model is not in list and list is not empty, select first as default
            if (names.length > 0 && !names.includes(aiConfig.ollamaModel)) {
                setAIConfig({ ollamaModel: names[0] });
            }
        } catch (err: any) {
            console.error('Ollama fetch error:', err);
            setOllamaError('Could not connect to Ollama. Ensure the server is running and CORS is enabled.');
            setOllamaModels([]);
        } finally {
            setIsFetchingModels(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'ai' && aiConfig.provider === 'ollama') {
            fetchOllamaModels(aiConfig.ollamaHost);
        }
    }, [activeTab, aiConfig.provider, aiConfig.ollamaHost]);

    // Generate QR codes when support tab is active
    useEffect(() => {
        if (activeTab === 'support') {
            // Wait for DOM to be ready
            const timer = setTimeout(() => {
                if (typeof QRCode !== 'undefined') {
                    const maribankEl = document.getElementById('maribank-qr-settings');
                    const landbankEl = document.getElementById('landbank-qr-settings');

                    if (maribankEl && !maribankEl.querySelector('canvas')) {
                        new QRCode(maribankEl, {
                            text: '00020101021127580012com.p2pqrpay0111LAUIPHM2XXX0208999644030411150909797605204601653036085802PH5914JUNDEE MARK M.6009Pagsanjan63049744',
                            width: 150,
                            height: 150,
                            colorDark: '#000000',
                            colorLight: '#ffffff'
                        });
                    }

                    if (landbankEl && !landbankEl.querySelector('canvas')) {
                        new QRCode(landbankEl, {
                            text: '00020101021127750012com.p2pqrpay0111TLBPPHMMXXX020899964403041059470298880514+63-94546802805204601653036085802PH5918JUNDEE MARK MOLINA6006Manila6304EECF',
                            width: 150,
                            height: 150,
                            colorDark: '#000000',
                            colorLight: '#ffffff'
                        });
                    }
                }
            }, 100);

            return () => clearTimeout(timer);
        }
    }, [activeTab]);

    const sidebarItems = [
        { id: 'profile', icon: User, label: 'My Profile' },
        { id: 'themes', icon: Palette, label: 'Themes' },
        { id: 'settings', icon: Settings, label: 'General Settings' },
        { id: 'ai', icon: Sparkles, label: 'AI Settings' },
        { id: 'notifications', icon: Bell, label: 'Notifications' },
        { id: 'shortcuts', icon: Command, label: 'Keyboard Shortcuts' },
        { id: 'support', icon: Coffee, label: 'Support' },
    ];

    const secondaryItems = [
        { id: 'referrals', icon: Gift, label: 'Referrals' },
        { id: 'downloads', icon: Download, label: 'Downloads' },
        { id: 'help', icon: HelpCircle, label: 'Help Center' },
        { id: 'trash', icon: Trash2, label: 'Trash' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <div className="settings-content-pane">
                        <h2>My Profile</h2>
                        <div className="profile-edit-section">
                            <div className="profile-avatar-upload">
                                <div className="avatar-preview">{user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}</div>
                                <button className="btn-secondary">Change Photo</button>
                            </div>
                            <div className="form-group">
                                <label>Full Name</label>
                                <input type="text" defaultValue={user?.name || ''} />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" defaultValue={user?.email || ''} />
                            </div>
                            <div className="form-group">
                                <label>Job Title</label>
                                <input type="text" defaultValue="Full Stack Developer" />
                            </div>
                        </div>
                    </div>
                );
            case 'ai':
                return (
                    <div className="settings-content-pane">
                        <h2>AI Assistant Settings</h2>
                        <div className="form-section">
                            <h3>AI Provider</h3>
                            <div className="provider-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                {[
                                    { id: 'gemini', label: 'Google Gemini', description: 'Requires API Key' },
                                    { id: 'ollama', label: 'Ollama (Local)', description: 'Requires local server' }
                                ].map((p) => (
                                    <div
                                        key={p.id}
                                        className={`theme-card ${aiConfig.provider === p.id ? 'active' : ''}`}
                                        onClick={() => setAIConfig({ provider: p.id as any })}
                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '16px', textAlign: 'left', gap: '4px' }}
                                    >
                                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '600' }}>{p.label}</span>
                                            {aiConfig.provider === p.id && <Check size={16} className="check-icon" />}
                                        </div>
                                        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{p.description}</span>
                                    </div>
                                ))}
                            </div>

                            {aiConfig.provider === 'ollama' && (
                                <div className="ollama-settings animated-fade-in">
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label>Ollama Host</label>
                                            <button
                                                className="btn-text-small"
                                                onClick={() => fetchOllamaModels(aiConfig.ollamaHost)}
                                                disabled={isFetchingModels}
                                            >
                                                {isFetchingModels ? 'Connecting...' : 'Refresh Models'}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={aiConfig.ollamaHost}
                                            onChange={(e) => setAIConfig({ ollamaHost: e.target.value })}
                                            placeholder="http://localhost:11434"
                                            onBlur={() => fetchOllamaModels(aiConfig.ollamaHost)}
                                        />
                                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>The URL where your Ollama instance is running.</p>
                                    </div>

                                    {ollamaError && (
                                        <div style={{ padding: '8px 12px', background: 'var(--error-light)', color: 'var(--error)', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', border: '1px solid var(--error)' }}>
                                            {ollamaError}
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Model Name</label>
                                        {ollamaModels.length > 0 ? (
                                            <select
                                                value={aiConfig.ollamaModel}
                                                onChange={(e) => setAIConfig({ ollamaModel: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-main)', fontSize: '14px' }}
                                            >
                                                {ollamaModels.map(model => (
                                                    <option key={model} value={model}>{model}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                value={aiConfig.ollamaModel}
                                                onChange={(e) => setAIConfig({ ollamaModel: e.target.value })}
                                                placeholder="llama3"
                                                disabled={isFetchingModels}
                                            />
                                        )}
                                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                            {ollamaModels.length > 0 ? 'Select from your installed models.' : 'No models found. Enter name manually or check host.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {aiConfig.provider === 'gemini' && (
                                <div className="gemini-info animated-fade-in" style={{ padding: '16px', background: 'var(--bg-side)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Globe size={20} className="text-primary" />
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Cloud AI Powered</h4>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                                Using Gemini 2.5 Flash for fast and intelligent responses. Ensure your API key is correctly configured in the `.env` file.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'themes':
                return (
                    <div className="settings-content-pane">
                        <h2>Themes</h2>
                        <div className="themes-grid">
                            {[
                                { id: 'light', icon: Sun, label: 'Light' },
                                { id: 'dark', icon: Moon, label: 'Dark' },
                                { id: 'system', icon: Monitor, label: 'System' }
                            ].map((t) => (
                                <div
                                    key={t.id}
                                    className={`theme-card ${theme === t.id ? 'active' : ''}`}
                                    onClick={() => setTheme(t.id as any)}
                                >
                                    <t.icon size={24} />
                                    <span>{t.label}</span>
                                    {theme === t.id && <Check size={16} className="check-icon" />}
                                </div>
                            ))}
                        </div>
                        <div className="color-presets">
                            <h3>Accent Color</h3>
                            <div className="colors-row">
                                {['#2563eb', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'].map(color => (
                                    <div
                                        key={color}
                                        className={`color-circle ${accentColor === color ? 'active' : ''}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setAccentColor(color)}
                                    >
                                        {accentColor === color && <Check size={14} color="white" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'shortcuts':
                return (
                    <div className="settings-content-pane">
                        <h2>Keyboard Shortcuts</h2>
                        <div className="shortcuts-list">
                            <div className="shortcut-group">
                                <h3>Common</h3>
                                <div className="shortcut-item">
                                    <span>Create new task</span>
                                    <kbd>t</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span>Quick search</span>
                                    <kbd>/</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span>Close modal</span>
                                    <kbd>esc</kbd>
                                </div>
                            </div>
                            <div className="shortcut-group">
                                <h3>Navigation</h3>
                                <div className="shortcut-item">
                                    <span>Go to Home</span>
                                    <kbd>g</kbd> <kbd>h</kbd>
                                </div>
                                <div className="shortcut-item">
                                    <span>Go to Inbox</span>
                                    <kbd>g</kbd> <kbd>i</kbd>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'notifications':
                const requestBrowserPermission = async () => {
                    if ('Notification' in window && Notification.permission === 'default') {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            updateNotificationSettings({ browserNotifications: true });
                        }
                    }
                };

                return (
                    <div className="settings-content-pane">
                        <h2>Notification Settings</h2>
                        <div className="form-section">
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <label style={{ marginBottom: '4px', display: 'block' }}>Enable Notifications</label>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Receive notifications for tasks and updates</p>
                                    </div>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={notificationSettings.enabled}
                                            onChange={(e) => updateNotificationSettings({ enabled: e.target.checked })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            {notificationSettings.enabled && (
                                <>
                                    <div className="form-group">
                                        <label>Due Date Notifications</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px' }}>Notify when task is overdue</span>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationSettings.notifyOnOverdue}
                                                        onChange={(e) => updateNotificationSettings({ notifyOnOverdue: e.target.checked })}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px' }}>Notify when task is due soon</span>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationSettings.notifyOnDueSoon}
                                                        onChange={(e) => updateNotificationSettings({ notifyOnDueSoon: e.target.checked })}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {notificationSettings.notifyOnDueSoon && (
                                        <div className="form-group">
                                            <label>Due Soon Threshold</label>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Notify me when a task is due within</p>
                                            <select
                                                value={notificationSettings.dueSoonDays}
                                                onChange={(e) => updateNotificationSettings({ dueSoonDays: parseInt(e.target.value) })}
                                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                                            >
                                                <option value="1">1 day</option>
                                                <option value="2">2 days</option>
                                                <option value="3">3 days</option>
                                                <option value="5">5 days</option>
                                                <option value="7">1 week</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>Other Notifications</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '14px' }}>Task assignments</span>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationSettings.notifyOnAssignment}
                                                        onChange={(e) => updateNotificationSettings({ notifyOnAssignment: e.target.checked })}
                                                    />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div>
                                                <label style={{ marginBottom: '4px', display: 'block' }}>Browser Notifications</label>
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Show desktop notifications</p>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.browserNotifications}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            requestBrowserPermission();
                                                        } else {
                                                            updateNotificationSettings({ browserNotifications: false });
                                                        }
                                                    }}
                                                    disabled={'Notification' in window && Notification.permission === 'denied'}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                        {'Notification' in window && Notification.permission === 'denied' && (
                                            <p style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '8px' }}>
                                                Browser notifications are blocked. Please enable them in your browser settings.
                                            </p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <label style={{ marginBottom: '4px', display: 'block' }}>Sound</label>
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Play sound for notifications</p>
                                            </div>
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={notificationSettings.soundEnabled}
                                                    onChange={(e) => updateNotificationSettings({ soundEnabled: e.target.checked })}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            case 'support':
                return (
                    <div className="settings-content-pane">
                        <h2>Support this Project</h2>
                        {/*<div className="support-info" style={{ textAlign: 'center' }}>
                            <div className="support-message">
                                <Coffee size={48} style={{ marginBottom: '16px', color: 'var(--primary)' }} />
                                <p style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--text-secondary)' }}>
                                    This is an open-source project. If you find it helpful, please consider supporting its development! 💝
                                </p>
                            </div>
                            <div className="qr-support-container" style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '32px' }}>
                                <div className="qr-support-card" style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: '220px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #4CAF50, #45a049)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)' }}>M</div>
                                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Maribank</h4>
                                    </div>
                                    <div id="maribank-qr-settings" style={{ background: 'white', padding: '12px', borderRadius: '8px', display: 'inline-block', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}></div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>JUNDEE MARK M.</p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Scan with your banking app</p>
                                </div>
                                <div className="qr-support-card" style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', minWidth: '220px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2196F3, #1976D2)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)' }}>L</div>
                                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Landbank</h4>
                                    </div>
                                    <div id="landbank-qr-settings" style={{ background: 'white', padding: '12px', borderRadius: '8px', display: 'inline-block', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}></div>
                                    <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>JUNDEE MARK MOLINA</p>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Scan with your banking app</p>
                                </div>
                            </div>
                            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Thank you for your support! ❤️</p>
                            </div>
                        </div>*/}
                    </div>
                );
            default:
                return (
                    <div className="settings-content-pane">
                        <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings</h2>
                        <p>Settings for {activeTab} will appear here.</p>
                    </div>
                );
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-sidebar">
                    <div className="sidebar-header">
                        <h3>Settings</h3>
                    </div>
                    <div className="sidebar-nav">
                        {sidebarItems.map(item => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                        <div className="sidebar-divider"></div>
                        {secondaryItems.map(item => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="sidebar-footer">
                        <button className="logout-btn" onClick={() => {
                            localStorage.clear();
                            window.location.reload();
                        }}>
                            <LogOut size={18} />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>

                <div className="settings-main">
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                    <div className="settings-content">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
