import React from 'react';
import { AlertTriangle } from 'lucide-react';
import '../styles/ConfirmDialog.css';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    danger = false
}) => {
    const handleConfirm = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onConfirm();
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onCancel();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        // Only close if clicking directly on the overlay, not on children
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    return (
        <>
            <div className="confirm-overlay" onClick={handleOverlayClick}>
                <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
                    <div className="confirm-header">
                        {danger && <AlertTriangle size={24} className="confirm-icon-danger" />}
                        <h3>{title}</h3>
                    </div>
                    <div className="confirm-body">
                        <p>{message}</p>
                    </div>
                    <div className="confirm-footer">
                        <button className="confirm-btn confirm-btn-cancel" onClick={handleCancel}>
                            {cancelLabel}
                        </button>
                        <button
                            className={`confirm-btn confirm-btn-confirm ${danger ? 'danger' : ''}`}
                            onClick={handleConfirm}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmDialog;
