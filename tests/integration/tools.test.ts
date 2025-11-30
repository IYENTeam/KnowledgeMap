/**
 * Tools Integration Tests
 *
 * Canvas, Vault, Dashboard Tools 통합 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { FIXTURES, createTestCanvas, createTestVault, measureTime } from '../helpers/setup.js';

// Mock fs/promises with memfs
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Import after mocking
import { CanvasParser } from '../../src/engine/canvas-parser.js';
import { LayoutEngine } from '../../src/engine/layout-engine.js';
import { MetaManager } from '../../src/engine/meta-manager.js';
import { VaultIndexer } from '../../src/engine/vault-indexer.js';
import { CrossReferenceManager } from '../../src/engine/cross-reference.js';
import { SemanticRouter } from '../../src/engine/semantic-router.js';

describe('Tools Integration', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Canvas Creation Workflow Tests
  // ===========================================================================

  describe('Canvas Creation Workflow', () => {
    it('should create a new canvas with topic and questions', async () => {
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });

      const engine = new LayoutEngine();
      const { nodes, edges } = engine.createInitialLayout('Machine Learning', {
        questions: ['What is supervised learning?', 'How does backpropagation work?'],
      });

      const canvasPath = '/vault/03_Canvas/Machine_Learning.canvas';
      await CanvasParser.save(canvasPath, nodes, edges);

      // Verify canvas was created
      expect(vol.existsSync(canvasPath)).toBe(true);

      // Verify content
      const loaded = await CanvasParser.load(canvasPath);
      expect(loaded.nodes.length).toBeGreaterThanOrEqual(3); // Topic + 2 questions

      // Verify topic node
      const topicNode = loaded.nodes.find(
        (n) => n.type === 'text' && (n as any).text.includes('Machine Learning')
      );
      expect(topicNode).toBeDefined();
      expect(topicNode!.color).toBe('6'); // Purple
    });

    it('should create canvas with vault notes', async () => {
      // Setup vault
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });
      vol.writeFileSync('/vault/ml-basics.md', '# ML Basics\nContent');
      vol.writeFileSync('/vault/neural-nets.md', '# Neural Networks\nContent');

      const engine = new LayoutEngine();
      const { nodes } = engine.createInitialLayout('Deep Learning', {
        vaultNotes: ['ml-basics.md', 'neural-nets.md'],
      });

      const canvasPath = '/vault/03_Canvas/Deep_Learning.canvas';
      await CanvasParser.save(canvasPath, nodes, []);

      const loaded = await CanvasParser.load(canvasPath);

      // Verify file nodes were created
      const fileNodes = loaded.nodes.filter((n) => n.type === 'file');
      expect(fileNodes).toHaveLength(2);
    });

    it('should create meta file alongside canvas', async () => {
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });

      const engine = new LayoutEngine();
      const { nodes, edges } = engine.createInitialLayout('Test Topic');

      const canvasPath = '/vault/03_Canvas/Test_Topic.canvas';
      await CanvasParser.save(canvasPath, nodes, edges);

      // Create meta
      const metaManager = new MetaManager('/vault/03_Canvas');
      await metaManager.create(canvasPath);

      // Verify meta was created
      expect(vol.existsSync('/vault/03_Canvas/.meta/Test_Topic.meta.json')).toBe(true);
    });
  });

  // ===========================================================================
  // Canvas Expansion Workflow Tests
  // ===========================================================================

  describe('Canvas Expansion Workflow', () => {
    let canvasPath: string;
    let topicNodeId: string;

    beforeEach(async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      const engine = new LayoutEngine();
      const { nodes, edges } = engine.createInitialLayout('Test Topic');

      topicNodeId = nodes.find((n) => n.type === 'text' && n.color === '6')!.id;
      canvasPath = '/vault/03_Canvas/Test_Topic.canvas';

      await CanvasParser.save(canvasPath, nodes, edges);
    });

    it('should expand canvas with answer node', async () => {
      // Load existing canvas
      const canvas = await CanvasParser.load(canvasPath);
      const engine = new LayoutEngine(canvas.nodes, canvas.edges);

      // Add answer
      const result = engine.allocateByRelation({
        anchorId: topicNodeId,
        relation: 'answers',
        content: { type: 'text', text: 'This is the answer to the topic question.' },
      });

      expect(result).not.toBeNull();
      expect(result!.edge).not.toBeNull(); // answers creates edge

      // Save
      await CanvasParser.save(canvasPath, engine.getNodes(), engine.getEdges());

      // Verify
      const reloaded = await CanvasParser.load(canvasPath);
      expect(reloaded.nodes.length).toBe(canvas.nodes.length + 1);
      expect(reloaded.edges.length).toBe(canvas.edges.length + 1);
    });

    it('should expand with multiple related items', async () => {
      const canvas = await CanvasParser.load(canvasPath);
      const engine = new LayoutEngine(canvas.nodes, canvas.edges);

      const results = engine.allocateMultiple(topicNodeId, [
        { relation: 'answers', content: { type: 'text', text: 'Answer 1' } },
        { relation: 'elaborates', content: { type: 'text', text: 'Detail 1' } },
        { relation: 'background', content: { type: 'file', file: 'reference.md' } },
        { relation: 'followUp', content: { type: 'text', text: '? Follow up question?' } },
      ]);

      expect(results.length).toBe(4);

      // Verify zone placements
      const nodes = engine.getNodes();
      const answerNode = nodes.find((n) => (n as any).text === 'Answer 1');
      const detailNode = nodes.find((n) => (n as any).text === 'Detail 1');
      const fileNode = nodes.find((n) => n.type === 'file');
      const followUpNode = nodes.find((n) => (n as any).text?.includes('Follow up'));

      // Answer should be below topic (SOUTH)
      const topicNode = nodes.find((n) => n.id === topicNodeId)!;
      expect(answerNode!.y).toBeGreaterThan(topicNode.y);

      // Detail should be to the right-bottom (SOUTH_EAST)
      expect(detailNode!.x).toBeGreaterThan(topicNode.x);
      expect(detailNode!.y).toBeGreaterThan(topicNode.y);

      // File should be to the left (WEST)
      expect(fileNode!.x).toBeLessThan(topicNode.x);

      // Follow-up should be to the right (EAST)
      expect(followUpNode!.x).toBeGreaterThan(topicNode.x);
    });

    it('should track expansion in workflow history', async () => {
      const metaManager = new MetaManager('/vault/03_Canvas');
      await metaManager.create(canvasPath);

      await metaManager.addWorkflowAction(canvasPath, 'expanded', 'test-agent', {
        addedNodes: 3,
      });

      const meta = await metaManager.load(canvasPath);
      expect(meta.workflow.state).toBe('expanded');
      expect(meta.workflow.history).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Question Resolution Workflow Tests
  // ===========================================================================

  describe('Question Resolution Workflow', () => {
    it('should resolve question with answer', async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      // Create canvas with question
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'topic', text: '# Topic', color: '6', x: 0, y: 0 }),
          FIXTURES.textNode({ id: 'q1', text: '? What is this?', color: '4', x: 500, y: 0 }),
        ],
        edges: [],
      };
      const canvasPath = '/vault/03_Canvas/test.canvas';
      vol.writeFileSync(canvasPath, JSON.stringify(canvas));

      // Create meta
      const metaManager = new MetaManager('/vault/03_Canvas');
      await metaManager.create(canvasPath);

      // Verify question is pending
      const pendingBefore = await metaManager.getPendingQuestions(canvasPath);
      expect(pendingBefore).toContain('q1');

      // Add answer
      const loadedCanvas = await CanvasParser.load(canvasPath);
      const engine = new LayoutEngine(loadedCanvas.nodes, loadedCanvas.edges);

      const result = engine.allocateByRelation({
        anchorId: 'q1',
        relation: 'answers',
        content: { type: 'text', text: 'This is what it is.' },
      });

      await CanvasParser.save(canvasPath, engine.getNodes(), engine.getEdges());

      // Mark question as resolved
      await metaManager.markQuestionResolved(canvasPath, 'q1', [result!.node.id]);

      // Verify
      const pendingAfter = await metaManager.getPendingQuestions(canvasPath);
      expect(pendingAfter).not.toContain('q1');

      const stats = await metaManager.getStatistics(canvasPath);
      expect(stats.resolvedQuestions).toBe(1);
    });
  });

  // ===========================================================================
  // Vault Integration Tests
  // ===========================================================================

  describe('Vault Integration', () => {
    it('should find related vault notes for canvas', async () => {
      // Setup vault
      const files: Record<string, string> = {
        '/vault/ml-intro.md': `---
tags: [ml, intro]
---
# Machine Learning Introduction

**Supervised learning** and **unsupervised learning** basics.`,
        '/vault/deep-learning.md': `---
tags: [ml, deep-learning]
---
# Deep Learning

**Neural networks** and **backpropagation**.`,
        '/vault/cooking.md': `---
tags: [food]
---
# Cooking Recipes

**Pasta** and **soup** recipes.`,
      };
      vol.fromJSON(files);
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });

      // Index vault
      const indexer = new VaultIndexer('/vault');
      await indexer.buildIndex();

      // Find notes related to ML topic
      const results = await indexer.findRelatedNotes(['machine', 'learning', 'supervised']);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].note.path).toBe('ml-intro.md');
    });

    it('should link vault notes to canvas', async () => {
      // Setup
      vol.fromJSON({
        '/vault/reference.md': '# Reference Note\n**Important** content.',
      });
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });

      // Create canvas with vault link
      const engine = new LayoutEngine();
      const { nodes, edges } = engine.createInitialLayout('My Topic', {
        vaultNotes: ['reference.md'],
      });

      const canvasPath = '/vault/03_Canvas/My_Topic.canvas';
      await CanvasParser.save(canvasPath, nodes, edges);

      // Verify file node exists
      const loaded = await CanvasParser.load(canvasPath);
      const fileNodes = loaded.nodes.filter((n) => n.type === 'file');

      expect(fileNodes).toHaveLength(1);
      expect((fileNodes[0] as any).file).toBe('reference.md');
    });
  });

  // ===========================================================================
  // Cross-Reference Integration Tests
  // ===========================================================================

  describe('Cross-Reference Integration', () => {
    it('should find related canvases by keywords', async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      // Create related canvases
      const createCanvasWithKeywords = (name: string, topic: string, keywords: string[]) => {
        const nodes = [
          { id: 't', type: 'text', x: 0, y: 0, width: 400, height: 100, text: `# ${topic}`, color: '6' },
          ...keywords.map((kw, i) => ({
            id: `k${i}`,
            type: 'text',
            x: 0,
            y: (i + 1) * 150,
            width: 300,
            height: 100,
            text: `**${kw}** content`,
          })),
        ];
        vol.writeFileSync(
          `/vault/03_Canvas/${name}.canvas`,
          JSON.stringify({ nodes, edges: [] })
        );
      };

      createCanvasWithKeywords('ml-basics', 'ML Basics', ['machine learning', 'algorithms']);
      createCanvasWithKeywords('ml-advanced', 'ML Advanced', ['machine learning', 'deep learning']);
      createCanvasWithKeywords('cooking', 'Cooking', ['recipes', 'food']);

      // Build cross-reference
      const crossRef = new CrossReferenceManager('/vault/03_Canvas');
      const index = await crossRef.buildIndex();

      // Find the key for ml-basics
      const mlBasicsKey = Object.keys(index.canvases).find((k) => k.includes('ml-basics.canvas'));
      expect(mlBasicsKey).toBeDefined();

      // Find related
      const related = await crossRef.getRelatedCanvases(mlBasicsKey!);

      expect(related.some((r) => r.path.includes('ml-advanced'))).toBe(true);
      expect(related.some((r) => r.path.includes('cooking'))).toBe(false);
    });

    it('should build canvas network graph', async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      // Create interconnected canvases
      const topics = ['Topic A', 'Topic B', 'Topic C'];
      topics.forEach((topic, i) => {
        const nodes = [
          { id: 't', type: 'text', x: 0, y: 0, width: 400, height: 100, text: `# ${topic}`, color: '6' },
          { id: 'k', type: 'text', x: 0, y: 150, width: 300, height: 100, text: '**shared keyword**' },
        ];
        vol.writeFileSync(
          `/vault/03_Canvas/canvas${i}.canvas`,
          JSON.stringify({ nodes, edges: [] })
        );
      });

      const crossRef = new CrossReferenceManager('/vault/03_Canvas');
      await crossRef.buildIndex();

      const network = await crossRef.getCanvasNetwork();

      expect(network.nodes).toHaveLength(3);
      expect(network.edges.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Full Workflow Integration Tests
  // ===========================================================================

  describe('Full Workflow Integration', () => {
    it('should complete full knowledge exploration workflow', async () => {
      // 1. Setup vault with related notes
      vol.fromJSON({
        '/vault/quantum-basics.md': `---
tags: [physics, quantum]
---
# Quantum Computing Basics

**Qubits** and **superposition** explained.`,
        '/vault/classical-computing.md': `---
tags: [computing]
---
# Classical Computing

**Transistors** and **logic gates**.`,
      });
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      // 2. Index vault
      const vaultIndexer = new VaultIndexer('/vault');
      await vaultIndexer.buildIndex();

      // 3. Find related notes for new canvas
      const relatedNotes = await vaultIndexer.findRelatedNotes(['quantum', 'computing'], { limit: 2 });
      const notePaths = relatedNotes.map((r) => r.note.path);

      // 4. Create canvas with topic and related notes
      const engine = new LayoutEngine();
      const { nodes: initialNodes, edges: initialEdges } = engine.createInitialLayout('Quantum Computing', {
        vaultNotes: notePaths,
        questions: ['What is quantum entanglement?', 'How do quantum gates work?'],
      });

      const canvasPath = '/vault/03_Canvas/Quantum_Computing.canvas';
      await CanvasParser.save(canvasPath, initialNodes, initialEdges);

      // 5. Create and track meta
      const metaManager = new MetaManager('/vault/03_Canvas');
      await metaManager.create(canvasPath);

      // Verify initial state
      let meta = await metaManager.load(canvasPath);
      expect(meta.workflow.state).toBe('created');

      // 6. Expand with answers
      const loadedCanvas = await CanvasParser.load(canvasPath);
      const expandEngine = new LayoutEngine(loadedCanvas.nodes, loadedCanvas.edges);

      const topicNode = loadedCanvas.nodes.find((n) => n.color === '6')!;

      expandEngine.allocateMultiple(topicNode.id, [
        { relation: 'answers', content: { type: 'text', text: 'Quantum computing uses quantum bits (qubits)...' } },
        { relation: 'elaborates', content: { type: 'text', text: 'Qubits can exist in superposition...' } },
      ]);

      await CanvasParser.save(canvasPath, expandEngine.getNodes(), expandEngine.getEdges());

      // 7. Mark as expanded
      await metaManager.addWorkflowAction(canvasPath, 'expanded', 'assistant');

      meta = await metaManager.load(canvasPath);
      expect(meta.workflow.state).toBe('expanded');

      // 8. Verify final state
      const finalCanvas = await CanvasParser.load(canvasPath);
      expect(finalCanvas.nodes.length).toBeGreaterThan(initialNodes.length);

      // Force re-index to sync meta with canvas
      await metaManager.create(canvasPath);
      const finalStats = await metaManager.getStatistics(canvasPath);
      expect(finalStats.totalNodes).toBe(finalCanvas.nodes.length);
    });

    it('should maintain data consistency across operations', async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      const canvasPath = '/vault/03_Canvas/consistency_test.canvas';

      // Create initial canvas
      const engine1 = new LayoutEngine();
      const { nodes: n1, edges: e1 } = engine1.createInitialLayout('Test');
      await CanvasParser.save(canvasPath, n1, e1);

      const metaManager = new MetaManager('/vault/03_Canvas');
      await metaManager.create(canvasPath);

      // Multiple expand operations
      for (let i = 0; i < 5; i++) {
        const canvas = await CanvasParser.load(canvasPath);
        const engine = new LayoutEngine(canvas.nodes, canvas.edges);
        const topicId = canvas.nodes.find((n) => n.color === '6')!.id;

        engine.allocateByRelation({
          anchorId: topicId,
          relation: i % 2 === 0 ? 'answers' : 'elaborates',
          content: { type: 'text', text: `Content ${i}` },
        });

        await CanvasParser.save(canvasPath, engine.getNodes(), engine.getEdges());
      }

      // Verify consistency
      const finalCanvas = await CanvasParser.load(canvasPath);

      // All nodes should have unique IDs
      const nodeIds = finalCanvas.nodes.map((n) => n.id);
      expect(new Set(nodeIds).size).toBe(nodeIds.length);

      // All edges should reference existing nodes
      for (const edge of finalCanvas.edges) {
        expect(nodeIds).toContain(edge.fromNode);
        expect(nodeIds).toContain(edge.toNode);
      }
    });
  });

  // ===========================================================================
  // Error Handling Integration Tests
  // ===========================================================================

  describe('Error Handling Integration', () => {
    it('should handle missing canvas gracefully', async () => {
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });

      const metaManager = new MetaManager('/vault/03_Canvas');

      // Should create meta even if canvas doesn't exist
      const meta = await metaManager.create('/vault/03_Canvas/nonexistent.canvas');
      expect(meta).toBeDefined();
    });

    it('should handle corrupted canvas file', async () => {
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });
      vol.writeFileSync('/vault/03_Canvas/corrupted.canvas', 'not json');

      await expect(CanvasParser.load('/vault/03_Canvas/corrupted.canvas')).rejects.toThrow();
    });

    it('should handle concurrent modifications', async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      const canvasPath = '/vault/03_Canvas/concurrent.canvas';

      // Create initial canvas
      const engine = new LayoutEngine();
      const { nodes, edges } = engine.createInitialLayout('Concurrent Test');
      await CanvasParser.save(canvasPath, nodes, edges);

      const metaManager = new MetaManager('/vault/03_Canvas');
      await metaManager.create(canvasPath);

      // Simulate concurrent operations
      const operations = Array.from({ length: 5 }, (_, i) =>
        metaManager.addWorkflowAction(canvasPath, `action-${i}`, `agent-${i}`)
      );

      await Promise.all(operations);

      // Verify at least some actions were recorded
      const meta = await metaManager.load(canvasPath);
      expect(meta.workflow.history.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Performance Integration Tests
  // ===========================================================================

  describe('Performance Integration', () => {
    it('should handle complex canvas efficiently', async () => {
      vol.mkdirSync('/vault/03_Canvas', { recursive: true });

      const engine = new LayoutEngine();
      const { nodes: initialNodes } = engine.createInitialLayout('Complex Topic');
      const topicId = initialNodes[0].id;

      // Add many nodes
      const { duration } = await measureTime(async () => {
        for (let i = 0; i < 50; i++) {
          const relations = ['answers', 'elaborates', 'background', 'followUp', 'alternative'];
          engine.allocateByRelation({
            anchorId: topicId,
            relation: relations[i % relations.length],
            content: { type: 'text', text: `Node content ${i}` },
          });
        }

        const canvasPath = '/vault/03_Canvas/complex.canvas';
        await CanvasParser.save(canvasPath, engine.getNodes(), engine.getEdges());
      });

      expect(duration).toBeLessThan(5000); // < 5 seconds
    });

    it('should build cross-reference index efficiently', async () => {
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });

      // Create many canvases
      for (let i = 0; i < 20; i++) {
        const nodes = [
          { id: 't', type: 'text', x: 0, y: 0, width: 400, height: 100, text: `# Topic ${i}`, color: '6' },
          { id: 'k', type: 'text', x: 0, y: 150, width: 300, height: 100, text: `**keyword${i % 5}**` },
        ];
        vol.writeFileSync(
          `/vault/03_Canvas/canvas${i}.canvas`,
          JSON.stringify({ nodes, edges: [] })
        );
      }

      const crossRef = new CrossReferenceManager('/vault/03_Canvas');

      const { duration } = await measureTime(() => crossRef.buildIndex());

      expect(duration).toBeLessThan(5000); // < 5 seconds
    });
  });
});
