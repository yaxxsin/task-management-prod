import React from 'react';
import { Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Task } from '../types';
import CommentItem from './CommentItem';
import CommentComposer from './CommentComposer';

interface ActivityPanelProps {
    task: Task;
    isSubtask: boolean;
    isGeneratingAIComment: boolean;
    onImageClick: (src: string) => void;
    onAIRequest: (query: string) => Promise<void>;
    activityFeedRef: React.RefObject<HTMLDivElement>;
    currentUserName: string;
    workspaceMembers: any[];
}

const ActivityPanel: React.FC<ActivityPanelProps> = ({
    task,
    isSubtask,
    isGeneratingAIComment,
    onImageClick,
    onAIRequest,
    activityFeedRef,
    currentUserName,
    workspaceMembers
}) => {
    return (
        <div className="activity-panel">
            <div className="panel-header">Activity</div>
            <div className="activity-feed" ref={activityFeedRef}>
                {task.comments && task.comments.map(comment => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        onImageClick={onImageClick}
                    />
                ))}

                {isGeneratingAIComment && (
                    <div className="activity-row" style={{ marginBottom: '16px' }}>
                        <div className="activity-avatar" style={{ backgroundColor: '#a855f7', color: 'white' }}>
                            <Sparkles size={12} fill="currentColor" />
                        </div>
                        <div className="activity-info">
                            <div className="activity-msg-header">
                                <span style={{ fontWeight: 700 }}>AI Assistant</span>
                            </div>
                            <div className="activity-msg" style={{ fontStyle: 'italic', color: '#64748b' }}>
                                <Sparkles size={12} className="animate-spin" style={{ marginRight: '6px', display: 'inline-block' }} />
                                Thinking...
                            </div>
                        </div>
                    </div>
                )}

                <div className="activity-row">
                    <div className="activity-avatar">{currentUserName[0]}</div>
                    <div className="activity-info">
                        <div className="activity-msg"><strong>{currentUserName}</strong> created this task</div>
                        <div className="activity-time">{format(parseISO(task.createdAt), 'MMM d, h:mm a')}</div>
                    </div>
                </div>
            </div>

            <CommentComposer
                taskId={task.id}
                isSubtask={isSubtask}
                onAIRequest={onAIRequest}
                workspaceMembers={workspaceMembers}
                taskName={task.name}
            />
        </div>
    );
};

export default ActivityPanel;
