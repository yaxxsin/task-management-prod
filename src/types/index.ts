import type { Agent } from './agent';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  name: string;
  status: string;
  priority?: Priority;
  assignee?: string;
  assignees?: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  customFieldValues?: Record<string, any>;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  duration: number; // in minutes
  description?: string;
  date: string;
  userId: string;
}

export interface Relationship {
  id: string;
  type: 'waiting' | 'blocking' | 'linked' | 'custom';
  taskId: string;
}

export interface Status {
  id: string;
  name: string;
  color: string;
  type: 'todo' | 'inprogress' | 'done' | 'closed';
}

export interface Doc {
  id: string;
  name: string;
  content: string;
  spaceId?: string;
  listId?: string;
  userId: string;
  userName: string;
  updatedAt: string;
}

export type TaskType = 'task' | 'milestone' | 'form_response' | 'meeting_note';

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: Priority;
  taskType?: TaskType;
  spaceId: string;
  listId?: string;
  assignee?: string;
  assignees?: string[];
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  subtasks?: Subtask[];
  comments?: Comment[];
  timeEntries?: TimeEntry[];
  relationships?: Relationship[];
  linkedDocId?: string;
  customFieldValues?: Record<string, any>;
}

export interface Space {
  id: string;
  name: string;
  icon: string;
  color: string | null;
  isDefault: boolean;
  taskCount: number;
  statuses?: Status[];
  createdAt?: string;
  updatedAt?: string;
  isShared?: boolean;
  ownerId?: string;
  permission?: string;
  ownerName?: string;
}

export interface Folder {
  id: string;
  name: string;
  spaceId: string;
  color?: string;
  icon?: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface List {
  id: string;
  name: string;
  spaceId: string;
  folderId?: string;
  taskCount: number;
  icon?: string;
  color?: string;
  statuses?: Status[];
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ViewType = 'home' | 'list' | 'table' | 'kanban' | 'calendar' | 'gantt' | 'timesheet' | 'dashboards' | 'docs' | 'pulse' | 'forms' | 'inbox' | 'teams' | 'whiteboards' | 'clips' | 'goals' | 'space_overview' | 'agents';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColumnSetting {
  id: string;
  name: string;
  visible: boolean;
  width?: number;
  type?: string;
  calculationType?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
  options?: { id: string; name: string; color: string }[];
  currency?: string;
  decimals?: number;
}

export interface SavedView {
  id: string;
  name: string;
  viewType: ViewType;
  spaceId?: string;
  listId?: string;
  isPinned: boolean;
  isPrivate: boolean;
  dashboardId?: string;
  createdAt: string;
}

export interface AIConfig {
  provider: 'gemini' | 'ollama';
  ollamaHost: string;
  ollamaModel: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface DashboardItem {
  id: string;
  type: 'stat' | 'bar' | 'pie' | 'priority' | 'time' | 'activity';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full'; // small=1 col, medium=2 col, large=3 col, full=all
  config?: any;
}

export interface Dashboard {
  id: string;
  name: string;
  spaceId?: string;
  listId?: string;
  items: DashboardItem[];
  isFavorite?: boolean;
  updatedAt: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  lastViewed?: string;
}

export * from './agent';

export interface Clip {
  id: string;
  name: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: string;
  createdAt: string;
  ownerId: string;
  ownerName: string;
  type: 'video' | 'voice';
  comments?: Comment[];
  transcript?: string;
}

export interface AppState {
  tasks: Task[];
  spaces: Space[];
  folders: Folder[];
  lists: List[];
  tags: Tag[];
  docs: Doc[];
  agents: Agent[];
  currentSpaceId: string;
  currentListId: string | null;
  currentView: ViewType;
  savedViews: SavedView[];
  columnSettings: Record<string, ColumnSetting[]>; // keyed by spaceId or listId
  theme: ThemeMode;
  accentColor: string;
  activeTimer: { taskId: string; startTime: string } | null;
  aiConfig: AIConfig;
  aiMessages: Message[];
  aiSessions: ChatSession[];
  dashboards: Dashboard[];
  currentDashboardId: string | null;
  clips: Clip[];
  notifications: Notification[];
  notificationSettings: NotificationSettings;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

export type NotificationType = 'due_soon' | 'overdue' | 'task_assigned' | 'task_completed' | 'comment_added' | 'mention';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  taskName?: string;
  isRead: boolean;
  createdAt: string;
  dueDate?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  dueSoonDays: number; // How many days before due date to notify
  browserNotifications: boolean;
  soundEnabled: boolean;
  notifyOnOverdue: boolean;
  notifyOnDueSoon: boolean;
  notifyOnAssignment: boolean;
}

// Ensure types are exported
