/**
 * Cross Reference Manager
 *
 * 캔버스 간 상호 참조 및 연결을 관리합니다.
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join, relative, extname } from 'path';
import type {
  CanvasReference,
  CrossReferenceIndex,
  CanvasNetwork,
  CanvasNetworkNode,
  CanvasNetworkEdge,
} from '../types/index.js';
import { CanvasParser } from './canvas-parser.js';
import { MetaManager } from './meta-manager.js';

// =============================================================================
// Configuration
// =============================================================================

const INDEX_FILE = '.cross_reference.json';

// =============================================================================
// Cross Reference Manager Class
// =============================================================================

export class CrossReferenceManager {
  private readonly canvasDir: string;
  private readonly indexPath: string;
  private index: CrossReferenceIndex | null = null;
  private metaManager: MetaManager;

  constructor(canvasDir: string = '03_Canvas') {
    this.canvasDir = canvasDir;
    this.indexPath = join(canvasDir, INDEX_FILE);
    this.metaManager = new MetaManager(canvasDir);
  }

  // ===========================================================================
  // Index Building
  // ===========================================================================

  /**
   * 크로스 레퍼런스 인덱스 빌드
   */
  async buildIndex(force = false): Promise<CrossReferenceIndex> {
    if (!force) {
      try {
        this.index = await this.loadIndex();
      } catch {
        this.index = this.createEmptyIndex();
      }
    } else {
      this.index = this.createEmptyIndex();
    }

    // 모든 캔버스 파일 스캔
    const canvasFiles = await this.findCanvasFiles(this.canvasDir);

    for (const canvasPath of canvasFiles) {
      const relativePath = relative('.', canvasPath);
      const info = await this.extractCanvasInfo(canvasPath);
      if (info) {
        this.index.canvases[relativePath] = info;
      }
    }

    // 공유 키워드 계산
    this.buildSharedKeywords();

    // 관련 캔버스 계산
    this.buildRelatedCanvases();

    // 메타데이터 업데이트
    this.index.indexedAt = new Date().toISOString();

    // 저장
    await this.saveIndex();

    return this.index;
  }

  /**
   * 캔버스에서 정보 추출
   */
  private async extractCanvasInfo(canvasPath: string): Promise<CanvasReference | null> {
    try {
      const canvas = await CanvasParser.load(canvasPath);
      const nodes = canvas.nodes;
      const edges = canvas.edges;

      // Topic 노드 찾기 (purple 색상 또는 첫 번째 # 헤딩)
      let topic = '';
      const keywords: string[] = [];
      const linkedNotes: string[] = [];
      const questions: string[] = [];

      for (const node of nodes) {
        if (node.type === 'text') {
          const text = node.text;
          const color = node.color;

          // Topic 추출
          if (color === '6' || (text.startsWith('# ') && !topic)) {
            topic = text.replace(/^#\s+/, '').trim();
          }

          // 키워드 추출 (볼드, 헤딩)
          const bolds = text.match(/\*\*(.+?)\*\*/g);
          if (bolds) {
            keywords.push(...bolds.map((b) => b.replace(/\*\*/g, '')));
          }

          const headings = text.match(/^#+\s+(.+)$/gm);
          if (headings) {
            keywords.push(...headings.map((h) => h.replace(/^#+\s+/, '')));
          }

          // 질문 추출
          if (text.includes('?')) {
            questions.push(text.slice(0, 100));
          }
        }

        // 볼트 노트 링크
        if (node.type === 'file') {
          linkedNotes.push(node.file);
        }
      }

      // 워크플로우 상태 가져오기
      let workflowState = 'created';
      try {
        workflowState = await this.metaManager.getWorkflowState(canvasPath);
      } catch {
        // 메타 없음
      }

      return {
        canvasPath: relative('.', canvasPath),
        topic,
        keywords: [...new Set(keywords)].slice(0, 20),
        linkedNotes,
        linkedCanvases: [],
        questions: questions.slice(0, 5),
        nodeCount: nodes.length,
        edgeCount: edges.length,
        workflowState,
        updatedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.warn(`Warning: Failed to extract info from ${canvasPath}:`, e);
      return null;
    }
  }

  private buildSharedKeywords(): void {
    if (!this.index) return;

    this.index.sharedKeywords = {};

    for (const [path, ref] of Object.entries(this.index.canvases)) {
      for (const keyword of ref.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (!this.index.sharedKeywords[keywordLower]) {
          this.index.sharedKeywords[keywordLower] = [];
        }
        if (!this.index.sharedKeywords[keywordLower].includes(path)) {
          this.index.sharedKeywords[keywordLower].push(path);
        }
      }
    }
  }

  private buildRelatedCanvases(): void {
    if (!this.index) return;

    this.index.relatedCanvases = {};

    for (const [path1, canvas1] of Object.entries(this.index.canvases)) {
      const scores: Record<string, number> = {};

      for (const [path2, canvas2] of Object.entries(this.index.canvases)) {
        if (path1 === path2) continue;

        const score = this.calculateSimilarity(canvas1, canvas2);
        if (score > 0) {
          scores[path2] = score;
        }
      }

      // 점수순 정렬
      const sortedRelated = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5) as Array<[string, number]>;

      this.index.relatedCanvases[path1] = sortedRelated;
    }
  }

  private calculateSimilarity(canvas1: CanvasReference, canvas2: CanvasReference): number {
    let score = 0;

    // 공유 키워드 수
    const keywords1 = new Set(canvas1.keywords.map((k) => k.toLowerCase()));
    const keywords2 = new Set(canvas2.keywords.map((k) => k.toLowerCase()));
    const sharedKeywords = [...keywords1].filter((k) => keywords2.has(k));
    score += sharedKeywords.length * 2;

    // 공유 노트 연결
    const notes1 = new Set(canvas1.linkedNotes);
    const notes2 = new Set(canvas2.linkedNotes);
    const sharedNotes = [...notes1].filter((n) => notes2.has(n));
    score += sharedNotes.length * 5;

    // Topic 유사성 (단어 겹침)
    const topicWords1 = new Set(canvas1.topic.toLowerCase().split(/\s+/));
    const topicWords2 = new Set(canvas2.topic.toLowerCase().split(/\s+/));
    const sharedTopic = [...topicWords1].filter((w) => topicWords2.has(w));
    score += sharedTopic.length * 3;

    return score;
  }

  // ===========================================================================
  // API
  // ===========================================================================

  /**
   * 특정 캔버스와 관련된 캔버스들 조회
   */
  async getRelatedCanvases(
    canvasPath: string,
    limit = 5
  ): Promise<Array<{ path: string; score: number }>> {
    await this.ensureIndex();

    const related = this.index!.relatedCanvases[canvasPath] || [];
    return related.slice(0, limit).map(([path, score]) => ({ path, score }));
  }

  /**
   * 키워드로 캔버스 검색
   */
  async findCanvasesByKeyword(keyword: string): Promise<string[]> {
    await this.ensureIndex();
    return this.index!.sharedKeywords[keyword.toLowerCase()] || [];
  }

  /**
   * 캔버스 네트워크 데이터 생성 (시각화용)
   */
  async getCanvasNetwork(): Promise<CanvasNetwork> {
    await this.ensureIndex();

    const nodes: CanvasNetworkNode[] = [];
    const edges: CanvasNetworkEdge[] = [];
    const edgeSet = new Set<string>();

    for (const [path, ref] of Object.entries(this.index!.canvases)) {
      nodes.push({
        id: path,
        topic: ref.topic,
        size: ref.nodeCount,
        state: ref.workflowState,
      });
    }

    for (const [path, related] of Object.entries(this.index!.relatedCanvases)) {
      for (const [target, score] of related) {
        // 양방향 중복 제거
        const edgeKey = [path, target].sort().join('|');
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            source: path,
            target,
            weight: score,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * 캔버스에 추가할 링크 제안
   */
  async suggestCanvasLinks(
    canvasPath: string
  ): Promise<Array<{ canvas: string; topic: string; reason: string; score: number }>> {
    await this.ensureIndex();

    const canvas = this.index!.canvases[canvasPath];
    if (!canvas) return [];

    const suggestions: Array<{
      canvas: string;
      topic: string;
      reason: string;
      score: number;
    }> = [];

    const related = await this.getRelatedCanvases(canvasPath);

    for (const { path: relatedPath, score } of related) {
      if (canvas.linkedCanvases.includes(relatedPath)) continue;

      const relatedCanvas = this.index!.canvases[relatedPath];
      if (!relatedCanvas) continue;

      // 공유 키워드 찾기
      const shared = canvas.keywords
        .filter((k) =>
          relatedCanvas.keywords.map((rk) => rk.toLowerCase()).includes(k.toLowerCase())
        )
        .slice(0, 3);

      suggestions.push({
        canvas: relatedPath,
        topic: relatedCanvas.topic,
        reason: `공유 키워드: ${shared.join(', ')}`,
        score,
      });
    }

    return suggestions;
  }

  /**
   * 통계
   */
  async getStatistics(): Promise<{
    totalCanvases: number;
    byState: Record<string, number>;
    topSharedKeywords: Array<[string, number]>;
    mostConnected: Array<{ path: string; topic: string; connections: number }>;
  }> {
    await this.ensureIndex();

    // 상태별 캔버스 수
    const byState: Record<string, number> = {};
    for (const canvas of Object.values(this.index!.canvases)) {
      byState[canvas.workflowState] = (byState[canvas.workflowState] || 0) + 1;
    }

    // 가장 많이 공유되는 키워드
    const topSharedKeywords = Object.entries(this.index!.sharedKeywords)
      .map(([keyword, paths]) => [keyword, paths.length] as [string, number])
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 가장 많이 연결된 캔버스
    const mostConnected = Object.entries(this.index!.canvases)
      .map(([path, canvas]) => ({
        path,
        topic: canvas.topic,
        connections: canvas.linkedNotes.length + canvas.linkedCanvases.length,
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 5);

    return {
      totalCanvases: Object.keys(this.index!.canvases).length,
      byState,
      topSharedKeywords,
      mostConnected,
    };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private async findCanvasFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          files.push(...(await this.findCanvasFiles(fullPath)));
        } else if (entry.isFile() && extname(entry.name) === '.canvas') {
          files.push(fullPath);
        }
      }
    } catch {
      // 디렉토리 없음
    }

    return files;
  }

  private createEmptyIndex(): CrossReferenceIndex {
    return {
      version: '1.0',
      indexedAt: new Date().toISOString(),
      canvases: {},
      sharedKeywords: {},
      relatedCanvases: {},
    };
  }

  private async loadIndex(): Promise<CrossReferenceIndex> {
    const content = await readFile(this.indexPath, 'utf-8');
    return JSON.parse(content);
  }

  private async saveIndex(): Promise<void> {
    if (!this.index) return;
    await writeFile(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  private async ensureIndex(): Promise<void> {
    if (!this.index) {
      try {
        this.index = await this.loadIndex();
      } catch {
        this.index = await this.buildIndex();
      }
    }
  }
}
