import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { serverStorage, getAuthToken } from './storage';
import type { AppState, Task, Space, Folder, List, ViewType, Subtask, Tag, ColumnSetting, Comment, TimeEntry, Relationship, Doc, Status, SavedView, AIConfig, Message, Dashboard, Clip, Notification, NotificationSettings, Agent } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { io, Socket } from 'socket.io-client';
import { API_ENDPOINTS } from '../config/api';
import { generateUUID } from '../utils/uuid';

let socket: Socket | null = null;

// --- Helper: Agent Condition Checker ---
const checkAgentCondition = (agent: Agent, task: Task): boolean => {
    if (!agent.trigger.conditions) return true;

    const condition = agent.trigger.conditions.toLowerCase();
    const taskText = (task.name + ' ' + (task.description || '')).toLowerCase();

    // Treat condition as set of keywords if it contains spaces
    const keywords = condition.split(' ').filter(w => w.length > 3 && !['task', 'about', 'when', 'this', 'that', 'with', 'from'].includes(w));

    const isMatch = keywords.length > 0
        ? keywords.some(k => taskText.includes(k))
        : taskText.includes(condition);

    return isMatch;
};

// --- Helper: Execute Autopilot (AI) ---
const executeAutopilot = async (
    agent: Agent,
    task: Task,
    state: AppStore
) => {
    const instructions = agent.action.instructions;
    if (!instructions) return;

    try {
        const aiConfig = state.aiConfig;
        const prompt = `
You are an intelligent autopilot for a Task Management App "AR Generator".
Your goal is to analyze the Task and the User Instructions, and output specific JSON updates to modify the task.

CONTEXT:
Task Name: "${task.name}"
Task Description: "${task.description || ''}"
Current Priority: ${task.priority}
Current Status: ${task.status}
Current Assignee: ${task.assignee || 'Unassigned'}

INSTRUCTIONS:
"${instructions}"

METADATA:
Current Date: ${new Date().toISOString()}
Available Tags: ${state.tags.map(t => t.name).join(', ')}

RESPONSE FORMAT:
Return a JSON object with the keys to update. DO NOT return markdown formatting, just the raw JSON string.
Supported Keys:
- "priority": "urgent" | "high" | "medium" | "low"
- "status": string (e.g., "TO DO", "IN PROGRESS", "COMPLETED")
- "dueDate": ISO 8601 Date String (calculate based on instructions like "due tomorrow")
- "startDate": ISO 8601 Date String
- "assignee": string (name of user)
- "tags": string[] (array of tag names to add)
- "subtasks": string[] (array of new subtask names to create)
- "comment": string (short explanation of what changed)
- "docName": string (if instruction asks to create a doc attached to this task)
- "blockingTaskName": string (if instruction says this blocks another task)

Example JSON:
{
  "priority": "high",
  "dueDate": "2025-12-31T09:00:00.000Z",
  "comment": "Marked high priority and due tomorrow per instructions."
}
`;

        let responseText = '';

        if (aiConfig.provider === 'ollama') {
            const response = await fetch(`${aiConfig.ollamaHost}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: aiConfig.ollamaModel,
                    prompt,
                    stream: false,
                    format: 'json',
                    system: "You are a JSON-speaking task automation assistant."
                }),
            });
            if (!response.ok) throw new Error('Ollama Error');
            const data = await response.json();
            responseText = data.response;
        } else {
            // Gemini
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            if (!apiKey) return;

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            responseText = result.response.text();
        }

        // Clean response (remove markdown code blocks if present)
        const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const updates = JSON.parse(jsonStr);

        // --- Apply Updates ---

        // 1. Basic Fields
        const taskUpdates: any = {};
        if (updates.priority && updates.priority !== task.priority) taskUpdates.priority = updates.priority;
        if (updates.status && updates.status !== task.status) taskUpdates.status = updates.status;
        if (updates.dueDate && updates.dueDate !== task.dueDate) taskUpdates.dueDate = updates.dueDate;
        if (updates.startDate && updates.startDate !== task.startDate) taskUpdates.startDate = updates.startDate;
        if (updates.assignee && updates.assignee !== task.assignee) taskUpdates.assignee = updates.assignee;

        // 2. Tags
        if (updates.tags && Array.isArray(updates.tags)) {
            const currentTags = task.tags || [];
            const newTagIds: string[] = [];

            updates.tags.forEach((tagName: string) => {
                // Find existing
                const existingTag = state.tags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
                if (existingTag) {
                    if (!currentTags.includes(existingTag.id)) newTagIds.push(existingTag.id);
                } else {
                    // Create new tag
                    const newTagId = generateUUID();
                    state.addTag({
                        name: tagName,
                        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
                    });
                    newTagIds.push(newTagId);
                }
            });

            if (newTagIds.length > 0) {
                taskUpdates.tags = [...currentTags, ...newTagIds];
            }
        }

        // 3. Subtasks
        if (updates.subtasks && Array.isArray(updates.subtasks)) {
            const newSubtasks = updates.subtasks.map((name: string) => ({
                id: generateUUID(),
                name,
                status: 'TO DO',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));

            const currentTask = state.tasks.find(t => t.id === task.id) || task;
            taskUpdates.subtasks = [...(currentTask.subtasks || []), ...newSubtasks];
        }

        // 4. Docs
        if (updates.docName) {
            const newDocId = state.addDoc({
                name: updates.docName,
                content: `# ${updates.docName}\n\nAuto-generated by Autopilot for task: ${task.name}`,
                userId: 'agent-bot',
                userName: 'Autopilot API'
            });
            taskUpdates.linkedDocId = newDocId;
        }

        // 5. Relations (Blocking)
        if (updates.blockingTaskName) {
            const target = state.tasks.find(t => t.name.toLowerCase().includes(updates.blockingTaskName.toLowerCase()));
            if (target) {
                const rel = { id: generateUUID(), type: 'blocking', taskId: target.id };
                const currentTask = state.tasks.find(t => t.id === task.id) || task;
                taskUpdates.relationships = [...(currentTask.relationships || []), rel];
            }
        }

        // 6. Comment
        const commentText = updates.comment
            ? `🤖 **Autopilot Executed**\n\n${updates.comment}`
            : `🤖 **Autopilot Executed**\n\nUpdates applied based on instruction: "${instructions}"`;

        state.addComment(task.id, {
            userId: 'agent-bot',
            userName: 'Autopilot Agent',
            text: commentText
        });

        if (Object.keys(taskUpdates).length > 0) {
            state.updateTask(task.id, taskUpdates);
        }

    } catch (error) {
        console.error('Autopilot Execution Failed:', error);
        state.addComment(task.id, {
            userId: 'agent-bot',
            userName: 'Autopilot Agent',
            text: `⚠️ **Autopilot Error**\n\nFailed to execute instructions: ${error}`
        });
    }
};


interface AppStore extends AppState {
    setTasks: (tasks: Task[]) => void;
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'subtasks'>) => void;
    updateTask: (taskId: string, updates: Partial<Task>) => void;
    deleteTask: (taskId: string) => void;
    duplicateTask: (taskId: string) => void;
    archiveTask: (taskId: string) => void;
    addSubtask: (taskId: string, subtask: Omit<Subtask, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
    deleteSubtask: (taskId: string, subtaskId: string) => void;
    setSpaces: (spaces: Space[]) => void;
    addSpace: (space: Omit<Space, 'id' | 'taskCount' | 'isDefault'>) => void;
    setFolders: (folders: Folder[]) => void;
    addFolder: (folder: Omit<Folder, 'id'>) => void;
    updateFolder: (folderId: string, updates: Partial<Folder>) => void;
    deleteFolder: (folderId: string) => void;
    duplicateFolder: (folderId: string) => void;
    setLists: (lists: List[]) => void;
    addList: (list: Omit<List, 'id' | 'taskCount'>) => void;
    updateList: (listId: string, updates: Partial<List>) => void;
    deleteList: (listId: string) => void;
    duplicateList: (listId: string) => void;
    updateSpace: (spaceId: string, updates: Partial<Space>) => void;
    deleteSpace: (spaceId: string) => void;
    leaveSpace: (spaceId: string) => Promise<void>;
    setCurrentSpaceId: (spaceId: string) => void;
    setCurrentListId: (listId: string | null) => void;
    setCurrentView: (view: ViewType) => void;
    addTag: (tag: Omit<Tag, 'id'>) => void;
    updateTag: (tagId: string, updates: Partial<Tag>) => void;
    deleteTag: (tagId: string) => void;
    setColumnSettings: (targetId: string, columns: ColumnSetting[]) => void;
    addComment: (taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
    addTimeEntry: (taskId: string, entry: Omit<TimeEntry, 'id'>) => void;
    addRelationship: (taskId: string, relationship: Omit<Relationship, 'id'>) => void;
    removeRelationship: (taskId: string, relationshipId: string) => void;
    addDoc: (doc: Omit<Doc, 'id' | 'updatedAt'>) => string;
    updateDoc: (docId: string, updates: Partial<Doc>) => void;
    addStatus: (targetId: string, isSpace: boolean, status: Omit<Status, 'id'>) => void;
    setTheme: (theme: AppState['theme']) => void;
    setAccentColor: (color: string) => void;
    startTimer: (taskId: string) => void;
    stopTimer: () => void;
    addSavedView: (view: Omit<SavedView, 'id' | 'createdAt'>) => void;
    updateSavedView: (viewId: string, updates: Partial<SavedView>) => void;
    deleteSavedView: (viewId: string) => void;
    setAIConfig: (config: Partial<AIConfig>) => void;
    setAiMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
    clearAiMessages: () => void;
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    startNewChat: () => void;
    loadSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    addDashboard: (dashboard: Omit<Dashboard, 'id' | 'updatedAt' | 'createdAt' | 'ownerId' | 'ownerName'> & { id?: string }) => string;
    updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
    deleteDashboard: (id: string) => void;
    setCurrentDashboardId: (id: string | null) => void;
    addClip: (clip: Omit<Clip, 'id' | 'createdAt' | 'ownerId' | 'ownerName'>) => void;
    deleteClip: (id: string) => void;
    addClipComment: (clipId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
    renameClip: (id: string, name: string) => void;
    addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
    markNotificationAsRead: (notificationId: string) => void;
    markAllNotificationsAsRead: () => void;
    clearNotification: (notificationId: string) => void;
    clearAllNotifications: () => void;
    updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
    checkDueDates: () => void;
    addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'creatorId' | 'creatorName'>) => void;
    updateAgent: (id: string, updates: Partial<Agent>) => void;
    deleteAgent: (id: string) => void;
    syncSharedData: () => Promise<void>;
    setupSocket: (userId: string) => void;
    refreshRooms: () => void;
}

export const DEFAULT_STATUSES: Status[] = [
    { id: 'todo', name: 'TO DO', color: '#87909e', type: 'todo' },
    { id: 'inprogress', name: 'IN PROGRESS', color: '#3b82f6', type: 'inprogress' },
    { id: 'completed', name: 'COMPLETED', color: '#10b981', type: 'done' }
];

export const useAppStore = create<AppStore>()(
    persist(
        (set, get) => ({
            tasks: [],
            spaces: [
                { id: 'everything', name: 'Everything', icon: 'star', color: '#3b82f6', isDefault: true, taskCount: 0, statuses: DEFAULT_STATUSES },
                { id: 'team-space', name: 'Team Space', icon: 'users', color: '#10b981', isDefault: true, taskCount: 0, statuses: DEFAULT_STATUSES }
            ],
            folders: [],
            lists: [],
            tags: [],
            docs: [],
            currentSpaceId: 'team-space',
            currentListId: null,
            currentView: 'home',
            columnSettings: {
                'default': [
                    { id: 'name', name: 'Name', visible: true, width: 350 },
                    { id: 'assignee', name: 'Assignee', visible: true, width: 140 },
                    { id: 'dueDate', name: 'Due Date', visible: true, width: 130 },
                    { id: 'priority', name: 'Priority', visible: true, width: 110 },
                    { id: 'status', name: 'Status', visible: true, width: 130 },
                ]
            },
            theme: 'system',
            accentColor: '#2563eb',
            activeTimer: null,
            agents: [],
            savedViews: [
                { id: 'default-list', name: 'List', viewType: 'list', isPinned: true, isPrivate: false, createdAt: new Date().toISOString() },
                { id: 'default-kanban', name: 'Board', viewType: 'kanban', isPinned: true, isPrivate: false, createdAt: new Date().toISOString() },
                { id: 'default-calendar', name: 'Calendar', viewType: 'calendar', isPinned: true, isPrivate: false, createdAt: new Date().toISOString() },
                { id: 'default-gantt', name: 'Gantt', viewType: 'gantt', isPinned: true, isPrivate: false, createdAt: new Date().toISOString() },
            ],
            aiConfig: {
                provider: 'gemini',
                ollamaHost: 'http://localhost:11434',
                ollamaModel: 'llama3'
            },
            aiMessages: [],
            aiSessions: [],
            dashboards: [],
            currentDashboardId: null,
            clips: [],
            sidebarCollapsed: false,
            notifications: [],
            notificationSettings: {
                enabled: true,
                dueSoonDays: 3,
                browserNotifications: false,
                soundEnabled: false,
                notifyOnOverdue: true,
                notifyOnDueSoon: true,
                notifyOnAssignment: true
            },

            setTasks: (tasks) => set({ tasks }),
            addTask: async (task) => {

                const newTask: Task = {
                    ...task,
                    id: generateUUID(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    subtasks: [],
                    tags: task.tags || []
                };

                // 1. Immediate Update (Optimistic)
                set((state) => ({ tasks: [newTask, ...state.tasks] }));

                // Propagate to Owner if Shared Space
                const currentState = get();
                const space = currentState.spaces.find(s => s.id === task.spaceId);

                // Real-time broadcast
                if (socket) {
                    socket.emit('realtime_update', { type: 'task', data: newTask, spaceId: newTask.spaceId });
                }

                if (space && (space as any).isShared && (space as any).ownerId) {
                    const token = getAuthToken();
                    if (token) {
                        fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                ownerId: (space as any).ownerId,
                                type: 'task',
                                data: newTask
                            })
                        }).catch(e => console.error('[AppStore] Failed to propagate task to owner:', e));
                    }
                }

                // 2. Process Agents
                // We reference 'get()' to ensure we have fresh state including agents
                const freshState = get();
                const activeAgents = freshState.agents.filter(a => a.isEnabled && a.trigger.type === 'task_created');

                for (const agent of activeAgents) {
                    if (checkAgentCondition(agent, newTask)) {
                        if (agent.action.type === 'launch_autopilot') {
                            await executeAutopilot(agent, newTask, freshState);
                        }
                        // Handle other action types like notifications here if needed
                    }
                }
            },

            updateTask: async (taskId, updates) => {
                console.log(`Updating task ${taskId}`, updates);

                set((state) => {
                    const newTasks = state.tasks.map((task) =>
                        task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
                    );
                    return { tasks: newTasks };
                });

                // Agent Processing
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);

                if (updatedTask) {
                    // Real-time broadcast
                    if (socket) {
                        socket.emit('realtime_update', { type: 'task', data: updatedTask, spaceId: updatedTask.spaceId });
                    }

                    // Propagate to Owner if Shared Space
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    ownerId: (space as any).ownerId,
                                    type: 'task',
                                    data: updatedTask
                                })
                            }).catch(e => console.error('[AppStore] Failed to propagate task update:', e));
                        }
                    }

                    const activeAgents = state.agents.filter(a => a.isEnabled && a.trigger.type === 'task_updated');

                    for (const agent of activeAgents) {
                        if (checkAgentCondition(agent, updatedTask)) {
                            if (agent.action.type === 'launch_autopilot') {
                                // We use executeAutopilot here too. 
                                // Note: Infinite loops are possible if AI updates trigger 'task_updated' again.
                                // For now, we assume user is careful or we add a flag.
                                // Ideally, updates from AI should have a flag to suppress agents, but we'll stick to basic implementation.
                                await executeAutopilot(agent, updatedTask, state);
                            }
                        }
                    }
                }
            },
            deleteTask: (taskId) => {
                const state = get();
                const task = state.tasks.find(t => t.id === taskId);

                if (task) {
                    // Real-time broadcast
                    if (socket) {
                        socket.emit('realtime_update', { type: 'task_delete', data: { id: taskId }, spaceId: task.spaceId });
                    }
                }

                set((state) => ({
                    tasks: state.tasks.filter((task) => task.id !== taskId)
                }));
            },
            duplicateTask: (taskId) => set((state) => {
                const task = state.tasks.find(t => t.id === taskId);
                if (!task) return state;
                const newId = generateUUID();
                const newTask = {
                    ...task,
                    id: newId,
                    name: `${task.name} (Copy)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    subtasks: task.subtasks?.map(st => ({ ...st, id: generateUUID() }))
                };
                return { tasks: [...state.tasks, newTask] };
            }),
            archiveTask: (taskId) => set((state) => ({
                tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' } : t)
            })),
            addSubtask: (taskId, subtask) => {
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId ? {
                            ...task,
                            subtasks: [...(task.subtasks || []), { ...subtask, id: generateUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
                            updatedAt: new Date().toISOString()
                        } : task
                    )
                }));

                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'task', data: updatedTask })
                            }).catch(e => console.error('[AppStore] Failed to propagate subtask:', e));
                        }
                    }

                    // Real-time broadcast
                    if (socket) {
                        socket.emit('realtime_update', { type: 'task', data: updatedTask, spaceId: updatedTask.spaceId });
                    }
                }
            },
            updateSubtask: (taskId, subtaskId, updates) => {
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId ? {
                            ...task,
                            subtasks: task.subtasks?.map(st => st.id === subtaskId ? { ...st, ...updates, updatedAt: new Date().toISOString() } : st),
                            updatedAt: new Date().toISOString()
                        } : task
                    )
                }));
                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    // Real-time broadcast
                    if (socket) {
                        socket.emit('realtime_update', { type: 'task', data: updatedTask, spaceId: updatedTask.spaceId });
                    }

                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'task', data: updatedTask })
                            }).catch(e => console.error('[AppStore] Failed to propagate subtask update:', e));
                        }
                    }
                }
            },
            deleteSubtask: (taskId, subtaskId) => {
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId ? {
                            ...task,
                            subtasks: task.subtasks?.filter(st => st.id !== subtaskId),
                            updatedAt: new Date().toISOString()
                        } : task
                    )
                }));
                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'task', data: updatedTask })
                            }).catch(e => console.error('[AppStore] Failed to propagate subtask deletion:', e));
                        }
                    }

                    // Real-time broadcast
                    if (socket) {
                        socket.emit('realtime_update', { type: 'task', data: updatedTask, spaceId: updatedTask.spaceId });
                    }
                }
            },
            setSpaces: (spaces) => set({ spaces }),
            addSpace: (space) => set((state) => ({
                spaces: [...state.spaces, {
                    ...space,
                    id: generateUUID(),
                    taskCount: 0,
                    isDefault: false,
                    statuses: DEFAULT_STATUSES,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }]
            })),
            setFolders: (folders) => set({ folders }),
            addFolder: (folder) => {
                const newFolder = {
                    ...folder,
                    id: generateUUID(),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                set((state) => ({
                    folders: [...state.folders, newFolder]
                }));

                // Propagate to Owner if Shared Space
                const state = get();
                const space = state.spaces.find(s => s.id === folder.spaceId);
                if (space && (space as any).isShared && (space as any).ownerId) {
                    const token = getAuthToken();
                    if (token) {
                        fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                ownerId: (space as any).ownerId,
                                type: 'folder',
                                data: newFolder
                            })
                        }).catch(e => console.error('[AppStore] Failed to propagate folder to owner:', e));
                    }
                }
            },
            updateFolder: (folderId, updates) => set((state) => ({
                folders: state.folders.map(f => f.id === folderId ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f)
            })),
            deleteFolder: (folderId) => set((state) => ({
                folders: state.folders.filter(f => f.id !== folderId),
                lists: state.lists.map(l => l.folderId === folderId ? { ...l, folderId: undefined } : l) // Move lists to root of space
            })),
            duplicateFolder: (folderId) => set((state) => {
                const folder = state.folders.find(f => f.id === folderId);
                if (!folder) return state;

                const newFolderId = generateUUID();
                const newFolder: Folder = {
                    ...folder,
                    id: newFolderId,
                    name: `${folder.name} (Copy)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Duplicate Lists in this folder
                const folderLists = state.lists.filter(l => l.folderId === folderId);
                const newLists = folderLists.map(list => ({
                    ...list,
                    id: generateUUID(),
                    folderId: newFolderId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));

                // Duplicate Tasks in those lists? 
                // For a full robust duplicate, we should. But for this MVP step, maybe just Folder + Lists.
                // Users usually expect tasks. Let's try to map tasks too.
                const newTasks: Task[] = [];
                newLists.forEach((newList, index) => {
                    const originalListId = folderLists[index].id;
                    const originalTasks = state.tasks.filter(t => t.listId === originalListId);
                    originalTasks.forEach(task => {
                        newTasks.push({
                            ...task,
                            id: generateUUID(),
                            listId: newList.id,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                    });
                });

                return {
                    folders: [...state.folders, newFolder],
                    lists: [...state.lists, ...newLists],
                    tasks: [...state.tasks, ...newTasks]
                };
            }),
            setLists: (lists) => set({ lists }),
            addList: (list) => {
                const newList = {
                    ...list,
                    id: generateUUID(),
                    taskCount: 0,
                    statuses: DEFAULT_STATUSES,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                set((state) => ({
                    lists: [...state.lists, newList]
                }));

                // Real-time broadcast
                if (socket) {
                    socket.emit('realtime_update', { type: 'list', data: newList, spaceId: newList.spaceId });
                }

                const state = get();
                const space = state.spaces.find(s => s.id === list.spaceId);

                if (space && (space as any).isShared && (space as any).ownerId) {
                    const token = getAuthToken();
                    if (token) {
                        fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                ownerId: (space as any).ownerId,
                                type: 'list',
                                data: newList
                            })
                        }).catch(e => console.error('[AppStore] Failed to propagate list to owner:', e));
                    }
                }
            },
            duplicateList: (listId: string) => set((state) => {
                const list = state.lists.find(l => l.id === listId);
                if (!list) return state;

                const newListId = generateUUID();
                const newList = {
                    ...list,
                    id: newListId,
                    name: `${list.name} (Copy)`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                // Duplicate tasks
                const originalTasks = state.tasks.filter(t => t.listId === listId);
                const newTasks = originalTasks.map(t => ({
                    ...t,
                    id: generateUUID(),
                    listId: newListId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }));

                return {
                    lists: [...state.lists, newList],
                    tasks: [...state.tasks, ...newTasks]
                };
            }),
            updateList: (listId, updates) => {
                set((state) => ({
                    lists: state.lists.map(l => l.id === listId ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l)
                }));

                // Real-time broadcast
                const list = get().lists.find(l => l.id === listId);
                if (list && socket) {
                    socket.emit('realtime_update', { type: 'list', data: list, spaceId: list.spaceId });
                }

                // Propagate
                if (list) {
                    const space = get().spaces.find(s => s.id === list.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'list', data: list })
                            }).catch(e => console.error('[AppStore] Failed to propagate list update:', e));
                        }
                    }
                }
            },
            deleteList: (listId) => {
                const list = get().lists.find(l => l.id === listId);
                if (list && socket) {
                    socket.emit('realtime_update', { type: 'list_delete', data: { id: listId }, spaceId: list.spaceId });
                }

                set((state) => ({
                    lists: state.lists.filter(l => l.id !== listId),
                    tasks: state.tasks.filter(t => t.listId !== listId)
                }));
            },
            updateSpace: (spaceId, updates) => set((state) => ({
                spaces: state.spaces.map(s => s.id === spaceId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)
            })),
            deleteSpace: (spaceId) => set((state) => ({
                spaces: state.spaces.filter(s => s.id !== spaceId),
                tasks: state.tasks.filter(t => t.spaceId !== spaceId),
                folders: state.folders.filter(f => f.spaceId !== spaceId),
                lists: state.lists.filter(l => l.spaceId !== spaceId)
            })),
            leaveSpace: async (spaceId) => {
                // Remove locally
                set((state) => ({
                    spaces: state.spaces.filter(s => s.id !== spaceId),
                    tasks: state.tasks.filter(t => t.spaceId !== spaceId),
                    folders: state.folders.filter(f => f.spaceId !== spaceId),
                    lists: state.lists.filter(l => l.spaceId !== spaceId),
                    currentSpaceId: state.currentSpaceId === spaceId ? 'everything' : state.currentSpaceId
                }));

                // Call API
                const token = getAuthToken();
                if (token) {
                    try {
                        await fetch(API_ENDPOINTS.SHARED_LEAVE, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ resourceType: 'space', resourceId: spaceId })
                        });
                    } catch (e) {
                        console.error('Leave space API error', e);
                    }
                }
            },
            setCurrentSpaceId: (spaceId) => set({ currentSpaceId: spaceId }),
            setCurrentListId: (listId) => set({ currentListId: listId }),
            setCurrentView: (view) => set({ currentView: view }),

            addTag: (tag) => set((state) => ({
                tags: [...state.tags, { ...tag, id: generateUUID() }]
            })),
            updateTag: (tagId, updates) => set((state) => ({
                tags: state.tags.map(t => t.id === tagId ? { ...t, ...updates } : t)
            })),
            deleteTag: (tagId) => set((state) => ({
                tags: state.tags.filter(t => t.id !== tagId)
            })),
            setColumnSettings: (targetId, columns) => set((state) => ({
                columnSettings: { ...state.columnSettings, [targetId]: columns }
            })),
            addComment: (taskId, comment) => {
                set((state) => ({
                    tasks: state.tasks.map(task => task.id === taskId ? {
                        ...task,
                        comments: [...(task.comments || []), { ...comment, id: generateUUID(), createdAt: new Date().toISOString() }],
                        updatedAt: new Date().toISOString()
                    } : task)
                }));

                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    ownerId: (space as any).ownerId,
                                    type: 'task',
                                    data: updatedTask
                                })
                            }).catch(e => console.error('[AppStore] Failed to propagate comment:', e));
                        }
                    }
                }
            },
            addTimeEntry: (taskId, entry) => {
                set((state) => ({
                    tasks: state.tasks.map(task => task.id === taskId ? {
                        ...task,
                        timeEntries: [...(task.timeEntries || []), { ...entry, id: generateUUID() }],
                        updatedAt: new Date().toISOString()
                    } : task)
                }));
                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'task', data: updatedTask })
                            }).catch(e => console.error('[AppStore] Failed to propagate time entry:', e));
                        }
                    }
                }
            },
            addRelationship: (taskId, relationship) => {
                set((state) => ({
                    tasks: state.tasks.map(task => task.id === taskId ? {
                        ...task,
                        relationships: [...(task.relationships || []), { ...relationship, id: generateUUID() }],
                        updatedAt: new Date().toISOString()
                    } : task)
                }));
                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'task', data: updatedTask })
                            }).catch(e => console.error('[AppStore] Failed to propagate relationship:', e));
                        }
                    }
                }
            },
            removeRelationship: (taskId, relationshipId) => {
                set((state) => ({
                    tasks: state.tasks.map(task => task.id === taskId ? {
                        ...task,
                        relationships: (task.relationships || []).filter(r => r.id !== relationshipId),
                        updatedAt: new Date().toISOString()
                    } : task)
                }));
                // Propagate
                const state = get();
                const updatedTask = state.tasks.find(t => t.id === taskId);
                if (updatedTask) {
                    const space = state.spaces.find(s => s.id === updatedTask.spaceId);
                    if (space && (space as any).isShared && (space as any).ownerId) {
                        const token = getAuthToken();
                        if (token) {
                            fetch(API_ENDPOINTS.SHARED_PROPAGATE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ ownerId: (space as any).ownerId, type: 'task', data: updatedTask })
                            }).catch(e => console.error('[AppStore] Failed to propagate relationship removal:', e));
                        }
                    }
                }
            },
            addDoc: (doc) => {
                const id = generateUUID();
                set((state) => ({
                    docs: [...state.docs, { ...doc, id, updatedAt: new Date().toISOString() }]
                }));
                return id;
            },
            updateDoc: (docId, updates) => set((state) => ({
                docs: state.docs.map(doc => doc.id === docId ? { ...doc, ...updates, updatedAt: new Date().toISOString() } : doc)
            })),
            addStatus: (targetId, isSpace, status) => set((state) => {
                const id = generateUUID();
                const newStatus: Status = { ...status, id };

                const getUpdatedStatuses = (currentStatuses: Status[] | undefined) => {
                    // If no statuses exist (e.g. from old persisted state), use defaults + new one
                    const base = (currentStatuses && currentStatuses.length > 0)
                        ? currentStatuses
                        : DEFAULT_STATUSES;
                    return [...base, newStatus];
                };

                if (isSpace) {
                    const newSpaces = state.spaces.map(s =>
                        s.id === targetId ? { ...s, statuses: getUpdatedStatuses(s.statuses) } : s
                    );
                    return { spaces: newSpaces };
                } else {
                    const newLists = state.lists.map(l =>
                        l.id === targetId ? { ...l, statuses: getUpdatedStatuses(l.statuses) } : l
                    );
                    return { lists: newLists };
                }
            }),
            setTheme: (theme) => set({ theme }),
            setAccentColor: (accentColor) => set({ accentColor }),

            startTimer: (taskId) => {
                const state = get();
                // If there's already a timer running, stop it first
                if (state.activeTimer) {
                    state.stopTimer();
                }
                set({ activeTimer: { taskId, startTime: new Date().toISOString() } });
            },

            stopTimer: () => {
                const state = get();
                const { activeTimer } = state;
                if (!activeTimer) return;

                const endTime = new Date();
                const startTime = new Date(activeTimer.startTime);
                const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

                // Always record at least 1 minute if it ran
                const duration = durationMinutes < 1 ? 1 : durationMinutes;

                state.addTimeEntry(activeTimer.taskId, {
                    duration,
                    date: endTime.toISOString(),
                    userId: 'user-1'
                });

                set({ activeTimer: null });
            },

            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

            addSavedView: (view) => set((state) => ({
                savedViews: [...state.savedViews, { ...view, id: generateUUID(), createdAt: new Date().toISOString() }]
            })),
            updateSavedView: (viewId, updates) => set((state) => ({
                savedViews: state.savedViews.map(v => v.id === viewId ? { ...v, ...updates } : v)
            })),
            deleteSavedView: (viewId) => set((state) => ({
                savedViews: state.savedViews.filter(v => v.id !== viewId)
            })),
            setAIConfig: (config) => set((state) => ({
                aiConfig: { ...state.aiConfig, ...config }
            })),
            setAiMessages: (messages) => set((state) => ({
                aiMessages: typeof messages === 'function' ? messages(state.aiMessages) : messages
            })),
            clearAiMessages: () => set({ aiMessages: [] }),
            startNewChat: () => set((state) => {
                if (state.aiMessages.length === 0) return state;
                const firstUserMsg = state.aiMessages.find(m => m.role === 'user');
                const title = firstUserMsg ? (firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')) : 'New Chat';

                const newSession = {
                    id: generateUUID(),
                    title,
                    createdAt: new Date().toISOString(),
                    messages: state.aiMessages
                };

                return {
                    aiSessions: [newSession, ...state.aiSessions],
                    aiMessages: []
                };
            }),
            loadSession: (sessionId) => set((state) => {
                const session = state.aiSessions.find(s => s.id === sessionId);
                if (!session) return state;
                return { aiMessages: session.messages };
            }),
            deleteSession: (sessionId) => set((state) => ({
                aiSessions: state.aiSessions.filter(s => s.id !== sessionId)
            })),
            addDashboard: (dashboard) => {
                const id = dashboard.id || generateUUID();
                set((state) => ({
                    dashboards: [
                        ...state.dashboards,
                        {
                            ...dashboard,
                            id,
                            updatedAt: new Date().toISOString(),
                            createdAt: new Date().toISOString(),
                            ownerId: 'user-1',
                            ownerName: 'Jundee'
                        } as Dashboard
                    ]
                }));
                return id;
            },
            updateDashboard: (id, updates) => set((state) => ({
                dashboards: state.dashboards.map(d => d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d)
            })),
            deleteDashboard: (id) => set((state) => ({
                dashboards: state.dashboards.filter(d => d.id !== id),
                currentDashboardId: state.currentDashboardId === id ? null : state.currentDashboardId
            })),
            setCurrentDashboardId: (id) => set({ currentDashboardId: id }),
            addClip: (clip) => set((state) => ({
                clips: [
                    {
                        ...clip,
                        id: generateUUID(),
                        createdAt: new Date().toISOString(),
                        ownerId: 'user-1',
                        ownerName: 'Jundee Mark Gerona Molina'
                    },
                    ...state.clips
                ]
            })),
            deleteClip: (id) => set((state) => {
                console.log('Action: deleteClip', id);
                return {
                    clips: state.clips.filter(c => c.id !== id)
                };
            }),
            addClipComment: (clipId, comment) => set((state) => ({
                clips: state.clips.map(c => c.id === clipId ? {
                    ...c,
                    comments: [...(c.comments || []), { ...comment, id: generateUUID(), createdAt: new Date().toISOString() }]
                } : c)
            })),
            renameClip: (id, name) => set((state) => {
                console.log('Action: renameClip', id, name);
                return {
                    clips: state.clips.map(c => c.id === id ? { ...c, name, updatedAt: new Date().toISOString() } : c)
                };
            }),

            // Notification actions
            addNotification: (notification) => set((state) => ({
                notifications: [
                    {
                        ...notification,
                        id: generateUUID(),
                        createdAt: new Date().toISOString(),
                        isRead: false
                    },
                    ...state.notifications
                ]
            })),

            markNotificationAsRead: (notificationId) => set((state) => ({
                notifications: state.notifications.map(n =>
                    n.id === notificationId ? { ...n, isRead: true } : n
                )
            })),

            markAllNotificationsAsRead: () => set((state) => ({
                notifications: state.notifications.map(n => ({ ...n, isRead: true }))
            })),

            clearNotification: (notificationId) => set((state) => ({
                notifications: state.notifications.filter(n => n.id !== notificationId)
            })),

            clearAllNotifications: () => set({ notifications: [] }),

            updateNotificationSettings: (settings) => set((state) => ({
                notificationSettings: { ...state.notificationSettings, ...settings }
            })),

            checkDueDates: () => {
                const state = get();
                if (!state.notificationSettings.enabled) return;

                const now = new Date();
                const dueSoonThreshold = new Date();
                dueSoonThreshold.setDate(now.getDate() + state.notificationSettings.dueSoonDays);

                state.tasks.forEach(task => {
                    if (!task.dueDate) return;

                    const dueDate = new Date(task.dueDate);
                    const taskId = task.id;

                    // Check if notification already exists for this task
                    const existingNotification = state.notifications.find(
                        n => n.taskId === taskId && (n.type === 'due_soon' || n.type === 'overdue')
                    );

                    // Check for overdue tasks
                    if (state.notificationSettings.notifyOnOverdue && dueDate < now && task.status !== 'COMPLETED') {
                        if (!existingNotification || existingNotification.type !== 'overdue') {
                            state.addNotification({
                                type: 'overdue',
                                title: 'Task Overdue',
                                message: `"${task.name}" is overdue`,
                                taskId: task.id,
                                taskName: task.name,
                                dueDate: task.dueDate
                            });

                            // Browser notification
                            if (state.notificationSettings.browserNotifications && 'Notification' in window) {
                                if (Notification.permission === 'granted') {
                                    new Notification('Task Overdue', {
                                        body: `"${task.name}" is overdue`,
                                        icon: '/favicon.ico'
                                    });
                                }
                            }
                        }
                    }
                    // Check for due soon tasks
                    else if (state.notificationSettings.notifyOnDueSoon && dueDate <= dueSoonThreshold && dueDate >= now && task.status !== 'COMPLETED') {
                        if (!existingNotification) {
                            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            state.addNotification({
                                type: 'due_soon',
                                title: 'Task Due Soon',
                                message: `"${task.name}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
                                taskId: task.id,
                                taskName: task.name,
                                dueDate: task.dueDate
                            });

                            // Browser notification
                            if (state.notificationSettings.browserNotifications && 'Notification' in window) {
                                if (Notification.permission === 'granted') {
                                    new Notification('Task Due Soon', {
                                        body: `"${task.name}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
                                        icon: '/favicon.ico'
                                    });
                                }
                            }
                        }
                    }
                });
            },

            addAgent: (agent) => set((state) => ({
                agents: [
                    ...state.agents,
                    {
                        ...agent,
                        id: generateUUID(),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        creatorId: 'user-1',
                        creatorName: 'Jundee'
                    }
                ]
            })),
            updateAgent: (id, updates) => set((state) => ({
                agents: state.agents.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a)
            })),
            deleteAgent: (id) => set((state) => ({
                agents: state.agents.filter(a => a.id !== id)
            })),
            syncSharedData: async () => {
                const token = getAuthToken();
                if (!token) return;

                try {
                    const sharedRes = await fetch(API_ENDPOINTS.SHARED, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (sharedRes.ok) {
                        const sharedData = await sharedRes.json();

                        set((state) => {
                            const newState: any = {};
                            let hasChanges = false;

                            const merge = (listName: string, remoteItems: any[]) => {
                                if (!remoteItems || remoteItems.length === 0) return;
                                const localList = [...(state[listName as keyof AppStore] as any[])];
                                const localMap = new Map(localList.map(i => [i.id, i]));
                                let listChanged = false;

                                remoteItems.forEach(rItem => {
                                    if (localMap.has(rItem.id)) {
                                        const lItem = localMap.get(rItem.id);
                                        const rTime = rItem.updatedAt ? new Date(rItem.updatedAt).getTime() : 0;
                                        const lTime = lItem.updatedAt ? new Date(lItem.updatedAt).getTime() : 0;

                                        // Update if remote is newer OR if current local item doesn't have a timestamp
                                        if (rTime > lTime || (!lItem.updatedAt && rItem.updatedAt)) {
                                            Object.assign(lItem, rItem);
                                            listChanged = true;
                                        }
                                    } else {
                                        localList.push(rItem);
                                        listChanged = true;
                                    }
                                });

                                if (listChanged) {
                                    newState[listName] = localList;
                                    hasChanges = true;
                                }
                            };

                            merge('spaces', sharedData.spaces);
                            merge('folders', sharedData.folders);
                            merge('lists', sharedData.lists);
                            merge('tasks', sharedData.tasks);

                            return hasChanges ? newState : state;
                        });
                    }
                } catch (e) {
                    console.error('[AppStore] Sync failed:', e);
                }
            },

            setupSocket: (userId) => {
                if (socket) return;

                socket = io(API_ENDPOINTS.SOCKET_URL, {
                    transports: ['websocket', 'polling'],
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000,
                });

                socket.on('connect', () => {
                    console.log('[Socket] Connected as', userId);
                    socket?.emit('join_room', userId);
                    get().refreshRooms();
                });

                socket.on('shared_update', ({ type, data }) => {
                    console.log('[Socket] Received shared update:', type, data.id);
                    set((state) => {
                        if (type === 'task') {
                            const exists = state.tasks.find(t => t.id === data.id);
                            if (exists) {
                                return {
                                    tasks: state.tasks.map(t => t.id === data.id ? { ...t, ...data } : t)
                                };
                            } else {
                                return { tasks: [data, ...state.tasks] };
                            }
                        } else if (type === 'task_delete') {
                            return {
                                tasks: state.tasks.filter(t => t.id !== data.id)
                            };
                        } else if (type === 'list') {
                            const exists = state.lists.find(l => l.id === data.id);
                            if (exists) {
                                return {
                                    lists: state.lists.map(l => l.id === data.id ? { ...l, ...data } : l)
                                };
                            } else {
                                return { lists: [...state.lists, data] };
                            }
                        } else if (type === 'list_delete') {
                            return {
                                lists: state.lists.filter(l => l.id !== data.id)
                            };
                        } else if (type === 'notification') {
                            // Trigger Browser Notification
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification(data.title, {
                                    body: data.message,
                                    icon: '/favicon.ico'
                                });
                            }
                            return {
                                notifications: [data, ...state.notifications]
                            };
                        }
                        return state;
                    });
                });

                socket.on('disconnect', () => {
                    console.log('[Socket] Disconnected');
                    socket = null;
                });
            },

            refreshRooms: () => {
                if (!socket) return;
                const state = get();
                state.spaces.forEach(s => {
                    socket?.emit('join_room', `space:${s.id}`);
                    console.log(`[Socket] Joined room: space:${s.id}`);
                });
            },
        }),
        {
            name: 'ar-generator-app-storage',
            storage: createJSONStorage(() => serverStorage),
            version: 2, // Bump version to force re-eval/migration
            migrate: (persistedState: any, version) => {
                console.log(`[Zustand] Migrating from version ${version} to 2`);
                if (version === 0 || version === 1) {
                    // Manual schema repair if needed, though storage.ts mostly handles it.
                    // We can just return the state as-is because storage.ts already patches timestamps.
                    return persistedState;
                }
                return persistedState;
            },
            onRehydrateStorage: () => {
                console.log('[Zustand] Starting hydration...');
                return (_, error) => {
                    if (error) {
                        console.error('[Zustand] An error happened during hydration', error);
                    } else {
                        console.log('[Zustand] Hydration finished successfully!');
                    }
                };
            }
        }
    )
);
