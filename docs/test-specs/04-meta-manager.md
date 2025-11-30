# MetaManager Unit Test Specification

## Module Under Test
- **File:** `src/engine/meta-manager.ts`
- **Class:** `MetaManager`
- **Dependencies:** `fs/promises`, `CanvasParser`, Types

---

## Test Setup

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetaManager } from '../engine/meta-manager';
import { vol } from 'memfs';

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

// Mock crypto for deterministic UUIDs
vi.stubGlobal('crypto', {
  randomUUID: () => '12345678-1234-1234-1234-123456789012',
});

const createTestCanvas = () => ({
  nodes: [
    { id: 'topic', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# Topic', color: '6' },
    { id: 'question', type: 'text', x: 0, y: 200, width: 400, height: 150, text: 'What is this?', color: '4' },
  ],
  edges: [],
});
```

---

## 1. Constructor & Path Helpers Tests

#### TC-MM-001: Initialize with default canvas directory
```typescript
describe('constructor', () => {
  it('should use default canvas directory', () => {
    // Act
    const manager = new MetaManager();

    // Assert - internal path check via exists()
    // The meta path should be in 03_Canvas/.meta/
  });
});
```

#### TC-MM-002: Initialize with custom canvas directory
```typescript
it('should use provided canvas directory', () => {
  // Act
  const manager = new MetaManager('custom/canvas/path');

  // Creates meta in custom/canvas/path/.meta/
});
```

---

## 2. `exists()` Tests

#### TC-MM-003: Return true when meta file exists
```typescript
describe('exists', () => {
  it('should return true when meta file exists', async () => {
    // Arrange
    vol.fromJSON({
      '03_Canvas/.meta/test.meta.json': JSON.stringify({ $schema: 'test' }),
    });
    const manager = new MetaManager('03_Canvas');

    // Act
    const result = await manager.exists('03_Canvas/test.canvas');

    // Assert
    expect(result).toBe(true);
  });
});
```

#### TC-MM-004: Return false when meta file does not exist
```typescript
it('should return false when meta file does not exist', async () => {
  // Arrange
  vol.fromJSON({});
  const manager = new MetaManager('03_Canvas');

  // Act
  const result = await manager.exists('03_Canvas/nonexistent.canvas');

  // Assert
  expect(result).toBe(false);
});
```

---

## 3. `load()` Tests

### 3.1 Basic Loading

#### TC-MM-005: Load existing meta file
```typescript
describe('load', () => {
  it('should load existing meta file', async () => {
    // Arrange
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test-id',
      linkedFile: '03_Canvas/test.canvas',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      syncedAt: Date.now(),
      workflow: { state: 'created', history: [] },
      semanticGraph: {},
      layoutState: { engineVersion: 'zoning-v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 0, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };
    vol.fromJSON({
      '03_Canvas/.meta/test.meta.json': JSON.stringify(meta),
    });
    const manager = new MetaManager('03_Canvas');

    // Act
    const result = await manager.load('03_Canvas/test.canvas', false);

    // Assert
    expect(result.canvasId).toBe('test-id');
    expect(result.workflow.state).toBe('created');
  });
});
```

#### TC-MM-006: Auto-create meta when not exists
```typescript
it('should auto-create meta when not exists and autoCreate=true', async () => {
  // Arrange
  vol.fromJSON({
    '03_Canvas/test.canvas': JSON.stringify(createTestCanvas()),
  });
  const manager = new MetaManager('03_Canvas');

  // Act
  const result = await manager.load('03_Canvas/test.canvas', true);

  // Assert
  expect(result.$schema).toBe('canvas-meta-v1');
  expect(result.linkedFile).toBe('03_Canvas/test.canvas');
});
```

#### TC-MM-007: Throw error when not exists and autoCreate=false
```typescript
it('should throw error when meta not exists and autoCreate=false', async () => {
  // Arrange
  vol.fromJSON({});
  const manager = new MetaManager('03_Canvas');

  // Act & Assert
  await expect(manager.load('03_Canvas/test.canvas', false))
    .rejects.toThrow(/Meta file not found/);
});
```

### 3.2 Sync Detection

#### TC-MM-008: Re-index when canvas is newer than meta
```typescript
it('should re-index when canvas modified after meta', async () => {
  // Arrange
  const oldMeta = {
    $schema: 'canvas-meta-v1',
    canvasId: 'test-id',
    linkedFile: '03_Canvas/test.canvas',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    syncedAt: Date.now() - 10000, // 10 seconds ago
    workflow: { state: 'created', history: [] },
    semanticGraph: {},
    layoutState: { engineVersion: 'zoning-v1', zoneCounts: {}, groupsCreated: [] },
    statistics: { totalNodes: 1, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
  };

  const newCanvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: '# Topic' },
      { id: 'n2', type: 'text', x: 0, y: 100, width: 100, height: 50, text: 'New node' },
    ],
    edges: [],
  };

  vol.fromJSON({
    '03_Canvas/.meta/test.meta.json': JSON.stringify(oldMeta),
    '03_Canvas/test.canvas': JSON.stringify(newCanvas),
  });
  const manager = new MetaManager('03_Canvas');

  // Act
  const result = await manager.load('03_Canvas/test.canvas');

  // Assert - statistics should reflect new canvas state
  expect(result.statistics.totalNodes).toBe(2);
});
```

---

## 4. `save()` Tests

#### TC-MM-009: Save meta file with updated timestamps
```typescript
describe('save', () => {
  it('should update timestamps on save', async () => {
    // Arrange
    vol.fromJSON({ '03_Canvas/': null });
    const manager = new MetaManager('03_Canvas');
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      syncedAt: 0,
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {},
      layoutState: { engineVersion: 'zoning-v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 0, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };

    // Act
    const beforeSave = Date.now();
    await manager.save('03_Canvas/test.canvas', meta);

    // Assert
    const savedContent = vol.readFileSync('03_Canvas/.meta/test.meta.json', 'utf-8');
    const savedMeta = JSON.parse(savedContent as string);
    expect(new Date(savedMeta.updatedAt).getTime()).toBeGreaterThanOrEqual(beforeSave);
    expect(savedMeta.syncedAt).toBeGreaterThanOrEqual(beforeSave);
  });
});
```

#### TC-MM-010: Create .meta directory if not exists
```typescript
it('should create .meta directory if not exists', async () => {
  // Arrange
  vol.fromJSON({});
  const manager = new MetaManager('03_Canvas');
  const meta = {
    $schema: 'canvas-meta-v1',
    canvasId: 'test',
    linkedFile: 'test.canvas',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    syncedAt: 0,
    workflow: { state: 'created' as const, history: [] },
    semanticGraph: {},
    layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
    statistics: { totalNodes: 0, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
  };

  // Act
  await manager.save('03_Canvas/test.canvas', meta);

  // Assert
  expect(vol.existsSync('03_Canvas/.meta/test.meta.json')).toBe(true);
});
```

---

## 5. `create()` Tests

#### TC-MM-011: Create new meta with default values
```typescript
describe('create', () => {
  it('should create meta with default values', async () => {
    // Arrange
    vol.fromJSON({});
    const manager = new MetaManager('03_Canvas');

    // Act
    const result = await manager.create('03_Canvas/new.canvas');

    // Assert
    expect(result.$schema).toBe('canvas-meta-v1');
    expect(result.canvasId).toBeDefined();
    expect(result.linkedFile).toBe('03_Canvas/new.canvas');
    expect(result.workflow.state).toBe('created');
    expect(result.workflow.history).toEqual([]);
  });
});
```

#### TC-MM-012: Index canvas if file exists
```typescript
it('should index existing canvas file on create', async () => {
  // Arrange
  const canvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: '# Topic', color: '6' },
      { id: 'n2', type: 'text', x: 0, y: 100, width: 100, height: 50, text: 'Question?', color: '4' },
      { id: 'n3', type: 'file', x: 0, y: 200, width: 100, height: 50, file: 'note.md' },
    ],
    edges: [],
  };
  vol.fromJSON({
    '03_Canvas/test.canvas': JSON.stringify(canvas),
  });
  const manager = new MetaManager('03_Canvas');

  // Act
  const result = await manager.create('03_Canvas/test.canvas');

  // Assert
  expect(result.statistics.totalNodes).toBe(3);
  expect(result.statistics.questions).toBe(1);
  expect(result.statistics.vaultNotes).toBe(1);
});
```

---

## 6. Node Role Inference Tests

#### TC-MM-013: Infer 'topic' role from purple color
```typescript
describe('Node Role Inference', () => {
  it('should infer topic role from purple (6) color', async () => {
    // Arrange
    const canvas = {
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Topic', color: '6' }],
      edges: [],
    };
    vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
    const manager = new MetaManager('03_Canvas');

    // Act
    const meta = await manager.create('03_Canvas/test.canvas');

    // Assert
    expect(meta.semanticGraph['n1'].role).toBe('topic');
  });
});
```

#### TC-MM-014: Infer 'question' role from green color
```typescript
it('should infer question role from green (4) color', async () => {
  // Arrange
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Some text', color: '4' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  // Act
  const meta = await manager.create('03_Canvas/test.canvas');

  // Assert
  expect(meta.semanticGraph['n1'].role).toBe('question');
});
```

#### TC-MM-015: Infer 'answer' role from yellow color
```typescript
it('should infer answer role from yellow (3) color', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Answer', color: '3' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('answer');
});
```

#### TC-MM-016: Infer 'command' role from red color with colon
```typescript
it('should infer command role from red (1) color with colon in text', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'RESEARCH: something', color: '1' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('command');
});
```

#### TC-MM-017: Infer 'vaultNote' role from red color without colon
```typescript
it('should infer vaultNote role from red (1) color without colon', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Just text', color: '1' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('vaultNote');
});
```

#### TC-MM-018: Infer 'topic' from # heading
```typescript
it('should infer topic role from # heading', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: '# Main Topic' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('topic');
});
```

#### TC-MM-019: Infer 'question' from ? in text
```typescript
it('should infer question role from ? in text', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'What is this?' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('question');
});
```

#### TC-MM-020: Infer 'vaultNote' for file nodes
```typescript
it('should infer vaultNote role for file nodes', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'file', x: 0, y: 0, width: 100, height: 50, file: 'note.md' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('vaultNote');
});
```

#### TC-MM-021: Infer 'resource' for link nodes
```typescript
it('should infer resource role for link nodes', async () => {
  const canvas = {
    nodes: [{ id: 'n1', type: 'link', x: 0, y: 0, width: 100, height: 50, url: 'https://example.com' }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.semanticGraph['n1'].role).toBe('resource');
});
```

---

## 7. Intent Detection Tests

#### TC-MM-022: Detect RESEARCH intent
```typescript
describe('Intent Detection', () => {
  it('should detect RESEARCH intent node', async () => {
    const canvas = {
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'RESEARCH: quantum computing', color: '1' }],
      edges: [],
    };
    vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
    const manager = new MetaManager('03_Canvas');

    const meta = await manager.create('03_Canvas/test.canvas');
    expect(meta.semanticGraph['n1'].intent).toBe('RESEARCH');
    expect(meta.semanticGraph['n1'].status).toBe('pending');
  });
});
```

#### TC-MM-023: Detect all intent types
```typescript
it('should detect all supported intent types', async () => {
  const intents = ['RESEARCH', 'EXPAND', 'ANSWER', 'LINK', 'ATOMIZE', 'CRYSTALLIZE'];

  for (const intent of intents) {
    const canvas = {
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: `${intent}: target`, color: '1' }],
      edges: [],
    };
    vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
    const manager = new MetaManager('03_Canvas');

    const meta = await manager.create('03_Canvas/test.canvas');
    expect(meta.semanticGraph['n1'].intent).toBe(intent);
  }
});
```

---

## 8. Statistics Tests

#### TC-MM-024: Count questions correctly
```typescript
describe('Statistics', () => {
  it('should count question nodes', async () => {
    const canvas = {
      nodes: [
        { id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Question 1?', color: '4' },
        { id: 'n2', type: 'text', x: 0, y: 100, width: 100, height: 50, text: 'Question 2?', color: '4' },
        { id: 'n3', type: 'text', x: 0, y: 200, width: 100, height: 50, text: 'Not a question', color: '3' },
      ],
      edges: [],
    };
    vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
    const manager = new MetaManager('03_Canvas');

    const meta = await manager.create('03_Canvas/test.canvas');
    expect(meta.statistics.questions).toBe(2);
  });
});
```

#### TC-MM-025: Count vault notes
```typescript
it('should count vault note (file) nodes', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'file', x: 0, y: 0, width: 100, height: 50, file: 'note1.md' },
      { id: 'n2', type: 'file', x: 0, y: 100, width: 100, height: 50, file: 'note2.md' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.statistics.vaultNotes).toBe(2);
});
```

#### TC-MM-026: Count web links
```typescript
it('should count web link nodes and markdown links', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'link', x: 0, y: 0, width: 100, height: 50, url: 'https://a.com' },
      { id: 'n2', type: 'text', x: 0, y: 100, width: 100, height: 50, text: 'Check [this](https://b.com)' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new MetaManager('03_Canvas');

  const meta = await manager.create('03_Canvas/test.canvas');
  expect(meta.statistics.webLinks).toBe(2);
});
```

---

## 9. Workflow Action Tests

#### TC-MM-027: Add workflow action
```typescript
describe('addWorkflowAction', () => {
  it('should add action to workflow history', async () => {
    // Arrange
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now(),
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {},
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 0, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };
    vol.fromJSON({
      '03_Canvas/.meta/test.meta.json': JSON.stringify(meta),
    });
    const manager = new MetaManager('03_Canvas');

    // Act
    await manager.addWorkflowAction('03_Canvas/test.canvas', 'expanded', 'test-agent', { nodeCount: 5 });

    // Assert
    const loaded = await manager.load('03_Canvas/test.canvas', false);
    expect(loaded.workflow.history).toHaveLength(1);
    expect(loaded.workflow.history[0].action).toBe('expanded');
    expect(loaded.workflow.history[0].agent).toBe('test-agent');
    expect(loaded.workflow.history[0].details).toEqual({ nodeCount: 5 });
  });
});
```

#### TC-MM-028: Update workflow state on specific actions
```typescript
it('should update workflow state for state-changing actions', async () => {
  const meta = {
    $schema: 'canvas-meta-v1',
    canvasId: 'test',
    linkedFile: 'test.canvas',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    syncedAt: Date.now(),
    workflow: { state: 'created' as const, history: [] },
    semanticGraph: {},
    layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
    statistics: { totalNodes: 0, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
  };
  vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
  const manager = new MetaManager('03_Canvas');

  await manager.addWorkflowAction('03_Canvas/test.canvas', 'crystallized', 'agent', {});

  const loaded = await manager.load('03_Canvas/test.canvas', false);
  expect(loaded.workflow.state).toBe('crystallized');
});
```

---

## 10. Question Resolution Tests

#### TC-MM-029: Mark question as resolved
```typescript
describe('markQuestionResolved', () => {
  it('should mark question node as resolved', async () => {
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now(),
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {
        'q1': { role: 'question' as const, status: 'pending' as const, createdAt: '2024-01-01' },
      },
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 1, questions: 1, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };
    vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
    const manager = new MetaManager('03_Canvas');

    await manager.markQuestionResolved('03_Canvas/test.canvas', 'q1', ['a1', 'a2']);

    const loaded = await manager.load('03_Canvas/test.canvas', false);
    expect(loaded.semanticGraph['q1'].status).toBe('resolved');
    expect(loaded.semanticGraph['q1'].resolvedBy).toEqual(['a1', 'a2']);
  });
});
```

#### TC-MM-030: Increment resolvedQuestions counter
```typescript
it('should increment resolvedQuestions statistic', async () => {
  const meta = {
    $schema: 'canvas-meta-v1',
    canvasId: 'test',
    linkedFile: 'test.canvas',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    syncedAt: Date.now(),
    workflow: { state: 'created' as const, history: [] },
    semanticGraph: {
      'q1': { role: 'question' as const, status: 'pending' as const, createdAt: '2024-01-01' },
    },
    layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
    statistics: { totalNodes: 1, questions: 1, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
  };
  vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
  const manager = new MetaManager('03_Canvas');

  await manager.markQuestionResolved('03_Canvas/test.canvas', 'q1', ['a1']);

  const loaded = await manager.load('03_Canvas/test.canvas', false);
  expect(loaded.statistics.resolvedQuestions).toBe(1);
});
```

---

## 11. Query Methods Tests

#### TC-MM-031: Get pending questions
```typescript
describe('getPendingQuestions', () => {
  it('should return IDs of pending question nodes', async () => {
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now(),
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {
        'q1': { role: 'question' as const, status: 'pending' as const },
        'q2': { role: 'question' as const, status: 'resolved' as const },
        'q3': { role: 'question' as const, status: 'pending' as const },
        'a1': { role: 'answer' as const, status: 'active' as const },
      },
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 4, questions: 3, resolvedQuestions: 1, webLinks: 0, vaultNotes: 0 },
    };
    vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
    const manager = new MetaManager('03_Canvas');

    const result = await manager.getPendingQuestions('03_Canvas/test.canvas');

    expect(result).toHaveLength(2);
    expect(result).toContain('q1');
    expect(result).toContain('q3');
    expect(result).not.toContain('q2');
  });
});
```

#### TC-MM-032: Get intent nodes
```typescript
describe('getIntentNodes', () => {
  it('should return pending intent nodes', async () => {
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now(),
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {
        'i1': { role: 'command' as const, status: 'pending' as const, intent: 'RESEARCH' },
        'i2': { role: 'command' as const, status: 'resolved' as const, intent: 'EXPAND' },
        'i3': { role: 'command' as const, status: 'pending' as const, intent: 'LINK' },
      },
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 3, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };
    vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
    const manager = new MetaManager('03_Canvas');

    const result = await manager.getIntentNodes('03_Canvas/test.canvas');

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: 'i1', intent: 'RESEARCH' });
    expect(result).toContainEqual({ id: 'i3', intent: 'LINK' });
  });
});
```

#### TC-MM-033: Get workflow state
```typescript
describe('getWorkflowState', () => {
  it('should return current workflow state', async () => {
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now(),
      workflow: { state: 'expanded' as const, history: [] },
      semanticGraph: {},
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 0, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };
    vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
    const manager = new MetaManager('03_Canvas');

    const result = await manager.getWorkflowState('03_Canvas/test.canvas');

    expect(result).toBe('expanded');
  });
});
```

#### TC-MM-034: Get statistics
```typescript
describe('getStatistics', () => {
  it('should return canvas statistics', async () => {
    const meta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: 'test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now(),
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {},
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 10, questions: 3, resolvedQuestions: 1, webLinks: 5, vaultNotes: 2 },
    };
    vol.fromJSON({ '03_Canvas/.meta/test.meta.json': JSON.stringify(meta) });
    const manager = new MetaManager('03_Canvas');

    const result = await manager.getStatistics('03_Canvas/test.canvas');

    expect(result.totalNodes).toBe(10);
    expect(result.questions).toBe(3);
    expect(result.resolvedQuestions).toBe(1);
    expect(result.webLinks).toBe(5);
    expect(result.vaultNotes).toBe(2);
  });
});
```

---

## 12. Re-indexing Tests

#### TC-MM-035: Add new nodes during re-index
```typescript
describe('Re-indexing', () => {
  it('should add new nodes to semantic graph during re-index', async () => {
    // Initial meta with one node
    const oldMeta = {
      $schema: 'canvas-meta-v1',
      canvasId: 'test',
      linkedFile: '03_Canvas/test.canvas',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
      syncedAt: Date.now() - 10000,
      workflow: { state: 'created' as const, history: [] },
      semanticGraph: {
        'n1': { role: 'topic' as const, status: 'active' as const },
      },
      layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
      statistics: { totalNodes: 1, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
    };

    // Canvas now has two nodes
    const canvas = {
      nodes: [
        { id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: '# Topic' },
        { id: 'n2', type: 'text', x: 0, y: 100, width: 100, height: 50, text: 'New node' },
      ],
      edges: [],
    };

    vol.fromJSON({
      '03_Canvas/.meta/test.meta.json': JSON.stringify(oldMeta),
      '03_Canvas/test.canvas': JSON.stringify(canvas),
    });
    const manager = new MetaManager('03_Canvas');

    const result = await manager.load('03_Canvas/test.canvas');

    expect(result.semanticGraph['n1']).toBeDefined();
    expect(result.semanticGraph['n2']).toBeDefined();
  });
});
```

#### TC-MM-036: Remove deleted nodes during re-index
```typescript
it('should remove deleted nodes from semantic graph during re-index', async () => {
  const oldMeta = {
    $schema: 'canvas-meta-v1',
    canvasId: 'test',
    linkedFile: '03_Canvas/test.canvas',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    syncedAt: Date.now() - 10000,
    workflow: { state: 'created' as const, history: [] },
    semanticGraph: {
      'n1': { role: 'topic' as const, status: 'active' as const },
      'n2': { role: 'content' as const, status: 'active' as const },
    },
    layoutState: { engineVersion: 'v1', zoneCounts: {}, groupsCreated: [] },
    statistics: { totalNodes: 2, questions: 0, resolvedQuestions: 0, webLinks: 0, vaultNotes: 0 },
  };

  // Canvas now only has one node (n2 deleted)
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: '# Topic' }],
    edges: [],
  };

  vol.fromJSON({
    '03_Canvas/.meta/test.meta.json': JSON.stringify(oldMeta),
    '03_Canvas/test.canvas': JSON.stringify(canvas),
  });
  const manager = new MetaManager('03_Canvas');

  const result = await manager.load('03_Canvas/test.canvas');

  expect(result.semanticGraph['n1']).toBeDefined();
  expect(result.semanticGraph['n2']).toBeUndefined();
});
```
