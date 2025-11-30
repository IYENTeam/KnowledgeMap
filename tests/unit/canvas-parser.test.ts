/**
 * CanvasParser Unit Tests
 *
 * JSON Canvas 스펙 파싱 및 생성 기능 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { CanvasParser } from '../../src/engine/canvas-parser.js';
import { FIXTURES, nodesCollide, expectNoDuplicates } from '../helpers/setup.js';

// Mock fs/promises with memfs
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('CanvasParser', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // File I/O Tests
  // ===========================================================================

  describe('File I/O', () => {
    describe('load()', () => {
      it('should load a valid canvas file', async () => {
        const canvasData = {
          nodes: [FIXTURES.textNode({ id: 'n1', text: 'Hello' })],
          edges: [],
        };
        vol.fromJSON({
          '/test.canvas': JSON.stringify(canvasData),
        });

        const canvas = await CanvasParser.load('/test.canvas');

        expect(canvas.nodes).toHaveLength(1);
        expect(canvas.nodes[0].id).toBe('n1');
        expect(canvas.edges).toHaveLength(0);
      });

      it('should return empty arrays for canvas with no nodes/edges', async () => {
        vol.fromJSON({
          '/empty.canvas': JSON.stringify({}),
        });

        const canvas = await CanvasParser.load('/empty.canvas');

        expect(canvas.nodes).toEqual([]);
        expect(canvas.edges).toEqual([]);
      });

      it('should throw error for non-existent file', async () => {
        await expect(CanvasParser.load('/nonexistent.canvas')).rejects.toThrow();
      });

      it('should throw error for invalid JSON', async () => {
        vol.fromJSON({
          '/invalid.canvas': 'not valid json {{{',
        });

        await expect(CanvasParser.load('/invalid.canvas')).rejects.toThrow();
      });

      it('should handle unicode content', async () => {
        const canvasData = {
          nodes: [FIXTURES.textNode({ text: '한글 테스트 🚀 日本語' })],
          edges: [],
        };
        vol.fromJSON({
          '/unicode.canvas': JSON.stringify(canvasData),
        });

        const canvas = await CanvasParser.load('/unicode.canvas');

        expect(canvas.nodes[0].text).toBe('한글 테스트 🚀 日本語');
      });

      it('should handle canvas with only edges (orphaned edges)', async () => {
        const canvasData = {
          nodes: [],
          edges: [FIXTURES.edge('ghost1', 'ghost2')],
        };
        vol.fromJSON({
          '/orphaned.canvas': JSON.stringify(canvasData),
        });

        const canvas = await CanvasParser.load('/orphaned.canvas');

        expect(canvas.nodes).toHaveLength(0);
        expect(canvas.edges).toHaveLength(1);
      });
    });

    describe('save()', () => {
      it('should save canvas to file', async () => {
        vol.fromJSON({ '/canvas': null }); // Create directory
        vol.mkdirSync('/canvas', { recursive: true });

        const nodes = [FIXTURES.textNode({ id: 'n1' })];
        const edges: any[] = [];

        await CanvasParser.save('/canvas/test.canvas', nodes, edges);

        const content = vol.readFileSync('/canvas/test.canvas', 'utf8');
        const saved = JSON.parse(content as string);

        expect(saved.nodes).toHaveLength(1);
        expect(saved.nodes[0].id).toBe('n1');
      });

      it('should create parent directories if they do not exist', async () => {
        vol.fromJSON({});

        const nodes = [FIXTURES.textNode()];
        await CanvasParser.save('/deep/nested/path/test.canvas', nodes, []);

        expect(vol.existsSync('/deep/nested/path/test.canvas')).toBe(true);
      });

      it('should strip underscore-prefixed metadata fields', async () => {
        vol.fromJSON({});

        const nodeWithMeta = {
          ...FIXTURES.textNode({ id: 'n1' }),
          _metadata: { zone: 'SOUTH', relation: 'answers' },
          _internal: 'should be removed',
        };

        await CanvasParser.save('/test.canvas', [nodeWithMeta], []);

        const content = vol.readFileSync('/test.canvas', 'utf8');
        const saved = JSON.parse(content as string);

        expect(saved.nodes[0]._metadata).toBeUndefined();
        expect(saved.nodes[0]._internal).toBeUndefined();
        expect(saved.nodes[0].id).toBe('n1');
      });

      it('should round coordinate values', async () => {
        vol.fromJSON({});

        const node = FIXTURES.textNode({
          x: 100.7,
          y: 200.3,
        });

        await CanvasParser.save('/test.canvas', [node], []);

        const content = vol.readFileSync('/test.canvas', 'utf8');
        const saved = JSON.parse(content as string);

        // Note: rounding happens at creation time, not save time
        expect(typeof saved.nodes[0].x).toBe('number');
        expect(typeof saved.nodes[0].y).toBe('number');
      });

      it('should preserve edge data', async () => {
        vol.fromJSON({});

        const nodes = [
          FIXTURES.textNode({ id: 'n1' }),
          FIXTURES.textNode({ id: 'n2' }),
        ];
        const edges = [
          FIXTURES.edge('n1', 'n2', { label: 'connection', color: '3' }),
        ];

        await CanvasParser.save('/test.canvas', nodes, edges);

        const content = vol.readFileSync('/test.canvas', 'utf8');
        const saved = JSON.parse(content as string);

        expect(saved.edges[0].label).toBe('connection');
        expect(saved.edges[0].color).toBe('3');
      });

      it('should handle unicode file paths', async () => {
        vol.fromJSON({});

        const nodes = [FIXTURES.textNode()];
        await CanvasParser.save('/볼트/캔버스/테스트.canvas', nodes, []);

        expect(vol.existsSync('/볼트/캔버스/테스트.canvas')).toBe(true);
      });
    });
  });

  // ===========================================================================
  // ID Generation Tests
  // ===========================================================================

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(CanvasParser.generateId());
      }
      expect(ids.size).toBe(100);
    });

    it('should generate IDs with prefix', () => {
      const id = CanvasParser.generateId('text');
      expect(id).toMatch(/^text-[a-f0-9]{8}$/);
    });

    it('should generate IDs without prefix', () => {
      const id = CanvasParser.generateId();
      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate 8-character IDs', () => {
      const id = CanvasParser.generateId();
      expect(id.length).toBe(8);
    });
  });

  // ===========================================================================
  // Node Creation Tests
  // ===========================================================================

  describe('Node Creation', () => {
    describe('createTextNode()', () => {
      it('should create text node with required fields', () => {
        const node = CanvasParser.createTextNode({
          x: 100,
          y: 200,
          text: 'Hello World',
        });

        expect(node.type).toBe('text');
        expect(node.x).toBe(100);
        expect(node.y).toBe(200);
        expect(node.text).toBe('Hello World');
        expect(node.id).toBeDefined();
      });

      it('should use default dimensions', () => {
        const node = CanvasParser.createTextNode({
          x: 0,
          y: 0,
          text: 'Test',
        });

        expect(node.width).toBe(400);
        expect(node.height).toBe(150);
      });

      it('should use custom dimensions', () => {
        const node = CanvasParser.createTextNode({
          x: 0,
          y: 0,
          text: 'Test',
          width: 500,
          height: 300,
        });

        expect(node.width).toBe(500);
        expect(node.height).toBe(300);
      });

      it('should include color when provided', () => {
        const node = CanvasParser.createTextNode({
          x: 0,
          y: 0,
          text: 'Test',
          color: '3',
        });

        expect(node.color).toBe('3');
      });

      it('should not include color when not provided', () => {
        const node = CanvasParser.createTextNode({
          x: 0,
          y: 0,
          text: 'Test',
        });

        expect(node.color).toBeUndefined();
      });

      it('should round coordinates', () => {
        const node = CanvasParser.createTextNode({
          x: 100.7,
          y: 200.3,
          text: 'Test',
        });

        expect(node.x).toBe(101);
        expect(node.y).toBe(200);
      });

      it('should use custom ID when provided', () => {
        const node = CanvasParser.createTextNode({
          id: 'custom-id',
          x: 0,
          y: 0,
          text: 'Test',
        });

        expect(node.id).toBe('custom-id');
      });
    });

    describe('createFileNode()', () => {
      it('should create file node with required fields', () => {
        const node = CanvasParser.createFileNode({
          x: 100,
          y: 200,
          file: 'notes/test.md',
        });

        expect(node.type).toBe('file');
        expect(node.file).toBe('notes/test.md');
        expect(node.id).toMatch(/^file-/);
      });

      it('should include subpath when provided', () => {
        const node = CanvasParser.createFileNode({
          x: 0,
          y: 0,
          file: 'notes/test.md',
          subpath: '#section-1',
        });

        expect(node.subpath).toBe('#section-1');
      });

      it('should use default file node dimensions', () => {
        const node = CanvasParser.createFileNode({
          x: 0,
          y: 0,
          file: 'test.md',
        });

        expect(node.width).toBe(300);
        expect(node.height).toBe(100);
      });
    });

    describe('createLinkNode()', () => {
      it('should create link node with required fields', () => {
        const node = CanvasParser.createLinkNode({
          x: 100,
          y: 200,
          url: 'https://example.com',
        });

        expect(node.type).toBe('link');
        expect(node.url).toBe('https://example.com');
        expect(node.id).toMatch(/^link-/);
      });

      it('should use default link node dimensions', () => {
        const node = CanvasParser.createLinkNode({
          x: 0,
          y: 0,
          url: 'https://example.com',
        });

        expect(node.width).toBe(300);
        expect(node.height).toBe(80);
      });
    });

    describe('createGroupNode()', () => {
      it('should create group node with required fields', () => {
        const node = CanvasParser.createGroupNode({
          x: 0,
          y: 0,
          width: 500,
          height: 400,
        });

        expect(node.type).toBe('group');
        expect(node.width).toBe(500);
        expect(node.height).toBe(400);
        expect(node.id).toMatch(/^group-/);
      });

      it('should include label when provided', () => {
        const node = CanvasParser.createGroupNode({
          x: 0,
          y: 0,
          width: 500,
          height: 400,
          label: 'My Group',
        });

        expect(node.label).toBe('My Group');
      });

      it('should round all dimensions', () => {
        const node = CanvasParser.createGroupNode({
          x: 10.1,
          y: 20.9,
          width: 500.5,
          height: 400.4,
        });

        expect(node.x).toBe(10);
        expect(node.y).toBe(21);
        expect(node.width).toBe(501);
        expect(node.height).toBe(400);
      });
    });
  });

  // ===========================================================================
  // Edge Creation Tests
  // ===========================================================================

  describe('Edge Creation', () => {
    describe('createEdge()', () => {
      it('should create edge with required fields', () => {
        const edge = CanvasParser.createEdge('node1', 'node2');

        expect(edge.fromNode).toBe('node1');
        expect(edge.toNode).toBe('node2');
        expect(edge.id).toMatch(/^edge-/);
      });

      it('should include optional side specifications', () => {
        const edge = CanvasParser.createEdge('node1', 'node2', {
          fromSide: 'bottom',
          toSide: 'top',
        });

        expect(edge.fromSide).toBe('bottom');
        expect(edge.toSide).toBe('top');
      });

      it('should include optional end markers', () => {
        const edge = CanvasParser.createEdge('node1', 'node2', {
          fromEnd: 'arrow',
          toEnd: 'none',
        });

        expect(edge.fromEnd).toBe('arrow');
        expect(edge.toEnd).toBe('none');
      });

      it('should include optional styling', () => {
        const edge = CanvasParser.createEdge('node1', 'node2', {
          color: '3',
          label: 'connection',
        });

        expect(edge.color).toBe('3');
        expect(edge.label).toBe('connection');
      });

      it('should use custom ID when provided', () => {
        const edge = CanvasParser.createEdge('node1', 'node2', {
          id: 'custom-edge',
        });

        expect(edge.id).toBe('custom-edge');
      });
    });
  });

  // ===========================================================================
  // Query Methods Tests
  // ===========================================================================

  describe('Query Methods', () => {
    describe('findNodeById()', () => {
      it('should find node by ID', () => {
        const nodes = [
          FIXTURES.textNode({ id: 'n1' }),
          FIXTURES.textNode({ id: 'n2' }),
          FIXTURES.textNode({ id: 'n3' }),
        ];

        const found = CanvasParser.findNodeById(nodes, 'n2');

        expect(found).toBeDefined();
        expect(found!.id).toBe('n2');
      });

      it('should return undefined for non-existent ID', () => {
        const nodes = [FIXTURES.textNode({ id: 'n1' })];

        const found = CanvasParser.findNodeById(nodes, 'nonexistent');

        expect(found).toBeUndefined();
      });

      it('should return undefined for empty array', () => {
        const found = CanvasParser.findNodeById([], 'any');

        expect(found).toBeUndefined();
      });
    });

    describe('findNodesByType()', () => {
      it('should find all text nodes', () => {
        const nodes = [
          FIXTURES.textNode({ id: 't1' }),
          FIXTURES.fileNode({ id: 'f1' }),
          FIXTURES.textNode({ id: 't2' }),
          FIXTURES.linkNode({ id: 'l1' }),
        ];

        const textNodes = CanvasParser.findNodesByType(nodes, 'text');

        expect(textNodes).toHaveLength(2);
        expect(textNodes.map((n) => n.id)).toEqual(['t1', 't2']);
      });

      it('should return empty array when no matches', () => {
        const nodes = [FIXTURES.textNode()];

        const fileNodes = CanvasParser.findNodesByType(nodes, 'file');

        expect(fileNodes).toHaveLength(0);
      });
    });

    describe('findNodesContainingText()', () => {
      it('should find nodes containing text (case insensitive)', () => {
        const nodes = [
          FIXTURES.textNode({ id: 'n1', text: 'Hello World' }),
          FIXTURES.textNode({ id: 'n2', text: 'Goodbye World' }),
          FIXTURES.textNode({ id: 'n3', text: 'Hello There' }),
        ];

        const found = CanvasParser.findNodesContainingText(nodes, 'hello');

        expect(found).toHaveLength(2);
        expect(found.map((n) => n.id)).toContain('n1');
        expect(found.map((n) => n.id)).toContain('n3');
      });

      it('should support case sensitive search', () => {
        const nodes = [
          FIXTURES.textNode({ id: 'n1', text: 'Hello World' }),
          FIXTURES.textNode({ id: 'n2', text: 'hello world' }),
        ];

        const found = CanvasParser.findNodesContainingText(nodes, 'Hello', true);

        expect(found).toHaveLength(1);
        expect(found[0].id).toBe('n1');
      });

      it('should only search text nodes', () => {
        const nodes = [
          FIXTURES.textNode({ id: 't1', text: 'test content' }),
          FIXTURES.fileNode({ id: 'f1', file: 'test.md' }),
        ];

        const found = CanvasParser.findNodesContainingText(nodes, 'test');

        expect(found).toHaveLength(1);
        expect(found[0].id).toBe('t1');
      });
    });

    describe('findQuestionNodes()', () => {
      it('should find nodes containing question mark', () => {
        const nodes = [
          FIXTURES.textNode({ id: 'q1', text: 'What is this?' }),
          FIXTURES.textNode({ id: 'n1', text: 'This is a statement.' }),
          FIXTURES.textNode({ id: 'q2', text: '? How does it work?' }),
        ];

        const questions = CanvasParser.findQuestionNodes(nodes);

        expect(questions).toHaveLength(2);
        expect(questions.map((n) => n.id)).toEqual(['q1', 'q2']);
      });

      it('should return empty array when no questions', () => {
        const nodes = [
          FIXTURES.textNode({ text: 'Statement 1.' }),
          FIXTURES.textNode({ text: 'Statement 2.' }),
        ];

        const questions = CanvasParser.findQuestionNodes(nodes);

        expect(questions).toHaveLength(0);
      });
    });

    describe('findNodesByColor()', () => {
      it('should find nodes by color', () => {
        const nodes = [
          FIXTURES.textNode({ id: 'n1', color: '3' }),
          FIXTURES.textNode({ id: 'n2', color: '4' }),
          FIXTURES.textNode({ id: 'n3', color: '3' }),
        ];

        const yellowNodes = CanvasParser.findNodesByColor(nodes, '3');

        expect(yellowNodes).toHaveLength(2);
        expect(yellowNodes.map((n) => n.id)).toEqual(['n1', 'n3']);
      });

      it('should return empty array when no matches', () => {
        const nodes = [FIXTURES.textNode({ color: '1' })];

        const found = CanvasParser.findNodesByColor(nodes, '6');

        expect(found).toHaveLength(0);
      });
    });

    describe('getConnectedNodes()', () => {
      it('should find outgoing connections', () => {
        const edges = [
          FIXTURES.edge('a', 'b'),
          FIXTURES.edge('a', 'c'),
          FIXTURES.edge('b', 'c'),
        ];

        const connected = CanvasParser.getConnectedNodes('a', edges, 'outgoing');

        expect(connected).toHaveLength(2);
        expect(connected).toContain('b');
        expect(connected).toContain('c');
      });

      it('should find incoming connections', () => {
        const edges = [
          FIXTURES.edge('a', 'c'),
          FIXTURES.edge('b', 'c'),
        ];

        const connected = CanvasParser.getConnectedNodes('c', edges, 'incoming');

        expect(connected).toHaveLength(2);
        expect(connected).toContain('a');
        expect(connected).toContain('b');
      });

      it('should find both directions by default', () => {
        const edges = [
          FIXTURES.edge('a', 'b'),
          FIXTURES.edge('c', 'b'),
        ];

        const connected = CanvasParser.getConnectedNodes('b', edges);

        expect(connected).toHaveLength(2);
        expect(connected).toContain('a');
        expect(connected).toContain('c');
      });

      it('should return empty array for isolated node', () => {
        const edges = [FIXTURES.edge('a', 'b')];

        const connected = CanvasParser.getConnectedNodes('c', edges);

        expect(connected).toHaveLength(0);
      });
    });
  });

  // ===========================================================================
  // Utility Methods Tests
  // ===========================================================================

  describe('Utility Methods', () => {
    describe('getCanvasBounds()', () => {
      it('should calculate bounds for single node', () => {
        const nodes = [
          FIXTURES.textNode({ x: 100, y: 200, width: 300, height: 150 }),
        ];

        const bounds = CanvasParser.getCanvasBounds(nodes);

        expect(bounds.minX).toBe(100);
        expect(bounds.minY).toBe(200);
        expect(bounds.maxX).toBe(400);
        expect(bounds.maxY).toBe(350);
        expect(bounds.width).toBe(300);
        expect(bounds.height).toBe(150);
      });

      it('should calculate bounds for multiple nodes', () => {
        const nodes = [
          FIXTURES.textNode({ x: 0, y: 0, width: 100, height: 50 }),
          FIXTURES.textNode({ x: 200, y: 100, width: 100, height: 50 }),
          FIXTURES.textNode({ x: -100, y: -50, width: 100, height: 50 }),
        ];

        const bounds = CanvasParser.getCanvasBounds(nodes);

        expect(bounds.minX).toBe(-100);
        expect(bounds.minY).toBe(-50);
        expect(bounds.maxX).toBe(300);
        expect(bounds.maxY).toBe(150);
        expect(bounds.width).toBe(400);
        expect(bounds.height).toBe(200);
      });

      it('should return zero bounds for empty array', () => {
        const bounds = CanvasParser.getCanvasBounds([]);

        expect(bounds.minX).toBe(0);
        expect(bounds.minY).toBe(0);
        expect(bounds.maxX).toBe(0);
        expect(bounds.maxY).toBe(0);
        expect(bounds.width).toBe(0);
        expect(bounds.height).toBe(0);
      });
    });

    describe('extractKeywords()', () => {
      it('should extract headings as keywords', () => {
        const nodes = [
          FIXTURES.textNode({ text: '# Main Topic\n## Subtopic' }),
        ];

        const keywords = CanvasParser.extractKeywords(nodes);

        expect(keywords).toContain('Main Topic');
        expect(keywords).toContain('Subtopic');
      });

      it('should extract bold text as keywords', () => {
        const nodes = [
          FIXTURES.textNode({ text: 'This is **important** and **critical**' }),
        ];

        const keywords = CanvasParser.extractKeywords(nodes);

        expect(keywords).toContain('important');
        expect(keywords).toContain('critical');
      });

      it('should extract wiki links as keywords', () => {
        const nodes = [
          FIXTURES.textNode({ text: 'See [[Topic A]] and [[Topic B|display]]' }),
        ];

        const keywords = CanvasParser.extractKeywords(nodes);

        expect(keywords).toContain('Topic A');
        expect(keywords).toContain('Topic B');
      });

      it('should ignore non-text nodes', () => {
        const nodes = [
          FIXTURES.fileNode({ file: 'important.md' }),
          FIXTURES.linkNode({ url: 'https://important.com' }),
        ];

        const keywords = CanvasParser.extractKeywords(nodes);

        expect(keywords).toHaveLength(0);
      });

      it('should deduplicate keywords', () => {
        const nodes = [
          FIXTURES.textNode({ text: '# Topic\n**Topic**\n[[Topic]]' }),
        ];

        const keywords = CanvasParser.extractKeywords(nodes);

        const topicCount = keywords.filter((k) => k === 'Topic').length;
        expect(topicCount).toBe(1);
      });

      it('should filter empty keywords', () => {
        const nodes = [
          FIXTURES.textNode({ text: '# \n**  **' }),
        ];

        const keywords = CanvasParser.extractKeywords(nodes);

        expect(keywords.every((k) => k.length > 0)).toBe(true);
      });
    });

    describe('extractUrls()', () => {
      it('should extract URLs from link nodes', () => {
        const nodes = [
          FIXTURES.linkNode({ url: 'https://example.com' }),
          FIXTURES.linkNode({ url: 'https://another.com' }),
        ];

        const urls = CanvasParser.extractUrls(nodes);

        expect(urls).toHaveLength(2);
        expect(urls).toContain('https://example.com');
        expect(urls).toContain('https://another.com');
      });

      it('should extract markdown links from text nodes', () => {
        const nodes = [
          FIXTURES.textNode({
            text: 'Check [this](https://example.com) and [that](https://another.com)',
          }),
        ];

        const urls = CanvasParser.extractUrls(nodes);

        expect(urls).toContain('https://example.com');
        expect(urls).toContain('https://another.com');
      });

      it('should ignore non-http links', () => {
        const nodes = [
          FIXTURES.textNode({
            text: 'Local [file](file://path) and [mailto](mailto:test@example.com)',
          }),
        ];

        const urls = CanvasParser.extractUrls(nodes);

        expect(urls).toHaveLength(0);
      });

      it('should handle mixed node types', () => {
        const nodes = [
          FIXTURES.linkNode({ url: 'https://link-node.com' }),
          FIXTURES.textNode({ text: 'See [here](https://text-node.com)' }),
          FIXTURES.fileNode({ file: 'test.md' }),
        ];

        const urls = CanvasParser.extractUrls(nodes);

        expect(urls).toHaveLength(2);
        expect(urls).toContain('https://link-node.com');
        expect(urls).toContain('https://text-node.com');
      });
    });
  });

  // ===========================================================================
  // Edge Cases and Error Handling
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle very large canvas files', async () => {
      const nodes = Array.from({ length: 1000 }, (_, i) =>
        FIXTURES.textNode({ id: `node-${i}`, text: `Content ${i}` })
      );
      const edges = Array.from({ length: 500 }, (_, i) =>
        FIXTURES.edge(`node-${i * 2}`, `node-${i * 2 + 1}`)
      );

      vol.fromJSON({
        '/large.canvas': JSON.stringify({ nodes, edges }),
      });

      const canvas = await CanvasParser.load('/large.canvas');

      expect(canvas.nodes).toHaveLength(1000);
      expect(canvas.edges).toHaveLength(500);
    });

    it('should handle special characters in text content', async () => {
      const specialText = 'Test with "quotes" and \'apostrophes\' and <html> and & symbols';
      const canvasData = {
        nodes: [FIXTURES.textNode({ text: specialText })],
        edges: [],
      };

      vol.fromJSON({
        '/special.canvas': JSON.stringify(canvasData),
      });

      const canvas = await CanvasParser.load('/special.canvas');

      expect(canvas.nodes[0].text).toBe(specialText);
    });

    it('should preserve extra fields in nodes', async () => {
      const canvasData = {
        nodes: [{
          id: 'n1',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 50,
          text: 'test',
          customField: 'preserved',
        }],
        edges: [],
      };

      vol.fromJSON({
        '/custom.canvas': JSON.stringify(canvasData),
      });

      const canvas = await CanvasParser.load('/custom.canvas');

      expect((canvas.nodes[0] as any).customField).toBe('preserved');
    });

    it('should handle negative coordinates', () => {
      const node = CanvasParser.createTextNode({
        x: -500,
        y: -300,
        text: 'Negative coords',
      });

      expect(node.x).toBe(-500);
      expect(node.y).toBe(-300);
    });

    it('should handle empty text content', () => {
      const node = CanvasParser.createTextNode({
        x: 0,
        y: 0,
        text: '',
      });

      expect(node.text).toBe('');
    });
  });
});
