
export type AgentTriggerType = 'task_created' | 'task_updated' | 'status_changed';
export type AgentActionType = 'launch_autopilot' | 'send_notification' | 'update_task';

export interface AgentTrigger {
    type: AgentTriggerType;
    conditions?: string;
    sourceIds?: string[];
}

export interface AgentAction {
    type: AgentActionType;
    instructions?: string;
    config?: any;
}

export interface Agent {
    id: string;
    name: string;
    description?: string;
    isEnabled: boolean;
    trigger: AgentTrigger;
    action: AgentAction;
    creatorId: string;
    creatorName: string;
    createdAt: string;
    updatedAt: string;
}
