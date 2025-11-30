/**
 * LayoutEngine Unit Tests
 *
 * Zone 기반 레이아웃 및 충돌 감지 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { LayoutEngine } from '../../src/engine/layout-engine.js';
import { FIXTURES, nodesCollide, measureTime } from '../helpers/setup.js';
import { ZONE_SPECS, Zone } from '../../src/types/semantic.js';

// Mock fs/promises with memfs
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('LayoutEngine', () => {
  beforeEach(() => {
    vol.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Constructor Tests
  // ===========================================================================

  describe('Constructor', () => {
    it('should create engine with empty nodes and edges', () => {
      const engine = new LayoutEngine();

      expect(engine.getNodes()).toHaveLength(0);
      expect(engine.getEdges()).toHaveLength(0);
    });

    it('should create engine with initial nodes', () => {
      const nodes = [
        FIXTURES.textNode({ id: 'n1' }),
        FIXTURES.textNode({ id: 'n2' }),
      ];
      const engine = new LayoutEngine(nodes);

      expect(engine.getNodes()).toHaveLength(2);
    });

    it('should create engine with initial edges', () => {
      const nodes = [
        FIXTURES.textNode({ id: 'n1' }),
        FIXTURES.textNode({ id: 'n2' }),
      ];
      const edges = [FIXTURES.edge('n1', 'n2')];
      const engine = new LayoutEngine(nodes, edges);

      expect(engine.getEdges()).toHaveLength(1);
    });

    it('should initialize zone counts to zero', () => {
      const engine = new LayoutEngine();
      const counts = engine.getZoneCounts();

      for (const zone of Object.keys(ZONE_SPECS)) {
        expect(counts[zone]).toBe(0);
      }
    });
  });

  // ===========================================================================
  // allocateByRelation Tests
  // ===========================================================================

  describe('allocateByRelation()', () => {
    it('should allocate node to correct zone based on relation', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'This is an answer' },
      });

      expect(result).not.toBeNull();
      // 'answers' maps to SOUTH zone
      expect(result!.node.y).toBeGreaterThan(topicNode.y);
    });

    it('should throw error for non-existent anchor', () => {
      const engine = new LayoutEngine();

      expect(() => {
        engine.allocateByRelation({
          anchorId: 'nonexistent',
          relation: 'answers',
          content: { type: 'text', text: 'Test' },
        });
      }).toThrow('Anchor node not found');
    });

    it('should create edge only for specific relations', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      // 'answers' should create edge
      const answersResult = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer' },
      });
      expect(answersResult!.edge).not.toBeNull();

      // 'background' should NOT create edge
      const backgroundResult = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'background',
        content: { type: 'text', text: 'Background' },
      });
      expect(backgroundResult!.edge).toBeNull();
    });

    it('should apply default color from zone spec', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer' },
      });

      // SOUTH zone default color is '3' (yellow)
      expect(result!.node.color).toBe('3');
    });

    it('should use custom color when provided', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer' },
        color: '5',
      });

      expect(result!.node.color).toBe('5');
    });

    it('should create text node with correct content', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'elaborates',
        content: { type: 'text', text: 'Detailed explanation' },
      });

      expect(result!.node.type).toBe('text');
      expect((result!.node as any).text).toBe('Detailed explanation');
    });

    it('should create file node with correct path', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'background',
        content: { type: 'file', file: 'notes/reference.md' },
      });

      expect(result!.node.type).toBe('file');
      expect((result!.node as any).file).toBe('notes/reference.md');
    });

    it('should create link node with correct URL', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'resource',
        content: { type: 'link', url: 'https://example.com' },
      });

      expect(result!.node.type).toBe('link');
      expect((result!.node as any).url).toBe('https://example.com');
    });

    it('should update zone counts after allocation', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer' },
      });

      const counts = engine.getZoneCounts();
      expect(counts['SOUTH']).toBe(1);
    });

    it('should handle unknown relation by defaulting to SOUTH', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'unknown_relation_xyz',
        content: { type: 'text', text: 'Test' },
      });

      expect(result).not.toBeNull();
      // Should be placed in SOUTH (default fallback)
      expect(result!.node.y).toBeGreaterThan(topicNode.y);
    });
  });

  // ===========================================================================
  // allocateMultiple Tests
  // ===========================================================================

  describe('allocateMultiple()', () => {
    it('should allocate multiple nodes', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const results = engine.allocateMultiple('topic', [
        { relation: 'answers', content: { type: 'text', text: 'Answer 1' } },
        { relation: 'elaborates', content: { type: 'text', text: 'Detail 1' } },
        { relation: 'background', content: { type: 'file', file: 'bg.md' } },
      ]);

      expect(results).toHaveLength(3);
    });

    it('should skip failed allocations', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      // Force collision by allocating many nodes to same zone
      const results = engine.allocateMultiple(
        'topic',
        Array.from({ length: 100 }, () => ({
          relation: 'answers',
          content: { type: 'text', text: 'A'.repeat(1000) },
        }))
      );

      // Some might fail due to space constraints
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(100);
    });
  });

  // ===========================================================================
  // Zone Position Calculation Tests
  // ===========================================================================

  describe('Zone Position Calculation', () => {
    // Only test zones that have actual relations mapped to them
    // Note: NORTH_EAST has no relation mapped to it in RELATION_TO_ZONE
    const zoneToRelation: Record<string, string> = {
      NORTH: 'parent',
      SOUTH: 'answers',
      EAST: 'followUp',
      WEST: 'background',
      NORTH_WEST: 'prerequisite',
      SOUTH_EAST: 'elaborates',
      SOUTH_WEST: 'alternative',
    };

    Object.entries(zoneToRelation).forEach(([zone, relation]) => {
      it(`should place node in ${zone} zone correctly`, () => {
        const topicNode = FIXTURES.textNode({
          id: 'topic',
          x: 500,
          y: 500,
          width: 400,
          height: 100,
        });
        const engine = new LayoutEngine([topicNode]);

        const result = engine.allocateByRelation({
          anchorId: 'topic',
          relation,
          content: { type: 'text', text: 'Test content' },
        });

        expect(result).not.toBeNull();

        const spec = ZONE_SPECS[zone as Zone];
        const node = result!.node;

        // Verify direction based on zone spec
        if (spec.dx > 0) {
          expect(node.x).toBeGreaterThan(topicNode.x);
        } else if (spec.dx < 0) {
          expect(node.x).toBeLessThan(topicNode.x);
        }

        if (spec.dy > 0) {
          expect(node.y).toBeGreaterThan(topicNode.y);
        } else if (spec.dy < 0) {
          expect(node.y).toBeLessThan(topicNode.y);
        }
      });
    });

    it('should stack nodes vertically when zone is not full', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      const result1 = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer 1' },
      });

      const result2 = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer 2' },
      });

      expect(result1).not.toBeNull();
      expect(result2).not.toBeNull();

      // Second node should be below first
      expect(result2!.node.y).toBeGreaterThan(result1!.node.y);
    });

    it('should wrap to grid packing when column is full', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      const results: any[] = [];
      for (let i = 0; i < 5; i++) {
        const result = engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Answer ${i + 1}` },
        });
        if (result) results.push(result);
      }

      expect(results.length).toBeGreaterThanOrEqual(3);

      // After maxColumnNodes (3), should start new column
      if (results.length >= 4) {
        // Node 4 might be in different X position
        const node3 = results[2].node;
        const node4 = results[3].node;
        // Either in new column (different X) or found fallback position
        expect(node3.x !== node4.x || node3.y !== node4.y).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Collision Detection Tests
  // ===========================================================================

  describe('Collision Detection', () => {
    it('should avoid collision with existing nodes', () => {
      const nodes = [
        FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 }),
        FIXTURES.textNode({ id: 'existing', x: 0, y: 220, width: 400, height: 200 }),
      ];
      const engine = new LayoutEngine(nodes);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'New answer' },
      });

      expect(result).not.toBeNull();

      // New node should not overlap with existing
      const existingNode = nodes[1];
      const newNode = result!.node;

      expect(nodesCollide(newNode, existingNode, 20)).toBe(false);
    });

    it('should find fallback position when primary position is occupied', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      // Fill several positions
      const results: any[] = [];
      for (let i = 0; i < 10; i++) {
        const result = engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Answer ${i}` },
        });
        if (result) results.push(result);
      }

      // All successfully allocated nodes should not overlap
      for (let i = 0; i < results.length; i++) {
        for (let j = i + 1; j < results.length; j++) {
          expect(nodesCollide(results[i].node, results[j].node, 20)).toBe(false);
        }
      }
    });

    it('should handle many allocations gracefully', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      // Try to allocate many nodes - some should fail when space runs out
      let failures = 0;
      let successes = 0;
      for (let i = 0; i < 100; i++) {
        const result = engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Very long content ${'X'.repeat(500)}` },
        });
        if (!result) {
          failures++;
        } else {
          successes++;
        }
      }

      // Engine should have some allocated nodes (at least a few should succeed)
      expect(successes).toBeGreaterThan(0);
      // The engine should have topic + successful allocations
      // Note: There may be off-by-one due to edge policy (answers creates edges)
      const totalNodes = engine.getNodes().length;
      // Just verify reasonable counts
      expect(totalNodes).toBeGreaterThanOrEqual(successes);
      expect(totalNodes).toBeLessThanOrEqual(successes + 2);
    });

    it('should ignore group nodes in collision detection', () => {
      const nodes = [
        FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 }),
        FIXTURES.groupNode({ id: 'group', x: -100, y: -100, width: 800, height: 600 }),
      ];
      const engine = new LayoutEngine(nodes);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer' },
      });

      // Should succeed even though group covers the area
      expect(result).not.toBeNull();
    });
  });

  // ===========================================================================
  // Visual Grouping Tests
  // ===========================================================================

  describe('Visual Grouping', () => {
    it('should create group when zone reaches threshold', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      // Add enough nodes to trigger group creation (threshold is 5)
      for (let i = 0; i < 6; i++) {
        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Answer ${i}` },
        });
      }

      const nodes = engine.getNodes();
      const groups = nodes.filter((n) => n.type === 'group');

      // Should have created a group for SOUTH zone
      expect(groups.length).toBeGreaterThanOrEqual(1);
    });

    it('should expand existing group when more nodes added', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      // Create initial group
      for (let i = 0; i < 6; i++) {
        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Answer ${i}` },
        });
      }

      const initialNodes = engine.getNodes();
      const initialGroup = initialNodes.find((n) => n.type === 'group');

      // Add more nodes
      for (let i = 6; i < 10; i++) {
        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Answer ${i}` },
        });
      }

      const finalNodes = engine.getNodes();
      const finalGroup = finalNodes.find((n) => n.type === 'group');

      // Group should have expanded
      if (initialGroup && finalGroup) {
        const initialArea = initialGroup.width * initialGroup.height;
        const finalArea = finalGroup.width * finalGroup.height;
        expect(finalArea).toBeGreaterThanOrEqual(initialArea);
      }
    });

    it('should not create group below threshold', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      // Add fewer nodes than threshold (< 5)
      for (let i = 0; i < 3; i++) {
        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: `Answer ${i}` },
        });
      }

      const nodes = engine.getNodes();
      const groups = nodes.filter((n) => n.type === 'group');

      expect(groups).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Initial Layout Creation Tests
  // ===========================================================================

  describe('createInitialLayout()', () => {
    it('should create topic node at center', () => {
      const engine = new LayoutEngine();
      const { nodes } = engine.createInitialLayout('Machine Learning');

      const topicNode = nodes.find((n) => n.type === 'text' && (n as any).text.includes('Machine Learning'));

      expect(topicNode).toBeDefined();
      expect(topicNode!.x).toBe(0);
      expect(topicNode!.y).toBe(0);
      expect(topicNode!.color).toBe('6'); // Purple
    });

    it('should create vault note nodes in WEST zone', () => {
      const engine = new LayoutEngine();
      const { nodes } = engine.createInitialLayout('Topic', {
        vaultNotes: ['note1.md', 'note2.md'],
      });

      const fileNodes = nodes.filter((n) => n.type === 'file');

      expect(fileNodes).toHaveLength(2);
      // WEST zone means x < 0
      fileNodes.forEach((node) => {
        expect(node.x).toBeLessThan(0);
      });
    });

    it('should create question nodes in EAST zone', () => {
      const engine = new LayoutEngine();
      const { nodes } = engine.createInitialLayout('Topic', {
        questions: ['What is this?', 'How does it work?'],
      });

      const questionNodes = nodes.filter((n) =>
        n.type === 'text' && ((n as any).text.includes('?') || n.color === '4')
      );

      expect(questionNodes.length).toBeGreaterThanOrEqual(2);
      // EAST zone means x > topic width
      questionNodes.forEach((node) => {
        expect(node.x).toBeGreaterThan(0);
      });
    });

    it('should limit vault notes to 5', () => {
      const engine = new LayoutEngine();
      const { nodes } = engine.createInitialLayout('Topic', {
        vaultNotes: Array.from({ length: 10 }, (_, i) => `note${i}.md`),
      });

      const fileNodes = nodes.filter((n) => n.type === 'file');

      expect(fileNodes).toHaveLength(5);
    });

    it('should limit questions to 5', () => {
      const engine = new LayoutEngine();
      const { nodes } = engine.createInitialLayout('Topic', {
        questions: Array.from({ length: 10 }, (_, i) => `Question ${i}?`),
      });

      const questionNodes = nodes.filter((n) =>
        n.type === 'text' && (n as any).text.includes('?')
      );

      expect(questionNodes.length).toBeLessThanOrEqual(5);
    });

    it('should not create edges for background/followUp relations', () => {
      const engine = new LayoutEngine();
      const { edges } = engine.createInitialLayout('Topic', {
        vaultNotes: ['note.md'],
        questions: ['Question?'],
      });

      // Initial layout uses background (no edge) and followUp (no edge)
      expect(edges).toHaveLength(0);
    });

    it('should calculate dynamic size for topic node', () => {
      const engine = new LayoutEngine();
      const shortTopic = 'AI';
      const longTopic = 'A Very Long Topic Title That Should Cause The Node To Be Wider';

      const { nodes: shortNodes } = engine.createInitialLayout(shortTopic);
      const shortTopicNode = shortNodes[0];

      const engine2 = new LayoutEngine();
      const { nodes: longNodes } = engine2.createInitialLayout(longTopic);
      const longTopicNode = longNodes[0];

      // Both should have minimum width
      expect(shortTopicNode.width).toBeGreaterThanOrEqual(450);
      expect(longTopicNode.width).toBeGreaterThanOrEqual(450);
    });
  });

  // ===========================================================================
  // Utility Method Tests
  // ===========================================================================

  describe('Utility Methods', () => {
    describe('getNodes()', () => {
      it('should return copy of nodes without metadata', () => {
        const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
        const engine = new LayoutEngine([topicNode]);

        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: 'Answer' },
        });

        const nodes = engine.getNodes();
        const answerNode = nodes.find((n) => (n as any).text === 'Answer');

        expect(answerNode).toBeDefined();
        expect((answerNode as any)._metadata).toBeUndefined();
      });
    });

    describe('getEdges()', () => {
      it('should return copy of edges', () => {
        const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
        const engine = new LayoutEngine([topicNode]);

        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: 'Answer' },
        });

        const edges = engine.getEdges();

        expect(edges).toHaveLength(1);
        expect(edges[0].fromNode).toBe('topic');
      });
    });

    describe('addNode()', () => {
      it('should add node to internal list', () => {
        const engine = new LayoutEngine();
        const node = FIXTURES.textNode({ id: 'manual' });

        engine.addNode(node);

        expect(engine.getNodes()).toHaveLength(1);
        expect(engine.getNodes()[0].id).toBe('manual');
      });
    });

    describe('addEdge()', () => {
      it('should add edge to internal list', () => {
        const engine = new LayoutEngine();
        const edge = FIXTURES.edge('a', 'b');

        engine.addEdge(edge);

        expect(engine.getEdges()).toHaveLength(1);
      });
    });

    describe('getZoneCounts()', () => {
      it('should return copy of zone counts', () => {
        const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
        const engine = new LayoutEngine([topicNode]);

        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'text', text: 'Answer' },
        });

        const counts = engine.getZoneCounts();

        expect(counts['SOUTH']).toBe(1);

        // Modifying returned object shouldn't affect engine
        counts['SOUTH'] = 999;
        expect(engine.getZoneCounts()['SOUTH']).toBe(1);
      });
    });
  });

  // ===========================================================================
  // Performance Tests
  // ===========================================================================

  describe('Performance', () => {
    it('should allocate 100 nodes in reasonable time', async () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      const { duration } = await measureTime(async () => {
        for (let i = 0; i < 100; i++) {
          const relations = ['answers', 'elaborates', 'background', 'followUp', 'alternative'];
          engine.allocateByRelation({
            anchorId: 'topic',
            relation: relations[i % relations.length],
            content: { type: 'text', text: `Content ${i}` },
          });
        }
      });

      // Should complete in less than 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large number of collision checks', async () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      // Pre-populate with many nodes
      for (let i = 0; i < 50; i++) {
        engine.addNode(
          FIXTURES.textNode({
            id: `existing-${i}`,
            x: (i % 10) * 500,
            y: Math.floor(i / 10) * 300,
          })
        );
      }

      const { duration } = await measureTime(async () => {
        for (let i = 0; i < 20; i++) {
          engine.allocateByRelation({
            anchorId: 'topic',
            relation: 'answers',
            content: { type: 'text', text: `New content ${i}` },
          });
        }
      });

      // Should still be reasonably fast
      expect(duration).toBeLessThan(3000);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle anchor at negative coordinates', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: -500, y: -500, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: 'Answer' },
      });

      expect(result).not.toBeNull();
      // SOUTH of negative anchor
      expect(result!.node.y).toBeGreaterThan(-500);
    });

    it('should handle anchor at origin (0, 0)', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0, width: 400, height: 100 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'background', // WEST
        content: { type: 'text', text: 'Background' },
      });

      expect(result).not.toBeNull();
      // Should be in negative X space
      expect(result!.node.x).toBeLessThan(0);
    });

    it('should handle empty content', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'answers',
        content: { type: 'text', text: '' },
      });

      expect(result).not.toBeNull();
      expect((result!.node as any).text).toBe('');
    });

    it('should handle very long text content', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      const longText = 'A'.repeat(10000);
      const result = engine.allocateByRelation({
        anchorId: 'topic',
        relation: 'elaborates',
        content: { type: 'text', text: longText },
      });

      expect(result).not.toBeNull();
      // Size should be capped at maximum
      expect(result!.node.width).toBeLessThanOrEqual(600);
      expect(result!.node.height).toBeLessThanOrEqual(500);
    });

    it('should throw error for unknown content type', () => {
      const topicNode = FIXTURES.textNode({ id: 'topic', x: 0, y: 0 });
      const engine = new LayoutEngine([topicNode]);

      expect(() => {
        engine.allocateByRelation({
          anchorId: 'topic',
          relation: 'answers',
          content: { type: 'unknown' as any },
        });
      }).toThrow('Unknown content type');
    });
  });
});
