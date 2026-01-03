import React, { useState, useRef } from 'react';
import {
    Video,
    Plus,
    Search,
    List,
    LayoutGrid,
    ChevronDown,
    Play,
    Pause,
    Clock,
    Send,
    Edit2,
    Link,
    Trash2,
    Download,
    Copy,
    MoreHorizontal,
    MessageSquare,
    Type,
    MessageCircle,
    Mic,
    Paperclip,
    Smile,
    AtSign,
    Monitor
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import CreateClipModal from '../components/CreateClipModal';
import ContextMenu, { useContextMenu } from '../components/ContextMenu';
import '../styles/ClipsView.css';

const ClipsView: React.FC = () => {
    const { clips, addClipComment, deleteClip, renameClip } = useAppStore();
    const { user } = useAuthStore();
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sidebarMode, setSidebarMode] = useState<'comments' | 'transcript'>('comments');
    const [commentText, setCommentText] = useState('');
    const { showContextMenu, contextMenuProps, hideContextMenu } = useContextMenu();

    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleProgressChange = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        videoRef.current.currentTime = percentage * duration;
    };

    const selectedClip = clips.find(c => c.id === selectedClipId);

    const handleBack = () => setSelectedClipId(null);

    const handleRename = (id: string, currentName: string) => {
        const newName = window.prompt('Rename clip:', currentName);
        if (newName && newName.trim()) {
            renameClip(id, newName.trim());
        }
    };

    const handleShowOptions = (e: React.MouseEvent, clip: any) => {
        e.stopPropagation();
        console.log('ClipsView: Requesting options for clip:', clip.id, clip.name);
        showContextMenu(e, [
            { label: 'Rename', icon: <Edit2 size={14} />, onClick: () => handleRename(clip.id, clip.name) },
            { label: 'Download', icon: <Download size={14} />, onClick: () => alert('Download starting...') },
            {
                label: 'Delete', icon: <Trash2 size={14} />, onClick: () => {
                    const clipToDeleteId = clip.id;
                    const clipToDeleteName = clip.name;
                    console.log('ClipsView: Initiating delete for:', clipToDeleteId, clipToDeleteName);

                    // Direct action
                    deleteClip(clipToDeleteId);

                    // If we are currently watching this clip, go back to hub
                    if (selectedClipId === clipToDeleteId) {
                        console.log('ClipsView: Closing player for deleted clip');
                        setSelectedClipId(null);
                    }
                }, danger: true
            },
        ]);
    };

    const handleAddComment = () => {
        if (!selectedClipId || !commentText.trim()) return;
        addClipComment(selectedClipId, {
            userId: user?.id || 'user-1',
            userName: user?.name || 'Jundee Mark Gerona Molina',
            text: commentText
        });
        setCommentText('');
    };

    const renderContent = () => {
        // --- Player View ---
        if (selectedClip) {
            return (
                <div className="view-container clip-player-view">
                    <div className="view-header clips-header player-header">
                        <div className="breadcrumb">
                            <Video size={18} className="header-icon" onClick={handleBack} style={{ cursor: 'pointer' }} />
                            <span className="breadcrumb-separator">/</span>
                            <span className="clip-name-header">{selectedClip.name}</span>
                        </div>
                        <div className="view-controls">
                            <button className="btn-secondary copy-link">
                                <Copy size={16} /> Copy link
                            </button>
                            <button className="icon-btn" onClick={(e) => handleShowOptions(e, selectedClip)}>
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="player-layout">
                        <div className="player-main">
                            <div className="video-viewport" onClick={togglePlay}>
                                <video
                                    ref={videoRef}
                                    src={selectedClip.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"}
                                    className="video-element"
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    playsInline
                                />
                                {!isPlaying && (
                                    <div className="play-button-overlay">
                                        <div className="play-icon-circle">
                                            <Play size={32} fill="currentColor" />
                                        </div>
                                    </div>
                                )}
                                <div className="video-controls-bar" onClick={(e) => e.stopPropagation()}>
                                    <div className="progress-bar-container" onClick={handleProgressChange}>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                            <div className="progress-knob" style={{ left: `${(currentTime / duration) * 100}%`, display: 'block' }}></div>
                                        </div>
                                    </div>
                                    <div className="controls-row">
                                        <div className="left-controls">
                                            <button className="icon-btn-plain" onClick={togglePlay}>
                                                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                                            </button>
                                            <Clock size={16} />
                                            <span className="time-display">{formatTime(currentTime)} / {formatTime(duration || 0)}</span>
                                        </div>
                                        <div className="right-controls">
                                            <span className="speed-ctrl">1x</span>
                                            <LayoutGrid size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="clip-info-footer">
                                <div className="clip-title-row">
                                    <h2>{selectedClip.name}</h2>
                                    <button className="btn-primary add-comment-btn" onClick={() => setSidebarMode('comments')}>
                                        <Plus size={16} /> Add comment
                                    </button>
                                </div>
                                <div className="clip-meta-row">
                                    <div className="user-avatar-sm">{selectedClip.ownerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                                    <span className="user-name">{selectedClip.ownerName}</span>
                                    <span className="meta-dot">•</span>
                                    <span className="timestamp">Just now</span>
                                </div>
                            </div>
                        </div>

                        <div className="player-sidebar">
                            <div className="sidebar-tabs">
                                <button
                                    className={`sidebar-tab ${sidebarMode === 'comments' ? 'active' : ''}`}
                                    onClick={() => setSidebarMode('comments')}
                                >
                                    <MessageSquare size={18} />
                                    <span>Comments</span>
                                </button>
                                <button
                                    className={`sidebar-tab ${sidebarMode === 'transcript' ? 'active' : ''}`}
                                    onClick={() => setSidebarMode('transcript')}
                                >
                                    <Type size={18} />
                                    <span>Transcript</span>
                                </button>
                            </div>

                            <div className="sidebar-content">
                                {sidebarMode === 'comments' ? (
                                    <div className="comments-view">
                                        <div className="empty-comments">
                                            <div className="empty-icon">
                                                <MessageCircle size={32} />
                                                <div className="plus-overlay"><Plus size={12} /></div>
                                            </div>
                                            <p>Click on the video to comment on this Clip.</p>
                                        </div>

                                        <div className="comment-input-area">
                                            <div className="comment-input-box">
                                                <textarea
                                                    placeholder="Leave comment at 00:00"
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                />
                                                <div className="input-actions">
                                                    <div className="left-actions">
                                                        <button className="icon-btn"><Plus size={14} /></button>
                                                        <button className="icon-btn"><Paperclip size={14} /></button>
                                                        <button className="icon-btn"><AtSign size={14} /></button>
                                                        <button className="icon-btn"><Smile size={14} /></button>
                                                        <button className="icon-btn"><Monitor size={14} /></button>
                                                        <button className="icon-btn"><Mic size={14} /></button>
                                                    </div>
                                                    <button className="send-btn" onClick={handleAddComment} disabled={!commentText.trim()}>
                                                        <Send size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="transcript-view">
                                        <div className="transcript-content">
                                            {selectedClip.transcript || "Nothing to see here"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // --- Hub View ---
        if (clips.length > 0) {
            return (
                <div className="view-container clips-view">
                    <div className="view-header clips-header">
                        <div className="breadcrumb">
                            <Video size={20} className="header-icon" />
                            <span className="space-name">Clips</span>
                        </div>
                        <div className="view-controls">
                            <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
                                <Plus size={16} /> New Clip
                            </button>
                        </div>
                    </div>

                    <div className="clips-hub-content">
                        <div className="hub-filters">
                            <div className="tabs">
                                {['All', 'Video Clips', 'Voice Clips', 'SyncUps', 'AI Notetaker'].map(tab => (
                                    <button
                                        key={tab}
                                        className={`tab ${activeTab === tab ? 'active' : ''}`}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="hub-actions">
                                <div className="sort-ctrl">
                                    <span>Sort: Date created</span>
                                    <ChevronDown size={14} />
                                </div>
                                <button className="icon-btn search-btn"><Search size={16} /></button>
                                <div className="view-toggle">
                                    <button className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
                                    <button className={`icon-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}><LayoutGrid size={16} /></button>
                                </div>
                            </div>
                        </div>

                        <div className={`clips-grid ${viewMode}`}>
                            {clips.map(clip => (
                                <div key={clip.id} className="clip-card" onClick={() => setSelectedClipId(clip.id)}>
                                    <div className="clip-thumbnail">
                                        <div className="play-icon-overlay">
                                            <Play size={20} fill="currentColor" />
                                        </div>
                                        <div className="clip-card-actions">
                                            <button className="card-action-btn" onClick={(e) => { e.stopPropagation(); alert('Link copied!'); }}>
                                                <Link size={14} />
                                            </button>
                                            <button className="card-action-btn" onClick={(e) => handleShowOptions(e, clip)}>
                                                <MoreHorizontal size={14} />
                                            </button>
                                        </div>
                                        <span className="duration">{clip.duration}</span>
                                    </div>
                                    <div className="clip-info">
                                        <h4 className="clip-name">{clip.name}</h4>
                                        <div className="clip-meta">
                                            <div className="type-badge">
                                                <div className="red-dot"></div>
                                                Video Clip
                                            </div>
                                            <span className="meta-dot">•</span>
                                            <span className="timestamp">Just now</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        // --- Empty View ---
        return (
            <div className="view-container clips-view">
                <div className="view-header clips-header">
                    <div className="breadcrumb">
                        <Video size={20} className="header-icon" />
                        <span className="space-name">Clips</span>
                    </div>
                    <div className="view-controls">
                        <button className="btn-primary" onClick={() => setIsCreateOpen(true)}>
                            <Plus size={16} /> New Clip
                        </button>
                    </div>
                </div>

                <div className="clips-empty-hero">
                    <div className="hero-content">
                        <div className="hero-illustration-wrapper">
                            <img
                                src="/clips_illustration.png"
                                alt="Welcome to Clips"
                                className="hero-illustration"
                            />
                            <div className="hero-overlay-gradient"></div>
                        </div>
                        <div className="hero-footer-cta">
                            <p>Capture, share, and collaborate with async video clips.</p>
                            <button className="btn-primary-lg" onClick={() => setIsCreateOpen(true)}>
                                <Video size={20} /> Create your first Clip
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            {isCreateOpen && <CreateClipModal onClose={() => setIsCreateOpen(false)} />}
            {contextMenuProps.visible && (
                <ContextMenu
                    x={contextMenuProps.x}
                    y={contextMenuProps.y}
                    items={contextMenuProps.items}
                    onClose={hideContextMenu}
                />
            )}
        </>
    );
};

export default ClipsView;
