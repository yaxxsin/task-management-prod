import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import HomeView from './views/HomeView';
import ListView from './views/ListView';
import KanbanView from './views/KanbanView';
import CalendarView from './views/CalendarView';
import GanttView from './views/GanttView';
import TimesheetView from './views/TimesheetView';
import DashboardView from './views/DashboardView';
import DocsView from './views/DocsView';
import SpaceOverview from './views/SpaceOverview';
import ClipsView from './views/ClipsView';
import AgentsView from './views/AgentsView';
import InboxView from './views/InboxView';
import TaskModal from './components/TaskModal';
import TaskDetailModal from './components/TaskDetailModal';
import ReportModal from './components/ReportModal';
import AIModal from './components/AIModal';
import SettingsModal from './components/SettingsModal';
import { useAppStore } from './store/useAppStore';
import { useAuthStore } from './store/useAuthStore';
import { AuthModal } from './components/AuthModal';

function App() {
  const { currentView, theme, accentColor } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<string | undefined>(undefined);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  const [initialStartDate, setInitialStartDate] = useState<Date | undefined>(undefined);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [settingsState, setSettingsState] = useState<{ open: boolean; tab?: string }>({ open: false });

  const openSettings = (tab?: string) => {
    setSettingsState({ open: true, tab });
  };

  useEffect(() => {
    const root = window.document.documentElement;

    // Apply theme
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      root.setAttribute('data-theme', systemTheme);
    } else {
      root.classList.add(theme);
      root.setAttribute('data-theme', theme);
    }

    // Apply accent color
    root.style.setProperty('--primary', accentColor);
    root.style.setProperty('--primary-hover', accentColor + 'ee');
  }, [theme, accentColor]);

  // Check for due dates and sync shared data periodically
  useEffect(() => {
    const { checkDueDates, syncSharedData, refreshRooms } = useAppStore.getState();

    // Initial runs
    checkDueDates();
    syncSharedData();
    refreshRooms();

    // Watch spaces length for new shared spaces
    const unsubscribe = useAppStore.subscribe(
      (state) => {
        // We just trigger refresh on any state change that might affect spaces
        // setupSocket logic is idempotent for rooms anyway
        state.refreshRooms();
      }
    );

    // Check due dates every 5 minutes
    const dueInterval = setInterval(() => {
      checkDueDates();
    }, 5 * 60 * 1000);

    // Sync shared data every 30 seconds for real-time collaboration feel
    const syncInterval = setInterval(() => {
      syncSharedData();
    }, 30 * 1000);

    return () => {
      unsubscribe();
      clearInterval(dueInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const { isAuthenticated, user: currentUser } = useAuthStore();
  const { setupSocket } = useAppStore();

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setupSocket(currentUser.id);
    }
  }, [isAuthenticated, currentUser, setupSocket]);

  useEffect(() => {
    // Check if we have a token in local storage on mount (simple persistence handled by store middleware)
    // The persist middleware of zustand handles this automatically.
  }, []);


  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView onAddTask={() => setIsModalOpen(true)} onTaskClick={(id) => setSelectedTaskId(id)} />;
      case 'inbox':
        return <InboxView onTaskClick={(id) => setSelectedTaskId(id)} />;
      case 'timesheet':
        return <TimesheetView />;
      case 'dashboards':
        return <DashboardView />;
      case 'docs':
        return <DocsView />;
      case 'clips':
        return <ClipsView />;
      case 'space_overview':
        return <SpaceOverview />;
      case 'agents':
        return <AgentsView />;
      case 'kanban':
        return <KanbanView
          onAddTask={(status) => {
            setInitialStatus(status);
            setIsModalOpen(true);
          }}
          onTaskClick={(id) => setSelectedTaskId(id)}
        />;
      case 'calendar':
        return <CalendarView
          onAddTask={(start, end) => {
            if (end) {
              setInitialStartDate(start);
              setInitialDate(end);
            } else {
              setInitialStartDate(undefined);
              setInitialDate(start);
            }
            setIsModalOpen(true);
          }}
          onTaskClick={(id) => setSelectedTaskId(id)}
        />;
      case 'gantt':
        return <GanttView onAddTask={() => setIsModalOpen(true)} onTaskClick={(id) => setSelectedTaskId(id)} />;
      case 'table':
        return <ListView key="table" onAddTask={() => setIsModalOpen(true)} onTaskClick={(id) => setSelectedTaskId(id)} isTableMode={true} />;
      case 'list':
      default:
        return <ListView key="list" onAddTask={() => setIsModalOpen(true)} onTaskClick={(id) => setSelectedTaskId(id)} />;
    }
  };

  if (!isAuthenticated) {
    return <AuthModal isOpen={true} />;
  }

  return (
    <Layout
      onAddTask={() => setIsModalOpen(true)}
      onOpenReport={() => setIsReportOpen(true)}
      onOpenAI={() => setIsAIOpen(true)}
      onOpenSettings={openSettings}
      onTaskClick={setSelectedTaskId}
    >
      {renderView()}
      {isModalOpen && <TaskModal initialStatus={initialStatus} initialDate={initialDate} initialStartDate={initialStartDate} onClose={() => { setIsModalOpen(false); setInitialStatus(undefined); setInitialDate(undefined); setInitialStartDate(undefined); }} />}
      {selectedTaskId && <TaskDetailModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onTaskClick={(id) => setSelectedTaskId(id)} />}
      {isReportOpen && <ReportModal onClose={() => setIsReportOpen(false)} />}
      {isAIOpen && <AIModal onClose={() => setIsAIOpen(false)} onTaskClick={(id) => setSelectedTaskId(id)} />}
      {settingsState.open && (
        <SettingsModal
          onClose={() => setSettingsState({ open: false })}
          initialTab={settingsState.tab}
        />
      )}
    </Layout>
  );
}

export default App;
