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

import type {
  CanvasNode,
  CanvasEdge,
  GroupNode,
  Zone,
  NodePosition,
} from '../types/index.js';
import {
  ZONE_SPECS,
  getNodeSize,
  calculateTextNodeSize,
  shouldCreateEdge,
} from '../types/index.js';
import { CanvasParser } from './canvas-parser.js';
import { SemanticRouter } from './semantic-router.js';
import { LayoutError } from '../core/errors.js';
import { logger } from '../core/logger.js';

// =============================================================================
// Configuration
// =============================================================================

export interface LayoutConfig {
  gridGap: number;
  collisionPadding: number;
  maxColumnNodes: number;
  groupThreshold: number;
  groupPadding: number;
  maxSpiralRings: number;
  maxOverflowAttempts: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  gridGap: 40,
  collisionPadding: 15,
  maxColumnNodes: 3,
  groupThreshold: 5,
  groupPadding: 50,
  maxSpiralRings: 25,
  maxOverflowAttempts: 3,
};

// =============================================================================
// Zone Adjacency Map
// =============================================================================

const ZONE_ADJACENCY: Record<Zone, Zone[]> = {
  CORE: ['SOUTH', 'EAST', 'WEST', 'NORTH'],
  NORTH: ['NORTH_EAST', 'NORTH_WEST', 'CORE'],
  SOUTH: ['SOUTH_EAST', 'SOUTH_WEST', 'CORE'],
  EAST: ['SOUTH_EAST', 'NORTH_EAST', 'CORE'],
  WEST: ['SOUTH_WEST', 'NORTH_WEST', 'CORE'],
  NORTH_EAST: ['EAST', 'NORTH'],
  NORTH_WEST: ['WEST', 'NORTH'],
  SOUTH_EAST: ['EAST', 'SOUTH'],
  SOUTH_WEST: ['WEST', 'SOUTH'],
};

// =============================================================================
// Metadata Store (WeakMap Pattern)
// =============================================================================

interface NodeMetadata {
  zone: Zone;
  relation: string;
  anchorId: string;
  createdAt: number;
}

const nodeMetadataStore = new WeakMap<CanvasNode, NodeMetadata>();

// =============================================================================
// Types
// =============================================================================

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


// =============================================================================
// Layout Engine Class
// =============================================================================

export class LayoutEngine {
  private nodes: CanvasNode[];
  private edges: CanvasEdge[];
  private zoneCounts: Map<Zone, number>;
  private groups: Map<Zone, string>;
  private config: LayoutConfig;

  constructor(
    nodes: CanvasNode[] = [],
    edges: CanvasEdge[] = [],
    config: Partial<LayoutConfig> = {}
  ) {
    this.nodes = [...nodes];
    this.edges = [...edges];
    this.zoneCounts = new Map();
    this.groups = new Map();
    this.config = { ...DEFAULT_LAYOUT_CONFIG, ...config };

    this.initializeZoneCounts();
  }

  private initializeZoneCounts(): void {
    for (const zone of SemanticRouter.getAllZones()) {
      this.zoneCounts.set(zone, 0);
    }

    // 기존 노드들의 메타데이터에서 Zone 카운트
    for (const node of this.nodes) {
      const meta = nodeMetadataStore.get(node);
      if (meta?.zone) {
        const count = this.zoneCounts.get(meta.zone) ?? 0;
        this.zoneCounts.set(meta.zone, count + 1);
      }
    }
  }

  // ===========================================================================
  // Core API
  // ===========================================================================

  /**
   * 의미적 관계를 기반으로 노드를 배치합니다.
   * 나선형 탐색과 Zone overflow를 통해 항상 배치를 보장합니다.
   */
  allocateByRelation(options: AllocateNodeOptions): AllocateResult {
    const { anchorId, relation, content, color, useTopicAsAnchor } = options;

    // 1. Anchor 노드 찾기
    let anchor: CanvasNode | undefined;
    let effectiveAnchorId = anchorId;

    if (useTopicAsAnchor) {
      // useTopicAsAnchor가 true면 Topic(CORE) 노드를 anchor로 사용
      anchor = this.findTopicNode();
      if (!anchor) {
        // Topic 노드가 없으면 기존 anchorId로 fallback
        logger.warn('Topic node not found, falling back to provided anchorId', { anchorId });
        anchor = this.findNode(anchorId);
      } else {
        effectiveAnchorId = anchor.id;
        logger.debug('Using Topic node as anchor', { topicId: anchor.id, originalAnchorId: anchorId });
      }
    } else {
      anchor = this.findNode(anchorId);
    }

    if (!anchor) {
      throw LayoutError.anchorNotFound(effectiveAnchorId);
    }

    // 2. Semantic Routing: relation → Zone
    const { zone: primaryZone, spec } = SemanticRouter.route(relation);

    // 3. 동적 노드 크기 계산
    const nodeSize = getNodeSize(content.type, content, primaryZone);

    // 4. Zone 내 좌표 계산 (나선형 탐색 포함)
    const allocation = this.allocateInZoneWithFallback(
      anchor,
      primaryZone,
      nodeSize
    );

    if (!allocation) {
      // 모든 시도 실패 시 상세한 에러
      throw LayoutError.allocationFailed({
        zone: primaryZone,
        anchorId: effectiveAnchorId,
        existingNodeCount: this.zoneCounts.get(primaryZone) ?? 0,
        attemptedPositions: this.getAttemptedPositions(anchor, primaryZone, nodeSize),
      });
    }

    // 5. 노드 생성
    const nodeId = CanvasParser.generateId(content.type);
    const nodeColor = color || spec.defaultColor;
    const node = this.createNode(nodeId, content, allocation.position, nodeColor);

    // 6. 메타데이터 저장 (WeakMap)
    nodeMetadataStore.set(node, {
      zone: allocation.zone,
      relation,
      anchorId: effectiveAnchorId,  // Topic anchor 사용 시 Topic ID 저장
      createdAt: Date.now(),
    });

    // 7. Edge 생성 (정책에 따라 조건부)
    let edge: CanvasEdge | null = null;
    if (shouldCreateEdge(relation)) {
      const zoneSpec = ZONE_SPECS[allocation.zone];
      edge = CanvasParser.createEdge(effectiveAnchorId, nodeId, {
        fromSide: zoneSpec.edgeFrom,
        toSide: zoneSpec.edgeTo,
      });
      this.edges.push(edge);
    }

    // 8. 내부 상태 업데이트
    this.nodes.push(node);
    const zoneCount = this.zoneCounts.get(allocation.zone) ?? 0;
    this.zoneCounts.set(allocation.zone, zoneCount + 1);

    // 9. Visual Grouping 체크
    this.maybeCreateGroup(allocation.zone, anchor);

    // 10. 로그
    if (allocation.overflowed) {
      logger.info('Node allocated with zone overflow', {
        nodeId,
        originalZone: primaryZone,
        actualZone: allocation.zone,
        relation,
      });
    }

    return {
      node,
      edge,
      zone: allocation.zone,
      overflowed: allocation.overflowed,
    };
  }

  /**
   * 여러 노드를 의미적 관계 기반으로 배치합니다.
   * @param anchorId - 기본 anchor 노드 ID
   * @param items - 배치할 노드 목록
   * @param useTopicAsAnchor - true면 모든 노드를 Topic 기준으로 배치 (권장)
   */
  allocateMultiple(
    anchorId: string,
    items: Array<{
      relation: string;
      content: AllocateNodeOptions['content'];
      color?: string;
    }>,
    useTopicAsAnchor?: boolean
  ): AllocateResult[] {
    const results: AllocateResult[] = [];

    for (const item of items) {
      try {
        const result = this.allocateByRelation({
          anchorId,
          relation: item.relation,
          content: item.content,
          color: item.color,
          useTopicAsAnchor,
        });
        results.push(result);
      } catch (error) {
        logger.warn('Failed to allocate node in batch', {
          relation: item.relation,
          error: error instanceof Error ? error.message : String(error),
        });
        // 배치 작업에서는 개별 실패를 허용하고 계속 진행
      }
    }

    return results;
  }

  // ===========================================================================
  // Position Allocation with Fallback
  // ===========================================================================

  private allocateInZoneWithFallback(
    anchor: CanvasNode,
    primaryZone: Zone,
    nodeSize: { width: number; height: number }
  ): { position: NodePosition; zone: Zone; overflowed: boolean } | null {
    // 1. Primary Zone에서 시도
    const primaryPosition = this.findPositionInZone(anchor, primaryZone, nodeSize);
    if (primaryPosition) {
      return { position: primaryPosition, zone: primaryZone, overflowed: false };
    }

    logger.debug('Primary zone allocation failed, trying overflow', {
      primaryZone,
      nodeCount: this.zoneCounts.get(primaryZone),
    });

    // 2. Adjacent Zones로 overflow 시도
    const adjacentZones = ZONE_ADJACENCY[primaryZone] || [];
    for (const adjacentZone of adjacentZones) {
      const position = this.findPositionInZone(anchor, adjacentZone, nodeSize);
      if (position) {
        return { position, zone: adjacentZone, overflowed: true };
      }
    }

    // 3. 모든 Zone에서 시도 (최후의 수단)
    for (const zone of SemanticRouter.getAllZones()) {
      if (zone === primaryZone || adjacentZones.includes(zone)) continue;
      const position = this.findPositionInZone(anchor, zone, nodeSize);
      if (position) {
        logger.warn('Used fallback zone for allocation', {
          primaryZone,
          fallbackZone: zone,
        });
        return { position, zone, overflowed: true };
      }
    }

    return null;
  }

  private findPositionInZone(
    anchor: CanvasNode,
    zone: Zone,
    nodeSize: { width: number; height: number }
  ): NodePosition | null {
    const spec = ZONE_SPECS[zone];
    const { gridGap } = this.config;

    // Zone 기본 위치 계산
    const baseX = anchor.x + spec.dx * (anchor.width + gridGap * 2);
    const baseY = anchor.y + spec.dy * (anchor.height + gridGap * 2);

    // Zone 내 기존 노드들
    const zoneNodes = this.getNodesInZone(zone);

    // 1. 첫 번째 노드 또는 Column Stack 시도
    const simplePosition = this.trySimplePosition(
      baseX,
      baseY,
      zoneNodes,
      nodeSize,
      anchor
    );
    if (simplePosition && !this.checkCollision(simplePosition)) {
      return simplePosition;
    }

    // 2. 나선형 탐색
    const spiralPosition = this.spiralSearch(
      baseX,
      baseY,
      nodeSize,
      zone,
      spec.dx,
      spec.dy
    );
    if (spiralPosition) {
      return spiralPosition;
    }

    return null;
  }

  private trySimplePosition(
    baseX: number,
    baseY: number,
    zoneNodes: CanvasNode[],
    nodeSize: { width: number; height: number },
    _anchor: CanvasNode
  ): NodePosition | null {
    const { gridGap, maxColumnNodes } = this.config;

    if (zoneNodes.length === 0) {
      return {
        x: Math.round(baseX),
        y: Math.round(baseY),
        width: nodeSize.width,
        height: nodeSize.height,
      };
    }

    if (zoneNodes.length < maxColumnNodes) {
      // Column Stack: 기존 노드들 아래에 배치
      const lastNode = zoneNodes[zoneNodes.length - 1];
      return {
        x: Math.round(baseX),
        y: Math.round(lastNode.y + lastNode.height + gridGap),
        width: nodeSize.width,
        height: nodeSize.height,
      };
    }

    // Grid Packing: 2열 배치
    const row = Math.floor(zoneNodes.length / 2);
    const col = zoneNodes.length % 2;
    const avgHeight =
      zoneNodes.reduce((sum, n) => sum + n.height, 0) / zoneNodes.length;

    return {
      x: Math.round(baseX + col * (nodeSize.width + gridGap)),
      y: Math.round(baseY + row * (avgHeight + gridGap)),
      width: nodeSize.width,
      height: nodeSize.height,
    };
  }

  /**
   * 나선형 탐색 알고리즘
   * 중심점에서 시작하여 점점 넓어지는 나선형으로 빈 공간을 찾습니다.
   */
  private spiralSearch(
    centerX: number,
    centerY: number,
    nodeSize: { width: number; height: number },
    zone: Zone,
    dirX: number,
    dirY: number
  ): NodePosition | null {
    const { gridGap, maxSpiralRings } = this.config;
    const stepX = nodeSize.width + gridGap;
    const stepY = nodeSize.height + gridGap;

    // 나선형 방향은 Zone 방향에 따라 조정됨 (현재는 generateSpiralPoints에서 처리)
    // getSpiralDirections는 향후 방향 우선순위 최적화에 사용
    void this.getSpiralDirections(dirX, dirY);

    for (let ring = 1; ring <= maxSpiralRings; ring++) {
      // 각 ring에서 나선형으로 탐색
      for (const [dx, dy] of this.generateSpiralPoints(ring)) {
        const candidate: NodePosition = {
          x: Math.round(centerX + dx * stepX),
          y: Math.round(centerY + dy * stepY),
          width: nodeSize.width,
          height: nodeSize.height,
        };

        if (!this.checkCollision(candidate)) {
          logger.debug('Spiral search found position', {
            ring,
            zone,
            position: { x: candidate.x, y: candidate.y },
          });
          return candidate;
        }
      }
    }

    return null;
  }

  /**
   * 나선형 좌표 생성기
   */
  private *generateSpiralPoints(ring: number): Generator<[number, number]> {
    // 위쪽 변
    for (let x = -ring; x <= ring; x++) {
      yield [x, -ring];
    }
    // 오른쪽 변
    for (let y = -ring + 1; y <= ring; y++) {
      yield [ring, y];
    }
    // 아래쪽 변
    for (let x = ring - 1; x >= -ring; x--) {
      yield [x, ring];
    }
    // 왼쪽 변
    for (let y = ring - 1; y > -ring; y--) {
      yield [-ring, y];
    }
  }

  private getSpiralDirections(
    dirX: number,
    dirY: number
  ): Array<[number, number]> {
    // Zone 방향에 따라 탐색 우선순위 조정
    if (dirY > 0) return [[0, 1], [1, 0], [-1, 0], [0, -1]]; // SOUTH
    if (dirY < 0) return [[0, -1], [1, 0], [-1, 0], [0, 1]]; // NORTH
    if (dirX > 0) return [[1, 0], [0, 1], [0, -1], [-1, 0]]; // EAST
    if (dirX < 0) return [[-1, 0], [0, 1], [0, -1], [1, 0]]; // WEST
    return [[0, 1], [1, 0], [0, -1], [-1, 0]]; // default
  }

  private getAttemptedPositions(
    anchor: CanvasNode,
    zone: Zone,
    nodeSize: { width: number; height: number }
  ): Array<{ x: number; y: number }> {
    // 디버깅용: 시도한 위치들 반환
    const spec = ZONE_SPECS[zone];
    const { gridGap } = this.config;
    const baseX = anchor.x + spec.dx * (anchor.width + gridGap * 2);
    const baseY = anchor.y + spec.dy * (anchor.height + gridGap * 2);

    const positions: Array<{ x: number; y: number }> = [];
    for (let ring = 1; ring <= 5; ring++) {
      for (const [dx, dy] of this.generateSpiralPoints(ring)) {
        positions.push({
          x: Math.round(baseX + dx * (nodeSize.width + gridGap)),
          y: Math.round(baseY + dy * (nodeSize.height + gridGap)),
        });
      }
    }
    return positions.slice(0, 20);
  }

  // ===========================================================================
  // Collision Detection
  // ===========================================================================

  private checkCollision(
    candidate: NodePosition,
    excludeIds: string[] = []
  ): boolean {
    const { collisionPadding } = this.config;

    const cLeft = candidate.x - collisionPadding;
    const cRight = candidate.x + candidate.width + collisionPadding;
    const cTop = candidate.y - collisionPadding;
    const cBottom = candidate.y + candidate.height + collisionPadding;

    for (const node of this.nodes) {
      if (excludeIds.includes(node.id)) continue;
      if (node.type === 'group') continue;

      const nLeft = node.x;
      const nRight = node.x + node.width;
      const nTop = node.y;
      const nBottom = node.y + node.height;

      // AABB 충돌 검사
      if (cLeft < nRight && cRight > nLeft && cTop < nBottom && cBottom > nTop) {
        return true;
      }
    }

    return false;
  }

  // ===========================================================================
  // Node Creation
  // ===========================================================================

  private createNode(
    nodeId: string,
    content: AllocateNodeOptions['content'],
    position: NodePosition,
    color: string
  ): CanvasNode {
    switch (content.type) {
      case 'text':
        return CanvasParser.createTextNode({
          id: nodeId,
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          text: content.text || '',
          color,
        });

      case 'file':
        return CanvasParser.createFileNode({
          id: nodeId,
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          file: content.file || '',
          color,
        });

      case 'link':
        return CanvasParser.createLinkNode({
          id: nodeId,
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
          url: content.url || '',
          color,
        });

      default:
        throw new Error(`Unknown content type: ${content.type}`);
    }
  }

  // ===========================================================================
  // Visual Grouping
  // ===========================================================================

  private maybeCreateGroup(zone: Zone, _anchor: CanvasNode): GroupNode | null {
    const { groupThreshold, groupPadding } = this.config;
    const zoneCount = this.zoneCounts.get(zone) ?? 0;

    if (zoneCount < groupThreshold) {
      return null;
    }

    if (this.groups.has(zone)) {
      return this.expandGroup(zone);
    }

    const zoneNodes = this.getNodesInZone(zone);
    if (zoneNodes.length === 0) {
      return null;
    }

    const bounds = CanvasParser.getCanvasBounds(zoneNodes);

    const group = CanvasParser.createGroupNode({
      x: bounds.minX - groupPadding,
      y: bounds.minY - groupPadding,
      width: bounds.width + 2 * groupPadding,
      height: bounds.height + 2 * groupPadding,
      label: SemanticRouter.getZoneLabel(zone),
      color: ZONE_SPECS[zone].defaultColor,
    });

    this.nodes.push(group);
    this.groups.set(zone, group.id);

    return group;
  }

  private expandGroup(zone: Zone): GroupNode | null {
    const groupId = this.groups.get(zone);
    if (!groupId) return null;

    const group = this.findNode(groupId);
    if (!group) return null;

    const zoneNodes = this.getNodesInZone(zone).filter((n) => n.id !== groupId);
    if (zoneNodes.length === 0) return group as GroupNode;

    const bounds = CanvasParser.getCanvasBounds(zoneNodes);
    const { groupPadding } = this.config;

    (group as GroupNode).x = bounds.minX - groupPadding;
    (group as GroupNode).y = bounds.minY - groupPadding;
    (group as GroupNode).width = bounds.width + 2 * groupPadding;
    (group as GroupNode).height = bounds.height + 2 * groupPadding;

    return group as GroupNode;
  }

  // ===========================================================================
  // Zone Queries
  // ===========================================================================

  private getNodesInZone(zone: Zone): CanvasNode[] {
    return this.nodes.filter((node) => {
      const meta = nodeMetadataStore.get(node);
      return meta?.zone === zone;
    });
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private findNode(nodeId: string): CanvasNode | undefined {
    return this.nodes.find((n) => n.id === nodeId);
  }

  /**
   * Topic(CORE) 노드를 찾습니다.
   * 1순위: CORE Zone 메타데이터가 있는 노드
   * 2순위: '# '로 시작하는 텍스트 노드 (Topic 형식)
   * 3순위: 가장 먼저 생성된 텍스트 노드
   */
  private findTopicNode(): CanvasNode | undefined {
    // 1순위: CORE Zone 메타데이터
    for (const node of this.nodes) {
      const meta = nodeMetadataStore.get(node);
      if (meta?.zone === 'CORE') {
        return node;
      }
    }

    // 2순위: '# '로 시작하는 텍스트 노드
    const textNodes = this.nodes.filter(
      (n) => n.type === 'text' && 'text' in n
    ) as Array<CanvasNode & { text: string }>;

    const topicByFormat = textNodes.find((n) => n.text.startsWith('# '));
    if (topicByFormat) {
      return topicByFormat;
    }

    // 3순위: 첫 번째 텍스트 노드 (가장 오래된 것으로 가정)
    if (textNodes.length > 0) {
      return textNodes[0];
    }

    return undefined;
  }

  /**
   * 현재 노드 리스트를 반환합니다.
   * WeakMap을 사용하므로 별도의 클린업 불필요
   */
  getNodes(): CanvasNode[] {
    return [...this.nodes];
  }

  /**
   * 현재 엣지 리스트를 반환합니다.
   */
  getEdges(): CanvasEdge[] {
    return [...this.edges];
  }

  /**
   * 노드를 추가합니다.
   */
  addNode(node: CanvasNode, metadata?: { zone: Zone; relation: string; anchorId: string }): void {
    this.nodes.push(node);
    if (metadata) {
      nodeMetadataStore.set(node, { ...metadata, createdAt: Date.now() });
      const count = this.zoneCounts.get(metadata.zone) ?? 0;
      this.zoneCounts.set(metadata.zone, count + 1);
    }
  }

  /**
   * 엣지를 추가합니다.
   */
  addEdge(edge: CanvasEdge): void {
    this.edges.push(edge);
  }

  /**
   * Zone별 노드 카운트를 반환합니다.
   */
  getZoneCounts(): Record<string, number> {
    return Object.fromEntries(this.zoneCounts);
  }

  /**
   * 노드의 메타데이터를 조회합니다.
   */
  getNodeMetadata(node: CanvasNode): NodeMetadata | undefined {
    return nodeMetadataStore.get(node);
  }

  /**
   * 초기 캔버스 레이아웃을 생성합니다 (Topic 노드 포함).
   */
  createInitialLayout(
    topic: string,
    options?: {
      vaultNotes?: string[];
      questions?: string[];
    }
  ): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    // Topic 노드 (중앙)
    const topicText = `# ${topic}`;
    const topicSize = calculateTextNodeSize(topicText);
    const topicWidth = Math.max(topicSize.width, 450);
    const topicHeight = Math.max(topicSize.height, 120);

    const topicNode = CanvasParser.createTextNode({
      x: 0,
      y: 0,
      width: topicWidth,
      height: topicHeight,
      text: topicText,
      color: '6',
    });

    this.addNode(topicNode, { zone: 'CORE', relation: 'topic', anchorId: '' });

    // 볼트 노트들 (왼쪽)
    if (options?.vaultNotes) {
      for (const notePath of options.vaultNotes.slice(0, 5)) {
        try {
          this.allocateByRelation({
            anchorId: topicNode.id,
            relation: 'background',
            content: { type: 'file', file: notePath },
            color: '1',
          });
        } catch (error) {
          logger.warn('Failed to add vault note', { notePath, error: String(error) });
        }
      }
    }

    // 질문들 (오른쪽)
    if (options?.questions) {
      for (const question of options.questions.slice(0, 5)) {
        try {
          const qText = question.startsWith('?') ? question : `? ${question}`;
          this.allocateByRelation({
            anchorId: topicNode.id,
            relation: 'followUp',
            content: { type: 'text', text: qText },
            color: '4',
          });
        } catch (error) {
          logger.warn('Failed to add question', { question, error: String(error) });
        }
      }
    }

    return { nodes: this.getNodes(), edges: this.getEdges() };
  }
}
