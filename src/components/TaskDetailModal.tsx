import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Trash2,
    CheckCircle2,
    Calendar,
    Plus,
    MoreVertical,
    ChevronDown,
    MessageSquare,
    Link2,
    Clock3,

    AlertCircle,
    Check,
    ChevronRight,
    ExternalLink,
    FileText as DocIcon,
    Users,
    Flag,
    MoreHorizontal,
    Tag,
    Edit2,
    MinusCircle,
    Search,
    Circle,
    Sparkles,
    ArrowUpDown,
    RotateCw,
    CornerDownLeft,
    Play,
    Square
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { format, parseISO } from 'date-fns';
import type { Task, Subtask } from '../types';
import PremiumDatePicker from './PremiumDatePicker';
import TimePicker from './TimePicker';

import RichTextEditor from './RichTextEditor';
import TaskOptionsMenu from './TaskOptionsMenu';
import RelationshipMenu from './RelationshipMenu';
import TagMenu from './TagMenu';
import ActivityPanel from './ActivityPanel';
import '../styles/TaskDetailModal.css';
import { API_ENDPOINTS } from '../config/api';

interface TaskDetailModalProps {
    taskId: string;
    onClose: () => void;
    onTaskClick?: (id: string) => void;
}

type SidebarTab = 'activity' | 'blocking' | 'waiting' | 'links' | 'more';

const SubtaskInput: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
    const [name, setName] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onAdd(name);
            setName('');
        }
    };
    return (
        <form onSubmit={handleSubmit} className="subtask-add-row">
            <div className="st-cell-name">
                <Plus size={14} className="plus-icon-st" />
                <input
                    placeholder="Add Task"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
        </form>
    );
};

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ taskId, onClose, onTaskClick }) => {
    const {
        tasks,
        spaces,
        lists,
        updateTask,
        deleteTask,
        addSubtask,
        updateSubtask,
        tags,
        docs,
        addDoc,
        setCurrentView,
        addComment,
        addTimeEntry,

        duplicateTask,
        archiveTask,
        addTag,
        updateTag,
        deleteTag,
        aiConfig,
        activeTimer,
        startTimer,
        stopTimer
    } = useAppStore();

    // Logic to find task or subtask
    let task: Task | undefined = tasks.find(t => t.id === taskId);
    let isSubtask = false;
    let parentTask: Task | undefined = undefined;

    if (!task) {
        for (const t of tasks) {
            if (t.subtasks) {
                const sub = t.subtasks.find(s => s.id === taskId);
                if (sub) {
                    // Create a pseudo-Task object from the subtask
                    task = {
                        ...sub,
                        description: '',
                        spaceId: t.spaceId,
                        listId: t.listId,
                        tags: [],
                        subtasks: [],
                        comments: [],
                        timeEntries: [],
                        relationships: [],
                        linkedDocId: undefined,
                        startDate: undefined
                    } as unknown as Task;
                    isSubtask = true;
                    parentTask = t;
                    break;
                }
            }
        }
    }

    const [activeTab, setActiveTab] = useState<'details' | 'subtasks'>('details');
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('activity');
    // newSubtaskName state moved to SubtaskInput component
    const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
    const [optionsMenuTrigger, setOptionsMenuTrigger] = useState<HTMLElement | null>(null);
    const [isTagPickerOpen, setIsTagPickerOpen] = useState(false);
    const [tagPickerTrigger, setTagPickerTrigger] = useState<HTMLElement | null>(null);
    const [isRelationshipPickerOpen, setIsRelationshipPickerOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [datePickerTrigger, setDatePickerTrigger] = useState<HTMLElement | null>(null);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [timePickerTrigger, setTimePickerTrigger] = useState<HTMLElement | null>(null);


    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isGeneratingSubtasks, setIsGeneratingSubtasks] = useState(false);

    const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
    const [isEnhancingTitle, setIsEnhancingTitle] = useState(false);
    const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
    const [isPriorityPickerOpen, setIsPriorityPickerOpen] = useState(false);
    const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);
    const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
    const [assigneeSearch, setAssigneeSearch] = useState('');
    const { token, user: currentUser } = useAuthStore();
    const activityFeedRef = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
    const titleSuggestionRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (activityFeedRef.current) {
            activityFeedRef.current.scrollTop = activityFeedRef.current.scrollHeight;
        }
    }, [task?.comments, sidebarTab]);



    useEffect(() => {
        const fetchMembers = async () => {
            // Reset members immediately to avoid stale data from previous task/space
            setWorkspaceMembers([]);

            if (!task?.spaceId || !token) return;

            let allMembers: any[] = [];

            try {
                // Fetch space members
                const spaceRes = await fetch(`${API_ENDPOINTS.RESOURCE_MEMBERS}?resourceType=space&resourceId=${task.spaceId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (spaceRes.ok) {
                    allMembers = await spaceRes.json();
                }

                // If task is in a list, also fetch list members
                if (task.listId) {
                    const listRes = await fetch(`${API_ENDPOINTS.RESOURCE_MEMBERS}?resourceType=list&resourceId=${task.listId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (listRes.ok) {
                        const listMembers = await listRes.json();
                        // Merge and de-duplicate
                        listMembers.forEach((lm: any) => {
                            if (!allMembers.find((am: any) => am.id === lm.id)) {
                                allMembers.push(lm);
                            }
                        });
                    }
                }

                // Safety net: Check if we have the space locally and can identify the owner
                const space = useAppStore.getState().spaces.find(s => s.id === task.spaceId);
                if (space && space.ownerId && space.ownerName) {
                    if (!allMembers.find((am: any) => am.id === space.ownerId || am.user_id === space.ownerId)) {
                        allMembers.push({
                            id: space.ownerId,
                            user_id: space.ownerId,
                            user_name: space.ownerName,
                            name: space.ownerName,
                            role: 'owner'
                        });
                    }
                }

                setWorkspaceMembers(allMembers);
            } catch (e) {
                console.error('Failed to fetch members', e);
            }
        };
        fetchMembers();

        return () => {
            setWorkspaceMembers([]);
        };
    }, [task?.spaceId, task?.listId, token]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && suggestedTitles.length > 0) {
                setSuggestedTitles([]);
            }
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (titleSuggestionRef.current && !titleSuggestionRef.current.contains(e.target as Node)) {
                setSuggestedTitles([]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [suggestedTitles]);
    if (!task) return null;

    const handleSuggestSubtasks = async () => {
        if (!task) return;
        setIsGeneratingSubtasks(true);
        setSuggestedSubtasks([]); // Reset previous suggestions

        const prompt = `Suggest 3-5 subtasks for the task "${task.name}".
        Description: ${task.description || 'No description'}.
        Return ONLY a JSON array of strings, e.g. ["Subtask 1", "Subtask 2"]. No markdown, no code blocks, just raw JSON.`;

        try {
            let responseText = '';
            if (aiConfig.provider === 'ollama') {
                const response = await fetch(`${aiConfig.ollamaHost}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: aiConfig.ollamaModel,
                        prompt: prompt,
                        stream: false
                    }),
                });
                if (!response.ok) throw new Error('Ollama Error');
                const data = await response.json();
                responseText = data.response;
            } else {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) throw new Error('Please configure Gemini API Key');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent(prompt);
                responseText = result.response.text();
            }

            // Cleanup potential markdown code blocks
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const suggestions = JSON.parse(cleanJson);

            if (Array.isArray(suggestions)) {
                setSuggestedSubtasks(suggestions);
                // Select all by default
                setSelectedSuggestions(new Set(suggestions));
            }
        } catch (error) {
            console.error("AI Subtask Error:", error);
            alert("Failed to generate subtasks. Check AI settings.");
        } finally {
            setIsGeneratingSubtasks(false);
        }
    };

    const handleEnhanceTitle = async () => {
        if (!task) return;
        setIsEnhancingTitle(true);
        setSuggestedTitles([]);

        const prompt = `Enhance the task title: "${task.name}".
        Description: ${task.description || 'No description'}.
        Suggest exactly 3 improved, professional, and concise task titles.
        Return ONLY the 3 titles, one per line, without numbering or extra text.
        IMPORTANT: Do NOT use markdown (no asterisks), do NOT use quotes, and do NOT use commas.`;

        try {
            let responseText = '';
            if (aiConfig.provider === 'ollama') {
                const response = await fetch(`${aiConfig.ollamaHost}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: aiConfig.ollamaModel,
                        prompt: prompt,
                        stream: false
                    }),
                });
                if (!response.ok) throw new Error('Ollama Error');
                const data = await response.json();
                responseText = data.response;
            } else {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) throw new Error('Please configure Gemini API Key');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent(prompt);
                responseText = result.response.text();
            }

            const titles = responseText.split('\n')
                .map(s => s.trim()
                    .replace(/\*/g, '') // Remove asterisks
                    .replace(/^"(.*)"$/, '$1') // Remove leading/trailing quotes
                    .replace(/^'(.*)'$/, '$1') // Remove leading/trailing single quotes
                    .replace(/,/g, '') // Remove commas
                    .trim()
                )
                .filter(s => s.length > 0)
                .slice(0, 3);

            setSuggestedTitles(titles);
        } catch (error) {
            console.error("AI Enhance Title Error:", error);
            alert("Failed to enhance title. Check AI settings.");
        } finally {
            setIsEnhancingTitle(false);
        }
    };

    const handleConfirmSubtasks = () => {
        selectedSuggestions.forEach(name => {
            addSubtask(taskId, { name, status: 'TO DO' });
        });
        setSuggestedSubtasks([]);
        setSelectedSuggestions(new Set());
    };

    const handleCancelSubtasks = () => {
        setSuggestedSubtasks([]);
        setSelectedSuggestions(new Set());
    };

    const toggleSuggestion = (name: string) => {
        const newSelected = new Set(selectedSuggestions);
        if (newSelected.has(name)) {
            newSelected.delete(name);
        } else {
            newSelected.add(name);
        }
        setSelectedSuggestions(newSelected);
    };

    const handleUpdate = (updates: Partial<Task>) => {
        if (isSubtask && parentTask) {
            const validSubtaskKeys = ['name', 'status', 'priority', 'assignee', 'dueDate'];
            const subtaskUpdates: any = {};

            Object.keys(updates).forEach(key => {
                if (validSubtaskKeys.includes(key)) {
                    subtaskUpdates[key] = updates[key as keyof Task];
                }
            });

            if (Object.keys(subtaskUpdates).length > 0) {
                updateSubtask(parentTask.id, taskId, subtaskUpdates);
            }
        } else {
            updateTask(taskId, updates);
        }
    };

    const handleConvertToDoc = () => {
        if (isSubtask) {
            alert('Cannot convert subtask to doc yet.');
            return;
        }
        if (!task || !task.description) {
            alert('This task has no description to convert!');
            return;
        }

        const docId = addDoc({
            name: `${task.name} - Specification`,
            content: task.description,
            userId: 'user-1',
            userName: 'Jundee',
            spaceId: task.spaceId
        });

        handleUpdate({ linkedDocId: docId });
        alert('Converted to Doc successfully!');
    };

    const handleOpenLinkedDoc = () => {
        if (task?.linkedDocId) {
            setCurrentView('docs');
            onClose();
        }
    };

    const handleDuplicate = () => {
        if (isSubtask) {
            alert('Cannot duplicate subtask yet.');
            return;
        }
        duplicateTask(taskId);
        setIsOptionsMenuOpen(false);
    };

    const handleArchive = () => {
        if (isSubtask) {
            // Treat as delete for now or update status
            handleUpdate({ status: 'COMPLETED' });
            return;
        }
        archiveTask(taskId);
        setIsOptionsMenuOpen(false);
    };

    const handleRename = () => {
        const titleInput = document.querySelector('.detail-title-input') as HTMLInputElement;
        if (titleInput) titleInput.focus();
        setIsOptionsMenuOpen(false);
    };

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = () => {
        if (isSubtask && parentTask) {
            const newSubtasks = parentTask.subtasks?.filter(st => st.id !== taskId) || [];
            updateTask(parentTask.id, { subtasks: newSubtasks });
        } else {
            deleteTask(taskId);
        }
        setShowDeleteConfirm(false);
        onClose();
    };

    const handleAddSubtask = (name: string) => {
        if (isSubtask) return; // Prevent adding subtasks to subtasks
        if (!name.trim()) return;
        addSubtask(taskId, {
            name: name,
            status: 'TO DO'
        });
    };

    const [isGeneratingAIComment, setIsGeneratingAIComment] = useState(false);

    const handleAIResponse = async (query: string) => {
        setIsGeneratingAIComment(true);
        // Add a temporary "Thinking..." comment or just show loading state.
        // For now, let's just make the API call and append the comment.
        try {
            let responseText = '';
            let prompt = `You are a helpful project management assistant. A user asked: "${query}".
            Context: Task "${task.name}", Description: "${task.description}".
            Provide a direct answer without using a name prefix like 'AI Assistant:'.`;

            if (aiConfig.provider === 'ollama') {
                const response = await fetch(`${aiConfig.ollamaHost}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: aiConfig.ollamaModel,
                        prompt: prompt,
                        stream: false
                    }),
                });
                if (!response.ok) throw new Error('Ollama Error');
                const data = await response.json();
                responseText = data.response;
            } else {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) throw new Error('Please configure Gemini API Key for AI responses.');
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent(prompt);
                responseText = result.response.text();
            }

            // Cleanup prefix if present
            responseText = responseText.replace(/^AI Assistant:\s*/i, '').replace(/^\*\*AI Assistant\*\*:\s*/i, '');

            addComment(taskId, {
                userId: 'ai-bot',
                userName: 'AI Assistant',
                text: responseText
            });

        } catch (error) {
            console.error("AI Response Error:", error);
            addComment(taskId, {
                userId: 'ai-bot',
                userName: 'AI Assistant',
                text: "Sorry, I encountered an error while processing your request."
            });
        } finally {
            setIsGeneratingAIComment(false);
        }
    };



    const handleAddTime = (time: string) => {
        // Log the time entry with the selected slot name
        addTimeEntry(taskId, {
            duration: 30, // Default slot duration
            date: new Date().toISOString(),
            userId: 'user-1',
            // note: `Slotted for ${time}` // Optionally add metadata if your type supports it
        });
        console.log(`Time logged for slot: ${time}`);
        setIsTimePickerOpen(false);
    };

    const toggleTag = (tagId: string) => {
        const currentTags = task.tags || [];
        const newTags = currentTags.includes(tagId)
            ? currentTags.filter(t => t !== tagId)
            : [...currentTags, tagId];
        handleUpdate({ tags: newTags });
    };

    const currentSpace = spaces.find(s => s.id === task.spaceId);
    const currentList = lists.find(l => l.id === task.listId);

    const isTimerRunning = activeTimer?.taskId === taskId;
    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && activeTimer) {
            const start = new Date(activeTimer.startTime).getTime();
            setElapsedTime(Math.floor((new Date().getTime() - start) / 1000));

            interval = setInterval(() => {
                const now = new Date().getTime();
                setElapsedTime(Math.floor((now - start) / 1000));
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, activeTimer?.startTime]);

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content task-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="detail-location-bar">
                    <div className="location-breadcrumb" onClick={() => setIsLocationPickerOpen(!isLocationPickerOpen)}>
                        <div className="space-dot" style={{ backgroundColor: currentSpace?.color || '#cbd5e1' }}></div>
                        <span className="location-text">{currentSpace?.name || 'No Space'}</span>
                        <ChevronRight size={12} />
                        <span className="location-text">{currentList?.name || 'No List'}</span>
                        <ChevronDown size={14} />
                    </div>
                    {isLocationPickerOpen && (
                        <div className="location-dropdown">
                            {spaces.map(s => (
                                <div key={s.id} className="location-space-group">
                                    <div className="location-space-item" onClick={() => handleUpdate({ spaceId: s.id })}>
                                        <div className="space-dot" style={{ backgroundColor: s.color || '#cbd5e1' }}></div>
                                        <span>{s.name}</span>
                                    </div>
                                    <div className="location-lists">
                                        {lists.filter(l => l.spaceId === s.id).map(l => (
                                            <div
                                                key={l.id}
                                                className={`location-list-item ${task.listId === l.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    handleUpdate({ spaceId: s.id, listId: l.id });
                                                    setIsLocationPickerOpen(false);
                                                }}
                                            >
                                                {l.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {previewImage && (
                    <div className="image-lightbox-overlay" onClick={() => setPreviewImage(null)}>
                        <div className="image-lightbox-content" onClick={e => e.stopPropagation()}>
                            <img src={previewImage} alt="Preview" />
                            <button className="lightbox-close-btn" onClick={() => setPreviewImage(null)}>
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="detail-header">
                    <div className="detail-header-left">
                        <button className="status-badge-detail" style={{ background: task.status === 'COMPLETED' ? '#22c55e' : '#3b82f6' }}>
                            <CheckCircle2 size={14} />
                            {task.status}
                            <ChevronDown size={14} />
                        </button>
                        <span className="task-id">ID: {task.id.substring(0, 8)}</span>
                    </div>
                    <div className="detail-header-right">
                        <button className="icon-btn-ghost" onClick={handleDeleteClick} title="Delete Task">
                            <Trash2 size={18} />
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="icon-btn-ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setOptionsMenuTrigger(e.currentTarget);
                                    setIsOptionsMenuOpen(!isOptionsMenuOpen);
                                }}
                            >
                                <MoreVertical size={18} />
                            </button>
                            {isOptionsMenuOpen && (
                                <TaskOptionsMenu
                                    taskId={taskId}
                                    onClose={() => {
                                        setIsOptionsMenuOpen(false);
                                        setOptionsMenuTrigger(null);
                                    }}
                                    onRename={handleRename}
                                    onDuplicate={handleDuplicate}
                                    onArchive={handleArchive}
                                    onDelete={handleDeleteClick}
                                    onConvertToDoc={handleConvertToDoc}
                                    onMove={() => { setIsLocationPickerOpen(true); setIsOptionsMenuOpen(false); }}
                                    onStartTimer={() => { alert('Timer started for task ' + taskId); setIsOptionsMenuOpen(false); }}
                                    triggerElement={optionsMenuTrigger}
                                />
                            )}
                        </div>
                        <button className="icon-btn-ghost" onClick={onClose}><X size={20} /></button>
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="modal-overlay" style={{ zIndex: 3000 }} onClick={() => setShowDeleteConfirm(false)}>
                        <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()} style={{ width: '400px', height: 'auto', padding: '24px', maxWidth: '90vw', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)' }}>Delete Task?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '14px', lineHeight: 1.5 }}>
                                Are you sure you want to delete <strong>"{task.name}"</strong>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    style={{
                                        padding: '8px 16px',
                                        background: 'transparent',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        color: 'var(--text-main)'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete Task
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="detail-body">
                    <div className="detail-main">
                        <div className="title-container">
                            <input
                                className="detail-title-input"
                                value={task.name}
                                onChange={(e) => handleUpdate({ name: e.target.value })}
                                placeholder="Task name"
                            />
                            {!isSubtask && (
                                <button
                                    className="btn-enhance-title"
                                    onClick={handleEnhanceTitle}
                                    disabled={isEnhancingTitle}
                                    title="Enhance Title with AI"
                                >
                                    <Sparkles size={16} className={isEnhancingTitle ? "animate-spin" : ""} />
                                    {isEnhancingTitle ? 'Enhancing...' : 'Enhance title'}
                                </button>
                            )}

                            {suggestedTitles.length > 0 && (
                                <div className="title-suggestion-popover" ref={titleSuggestionRef}>
                                    <div className="suggestion-header-content">
                                        <span className="suggestion-label">
                                            <Sparkles size={12} style={{ marginRight: '6px' }} />
                                            AI Suggestions
                                        </span>
                                        <div className="suggestion-header-actions">
                                            <button
                                                className="btn-refresh-suggestion-icon"
                                                onClick={handleEnhanceTitle}
                                                disabled={isEnhancingTitle}
                                                title="Regenerate"
                                            >
                                                <RotateCw size={14} className={isEnhancingTitle ? 'animate-spin' : ''} />
                                            </button>
                                            <button
                                                className="btn-close-popover"
                                                onClick={() => setSuggestedTitles([])}
                                                title="Dismiss"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="suggested-titles-list">
                                        {suggestedTitles.map((title, idx) => (
                                            <div
                                                key={idx}
                                                className="suggested-title-item"
                                                onClick={() => {
                                                    handleUpdate({ name: title });
                                                    setSuggestedTitles([]);
                                                }}
                                            >
                                                <div className="suggested-title-text-main">{title}</div>
                                                <CornerDownLeft size={14} className="enter-icon-suggestion" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="detail-meta-grid">
                            <div className="meta-left-col">
                                <div className="meta-item">
                                    <span className="meta-label">Status</span>
                                    <div className="meta-inline-val">
                                        <span className="status-dot-small" style={{ backgroundColor: task.status === 'COMPLETED' ? '#22c55e' : '#3b82f6' }}></span>
                                        {task.status}
                                    </div>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Dates</span>
                                    <div className="meta-inline-val">
                                        <div
                                            className="date-range-display-premium"
                                            onClick={(e) => {
                                                setDatePickerTrigger(e.currentTarget);
                                                setIsDatePickerOpen(true);
                                            }}
                                        >
                                            <Calendar size={14} />
                                            <span className="date-text">
                                                {task.startDate ? (
                                                    task.startDate.includes('T')
                                                        ? format(new Date(task.startDate), 'M/d/yy h:mm a')
                                                        : format(new Date(task.startDate), 'M/d/yy')
                                                ) : 'Set start'}
                                                <span className="arrow"> → </span>
                                                {task.dueDate ? (
                                                    task.dueDate.includes('T')
                                                        ? format(new Date(task.dueDate), 'M/d/yy h:mm a')
                                                        : format(new Date(task.dueDate), 'M/d/yy')
                                                ) : 'Set due'}
                                            </span>
                                        </div>

                                        {isDatePickerOpen && (
                                            <PremiumDatePicker
                                                startDate={task.startDate}
                                                dueDate={task.dueDate}
                                                onSave={(dates) => {
                                                    handleUpdate(dates);
                                                    setIsDatePickerOpen(false);
                                                }}
                                                onClose={() => setIsDatePickerOpen(false)}
                                                triggerElement={datePickerTrigger}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Track Time</span>
                                    <div className="meta-inline-val">
                                        <Clock3 size={14} />
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {isTimerRunning ? (
                                                <>
                                                    <span style={{ color: '#10b981', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                                        {formatDuration(elapsedTime)}
                                                    </span>
                                                    <button
                                                        className="icon-btn-ghost"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            stopTimer();
                                                        }}
                                                        style={{ color: '#ef4444' }}
                                                        title="Stop Timer"
                                                    >
                                                        <Square size={14} fill="currentColor" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button className="text-btn-picker" onClick={(e) => {
                                                        setTimePickerTrigger(e.currentTarget);
                                                        setIsTimePickerOpen(true);
                                                    }}>
                                                        {task.timeEntries && task.timeEntries.length > 0
                                                            ? `${task.timeEntries.reduce((acc, curr) => acc + curr.duration, 0)}m tracked`
                                                            : 'Add time'}
                                                    </button>
                                                    <button
                                                        className="icon-btn-ghost"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startTimer(taskId);
                                                        }}
                                                        title="Start Timer"
                                                    >
                                                        <Play size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {isTimePickerOpen && (
                                                <TimePicker
                                                    onSelect={handleAddTime}
                                                    onClose={() => setIsTimePickerOpen(false)}
                                                    triggerElement={timePickerTrigger}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Relationships</span>
                                    <div className="meta-inline-val">
                                        <div className="rel-badges-container">
                                            {task.relationships && task.relationships.filter(r => r.type === 'blocking').length > 0 && (
                                                <div className="rel-badge blocking" onClick={() => setSidebarTab('blocking')}>
                                                    <MinusCircle size={12} />
                                                    <span>{task.relationships.filter(r => r.type === 'blocking').length} Blocking</span>
                                                </div>
                                            )}
                                            {task.relationships && task.relationships.filter(r => r.type === 'waiting').length > 0 && (
                                                <div className="rel-badge waiting" onClick={() => setSidebarTab('waiting')}>
                                                    <AlertCircle size={12} />
                                                    <span>{task.relationships.filter(r => r.type === 'waiting').length} Waiting on</span>
                                                </div>
                                            )}
                                            {task.relationships && task.relationships.filter(r => r.type === 'linked').length > 0 && (
                                                <div className="rel-badge linked" onClick={() => setSidebarTab('links')}>
                                                    <Check size={12} />
                                                    <span>{task.relationships.filter(r => r.type === 'linked').length} Task</span>
                                                </div>
                                            )}
                                            {(!task.relationships || task.relationships.length === 0) && (
                                                <span className="empty-val">Empty</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="meta-right-col">
                                <div className="meta-item">
                                    <span className="meta-label">Assignees</span>
                                    <div className="meta-inline-val">
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                                            <div
                                                className="assignee-display-trigger"
                                                onClick={() => setIsAssigneePickerOpen(!isAssigneePickerOpen)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                                            >
                                                <div className="involved-stack" style={{ display: 'flex', alignItems: 'center' }}>
                                                    {(task.assignees && task.assignees.length > 0) ? (
                                                        <>
                                                            {task.assignees.slice(0, 3).map((name, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="assignee-avatar-xs"
                                                                    style={{
                                                                        margin: 0,
                                                                        marginLeft: idx === 0 ? 0 : '-8px',
                                                                        border: '2px solid var(--bg-main)',
                                                                        zIndex: 10 - idx
                                                                    }}
                                                                >
                                                                    {name.charAt(0).toUpperCase()}
                                                                </div>
                                                            ))}
                                                            {task.assignees.length > 3 && (
                                                                <div className="assignee-avatar-xs" style={{ marginLeft: '-8px', fontSize: '10px', background: 'var(--bg-active)', border: '2px solid var(--bg-main)' }}>
                                                                    +{task.assignees.length - 3}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : task.assignee ? (
                                                        <div className="assignee-avatar-xs" style={{ margin: 0 }}>
                                                            {task.assignee.charAt(0).toUpperCase()}
                                                        </div>
                                                    ) : (
                                                        <div className="assignee-avatar-xs" style={{ margin: 0 }}>
                                                            <Users size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="meta-inline-input-text" style={{ fontSize: '14px', color: (task.assignees?.length || task.assignee) ? 'var(--text-main)' : 'var(--text-tertiary)' }}>
                                                    {task.assignees && task.assignees.length > 0
                                                        ? task.assignees.length === 1 ? task.assignees[0] : `${task.assignees.length} Assignees`
                                                        : task.assignee || 'Unassigned'}
                                                </span>
                                                <ChevronDown size={14} style={{ opacity: 0.5 }} />
                                            </div>

                                            {isAssigneePickerOpen && (
                                                <>
                                                    <div className="dropdown-overlay-transparent" onClick={() => setIsAssigneePickerOpen(false)} />
                                                    <div className="assignee-picker-dropdown">
                                                        <div className="picker-search-container">
                                                            <Search size={14} />
                                                            <input
                                                                autoFocus
                                                                placeholder="Search users..."
                                                                value={assigneeSearch}
                                                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                        <div className="picker-options-list">
                                                            <div
                                                                className="picker-option"
                                                                onClick={() => {
                                                                    handleUpdate({ assignees: [], assignee: undefined });
                                                                }}
                                                            >
                                                                <div className="assignee-avatar-xs"><Trash2 size={12} /></div>
                                                                <span>Unassigned</span>
                                                            </div>

                                                            {/* Owner */}
                                                            {(() => {
                                                                const space = spaces.find(s => s.id === task.spaceId);
                                                                const isMe = space?.ownerId === currentUser?.id || !space?.ownerId;
                                                                const ownerDisplayName = space?.ownerName || (isMe ? (currentUser?.name || 'Me') : 'Workspace Owner');
                                                                const ownerStoredName = space?.ownerName || (isMe ? (currentUser?.name || currentUser?.email || 'Me') : 'Workspace Owner');

                                                                if (assigneeSearch && !ownerDisplayName.toLowerCase().includes(assigneeSearch.toLowerCase())) return null;

                                                                const isSelected = task.assignees?.includes(ownerStoredName) || task.assignee === ownerStoredName;

                                                                return (
                                                                    <div
                                                                        className={`picker-option ${isSelected ? 'active' : ''}`}
                                                                        onClick={() => {
                                                                            const currentAssignees = task.assignees || (task.assignee ? [task.assignee] : []);
                                                                            const newAssignees = currentAssignees.includes(ownerStoredName)
                                                                                ? currentAssignees.filter(a => a !== ownerStoredName)
                                                                                : [...currentAssignees, ownerStoredName];
                                                                            handleUpdate({ assignees: newAssignees, assignee: newAssignees[0] });
                                                                        }}
                                                                    >
                                                                        <div className="assignee-avatar-xs" style={{ background: isMe ? 'var(--primary)' : '#10b981', color: 'white' }}>{ownerDisplayName[0]?.toUpperCase()}</div>
                                                                        <div className="member-item-info">
                                                                            <span className="member-name">{ownerDisplayName} {isMe ? '(Me)' : ''}</span>
                                                                            <span className="member-meta">Owner</span>
                                                                        </div>
                                                                        {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {/* Members */}
                                                            {workspaceMembers
                                                                .filter(m => {
                                                                    const name = m.user_name || m.invited_email;
                                                                    return !assigneeSearch || name.toLowerCase().includes(assigneeSearch.toLowerCase());
                                                                })
                                                                .map(m => {
                                                                    const name = m.user_name || m.invited_email;
                                                                    const isAccepted = m.status === 'accepted';
                                                                    const isSelected = task.assignees?.includes(name) || task.assignee === name;

                                                                    return (
                                                                        <div
                                                                            key={m.id}
                                                                            className={`picker-option ${isSelected ? 'active' : ''}`}
                                                                            onClick={() => {
                                                                                const currentAssignees = task.assignees || (task.assignee ? [task.assignee] : []);
                                                                                const newAssignees = currentAssignees.includes(name)
                                                                                    ? currentAssignees.filter(a => a !== name)
                                                                                    : [...currentAssignees, name];
                                                                                handleUpdate({ assignees: newAssignees, assignee: newAssignees[0] });
                                                                            }}
                                                                        >
                                                                            <div className="assignee-avatar-xs" style={{ background: isAccepted ? '#6366f1' : '#94a3b8', color: 'white' }}>
                                                                                {name[0].toUpperCase()}
                                                                            </div>
                                                                            <div className="member-item-info">
                                                                                <span className="member-name" style={{ opacity: isAccepted ? 1 : 0.7 }}>{name}</span>
                                                                                <span className="member-meta">{isAccepted ? 'Member' : 'Invited (Pending)'}</span>
                                                                            </div>
                                                                            {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--primary)' }} />}
                                                                        </div>
                                                                    );
                                                                })
                                                            }
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="meta-item">
                                    <span className="meta-label">Involved</span>
                                    <div className="meta-inline-val">
                                        {(() => {
                                            const space = spaces.find(s => s.id === task.spaceId);
                                            const isOwner = space?.ownerId === currentUser?.id || !space?.ownerId;
                                            const ownerName = space?.ownerName || (isOwner ? (currentUser?.name || 'Me') : 'Workspace Owner');
                                            const involvedAvatars = [
                                                { name: ownerName, role: 'Owner', isOwner: true },
                                                ...workspaceMembers.map(m => ({
                                                    name: m.user_name || m.invited_email,
                                                    role: m.status === 'accepted' ? 'Member' : 'Pending',
                                                    isOwner: false
                                                }))
                                            ];

                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="involved-stack" style={{ display: 'flex', alignItems: 'center' }}>
                                                        {involvedAvatars.slice(0, 5).map((person, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="involved-avatar-xs"
                                                                title={`${person.name} (${person.role})`}
                                                                style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '50%',
                                                                    background: person.isOwner ? 'var(--primary)' : '#6366f1',
                                                                    color: 'white',
                                                                    fontSize: '10px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    border: '2px solid var(--bg-main)',
                                                                    marginLeft: idx === 0 ? 0 : '-8px',
                                                                    zIndex: 10 - idx
                                                                }}
                                                            >
                                                                {person.name[0]?.toUpperCase() || '?'}
                                                            </div>
                                                        ))}
                                                        {involvedAvatars.length > 5 && (
                                                            <div style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: 'var(--bg-active)',
                                                                color: 'var(--text-tertiary)',
                                                                fontSize: '10px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                border: '2px solid var(--bg-main)',
                                                                marginLeft: '-8px',
                                                                zIndex: 1
                                                            }}>
                                                                +{involvedAvatars.length - 5}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                        {involvedAvatars.length} people involved
                                                    </span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Priority</span>
                                    <div className="meta-inline-val">
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                className="priority-display-btn"
                                                onClick={() => {
                                                    setIsPriorityPickerOpen(!isPriorityPickerOpen);
                                                }}
                                                style={{
                                                    color: task.priority === 'urgent' ? '#ef4444' :
                                                        task.priority === 'high' ? '#f97316' :
                                                            task.priority === 'medium' ? '#eab308' : '#64748b'
                                                }}
                                            >
                                                <Flag size={14} />
                                                <span>{task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Empty'}</span>
                                            </button>
                                            {isPriorityPickerOpen && (
                                                <>
                                                    <div
                                                        className="dropdown-overlay-transparent"
                                                        onClick={() => setIsPriorityPickerOpen(false)}
                                                        style={{
                                                            position: 'fixed',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            zIndex: 2499,
                                                            background: 'transparent'
                                                        }}
                                                    />
                                                    <div className="priority-picker-dropdown">
                                                        {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                                                            <div
                                                                key={p}
                                                                className={`priority-option ${task.priority === p ? 'active' : ''}`}
                                                                onClick={() => {
                                                                    handleUpdate({ priority: p });
                                                                    setIsPriorityPickerOpen(false);
                                                                }}
                                                            >
                                                                <Flag size={14} style={{
                                                                    color: p === 'urgent' ? '#ef4444' :
                                                                        p === 'high' ? '#f97316' :
                                                                            p === 'medium' ? '#eab308' : '#64748b'
                                                                }} />
                                                                <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Tags</span>
                                    <div className="tags-container-detail">
                                        {task.tags?.map(tagId => {
                                            const tag = tags.find(t => t.id === tagId);
                                            return tag ? (
                                                <span key={tagId} className="tag-pill" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                                                    {tag.name}
                                                    <X size={10} style={{ marginLeft: '4px', cursor: 'pointer' }} onClick={() => toggleTag(tagId)} />
                                                </span>
                                            ) : null;
                                        })}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                className="add-tag-btn"
                                                onClick={(e) => {
                                                    setTagPickerTrigger(e.currentTarget);
                                                    setIsTagPickerOpen(!isTagPickerOpen);
                                                }}
                                            >
                                                <Plus size={12} />
                                            </button>
                                            {isTagPickerOpen && (
                                                <TagMenu
                                                    tags={tags}
                                                    selectedTagIds={task.tags || []}
                                                    onToggleTag={toggleTag}
                                                    onCreateTag={addTag}
                                                    onUpdateTag={updateTag}
                                                    onDeleteTag={deleteTag}
                                                    onClose={() => {
                                                        setIsTagPickerOpen(false);
                                                        setTagPickerTrigger(null);
                                                    }}
                                                    triggerElement={tagPickerTrigger}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-tabs">
                            <button
                                className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                                onClick={() => setActiveTab('details')}
                            >
                                Details
                            </button>
                            {!isSubtask && (
                                <button
                                    className={`tab ${activeTab === 'subtasks' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('subtasks')}
                                >
                                    Subtasks ({task.subtasks?.length || 0})
                                </button>
                            )}
                        </div>

                        <div className="tab-content">
                            {activeTab === 'details' && (
                                <div className="description-container">
                                    <div className="description-doc-header">
                                        <DocIcon size={14} className="doc-icon" />
                                        <span>Description</span>
                                        {!isSubtask && !task.linkedDocId && task.description && (
                                            <button className="btn-convert-doc" onClick={handleConvertToDoc}>
                                                <Plus size={12} /> Convert to Doc
                                            </button>
                                        )}
                                    </div>
                                    <RichTextEditor
                                        value={task.description || ''}
                                        onChange={(val) => handleUpdate({ description: val })}
                                        placeholder={isSubtask ? "No description for subtasks" : "Type your description here like a document..."}
                                        readOnly={isSubtask}
                                    />
                                    {task.linkedDocId && (
                                        <div className="linked-doc-pill" onClick={handleOpenLinkedDoc}>
                                            <DocIcon size={14} />
                                            <span>Linked Doc: {docs.find(d => d.id === task.linkedDocId)?.name || 'Document'}</span>
                                            <ExternalLink size={12} style={{ marginLeft: '4px' }} />
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'subtasks' && !isSubtask && (
                                <div className="subtasks-wrapper">
                                    <div className="subtasks-header-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Subtasks</h3>
                                            <div style={{ width: '60px', height: '4px', background: '#e2e8f0', borderRadius: '2px' }}>
                                                <div style={{ width: `${(task.subtasks?.filter(s => s.status === 'COMPLETED').length || 0) / (task.subtasks?.length || 1) * 100}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }}></div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                {task.subtasks?.filter(s => s.status === 'COMPLETED').length || 0}/{task.subtasks?.length || 0}
                                                <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#e0f2fe', color: '#0284c7', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>
                                                    {task.subtasks?.filter(s => s.assignee === 'user-1').length} Assigned to me
                                                </span>
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button className="st-toolbar-btn">
                                                <ArrowUpDown size={14} /> Sort
                                            </button>
                                            <button
                                                className="st-toolbar-btn"
                                                onClick={handleSuggestSubtasks}
                                                disabled={isGeneratingSubtasks}
                                            >
                                                <Sparkles size={14} className={isGeneratingSubtasks ? "animate-spin" : ""} style={{ color: '#a855f7' }} />
                                                {isGeneratingSubtasks ? 'Generating...' : 'Suggest subtasks'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="subtasks-header-row">
                                        <div className="st-col-name">Name</div>
                                        <div className="st-col-assignee">Assignee</div>
                                        <div className="st-col-prio">Priority</div>
                                        <div className="st-col-date">Due date</div>
                                        <div className="st-col-actions"></div>
                                    </div>
                                    <div className="subtasks-list-new">
                                        {task.subtasks?.map((st: Subtask) => (
                                            <div key={st.id} className="subtask-row-item">
                                                <div className="st-cell-name">
                                                    <div className="st-checkbox-area">
                                                        <div
                                                            className={`st-status-circle ${st.status === 'COMPLETED' ? 'completed' : ''}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                updateSubtask(taskId, st.id, { status: st.status === 'COMPLETED' ? 'TO DO' : 'COMPLETED' });
                                                            }}
                                                        >
                                                            {st.status === 'COMPLETED' && <Check size={10} strokeWidth={4} />}
                                                        </div>
                                                    </div>
                                                    <div className="st-name-group">
                                                        {st.status === 'COMPLETED' ? (
                                                            <span className="st-name-text completed">{st.name}</span>
                                                        ) : (
                                                            <span
                                                                className="st-name-text link"
                                                                onClick={() => onTaskClick && onTaskClick(st.id)}
                                                            >
                                                                {st.name}
                                                            </span>
                                                        )}
                                                        <div className="st-hover-actions">
                                                            <button className="icon-btn-ghost-st" title="Add tags">
                                                                <Tag size={12} />
                                                            </button>
                                                            <button className="icon-btn-ghost-st" title="Rename" onClick={() => {/* Toggle rename */ }}>
                                                                <Edit2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="st-cell-assignee">
                                                    <div className="involved-stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {(st.assignees && st.assignees.length > 0) ? (
                                                            <>
                                                                {st.assignees.slice(0, 2).map((name, idx) => (
                                                                    <div key={idx} className="assignee-avatar-xs" style={{ margin: 0, marginLeft: idx === 0 ? 0 : '-6px', border: '1.5px solid var(--bg-surface)', width: '20px', height: '20px', fontSize: '10px' }}>
                                                                        {name[0].toUpperCase()}
                                                                    </div>
                                                                ))}
                                                                {st.assignees.length > 2 && (
                                                                    <div className="assignee-avatar-xs" style={{ marginLeft: '-6px', width: '20px', height: '20px', fontSize: '9px', background: 'var(--bg-active)', border: '1.5px solid var(--bg-surface)' }}>
                                                                        +{st.assignees.length - 2}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : st.assignee ? (
                                                            <div className="assignee-avatar-xs" style={{ margin: 0, width: '20px', height: '20px', fontSize: '10px' }}>
                                                                {st.assignee[0].toUpperCase()}
                                                            </div>
                                                        ) : (
                                                            <div className="icon-box-st">
                                                                <Users size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="st-cell-prio">
                                                    <div className="icon-box-st">
                                                        <Flag size={14} />
                                                    </div>
                                                </div>
                                                <div className="st-cell-date">
                                                    <div className="icon-box-st">
                                                        <Calendar size={14} />
                                                    </div>
                                                </div>
                                                <div className="st-cell-actions">
                                                    <button className="icon-btn-ghost-st">
                                                        <MoreHorizontal size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Suggested Subtasks Review */}
                                        {suggestedSubtasks.length > 0 && (
                                            <div className="suggested-subtasks-review">
                                                {suggestedSubtasks.map((name, index) => (
                                                    <div key={index} className="subtask-row-item suggestion-item">
                                                        <div className="st-cell-name">
                                                            <div className="st-checkbox-area">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedSuggestions.has(name)}
                                                                    onChange={() => toggleSuggestion(name)}
                                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                                />
                                                            </div>
                                                            <div className="st-name-group">
                                                                <span className="st-name-text">{name}</span>
                                                            </div>
                                                        </div>
                                                        <div className="st-cell-assignee">
                                                            <div className="st-suggestion-badge" style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0284c7', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Suggested</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="suggestion-actions-row" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                                                    <button
                                                        onClick={handleCancelSubtasks}
                                                        style={{ background: 'transparent', border: 'none', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleConfirmSubtasks}
                                                        style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 16px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                                                    >
                                                        Create {selectedSuggestions.size} subtasks
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <SubtaskInput onAdd={handleAddSubtask} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="sidebar-container-new">
                        {/* Horizontal Tabs at Top */}
                        <div className="sidebar-tabs-horizontal">
                            <button
                                className={`horizontal-tab ${sidebarTab === 'activity' ? 'active' : ''}`}
                                onClick={() => setSidebarTab('activity')}
                            >
                                <div className="tab-icon-wrapper">
                                    <MessageSquare size={14} />
                                    <span className="tab-count-dot">1</span>
                                </div>
                                <span className="tab-label">Activity</span>
                            </button>
                            <button
                                className={`horizontal-tab ${sidebarTab === 'blocking' ? 'active' : ''}`}
                                onClick={() => setSidebarTab('blocking')}
                            >
                                <div className="tab-icon-wrapper">
                                    <MinusCircle size={14} />
                                    {task?.relationships?.filter(r => r.type === 'blocking').length ? (
                                        <span className="tab-count-dot">{task.relationships.filter(r => r.type === 'blocking').length}</span>
                                    ) : null}
                                </div>
                                <span className="tab-label">Blocking</span>
                            </button>
                            <button
                                className={`horizontal-tab ${sidebarTab === 'waiting' ? 'active' : ''}`}
                                onClick={() => setSidebarTab('waiting')}
                            >
                                <div className="tab-icon-wrapper">
                                    <AlertCircle size={14} />
                                    {task?.relationships?.filter(r => r.type === 'waiting').length ? (
                                        <span className="tab-count-dot">{task.relationships.filter(r => r.type === 'waiting').length}</span>
                                    ) : null}
                                </div>
                                <span className="tab-label">Waiting on</span>
                            </button>
                            <button
                                className={`horizontal-tab ${sidebarTab === 'links' ? 'active' : ''}`}
                                onClick={() => setSidebarTab('links')}
                            >
                                <div className="tab-icon-wrapper">
                                    <Link2 size={14} />
                                    {task?.relationships?.filter(r => r.type === 'linked').length ? (
                                        <span className="tab-count-dot">{task.relationships.filter(r => r.type === 'linked').length}</span>
                                    ) : null}
                                </div>
                                <span className="tab-label">Task Links</span>
                            </button>
                            <button
                                className={`horizontal-tab ${sidebarTab === 'more' ? 'active' : ''}`}
                                onClick={() => setSidebarTab('more')}
                            >
                                <div className="tab-icon-wrapper">
                                    <Plus size={14} />
                                </div>
                                <span className="tab-label">More</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="sidebar-content-area">
                            {sidebarTab === 'activity' && (
                                <ActivityPanel
                                    task={task}
                                    isSubtask={isSubtask}
                                    isGeneratingAIComment={isGeneratingAIComment}
                                    onImageClick={(src) => setPreviewImage(src)}
                                    onAIRequest={handleAIResponse}
                                    activityFeedRef={activityFeedRef}
                                    currentUserName={currentUser?.name || "Jundee"}
                                    workspaceMembers={workspaceMembers}
                                />
                            )}

                            {(sidebarTab === 'links' || sidebarTab === 'blocking' || sidebarTab === 'waiting') && (
                                <div className="links-panel relationship-sidebar-panel">
                                    <div className="panel-header">
                                        <span>{sidebarTab === 'links' ? 'Task Links' : sidebarTab === 'blocking' ? 'Blocking' : 'Waiting on'}</span>
                                        <div className="panel-header-actions">
                                            <Search size={14} />
                                            <ExternalLink size={14} />
                                            <Plus size={14} onClick={() => setIsRelationshipPickerOpen(true)} />
                                        </div>
                                    </div>

                                    <div className="rel-sidebar-content">
                                        <div className="rel-sidebar-section">
                                            <div className="rel-sec-header">
                                                <ChevronDown size={14} />
                                                <span>{sidebarTab === 'links' ? 'Linked' : sidebarTab === 'blocking' ? 'Blocking' : 'Waiting on'}</span>
                                                <span className="rel-sec-count">
                                                    {task.relationships?.filter(r => r.type === (sidebarTab === 'links' ? 'linked' : sidebarTab === 'blocking' ? 'blocking' : 'waiting')).length || 0}
                                                </span>
                                            </div>
                                            <div className="rel-sec-list">
                                                {task.relationships?.filter(r => r.type === (sidebarTab === 'links' ? 'linked' : sidebarTab === 'blocking' ? 'blocking' : 'waiting')).map(rel => {
                                                    const rTask = tasks.find(t => t.id === rel.taskId);
                                                    if (!rTask) return null;
                                                    return (
                                                        <div key={rel.id} className="rel-sidebar-item" onClick={() => onTaskClick?.(rTask.id)}>
                                                            <Circle size={12} color="#cbd5e1" />
                                                            <span className="rel-item-task-name">{rTask.name}</span>
                                                            <span className="rel-item-due">{rTask.dueDate ? format(parseISO(rTask.dueDate), 'M/d/yy') : ''}</span>
                                                            <Flag size={12} color="#cbd5e1" />
                                                        </div>
                                                    );
                                                })}
                                                <button className="add-rel-sidebar-btn" onClick={() => setIsRelationshipPickerOpen(true)}>
                                                    <Plus size={14} />
                                                    <span>Add {sidebarTab === 'links' ? 'linked task' : sidebarTab === 'blocking' ? 'blocking task' : 'waiting on task'}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {sidebarTab === 'links' && (
                                            <div className="rel-sidebar-section">
                                                <div className="rel-sec-header">
                                                    <ChevronRight size={14} />
                                                    <span>References</span>
                                                    <span className="rel-sec-count">0</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isRelationshipPickerOpen && (
                                        <RelationshipMenu
                                            taskId={taskId}
                                            onClose={() => setIsRelationshipPickerOpen(false)}
                                            mode="list"
                                            isModal={true}
                                        />
                                    )}
                                </div>
                            )}

                            {sidebarTab === 'more' && (
                                <div className="more-panel">
                                    <div className="panel-header">Add to this task</div>

                                    <div className="more-section">
                                        <h5>Connect a URL</h5>
                                        <div className="url-input-container">
                                            <input placeholder="Paste any link..." />
                                        </div>
                                    </div>

                                    <div className="more-section">
                                        <h5>Add Relationship</h5>
                                        <RelationshipMenu
                                            taskId={taskId}
                                            onClose={() => { }}
                                            inline
                                            modalPicker
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailModal;
