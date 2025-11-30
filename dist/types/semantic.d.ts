/**
 * Semantic Layout Protocol Types v2.2
 *
 * 핵심 공간 규칙 3개:
 * 1. 중심 = 핵심 (Topic/Question)
 * 2. 수직축 = 추상화 (위=일반/추상, 아래=구체/상세)
 * 3. 수평축 = 흐름 (왼쪽=배경/원인, 오른쪽=결과/확장)
 *
 * Agent는 레이아웃을 모르고, 오직 의미적 관계만 표현합니다.
 * SemanticRouter가 관계를 Zone으로 매핑합니다.
 */
/**
 * 핵심 공간 규칙 - 모든 Zone 배치의 기반
 */
export declare const SPATIAL_RULES: {
    /** 규칙 1: 중심 = 핵심 */
    readonly center: "CORE는 주제/질문/비교대상 등 핵심 내용을 배치";
    /** 규칙 2: 수직축 = 추상화 수준 */
    readonly vertical: "위(NORTH)=추상/일반, 아래(SOUTH)=구체/상세";
    /** 규칙 3: 수평축 = 흐름 */
    readonly horizontal: "왼쪽(WEST)=배경/원인, 오른쪽(EAST)=결과/확장";
};
export type SemanticRelation = 'answers' | 'solution' | 'definition' | 'conclusion' | 'elaborates' | 'detail' | 'example' | 'instance' | 'application' | 'background' | 'context' | 'cause' | 'motivation' | 'precedes' | 'prerequisite' | 'theory' | 'follows' | 'implication' | 'followUp' | 'result' | 'relatedConcept' | 'extension' | 'contradicts' | 'alternative' | 'counter' | 'exception' | 'parent' | 'generalization' | 'category' | 'resource' | 'reference';
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
/**
 * Relation → Zone 매핑
 *
 * 공간 규칙에 따른 배치:
 * - SOUTH (아래): 구체/상세 - 답변, 정의, 결론
 * - SOUTH_EAST (오른쪽 아래): 구체적 확장 - 예시, 적용
 * - WEST (왼쪽): 배경/원인 - 맥락, 동기
 * - NORTH_WEST (왼쪽 위): 추상적 배경 - 이론, 선행지식
 * - EAST (오른쪽): 결과/확장 - 후속, 파생
 * - NORTH_EAST (오른쪽 위): 추상적 확장 - 관련 개념
 * - SOUTH_WEST (왼쪽 아래): 구체적 배경 - 반례, 예외, 대안
 * - NORTH (위): 추상/일반 - 상위 개념, 분류
 */
export declare const RELATION_TO_ZONE: Record<SemanticRelation, Zone>;
/**
 * Zone 스펙 - 공간 규칙에 따른 의미 정의
 *
 * 수직축 (추상화):
 *   NORTH = 추상/일반 (상위 개념, 큰 그림)
 *   SOUTH = 구체/상세 (정의, 답변, 결론)
 *
 * 수평축 (흐름):
 *   WEST = 배경/원인 (맥락, 전제, 동기)
 *   EAST = 결과/확장 (후속, 파생, 다음)
 *
 * 대각선 (조합):
 *   NORTH_WEST = 추상적 배경 (이론, 선행지식)
 *   NORTH_EAST = 추상적 확장 (관련 개념)
 *   SOUTH_WEST = 구체적 배경 (반례, 예외)
 *   SOUTH_EAST = 구체적 확장 (예시, 적용)
 */
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