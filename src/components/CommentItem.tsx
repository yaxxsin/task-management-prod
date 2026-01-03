import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, parseISO } from 'date-fns';
import type { Comment } from '../types';

interface CommentItemProps {
    comment: Comment;
    onImageClick: (src: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = React.memo(({ comment, onImageClick }) => {
    return (
        <div className="activity-row" style={{ marginBottom: '16px' }}>
            <div className="activity-avatar">{comment.userName[0]}</div>
            <div className="activity-info">
                <div className="activity-msg-header"><strong>{comment.userName}</strong></div>
                <div className="activity-msg">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        urlTransform={(url) => url}
                        components={{
                            img: ({ node, ...props }) => (
                                <img
                                    {...props}
                                    style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px', cursor: 'pointer' }}
                                    onClick={() => onImageClick(props.src || '')}
                                />
                            ),
                            a: ({ node, ...props }) => (
                                <a
                                    {...props}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                                />
                            ),
                            strong: ({ node, children, ...props }) => {
                                const content = children?.toString() || '';
                                if (content.startsWith('@')) {
                                    return (
                                        <span className="mention-pill" style={{
                                            backgroundColor: '#e0f2fe',
                                            color: '#0369a1',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: 600,
                                            fontSize: '0.9em',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            cursor: 'default'
                                        }}>
                                            {children}
                                        </span>
                                    );
                                }
                                return <strong {...props}>{children}</strong>;
                            }
                        }}
                    >
                        {comment.text}
                    </ReactMarkdown>
                </div>
                <div className="activity-time">{format(parseISO(comment.createdAt), 'MMM d, h:mm a')}</div>
            </div>
        </div>
    );
});

CommentItem.displayName = 'CommentItem';

export default CommentItem;
