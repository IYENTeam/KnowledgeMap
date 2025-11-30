# Integration Test Specification

## Overview
Integration tests verify that multiple components work together correctly. These tests use real file fixtures and test the Tools layer interacting with the Engine layer.

---

## Test Setup

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { CanvasTools } from '../tools/canvas-tools';
import { VaultTools } from '../tools/vault-tools';
import { DashboardTools } from '../tools/dashboard-tools';

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
}));

const setupTestVault = () => {
  vol.fromJSON({
    'vault/01_Inbox/': null,
    'vault/03_Canvas/': null,
    'vault/notes/topic-a.md': '# Topic A\n\n#tag1 #tag2\n\n[[Topic B]]\n\nContent about **keyword1**',
    'vault/notes/topic-b.md': '# Topic B\n\n#tag1\n\n[[Topic A]]\n\nContent about **keyword2**',
    'vault/notes/unrelated.md': '# Unrelated\n\nNo tags or links',
  });
};
```

---

# Part 1: CanvasTools Integration Tests

## 1. `createCanvas()` Integration

#### TC-INT-CT-001: Create canvas with vault note search
```typescript
describe('CanvasTools Integration', () => {
  describe('createCanvas', () => {
    it('should create canvas and link related vault notes', async () => {
      // Arrange
      setupTestVault();
      const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

      // Act
      const result = await canvasTools.createCanvas({
        topic: 'Topic A Research',
        relatedKeywords: ['keyword1', 'topic'],
      });

      // Assert
      expect(result.canvasPath).toContain('Topic_A_Research.canvas');
      expect(result.nodeCount).toBeGreaterThan(1); // Topic + vault notes

      // Verify canvas file exists
      expect(vol.existsSync(result.canvasPath)).toBe(true);

      // Verify canvas contains file nodes
      const content = vol.readFileSync(result.canvasPath, 'utf-8');
      const canvas = JSON.parse(content as string);
      const fileNodes = canvas.nodes.filter((n: any) => n.type === 'file');
      expect(fileNodes.length).toBeGreaterThan(0);
    });
  });
});
```

#### TC-INT-CT-002: Create canvas with initial questions
```typescript
it('should create canvas with initial question nodes', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

  const result = await canvasTools.createCanvas({
    topic: 'Test Topic',
    initialQuestions: ['What is this?', 'Why does it matter?'],
  });

  const content = vol.readFileSync(result.canvasPath, 'utf-8');
  const canvas = JSON.parse(content as string);
  const questionNodes = canvas.nodes.filter((n: any) =>
    n.type === 'text' && n.text.includes('?')
  );
  expect(questionNodes).toHaveLength(2);
});
```

#### TC-INT-CT-003: Create canvas creates meta file
```typescript
it('should create meta file alongside canvas', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

  const result = await canvasTools.createCanvas({
    topic: 'Meta Test',
  });

  expect(vol.existsSync('vault/03_Canvas/.meta/Meta_Test.meta.json')).toBe(true);
});
```

## 2. `expandCanvas()` Integration

#### TC-INT-CT-004: Expand canvas with semantic layout
```typescript
describe('expandCanvas', () => {
  it('should add nodes with correct zone positioning', async () => {
    // Arrange - Create initial canvas
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
    const { canvasPath, topicNodeId } = await canvasTools.createCanvas({
      topic: 'Expansion Test',
    });

    // Act - Expand with multiple relations
    const result = await canvasTools.expandCanvas({
      canvasPath,
      anchorId: topicNodeId,
      items: [
        { relation: 'answers', type: 'text', content: 'The answer is...' },
        { relation: 'background', type: 'file', content: 'notes/topic-a.md' },
        { relation: 'elaborates', type: 'text', content: 'More details...' },
      ],
    });

    // Assert
    expect(result.addedNodes).toHaveLength(3);

    // Verify positions
    const content = vol.readFileSync(canvasPath, 'utf-8');
    const canvas = JSON.parse(content as string);

    const answerNode = canvas.nodes.find((n: any) => n.text?.includes('answer'));
    const bgNode = canvas.nodes.find((n: any) => n.file?.includes('topic-a'));

    // Answer should be below (SOUTH), background should be left (WEST)
    expect(answerNode.y).toBeGreaterThan(0);
    expect(bgNode.x).toBeLessThan(0);
  });
});
```

#### TC-INT-CT-005: Expand canvas updates workflow history
```typescript
it('should record expansion in workflow history', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
  const { canvasPath, topicNodeId } = await canvasTools.createCanvas({
    topic: 'Workflow Test',
  });

  await canvasTools.expandCanvas({
    canvasPath,
    anchorId: topicNodeId,
    items: [{ relation: 'answers', type: 'text', content: 'Answer' }],
  });

  // Check meta file
  const metaContent = vol.readFileSync(
    'vault/03_Canvas/.meta/Workflow_Test.meta.json',
    'utf-8'
  );
  const meta = JSON.parse(metaContent as string);
  expect(meta.workflow.history.some((h: any) => h.action === 'expanded')).toBe(true);
});
```

## 3. `getCanvasInfo()` Integration

#### TC-INT-CT-006: Get canvas info with statistics
```typescript
describe('getCanvasInfo', () => {
  it('should return accurate canvas statistics', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

    // Create and expand canvas
    const { canvasPath, topicNodeId } = await canvasTools.createCanvas({
      topic: 'Stats Test',
      initialQuestions: ['Question 1?'],
    });
    await canvasTools.expandCanvas({
      canvasPath,
      anchorId: topicNodeId,
      items: [
        { relation: 'answers', type: 'text', content: 'Answer' },
        { relation: 'resource', type: 'link', content: 'https://example.com' },
      ],
    });

    const info = await canvasTools.getCanvasInfo({ canvasPath });

    expect(info.topic).toBe('Stats Test');
    expect(info.statistics.questions).toBe(1);
    expect(info.statistics.webLinks).toBe(1);
    expect(info.nodeCount).toBeGreaterThanOrEqual(3);
  });
});
```

## 4. Question Resolution Integration

#### TC-INT-CT-007: Full question resolution flow
```typescript
describe('Question Resolution', () => {
  it('should track question resolution correctly', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

    // Create canvas with question
    const { canvasPath, topicNodeId } = await canvasTools.createCanvas({
      topic: 'Q&A Test',
      initialQuestions: ['What is the answer?'],
    });

    // Get question ID
    const questions = await canvasTools.listQuestions({
      canvasPath,
      status: 'pending',
    });
    const questionId = questions.questions[0].id;

    // Add answer
    const { nodeId: answerId } = await canvasTools.addNode({
      canvasPath,
      anchorId: questionId,
      relation: 'answers',
      type: 'text',
      content: 'The answer is 42',
    });

    // Resolve question
    await canvasTools.resolveQuestion({
      canvasPath,
      questionId,
      answerIds: [answerId],
    });

    // Verify
    const resolvedQuestions = await canvasTools.listQuestions({
      canvasPath,
      status: 'resolved',
    });
    expect(resolvedQuestions.questions).toHaveLength(1);
    expect(resolvedQuestions.questions[0].resolvedBy).toContain(answerId);
  });
});
```

## 5. `crystallizeCanvas()` Integration

#### TC-INT-CT-008: Crystallize canvas to markdown
```typescript
describe('crystallizeCanvas', () => {
  it('should create markdown note from canvas', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

    const { canvasPath, topicNodeId } = await canvasTools.createCanvas({
      topic: 'Crystallize Test',
    });
    await canvasTools.expandCanvas({
      canvasPath,
      anchorId: topicNodeId,
      items: [
        { relation: 'answers', type: 'text', content: 'Key insight 1' },
        { relation: 'elaborates', type: 'text', content: 'Detailed explanation' },
      ],
    });

    const result = await canvasTools.crystallizeCanvas({
      canvasPath,
      format: 'detailed',
    });

    // Verify output file
    expect(vol.existsSync(result.outputPath)).toBe(true);
    const content = vol.readFileSync(result.outputPath, 'utf-8') as string;
    expect(content).toContain('Crystallize Test');
    expect(content).toContain('Key insight');
  });
});
```

---

# Part 2: VaultTools Integration Tests

## 6. Vault Search Integration

#### TC-INT-VT-001: Search and find related notes
```typescript
describe('VaultTools Integration', () => {
  describe('searchNotes', () => {
    it('should find notes by keyword search', async () => {
      setupTestVault();
      const vaultTools = new VaultTools('vault', 'vault/03_Canvas');
      await vaultTools.buildIndex({});

      const result = await vaultTools.searchNotes({
        query: 'keyword1',
        type: 'keyword',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].path).toContain('topic-a');
    });
  });
});
```

#### TC-INT-VT-002: Search by tag
```typescript
it('should find notes by tag search', async () => {
  setupTestVault();
  const vaultTools = new VaultTools('vault', 'vault/03_Canvas');
  await vaultTools.buildIndex({});

  const result = await vaultTools.searchNotes({
    query: 'tag1',
    type: 'tag',
  });

  expect(result.results).toHaveLength(2); // topic-a and topic-b both have tag1
});
```

## 7. Cross-Reference Integration

#### TC-INT-VT-003: Find related canvases
```typescript
describe('Cross-Reference', () => {
  it('should find related canvases after multiple canvas creation', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
    const vaultTools = new VaultTools('vault', 'vault/03_Canvas');

    // Create related canvases
    await canvasTools.createCanvas({
      topic: 'Machine Learning',
      relatedKeywords: ['ML', 'AI'],
    });
    await canvasTools.createCanvas({
      topic: 'Deep Learning',
      relatedKeywords: ['ML', 'neural networks'],
    });
    await canvasTools.createCanvas({
      topic: 'Cooking Recipes',
      relatedKeywords: ['food', 'kitchen'],
    });

    // Build cross-reference index
    await vaultTools.buildCrossRefIndex(true);

    // Find related to ML canvas
    const related = await vaultTools.findRelatedCanvases({
      canvasPath: 'vault/03_Canvas/Machine_Learning.canvas',
    });

    expect(related.canvases.length).toBeGreaterThan(0);
    expect(related.canvases[0].path).toContain('Deep_Learning');
  });
});
```

#### TC-INT-VT-004: Get canvas network
```typescript
it('should generate canvas network graph', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
  const vaultTools = new VaultTools('vault', 'vault/03_Canvas');

  // Create canvases
  await canvasTools.createCanvas({ topic: 'Node A', relatedKeywords: ['shared'] });
  await canvasTools.createCanvas({ topic: 'Node B', relatedKeywords: ['shared'] });
  await vaultTools.buildCrossRefIndex(true);

  const network = await vaultTools.getCanvasNetwork({});

  expect(network.nodes.length).toBe(2);
  expect(network.edges.length).toBeGreaterThan(0);
});
```

---

# Part 3: DashboardTools Integration Tests

## 8. Dashboard Overview Integration

#### TC-INT-DT-001: Get comprehensive dashboard
```typescript
describe('DashboardTools Integration', () => {
  describe('getDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      setupTestVault();
      const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
      const dashboardTools = new DashboardTools('vault/03_Canvas', 'vault');

      // Create multiple canvases in different states
      await canvasTools.createCanvas({ topic: 'Active Canvas', initialQuestions: ['Q1?'] });
      await canvasTools.createCanvas({ topic: 'Another Canvas' });

      const dashboard = await dashboardTools.getDashboard({});

      expect(dashboard.overview.totalCanvases).toBe(2);
      expect(dashboard.overview.pendingQuestions).toBe(1);
      expect(dashboard.byState.created).toBe(2);
      expect(dashboard.topCanvases.length).toBeLessThanOrEqual(10);
    });
  });
});
```

## 9. Pending Tasks Integration

#### TC-INT-DT-002: Get pending tasks across canvases
```typescript
describe('getPendingTasks', () => {
  it('should aggregate pending tasks from all canvases', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
    const dashboardTools = new DashboardTools('vault/03_Canvas', 'vault');

    // Create canvases with questions
    await canvasTools.createCanvas({
      topic: 'Canvas 1',
      initialQuestions: ['Q1?', 'Q2?'],
    });
    await canvasTools.createCanvas({
      topic: 'Canvas 2',
      initialQuestions: ['Q3?'],
    });

    const pending = await dashboardTools.getPendingTasks({});

    expect(pending.totalPending).toBe(3);
    expect(pending.tasks.every(t => t.type === 'question')).toBe(true);
  });
});
```

## 10. System Health Integration

#### TC-INT-DT-003: Check system health
```typescript
describe('getSystemHealth', () => {
  it('should report healthy when all components exist', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
    const vaultTools = new VaultTools('vault', 'vault/03_Canvas');
    const dashboardTools = new DashboardTools('vault/03_Canvas', 'vault');

    // Initialize everything
    await canvasTools.createCanvas({ topic: 'Test' });
    await vaultTools.buildIndex({});
    await vaultTools.buildCrossRefIndex(true);

    const health = await dashboardTools.getSystemHealth({});

    expect(health.status).toBe('healthy');
    expect(health.components.canvasDir).toBe(true);
    expect(health.components.vaultIndex).toBe(true);
    expect(health.components.metaDir).toBe(true);
  });

  it('should report degraded when some components missing', async () => {
    vol.fromJSON({
      'vault/03_Canvas/': null,
    });
    const dashboardTools = new DashboardTools('vault/03_Canvas', 'vault');

    const health = await dashboardTools.getSystemHealth({});

    expect(health.status).not.toBe('healthy');
    expect(health.recommendations.length).toBeGreaterThan(0);
  });
});
```

---

# Part 4: Full Workflow Integration Tests

## 11. Complete Knowledge Workflow

#### TC-INT-WF-001: Full canvas lifecycle
```typescript
describe('Full Workflow', () => {
  it('should support complete canvas lifecycle', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
    const dashboardTools = new DashboardTools('vault/03_Canvas', 'vault');

    // 1. Create canvas
    const { canvasPath, topicNodeId } = await canvasTools.createCanvas({
      topic: 'Complete Workflow Test',
      relatedKeywords: ['keyword1'],
      initialQuestions: ['What should we learn?'],
    });

    // Verify created state
    let progress = await dashboardTools.getWorkflowProgress({ canvasPath });
    expect(progress.currentState).toBe('created');

    // 2. Expand canvas
    const questions = await canvasTools.listQuestions({ canvasPath, status: 'pending' });
    await canvasTools.expandCanvas({
      canvasPath,
      anchorId: questions.questions[0].id,
      items: [
        { relation: 'answers', type: 'text', content: 'We should learn X' },
        { relation: 'elaborates', type: 'text', content: 'Because of Y' },
      ],
    });

    // Verify expanded state
    progress = await dashboardTools.getWorkflowProgress({ canvasPath });
    expect(progress.currentState).toBe('expanded');

    // 3. Resolve question
    const pendingQ = await canvasTools.listQuestions({ canvasPath, status: 'pending' });
    const info = await canvasTools.getCanvasInfo({ canvasPath });
    const answerNode = info.nodes.find(n => n.preview.includes('We should learn'));
    await canvasTools.resolveQuestion({
      canvasPath,
      questionId: pendingQ.questions[0].id,
      answerIds: [answerNode!.id],
    });

    // 4. Crystallize
    const crystallized = await canvasTools.crystallizeCanvas({
      canvasPath,
      format: 'summary',
    });

    // Verify crystallized state
    progress = await dashboardTools.getWorkflowProgress({ canvasPath });
    expect(progress.currentState).toBe('crystallized');
    expect(vol.existsSync(crystallized.outputPath)).toBe(true);
  });
});
```

## 12. Multi-Canvas Relationship Workflow

#### TC-INT-WF-002: Cross-canvas knowledge linking
```typescript
it('should discover relationships between canvases', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
  const vaultTools = new VaultTools('vault', 'vault/03_Canvas');

  // Create interconnected knowledge canvases
  await canvasTools.createCanvas({
    topic: 'TypeScript Basics',
    relatedKeywords: ['TypeScript', 'JavaScript', 'programming'],
  });

  const { canvasPath: reactPath, topicNodeId: reactTopic } = await canvasTools.createCanvas({
    topic: 'React Development',
    relatedKeywords: ['React', 'TypeScript', 'frontend'],
  });

  await canvasTools.createCanvas({
    topic: 'Node.js Backend',
    relatedKeywords: ['Node.js', 'TypeScript', 'backend'],
  });

  // Build cross-reference
  await vaultTools.buildCrossRefIndex(true);

  // Get suggestions for React canvas
  const suggestions = await vaultTools.suggestLinks({
    canvasPath: reactPath,
  });

  // Should suggest TypeScript and Node.js due to shared keywords
  expect(suggestions.suggestions.length).toBeGreaterThan(0);
  expect(suggestions.suggestions.some(s =>
    s.topic.includes('TypeScript') || s.topic.includes('Node.js')
  )).toBe(true);
});
```

---

# Part 5: Error Handling Integration Tests

## 13. Error Scenarios

#### TC-INT-ERR-001: Handle missing canvas gracefully
```typescript
describe('Error Handling', () => {
  it('should handle operations on non-existent canvas', async () => {
    setupTestVault();
    const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

    await expect(
      canvasTools.getCanvasInfo({ canvasPath: 'nonexistent.canvas' })
    ).rejects.toThrow();
  });
});
```

#### TC-INT-ERR-002: Handle invalid anchor node
```typescript
it('should handle invalid anchor node in expansion', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');
  const { canvasPath } = await canvasTools.createCanvas({ topic: 'Test' });

  await expect(
    canvasTools.expandCanvas({
      canvasPath,
      anchorId: 'invalid-anchor',
      items: [{ relation: 'answers', type: 'text', content: 'test' }],
    })
  ).rejects.toThrow(/Anchor node not found/);
});
```

#### TC-INT-ERR-003: Handle corrupted meta file
```typescript
it('should recreate meta file when corrupted', async () => {
  setupTestVault();
  const canvasTools = new CanvasTools('vault/03_Canvas', 'vault');

  // Create canvas
  const { canvasPath } = await canvasTools.createCanvas({ topic: 'Corrupt Test' });

  // Corrupt meta file
  vol.writeFileSync(
    'vault/03_Canvas/.meta/Corrupt_Test.meta.json',
    'invalid json {'
  );

  // Should still work (recreate meta)
  const info = await canvasTools.getCanvasInfo({ canvasPath });
  expect(info.topic).toBe('Corrupt Test');
});
```

---

## Test Fixtures

### vault-structure.json
```json
{
  "vault/01_Inbox/": null,
  "vault/03_Canvas/": null,
  "vault/notes/topic-a.md": "# Topic A\n\n#tag1 #tag2\n\n[[Topic B]]\n\nContent about **keyword1**",
  "vault/notes/topic-b.md": "# Topic B\n\n#tag1\n\n[[Topic A]]\n\nContent about **keyword2**",
  "vault/notes/unrelated.md": "# Unrelated\n\nNo tags or links"
}
```

### canvas-with-questions.json
```json
{
  "nodes": [
    {"id": "topic", "type": "text", "x": 0, "y": 0, "width": 450, "height": 120, "text": "# Test Topic", "color": "6"},
    {"id": "q1", "type": "text", "x": 500, "y": 0, "width": 350, "height": 150, "text": "What is this?", "color": "4"},
    {"id": "q2", "type": "text", "x": 500, "y": 200, "width": 350, "height": 150, "text": "Why important?", "color": "4"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "topic", "toNode": "q1", "fromSide": "right", "toSide": "left"},
    {"id": "e2", "fromNode": "topic", "toNode": "q2", "fromSide": "right", "toSide": "left"}
  ]
}
```
