import React, { useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { useAppStore } from '../store/useAppStore';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, setDate } from 'date-fns';
import type { Task } from '../types';
import { generateReportDocument } from '../utils/reportTemplates';
import '../styles/TaskModal.css';
import '../styles/ReportModal.css';

interface ReportModalProps {
    onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ onClose }) => {
    const { tasks, currentSpaceId } = useAppStore();

    const today = new Date();
    const currentDay = today.getDate();
    const initialPeriod = currentDay <= 15 ? '1' : '2';

    // Calculate initial dates based on currentPeriod
    const initialStart = initialPeriod === '1'
        ? format(startOfMonth(today), 'yyyy-MM-01')
        : format(setDate(startOfMonth(today), 15), 'yyyy-MM-15');
    const initialEnd = initialPeriod === '1'
        ? format(setDate(startOfMonth(today), 14), 'yyyy-MM-14')
        : format(endOfMonth(today), 'yyyy-MM-dd');

    const [formData, setFormData] = useState({
        template: 'general',
        name: 'Jundee',
        position: 'Software Engineer',
        office: 'Tech Office',
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        period: initialPeriod,
        dateFrom: initialStart,
        dateTo: initialEnd,
        includeCompleted: true,
        includeInProgress: true,
        includeTodo: true,
        reviewedBy: '',
        verifiedBy: '',
        approvedBy: ''
    });

    const updateDateRange = (year: number, month: number, period: string) => {
        const baseDate = new Date(year, month - 1, 1);
        let start, end;

        if (period === '1') {
            start = format(baseDate, 'yyyy-MM-01');
            end = format(setDate(baseDate, 14), 'yyyy-MM-14');
        } else {
            start = format(setDate(baseDate, 15), 'yyyy-MM-15');
            end = format(endOfMonth(baseDate), 'yyyy-MM-dd');
        }

        setFormData(prev => ({
            ...prev,
            year,
            month,
            period,
            dateFrom: start,
            dateTo: end
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;

        if (id === 'year' || id === 'month' || id === 'period') {
            const newYear = id === 'year' ? parseInt(value) : formData.year;
            const newMonth = id === 'month' ? parseInt(value) : formData.month;
            const newPeriod = id === 'period' ? value : formData.period;

            updateDateRange(newYear, newMonth, newPeriod);
        } else if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [id]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    const generateReport = async () => {
        let reportTasks: Task[] = tasks.filter(t =>
            currentSpaceId === 'everything' || t.spaceId === currentSpaceId
        );

        if (formData.dateFrom && formData.dateTo) {
            const start = parseISO(formData.dateFrom);
            const end = parseISO(formData.dateTo);
            reportTasks = reportTasks.filter(t => {
                if (!t.dueDate) return false;
                const d = parseISO(t.dueDate);
                return isWithinInterval(d, { start, end });
            });
        }

        reportTasks = reportTasks.filter(t => {
            if (t.status === 'COMPLETED' && formData.includeCompleted) return true;
            if (t.status === 'IN PROGRESS' && formData.includeInProgress) return true;
            if (t.status === 'TO DO' && formData.includeTodo) return true;
            return false;
        });


        const doc = generateReportDocument(reportTasks, formData);
        const blob = await Packer.toBlob(doc);
        const templateName = formData.template === 'general' ? 'General' : 'Custom';
        saveAs(blob, `Accomplishment_Report_${templateName}_${formData.year}_${formData.month}.docx`);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="title-group-header">
                        <FileText size={20} />
                        <h2>Generate Accomplishment Report</h2>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body scrollable">
                    <div className="form-section">
                        <h3>Report Template</h3>
                        <div className="template-selector">
                            <label className={`template-option ${formData.template === 'general' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="template"
                                    value="general"
                                    checked={formData.template === 'general'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                                />
                                <div className="template-content">
                                    <div className="template-icon">ðŸ“„</div>
                                    <div className="template-details">
                                        <div className="template-title">General Template</div>
                                        <div className="template-desc">Standard accomplishment report format</div>
                                    </div>
                                </div>
                            </label>
                            <label className={`template-option ${formData.template === 'custom' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="template"
                                    value="custom"
                                    checked={formData.template === 'custom'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                                />
                                <div className="template-content">
                                    <div className="template-icon">âœ¨</div>
                                    <div className="template-details">
                                        <div className="template-title">Custom Template</div>
                                        <div className="template-desc">Enhanced format with detailed sections</div>
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Personal Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Name</label>
                                <input type="text" id="name" value={formData.name} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Position</label>
                                <input type="text" id="position" value={formData.position} onChange={handleInputChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Office</label>
                                <input type="text" id="office" value={formData.office} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Report Period</h3>
                        <div className="form-grid-three">
                            <div className="form-group">
                                <label>Year</label>
                                <input type="number" id="year" value={formData.year} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Month</label>
                                <select id="month" value={formData.month} onChange={handleInputChange}>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>{format(new Date(2025, i, 1), 'MMMM')}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Period</label>
                                <select id="period" value={formData.period} onChange={handleInputChange}>
                                    <option value="1">1st Half (1-14)</option>
                                    <option value="2">2nd Half (15-31)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Task Configuration</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>From</label>
                                <input type="date" id="dateFrom" value={formData.dateFrom} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>To</label>
                                <input type="date" id="dateTo" value={formData.dateTo} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="checkbox-group">
                            <label><input type="checkbox" id="includeCompleted" checked={formData.includeCompleted} onChange={handleInputChange} /> Completed</label>
                            <label><input type="checkbox" id="includeInProgress" checked={formData.includeInProgress} onChange={handleInputChange} /> In Progress</label>
                            <label><input type="checkbox" id="includeTodo" checked={formData.includeTodo} onChange={handleInputChange} /> To Do</label>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Signatures</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Reviewed By</label>
                                <input type="text" id="reviewedBy" value={formData.reviewedBy} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>Verified By</label>
                                <input type="text" id="verifiedBy" value={formData.verifiedBy} onChange={handleInputChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Approved By</label>
                                <input type="text" id="approvedBy" value={formData.approvedBy} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={generateReport}>
                        <Download size={16} /> Generate & Download
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportModal;

