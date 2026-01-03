import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    startOfWeek,
    endOfWeek,
    addDays,
    addWeeks
} from 'date-fns';
import '../styles/DatePicker.css';

interface DatePickerProps {
    initialDate?: Date;
    onSelect: (date: Date | null) => void;
    onClose: () => void;
    triggerElement?: HTMLElement | null;
}

const DatePicker: React.FC<DatePickerProps> = ({ initialDate, onSelect, onClose, triggerElement }) => {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const [currentMonth, setCurrentMonth] = useState(initialDate || new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate || null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

    useLayoutEffect(() => {
        if (!pickerRef.current) return;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        if (triggerElement) {
            const rect = triggerElement.getBoundingClientRect();
            const pickerHeight = pickerRef.current.offsetHeight;
            const pickerWidth = pickerRef.current.offsetWidth;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 10001,
                visibility: 'visible'
            };

            // Horizontal positioning
            let left = rect.left;
            if (left + pickerWidth > viewportWidth - 10) {
                left = viewportWidth - pickerWidth - 10;
            }
            if (left < 10) left = 10;
            newStyle.left = `${left}px`;

            // Vertical positioning
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow >= pickerHeight + 10) {
                // Fits below
                newStyle.top = `${rect.bottom + 8}px`;
            } else if (spaceAbove >= pickerHeight + 10) {
                // Fits above
                newStyle.bottom = `${viewportHeight - rect.top + 8}px`;
                newStyle.top = 'auto';
            } else {
                // Doesn't fit perfectly either way, clamp to bottom edge
                newStyle.bottom = '10px';
                newStyle.top = 'auto';
            }

            setStyle(newStyle);
        } else {
            const rect = pickerRef.current.getBoundingClientRect();
            const newStyle: React.CSSProperties = { visibility: 'visible' };

            // Vertical adjustment for inline usage (removed most of this logic as we use portal mostly now)
            if (rect.bottom > viewportHeight) {
                newStyle.top = 'auto';
                newStyle.bottom = '100%';
                newStyle.marginTop = '0';
                newStyle.marginBottom = '8px';
            }
            // Horizontal adjustment
            if (rect.right > viewportWidth) {
                newStyle.right = '0';
                newStyle.left = 'auto';
            } else if (rect.left < 0) {
                newStyle.left = '0';
                newStyle.right = 'auto';
            }
            setStyle(newStyle);
        }
    }, [triggerElement, currentMonth]);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart); // Default starts on Sunday
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const handleToday = () => {
        const today = new Date();
        setCurrentMonth(today);
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
        onSelect(date);
    };

    const handleQuickSelect = (option: string) => {
        const today = new Date();
        let targetDate = today;

        switch (option) {
            case 'Today':
                targetDate = today;
                break;
            case 'Later':
                targetDate = addWeeks(today, 1);
                break;
            case 'Tomorrow':
                targetDate = addDays(today, 1);
                break;
            case 'Next week':
                const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 });
                targetDate = nextWeekStart;
                break;
            case 'Next weekend':
                const nextSat = addDays(today, (6 - today.getDay() + 7) % 7 || 7);
                targetDate = nextSat;
                break;
            case '2 weeks':
                targetDate = addWeeks(today, 2);
                break;
            case '4 weeks':
                targetDate = addWeeks(today, 4);
                break;
            case '8 weeks':
                targetDate = addWeeks(today, 8);
                break;
            default:
                break;
        }
        setSelectedDate(targetDate);
        onSelect(targetDate);
    };

    const content = (
        <div className="date-picker-container" ref={pickerRef} style={style} onClick={e => e.stopPropagation()}>
            <div className="date-picker-sidebar">
                <div className="sidebar-section">
                    <div className="sidebar-item" onClick={() => handleQuickSelect('Today')}>
                        <span>Today</span>
                        <span className="sidebar-meta">{format(new Date(), 'EEE')}</span>
                    </div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('Later')}>
                        <span>Later</span>
                        <span className="sidebar-meta">12:00 pm</span>
                    </div>
                    <div className="sidebar-divider"></div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('Tomorrow')}>
                        <span>Tomorrow</span>
                        <span className="sidebar-meta">{format(addDays(new Date(), 1), 'EEE')}</span>
                    </div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('Next week')}>
                        <span>Next week</span>
                        <span className="sidebar-meta">Mon</span>
                    </div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('Next weekend')}>
                        <span>Next weekend</span>
                        <span className="sidebar-meta">Sat</span>
                    </div>
                    <div className="sidebar-divider"></div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('2 weeks')}>
                        <span>2 weeks</span>
                        <span className="sidebar-meta">{format(addWeeks(new Date(), 2), 'd MMM')}</span>
                    </div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('4 weeks')}>
                        <span>4 weeks</span>
                        <span className="sidebar-meta">{format(addWeeks(new Date(), 4), 'd MMM')}</span>
                    </div>
                    <div className="sidebar-item" onClick={() => handleQuickSelect('8 weeks')}>
                        <span>8 weeks</span>
                        <span className="sidebar-meta">{format(addWeeks(new Date(), 8), 'd MMM')}</span>
                    </div>
                </div>

                <div className="sidebar-footer" onClick={() => alert('Recurring feature coming soon!')}>
                    <RefreshCw size={14} className="recurring-icon" />
                    <span>Set Recurring</span>
                    <ChevronRight size={14} className="chevron-right" />
                </div>
            </div>

            <div className="date-picker-main">
                <div className="calendar-header">
                    <span className="current-month-label">{format(currentMonth, 'MMMM yyyy')}</span>
                    <div className="calendar-controls">
                        <button className="today-btn" onClick={handleToday}>Today</button>
                        <button className="nav-btn" onClick={handlePrevMonth}><ChevronLeft size={16} /></button>
                        <button className="nav-btn" onClick={handleNextMonth}><ChevronRight size={16} /></button>
                    </div>
                </div>

                <div className="calendar-grid">
                    <div className="week-days-row">
                        {weekDays.map(day => (
                            <div key={day} className="week-day-cell">{day}</div>
                        ))}
                    </div>
                    <div className="days-grid">
                        {calendarDays.map(day => {
                            const isCurrentMonth = isSameMonth(day, monthStart);
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const isTodayDate = isToday(day);

                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`day-cell ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isTodayDate ? 'is-today' : ''}`}
                                    onClick={() => handleDateClick(day)}
                                >
                                    {format(day, 'd')}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="date-picker-cleanup">
                    <button className="clear-date-btn" onClick={() => onSelect(null)}>Clear</button>
                    <button className="clear-date-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>Close</button>
                </div>
            </div>
        </div>
    );

    return triggerElement ? createPortal(content, document.body) : content;
};

export default DatePicker;
