/**
 * Semantic Layout Protocol Types
 *
 * Agent는 레이아웃을 모르고, 오직 의미적 관계만 표현합니다.
 * SemanticRouter가 관계를 Zone으로 매핑합니다.
 */
export type SemanticRelation = 'answers' | 'solution' | 'elaborates' | 'detail' | 'example' | 'instance' | 'background' | 'context' | 'precedes' | 'prerequisite' | 'follows' | 'implication' | 'followUp' | 'contradicts' | 'alternative' | 'counter' | 'parent' | 'generalization' | 'resource' | 'reference';
export type Zone = 'CORE' | 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'NORTH_EAST' | 'NORTH_WEST' | 'SOUTH_EAST' | 'SOUTH_WEST';
export interface ZoneSpec {
    zone: Zone;
    dx: number;
    dy: number;
    edgeFrom: 'top' | 'right' | 'bottom' | 'left';
    edgeTo: 'top' | 'right' | 'bottom' | 'left';
    defaultColor: string;
    label: string;
    nodeSize: {
        width: number;
        height: number;
    };
}
export declare const RELATION_TO_ZONE: Record<SemanticRelation, Zone>;
export declare const ZONE_SPECS: Record<Zone, ZoneSpec>;
export declare const ZONE_LABELS: Record<Zone, string>;
export declare const RELATION_ALIASES: Record<string, SemanticRelation>;
/**
 * 엣지 생성 정책
 * - createEdgeFor: 이 relation들에 대해서만 엣지 생성
 * - noEdgeFor: 이 relation들은 Zone 배치만 (엣지 없음)
 */
export declare const EDGE_POLICY: {
    createEdgeFor: SemanticRelation[];
    topicConnections: SemanticRelation[];
    noEdgeFor: SemanticRelation[];
};
/**
 * 해당 relation에 대해 엣지를 생성해야 하는지 판단
 */
export declare function shouldCreateEdge(relation: string): boolean;
/**
 * Topic 노드에서 연결해야 하는 relation인지 판단
 */
export declare function isTopicConnection(relation: string): boolean;
/**
 * 동적 크기 계산 설정
 */
export declare const SIZE_CALC_CONFIG: {
    charWidth: number;
    lineHeight: number;
    paddingX: number;
    paddingY: number;
    headerExtraHeight: Record<number, number>;
    codeBlockPadding: number;
    listItemHeight: number;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
    fixedSizes: Record<string, {
        width: number;
        height: number;
    }>;
    targetCharsPerLine: number;
};
export interface NodeSize {
    width: number;
    height: number;
}
/**
 * 텍스트 내용을 분석하여 적절한 노드 크기를 계산합니다.
 *
 * 마크다운 요소를 인식합니다:
 * - 헤더 (#, ##, ###)
 * - 코드블록 (```)
 * - 리스트 (-, *, 1.)
 * - 일반 텍스트
 */
export declare function calculateTextNodeSize(text: string, options?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
}): NodeSize;
/**
 * 노드 타입과 내용에 따라 적절한 크기를 반환합니다.
 */
export declare function getNodeSize(nodeType: 'text' | 'file' | 'link', content?: {
    text?: string;
    file?: string;
    url?: string;
}, zoneName?: Zone): NodeSize;
//# sourceMappingURL=semantic.d.ts.map