import React from 'react';
import {
    X, Search, ChevronLeft, ChevronRight, List, Type, Calendar, AlignLeft,
    Hash, Tag, CheckSquare, DollarSign, Globe, FunctionSquare,
    FileText, BarChart, Paperclip, Users, User, Settings2,
    Mail, Phone, LayoutGrid, Languages, Smile, MapPin,
    Star, ThumbsUp, PenTool, Layers, MousePointer2, ClipboardList, Shirt,
    Sparkles, ChevronDown
} from 'lucide-react';
import '../styles/CreateFieldSidebar.css';

interface CreateFieldSidebarProps {
    onClose: () => void;
    onAddField: (field: { id: string; name: string; type: string; metadata?: any }) => void;
}

const suggestedFields = [
    { id: 'objective-type', name: 'Objective Type', icon: List, color: '#10b981' },
    { id: 'responsible-member', name: 'Responsible Team Member', icon: User, color: '#ef4444' },
    { id: 'completion-criteria', name: 'Completion Criteria', icon: Type, color: '#a855f7' },
    { id: 'review-date', name: 'Review Date', icon: Calendar, color: '#92400e' },
];

const aiFields = [
    { id: 'summary', name: 'Summary', icon: FileText, color: '#8b5cf6' },
    { id: 'custom-text', name: 'Custom Text', icon: LayoutGrid, color: '#8b5cf6' },
    { id: 'custom-dropdown', name: 'Custom Dropdown', icon: List, color: '#8b5cf6' },
];

const allFields = [
    { id: 'dropdown', name: 'Dropdown', icon: List, color: '#10b981' },
    { id: 'text', name: 'Text', icon: Type, color: '#3b82f6' },
    { id: 'date', name: 'Date', icon: Calendar, color: '#f59e0b' },
    { id: 'textarea', name: 'Text area (Long Text)', icon: AlignLeft, color: '#3b82f6' },
    { id: 'number', name: 'Number', icon: Hash, color: '#10b981' },
    { id: 'labels', name: 'Labels', icon: Tag, color: '#10b981' },
    { id: 'checkbox', name: 'Checkbox', icon: CheckSquare, color: '#ef4444' },
    { id: 'money', name: 'Money', icon: DollarSign, color: '#10b981' },
    { id: 'website', name: 'Website', icon: Globe, color: '#ef4444' },
    { id: 'formula', name: 'Formula', icon: FunctionSquare, color: '#10b981' },
    { id: 'progress-updates', name: 'Progress Updates', icon: BarChart, color: '#8b5cf6' },
    { id: 'files', name: 'Files', icon: Paperclip, color: '#8b5cf6' },
    { id: 'relationship', name: 'Relationship', icon: Users, color: '#3b82f6' },
    { id: 'people', name: 'People', icon: User, color: '#ef4444' },
    { id: 'progress-auto', name: 'Progress (Auto)', icon: Settings2, color: '#8b5cf6' },
    { id: 'email', name: 'Email', icon: Mail, color: '#ef4444' },
    { id: 'phone', name: 'Phone', icon: Phone, color: '#ef4444' },
    { id: 'categorize', name: 'Categorize', icon: LayoutGrid, color: '#8b5cf6' },
    { id: 'translation', name: 'Translation', icon: Languages, color: '#8b5cf6' },
    { id: 'sentiment', name: 'Sentiment', icon: Smile, color: '#8b5cf6' },
    { id: 'tasks', name: 'Tasks', icon: LayoutGrid, color: '#3b82f6' },
    { id: 'location', name: 'Location', icon: MapPin, color: '#ef4444' },
    { id: 'progress-manual', name: 'Progress (Manual)', icon: Settings2, color: '#842000' },
    { id: 'rating', name: 'Rating', icon: Star, color: '#842000' },
    { id: 'voting', name: 'Voting', icon: ThumbsUp, color: '#8b5cf6' },
    { id: 'signature', name: 'Signature', icon: PenTool, color: '#10b981' },
    { id: 'rollup', name: 'Rollup', icon: Layers, color: '#3b82f6' },
    { id: 'button', name: 'Button', icon: MousePointer2, color: '#8b5cf6' },
    { id: 'action-items', name: 'Action Items', icon: ClipboardList, color: '#8b5cf6' },
    { id: 't-shirt-size', name: 'T-shirt Size', icon: Shirt, color: '#8b5cf6' },
];

const CreateFieldSidebar: React.FC<CreateFieldSidebarProps> = ({ onClose, onAddField }) => {
    const [step, setStep] = React.useState<'select' | 'configure'>('select');
    const [selectedField, setSelectedField] = React.useState<any>(null);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [fieldConfig, setFieldConfig] = React.useState({
        name: '',
        fillMethod: 'manual' as 'manual' | 'ai',
        options: [] as { id: string; name: string; color: string }[],
        currency: 'USD',
        decimals: 0
    });

    const handleSelectField = (field: any) => {
        setSelectedField(field);

        // Pre-populate options for specific types
        let initialOptions: any[] = [];
        if (field.id === 'dropdown' || field.id === 'labels' || field.id === 'custom-dropdown') {
            initialOptions = [
                { id: '1', name: 'Option 1', color: '#ff4b91' },
                { id: '2', name: 'Option 2', color: '#7c3aed' }
            ];
        } else if (field.id === 't-shirt-size') {
            initialOptions = [
                { id: 'xs', name: 'XS', color: '#94a3b8' },
                { id: 's', name: 'S', color: '#3b82f6' },
                { id: 'm', name: 'M', color: '#10b981' },
                { id: 'l', name: 'L', color: '#f59e0b' },
                { id: 'xl', name: 'XL', color: '#ef4444' }
            ];
        }

        setFieldConfig({
            ...fieldConfig,
            name: field.name,
            options: initialOptions,
            currency: 'USD',
            decimals: 0
        });
        setStep('configure');
    };

    const handleCreate = () => {
        if (!fieldConfig.name.trim()) return;
        onAddField({
            id: selectedField.id,
            name: fieldConfig.name,
            type: selectedField.id,
            metadata: {
                options: (selectedField.id === 'dropdown' || selectedField.id === 'labels' || selectedField.id === 't-shirt-size' || selectedField.id === 'custom-dropdown')
                    ? fieldConfig.options
                    : undefined,
                currency: selectedField.id === 'money' ? fieldConfig.currency : undefined,
                decimals: selectedField.id === 'number' ? fieldConfig.decimals : undefined,
            }
        });
    };

    const renderFieldItem = (field: any) => (
        <button
            key={field.id}
            className="field-type-item"
            onClick={() => handleSelectField(field)}
        >
            <field.icon size={18} style={{ color: field.color }} />
            <span>{field.name}</span>
        </button>
    );

    const filterFields = (fields: any[]) =>
        fields.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const filteredSuggested = filterFields(suggestedFields);
    const filteredAI = filterFields(aiFields);
    const filteredAll = filterFields(allFields);

    if (step === 'configure' && selectedField) {
        return (
            <div className="create-field-sidebar configuration-step">
                <div className="sidebar-header">
                    <button className="back-btn" onClick={() => setStep('select')}>
                        <ChevronLeft size={20} />
                    </button>
                    <div className="selected-field-type">
                        <selectedField.icon size={18} style={{ color: selectedField.color }} />
                        <span>{selectedField.name}</span>
                        <ChevronDown size={14} className="dropdown-icon" />
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-content config-content">
                    <div className="config-field">
                        <label>Field name <span>*</span></label>
                        <div className="input-with-icon">
                            <Smile size={18} className="placeholder-icon" />
                            <input
                                type="text"
                                placeholder="Enter name..."
                                value={fieldConfig.name}
                                onChange={(e) => setFieldConfig({ ...fieldConfig, name: e.target.value })}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="config-field">
                        <label>Fill method</label>
                        <div className="fill-method-toggle">
                            <button
                                className={`toggle-btn ${fieldConfig.fillMethod === 'manual' ? 'active' : ''}`}
                                onClick={() => setFieldConfig({ ...fieldConfig, fillMethod: 'manual' })}
                            >
                                Manual fill
                            </button>
                            <button
                                className={`toggle-btn ${fieldConfig.fillMethod === 'ai' ? 'active' : ''}`}
                                onClick={() => setFieldConfig({ ...fieldConfig, fillMethod: 'ai' })}
                            >
                                <Sparkles size={14} /> Fill with AI
                            </button>
                        </div>
                    </div>

                    <div className="config-section-link">
                        <span>More settings and permissions</span>
                        <ChevronRight size={16} />
                    </div>
                </div>

                <div className="sidebar-footer config-footer">
                    <button className="cancel-btn" onClick={() => setStep('select')}>Cancel</button>
                    <button
                        className="create-confirm-btn"
                        onClick={handleCreate}
                        disabled={!fieldConfig.name.trim()}
                    >
                        Create
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="create-field-sidebar">
            <div className="sidebar-header">
                <button className="back-btn" onClick={onClose}>
                    <ChevronLeft size={20} />
                </button>
                <h3>Create field</h3>
                <button className="close-btn" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            <div className="sidebar-search">
                <Search size={18} className="search-icon" />
                <input
                    type="text"
                    placeholder="Search for new or existing fields"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="sidebar-content">
                {searchQuery ? (
                    <div className="search-results">
                        {[...filteredSuggested, ...filteredAI, ...filteredAll].map(renderFieldItem)}
                    </div>
                ) : (
                    <>
                        <div className="sidebar-section">
                            <h4 className="section-title">Suggested</h4>
                            {filteredSuggested.map(renderFieldItem)}
                        </div>

                        <div className="sidebar-divider"></div>

                        <div className="sidebar-section">
                            <h4 className="section-title">AI fields</h4>
                            {filteredAI.map(renderFieldItem)}
                        </div>

                        <div className="sidebar-divider"></div>

                        <div className="sidebar-section">
                            <h4 className="section-title">All</h4>
                            {filteredAll.map(renderFieldItem)}
                        </div>
                    </>
                )}
            </div>

            <div className="sidebar-footer">
                <button className="add-existing-btn">
                    <PlusIcon size={16} style={{ color: '#3b82f6', marginRight: 8 }} />
                    Add existing fields
                </button>
            </div>
        </div>
    );
};

const PlusIcon = ({ size, style }: { size: number, style?: React.CSSProperties }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);

export default CreateFieldSidebar;
