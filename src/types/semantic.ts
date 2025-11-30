/**
 * Semantic Layout Protocol Types
 *
 * Agent는 레이아웃을 모르고, 오직 의미적 관계만 표현합니다.
 * SemanticRouter가 관계를 Zone으로 매핑합니다.
 */

// =============================================================================
// Semantic Relations
// =============================================================================

export type SemanticRelation =
  // 답변/해결 계열
  | 'answers'
  | 'solution'
  // 상세/확장 계열
  | 'elaborates'
  | 'detail'
  | 'example'
  | 'instance'
  // 배경/맥락 계열
  | 'background'
  | 'context'
  | 'precedes'
  | 'prerequisite'
  // 후속/파생 계열
  | 'follows'
  | 'implication'
  | 'followUp'
  // 대안/반론 계열
  | 'contradicts'
  | 'alternative'
  | 'counter'
  // 상위/일반화 계열
  | 'parent'
  | 'generalization'
  // 리소스 계열
  | 'resource'
  | 'reference';

// =============================================================================
// Zones
// =============================================================================

export type Zone =
  | 'CORE'
  | 'NORTH'
  | 'SOUTH'
  | 'EAST'
  | 'WEST'
  | 'NORTH_EAST'
  | 'NORTH_WEST'
  | 'SOUTH_EAST'
  | 'SOUTH_WEST';

// =============================================================================
// Zone Specification
// =============================================================================

export interface ZoneSpec {
  zone: Zone;
  dx: number;           // Anchor 기준 X 방향 (그리드 단위)
  dy: number;           // Anchor 기준 Y 방향 (그리드 단위)
  edgeFrom: 'top' | 'right' | 'bottom' | 'left';
  edgeTo: 'top' | 'right' | 'bottom' | 'left';
  defaultColor: string;
  label: string;
  nodeSize: { width: number; height: number };
}

// =============================================================================
// Relation to Zone Mapping
// =============================================================================

export const RELATION_TO_ZONE: Record<SemanticRelation, Zone> = {
  // 답변/해결 → 아래
  answers: 'SOUTH',
  solution: 'SOUTH',

  // 상세/예시 → 오른쪽 아래
  elaborates: 'SOUTH_EAST',
  detail: 'SOUTH_EAST',
  example: 'SOUTH_EAST',
  instance: 'SOUTH_EAST',

  // 배경/맥락 → 왼쪽
  background: 'WEST',
  context: 'WEST',

  // 선행 지식 → 왼쪽 위
  precedes: 'NORTH_WEST',
  prerequisite: 'NORTH_WEST',

  // 후속/파생 → 오른쪽
  follows: 'EAST',
  implication: 'EAST',
  followUp: 'EAST',

  // 대안/반론 → 왼쪽 아래
  contradicts: 'SOUTH_WEST',
  alternative: 'SOUTH_WEST',
  counter: 'SOUTH_WEST',

  // 상위 개념 → 위
  parent: 'NORTH',
  generalization: 'NORTH',

  // 리소스 → 오른쪽
  resource: 'EAST',
  reference: 'EAST',
};

// =============================================================================
// Zone Specifications
// =============================================================================

export const ZONE_SPECS: Record<Zone, ZoneSpec> = {
  CORE: {
    zone: 'CORE',
    dx: 0,
    dy: 0,
    edgeFrom: 'bottom',
    edgeTo: 'top',
    defaultColor: '6', // purple
    label: '주제',
    nodeSize: { width: 450, height: 120 },
  },
  NORTH: {
    zone: 'NORTH',
    dx: 0,
    dy: -1,
    edgeFrom: 'top',
    edgeTo: 'bottom',
    defaultColor: '6', // purple
    label: '상위 개념',
    nodeSize: { width: 400, height: 150 },
  },
  SOUTH: {
    zone: 'SOUTH',
    dx: 0,
    dy: 1,
    edgeFrom: 'bottom',
    edgeTo: 'top',
    defaultColor: '3', // yellow (답변)
    label: '답변/결론',
    nodeSize: { width: 400, height: 200 },
  },
  EAST: {
    zone: 'EAST',
    dx: 1,
    dy: 0,
    edgeFrom: 'right',
    edgeTo: 'left',
    defaultColor: '4', // green (후속 질문)
    label: '후속 탐구',
    nodeSize: { width: 350, height: 150 },
  },
  WEST: {
    zone: 'WEST',
    dx: -1,
    dy: 0,
    edgeFrom: 'left',
    edgeTo: 'right',
    defaultColor: '2', // orange (컨텍스트)
    label: '배경 지식',
    nodeSize: { width: 350, height: 150 },
  },
  NORTH_EAST: {
    zone: 'NORTH_EAST',
    dx: 1,
    dy: -1,
    edgeFrom: 'right',
    edgeTo: 'left',
    defaultColor: '4', // green
    label: '확장',
    nodeSize: { width: 300, height: 120 },
  },
  NORTH_WEST: {
    zone: 'NORTH_WEST',
    dx: -1,
    dy: -1,
    edgeFrom: 'left',
    edgeTo: 'right',
    defaultColor: '2', // orange
    label: '선행 지식',
    nodeSize: { width: 300, height: 120 },
  },
  SOUTH_EAST: {
    zone: 'SOUTH_EAST',
    dx: 1,
    dy: 1,
    edgeFrom: 'right',
    edgeTo: 'left',
    defaultColor: '5', // cyan (상세/예시)
    label: '예시/상세',
    nodeSize: { width: 350, height: 150 },
  },
  SOUTH_WEST: {
    zone: 'SOUTH_WEST',
    dx: -1,
    dy: 1,
    edgeFrom: 'left',
    edgeTo: 'right',
    defaultColor: '1', // red (반론/대안)
    label: '대안/반례',
    nodeSize: { width: 350, height: 150 },
  },
};

// =============================================================================
// Zone Labels (Korean)
// =============================================================================

export const ZONE_LABELS: Record<Zone, string> = {
  CORE: '주제',
  NORTH: '상위 개념',
  SOUTH: '답변/결론',
  EAST: '후속 탐구',
  WEST: '배경 지식',
  NORTH_EAST: '확장',
  NORTH_WEST: '선행 지식',
  SOUTH_EAST: '예시/상세',
  SOUTH_WEST: '대안/반례',
};

// =============================================================================
// Relation Aliases
// =============================================================================

export const RELATION_ALIASES: Record<string, SemanticRelation> = {
  answer: 'answers',
  solve: 'solution',
  explain: 'elaborates',
  details: 'detail',
  examples: 'example',
  bg: 'background',
  ctx: 'context',
  before: 'precedes',
  prereq: 'prerequisite',
  after: 'follows',
  next: 'followUp',
  followup: 'followUp',
  oppose: 'contradicts',
  alt: 'alternative',
  vs: 'contradicts',
  super: 'parent',
  general: 'generalization',
  ref: 'reference',
  link: 'resource',
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
  // 엣지를 생성할 relation 유형
  createEdgeFor: [
    'answers',    // 질문 → 답변
    'solution',   // 문제 → 해결
  ] as SemanticRelation[],

  // Topic에서 연결할 relation (핵심만)
  topicConnections: [
    'answers',    // Topic → 첫 번째 핵심 답변
  ] as SemanticRelation[],

  // 엣지 생성 안 함 (Zone 배치만)
  noEdgeFor: [
    'background',
    'prerequisite',
    'precedes',
    'follows',
    'followUp',
    'elaborates',
    'detail',
    'example',
    'instance',
    'contradicts',
    'alternative',
    'counter',
    'parent',
    'generalization',
    'resource',
    'reference',
    'context',
    'implication',
  ] as SemanticRelation[],
};

/**
 * 해당 relation에 대해 엣지를 생성해야 하는지 판단
 */
export function shouldCreateEdge(relation: string): boolean {
  return EDGE_POLICY.createEdgeFor.includes(relation as SemanticRelation);
}

/**
 * Topic 노드에서 연결해야 하는 relation인지 판단
 */
export function isTopicConnection(relation: string): boolean {
  return EDGE_POLICY.topicConnections.includes(relation as SemanticRelation);
}

// =============================================================================
// Dynamic Node Size Calculation (v2.1)
// =============================================================================

/**
 * 동적 크기 계산 설정
 */
export const SIZE_CALC_CONFIG = {
  // 기본 글자/줄 크기 (Obsidian Canvas 기준)
  charWidth: 8,           // 평균 글자 너비 (px)
  lineHeight: 24,         // 줄 높이 (px)
  paddingX: 32,           // 좌우 패딩 (px)
  paddingY: 24,           // 상하 패딩 (px)

  // 마크다운 요소별 추가 높이
  headerExtraHeight: {
    1: 20,   // # H1
    2: 16,   // ## H2
    3: 12,   // ### H3
  } as Record<number, number>,
  codeBlockPadding: 24,   // 코드블록 추가 패딩
  listItemHeight: 28,     // 리스트 아이템 높이

  // 최소/최대 크기
  minWidth: 280,
  minHeight: 80,
  maxWidth: 600,
  maxHeight: 500,

  // 노드 타입별 고정 크기
  fixedSizes: {
    file: { width: 380, height: 100 },
    link: { width: 400, height: 80 },
  } as Record<string, { width: number; height: number }>,

  // 너비 기준 (글자 수)
  targetCharsPerLine: 50,  // 이상적인 줄당 글자 수
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
export function calculateTextNodeSize(
  text: string,
  options?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  }
): NodeSize {
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
      } else {
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
      const level = headerMatch[1].length as 1 | 2 | 3;
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
  let calculatedWidth = Math.min(
    Math.max(maxLineWidth + cfg.paddingX * 2, minW),
    maxW
  );

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
export function getNodeSize(
  nodeType: 'text' | 'file' | 'link',
  content?: { text?: string; file?: string; url?: string },
  zoneName?: Zone
): NodeSize {
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
