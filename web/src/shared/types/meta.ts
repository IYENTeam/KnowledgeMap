/**
 * Canvas Metadata Types
 *
 * Sidecar 패턴으로 캔버스 메타데이터를 관리합니다.
 * 캔버스 파일의 순수성을 보존하면서 워크플로우 상태를 추적합니다.
 */

// =============================================================================
// Workflow States
// =============================================================================

export type WorkflowState =
  | 'created'
  | 'expanded'
  | 'crystallized'
  | 'atomized'
  | 'archived';

// =============================================================================
// Workflow Action
// =============================================================================

export interface WorkflowAction {
  action: string;
  agent: string;
  timestamp: string; // ISO 8601
  details: Record<string, unknown>;
}

// =============================================================================
// Node Metadata
// =============================================================================

export type NodeRole =
  | 'root'
  | 'topic'
  | 'question'
  | 'answer'
  | 'resource'
  | 'vaultNote'
  | 'context'
  | 'command'
  | 'content';

export type NodeStatus = 'active' | 'pending' | 'resolved' | 'archived';

export interface NodeMeta {
  role: NodeRole;
  status: NodeStatus;
  intent?: string;           // Intent Node인 경우 ACTION
  resolvedBy?: string[];     // 해결한 노드 ID들
  createdAt?: string;
}

// =============================================================================
// Layout State
// =============================================================================

export interface LayoutState {
  engineVersion: string;
  zoneCounts: Record<string, number>;
  groupsCreated: string[];
}

// =============================================================================
// Statistics
// =============================================================================

export interface CanvasStatistics {
  totalNodes: number;
  questions: number;
  resolvedQuestions: number;
  webLinks: number;
  vaultNotes: number;
}

// =============================================================================
// Canvas Meta Document
// =============================================================================

export interface CanvasMeta {
  $schema: string;
  canvasId: string;
  linkedFile: string;
  createdAt: string;
  updatedAt: string;
  syncedAt: number; // Unix timestamp for mtime comparison

  workflow: {
    state: WorkflowState;
    history: WorkflowAction[];
  };

  semanticGraph: Record<string, NodeMeta>;
  layoutState: LayoutState;
  statistics: CanvasStatistics;
}

// =============================================================================
// Default Values
// =============================================================================

export function createDefaultMeta(canvasPath: string): CanvasMeta {
  const now = new Date().toISOString();
  return {
    $schema: 'canvas-meta-v1',
    canvasId: crypto.randomUUID(),
    linkedFile: canvasPath,
    createdAt: now,
    updatedAt: now,
    syncedAt: Date.now(),
    workflow: {
      state: 'created',
      history: [],
    },
    semanticGraph: {},
    layoutState: {
      engineVersion: 'zoning-v1',
      zoneCounts: {},
      groupsCreated: [],
    },
    statistics: {
      totalNodes: 0,
      questions: 0,
      resolvedQuestions: 0,
      webLinks: 0,
      vaultNotes: 0,
    },
  };
}
