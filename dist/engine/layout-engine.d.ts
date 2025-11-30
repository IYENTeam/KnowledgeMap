/**
 * Zone Layout Engine v2.0
 *
 * Hierarchical Zoning System 기반 캔버스 레이아웃 엔진
 *
 * 주요 개선사항:
 * - 나선형 탐색 알고리즘으로 충돌 해결
 * - Zone overflow 메커니즘
 * - WeakMap 기반 메타데이터 분리
 * - 구조화된 에러 시스템
 */
import type { CanvasNode, CanvasEdge, Zone } from '../types/index.js';
export interface LayoutConfig {
    gridGap: number;
    collisionPadding: number;
    maxColumnNodes: number;
    groupThreshold: number;
    groupPadding: number;
    maxSpiralRings: number;
    maxOverflowAttempts: number;
}
interface NodeMetadata {
    zone: Zone;
    relation: string;
    anchorId: string;
    createdAt: number;
}
export interface AllocateNodeOptions {
    anchorId: string;
    relation: string;
    content: {
        type: 'text' | 'file' | 'link';
        text?: string;
        file?: string;
        url?: string;
    };
    color?: string;
    /**
     * true로 설정하면 anchorId를 무시하고 Topic(CORE) 노드를 anchor로 사용합니다.
     * 캔버스 확장 시 모든 노드를 Topic 기준으로 배치하여 레이아웃 일관성을 유지합니다.
     * @default false
     */
    useTopicAsAnchor?: boolean;
}
export interface AllocateResult {
    node: CanvasNode;
    edge: CanvasEdge | null;
    zone: Zone;
    overflowed?: boolean;
}
export declare class LayoutEngine {
    private nodes;
    private edges;
    private zoneCounts;
    private groups;
    private config;
    constructor(nodes?: CanvasNode[], edges?: CanvasEdge[], config?: Partial<LayoutConfig>);
    private initializeZoneCounts;
    /**
     * 의미적 관계를 기반으로 노드를 배치합니다.
     * 나선형 탐색과 Zone overflow를 통해 항상 배치를 보장합니다.
     */
    allocateByRelation(options: AllocateNodeOptions): AllocateResult;
    /**
     * 여러 노드를 의미적 관계 기반으로 배치합니다.
     * @param anchorId - 기본 anchor 노드 ID
     * @param items - 배치할 노드 목록
     * @param useTopicAsAnchor - true면 모든 노드를 Topic 기준으로 배치 (권장)
     */
    allocateMultiple(anchorId: string, items: Array<{
        relation: string;
        content: AllocateNodeOptions['content'];
        color?: string;
    }>, useTopicAsAnchor?: boolean): AllocateResult[];
    private allocateInZoneWithFallback;
    private findPositionInZone;
    private trySimplePosition;
    /**
     * 나선형 탐색 알고리즘
     * 중심점에서 시작하여 점점 넓어지는 나선형으로 빈 공간을 찾습니다.
     */
    private spiralSearch;
    /**
     * 나선형 좌표 생성기
     */
    private generateSpiralPoints;
    private getSpiralDirections;
    private getAttemptedPositions;
    private checkCollision;
    private createNode;
    private maybeCreateGroup;
    private expandGroup;
    private getNodesInZone;
    private findNode;
    /**
     * Topic(CORE) 노드를 찾습니다.
     * 1순위: CORE Zone 메타데이터가 있는 노드
     * 2순위: '# '로 시작하는 텍스트 노드 (Topic 형식)
     * 3순위: 가장 먼저 생성된 텍스트 노드
     */
    private findTopicNode;
    /**
     * 현재 노드 리스트를 반환합니다.
     * WeakMap을 사용하므로 별도의 클린업 불필요
     */
    getNodes(): CanvasNode[];
    /**
     * 현재 엣지 리스트를 반환합니다.
     */
    getEdges(): CanvasEdge[];
    /**
     * 노드를 추가합니다.
     */
    addNode(node: CanvasNode, metadata?: {
        zone: Zone;
        relation: string;
        anchorId: string;
    }): void;
    /**
     * 엣지를 추가합니다.
     */
    addEdge(edge: CanvasEdge): void;
    /**
     * Zone별 노드 카운트를 반환합니다.
     */
    getZoneCounts(): Record<string, number>;
    /**
     * 노드의 메타데이터를 조회합니다.
     */
    getNodeMetadata(node: CanvasNode): NodeMetadata | undefined;
    /**
     * 초기 캔버스 레이아웃을 생성합니다 (Topic 노드 포함).
     */
    createInitialLayout(topic: string, options?: {
        vaultNotes?: string[];
        questions?: string[];
    }): {
        nodes: CanvasNode[];
        edges: CanvasEdge[];
    };
}
export {};
//# sourceMappingURL=layout-engine.d.ts.map