import React from 'react';
import '../styles/Layout.css';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
    onAddTask: () => void;
    onOpenReport: () => void;
    onOpenAI: () => void;
    onOpenSettings: (tab?: string) => void;
    onTaskClick?: (taskId: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onAddTask, onOpenReport, onOpenAI, onOpenSettings, onTaskClick }) => {
    return (
        <div className="app-container">
            <Header
                onAddTask={onAddTask}
                onOpenReport={onOpenReport}
                onOpenAI={onOpenAI}
                onOpenSettings={onOpenSettings}
                onTaskClick={onTaskClick}
            />
            <div className="main-layout">
                <Sidebar />
                <main className="content-area">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
