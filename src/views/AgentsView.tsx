import React, { useState } from 'react';
import { Plus, Search, Bot, Zap, ArrowRight, X, Save, Edit2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { Agent, AgentTriggerType, AgentActionType } from '../types/agent';
import '../styles/AgentsView.css';

const AgentsView: React.FC = () => {
    const { agents, addAgent, updateAgent, deleteAgent } = useAppStore();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

    // New Agent State
    const [newAgentName, setNewAgentName] = useState('');
    const [triggerType, setTriggerType] = useState<AgentTriggerType>('task_created');
    const [actionType, setActionType] = useState<AgentActionType>('launch_autopilot');
    const [instructions, setInstructions] = useState('');
    const [triggerConditions, setTriggerConditions] = useState('');

    const handleCreateAgent = () => {
        if (!newAgentName.trim()) return;

        const agentData = {
            name: newAgentName,
            description: 'Automated agent',
            isEnabled: true,
            trigger: {
                type: triggerType,
                conditions: triggerConditions
            },
            action: {
                type: actionType,
                instructions: instructions
            }
        };

        if (editingAgentId) {
            updateAgent(editingAgentId, agentData);
        } else {
            addAgent(agentData);
        }

        setIsCreateOpen(false);
        resetForm();
    };

    const handleEditAgent = (agent: Agent) => {
        setEditingAgentId(agent.id);
        setNewAgentName(agent.name);
        setTriggerType(agent.trigger.type);
        setTriggerConditions(agent.trigger.conditions || '');
        setActionType(agent.action.type);
        setInstructions(agent.action.instructions || '');
        setIsCreateOpen(true);
    };

    const resetForm = () => {
        setEditingAgentId(null);
        setNewAgentName('');
        setTriggerType('task_created');
        setActionType('launch_autopilot');
        setInstructions('');
        setTriggerConditions('');
    };

    const filteredAgents = agents.filter(agent =>
        agent.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="agents-view">
            <header className="agents-header">
                <div>
                    <h1>Autopilot Agents</h1>
                    <p className="subtitle">Automate your workflows with AI agents</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search agents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="primary-btn" onClick={() => setIsCreateOpen(true)}>
                        <Plus size={16} />
                        New Agent
                    </button>
                </div>
            </header>

            <div className="agents-content">
                {filteredAgents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Bot size={48} />
                        </div>
                        <h2>Let's create your first Agent!</h2>
                        <p>Use Autopilot Agents to streamline your workflows and automate tasks.</p>
                        <button className="primary-btn" onClick={() => setIsCreateOpen(true)}>
                            New Agent
                        </button>
                    </div>
                ) : (
                    <div className="agents-grid">
                        {filteredAgents.map(agent => (
                            <div key={agent.id} className="agent-card">
                                <div className="agent-card-header">
                                    <div className="agent-icon" style={{ background: '#8b5cf620', color: '#8b5cf6' }}>
                                        <Bot size={20} />
                                    </div>
                                    <div className="agent-toggle">
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={agent.isEnabled}
                                                onChange={() => updateAgent(agent.id, { isEnabled: !agent.isEnabled })}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                                <div className="agent-info">
                                    <h3>{agent.name}</h3>
                                    <p className="agent-description">
                                        {agent.action.type === 'launch_autopilot' ? 'Autopilot Agent' : 'Automation'}
                                    </p>
                                </div>
                                <div className="agent-details">
                                    <div className="detail-item">
                                        <Zap size={14} />
                                        <span>Trigger: {agent.trigger.type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="detail-item">
                                        <ArrowRight size={14} />
                                        <span>Action: {agent.action.type.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                <div className="agent-footer">
                                    <span className="agent-author">Created by {agent.creatorName}</span>
                                    <div className="agent-actions">
                                        <button className="icon-btn" onClick={() => handleEditAgent(agent)}>
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="icon-btn" onClick={() => deleteAgent(agent.id)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isCreateOpen && (
                <div className="modal-overlay">
                    <div className="modal-content agent-modal">
                        <div className="modal-header">
                            <h2>{editingAgentId ? 'Edit Agent' : 'New Agent Automation'}</h2>
                            <button className="close-btn" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Agent Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Team StandUp"
                                    value={newAgentName}
                                    onChange={(e) => setNewAgentName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="automation-flow">
                                <div className="flow-step trigger-step">
                                    <div className="step-header">
                                        <div className="step-icon"><Zap size={18} /></div>
                                        <h3>Trigger</h3>
                                    </div>
                                    <div className="step-content">
                                        <select
                                            value={triggerType}
                                            onChange={(e) => setTriggerType(e.target.value as AgentTriggerType)}
                                        >
                                            <option value="task_created">Task created</option>
                                            <option value="task_updated">Task updated</option>
                                            <option value="status_changed">Status changed</option>
                                        </select>

                                        <div className="condition-box">
                                            <label>Agent conditions</label>
                                            <textarea
                                                placeholder="e.g. Only trigger if the task is about HR."
                                                value={triggerConditions}
                                                onChange={(e) => setTriggerConditions(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flow-arrow">
                                    <ArrowRight size={24} />
                                </div>

                                <div className="flow-step action-step">
                                    <div className="step-header">
                                        <div className="step-icon"><Bot size={18} /></div>
                                        <h3>Action</h3>
                                    </div>
                                    <div className="step-content">
                                        <select
                                            value={actionType}
                                            onChange={(e) => setActionType(e.target.value as AgentActionType)}
                                        >
                                            <option value="launch_autopilot">Launch Autopilot Agent</option>
                                            <option value="send_notification">Send Notification</option>
                                            <option value="update_task">Update Task</option>
                                        </select>

                                        {actionType === 'launch_autopilot' && (
                                            <div className="condition-box">
                                                <label>Instructions <span className="required">*</span></label>
                                                <p className="help-text">Tell your Agent what to do. Explain how it should use tools and knowledge.</p>
                                                <textarea
                                                    className="instructions-input"
                                                    placeholder="Your role is to ensure that new tasks are set up for success..."
                                                    value={instructions}
                                                    onChange={(e) => setInstructions(e.target.value)}
                                                    rows={6}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="cancel-btn" onClick={() => { setIsCreateOpen(false); resetForm(); }}>Cancel</button>
                            <button className="create-btn" onClick={handleCreateAgent} disabled={!newAgentName}>
                                <Save size={16} />
                                {editingAgentId ? 'Save Changes' : 'Create & Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentsView;
