import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft } from 'lucide-react';
import '../styles/TimePicker.css';

interface TimePickerProps {
    onSelect: (time: string) => void;
    onClose: () => void;
    triggerElement?: HTMLElement | null;
}

const TimePicker: React.FC<TimePickerProps> = ({ onSelect, onClose, triggerElement }) => {
    const [search, setSearch] = useState('');
    const listRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

    useLayoutEffect(() => {
        if (!listRef.current) return;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const pickerWidth = 220; // Default width

        if (triggerElement) {
            const rect = triggerElement.getBoundingClientRect();
            const pickerHeight = listRef.current.offsetHeight;

            const newStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 10001,
                width: `${pickerWidth}px`,
                visibility: 'visible'
            };

            // Horizontal positioning
            let left = rect.left;
            if (left + pickerWidth > viewportWidth - 10) left = viewportWidth - pickerWidth - 10;
            if (left < 10) left = 10;
            newStyle.left = `${left}px`;

            // Vertical positioning
            if (rect.bottom + pickerHeight + 10 > viewportHeight && rect.top > pickerHeight + 10) {
                newStyle.bottom = `${viewportHeight - rect.top + 8}px`;
                newStyle.top = 'auto';
            } else {
                newStyle.top = `${rect.bottom + 8}px`;
            }

            setStyle(newStyle);
        } else {
            const rect = listRef.current.getBoundingClientRect();
            const newStyle: React.CSSProperties = { visibility: 'visible' };

            // Vertical adjustment
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
    }, [triggerElement, search]);

    const generateTimes = () => {
        const times = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const hour = h % 12 || 12;
                const ampm = h < 12 ? 'am' : 'pm';
                const minute = m.toString().padStart(2, '0');
                times.push(`${hour}:${minute} ${ampm}`);
            }
        }
        return times;
    };

    const allTimes = generateTimes();
    const filteredTimes = allTimes.filter(t => t.toLowerCase().includes(search.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (listRef.current && !listRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const content = (
        <div className="time-picker-popover" ref={listRef} style={style}>
            <div className="time-picker-search">
                <input
                    autoFocus
                    placeholder="Search time..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && filteredTimes.length > 0) {
                            onSelect(filteredTimes[0]);
                        }
                    }}
                />
                <div className="enter-indicator">
                    <span>Enter</span>
                    <CornerDownLeft size={12} />
                </div>
            </div>
            <div className="time-picker-list">
                {filteredTimes.map((time, idx) => (
                    <div
                        key={idx}
                        className="time-item"
                        onClick={() => onSelect(time)}
                    >
                        {time}
                    </div>
                ))}
            </div>
        </div>
    );

    return triggerElement ? createPortal(content, document.body) : content;
};

export default TimePicker;
