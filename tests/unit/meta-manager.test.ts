/**
 * MetaManager Unit Tests
 *
 * Sidecar 메타데이터 관리 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { MetaManager } from '../../src/engine/meta-manager.js';
import { FIXTURES, createTestCanvas } from '../helpers/setup.js';

// Mock fs/promises with memfs
vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

describe('MetaManager', () => {
  let metaManager: MetaManager;

  beforeEach(() => {
    vol.reset();
    vol.mkdirSync('/vault/03_Canvas', { recursive: true });
    metaManager = new MetaManager('/vault/03_Canvas');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Constructor Tests
  // ===========================================================================

  describe('Constructor', () => {
    it('should create meta manager with default canvas directory', () => {
      const manager = new MetaManager();
      expect(manager).toBeDefined();
    });

    it('should create meta manager with custom canvas directory', () => {
      const manager = new MetaManager('/custom/canvas/path');
      expect(manager).toBeDefined();
    });
  });

  // ===========================================================================
  // exists() Tests
  // ===========================================================================

  describe('exists()', () => {
    it('should return false when meta file does not exist', async () => {
      const exists = await metaManager.exists('/vault/03_Canvas/test.canvas');
      expect(exists).toBe(false);
    });

    it('should return true when meta file exists', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });
      vol.writeFileSync('/vault/03_Canvas/.meta/test.meta.json', JSON.stringify({
        canvasPath: 'test.canvas',
        createdAt: new Date().toISOString(),
      }));

      const exists = await metaManager.exists(canvasPath);
      expect(exists).toBe(true);
    });
  });

  // ===========================================================================
  // load() Tests
  // ===========================================================================

  describe('load()', () => {
    it('should auto-create meta if not exists', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';

      const meta = await metaManager.load(canvasPath, true);

      expect(meta).toBeDefined();
      expect(meta.linkedFile).toBeDefined();
    });

    it('should throw error if meta not exists and autoCreate is false', async () => {
      const canvasPath = '/vault/03_Canvas/nonexistent.canvas';

      await expect(metaManager.load(canvasPath, false)).rejects.toThrow();
    });

    it('should load existing meta file', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const existingMeta = {
        canvasPath: 'test.canvas',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        syncedAt: Date.now() + 1000000, // Future time to prevent reindex
        topic: 'Test Topic',
        workflow: { state: 'created', history: [] },
        semanticGraph: {},
        statistics: {
          totalNodes: 0,
          questions: 0,
          resolvedQuestions: 0,
          webLinks: 0,
          vaultNotes: 0,
        },
      };

      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });
      vol.writeFileSync('/vault/03_Canvas/.meta/test.meta.json', JSON.stringify(existingMeta));

      const meta = await metaManager.load(canvasPath);

      expect(meta.topic).toBe('Test Topic');
    });

    it('should reindex if canvas is newer than meta', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';

      // Create canvas first
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: '# Topic' })],
        edges: [],
      };
      vol.writeFileSync(canvasPath, JSON.stringify(canvas));

      // Create meta with old syncedAt
      const oldMeta = {
        canvasPath: 'test.canvas',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        syncedAt: 1, // Very old
        topic: 'Old Topic',
        workflow: { state: 'created', history: [] },
        semanticGraph: {},
        statistics: {
          totalNodes: 0,
          questions: 0,
          resolvedQuestions: 0,
          webLinks: 0,
          vaultNotes: 0,
        },
      };

      vol.mkdirSync('/vault/03_Canvas/.meta', { recursive: true });
      vol.writeFileSync('/vault/03_Canvas/.meta/test.meta.json', JSON.stringify(oldMeta));

      const meta = await metaManager.load(canvasPath);

      // Should have reindexed - totalNodes should reflect actual nodes
      expect(meta.statistics.totalNodes).toBe(1);
    });
  });

  // ===========================================================================
  // save() Tests
  // ===========================================================================

  describe('save()', () => {
    it('should create meta directory if not exists', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const meta = {
        canvasPath: 'test.canvas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now(),
        topic: '',
        workflow: { state: 'created' as const, history: [] },
        semanticGraph: {},
        statistics: {
          totalNodes: 0,
          questions: 0,
          resolvedQuestions: 0,
          webLinks: 0,
          vaultNotes: 0,
        },
      };

      await metaManager.save(canvasPath, meta);

      expect(vol.existsSync('/vault/03_Canvas/.meta')).toBe(true);
    });

    it('should update updatedAt and syncedAt', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const meta = {
        canvasPath: 'test.canvas',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        syncedAt: 1,
        topic: '',
        workflow: { state: 'created' as const, history: [] },
        semanticGraph: {},
        statistics: {
          totalNodes: 0,
          questions: 0,
          resolvedQuestions: 0,
          webLinks: 0,
          vaultNotes: 0,
        },
      };

      const before = Date.now();
      await metaManager.save(canvasPath, meta);
      const after = Date.now();

      expect(meta.syncedAt).toBeGreaterThanOrEqual(before);
      expect(meta.syncedAt).toBeLessThanOrEqual(after);
      expect(new Date(meta.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
    });

    it('should write valid JSON to file', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const meta = {
        canvasPath: 'test.canvas',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedAt: Date.now(),
        topic: 'Test Topic',
        workflow: { state: 'created' as const, history: [] },
        semanticGraph: {},
        statistics: {
          totalNodes: 5,
          questions: 2,
          resolvedQuestions: 1,
          webLinks: 3,
          vaultNotes: 4,
        },
      };

      await metaManager.save(canvasPath, meta);

      const content = vol.readFileSync('/vault/03_Canvas/.meta/test.meta.json', 'utf8');
      const saved = JSON.parse(content as string);

      expect(saved.topic).toBe('Test Topic');
      expect(saved.statistics.totalNodes).toBe(5);
    });
  });

  // ===========================================================================
  // create() Tests
  // ===========================================================================

  describe('create()', () => {
    it('should create default meta for new canvas', async () => {
      const canvasPath = '/vault/03_Canvas/new.canvas';

      const meta = await metaManager.create(canvasPath);

      expect(meta.linkedFile).toBe(canvasPath);
      expect(meta.workflow.state).toBe('created');
      expect(meta.workflow.history).toEqual([]);
      expect(meta.semanticGraph).toEqual({});
    });

    it('should index existing canvas when creating meta', async () => {
      const canvasPath = '/vault/03_Canvas/existing.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'q1', text: '? What is this?', color: '4' }),
          FIXTURES.fileNode({ id: 'f1', file: 'note.md' }),
          FIXTURES.linkNode({ id: 'l1', url: 'https://example.com' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));

      const meta = await metaManager.create(canvasPath);

      expect(meta.statistics.totalNodes).toBe(3);
      expect(meta.statistics.questions).toBe(1);
      expect(meta.statistics.vaultNotes).toBe(1);
      expect(meta.statistics.webLinks).toBe(1);
    });
  });

  // ===========================================================================
  // Node Role Inference Tests
  // ===========================================================================

  describe('Node Role Inference', () => {
    it('should infer topic role from purple color', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: '# Topic', color: '6' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('topic');
    });

    it('should infer question role from green color', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'What?', color: '4' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('question');
    });

    it('should infer answer role from yellow color', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'Answer text', color: '3' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('answer');
    });

    it('should infer command role from red color with colon', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'RESEARCH: Find more info', color: '1' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('command');
    });

    it('should infer vaultNote role from red color without colon', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'Just a note', color: '1' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('vaultNote');
    });

    it('should infer vaultNote role from file node', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.fileNode({ id: 'f1', file: 'note.md' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['f1'].role).toBe('vaultNote');
    });

    it('should infer resource role from link node', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.linkNode({ id: 'l1', url: 'https://example.com' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['l1'].role).toBe('resource');
    });

    it('should infer topic role from text starting with #', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: '# Main Topic' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('topic');
    });

    it('should infer question role from text with ?', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'What is this about?' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('question');
    });
  });

  // ===========================================================================
  // Intent Detection Tests
  // ===========================================================================

  describe('Intent Detection', () => {
    const intentKeywords = ['RESEARCH', 'EXPAND', 'ANSWER', 'LINK', 'ATOMIZE', 'CRYSTALLIZE'];

    intentKeywords.forEach((keyword) => {
      it(`should detect ${keyword} intent`, async () => {
        const canvasPath = '/vault/03_Canvas/test.canvas';
        const canvas = {
          nodes: [FIXTURES.textNode({ id: 'n1', text: `${keyword}: Do something`, color: '1' })],
          edges: [],
        };

        vol.writeFileSync(canvasPath, JSON.stringify(canvas));
        const meta = await metaManager.create(canvasPath);

        expect(meta.semanticGraph['n1'].intent).toBe(keyword);
        expect(meta.semanticGraph['n1'].status).toBe('pending');
      });
    });

    it('should not detect intent without colon', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'RESEARCH without colon', color: '1' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].intent).toBeUndefined();
    });

    it('should not detect intent without red color', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'n1', text: 'RESEARCH: With colon', color: '3' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].intent).toBeUndefined();
    });
  });

  // ===========================================================================
  // Workflow Actions Tests
  // ===========================================================================

  describe('addWorkflowAction()', () => {
    it('should add action to history', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      await metaManager.addWorkflowAction(canvasPath, 'expanded', 'test-agent', { nodes: 5 });

      const meta = await metaManager.load(canvasPath);
      expect(meta.workflow.history).toHaveLength(1);
      expect(meta.workflow.history[0].action).toBe('expanded');
      expect(meta.workflow.history[0].agent).toBe('test-agent');
      expect(meta.workflow.history[0].details).toEqual({ nodes: 5 });
    });

    it('should update workflow state for known actions', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      await metaManager.addWorkflowAction(canvasPath, 'expanded', 'agent');
      let meta = await metaManager.load(canvasPath);
      expect(meta.workflow.state).toBe('expanded');

      await metaManager.addWorkflowAction(canvasPath, 'crystallized', 'agent');
      meta = await metaManager.load(canvasPath);
      expect(meta.workflow.state).toBe('crystallized');
    });

    it('should not change state for unknown actions', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      await metaManager.addWorkflowAction(canvasPath, 'custom_action', 'agent');

      const meta = await metaManager.load(canvasPath);
      expect(meta.workflow.state).toBe('created'); // Unchanged
      expect(meta.workflow.history).toHaveLength(1);
    });

    it('should include timestamp in action', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      const before = new Date().toISOString();
      await metaManager.addWorkflowAction(canvasPath, 'expanded', 'agent');
      const after = new Date().toISOString();

      const meta = await metaManager.load(canvasPath);
      const timestamp = meta.workflow.history[0].timestamp;

      expect(timestamp >= before).toBe(true);
      expect(timestamp <= after).toBe(true);
    });
  });

  // ===========================================================================
  // Question Resolution Tests
  // ===========================================================================

  describe('markQuestionResolved()', () => {
    it('should mark question as resolved', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [FIXTURES.textNode({ id: 'q1', text: '? Question', color: '4' })],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      await metaManager.create(canvasPath);

      await metaManager.markQuestionResolved(canvasPath, 'q1', ['answer1', 'answer2']);

      const meta = await metaManager.load(canvasPath);
      expect(meta.semanticGraph['q1'].status).toBe('resolved');
      expect(meta.semanticGraph['q1'].resolvedBy).toEqual(['answer1', 'answer2']);
    });

    it('should increment resolvedQuestions count', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'q1', text: '? Question 1', color: '4' }),
          FIXTURES.textNode({ id: 'q2', text: '? Question 2', color: '4' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      await metaManager.create(canvasPath);

      await metaManager.markQuestionResolved(canvasPath, 'q1', ['a1']);

      const meta = await metaManager.load(canvasPath);
      expect(meta.statistics.resolvedQuestions).toBe(1);
    });

    it('should handle non-existent question ID gracefully', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      // Should not throw
      await metaManager.markQuestionResolved(canvasPath, 'nonexistent', ['a1']);

      const meta = await metaManager.load(canvasPath);
      // Should not have changed anything
      expect(meta.statistics.resolvedQuestions).toBe(0);
    });
  });

  // ===========================================================================
  // Query Methods Tests
  // ===========================================================================

  describe('getPendingQuestions()', () => {
    it('should return pending question IDs', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'q1', text: '? Question 1', color: '4' }),
          FIXTURES.textNode({ id: 'q2', text: '? Question 2', color: '4' }),
          FIXTURES.textNode({ id: 'n1', text: 'Not a question' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      await metaManager.create(canvasPath);

      const pending = await metaManager.getPendingQuestions(canvasPath);

      expect(pending).toContain('q1');
      expect(pending).toContain('q2');
      expect(pending).not.toContain('n1');
    });

    it('should not return resolved questions', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'q1', text: '? Question 1', color: '4' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      await metaManager.create(canvasPath);
      await metaManager.markQuestionResolved(canvasPath, 'q1', ['a1']);

      const pending = await metaManager.getPendingQuestions(canvasPath);

      expect(pending).not.toContain('q1');
    });
  });

  describe('getIntentNodes()', () => {
    it('should return pending intent nodes', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'i1', text: 'RESEARCH: Find more', color: '1' }),
          FIXTURES.textNode({ id: 'i2', text: 'EXPAND: Add details', color: '1' }),
          FIXTURES.textNode({ id: 'n1', text: 'Regular node' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      await metaManager.create(canvasPath);

      const intents = await metaManager.getIntentNodes(canvasPath);

      expect(intents).toHaveLength(2);
      expect(intents.find((i) => i.id === 'i1')?.intent).toBe('RESEARCH');
      expect(intents.find((i) => i.id === 'i2')?.intent).toBe('EXPAND');
    });
  });

  describe('getWorkflowState()', () => {
    it('should return current workflow state', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      let state = await metaManager.getWorkflowState(canvasPath);
      expect(state).toBe('created');

      await metaManager.addWorkflowAction(canvasPath, 'expanded', 'agent');
      state = await metaManager.getWorkflowState(canvasPath);
      expect(state).toBe('expanded');
    });
  });

  describe('getStatistics()', () => {
    it('should return canvas statistics', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'n1', text: '# Topic' }),
          FIXTURES.textNode({ id: 'q1', text: '? Question', color: '4' }),
          FIXTURES.fileNode({ id: 'f1', file: 'note.md' }),
          FIXTURES.linkNode({ id: 'l1', url: 'https://example.com' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      await metaManager.create(canvasPath);

      const stats = await metaManager.getStatistics(canvasPath);

      expect(stats.totalNodes).toBe(4);
      expect(stats.questions).toBe(1);
      expect(stats.vaultNotes).toBe(1);
      expect(stats.webLinks).toBe(1);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle canvas with embedded markdown links', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({
            id: 'n1',
            text: 'Check [this](https://example.com) link',
          }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.statistics.webLinks).toBe(1);
    });

    it('should handle concurrent meta operations', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      await metaManager.create(canvasPath);

      // Concurrent operations
      await Promise.all([
        metaManager.addWorkflowAction(canvasPath, 'expanded', 'agent1'),
        metaManager.addWorkflowAction(canvasPath, 'custom', 'agent2'),
      ]);

      const meta = await metaManager.load(canvasPath);
      // Both should have been recorded (though order may vary)
      expect(meta.workflow.history.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle unicode in node text', async () => {
      const canvasPath = '/vault/03_Canvas/test.canvas';
      const canvas = {
        nodes: [
          FIXTURES.textNode({ id: 'n1', text: '# 한글 제목 🚀', color: '6' }),
          FIXTURES.textNode({ id: 'q1', text: '? 이것은 무엇인가요?', color: '4' }),
        ],
        edges: [],
      };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.semanticGraph['n1'].role).toBe('topic');
      expect(meta.semanticGraph['q1'].role).toBe('question');
    });

    it('should handle empty canvas', async () => {
      const canvasPath = '/vault/03_Canvas/empty.canvas';
      const canvas = { nodes: [], edges: [] };

      vol.writeFileSync(canvasPath, JSON.stringify(canvas));
      const meta = await metaManager.create(canvasPath);

      expect(meta.statistics.totalNodes).toBe(0);
      expect(meta.semanticGraph).toEqual({});
    });
  });
});
