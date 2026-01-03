import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

export interface ContextMenuItem {
    label?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
    divider?: boolean;
    className?: string;
    rightContent?: React.ReactNode;
    subItems?: ContextMenuItem[];
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
    level?: number; // For recursive styling/logic if needed
    anchorRect?: DOMRect;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose, level = 0, anchorRect }) => {
    const [position, setPosition] = useState({ x, y });
    const [activeSubMenu, setActiveSubMenu] = useState<{ index: number; rect: DOMRect } | null>(null);
    const menuRef = React.useRef<HTMLDivElement>(null);
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (menu) {
            const rect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const PADDING = 10;

            let newX = x;
            let newY = y;

            // Check if we need to flip horizontally
            if (x + rect.width > viewportWidth - PADDING) {
                if (anchorRect) {
                    newX = anchorRect.left - rect.width - 2;
                } else {
                    newX = x - rect.width;
                }
            }

            // Check if we need to flip vertically
            if (y + rect.height > viewportHeight - PADDING) {
                newY = y - rect.height;
            }

            // Clamp to viewport boundaries with padding
            const maxX = viewportWidth - rect.width - PADDING;
            const maxY = viewportHeight - rect.height - PADDING;

            // Ensure not off-screen to the right/bottom
            // We use Math.max(PADDING, ...) to ensure if menu is bigger than screen, top-left is prioritized
            newX = Math.min(newX, Math.max(PADDING, maxX));
            newX = Math.max(PADDING, newX);

            newY = Math.min(newY, Math.max(PADDING, maxY));
            newY = Math.max(PADDING, newY);

            setPosition({ x: newX, y: newY });
        }
    }, [x, y, items, level, anchorRect]);

    return ReactDOM.createPortal(
        <div
            ref={menuRef}
            className={`context-menu level-${level}`}
            style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                zIndex: 9999 + level,
                background: 'var(--bg-surface)',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                padding: '4px',
                minWidth: '220px',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    {item.divider ? (
                        <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                    ) : (
                        <>
                            <button
                                ref={el => { itemRefs.current[index] = el; }}
                                className={item.className}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.subItems) {
                                        // Maybe toggle on click? For now hover is primary
                                    } else if (item.onClick) {
                                        item.onClick();
                                        onClose();
                                    }
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: activeSubMenu?.index === index ? 'var(--bg-hover)' : 'transparent',
                                    color: item.danger ? 'var(--error)' : 'var(--text-main)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'background 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'var(--bg-hover)';
                                    if (item.subItems) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setActiveSubMenu({ index, rect });
                                    } else {
                                        setActiveSubMenu(null);
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (activeSubMenu?.index !== index) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {item.icon}
                                    {item.label}
                                </div>
                                {item.rightContent}
                                {item.subItems && (
                                    <div style={{ marginLeft: 'auto' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    </div>
                                )}
                            </button>
                            {item.subItems && activeSubMenu?.index === index && (
                                <ContextMenu
                                    key={`submenu-${index}`}
                                    x={activeSubMenu.rect.right + 2} // Slight gap
                                    y={activeSubMenu.rect.top}
                                    items={item.subItems}
                                    onClose={onClose}
                                    level={level + 1}
                                    anchorRect={activeSubMenu.rect}
                                />
                            )}
                        </>
                    )}
                </React.Fragment>
            ))}
        </div>,
        document.body
    );
};

export const useContextMenu = () => {
    const [state, setState] = useState<{
        visible: boolean;
        x: number;
        y: number;
        items: ContextMenuItem[];
    }>({
        visible: false,
        x: 0,
        y: 0,
        items: [],
    });

    const showContextMenu = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        setState({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            items,
        });
    }, []);

    const hideContextMenu = useCallback(() => {
        setState((prev) => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        if (state.visible) {
            window.addEventListener('click', hideContextMenu);
            window.addEventListener('scroll', hideContextMenu);
            return () => {
                window.removeEventListener('click', hideContextMenu);
                window.removeEventListener('scroll', hideContextMenu);
            };
        }
    }, [state.visible, hideContextMenu]);

    return {
        showContextMenu,
        hideContextMenu,
        contextMenuProps: state,
    };
};

export default ContextMenu;
