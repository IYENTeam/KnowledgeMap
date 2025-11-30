/**
 * Canvas Metadata Types
 *
 * Sidecar 패턴으로 캔버스 메타데이터를 관리합니다.
 * 캔버스 파일의 순수성을 보존하면서 워크플로우 상태를 추적합니다.
 */
export type WorkflowState = 'created' | 'expanded' | 'crystallized' | 'atomized' | 'archived';
export interface WorkflowAction {
    action: string;
    agent: string;
    timestamp: string;
    details: Record<string, unknown>;
}
export type NodeRole = 'root' | 'topic' | 'question' | 'answer' | 'resource' | 'vaultNote' | 'context' | 'command' | 'content';
export type NodeStatus = 'active' | 'pending' | 'resolved' | 'archived';
export interface NodeMeta {
    role: NodeRole;
    status: NodeStatus;
    intent?: string;
    resolvedBy?: string[];
    createdAt?: string;
}
export interface LayoutState {
    engineVersion: string;
    zoneCounts: Record<string, number>;
    groupsCreated: string[];
}
export interface CanvasStatistics {
    totalNodes: number;
    questions: number;
    resolvedQuestions: number;
    webLinks: number;
    vaultNotes: number;
}
export interface CanvasMeta {
    $schema: string;
    canvasId: string;
    linkedFile: string;
    createdAt: string;
    updatedAt: string;
    syncedAt: number;
    workflow: {
        state: WorkflowState;
        history: WorkflowAction[];
    };
    semanticGraph: Record<string, NodeMeta>;
    layoutState: LayoutState;
    statistics: CanvasStatistics;
}
export declare function createDefaultMeta(canvasPath: string): CanvasMeta;
//# sourceMappingURL=meta.d.ts.map