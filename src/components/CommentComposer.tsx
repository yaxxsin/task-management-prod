import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Sparkles, Send, X, User as UserIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { getAuthToken } from '../store/storage';
import { API_ENDPOINTS } from '../config/api';

interface CommentComposerProps {
    taskId: string;
    isSubtask: boolean;
    onAIRequest?: (query: string) => Promise<void>;
    workspaceMembers?: any[];
    taskName?: string;
}

const CommentComposer: React.FC<CommentComposerProps> = ({ taskId, isSubtask, onAIRequest, workspaceMembers = [], taskName }) => {
    const { addComment } = useAppStore();
    const [commentText, setCommentText] = useState('');
    const [pastedImages, setPastedImages] = useState<string[]>([]);

    // Mention state
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const filteredMembers = workspaceMembers.filter(m => {
        const name = m.user_name || m.name || '';
        return name.toLowerCase().includes(mentionSearch.toLowerCase());
    });

    const handleAddComment = () => {
        if (isSubtask) {
            alert('Comments on subtasks not supported locally yet.');
            return;
        }
        if (!commentText.trim() && pastedImages.length === 0) return;

        // Auto-convert plain URLs to markdown links if not already markdown
        let formattedText = commentText;
        const urlRegex = /(?<!\()https?:\/\/[^\s]+(?!\))/g;
        formattedText = formattedText.replace(urlRegex, (url) => `[${url}](${url})`);

        // Append images
        if (pastedImages.length > 0) {
            formattedText += '\n\n' + pastedImages.map(img => `![Image](${img})`).join('\n\n');
        }

        const currentUser = useAuthStore.getState().user;
        addComment(taskId, {
            userId: currentUser?.id || 'guest',
            userName: currentUser?.name || 'Guest',
            text: formattedText
        });

        // Mention Notification Logic - Detect **@Full Name** format
        const mentionRegex = /\*\*@([^*]+)\*\*/g;
        const matches = [...formattedText.matchAll(mentionRegex)];
        const mentionedFullNames = matches.map(m => m[1]);

        if (mentionedFullNames.length > 0) {
            mentionedFullNames.forEach(fullName => {
                const member = workspaceMembers.find(m => (m.user_name || m.name || '') === fullName);
                const recipientId = member?.user_id || member?.id;

                if (member && recipientId && recipientId !== currentUser?.id) {
                    const token = getAuthToken();
                    if (token) {
                        const notification = {
                            type: 'mention',
                            title: 'You were mentioned',
                            message: `${currentUser?.name} mentioned you in a comment on "${taskName || 'a task'}"`,
                            taskId,
                            taskName: taskName || 'Task',
                            isRead: false,
                            createdAt: new Date().toISOString()
                        };

                        // Propagate notification to recipient's state
                        fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                ownerId: recipientId,
                                type: 'notification',
                                data: notification
                            })
                        }).catch(e => console.error('[CommentComposer] Failed to send mention notification:', e));
                    }
                }
            });

            // LOCAL: Notify the USER who mentioned (the sender) that notifications were sent
            useAppStore.getState().addNotification({
                type: 'mention',
                title: 'Mentions Sent',
                message: `You mentioned ${mentionedFullNames.join(', ')} in a comment.`,
                taskId,
                taskName: taskName || 'Task'
            });
        }

        // AI Logic
        if (commentText.includes('@AI') && onAIRequest) {
            const query = commentText.replace(/@AI/g, '').trim();
            onAIRequest(query);
        }

        setCommentText('');
        setPastedImages([]);
        setShowMentions(false);
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const pos = e.target.selectionStart;
        setCommentText(value);
        setCursorPosition(pos);

        // Simple mention trigger logic
        const lastAt = value.lastIndexOf('@', pos - 1);
        if (lastAt !== -1 && !/\s/.test(value.slice(lastAt + 1, pos))) {
            const search = value.slice(lastAt + 1, pos);
            setMentionSearch(search);
            setShowMentions(true);
        } else {
            setShowMentions(false);
        }
    };

    const handleCursorUpdate = (e: any) => {
        setCursorPosition(e.target.selectionStart);
    };

    const handleSelectMention = (member: any) => {
        const name = member.user_name || member.name || '';
        const lastAt = commentText.lastIndexOf('@', cursorPosition - 1);
        if (lastAt !== -1) {
            const newText = commentText.slice(0, lastAt) + '**@' + name + '** ' + commentText.slice(cursorPosition);
            setCommentText(newText);
            setShowMentions(false);
            // Timeout to allow render to catch up before focusing
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    // Set cursor at the end of the new insertion
                    const newCursorPos = lastAt + name.length + 5; // **@ + name + ** + space
                    textareaRef.current.selectionStart = newCursorPos;
                    textareaRef.current.selectionEnd = newCursorPos;
                }
            }, 0);
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target?.result;
                        if (typeof base64 === 'string') {
                            setPastedImages(prev => [...prev, base64]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
    };

    return (
        <div className="comment-composer-container" style={{ position: 'relative' }}>
            {showMentions && filteredMembers.length > 0 && (
                <div className="mention-dropdown" style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: 0,
                    width: '200px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    marginBottom: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {filteredMembers.map((member, idx) => (
                        <div
                            key={member.id || idx}
                            className="mention-item"
                            onClick={() => handleSelectMention(member)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                borderBottom: idx < filteredMembers.length - 1 ? '1px solid var(--border)' : 'none',
                                fontSize: '13px',
                                color: 'var(--text-main)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                            <div style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--bg-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)'
                            }}>
                                <UserIcon size={12} />
                            </div>
                            <span>{member.user_name || member.name}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="comment-composer">
                {pastedImages.length > 0 && (
                    <div className="pasted-images-preview">
                        {pastedImages.map((img, index) => (
                            <div key={index} className="preview-image-container">
                                <img src={img} alt="Pasted" className="preview-image" />
                                <button
                                    className="remove-image-btn"
                                    onClick={() => setPastedImages(prev => prev.filter((_, i) => i !== index))}
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    placeholder="Write a comment... use @AI to ask AI, @Name to mention"
                    value={commentText}
                    onChange={handleTextChange}
                    onSelect={handleCursorUpdate}
                    onClick={handleCursorUpdate}
                    onKeyUp={handleCursorUpdate}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !showMentions) {
                            e.preventDefault();
                            handleAddComment();
                        }
                        if (e.key === 'Escape') setShowMentions(false);
                    }}
                    onPaste={handlePaste}
                    rows={1}
                    style={{
                        height: 'auto',
                        minHeight: '40px',
                        maxHeight: '120px',
                        resize: 'none'
                    }}
                />
                <div className="composer-actions">
                    <button className="icon-btn-sm" title="Paste Image (Experimental)">
                        <ImageIcon size={14} />
                    </button>
                    <button
                        className="icon-btn-sm"
                        title="Ask AI"
                        onClick={() => setCommentText(prev => prev.includes('@AI') ? prev : prev + '@AI ')}
                        style={{ color: '#a855f7' }}
                    >
                        <Sparkles size={14} />
                    </button>
                    <button
                        className="icon-btn-sm"
                        onClick={handleAddComment}
                        disabled={!commentText.trim() && pastedImages.length === 0}
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentComposer;
