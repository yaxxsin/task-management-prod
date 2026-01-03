import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    History,
    MoreHorizontal,
    X
} from 'lucide-react';
import {
    format,
    addDays,
    addWeeks,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths
} from 'date-fns';
import TimePicker from './TimePicker';
import '../styles/PremiumDatePicker.css';

interface PremiumDatePickerProps {
    startDate?: string;
    dueDate?: string;
    onSave: (dates: { startDate?: string; dueDate?: string }) => void;
    onClose: () => void;
    triggerElement?: HTMLElement | null;
}

type PickerView = 'quick' | 'recurring';

const PremiumDatePicker: React.FC<PremiumDatePickerProps> = ({ startDate, dueDate, onSave, onClose, triggerElement }) => {
    const [view, setView] = useState<PickerView>('quick');
    const [tempStart, setTempStart] = useState(startDate);
    const [tempDue, setTempDue] = useState(dueDate);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [activeInput, setActiveInput] = useState<'start' | 'due'>(dueDate ? 'due' : 'start');
    const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'due' | null>(null);
    const [startInputRef, setStartInputRef] = useState<HTMLSpanElement | null>(null);
    const [dueInputRef, setDueInputRef] = useState<HTMLSpanElement | null>(null);

    const pickerRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

    useLayoutEffect(() => {
        if (!pickerRef.current) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const pickerWidth = pickerRef.current.offsetWidth || 580; // Match CSS width
        const pickerHeight = pickerRef.current.offsetHeight || 380; // Approximate height

        if (triggerElement) {
            const rect = triggerElement.getBoundingClientRect();

            // Dimensions
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            const idealHeight = pickerHeight; // approx 380-400px

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 10001,
                visibility: 'visible',
                maxWidth: '95vw',
                width: pickerWidth,
            };

            // Vertical Positioning Logic
            // 1. Try Below
            if (spaceBelow >= idealHeight + 10) {
                newStyle.top = rect.bottom + 5;
                newStyle.bottom = 'auto';
                newStyle.maxHeight = spaceBelow - 20;
            }
            // 2. Try Above
            else if (spaceAbove >= idealHeight + 10) {
                newStyle.bottom = viewportHeight - rect.top + 5;
                newStyle.top = 'auto';
                newStyle.maxHeight = spaceAbove - 20;
            }
            // 3. Constrained: Pick side with MORE space
            else {
                if (spaceBelow > spaceAbove) {
                    newStyle.top = rect.bottom + 5;
                    newStyle.bottom = 'auto';
                    newStyle.maxHeight = spaceBelow - 20;
                } else {
                    newStyle.bottom = viewportHeight - rect.top + 5;
                    newStyle.top = 'auto';
                    newStyle.maxHeight = spaceAbove - 20;
                }
            }

            // Horizontal positioning
            if (rect.left + pickerWidth > viewportWidth - 20) {
                // If aligning right to trigger works (trigger is wide enough or close to right edge)
                if (rect.right >= pickerWidth) {
                    newStyle.right = viewportWidth - rect.right;
                    newStyle.left = 'auto';
                } else {
                    // Force stick to right edge
                    newStyle.right = 10;
                    newStyle.left = 'auto';
                }
            } else {
                newStyle.left = rect.left;
                newStyle.right = 'auto';
            }

            setStyle(newStyle);
        } else {
            setStyle({
                position: 'absolute',
                top: '100%',
                left: 0,
                zIndex: 1000,
                marginTop: '8px',
                visibility: 'visible'
            });
        }
    }, [triggerElement, view, currentMonth]); // Re-calc on view change (height might change)

    const formatDisplay = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (dateStr.includes('T')) {
            return format(date, 'M/d/yy h:mm a');
        }
        return format(date, 'M/d/yy');
    };

    const handleTimeSelect = (timeStr: string) => {
        if (!timePickerTarget) return;

        const targetDateStr = timePickerTarget === 'start' ? tempStart : tempDue;
        const date = targetDateStr ? new Date(targetDateStr) : new Date();

        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;

        date.setHours(hours, minutes, 0, 0);

        if (timePickerTarget === 'start') {
            setTempStart(date.toISOString());
        } else {
            setTempDue(date.toISOString());
        }
        setTimePickerTarget(null);
    };

    const handleClearDate = (type: 'start' | 'due') => {
        if (type === 'start') {
            setTempStart(undefined);
        } else {
            setTempDue(undefined);
        }
    };

    const handleClearTime = (type: 'start' | 'due') => {
        if (type === 'start' && tempStart) {
            setTempStart(tempStart.split('T')[0]);
        } else if (type === 'due' && tempDue) {
            setTempDue(tempDue.split('T')[0]);
        }
    };

    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateCal = startOfWeek(monthStart);
    const endDateCal = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDateCal,
        end: endDateCal,
    });

    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<Date | null>(null);

    // Store original times to preserve them during drag
    const activeTimes = useRef<{ start?: string, due?: string }>({});

    // Helper to apply time from an ISO string to a new Date
    const applyTime = (targetDate: Date, sourceIso?: string) => {
        if (sourceIso && sourceIso.includes('T')) {
            const old = new Date(sourceIso);
            const copy = new Date(targetDate);
            copy.setHours(old.getHours(), old.getMinutes(), 0, 0);
            return copy.toISOString();
        }
        return format(targetDate, 'yyyy-MM-dd');
    };

    const handleMouseDown = (day: Date) => {
        setIsDragging(true);

        // Start new selection if:
        // 1. We have both start and due dates
        // 2. We are focused on start input
        // 3. We don't have a start date yet
        if ((tempStart && tempDue) || activeInput === 'start' || !tempStart) {
            // Capture times before resetting
            activeTimes.current = {
                start: tempStart,
                due: tempDue
            };

            setDragStart(day);
            setTempStart(applyTime(day, tempStart));
            setTempDue(undefined);
            setActiveInput('due');
        } else {
            // We have a start date and are selecting due date
            // Use existing start as anchor
            const anchor = new Date(tempStart);
            setDragStart(anchor);

            // Allow preserving time even if we are appending to an existing start
            if (!activeTimes.current.start) {
                activeTimes.current = {
                    start: tempStart,
                    due: tempDue
                };
            }

            const startTime = activeTimes.current.start;
            const dueTime = activeTimes.current.due || startTime;

            if (day < anchor) {
                setTempStart(applyTime(day, startTime));
                setTempDue(applyTime(anchor, dueTime));
            } else {
                setTempDue(applyTime(day, dueTime));
            }
        }
    };

    const handleMouseEnter = (day: Date) => {
        if (isDragging && dragStart) {
            const startTime = activeTimes.current.start;
            const dueTime = activeTimes.current.due || startTime;

            if (day < dragStart) {
                setTempStart(applyTime(day, startTime));
                setTempDue(applyTime(dragStart, dueTime));
            } else {
                setTempStart(applyTime(dragStart, startTime));
                setTempDue(applyTime(day, dueTime));
            }
        }
    };



    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
    };

    const handleQuickSelect = (day: Date) => {


        if (activeInput === 'start') {
            setTempStart(applyTime(day, tempStart));
            setActiveInput('due');
        } else {
            setTempDue(applyTime(day, tempDue));
        }
    };

    const quickOptions = [
        { label: 'Today', value: new Date(), sub: 'Sun' },
        { label: 'Later', value: addDays(new Date(), 1), sub: '12:12 pm' },
        { label: 'Tomorrow', value: addDays(new Date(), 1), sub: 'Mon' },
        { label: 'Next week', value: addWeeks(new Date(), 1), sub: 'Mon' },
        { label: 'Next weekend', value: addDays(startOfWeek(addWeeks(new Date(), 1)), 6), sub: 'Sat' },
        { label: '2 weeks', value: addWeeks(new Date(), 2), sub: '11 Jan' },
        { label: '4 weeks', value: addWeeks(new Date(), 4), sub: '25 Jan' },
        { label: '8 weeks', value: addWeeks(new Date(), 8), sub: '22 Feb' },
    ];

    const isBetween = (day: Date) => {
        if (!tempStart || !tempDue) return false;
        const start = new Date(tempStart);
        const end = new Date(tempDue);
        return day > start && day < end;
    };

    const content = (
        <div ref={pickerRef} style={style} className="premium-datepicker" onClick={(e) => e.stopPropagation()}>
            <div className="picker-header-inputs">
                <div
                    className={`date-input-field ${activeInput === 'start' ? 'active' : ''}`}
                    onClick={() => setActiveInput('start')}
                >
                    <CalendarIcon size={14} />
                    <div className="input-group-premium">
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                placeholder="Start date"
                                value={formatDisplay(tempStart)}
                                readOnly
                                style={{ paddingRight: tempStart ? '24px' : '0' }}
                            />
                            {tempStart && (
                                <button
                                    className="icon-btn-ghost"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearDate('start');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        height: '24px',
                                        width: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-tertiary)'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        {tempStart && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <span className="sub-action" ref={setStartInputRef} onClick={(e) => {
                                        e.stopPropagation();
                                        setTimePickerTarget('start');
                                    }}>
                                        {tempStart.includes('T') ? 'Change time' : 'Add time'}
                                    </span>
                                    {timePickerTarget === 'start' && (
                                        <TimePicker
                                            onSelect={handleTimeSelect}
                                            onClose={() => setTimePickerTarget(null)}
                                            triggerElement={startInputRef}
                                        />
                                    )}
                                </div>
                                {tempStart.includes('T') && (
                                    <button
                                        className="icon-btn-ghost"
                                        title="Remove time"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearTime('start');
                                        }}
                                        style={{ height: '16px', width: '16px', padding: 0 }}
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div
                    className={`date-input-field ${activeInput === 'due' ? 'active' : ''}`}
                    onClick={() => setActiveInput('due')}
                >
                    <CalendarIcon size={14} />
                    <div className="input-group-premium">
                        <div style={{ position: 'relative', width: '100%' }}>
                            <input
                                placeholder="Due date"
                                value={formatDisplay(tempDue)}
                                readOnly
                                style={{ paddingRight: tempDue ? '24px' : '0' }}
                            />
                            {tempDue && (
                                <button
                                    className="icon-btn-ghost"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClearDate('due');
                                    }}
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        height: '24px',
                                        width: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-tertiary)'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                        {tempDue && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <span className="sub-action" ref={setDueInputRef} onClick={(e) => {
                                        e.stopPropagation();
                                        setTimePickerTarget('due');
                                    }}>
                                        {tempDue.includes('T') ? 'Change time' : 'Add time'}
                                    </span>
                                    {timePickerTarget === 'due' && (
                                        <TimePicker
                                            onSelect={handleTimeSelect}
                                            onClose={() => setTimePickerTarget(null)}
                                            triggerElement={dueInputRef}
                                        />
                                    )}
                                </div>
                                {tempDue.includes('T') && (
                                    <button
                                        className="icon-btn-ghost"
                                        title="Remove time"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearTime('due');
                                        }}
                                        style={{ height: '16px', width: '16px', padding: 0 }}
                                    >
                                        <X size={10} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="picker-body">
                <div className="picker-sidebar">
                    {view === 'quick' ? (
                        <>
                            <div className="quick-options-list">
                                {quickOptions.map((opt, i) => (
                                    <div key={i} className="quick-opt-item" onClick={() => handleQuickSelect(opt.value)}>
                                        <span className="opt-label">{opt.label}</span>
                                        <span className="opt-sub">{opt.sub}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="sidebar-footer-btn" onClick={() => setView('recurring')}>
                                <span>Set Recurring</span>
                                <ChevronRight size={16} />
                            </div>
                        </>
                    ) : (
                        <div className="recurring-config">
                            <div className="rec-header">
                                <span>Recurring</span>
                                <div className="rec-icons">
                                    <History size={14} />
                                    <MoreHorizontal size={14} />
                                </div>
                            </div>

                            <div className="rec-select-group">
                                <div className="rec-select">
                                    <span>Weekly</span>
                                    <ChevronDown size={14} />
                                </div>
                                <div className="rec-select">
                                    <span>On status change: Completed</span>
                                    <ChevronDown size={14} />
                                </div>
                            </div>

                            <div className="rec-checkboxes">
                                <label className="rec-check-item">
                                    <input type="checkbox" />
                                    <span>Create new task</span>
                                </label>
                                <label className="rec-check-item">
                                    <input type="checkbox" defaultChecked />
                                    <span>Recur forever</span>
                                </label>
                                <label className="rec-check-item">
                                    <input type="checkbox" />
                                    <span>Update status to:</span>
                                </label>
                            </div>

                            <div className="rec-status-picker">
                                <div className="status-dot-gray"></div>
                                <span>BACKLOG</span>
                                <ChevronDown size={14} />
                            </div>

                            <div className="rec-footer-actions">
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setView('quick')}>Cancel</button>
                                <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={() => onSave({ startDate: tempStart, dueDate: tempDue })}>Save</button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="picker-calendar">
                    <div className="cal-header">
                        <span className="month-label">{format(currentMonth, 'MMMM yyyy')}</span>
                        <div className="cal-nav">
                            <span className="today-btn" onClick={() => setCurrentMonth(new Date())}>Today</span>
                            <button className="icon-btn-ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={16} /></button>
                            <button className="icon-btn-ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    <div className="cal-grid-header">
                        {days.map(d => <div key={d}>{d}</div>)}
                    </div>

                    <div className="cal-days-grid" onMouseLeave={() => setIsDragging(false)}>
                        {calendarDays.map((day, i) => {
                            const isSelect = (tempStart && isSameDay(day, new Date(tempStart))) ||
                                (tempDue && isSameDay(day, new Date(tempDue)));
                            const isToday = isSameDay(day, new Date());
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const inRange = isBetween(day);

                            return (
                                <div
                                    key={i}
                                    className={`cal-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelect ? 'selected' : ''} ${isToday ? 'today' : ''} ${inRange ? 'in-range' : ''}`}
                                    onMouseDown={() => handleMouseDown(day)}
                                    onMouseEnter={() => handleMouseEnter(day)}
                                    onMouseUp={handleMouseUp}
                                    onClick={() => {
                                        // Prevent default click if we generated a range
                                        // But if it was a simple click (start == end or prompt quick click), handle it.
                                        // Actually reusing logic: MouseUp handles end of drag.
                                        // Simple click is mousedown + mouseup on same day.
                                    }}
                                >
                                    {format(day, 'd')}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {view === 'quick' && (
                <div className="picker-global-footer">
                    <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn-primary" onClick={() => onSave({ startDate: tempStart, dueDate: tempDue })}>Save dates</button>
                </div>
            )}
        </div>
    );

    if (triggerElement) {
        return createPortal(
            <>
                <div className="datepicker-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 10000 }} onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }} />
                {content}
            </>,
            document.body
        );
    }

    return content;
};

export default PremiumDatePicker;
