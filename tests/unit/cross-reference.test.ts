/**
 * CrossReferenceManager Unit Tests
 *
 * 캔버스 간 상호 참조 및 연결 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { CrossReferenceManager } from '../../src/engine/cross-reference.js';
import { FIXTURES, measureTime, captureConsole } from '../helpers/setup.js';

// Mock fs/promises with memfs
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('CrossReferenceManager', () => {
  let manager: CrossReferenceManager;

  const createCanvas = (
    name: string,
    topic: string,
    keywords: string[] = [],
    linkedNotes: string[] = []
  ) => {
    const nodes: any[] = [
      {
        id: 'topic',
        type: 'text',
        x: 0,
        y: 0,
        width: 400,
        height: 100,
        text: `# ${topic}`,
        color: '6',
      },
    ];

    keywords.forEach((kw, i) => {
      nodes.push({
        id: `kw-${i}`,
        type: 'text',
        x: 0,
        y: (i + 1) * 150,
        width: 300,
        height: 100,
        text: `**${kw}** content`,
      });
    });

    linkedNotes.forEach((note, i) => {
      nodes.push({
        id: `file-${i}`,
        type: 'file',
        x: -400,
        y: i * 150,
        width: 300,
        height: 100,
        file: note,
      });
    });

    const canvas = { nodes, edges: [] };
    vol.writeFileSync(`/vault/03_Canvas/${name}.canvas`, JSON.stringify(canvas));
  };

  // Helper to find canvas in index by name (handles different path formats)
  const findCanvasByName = (
    index: Awaited<ReturnType<typeof manager.buildIndex>>,
    name: string
  ) => {
    const key = Object.keys(index.canvases).find((k) => k.includes(`${name}.canvas`));
    return key ? index.canvases[key] : undefined;
  };

  // Helper to find canvas key by name
  const findCanvasKey = (
    index: Awaited<ReturnType<typeof manager.buildIndex>>,
    name: string
  ) => {
    return Object.keys(index.canvases).find((k) => k.includes(`${name}.canvas`));
  };

  // Helper to get related canvases
  const getRelated = (
    index: Awaited<ReturnType<typeof manager.buildIndex>>,
    canvasName: string
  ) => {
    const key = findCanvasKey(index, canvasName);
    return key ? index.relatedCanvases[key] || [] : [];
  };

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });
    manager = new CrossReferenceManager('/vault/03_Canvas');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Constructor Tests
  // ===========================================================================

  describe('Constructor', () => {
    it('should create manager with default canvas directory', () => {
      const mgr = new CrossReferenceManager();
      expect(mgr).toBeDefined();
    });

    it('should create manager with custom canvas directory', () => {
      const mgr = new CrossReferenceManager('/custom/path');
      expect(mgr).toBeDefined();
    });
  });

  // ===========================================================================
  // buildIndex Tests
  // ===========================================================================

  describe('buildIndex()', () => {
    it('should index all canvas files', async () => {
      createCanvas('canvas1', 'Machine Learning');
      createCanvas('canvas2', 'Deep Learning');
      createCanvas('canvas3', 'Programming');

      const index = await manager.buildIndex();

      expect(Object.keys(index.canvases)).toHaveLength(3);
    });

    it('should extract topic from canvas', async () => {
      createCanvas('ml', 'Machine Learning Basics');

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'ml');
      expect(canvas).toBeDefined();
      expect(canvas!.topic).toBe('Machine Learning Basics');
    });

    it('should extract keywords from bold text', async () => {
      createCanvas('test', 'Test Topic', ['neural networks', 'backpropagation']);

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'test');
      expect(canvas).toBeDefined();
      expect(canvas!.keywords).toContain('neural networks');
      expect(canvas!.keywords).toContain('backpropagation');
    });

    it('should extract linked notes', async () => {
      createCanvas('test', 'Test Topic', [], ['notes/reference.md', 'notes/guide.md']);

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'test');
      expect(canvas).toBeDefined();
      expect(canvas!.linkedNotes).toContain('notes/reference.md');
      expect(canvas!.linkedNotes).toContain('notes/guide.md');
    });

    it('should extract questions', async () => {
      const nodes = [
        FIXTURES.textNode({ id: 't', text: '# Topic', color: '6' }),
        FIXTURES.textNode({ id: 'q1', text: '? What is this?' }),
        FIXTURES.textNode({ id: 'q2', text: 'How does it work?' }),
      ];
      vol.writeFileSync('/vault/03_Canvas/questions.canvas', JSON.stringify({ nodes, edges: [] }));

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'questions');
      expect(canvas).toBeDefined();
      expect(canvas!.questions.length).toBe(2);
    });

    it('should count nodes and edges', async () => {
      const nodes = [
        FIXTURES.textNode({ id: 'n1' }),
        FIXTURES.textNode({ id: 'n2' }),
        FIXTURES.textNode({ id: 'n3' }),
      ];
      const edges = [
        FIXTURES.edge('n1', 'n2'),
        FIXTURES.edge('n2', 'n3'),
      ];
      vol.writeFileSync('/vault/03_Canvas/counted.canvas', JSON.stringify({ nodes, edges }));

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'counted');
      expect(canvas).toBeDefined();
      expect(canvas!.nodeCount).toBe(3);
      expect(canvas!.edgeCount).toBe(2);
    });

    it('should build shared keywords index', async () => {
      createCanvas('canvas1', 'Topic 1', ['machine learning', 'AI']);
      createCanvas('canvas2', 'Topic 2', ['machine learning', 'data']);
      createCanvas('canvas3', 'Topic 3', ['programming']);

      const index = await manager.buildIndex();

      expect(index.sharedKeywords['machine learning']).toHaveLength(2);
      expect(index.sharedKeywords['ai']).toHaveLength(1);
    });

    it('should build related canvases', async () => {
      createCanvas('ml-basics', 'ML Basics', ['machine learning', 'algorithms']);
      createCanvas('ml-advanced', 'ML Advanced', ['machine learning', 'deep learning']);
      createCanvas('cooking', 'Cooking', ['recipes', 'food']);

      const index = await manager.buildIndex();

      // ML canvases should be related
      const mlBasicsRelated = getRelated(index, 'ml-basics');
      expect(mlBasicsRelated.some(([path]) => path.includes('ml-advanced'))).toBe(true);

      // Cooking should not be related to ML
      const cookingRelated = getRelated(index, 'cooking');
      expect(cookingRelated.some(([path]) => path.includes('ml'))).toBe(false);
    });

    it('should save index to file', async () => {
      createCanvas('test', 'Test');

      await manager.buildIndex();

      expect(vol.existsSync('/vault/03_Canvas/.cross_reference.json')).toBe(true);
    });

    it('should force rebuild when specified', async () => {
      createCanvas('test', 'Original');
      await manager.buildIndex();

      // Modify canvas
      createCanvas('test', 'Updated');

      // Force rebuild
      const index = await manager.buildIndex(true);

      const canvas = findCanvasByName(index, 'test');
      expect(canvas).toBeDefined();
      expect(canvas!.topic).toBe('Updated');
    });

    it('should handle canvas with only topic node', async () => {
      const nodes = [
        { id: 't', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '# Only Topic', color: '6' },
      ];
      vol.writeFileSync('/vault/03_Canvas/minimal.canvas', JSON.stringify({ nodes, edges: [] }));

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'minimal');
      expect(canvas).toBeDefined();
      expect(canvas!.topic).toBe('Only Topic');
    });

    it('should skip hidden directories', async () => {
      createCanvas('visible', 'Visible');
      vol.mkdirSync('/vault/03_Canvas/.hidden', { recursive: true });
      vol.writeFileSync('/vault/03_Canvas/.hidden/secret.canvas', JSON.stringify({ nodes: [], edges: [] }));

      const index = await manager.buildIndex();

      expect(Object.keys(index.canvases)).toHaveLength(1);
      expect(index.canvases['03_Canvas/.hidden/secret.canvas']).toBeUndefined();
    });
  });

  // ===========================================================================
  // Similarity Calculation Tests
  // ===========================================================================

  describe('Similarity Calculation', () => {
    it('should calculate higher score for shared keywords', async () => {
      createCanvas('canvas1', 'Topic 1', ['keyword1', 'keyword2', 'keyword3']);
      createCanvas('canvas2', 'Topic 2', ['keyword1', 'keyword2', 'keyword3']); // Same keywords
      createCanvas('canvas3', 'Topic 3', ['other1', 'other2', 'other3']); // Different keywords

      const index = await manager.buildIndex();

      const related1 = getRelated(index, 'canvas1');
      const canvas2Score = related1.find(([p]) => p.includes('canvas2'))?.[1] || 0;
      const canvas3Score = related1.find(([p]) => p.includes('canvas3'))?.[1] || 0;

      expect(canvas2Score).toBeGreaterThan(canvas3Score);
    });

    it('should calculate higher score for shared notes', async () => {
      createCanvas('canvas1', 'Topic 1', [], ['shared.md', 'note1.md']);
      createCanvas('canvas2', 'Topic 2', [], ['shared.md', 'note2.md']); // Shares shared.md
      createCanvas('canvas3', 'Topic 3', [], ['other.md', 'note3.md']); // No shared notes

      const index = await manager.buildIndex();

      const related1 = getRelated(index, 'canvas1');
      const canvas2Score = related1.find(([p]) => p.includes('canvas2'))?.[1] || 0;
      const canvas3Score = related1.find(([p]) => p.includes('canvas3'))?.[1] || 0;

      expect(canvas2Score).toBeGreaterThan(canvas3Score);
    });

    it('should calculate score for topic word overlap', async () => {
      createCanvas('machine-learning-intro', 'Machine Learning Introduction');
      createCanvas('machine-learning-advanced', 'Machine Learning Advanced');
      createCanvas('cooking-recipes', 'Cooking Recipes');

      const index = await manager.buildIndex();

      const introRelated = getRelated(index, 'machine-learning-intro');
      const advancedScore = introRelated.find(([p]) => p.includes('advanced'))?.[1] || 0;
      const cookingScore = introRelated.find(([p]) => p.includes('cooking'))?.[1] || 0;

      expect(advancedScore).toBeGreaterThan(cookingScore);
    });

    it('should return zero score for unrelated canvases', async () => {
      createCanvas('canvas1', 'Alpha Beta Gamma', ['x', 'y', 'z']);
      createCanvas('canvas2', 'One Two Three', ['a', 'b', 'c']);

      const index = await manager.buildIndex();

      const related = getRelated(index, 'canvas1');
      const canvas2Entry = related.find(([p]) => p.includes('canvas2'));

      expect(canvas2Entry?.[1] || 0).toBe(0);
    });
  });

  // ===========================================================================
  // getRelatedCanvases Tests
  // ===========================================================================

  describe('getRelatedCanvases()', () => {
    let mainKey: string | undefined;

    beforeEach(async () => {
      createCanvas('main', 'Main Topic', ['shared', 'keyword']);
      createCanvas('related1', 'Related 1', ['shared', 'other']);
      createCanvas('related2', 'Related 2', ['shared']);
      createCanvas('unrelated', 'Unrelated', ['different']);
      const index = await manager.buildIndex();
      mainKey = findCanvasKey(index, 'main');
    });

    it('should return related canvases sorted by score', async () => {
      const related = await manager.getRelatedCanvases(mainKey!);

      expect(related.length).toBeGreaterThan(0);
      for (let i = 1; i < related.length; i++) {
        expect(related[i - 1].score).toBeGreaterThanOrEqual(related[i].score);
      }
    });

    it('should respect limit parameter', async () => {
      const related = await manager.getRelatedCanvases(mainKey!, 1);

      expect(related).toHaveLength(1);
    });

    it('should return empty for non-existent canvas', async () => {
      const related = await manager.getRelatedCanvases('nonexistent.canvas');

      expect(related).toHaveLength(0);
    });

    it('should not include self in related', async () => {
      const related = await manager.getRelatedCanvases(mainKey!);

      expect(related.some((r) => r.path.includes('main'))).toBe(false);
    });
  });

  // ===========================================================================
  // findCanvasesByKeyword Tests
  // ===========================================================================

  describe('findCanvasesByKeyword()', () => {
    beforeEach(async () => {
      createCanvas('ml1', 'ML 1', ['machine learning']);
      createCanvas('ml2', 'ML 2', ['machine learning']);
      createCanvas('other', 'Other', ['programming']);
      await manager.buildIndex();
    });

    it('should find canvases with matching keyword', async () => {
      const canvases = await manager.findCanvasesByKeyword('machine learning');

      expect(canvases).toHaveLength(2);
      expect(canvases.some((c) => c.includes('ml1'))).toBe(true);
      expect(canvases.some((c) => c.includes('ml2'))).toBe(true);
    });

    it('should be case insensitive', async () => {
      const canvases = await manager.findCanvasesByKeyword('MACHINE LEARNING');

      expect(canvases).toHaveLength(2);
    });

    it('should return empty for non-existent keyword', async () => {
      const canvases = await manager.findCanvasesByKeyword('nonexistent');

      expect(canvases).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getCanvasNetwork Tests
  // ===========================================================================

  describe('getCanvasNetwork()', () => {
    beforeEach(async () => {
      createCanvas('hub', 'Hub Topic', ['shared']);
      createCanvas('spoke1', 'Spoke 1', ['shared', 'other']);
      createCanvas('spoke2', 'Spoke 2', ['shared']);
      createCanvas('isolated', 'Isolated', ['unique']);
      await manager.buildIndex();
    });

    it('should return nodes for all canvases', async () => {
      const network = await manager.getCanvasNetwork();

      expect(network.nodes).toHaveLength(4);
    });

    it('should include topic in nodes', async () => {
      const network = await manager.getCanvasNetwork();

      const hubNode = network.nodes.find((n) => n.id.includes('hub'));
      expect(hubNode?.topic).toBe('Hub Topic');
    });

    it('should include node count as size', async () => {
      const network = await manager.getCanvasNetwork();

      network.nodes.forEach((node) => {
        expect(node.size).toBeGreaterThanOrEqual(0);
      });
    });

    it('should create edges between related canvases', async () => {
      const network = await manager.getCanvasNetwork();

      // Should have some edges between canvases sharing 'shared' keyword
      expect(network.edges.length).toBeGreaterThan(0);
    });

    it('should not duplicate edges', async () => {
      const network = await manager.getCanvasNetwork();

      const edgeKeys = network.edges.map((e) => [e.source, e.target].sort().join('|'));
      const uniqueKeys = new Set(edgeKeys);

      expect(edgeKeys.length).toBe(uniqueKeys.size);
    });

    it('should include weight on edges', async () => {
      const network = await manager.getCanvasNetwork();

      network.edges.forEach((edge) => {
        expect(edge.weight).toBeDefined();
        expect(edge.weight).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // suggestCanvasLinks Tests
  // ===========================================================================

  describe('suggestCanvasLinks()', () => {
    let mainKey: string | undefined;

    beforeEach(async () => {
      createCanvas('main', 'Main Topic', ['machine learning', 'AI']);
      createCanvas('related', 'Related', ['machine learning', 'neural networks']);
      createCanvas('unrelated', 'Unrelated', ['cooking']);
      const index = await manager.buildIndex();
      mainKey = findCanvasKey(index, 'main');
    });

    it('should suggest related canvases', async () => {
      const suggestions = await manager.suggestCanvasLinks(mainKey!);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.canvas.includes('related'))).toBe(true);
    });

    it('should include reason for suggestion', async () => {
      const suggestions = await manager.suggestCanvasLinks(mainKey!);

      const relatedSuggestion = suggestions.find((s) => s.canvas.includes('related'));
      expect(relatedSuggestion).toBeDefined();
      expect(relatedSuggestion?.reason).toContain('공유 키워드');
    });

    it('should include score', async () => {
      const suggestions = await manager.suggestCanvasLinks(mainKey!);

      suggestions.forEach((s) => {
        expect(s.score).toBeDefined();
        expect(s.score).toBeGreaterThan(0);
      });
    });

    it('should not suggest unrelated canvases', async () => {
      const suggestions = await manager.suggestCanvasLinks(mainKey!);

      // Unrelated canvas should either not be in suggestions or have low score
      const unrelatedSuggestion = suggestions.find((s) => s.canvas.includes('unrelated'));
      if (unrelatedSuggestion) {
        expect(unrelatedSuggestion.score).toBeLessThan(
          suggestions.find((s) => s.canvas.includes('related'))?.score || 0
        );
      }
    });

    it('should return empty for non-existent canvas', async () => {
      const suggestions = await manager.suggestCanvasLinks('nonexistent.canvas');

      expect(suggestions).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getStatistics Tests
  // ===========================================================================

  describe('getStatistics()', () => {
    beforeEach(async () => {
      createCanvas('created', 'Created Canvas');
      createCanvas('expanded', 'Expanded Canvas');

      // Set workflow states via meta files
      const createdMeta = {
        canvasPath: 'created.canvas',
        workflow: { state: 'created' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now(),
        semanticGraph: {},
        statistics: {},
      };
      const expandedMeta = {
        canvasPath: 'expanded.canvas',
        workflow: { state: 'expanded' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now(),
        semanticGraph: {},
        statistics: {},
      };

      vol.writeFileSync('/vault/03_Canvas/.meta/created.meta.json', JSON.stringify(createdMeta));
      vol.writeFileSync('/vault/03_Canvas/.meta/expanded.meta.json', JSON.stringify(expandedMeta));

      await manager.buildIndex();
    });

    it('should return total canvases count', async () => {
      const stats = await manager.getStatistics();

      expect(stats.totalCanvases).toBe(2);
    });

    it('should return canvases by state', async () => {
      const stats = await manager.getStatistics();

      expect(stats.byState['created']).toBe(1);
      expect(stats.byState['expanded']).toBe(1);
    });

    it('should return top shared keywords', async () => {
      // Add more canvases with shared keywords
      createCanvas('common1', 'Common 1', ['shared keyword']);
      createCanvas('common2', 'Common 2', ['shared keyword']);
      await manager.buildIndex(true);

      const stats = await manager.getStatistics();

      expect(stats.topSharedKeywords.length).toBeGreaterThan(0);
      expect(stats.topSharedKeywords[0][1]).toBeGreaterThan(1);
    });

    it('should return most connected canvases', async () => {
      const stats = await manager.getStatistics();

      expect(stats.mostConnected).toBeDefined();
      expect(Array.isArray(stats.mostConnected)).toBe(true);
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty canvas directory', async () => {
      // No canvases created
      const index = await manager.buildIndex();

      expect(Object.keys(index.canvases)).toHaveLength(0);
    });

    it('should handle canvas with no topic', async () => {
      const nodes = [
        FIXTURES.textNode({ id: 'n1', text: 'Just content, no heading' }),
      ];
      vol.writeFileSync('/vault/03_Canvas/notopic.canvas', JSON.stringify({ nodes, edges: [] }));

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'notopic');
      expect(canvas).toBeDefined();
      expect(canvas!.topic).toBe('');
    });

    it('should handle malformed canvas file', async () => {
      vol.writeFileSync('/vault/03_Canvas/bad.canvas', 'not valid json');
      createCanvas('good', 'Good Canvas');

      const consoleCapture = captureConsole();
      const index = await manager.buildIndex();
      consoleCapture.restore();

      // Should still index good canvas
      const goodCanvas = findCanvasByName(index, 'good');
      expect(goodCanvas).toBeDefined();
      // Bad canvas should be skipped
      const badCanvas = findCanvasByName(index, 'bad');
      expect(badCanvas).toBeUndefined();
    });

    it('should handle canvas with unicode content', async () => {
      const nodes = [
        { id: 't', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '# 한글 주제 🚀', color: '6' },
        { id: 'k', type: 'text', x: 0, y: 150, width: 300, height: 100, text: '**키워드** 테스트' },
      ];
      vol.writeFileSync('/vault/03_Canvas/unicode.canvas', JSON.stringify({ nodes, edges: [] }));

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'unicode');
      expect(canvas).toBeDefined();
      expect(canvas!.topic).toBe('한글 주제 🚀');
    });

    it('should limit keywords to 20', async () => {
      const keywords = Array.from({ length: 30 }, (_, i) => `keyword${i}`);
      createCanvas('many-keywords', 'Topic', keywords);

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'many-keywords');
      expect(canvas).toBeDefined();
      expect(canvas!.keywords.length).toBeLessThanOrEqual(20);
    });

    it('should limit questions to 5', async () => {
      const nodes = [
        FIXTURES.textNode({ id: 't', text: '# Topic', color: '6' }),
        ...Array.from({ length: 10 }, (_, i) =>
          FIXTURES.textNode({ id: `q${i}`, text: `? Question ${i}?` })
        ),
      ];
      vol.writeFileSync('/vault/03_Canvas/many-questions.canvas', JSON.stringify({ nodes, edges: [] }));

      const index = await manager.buildIndex();

      const canvas = findCanvasByName(index, 'many-questions');
      expect(canvas).toBeDefined();
      expect(canvas!.questions.length).toBeLessThanOrEqual(5);
    });

    it('should handle deeply nested canvas files', async () => {
      vol.mkdirSync('/vault/03_Canvas/a/b/c/d', { recursive: true });
      const nodes = [FIXTURES.textNode({ id: 't', text: '# Deep', color: '6' })];
      vol.writeFileSync('/vault/03_Canvas/a/b/c/d/deep.canvas', JSON.stringify({ nodes, edges: [] }));

      const index = await manager.buildIndex();

      // The path in the index depends on the relative path from CWD
      // Find the key that contains 'deep.canvas'
      const deepCanvasKey = Object.keys(index.canvases).find((k) => k.includes('deep.canvas'));
      expect(deepCanvasKey).toBeDefined();
      expect(index.canvases[deepCanvasKey!]).toBeDefined();
      expect(index.canvases[deepCanvasKey!].topic).toBe('Deep');
    });
  });

  // ===========================================================================
  // Performance Tests
  // ===========================================================================

  describe('Performance', () => {
    it('should index 50 canvases in reasonable time', async () => {
      for (let i = 0; i < 50; i++) {
        createCanvas(
          `canvas-${i}`,
          `Topic ${i}`,
          [`keyword-${i % 10}`, `shared-${i % 5}`],
          [`note-${i}.md`]
        );
      }

      const { duration } = await measureTime(() => manager.buildIndex());

      expect(duration).toBeLessThan(10000); // < 10 seconds
    });

    it('should build network efficiently', async () => {
      for (let i = 0; i < 30; i++) {
        createCanvas(`canvas-${i}`, `Topic ${i}`, [`shared-${i % 3}`]);
      }
      await manager.buildIndex();

      const { duration } = await measureTime(() => manager.getCanvasNetwork());

      expect(duration).toBeLessThan(1000); // < 1 second
    });
  });
});
