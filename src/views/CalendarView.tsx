import React, { useState, useRef, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Search,
    Filter,
} from 'lucide-react';
import ViewHeader from '../components/ViewHeader';

import {
    DndContext,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import { useAppStore } from '../store/useAppStore';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    addDays,
    addWeeks,
    addHours,
    setHours,
    isToday,
    differenceInMinutes
} from 'date-fns';
import type { Task } from '../types';
import TaskOptionsMenu from '../components/TaskOptionsMenu';
import '../styles/CalendarView.css';
import '../styles/ListView.css';
import '../styles/TaskOptionsMenu.css';

interface CalendarViewProps {
    onAddTask: (startDate?: Date, dueDate?: Date) => void;
    onTaskClick: (taskId: string) => void;
}

interface DraggableTaskProps {
    task: Task;
    onTaskClick: (taskId: string) => void;
    onContextMenu: (taskId: string, trigger: HTMLElement) => void;
}

const DraggableCalendarTask: React.FC<DraggableTaskProps> = ({ task, onTaskClick, onContextMenu }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`calendar-task-tag ${task.status.toLowerCase().replace(' ', '-')} ${isDragging ? 'dragging' : ''}`}
            onClick={(e) => {
                e.stopPropagation();
                onTaskClick(task.id);
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu(task.id, e.currentTarget);
            }}
        >
            {task.name}
        </div>
    );
};

interface DroppableDayProps {
    day: Date;
    monthStart: Date;
    children: React.ReactNode;
    onClick?: () => void;
}

const DroppableCalendarDay: React.FC<DroppableDayProps> = ({ day, monthStart, children, onClick }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: day.toISOString(),
    });

    const className = `calendar-day ${!isSameMonth(day, monthStart) ? 'other-month' : ''} ${isToday(day) ? 'today' : ''} ${isOver ? 'drag-over' : ''}`;

    return (
        <div ref={setNodeRef} className={className} onClick={onClick}>
            <span className="day-number">{format(day, 'd')}</span>
            <div className="day-tasks">
                {children}
            </div>
        </div>
    );
};

type CalendarMode = 'day' | '4day' | 'week' | 'month';

// Helper to get time from Y
const getTimeFromY = (y: number, rect: DOMRect) => {
    const relativeY = y - rect.top;
    const percentage = relativeY / rect.height;
    // 24 hours * 60 mins = 1440
    const totalMinutes = 24 * 60;
    const minutes = Math.max(0, Math.min(totalMinutes, Math.floor(totalMinutes * percentage)));
    return minutes;
};

const DroppableTimeSlot: React.FC<{
    day: Date;
    hour: number;
    title?: string;
    children?: React.ReactNode;
}> = ({ day, hour, title, children }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `time-slot|${day.toISOString()}|${hour}`,
    });

    return (
        <div ref={setNodeRef} className={`time-slot ${isOver ? 'drag-over' : ''}`} title={title}>
            {children}
        </div>
    );
};

const DroppableTimeColumn: React.FC<{
    day: Date;
    currentTime: Date;
    tasks: Task[];
    onTaskClick: (taskId: string) => void;
    onAddTask: (startDate?: Date, dueDate?: Date) => void;
    onContextMenu: (taskId: string, trigger: HTMLElement) => void;
}> = ({ day, currentTime, tasks, onTaskClick, onAddTask, onContextMenu }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const { updateTask } = useAppStore();
    const { setNodeRef } = useDroppable({
        id: day.toISOString(),
    });
    const columnRef = useRef<HTMLDivElement>(null);

    // Local state to track resizing height temporarily for smooth UX
    const [resizingTask, setResizingTask] = useState<{ id: string, height: number } | null>(null);

    // Selection State
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectionStart, setSelectionStart] = useState<number | null>(null); // Minutes from midnight
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null); // Minutes from midnight

    // Refs to track selection values without re-binding listeners
    const selectionRef = useRef<{ start: number | null, end: number | null }>({ start: null, end: null });

    const getTimePosition = (date: Date) => {
        const mins = date.getHours() * 60 + date.getMinutes();
        return (mins / (24 * 60)) * 100;
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only trigger if clicking directly on the column/slots, not on a task
        if ((e.target as HTMLElement).closest('.calendar-task-tag')) return;
        if ((e.target as HTMLElement).closest('.draggable-task-wrapper')) return;
        if ((e.target as HTMLElement).closest('.resize-handle-bottom')) return;

        if (columnRef.current) {
            const rect = columnRef.current.getBoundingClientRect();
            const mins = getTimeFromY(e.clientY, rect);

            // Snap to 15 min
            const snapped = Math.floor(mins / 15) * 15;

            const start = snapped;
            const end = snapped + 30; // Default 30 min duration visual

            setSelectionStart(start);
            setSelectionEnd(end);
            selectionRef.current = { start, end };
            setIsSelecting(true);
        }
    };

    useEffect(() => {
        if (!isSelecting) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (columnRef.current && selectionRef.current.start !== null) {
                const rect = columnRef.current.getBoundingClientRect();
                const mins = getTimeFromY(e.clientY, rect);
                const snapped = Math.floor(mins / 15) * 15;

                setSelectionEnd(snapped);
                selectionRef.current.end = snapped;
            }
        };

        const handleMouseUp = () => {
            const { start, end } = selectionRef.current;

            if (start !== null && end !== null) {
                const startMins = Math.min(start, end);
                const endMins = Math.max(start, end);
                // Ensure at least 30 mins
                const duration = Math.max(30, endMins - startMins);
                const finalEndMins = startMins + duration;

                const startDate = new Date(day);
                startDate.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);

                const endDate = new Date(day);
                endDate.setHours(Math.floor(finalEndMins / 60), finalEndMins % 60, 0, 0);

                onAddTask(startDate, endDate);
            }
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionEnd(null);
            selectionRef.current = { start: null, end: null };
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isSelecting, day, onAddTask]);

    const handleResizeStart = (e: React.MouseEvent, taskId: string, initialHeight: number) => {
        e.preventDefault();
        e.stopPropagation();

        const startY = e.pageY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = moveEvent.pageY - startY;
            if (!columnRef.current) return;
            const colHeight = columnRef.current.offsetHeight;
            const deltaPercent = (deltaY / colHeight) * 100;
            const newHeight = Math.max(initialHeight + deltaPercent, (15 / (24 * 60)) * 100);
            setResizingTask({ id: taskId, height: newHeight });
        };

        const onMouseUp = (upEvent: MouseEvent) => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            const deltaY = upEvent.pageY - startY;
            let deltaMins = 0;
            if (columnRef.current) {
                const colHeight = columnRef.current.offsetHeight;
                deltaMins = Math.round((deltaY / colHeight) * (24 * 60));
            }

            const task = tasks.find(t => t.id === taskId);
            if (task) {
                const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate || '');
                const currentDuration = task.startDate && task.dueDate
                    ? differenceInMinutes(new Date(task.dueDate), new Date(task.startDate))
                    : 60;

                const newDuration = Math.max(currentDuration + deltaMins, 15);
                const newDueDate = new Date(start.getTime() + newDuration * 60000);

                updateTask(taskId, { dueDate: newDueDate.toISOString() });
            }

            setResizingTask(null);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <div
            ref={(node) => {
                setNodeRef(node);
                // @ts-ignore
                columnRef.current = node;
            }}
            className="time-column"
            onMouseDown={handleMouseDown}
        >
            {hours.map(hour => (
                <DroppableTimeSlot
                    key={hour}
                    day={day}
                    hour={hour}
                    title={format(setHours(day, hour), 'h a')}
                />
            ))}

            {/* Render Selection Box */}
            {isSelecting && selectionStart !== null && selectionEnd !== null && (
                <div
                    className="selection-draft-box"
                    style={{
                        top: `${(Math.min(selectionStart, selectionEnd) / 1440) * 100}%`,
                        height: `${(Math.max(30, Math.abs(selectionEnd - selectionStart)) / 1440) * 100}%`,
                        position: 'absolute',
                        width: '100%',
                        background: 'rgba(59, 130, 246, 0.2)',
                        borderLeft: '3px solid #3b82f6',
                        zIndex: 10,
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{ padding: '4px', fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                        New Task
                    </div>
                </div>
            )}

            {isToday(day) && (
                <div
                    className="current-time-line"
                    style={{ top: `${getTimePosition(currentTime)}%` }}
                >
                    <div className="current-time-dot"></div>
                </div>
            )}

            <div className="day-tasks-absolute">
                {tasks
                    .filter(t => {
                        if (!t.dueDate) return false;
                        const taskDate = new Date(t.dueDate);
                        // ONLY timed tasks here
                        const isTimed = t.dueDate.includes('T') || (t.startDate && t.startDate.includes('T'));
                        if (!isTimed) return false;

                        // Compare yyyy-MM-dd to be timezone-safe for daily columns
                        return format(taskDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                    })
                    .map(task => {
                        const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate || '');
                        const end = task.dueDate ? new Date(task.dueDate) : addHours(start, 1);

                        const top = getTimePosition(start);
                        let height = (differenceInMinutes(end, start) / (24 * 60)) * 100;

                        if (resizingTask && resizingTask.id === task.id) {
                            height = resizingTask.height;
                        }

                        return (
                            <div
                                key={task.id}
                                className="draggable-task-wrapper"
                                style={{
                                    position: 'absolute',
                                    top: `${top}%`,
                                    height: `${height}%`,
                                    width: '100%',
                                    zIndex: 5
                                }}
                            >
                                <DraggableCalendarTask
                                    task={task}
                                    onTaskClick={onTaskClick}
                                    onContextMenu={onContextMenu}
                                />
                                <div
                                    className="resize-handle-bottom"
                                    onMouseDown={(e) => handleResizeStart(e, task.id, height)}
                                />
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

const TimeGrid: React.FC<{
    days: Date[],
    tasks: Task[],
    onTaskClick: (taskId: string) => void;
    onAddTask: (startDate?: Date, dueDate?: Date) => void;
    onContextMenu: (taskId: string, trigger: HTMLElement) => void;
}> = ({ days, tasks, onTaskClick, onAddTask, onContextMenu }) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const [currentTime, setCurrentTime] = useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="time-grid-container">
            <div className="time-grid-header">
                <div className="time-gutter"></div>
                {days.map(day => (
                    <div key={day.toISOString()} className={`time-column-header ${isToday(day) ? 'today' : ''}`}>
                        <span className="day-name">{format(day, 'EEE')}</span>
                        <span className="day-number">{format(day, 'd')}</span>
                    </div>
                ))}
            </div>

            <div className="all-day-row">
                <div className="time-gutter">
                    <span className="all-day-label">all-day</span>
                </div>
                {days.map(day => (
                    <div key={day.toISOString()} className="all-day-column" onClick={() => onAddTask(day)}>
                        {tasks.filter(t => {
                            if (!t.dueDate) return false;
                            // All day if NO 'T' in dueDate AND NO 'T' in startDate
                            const isAllDay = !t.dueDate.includes('T') && (!t.startDate || !t.startDate.includes('T'));
                            return isAllDay && format(new Date(t.dueDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                        }).map(task => (
                            <DraggableCalendarTask
                                key={task.id}
                                task={task}
                                onTaskClick={onTaskClick}
                                onContextMenu={onContextMenu}
                            />
                        ))}
                    </div>
                ))}
            </div>

            <div className="time-grid-body">
                <div className="time-gutter">
                    {hours.map(hour => (
                        <div key={hour} className="time-label">
                            {format(setHours(new Date(), hour), 'ha')}
                        </div>
                    ))}
                </div>
                <div className="time-columns">
                    {hours.map(hour => (
                        <div key={hour} className="time-slot-row"></div>
                    ))}
                    {days.map(day => (
                        <DroppableTimeColumn
                            key={day.toISOString()}
                            day={day}
                            currentTime={currentTime}
                            tasks={tasks}
                            onTaskClick={onTaskClick}
                            onAddTask={onAddTask}
                            onContextMenu={onContextMenu}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const CalendarView: React.FC<CalendarViewProps> = ({ onAddTask, onTaskClick }) => {
    const {
        tasks,
        currentSpaceId,
        updateTask,
        duplicateTask,
        archiveTask,
        deleteTask,
    } = useAppStore();
    const [viewDate, setViewDate] = useState(new Date());
    const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
    const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
    const [menuTrigger, setMenuTrigger] = useState<HTMLElement | null>(null);

    const handleOpenMenu = (taskId: string, trigger: HTMLElement) => {
        setOpenMenuTaskId(taskId);
        setMenuTrigger(trigger);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const filteredTasks = tasks.filter(task =>
        currentSpaceId === 'everything' || task.spaceId === currentSpaceId
    );

    const getDays = () => {
        switch (calendarMode) {
            case 'day':
                return [viewDate];
            case '4day':
                return Array.from({ length: 4 }, (_, i) => addDays(viewDate, i));
            case 'week': {
                const start = startOfWeek(viewDate);
                return Array.from({ length: 7 }, (_, i) => addDays(start, i));
            }
            case 'month': {
                const monthStart = startOfMonth(viewDate);
                const monthEnd = endOfMonth(monthStart);
                const calendarStart = startOfWeek(monthStart);
                const calendarEnd = endOfWeek(monthEnd);
                return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
            }
        }
    };

    const days = getDays();
    const monthStart = startOfMonth(viewDate);

    const navigate = (direction: 'next' | 'prev') => {
        const factor = direction === 'next' ? 1 : -1;
        switch (calendarMode) {
            case 'day':
                setViewDate(addDays(viewDate, factor));
                break;
            case '4day':
                setViewDate(addDays(viewDate, factor * 4));
                break;
            case 'week':
                setViewDate(addWeeks(viewDate, factor));
                break;
            case 'month':
                setViewDate(direction === 'next' ? addMonths(viewDate, 1) : subMonths(viewDate, 1));
                break;
        }
    };

    const goToToday = () => setViewDate(new Date());

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id as string;
        const overId = over.id as string;

        console.log(`Dragging task ${taskId} over ${overId}`);

        if (overId.startsWith('time-slot|')) {
            const parts = overId.split('|');
            const dateIso = parts[1];
            const hour = parseInt(parts[2]);

            const startDate = new Date(dateIso);
            if (!isNaN(startDate.getTime())) {
                startDate.setHours(hour, 0, 0, 0);
                const dueDate = addHours(startDate, 1);
                updateTask(taskId, {
                    startDate: startDate.toISOString(),
                    dueDate: dueDate.toISOString()
                });
            }
        } else {
            // Drop on whole day
            try {
                const parsedDate = new Date(overId);
                if (!isNaN(parsedDate.getTime())) {
                    // Set to local midnight for "all day" task
                    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
                    updateTask(taskId, {
                        dueDate: formattedDate,
                        startDate: undefined
                    });
                }
            } catch (e) {
                console.error("Failed to parse drop date", overId);
            }
        }
    };

    const getTitle = () => {
        if (calendarMode === 'month') return format(viewDate, 'MMMM yyyy');
        if (calendarMode === 'day') return format(viewDate, 'MMMM d, yyyy');
        const start = days[0];
        const end = days[days.length - 1];
        if (isSameMonth(start, end)) {
            return `${format(start, 'MMMM')} ${format(start, 'd')} - ${format(end, 'd')}, ${format(start, 'yyyy')}`;
        }
        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    };



    return (
        <div className="view-container calendar-view">
            <ViewHeader />

            <div className="toolbar">
                <div className="toolbar-left">
                    <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={goToToday}>Today</button>
                    <div className="calendar-nav">
                        <button className="icon-btn-ghost" onClick={() => navigate('prev')}><ChevronLeft size={18} /></button>
                        <h2 className="current-month">{getTitle()}</h2>
                        <button className="icon-btn-ghost" onClick={() => navigate('next')}><ChevronRight size={18} /></button>
                    </div>
                    <div className="toolbar-divider"></div>
                    <div className="calendar-mode-switcher">
                        <button className={`mode-btn ${calendarMode === 'day' ? 'active' : ''}`} onClick={() => setCalendarMode('day')}>Day</button>
                        <button className={`mode-btn ${calendarMode === '4day' ? 'active' : ''}`} onClick={() => setCalendarMode('4day')}>4 Days</button>
                        <button className={`mode-btn ${calendarMode === 'week' ? 'active' : ''}`} onClick={() => setCalendarMode('week')}>Week</button>
                        <button className={`mode-btn ${calendarMode === 'month' ? 'active' : ''}`} onClick={() => setCalendarMode('month')}>Month</button>
                    </div>
                    <div className="toolbar-divider"></div>
                    <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}><Filter size={14} /> Filter</button>
                </div>
                <div className="toolbar-right">
                    <div className="toolbar-search">
                        <Search size={14} />
                        <input type="text" placeholder="Search tasks..." readOnly />
                    </div>
                    <button className="btn-primary" onClick={() => onAddTask()} style={{ padding: '8px 16px' }}>
                        <Plus size={16} /> Add Task
                    </button>
                </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                {calendarMode === 'month' ? (
                    <div className="calendar-grid">
                        <div className="weekdays-header">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="weekday">{day}</div>
                            ))}
                        </div>
                        <div className="days-grid">
                            {days.map(day => {
                                const dayTasks = filteredTasks.filter(task => {
                                    if (!task.dueDate) return false;
                                    const taskDate = new Date(task.dueDate);
                                    return format(taskDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                                });

                                return (
                                    <DroppableCalendarDay key={day.toISOString()} day={day} monthStart={monthStart} onClick={() => onAddTask(day)}>
                                        {dayTasks.map(task => (
                                            <DraggableCalendarTask
                                                key={task.id}
                                                task={task}
                                                onTaskClick={onTaskClick}
                                                onContextMenu={handleOpenMenu}
                                            />
                                        ))}
                                    </DroppableCalendarDay>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <TimeGrid
                        days={days}
                        tasks={filteredTasks}
                        onTaskClick={onTaskClick}
                        onAddTask={onAddTask}
                        onContextMenu={handleOpenMenu}
                    />
                )}
            </DndContext>

            {openMenuTaskId && (
                <TaskOptionsMenu
                    taskId={openMenuTaskId}
                    onClose={() => setOpenMenuTaskId(null)}
                    onRename={() => { onTaskClick(openMenuTaskId); setOpenMenuTaskId(null); }}
                    onDuplicate={() => duplicateTask(openMenuTaskId)}
                    onArchive={() => archiveTask(openMenuTaskId)}
                    onDelete={() => deleteTask(openMenuTaskId)}
                    onConvertToDoc={() => { }}
                    triggerElement={menuTrigger}
                />
            )}
        </div>
    );
};

export default CalendarView;
