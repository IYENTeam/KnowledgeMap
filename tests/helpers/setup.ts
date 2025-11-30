/**
 * Test Setup and Utilities
 *
 * 테스트를 위한 공통 설정 및 헬퍼 함수들
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { vol, fs as memfs } from 'memfs';

// =============================================================================
// File System Mock Setup
// =============================================================================

/**
 * 메모리 파일시스템으로 fs/promises 모킹
 */
export function setupMemfs() {
  vi.mock('fs/promises', async () => {
    const memfsModule = await import('memfs');
    return memfsModule.fs.promises;
  });
}

/**
 * 각 테스트 전에 볼륨 초기화
 */
export function resetVolume() {
  vol.reset();
}

/**
 * 테스트용 볼트 구조 생성
 */
export function createTestVault(basePath: string = '/test-vault') {
  const structure: Record<string, string> = {
    [`${basePath}/note1.md`]: `---
tags: [test, example]
---
# Note 1

This is a test note about **machine learning** and [[AI]].

## Section 1
Some content here.
`,
    [`${basePath}/note2.md`]: `---
tags: [test, programming]
---
# Note 2

A note about **programming** and \`code\`.

- Item 1
- Item 2
`,
    [`${basePath}/subfolder/note3.md`]: `# Deep Note

Content in subfolder with [[note1]] link.
`,
    [`${basePath}/03_Canvas/.meta/.gitkeep`]: '',
  };

  vol.fromJSON(structure);
  return basePath;
}

/**
 * 테스트용 캔버스 생성
 */
export function createTestCanvas(
  canvasPath: string,
  options?: {
    topic?: string;
    nodes?: any[];
    edges?: any[];
  }
) {
  const topic = options?.topic || 'Test Topic';
  const nodes = options?.nodes || [
    {
      id: 'topic-node',
      type: 'text',
      x: 0,
      y: 0,
      width: 400,
      height: 100,
      text: `# ${topic}`,
      color: '6',
    },
  ];
  const edges = options?.edges || [];

  const canvas = { nodes, edges };

  // 디렉토리 생성
  const dir = canvasPath.substring(0, canvasPath.lastIndexOf('/'));
  vol.mkdirSync(dir, { recursive: true });

  vol.writeFileSync(canvasPath, JSON.stringify(canvas, null, 2));

  return { canvasPath, canvas };
}

// =============================================================================
// Test Fixtures
// =============================================================================

export const FIXTURES = {
  /**
   * 기본 텍스트 노드
   */
  textNode: (overrides?: Partial<any>) => ({
    id: `text-${Date.now()}`,
    type: 'text',
    x: 0,
    y: 0,
    width: 400,
    height: 150,
    text: 'Test content',
    ...overrides,
  }),

  /**
   * 기본 파일 노드
   */
  fileNode: (overrides?: Partial<any>) => ({
    id: `file-${Date.now()}`,
    type: 'file',
    x: 0,
    y: 0,
    width: 300,
    height: 100,
    file: 'test-note.md',
    ...overrides,
  }),

  /**
   * 기본 링크 노드
   */
  linkNode: (overrides?: Partial<any>) => ({
    id: `link-${Date.now()}`,
    type: 'link',
    x: 0,
    y: 0,
    width: 300,
    height: 80,
    url: 'https://example.com',
    ...overrides,
  }),

  /**
   * 기본 그룹 노드
   */
  groupNode: (overrides?: Partial<any>) => ({
    id: `group-${Date.now()}`,
    type: 'group',
    x: 0,
    y: 0,
    width: 500,
    height: 400,
    label: 'Test Group',
    ...overrides,
  }),

  /**
   * 기본 엣지
   */
  edge: (fromNode: string, toNode: string, overrides?: Partial<any>) => ({
    id: `edge-${Date.now()}`,
    fromNode,
    toNode,
    fromSide: 'right',
    toSide: 'left',
    ...overrides,
  }),

  /**
   * 질문 노드
   */
  questionNode: (question: string, overrides?: Partial<any>) => ({
    id: `question-${Date.now()}`,
    type: 'text',
    x: 0,
    y: 0,
    width: 350,
    height: 100,
    text: `? ${question}`,
    color: '4',
    ...overrides,
  }),

  /**
   * 답변 노드
   */
  answerNode: (answer: string, overrides?: Partial<any>) => ({
    id: `answer-${Date.now()}`,
    type: 'text',
    x: 0,
    y: 0,
    width: 400,
    height: 200,
    text: answer,
    color: '3',
    ...overrides,
  }),

  /**
   * 빈 캔버스
   */
  emptyCanvas: () => ({
    nodes: [],
    edges: [],
  }),

  /**
   * 기본 캔버스 (토픽 노드 포함)
   */
  basicCanvas: (topic: string = 'Test Topic') => ({
    nodes: [
      {
        id: 'topic-1',
        type: 'text',
        x: 0,
        y: 0,
        width: 450,
        height: 120,
        text: `# ${topic}`,
        color: '6',
      },
    ],
    edges: [],
  }),

  /**
   * 복잡한 캔버스 (여러 노드와 엣지)
   */
  complexCanvas: () => ({
    nodes: [
      {
        id: 'topic-1',
        type: 'text',
        x: 0,
        y: 0,
        width: 450,
        height: 120,
        text: '# Machine Learning',
        color: '6',
      },
      {
        id: 'question-1',
        type: 'text',
        x: 500,
        y: 0,
        width: 350,
        height: 100,
        text: '? What is supervised learning?',
        color: '4',
      },
      {
        id: 'answer-1',
        type: 'text',
        x: 0,
        y: 200,
        width: 400,
        height: 200,
        text: 'Supervised learning uses labeled data...',
        color: '3',
      },
      {
        id: 'file-1',
        type: 'file',
        x: -400,
        y: 0,
        width: 300,
        height: 100,
        file: 'notes/ml-basics.md',
        color: '1',
      },
    ],
    edges: [
      {
        id: 'edge-1',
        fromNode: 'topic-1',
        toNode: 'answer-1',
        fromSide: 'bottom',
        toSide: 'top',
      },
    ],
  }),
};

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * 노드가 특정 범위 내에 있는지 확인
 */
export function expectNodeInBounds(
  node: { x: number; y: number; width: number; height: number },
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
) {
  expect(node.x).toBeGreaterThanOrEqual(bounds.minX);
  expect(node.x + node.width).toBeLessThanOrEqual(bounds.maxX);
  expect(node.y).toBeGreaterThanOrEqual(bounds.minY);
  expect(node.y + node.height).toBeLessThanOrEqual(bounds.maxY);
}

/**
 * 두 노드가 충돌하는지 확인
 */
export function nodesCollide(
  nodeA: { x: number; y: number; width: number; height: number },
  nodeB: { x: number; y: number; width: number; height: number },
  padding: number = 0
): boolean {
  const aLeft = nodeA.x - padding;
  const aRight = nodeA.x + nodeA.width + padding;
  const aTop = nodeA.y - padding;
  const aBottom = nodeA.y + nodeA.height + padding;

  const bLeft = nodeB.x;
  const bRight = nodeB.x + nodeB.width;
  const bTop = nodeB.y;
  const bBottom = nodeB.y + nodeB.height;

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
}

/**
 * 배열에 중복이 없는지 확인
 */
export function expectNoDuplicates<T>(array: T[], keyFn?: (item: T) => string) {
  const seen = new Set<string>();
  for (const item of array) {
    const key = keyFn ? keyFn(item) : String(item);
    expect(seen.has(key)).toBe(false);
    seen.add(key);
  }
}

// =============================================================================
// Time Helpers
// =============================================================================

/**
 * 작업 실행 시간 측정
 */
export async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * 작업이 특정 시간 내에 완료되는지 확인
 */
export async function expectWithinTime<T>(
  fn: () => Promise<T>,
  maxMs: number
): Promise<T> {
  const { result, duration } = await measureTime(fn);
  expect(duration).toBeLessThan(maxMs);
  return result;
}

// =============================================================================
// Mock Factories
// =============================================================================

/**
 * UUID 생성 모킹
 */
export function mockUuid(values: string[]) {
  let index = 0;
  return vi.fn(() => {
    const value = values[index % values.length];
    index++;
    return value;
  });
}

/**
 * Date.now() 모킹
 */
export function mockDateNow(timestamp: number) {
  return vi.spyOn(Date, 'now').mockReturnValue(timestamp);
}

/**
 * console.log/warn/error 캡처
 */
export function captureConsole() {
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => logs.push(args.join(' '));
  console.warn = (...args) => warns.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));

  return {
    logs,
    warns,
    errors,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

// =============================================================================
// Export for convenience
// =============================================================================

export { vol, memfs, vi };
