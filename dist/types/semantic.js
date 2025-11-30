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
// =============================================================================
// Spatial Rules (핵심 공간 규칙)
// =============================================================================
/**
 * 핵심 공간 규칙 - 모든 Zone 배치의 기반
 */
export const SPATIAL_RULES = {
    /** 규칙 1: 중심 = 핵심 */
    center: 'CORE는 주제/질문/비교대상 등 핵심 내용을 배치',
    /** 규칙 2: 수직축 = 추상화 수준 */
    vertical: '위(NORTH)=추상/일반, 아래(SOUTH)=구체/상세',
    /** 규칙 3: 수평축 = 흐름 */
    horizontal: '왼쪽(WEST)=배경/원인, 오른쪽(EAST)=결과/확장',
};
// =============================================================================
// Relation to Zone Mapping (공간 규칙 기반)
// =============================================================================
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
export const RELATION_TO_ZONE = {
    // SOUTH (아래) - 구체/상세: 답변, 정의, 결론
    answers: 'SOUTH',
    solution: 'SOUTH',
    definition: 'SOUTH',
    conclusion: 'SOUTH',
    // SOUTH_EAST (오른쪽 아래) - 구체적 확장: 예시, 적용, 상세
    elaborates: 'SOUTH_EAST',
    detail: 'SOUTH_EAST',
    example: 'SOUTH_EAST',
    instance: 'SOUTH_EAST',
    application: 'SOUTH_EAST',
    // WEST (왼쪽) - 배경/원인: 맥락, 동기
    background: 'WEST',
    context: 'WEST',
    cause: 'WEST',
    motivation: 'WEST',
    // NORTH_WEST (왼쪽 위) - 추상적 배경: 이론, 선행지식
    precedes: 'NORTH_WEST',
    prerequisite: 'NORTH_WEST',
    theory: 'NORTH_WEST',
    // EAST (오른쪽) - 결과/확장: 후속, 파생
    follows: 'EAST',
    implication: 'EAST',
    followUp: 'EAST',
    result: 'EAST',
    resource: 'EAST',
    reference: 'EAST',
    // NORTH_EAST (오른쪽 위) - 추상적 확장: 관련 개념
    relatedConcept: 'NORTH_EAST',
    extension: 'NORTH_EAST',
    // SOUTH_WEST (왼쪽 아래) - 구체적 배경: 반례, 예외, 대안
    contradicts: 'SOUTH_WEST',
    alternative: 'SOUTH_WEST',
    counter: 'SOUTH_WEST',
    exception: 'SOUTH_WEST',
    // NORTH (위) - 추상/일반: 상위 개념, 분류
    parent: 'NORTH',
    generalization: 'NORTH',
    category: 'NORTH',
};
// =============================================================================
// Zone Specifications (공간 규칙 기반)
// =============================================================================
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
export const ZONE_SPECS = {
    CORE: {
        zone: 'CORE',
        dx: 0,
        dy: 0,
        edgeFrom: 'bottom',
        edgeTo: 'top',
        defaultColor: '6', // purple - 핵심
        label: '핵심',
        nodeSize: { width: 450, height: 120 },
    },
    NORTH: {
        zone: 'NORTH',
        dx: 0,
        dy: -1,
        edgeFrom: 'top',
        edgeTo: 'bottom',
        defaultColor: '6', // purple - 추상/일반
        label: '추상/일반',
        nodeSize: { width: 400, height: 150 },
    },
    SOUTH: {
        zone: 'SOUTH',
        dx: 0,
        dy: 1,
        edgeFrom: 'bottom',
        edgeTo: 'top',
        defaultColor: '3', // yellow - 구체/상세
        label: '구체/상세',
        nodeSize: { width: 400, height: 200 },
    },
    EAST: {
        zone: 'EAST',
        dx: 1,
        dy: 0,
        edgeFrom: 'right',
        edgeTo: 'left',
        defaultColor: '4', // green - 결과/확장
        label: '결과/확장',
        nodeSize: { width: 350, height: 150 },
    },
    WEST: {
        zone: 'WEST',
        dx: -1,
        dy: 0,
        edgeFrom: 'left',
        edgeTo: 'right',
        defaultColor: '2', // orange - 배경/원인
        label: '배경/원인',
        nodeSize: { width: 350, height: 150 },
    },
    NORTH_EAST: {
        zone: 'NORTH_EAST',
        dx: 1,
        dy: -1,
        edgeFrom: 'right',
        edgeTo: 'left',
        defaultColor: '4', // green - 추상적 확장
        label: '추상적 확장',
        nodeSize: { width: 300, height: 120 },
    },
    NORTH_WEST: {
        zone: 'NORTH_WEST',
        dx: -1,
        dy: -1,
        edgeFrom: 'left',
        edgeTo: 'right',
        defaultColor: '2', // orange - 추상적 배경
        label: '추상적 배경',
        nodeSize: { width: 300, height: 120 },
    },
    SOUTH_EAST: {
        zone: 'SOUTH_EAST',
        dx: 1,
        dy: 1,
        edgeFrom: 'right',
        edgeTo: 'left',
        defaultColor: '5', // cyan - 구체적 확장
        label: '구체적 확장',
        nodeSize: { width: 350, height: 150 },
    },
    SOUTH_WEST: {
        zone: 'SOUTH_WEST',
        dx: -1,
        dy: 1,
        edgeFrom: 'left',
        edgeTo: 'right',
        defaultColor: '1', // red - 구체적 배경
        label: '구체적 배경',
        nodeSize: { width: 350, height: 150 },
    },
};
// =============================================================================
// Zone Labels (공간 규칙 기반 한국어)
// =============================================================================
export const ZONE_LABELS = {
    CORE: '핵심',
    NORTH: '추상/일반',
    SOUTH: '구체/상세',
    EAST: '결과/확장',
    WEST: '배경/원인',
    NORTH_EAST: '추상적 확장',
    NORTH_WEST: '추상적 배경',
    SOUTH_EAST: '구체적 확장',
    SOUTH_WEST: '구체적 배경',
};
// =============================================================================
// Relation Aliases
// =============================================================================
export const RELATION_ALIASES = {
    // SOUTH (구체/상세)
    answer: 'answers',
    solve: 'solution',
    def: 'definition',
    define: 'definition',
    conclude: 'conclusion',
    summary: 'conclusion',
    // SOUTH_EAST (구체적 확장)
    explain: 'elaborates',
    details: 'detail',
    examples: 'example',
    apply: 'application',
    use: 'application',
    // WEST (배경/원인)
    bg: 'background',
    ctx: 'context',
    why: 'cause',
    reason: 'cause',
    motive: 'motivation',
    // NORTH_WEST (추상적 배경)
    before: 'precedes',
    prereq: 'prerequisite',
    prior: 'prerequisite',
    theoretical: 'theory',
    // EAST (결과/확장)
    after: 'follows',
    next: 'followUp',
    followup: 'followUp',
    outcome: 'result',
    effect: 'result',
    consequence: 'implication',
    // NORTH_EAST (추상적 확장)
    related: 'relatedConcept',
    extend: 'extension',
    expand: 'extension',
    // SOUTH_WEST (구체적 배경)
    oppose: 'contradicts',
    alt: 'alternative',
    vs: 'contradicts',
    except: 'exception',
    counterexample: 'counter',
    // NORTH (추상/일반)
    super: 'parent',
    general: 'generalization',
    classify: 'category',
    type: 'category',
    // 리소스
    ref: 'reference',
    link: 'resource',
    src: 'resource',
};
// =============================================================================
// Edge Policy (v2.1)
// =============================================================================
/**
 * 엣지 생성 정책
 * - createEdgeFor: 이 relation들에 대해서만 엣지 생성
 * - noEdgeFor: 이 relation들은 Zone 배치만 (엣지 없음)
 */
export const EDGE_POLICY = {
    // 엣지를 생성할 relation 유형 (핵심 연결만)
    createEdgeFor: [
        'answers', // 질문 → 답변
        'solution', // 문제 → 해결
        'definition', // 주제 → 정의
        'conclusion', // 분석 → 결론
    ],
    // Topic에서 연결할 relation (핵심만)
    topicConnections: [
        'answers', // Topic → 핵심 답변
        'definition', // Topic → 정의
    ],
    // 엣지 생성 안 함 (Zone 배치만 - 공간 규칙으로 관계 표현)
    noEdgeFor: [
        // SOUTH_EAST (구체적 확장)
        'elaborates',
        'detail',
        'example',
        'instance',
        'application',
        // WEST (배경/원인)
        'background',
        'context',
        'cause',
        'motivation',
        // NORTH_WEST (추상적 배경)
        'prerequisite',
        'precedes',
        'theory',
        // EAST (결과/확장)
        'follows',
        'followUp',
        'implication',
        'result',
        'resource',
        'reference',
        // NORTH_EAST (추상적 확장)
        'relatedConcept',
        'extension',
        // SOUTH_WEST (구체적 배경)
        'contradicts',
        'alternative',
        'counter',
        'exception',
        // NORTH (추상/일반)
        'parent',
        'generalization',
        'category',
    ],
};
/**
 * 해당 relation에 대해 엣지를 생성해야 하는지 판단
 */
export function shouldCreateEdge(relation) {
    return EDGE_POLICY.createEdgeFor.includes(relation);
}
/**
 * Topic 노드에서 연결해야 하는 relation인지 판단
 */
export function isTopicConnection(relation) {
    return EDGE_POLICY.topicConnections.includes(relation);
}
// =============================================================================
// Dynamic Node Size Calculation (v2.1)
// =============================================================================
/**
 * 동적 크기 계산 설정
 */
export const SIZE_CALC_CONFIG = {
    // 기본 글자/줄 크기 (Obsidian Canvas 기준)
    charWidth: 8, // 평균 글자 너비 (px)
    lineHeight: 24, // 줄 높이 (px)
    paddingX: 32, // 좌우 패딩 (px)
    paddingY: 24, // 상하 패딩 (px)
    // 마크다운 요소별 추가 높이
    headerExtraHeight: {
        1: 20, // # H1
        2: 16, // ## H2
        3: 12, // ### H3
    },
    codeBlockPadding: 24, // 코드블록 추가 패딩
    listItemHeight: 28, // 리스트 아이템 높이
    // 최소/최대 크기
    minWidth: 280,
    minHeight: 80,
    maxWidth: 600,
    maxHeight: 500,
    // 노드 타입별 고정 크기
    fixedSizes: {
        file: { width: 380, height: 100 },
        link: { width: 400, height: 80 },
    },
    // 너비 기준 (글자 수)
    targetCharsPerLine: 50, // 이상적인 줄당 글자 수
};
/**
 * 텍스트 내용을 분석하여 적절한 노드 크기를 계산합니다.
 *
 * 마크다운 요소를 인식합니다:
 * - 헤더 (#, ##, ###)
 * - 코드블록 (```)
 * - 리스트 (-, *, 1.)
 * - 일반 텍스트
 */
export function calculateTextNodeSize(text, options) {
    const cfg = SIZE_CALC_CONFIG;
    const minW = options?.minWidth ?? cfg.minWidth;
    const minH = options?.minHeight ?? cfg.minHeight;
    const maxW = options?.maxWidth ?? cfg.maxWidth;
    const maxH = options?.maxHeight ?? cfg.maxHeight;
    if (!text || !text.trim()) {
        return { width: minW, height: minH };
    }
    const lines = text.split('\n');
    let totalHeight = cfg.paddingY * 2;
    let maxLineWidth = 0;
    let inCodeBlock = false;
    for (const line of lines) {
        const lineStripped = line.trim();
        // 코드블록 시작/끝
        if (lineStripped.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            if (inCodeBlock) {
                totalHeight += cfg.codeBlockPadding;
            }
            else {
                totalHeight += cfg.codeBlockPadding;
            }
            continue;
        }
        // 코드블록 내부
        if (inCodeBlock) {
            totalHeight += cfg.lineHeight;
            // 코드는 더 넓게 (고정폭 폰트)
            const lineWidth = line.length * (cfg.charWidth + 1);
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            continue;
        }
        // 헤더
        const headerMatch = lineStripped.match(/^(#{1,3})\s+(.+)$/);
        if (headerMatch) {
            const level = headerMatch[1].length;
            const headerText = headerMatch[2];
            totalHeight += cfg.lineHeight + (cfg.headerExtraHeight[level] ?? 10);
            // 헤더는 더 큰 폰트
            const headerWidth = headerText.length * (cfg.charWidth + level * 2);
            maxLineWidth = Math.max(maxLineWidth, headerWidth);
            continue;
        }
        // 리스트 아이템
        if (/^[-*]\s+|^\d+\.\s+/.test(lineStripped)) {
            totalHeight += cfg.listItemHeight;
            const lineWidth = lineStripped.length * cfg.charWidth;
            maxLineWidth = Math.max(maxLineWidth, lineWidth);
            continue;
        }
        // 빈 줄
        if (!lineStripped) {
            totalHeight += Math.floor(cfg.lineHeight / 2);
            continue;
        }
        // 일반 텍스트
        totalHeight += cfg.lineHeight;
        const lineWidth = line.length * cfg.charWidth;
        maxLineWidth = Math.max(maxLineWidth, lineWidth);
    }
    // 너비 계산
    let calculatedWidth = Math.min(Math.max(maxLineWidth + cfg.paddingX * 2, minW), maxW);
    // 너비가 max를 초과하면 줄바꿈 예상하여 높이 증가
    if (maxLineWidth > maxW - cfg.paddingX * 2) {
        const wrapFactor = maxLineWidth / (maxW - cfg.paddingX * 2);
        totalHeight = Math.floor(totalHeight * (1 + (wrapFactor - 1) * 0.7));
    }
    // 최종 크기 결정
    const finalWidth = Math.min(Math.max(calculatedWidth, minW), maxW);
    const finalHeight = Math.min(Math.max(totalHeight, minH), maxH);
    return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
}
/**
 * 노드 타입과 내용에 따라 적절한 크기를 반환합니다.
 */
export function getNodeSize(nodeType, content, zoneName) {
    const cfg = SIZE_CALC_CONFIG;
    // 파일/링크는 고정 크기
    if (nodeType in cfg.fixedSizes) {
        return { ...cfg.fixedSizes[nodeType] };
    }
    // 텍스트 노드는 동적 계산
    if (nodeType === 'text' && content?.text) {
        return calculateTextNodeSize(content.text);
    }
    // 기본값: Zone 설정 사용
    if (zoneName) {
        const zoneSpec = ZONE_SPECS[zoneName];
        if (zoneSpec) {
            return { ...zoneSpec.nodeSize };
        }
    }
    return { width: 400, height: 150 };
}
//# sourceMappingURL=semantic.js.map