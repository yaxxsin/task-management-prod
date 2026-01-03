import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '../store/useAuthStore';
import {
    X, Calendar, Flag, Users, Tag, MoreHorizontal,
    Sparkles, Paperclip, Bell, ChevronDown, Maximize2, Minimize2,
    Check, FileText, LayoutDashboard, Square, ListTodo, Plus,
    Table, Columns, List, File, User, MessageSquare, PenTool,
    AtSign, ArrowRight, CornerDownLeft, Copy, RotateCcw, ThumbsUp, ThumbsDown, ChevronLeft,
    UserPlus, Eye, CalendarDays, Inbox, CircleDot, GitMerge, Hash, Box, RotateCw
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PremiumDatePicker from './PremiumDatePicker';
import { useAppStore, DEFAULT_STATUSES } from '../store/useAppStore';
import type { Priority, Task, TaskType } from '../types';
import RichTextEditor from './RichTextEditor';
import { markdownToHtml } from '../utils/markdownConverter';
import { format } from 'date-fns';
import '../styles/TaskModal.css';
import { API_ENDPOINTS } from '../config/api';

interface TaskModalProps {
    onClose: () => void;
    initialStatus?: string;
    initialDate?: Date; // Usually treated as Due Date
    initialStartDate?: Date;
}

const TaskModal: React.FC<TaskModalProps> = ({ onClose, initialStatus, initialDate, initialStartDate }) => {
    const { addTask, currentSpaceId, currentListId, spaces, lists, aiConfig } = useAppStore();
    const { token, user: currentUser } = useAuthStore();

    const activeList = lists.find(l => l.id === currentListId);
    const isEverything = currentSpaceId === 'everything';
    const activeSpace = spaces.find(s => s.id === currentSpaceId) || (isEverything ? {
        id: 'everything',
        name: 'Everything',
        icon: 'star',
        color: '#3b82f6',
        statuses: DEFAULT_STATUSES
    } : null);

    const activeStatuses = activeList?.statuses || activeSpace?.statuses || DEFAULT_STATUSES;

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<Task['status']>(initialStatus || activeStatuses[0]?.name || 'TO DO');
    const [priority, setPriority] = useState<Priority>('medium');

    const [startDate, setStartDate] = useState<string | undefined>(
        initialStartDate ? initialStartDate.toISOString() : undefined
    );
    const [dueDate, setDueDate] = useState<string | undefined>(
        initialDate ? initialDate.toISOString() : format(new Date(), 'yyyy-MM-dd')
    );

    // Date picker state
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [datePickerTrigger, setDatePickerTrigger] = useState<HTMLElement | null>(null);
    const [activeTab, setActiveTab] = useState('task');
    const [isMaximized, setIsMaximized] = useState(false);
    const [isPrivate, setIsPrivate] = useState(false);
    const [taskType, setTaskType] = useState<TaskType>('task');
    const [selectedSpaceId, setSelectedSpaceId] = useState(currentSpaceId === 'everything' ? 'team-space' : currentSpaceId);
    const [selectedListId, setSelectedListId] = useState(currentListId || undefined);
    const [assignees, setAssignees] = useState<string[]>(currentUser?.name ? [currentUser.name] : []);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    // Dropdown visibility states
    const [showSpaceMenu, setShowSpaceMenu] = useState(false);
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [showTagMenu, setShowTagMenu] = useState(false);

    const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
    const availableTags = useAppStore(state => state.tags);
    const allSpaces = spaces.filter(s => s.id !== 'everything');

    const handleSpaceSelect = (spaceId: string, listId?: string) => {
        setSelectedSpaceId(spaceId);
        setSelectedListId(listId);
        setShowSpaceMenu(false);
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    // AI Popup State
    const [showAI, setShowAI] = useState(false);
    const [aiInput, setAiInput] = useState('');
    const [aiState, setAiState] = useState<'initial' | 'response'>('initial');
    const [aiResponse, setAiResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Title Suggestion State
    const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const suggestionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const suggestionsRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!selectedSpaceId || !token) return;
            try {
                // Fetch space members
                const spaceRes = await fetch(`${API_ENDPOINTS.RESOURCE_MEMBERS}?resourceType=space&resourceId=${selectedSpaceId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                let allMembers = [];
                if (spaceRes.ok) {
                    allMembers = await spaceRes.json();
                }

                // If a list is selected, also fetch list members
                if (selectedListId) {
                    const listRes = await fetch(`${API_ENDPOINTS.RESOURCE_MEMBERS}?resourceType=list&resourceId=${selectedListId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (listRes.ok) {
                        const listMembers = await listRes.json();
                        listMembers.forEach((lm: any) => {
                            if (!allMembers.find((am: any) => am.id === lm.id)) {
                                allMembers.push(lm);
                            }
                        });
                    }
                }

                setWorkspaceMembers(allMembers);
            } catch (e) {
                console.error('Failed to fetch members', e);
            }
        };
        fetchMembers();
    }, [selectedSpaceId, selectedListId, token]);

    const handleGenerateAI = async (overridePrompt?: string) => {
        const query = overridePrompt || aiInput;
        if (!query.trim()) return;

        setAiState('response');
        setIsLoading(true);
        setAiInput('');
        setAiResponse('');

        try {
            if (aiConfig.provider === 'ollama') {
                const response = await fetch(`${aiConfig.ollamaHost}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: aiConfig.ollamaModel,
                        prompt: query,
                        stream: false,
                        system: "You are a helpful AI assistant helping to write task descriptions. Keep it concise/professional."
                    }),
                });
                if (!response.ok) throw new Error('Ollama Error');
                const data = await response.json();
                setAiResponse(data.response);
            } else {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) {
                    setAiResponse("Please configure your Gemini API Key in .env file.");
                    return;
                }
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent(query);
                setAiResponse(result.response.text());
            }
        } catch (error) {
            console.error(error);
            setAiResponse("Sorry, I couldn't generate a response. Please check your AI settings/connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTitleSuggestions = async (taskName: string) => {
        if (!taskName.trim() || taskName.length < 3) {
            setTitleSuggestions([]);
            setShowTitleSuggestions(false);
            return;
        }

        setIsFetchingSuggestions(true);
        try {
            const prompt = `Given this task name: "${taskName}", suggest 3 improved, professional, and concise task titles. Return ONLY the 3 titles, one per line, without numbering or extra text.`;

            if (aiConfig.provider === 'ollama') {
                const response = await fetch(`${aiConfig.ollamaHost}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: aiConfig.ollamaModel,
                        prompt,
                        stream: false,
                        system: "You are a helpful assistant that improves task titles. Return only the suggested titles, one per line."
                    }),
                });
                if (!response.ok) throw new Error('Ollama Error');
                const data = await response.json();
                const suggestions = data.response.split('\n').filter((s: string) => s.trim()).slice(0, 3);
                setTitleSuggestions(suggestions);
                setShowTitleSuggestions(suggestions.length > 0);
            } else {
                const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                if (!apiKey) {
                    setTitleSuggestions([]);
                    return;
                }
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const result = await model.generateContent(prompt);
                const text = result.response.text();
                const suggestions = text.split('\n').filter(s => s.trim()).slice(0, 3);
                setTitleSuggestions(suggestions);
                setShowTitleSuggestions(suggestions.length > 0);
            }
        } catch (error) {
            console.error('Error fetching title suggestions:', error);
            setTitleSuggestions([]);
        } finally {
            setIsFetchingSuggestions(false);
        }
    };

    const handleInsert = () => {
        if (!aiResponse) return;
        const htmlResponse = markdownToHtml(aiResponse);
        setDescription(prev => prev ? prev + '<br/>' + htmlResponse : htmlResponse);
        setShowAI(false);
        setAiState('initial');
        setAiResponse('');
    };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!name.trim()) return;

        // Simplify logic for demo purposes - creating task regardless of tab, 
        // normally you'd handle creates for Docs, Reminders, etc. here.
        addTask({
            name,
            description,
            status,
            priority,
            spaceId: selectedSpaceId,
            listId: selectedListId,
            assignee: assignees[0] || undefined,
            assignees,
            dueDate,
            startDate,
            tags: selectedTags,
            taskType: taskType as any
        });
        onClose();
    };

    const tabs = [
        { id: 'task', label: 'Task' },
        { id: 'doc', label: 'Doc' },
        { id: 'reminder', label: 'Reminder' },
        { id: 'chat', label: 'Chat' },
        { id: 'whiteboard', label: 'Whiteboard' },
        { id: 'dashboard', label: 'Dashboard' },
    ];

    const [showCustomFields, setShowCustomFields] = useState(false);
    const [fieldSearch, setFieldSearch] = useState('');

    // Slash Command State
    const [showSlashMenu, setShowSlashMenu] = useState(false);
    const [slashQuery, setSlashQuery] = useState('');
    const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

    const slashCommands = [
        {
            category: 'SUGGESTIONS',
            items: [
                { id: 'template', label: 'Template', icon: <LayoutDashboard size={14} /> }
            ]
        },
        {
            category: 'EMBEDS',
            items: [
                { id: 'attachment', label: 'Attachment', icon: <Paperclip size={14} /> }
            ]
        },
        {
            category: 'TASK ACTIONS',
            items: [
                { id: 'assign', label: 'Assign', icon: <UserPlus size={14} /> },
                { id: 'assign_me', label: 'Assign to me', icon: <User size={14} /> },
                { id: 'follower', label: 'Follower', icon: <Eye size={14} /> },
                { id: 'priority', label: 'Priority', icon: <Flag size={14} /> },
                { id: 'due_date', label: 'Due Date', icon: <Calendar size={14} /> },
                { id: 'due_date_today', label: 'Due Date to today', icon: <CalendarDays size={14} /> },
                { id: 'inbox', label: 'Add to Inbox', icon: <Inbox size={14} /> },
                { id: 'start_date', label: 'Start Date', icon: <Calendar size={14} /> },
                { id: 'status', label: 'Status', icon: <CircleDot size={14} /> },
                { id: 'tags', label: 'Tags', icon: <Tag size={14} /> },
                { id: 'move', label: 'Move', icon: <ArrowRight size={14} /> },
                { id: 'subtask', label: 'Subtask', icon: <GitMerge size={14} /> },
                { id: 'position', label: 'Position', icon: <Hash size={14} /> },
                { id: 'task_type', label: 'Task Type', icon: <Box size={14} /> },
            ]
        }
    ];

    const filteredSlashCommands = slashCommands.map(cat => ({
        category: cat.category,
        items: cat.items.filter(item => item.label.toLowerCase().includes(slashQuery.toLowerCase()))
    })).filter(cat => cat.items.length > 0);

    // Flat list for keyboard navigation
    const flatSlashItems = filteredSlashCommands.flatMap(cat => cat.items);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);

        if (val.includes('/')) {
            const lastSlashIndex = val.lastIndexOf('/');
            // Simple check: is the slash likely a command trigger?
            // e.g. "Task /" or starting with "/"
            if (lastSlashIndex === 0 || val[lastSlashIndex - 1] === ' ') {
                const query = val.substring(lastSlashIndex + 1);
                setSlashQuery(query);
                setShowSlashMenu(true);
                setSlashSelectedIndex(0);
                return;
            }
        }
        setShowSlashMenu(false);

        // Debounce title suggestions
        if (suggestionTimeoutRef.current) {
            clearTimeout(suggestionTimeoutRef.current);
        }
        suggestionTimeoutRef.current = setTimeout(() => {
            fetchTitleSuggestions(val);
        }, 800);
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showTitleSuggestions) {
                setShowTitleSuggestions(false);
            }
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowTitleSuggestions(false);
            }
            // Close other menus
            const target = e.target as HTMLElement;
            if (!target.closest('.dropdown-container')) {
                setShowSpaceMenu(false);
                setShowTypeMenu(false);
                setShowAssigneeMenu(false);
                setShowPriorityMenu(false);
                setShowTagMenu(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousedown', handleClickOutside);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showTitleSuggestions]);

    const handleSlashKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSlashMenu) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSlashSelectedIndex(prev => (prev + 1) % flatSlashItems.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSlashSelectedIndex(prev => (prev - 1 + flatSlashItems.length) % flatSlashItems.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (flatSlashItems[slashSelectedIndex]) {
                handleSlashCommand(flatSlashItems[slashSelectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setShowSlashMenu(false);
        }
    };

    const handleSlashCommand = (item: any) => {
        // Remove the slash command text from name
        const lastSlashIndex = name.lastIndexOf('/');
        const newName = name.substring(0, lastSlashIndex).trim();
        setName(newName);
        setShowSlashMenu(false);

        // Execute command (Mock implementation)
        console.log("Execute command:", item.id);
        // You would switch/case here to open specific pickers or set values
        if (item.id === 'assign_me') {
            // Logic to assign to self
        }
        // ...
    };

    const fieldOptions = [
        { id: 'text', label: 'Custom Text', icon: <FileText size={16} color="#c026d3" /> },
        { id: 'summary', label: 'Summary', icon: <FileText size={16} color="#c026d3" /> },
        { id: 'progress_updates', label: 'Progress Updates', icon: <FileText size={16} color="#c026d3" /> },
        { id: 'files', label: 'Files', icon: <Paperclip size={16} color="#9333ea" /> },
        { id: 'relationship', label: 'Relationship', icon: <Users size={16} color="#2563eb" /> },
        { id: 'people', label: 'People', icon: <User size={16} color="#ea580c" /> },
        { id: 'progress_auto', label: 'Progress (Auto)', icon: <ListTodo size={16} color="#ea580c" /> },
        { id: 'email', label: 'Email', icon: <MessageSquare size={16} color="#dc2626" /> },
        { id: 'phone', label: 'Phone', icon: <Tag size={16} color="#dc2626" /> },
        { id: 'categorize', label: 'Categorize', icon: <Columns size={16} color="#9333ea" /> },
        { id: 'dropdown', label: 'Custom Dropdown', icon: <ChevronDown size={16} color="#9333ea" /> },
        { id: 'translation', label: 'Translation', icon: <FileText size={16} color="#c026d3" /> },
        { id: 'sentiment', label: 'Sentiment', icon: <Sparkles size={16} color="#9333ea" /> },
        { id: 'tasks', label: 'Tasks', icon: <Square size={16} color="#2563eb" /> },
        { id: 'location', label: 'Location', icon: <Bell size={16} color="#dc2626" /> },
        { id: 'progress_manual', label: 'Progress (Manual)', icon: <List size={16} color="#ea580c" /> },
        { id: 'rating', label: 'Rating', icon: <Tag size={16} color="#ca8a04" /> },
        { id: 'voting', label: 'Voting', icon: <Table size={16} color="#9333ea" /> },
        { id: 'signature', label: 'Signature', icon: <PenTool size={16} color="#059669" /> },
        { id: 'button', label: 'Button', icon: <Square size={16} color="#c026d3" /> },
        { id: 'action_items', label: 'Action Items', icon: <ListTodo size={16} color="#c026d3" /> },
        { id: 'tshirt', label: 'T-shirt Size', icon: <Columns size={16} color="#9333ea" /> },
    ];

    const renderTaskView = () => (
        <>
            {/* Sub-Header Toolbar */}
            <div className="task-toolbar">
                <div className="dropdown-container">
                    <button className="toolbar-btn" onClick={() => setShowSpaceMenu(!showSpaceMenu)}>
                        <ListTodo size={14} />
                        {lists.find(l => l.id === selectedListId)?.name || spaces.find(s => s.id === selectedSpaceId)?.name || 'Objectives'}
                        <ChevronDown size={14} />
                    </button>
                    {showSpaceMenu && (
                        <div className="property-dropdown space-dropdown">
                            <div className="dropdown-section">Spaces</div>
                            {allSpaces.map(space => (
                                <React.Fragment key={space.id}>
                                    <div
                                        className={`dropdown-item ${selectedSpaceId === space.id && !selectedListId ? 'active' : ''}`}
                                        onClick={() => handleSpaceSelect(space.id)}
                                    >
                                        <div className="item-icon" style={{ color: space.color || 'inherit' }}>
                                            <Box size={14} />
                                        </div>
                                        {space.name}
                                    </div>
                                    {lists.filter(l => l.spaceId === space.id).map(list => (
                                        <div
                                            key={list.id}
                                            className={`dropdown-item list-item-nested ${selectedListId === list.id ? 'active' : ''}`}
                                            onClick={() => handleSpaceSelect(space.id, list.id)}
                                        >
                                            <List size={14} />
                                            {list.name}
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dropdown-container">
                    <button className="toolbar-btn" onClick={() => setShowTypeMenu(!showTypeMenu)}>
                        <Square size={14} />
                        {taskType === 'task' ? 'Task' :
                            taskType === 'milestone' ? 'Milestone' :
                                taskType === 'form_response' ? 'Form Response' : 'Meeting Note'}
                        <ChevronDown size={14} />
                    </button>
                    {showTypeMenu && (
                        <div className="property-dropdown type-dropdown">
                            <div className="dropdown-header-type">
                                <span>Task Types</span>
                                <button className="edit-link">Edit</button>
                            </div>
                            <div className={`dropdown-item ${taskType === 'task' ? 'active' : ''}`} onClick={() => { setTaskType('task'); setShowTypeMenu(false); }}>
                                <CircleDot size={14} /> Task <span className="default-label">(default)</span>
                                {taskType === 'task' && <CornerDownLeft size={12} className="check-icon" />}
                            </div>
                            <div className={`dropdown-item ${taskType === 'milestone' ? 'active' : ''}`} onClick={() => { setTaskType('milestone'); setShowTypeMenu(false); }}>
                                <GitMerge size={14} /> Milestone
                                {taskType === 'milestone' && <CornerDownLeft size={12} className="check-icon" />}
                            </div>
                            <div className={`dropdown-item ${taskType === 'form_response' ? 'active' : ''}`} onClick={() => { setTaskType('form_response'); setShowTypeMenu(false); }}>
                                <FileText size={14} /> Form Response
                                {taskType === 'form_response' && <CornerDownLeft size={12} className="check-icon" />}
                            </div>
                            <div className={`dropdown-item ${taskType === 'meeting_note' ? 'active' : ''}`} onClick={() => { setTaskType('meeting_note'); setShowTypeMenu(false); }}>
                                <MessageSquare size={14} /> Meeting Note
                                {taskType === 'meeting_note' && <CornerDownLeft size={12} className="check-icon" />}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Form */}
            <div className="task-form" style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="task-name-input"
                    placeholder="Task Name or type '/' for commands"
                    value={name}
                    onChange={handleNameChange} // Use new handler
                    onKeyDown={handleSlashKeyDown} // Use new handler
                    autoFocus
                />

                {/* Slash Command Menu */}
                {showSlashMenu && (
                    <div className="slash-menu">
                        {filteredSlashCommands.map(group => (
                            <div key={group.category} className="slash-group">
                                <div className="slash-category">{group.category}</div>
                                {group.items.map(item => {
                                    const isSelected = flatSlashItems[slashSelectedIndex]?.id === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            className={`slash-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleSlashCommand(item)}
                                            onMouseEnter={() => {
                                                const idx = flatSlashItems.findIndex(i => i.id === item.id);
                                                setSlashSelectedIndex(idx);
                                            }}
                                        >
                                            <div className="slash-item-icon">{item.icon}</div>
                                            <div className="slash-item-label">{item.label}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}

                {/* Title Suggestions */}
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                    <div className="title-suggestions" ref={suggestionsRef}>
                        <div className="suggestions-header">
                            <Sparkles size={14} color="#8b5cf6" />
                            <span>Suggested titles</span>
                            <div className="suggestions-actions-header">
                                <button
                                    className="btn-refresh-titles"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        fetchTitleSuggestions(name);
                                    }}
                                    disabled={isFetchingSuggestions}
                                    title="Regenerate suggestions"
                                >
                                    <RotateCw size={12} className={isFetchingSuggestions ? 'animate-spin' : ''} />
                                </button>
                                <button
                                    className="btn-close-suggestions"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowTitleSuggestions(false);
                                    }}
                                    title="Dismiss"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="suggestions-list">
                            {titleSuggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="suggestion-item"
                                    onClick={() => {
                                        setName(suggestion);
                                        setShowTitleSuggestions(false);
                                    }}
                                >
                                    <span className="suggestion-text">{suggestion}</span>
                                    <CornerDownLeft size={12} className="suggestion-icon" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="description-section">
                    <div className="rich-text-wrapper">
                        <RichTextEditor
                            value={description}
                            onChange={setDescription}
                            placeholder="Add description..."
                        />
                    </div>
                    <button className="ai-btn" onClick={() => setShowAI(!showAI)}>
                        <Sparkles size={14} color="#8b5cf6" />
                        Write with AI
                    </button>
                </div>

                {/* AI Popup */}
                {showAI && (
                    <div className="ai-popup">
                        {aiState === 'initial' ? (
                            <>
                                <div className="ai-header">
                                    <div className="ai-icon-large">
                                        <Sparkles size={24} className="text-purple-500" fill="currentColor" style={{ color: '#a855f7' }} />
                                    </div>
                                    <div className="ai-title">How can I help your writing?</div>
                                    <div className="ai-subtitle">I can refine your writing, fix grammar, and more.</div>
                                </div>

                                <div className="ai-input-wrapper">
                                    <input
                                        type="text"
                                        className="ai-input"
                                        placeholder="Ask AI to edit or write"
                                        value={aiInput}
                                        onChange={e => setAiInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleGenerateAI()}
                                        autoFocus
                                    />
                                    <div className="ai-input-actions">
                                        <AtSign size={14} />
                                        <ArrowRight size={14} onClick={() => handleGenerateAI()} style={{ cursor: 'pointer' }} />
                                    </div>
                                </div>

                                <div className="ai-action-list">
                                    <div className="ai-action-item" onClick={() => handleGenerateAI("Write a description")}>
                                        <Columns size={14} />
                                        Write a description
                                        <ArrowRight size={12} className="enter-icon" />
                                    </div>
                                    <div className="ai-action-item" onClick={() => handleGenerateAI("Create a plan")}>
                                        <ListTodo size={14} />
                                        Create a plan
                                    </div>
                                    <div className="ai-action-item" onClick={() => handleGenerateAI("Generate action items")}>
                                        <List size={14} />
                                        Generate action items
                                    </div>
                                </div>

                                <div className="ai-footer">
                                    <button className="ai-pill">
                                        Default Tone
                                        <ChevronDown size={12} />
                                    </button>
                                    <button className="ai-pill">
                                        Medium Creativity
                                        <ChevronDown size={12} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="ai-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <Sparkles size={18} fill="currentColor" style={{ color: '#a855f7' }} />
                                    <span style={{ fontWeight: 700, fontSize: '15px' }}>AI</span>
                                    <X size={16} className="ai-close-btn" onClick={() => setShowAI(false)} />
                                </div>

                                <div className="ai-response-text">
                                    {isLoading ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                            <Sparkles size={24} className="animate-spin" style={{ marginBottom: '8px' }} />
                                            <div>Generating...</div>
                                        </div>
                                    ) : (
                                        <ReactMarkdown>{aiResponse}</ReactMarkdown>
                                    )}
                                </div>

                                <div className="ai-feedback-row">
                                    <button className="feedback-btn"><RotateCcw size={14} /></button>
                                    <button className="feedback-btn"><ThumbsUp size={14} /></button>
                                    <button className="feedback-btn"><ThumbsDown size={14} /></button>
                                </div>

                                <div className="ai-input-wrapper">
                                    <input
                                        type="text"
                                        className="ai-input"
                                        placeholder="Ask Brain to edit or write"
                                        value={aiInput}
                                        onChange={e => setAiInput(e.target.value)}
                                    />
                                    <div className="ai-input-actions">
                                        <AtSign size={14} />
                                        <ArrowRight size={14} />
                                    </div>
                                </div>

                                <div className="ai-result-actions">
                                    <div className="action-row primary-action" onClick={handleInsert}>
                                        <CornerDownLeft size={14} />
                                        Insert below
                                        <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.6 }}>↵</span>
                                    </div>
                                    <div className="action-row">
                                        <Copy size={14} />
                                        Copy
                                    </div>
                                    <div className="action-row">
                                        <Sparkles size={14} />
                                        Save & continue in Ask AI
                                    </div>
                                    <div className="action-row" onClick={() => setAiState('initial')}>
                                        <ChevronLeft size={14} />
                                        Back
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="task-properties">
                    <div className="prop-btn status-btn">
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value as Task['status'])}
                            style={{ background: 'transparent', border: 'none', fontWeight: 'inherit', color: 'inherit', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                        >
                            {activeStatuses.map(s => (
                                <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="dropdown-container">
                        <button className="prop-btn" onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}>
                            <div className="involved-stack" style={{ display: 'flex', alignItems: 'center' }}>
                                {assignees.length > 0 ? (
                                    <>
                                        {assignees.slice(0, 2).map((name, idx) => (
                                            <div key={idx} className="assignee-avatar-xs" style={{ margin: 0, marginLeft: idx === 0 ? 0 : '-6px', border: '1.5px solid var(--bg-surface)' }}>
                                                {name[0].toUpperCase()}
                                            </div>
                                        ))}
                                        {assignees.length > 2 && (
                                            <div className="assignee-avatar-xs" style={{ marginLeft: '-6px', fontSize: '9px', background: 'var(--bg-active)', border: '1.5px solid var(--bg-surface)' }}>
                                                +{assignees.length - 2}
                                            </div>
                                        )}
                                    </>
                                ) : <Users size={14} />}
                            </div>
                            {assignees.length === 0 ? 'Assignee' : assignees.length === 1 ? assignees[0] : `${assignees.length} Assignees`}
                        </button>
                        {showAssigneeMenu && (
                            <div className="property-dropdown assignee-dropdown">
                                <div className="dropdown-section">Owner</div>
                                {(() => {
                                    const space = spaces.find(s => s.id === selectedSpaceId);
                                    const isMe = space?.ownerId === currentUser?.id || !space?.ownerId;
                                    const ownerDisplayName = space?.ownerName || (isMe ? (currentUser?.name || 'Me') : 'Workspace Owner');
                                    const ownerStoredName = space?.ownerName || (isMe ? (currentUser?.name || currentUser?.email || 'Me') : 'Workspace Owner');
                                    const isSelected = assignees.includes(ownerStoredName);

                                    return (
                                        <div
                                            className={`dropdown-item ${isSelected ? 'active' : ''}`}
                                            onClick={() => {
                                                setAssignees(prev =>
                                                    prev.includes(ownerStoredName)
                                                        ? prev.filter(a => a !== ownerStoredName)
                                                        : [...prev, ownerStoredName]
                                                );
                                            }}
                                        >
                                            <div className="user-avatar-mini" style={{ background: isMe ? 'var(--primary)' : '#10b981' }}>{ownerDisplayName[0]?.toUpperCase()}</div>
                                            <div style={{ flex: 1 }}>{ownerDisplayName} {isMe && '(Me)'}</div>
                                            {isSelected && <Check size={14} style={{ color: 'var(--primary)' }} />}
                                        </div>
                                    );
                                })()}

                                {workspaceMembers.length > 0 && (
                                    <>
                                        <div className="dropdown-divider"></div>
                                        <div className="dropdown-section">Members</div>
                                        {workspaceMembers.map(m => {
                                            const name = m.user_name || m.invited_email;
                                            const isAccepted = m.status === 'accepted';
                                            const isSelected = assignees.includes(name);

                                            return (
                                                <div
                                                    key={m.id}
                                                    className={`dropdown-item ${isSelected ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setAssignees(prev =>
                                                            prev.includes(name)
                                                                ? prev.filter(a => a !== name)
                                                                : [...prev, name]
                                                        );
                                                    }}
                                                    style={{ opacity: isAccepted ? 1 : 0.7 }}
                                                >
                                                    <div className="user-avatar-mini" style={{ background: isAccepted ? '#6366f1' : '#94a3b8' }}>
                                                        {name[0].toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div>{name}</div>
                                                        <div style={{ fontSize: '10px', opacity: 0.6 }}>{isAccepted ? 'Member' : 'Pending'}</div>
                                                    </div>
                                                    {isSelected && <Check size={14} style={{ color: 'var(--primary)' }} />}
                                                </div>
                                            );
                                        })}
                                    </>
                                )}
                                <div className="dropdown-divider"></div>
                                <div className="dropdown-item" onClick={() => { setAssignees([]); setShowAssigneeMenu(false); }}>
                                    Unassign All
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="prop-btn date-btn-group" onClick={(e) => {
                        setDatePickerTrigger(e.currentTarget);
                        setIsDatePickerOpen(true);
                    }}>
                        <Calendar size={14} />
                        <span className="date-display">
                            {startDate || dueDate ? (
                                <>
                                    {startDate ? format(new Date(startDate), 'MMM d') : ''}
                                    {startDate && dueDate ? ' - ' : ''}
                                    {dueDate ? format(new Date(dueDate), 'MMM d') : ''}
                                </>
                            ) : 'Dates'}
                        </span>
                    </div>
                    {isDatePickerOpen && (
                        <PremiumDatePicker
                            startDate={startDate}
                            dueDate={dueDate}
                            onSave={(dates) => {
                                setStartDate(dates.startDate);
                                setDueDate(dates.dueDate);
                                setIsDatePickerOpen(false);
                            }}
                            onClose={() => setIsDatePickerOpen(false)}
                            triggerElement={datePickerTrigger}
                        />
                    )}

                    <div className="dropdown-container">
                        <div className="prop-btn" onClick={() => setShowPriorityMenu(!showPriorityMenu)}>
                            <Flag size={14} className={`priority-icon-${priority}`} />
                            <span style={{ textTransform: 'capitalize' }}>{priority}</span>
                        </div>
                        {showPriorityMenu && (
                            <div className="property-dropdown priority-dropdown">
                                {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => (
                                    <div
                                        key={p}
                                        className={`dropdown-item priority-item-${p} ${priority === p ? 'active' : ''}`}
                                        onClick={() => { setPriority(p); setShowPriorityMenu(false); }}
                                    >
                                        <Flag size={14} />
                                        <span style={{ textTransform: 'capitalize' }}>{p}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="dropdown-container">
                        <button className="prop-btn" onClick={() => setShowTagMenu(!showTagMenu)}>
                            <Tag size={14} />
                            {selectedTags.length > 0 ? `${selectedTags.length} Tags` : 'Tags'}
                        </button>
                        {showTagMenu && (
                            <div className="property-dropdown tag-dropdown">
                                <div className="dropdown-header-sm">Select Tags</div>
                                {availableTags.map(tag => (
                                    <div
                                        key={tag.id}
                                        className={`dropdown-item tag-item ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                                        onClick={() => toggleTag(tag.id)}
                                    >
                                        <div className="tag-color-dot" style={{ backgroundColor: tag.color }}></div>
                                        {tag.name}
                                        {selectedTags.includes(tag.id) && <CornerDownLeft size={10} className="check-icon" />}
                                    </div>
                                ))}
                                {availableTags.length === 0 && <div className="dropdown-empty">No tags found</div>}
                            </div>
                        )}
                    </div>

                    <button className="prop-btn">
                        <MoreHorizontal size={14} />
                    </button>
                </div>

                <div className="custom-fields-section">
                    <div className="section-label">Custom Fields</div>
                    <div className="custom-fields-wrapper">
                        {showCustomFields && (
                            <div className="custom-fields-dropdown">
                                <div className="field-search-container">
                                    <input
                                        type="text"
                                        className="field-search-input"
                                        placeholder="Search..."
                                        value={fieldSearch}
                                        onChange={e => setFieldSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="field-list">
                                    {fieldOptions
                                        .filter(f => f.label.toLowerCase().includes(fieldSearch.toLowerCase()))
                                        .map(field => (
                                            <div key={field.id} className="field-option" onClick={() => setShowCustomFields(false)}>
                                                <div className="field-icon">{field.icon}</div>
                                                {field.label}
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        <button className="add-field-btn" onClick={() => setShowCustomFields(!showCustomFields)}>
                            <Plus size={14} />
                            Create new field
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="task-modal-footer">
                <div className="footer-left">
                    <button className="footer-btn">
                        <LayoutDashboard size={14} />
                        Templates
                    </button>
                </div>

                <div className="footer-right">
                    <div className="icon-action">
                        <Paperclip size={18} />
                        0
                    </div>
                    <div className="icon-action">
                        <Bell size={18} />
                        1
                    </div>

                    <div className="create-btn-group">
                        <button
                            className="btn-create-main"
                            onClick={() => handleSubmit()}
                            disabled={!name.trim()}
                        >
                            Create Task
                        </button>
                        <button className="btn-create-split" disabled={!name.trim()}>
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );

    const renderDocView = () => (
        <>
            <div className="context-dropdown">
                <List size={14} />
                My Docs
                <ChevronDown size={14} />
            </div>

            <div className="task-form">
                <input
                    type="text"
                    className="task-name-input"
                    placeholder="Name this Doc..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                />

                <div className="doc-options">
                    <div className="doc-option-row">
                        <File size={16} />
                        Start writing
                    </div>
                    <div className="doc-option-row">
                        <Sparkles size={16} color="#8b5cf6" />
                        Write with AI
                    </div>
                </div>

                <div className="section-label-small">Add new</div>

                <div className="doc-options">
                    <div className="doc-option-row">
                        <Table size={16} />
                        Table
                    </div>
                    <div className="doc-option-row">
                        <Columns size={16} />
                        Column
                    </div>
                    <div className="doc-option-row">
                        <List size={16} />
                        ClickUp List
                    </div>
                </div>
            </div>

            <div className="task-modal-footer simple-footer">
                <div className="private-toggle-wrapper" onClick={() => setIsPrivate(!isPrivate)}>
                    <div className={`toggle-switch ${isPrivate ? 'active' : ''}`}>
                        <div className="toggle-knob" />
                    </div>
                    <span className="private-label">Private</span>
                </div>
                <button className="btn-create-main" style={{ borderRadius: '6px' }}>Create Doc</button>
            </div>
        </>
    );

    const renderReminderView = () => (
        <>
            <div className="task-form" style={{ marginTop: '24px' }}>
                <input
                    type="text"
                    className="task-name-input"
                    placeholder="Reminder name or type '/' for commands"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                />

                <div className="reminder-controls">
                    <button className="reminder-pill">
                        <Calendar size={14} />
                        Today
                    </button>
                    <button className="reminder-pill avatar-pill">
                        <span style={{ fontSize: '10px', fontWeight: 'bold' }}>J</span>
                        For me
                    </button>
                    <button className="reminder-pill">
                        <Bell size={14} />
                        Notify me
                    </button>
                </div>
            </div>

            <div className="task-modal-footer simple-footer">
                <div style={{ flex: 1 }}></div>
                <div className="icon-action" style={{ marginRight: '16px' }}>
                    <Paperclip size={18} />
                </div>
                <button className="btn-create-main" style={{ borderRadius: '6px' }}>Create Reminder</button>
            </div>
        </>
    );

    const renderChatView = () => (
        <>
            <div className="context-dropdown">
                <MessageSquare size={14} />
                Workspace
                <ChevronDown size={14} />
            </div>

            <div className="task-form">
                <input
                    type="text"
                    className="task-name-input"
                    placeholder="Name this Chat..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                />
                <input
                    type="text"
                    placeholder="Add message"
                    className="task-desc-input"
                    style={{ minHeight: '40px', fontSize: '14px', marginTop: '12px' }}
                />
            </div>

            <div className="task-modal-footer simple-footer">
                <div className="private-toggle-wrapper" onClick={() => setIsPrivate(!isPrivate)}>
                    <div className={`toggle-switch ${isPrivate ? 'active' : ''}`}>
                        <div className="toggle-knob" />
                    </div>
                    <span className="private-label">Private</span>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="icon-action">
                        <Bell size={18} />
                    </div>
                    <button className="btn-create-main" style={{ borderRadius: '6px' }}>Create Chat</button>
                </div>
            </div>
        </>
    );

    const renderWhiteboardView = () => (
        <>
            <div className="context-dropdown">
                <PenTool size={14} />
                My Whiteboards
                <ChevronDown size={14} />
            </div>

            <div className="task-form">
                <input
                    type="text"
                    className="task-name-input"
                    placeholder="Name this Whiteboard..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="task-modal-footer simple-footer">
                <div className="private-toggle-wrapper" onClick={() => setIsPrivate(!isPrivate)}>
                    <div className={`toggle-switch ${isPrivate ? 'active' : ''}`}>
                        <div className="toggle-knob" />
                    </div>
                    <span className="private-label">Private</span>
                </div>
                <button className="btn-create-main" style={{ borderRadius: '6px' }}>Create Whiteboard</button>
            </div>
        </>
    );

    const renderDashboardView = () => (
        <>
            <div className="context-dropdown">
                <LayoutDashboard size={14} />
                My Dashboards
                <ChevronDown size={14} />
            </div>

            <div className="task-form">
                <input
                    type="text"
                    className="task-name-input"
                    placeholder="Name this Dashboard..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoFocus
                />
            </div>

            <div className="task-modal-footer simple-footer">
                <div className="private-toggle-wrapper" onClick={() => setIsPrivate(!isPrivate)}>
                    <div className={`toggle-switch ${isPrivate ? 'active' : ''}`}>
                        <div className="toggle-knob" />
                    </div>
                    <span className="private-label">Private</span>
                </div>
                <button className="btn-create-main" style={{ borderRadius: '6px' }}>Create Dashboard</button>
            </div>
        </>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-content task-modal ${isMaximized ? 'maximized' : ''}`}
                onClick={e => e.stopPropagation()}
                style={isMaximized ? { width: '95vw', height: '95vh', maxWidth: 'none' } : {}}
            >
                {/* Header Tabs */}
                <div className="task-modal-header">
                    <div className="task-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`task-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => { setActiveTab(tab.id); setName(''); }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="header-controls">
                        <button className="header-icon-btn" onClick={() => setIsMaximized(!isMaximized)}>
                            {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                        <button className="header-icon-btn" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {activeTab === 'task' && renderTaskView()}
                {activeTab === 'doc' && renderDocView()}
                {activeTab === 'reminder' && renderReminderView()}
                {activeTab === 'chat' && renderChatView()}
                {activeTab === 'whiteboard' && renderWhiteboardView()}
                {activeTab === 'dashboard' && renderDashboardView()}

            </div>
        </div>
    );
};

export default TaskModal;
