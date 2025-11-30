# CrossReferenceManager Unit Test Specification

## Module Under Test
- **File:** `src/engine/cross-reference.ts`
- **Class:** `CrossReferenceManager`
- **Dependencies:** `fs/promises`, `CanvasParser`, `MetaManager`

---

## Test Setup

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrossReferenceManager } from '../engine/cross-reference';
import { vol } from 'memfs';

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

const createCanvas = (topic: string, keywords: string[], nodes: any[] = []) => ({
  nodes: [
    { id: 'topic', type: 'text', x: 0, y: 0, width: 450, height: 120, text: `# ${topic}`, color: '6' },
    ...nodes,
  ],
  edges: [],
});
```

---

## 1. Constructor Tests

#### TC-CR-001: Initialize with default canvas directory
```typescript
describe('constructor', () => {
  it('should use default canvas directory', () => {
    const manager = new CrossReferenceManager();
    // Internal canvasDir should be '03_Canvas'
  });
});
```

#### TC-CR-002: Initialize with custom directory
```typescript
it('should accept custom canvas directory', () => {
  const manager = new CrossReferenceManager('custom/canvas');
});
```

---

## 2. `buildIndex()` Tests

### 2.1 Basic Indexing

#### TC-CR-003: Build index for empty canvas directory
```typescript
describe('buildIndex', () => {
  it('should build empty index when no canvas files exist', async () => {
    vol.fromJSON({ '03_Canvas/': null });
    const manager = new CrossReferenceManager('03_Canvas');

    const result = await manager.buildIndex();

    expect(Object.keys(result.canvases)).toHaveLength(0);
  });
});
```

#### TC-CR-004: Index single canvas file
```typescript
it('should index single canvas file', async () => {
  vol.fromJSON({
    '03_Canvas/test.canvas': JSON.stringify(createCanvas('Test Topic', ['keyword1'])),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(Object.keys(result.canvases)).toHaveLength(1);
  expect(result.canvases['03_Canvas/test.canvas']).toBeDefined();
});
```

#### TC-CR-005: Index multiple canvas files
```typescript
it('should index multiple canvas files', async () => {
  vol.fromJSON({
    '03_Canvas/topic1.canvas': JSON.stringify(createCanvas('Topic 1', [])),
    '03_Canvas/topic2.canvas': JSON.stringify(createCanvas('Topic 2', [])),
    '03_Canvas/topic3.canvas': JSON.stringify(createCanvas('Topic 3', [])),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(Object.keys(result.canvases)).toHaveLength(3);
});
```

#### TC-CR-006: Index nested canvas directories
```typescript
it('should index canvas files in nested directories', async () => {
  vol.fromJSON({
    '03_Canvas/root.canvas': JSON.stringify(createCanvas('Root', [])),
    '03_Canvas/projects/project.canvas': JSON.stringify(createCanvas('Project', [])),
    '03_Canvas/deep/nested/topic.canvas': JSON.stringify(createCanvas('Deep', [])),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(Object.keys(result.canvases)).toHaveLength(3);
});
```

#### TC-CR-007: Skip hidden directories
```typescript
it('should skip hidden directories (starting with .)', async () => {
  vol.fromJSON({
    '03_Canvas/visible.canvas': JSON.stringify(createCanvas('Visible', [])),
    '03_Canvas/.meta/hidden.canvas': JSON.stringify(createCanvas('Hidden', [])),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(Object.keys(result.canvases)).toHaveLength(1);
});
```

### 2.2 Canvas Info Extraction

#### TC-CR-008: Extract topic from purple node
```typescript
it('should extract topic from purple (6) colored node', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# Main Topic', color: '6' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].topic).toBe('Main Topic');
});
```

#### TC-CR-009: Extract topic from first H1 heading
```typescript
it('should extract topic from # heading when no purple node', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '# First Topic' },
      { id: 'n2', type: 'text', x: 0, y: 200, width: 400, height: 100, text: '# Second Topic' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].topic).toBe('First Topic');
});
```

#### TC-CR-010: Extract keywords from bold text
```typescript
it('should extract keywords from **bold** text', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '# Topic\n\n**keyword1** and **keyword2**' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].keywords).toContain('keyword1');
  expect(result.canvases['03_Canvas/test.canvas'].keywords).toContain('keyword2');
});
```

#### TC-CR-011: Extract keywords from headings
```typescript
it('should extract keywords from ## headings', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 150, text: '# Topic\n\n## Section One\n\n### Subsection Two' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].keywords).toContain('Section One');
  expect(result.canvases['03_Canvas/test.canvas'].keywords).toContain('Subsection Two');
});
```

#### TC-CR-012: Extract linked notes from file nodes
```typescript
it('should extract linked vault notes', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'file', x: 0, y: 0, width: 300, height: 100, file: 'notes/note1.md' },
      { id: 'n2', type: 'file', x: 0, y: 150, width: 300, height: 100, file: 'notes/note2.md' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].linkedNotes).toContain('notes/note1.md');
  expect(result.canvases['03_Canvas/test.canvas'].linkedNotes).toContain('notes/note2.md');
});
```

#### TC-CR-013: Extract questions
```typescript
it('should extract question text from nodes', async () => {
  const canvas = {
    nodes: [
      { id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '# Topic' },
      { id: 'n2', type: 'text', x: 0, y: 150, width: 400, height: 100, text: 'What is this?' },
      { id: 'n3', type: 'text', x: 0, y: 300, width: 400, height: 100, text: 'Why does it matter?' },
    ],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].questions).toHaveLength(2);
});
```

#### TC-CR-014: Limit keywords to 20
```typescript
it('should limit keywords to maximum 20', async () => {
  const manyKeywords = Array.from({ length: 30 }, (_, i) => `**kw${i}**`).join(' ');
  const canvas = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 300, text: manyKeywords }],
    edges: [],
  };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].keywords.length).toBeLessThanOrEqual(20);
});
```

#### TC-CR-015: Limit questions to 5
```typescript
it('should limit questions to maximum 5', async () => {
  const nodes = Array.from({ length: 10 }, (_, i) => ({
    id: `q${i}`, type: 'text', x: 0, y: i * 100, width: 400, height: 80, text: `Question ${i}?`,
  }));
  const canvas = { nodes, edges: [] };
  vol.fromJSON({ '03_Canvas/test.canvas': JSON.stringify(canvas) });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.canvases['03_Canvas/test.canvas'].questions).toHaveLength(5);
});
```

---

## 3. Shared Keywords Tests

#### TC-CR-016: Build shared keywords index
```typescript
describe('Shared Keywords', () => {
  it('should identify keywords shared across canvases', async () => {
    vol.fromJSON({
      '03_Canvas/a.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared** **unique-a**' }],
        edges: [],
      }),
      '03_Canvas/b.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared** **unique-b**' }],
        edges: [],
      }),
    });
    const manager = new CrossReferenceManager('03_Canvas');

    const result = await manager.buildIndex();

    expect(result.sharedKeywords['shared']).toHaveLength(2);
    expect(result.sharedKeywords['unique-a']).toHaveLength(1);
  });
});
```

#### TC-CR-017: Shared keywords are case insensitive
```typescript
it('should match shared keywords case-insensitively', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**Keyword**' }],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**keyword**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  expect(result.sharedKeywords['keyword']).toHaveLength(2);
});
```

---

## 4. Related Canvases Tests

#### TC-CR-018: Calculate similarity from shared keywords
```typescript
describe('Related Canvases', () => {
  it('should find related canvases by shared keywords', async () => {
    vol.fromJSON({
      '03_Canvas/a.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**ML** **AI** **deep learning**' }],
        edges: [],
      }),
      '03_Canvas/b.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**ML** **AI** **neural networks**' }],
        edges: [],
      }),
      '03_Canvas/c.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**cooking** **recipes**' }],
        edges: [],
      }),
    });
    const manager = new CrossReferenceManager('03_Canvas');

    const result = await manager.buildIndex();

    // a and b should be related due to shared ML, AI keywords
    expect(result.relatedCanvases['03_Canvas/a.canvas'].length).toBeGreaterThan(0);
    const relatedToA = result.relatedCanvases['03_Canvas/a.canvas'].map(r => r[0]);
    expect(relatedToA).toContain('03_Canvas/b.canvas');
  });
});
```

#### TC-CR-019: Calculate similarity from shared notes
```typescript
it('should find related canvases by shared linked notes', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [
        { id: 'n1', type: 'file', x: 0, y: 0, width: 300, height: 100, file: 'shared-note.md' },
      ],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [
        { id: 'n1', type: 'file', x: 0, y: 0, width: 300, height: 100, file: 'shared-note.md' },
      ],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  const relatedToA = result.relatedCanvases['03_Canvas/a.canvas'];
  expect(relatedToA.length).toBeGreaterThan(0);
});
```

#### TC-CR-020: Calculate similarity from topic overlap
```typescript
it('should find related canvases by topic word overlap', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# Machine Learning Basics', color: '6' }],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# Machine Learning Advanced', color: '6' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  const relatedToA = result.relatedCanvases['03_Canvas/a.canvas'];
  expect(relatedToA.length).toBeGreaterThan(0);
});
```

#### TC-CR-021: Limit related canvases to 5
```typescript
it('should limit related canvases to 5', async () => {
  const files: Record<string, string> = {};
  // Create 10 canvases all sharing same keyword
  for (let i = 0; i < 10; i++) {
    files[`03_Canvas/canvas${i}.canvas`] = JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared-keyword**' }],
      edges: [],
    });
  }
  vol.fromJSON(files);
  const manager = new CrossReferenceManager('03_Canvas');

  const result = await manager.buildIndex();

  const anyCanvas = Object.keys(result.relatedCanvases)[0];
  expect(result.relatedCanvases[anyCanvas].length).toBeLessThanOrEqual(5);
});
```

---

## 5. `getRelatedCanvases()` API Tests

#### TC-CR-022: Get related canvases for specific path
```typescript
describe('getRelatedCanvases', () => {
  it('should return related canvases with scores', async () => {
    vol.fromJSON({
      '03_Canvas/source.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
        edges: [],
      }),
      '03_Canvas/related.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
        edges: [],
      }),
    });
    const manager = new CrossReferenceManager('03_Canvas');
    await manager.buildIndex();

    const result = await manager.getRelatedCanvases('03_Canvas/source.canvas');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('path');
    expect(result[0]).toHaveProperty('score');
  });
});
```

#### TC-CR-023: Respect limit parameter
```typescript
it('should respect limit parameter', async () => {
  const files: Record<string, string> = {};
  for (let i = 0; i < 10; i++) {
    files[`03_Canvas/c${i}.canvas`] = JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
      edges: [],
    });
  }
  vol.fromJSON(files);
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const result = await manager.getRelatedCanvases('03_Canvas/c0.canvas', 3);

  expect(result).toHaveLength(3);
});
```

#### TC-CR-024: Return empty for non-existent canvas
```typescript
it('should return empty array for non-existent canvas', async () => {
  vol.fromJSON({
    '03_Canvas/exists.canvas': JSON.stringify({ nodes: [], edges: [] }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const result = await manager.getRelatedCanvases('nonexistent.canvas');

  expect(result).toEqual([]);
});
```

---

## 6. `findCanvasesByKeyword()` Tests

#### TC-CR-025: Find canvases by keyword
```typescript
describe('findCanvasesByKeyword', () => {
  it('should find canvases containing keyword', async () => {
    vol.fromJSON({
      '03_Canvas/ml.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**machine-learning**' }],
        edges: [],
      }),
      '03_Canvas/other.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**cooking**' }],
        edges: [],
      }),
    });
    const manager = new CrossReferenceManager('03_Canvas');
    await manager.buildIndex();

    const result = await manager.findCanvasesByKeyword('machine-learning');

    expect(result).toContain('03_Canvas/ml.canvas');
    expect(result).not.toContain('03_Canvas/other.canvas');
  });
});
```

#### TC-CR-026: Keyword search is case insensitive
```typescript
it('should search keywords case-insensitively', async () => {
  vol.fromJSON({
    '03_Canvas/test.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**MyKeyword**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const result = await manager.findCanvasesByKeyword('mykeyword');

  expect(result).toHaveLength(1);
});
```

---

## 7. `getCanvasNetwork()` Tests

#### TC-CR-027: Generate network graph nodes
```typescript
describe('getCanvasNetwork', () => {
  it('should generate network nodes for each canvas', async () => {
    vol.fromJSON({
      '03_Canvas/a.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# Topic A', color: '6' }],
        edges: [],
      }),
      '03_Canvas/b.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# Topic B', color: '6' }],
        edges: [],
      }),
    });
    const manager = new CrossReferenceManager('03_Canvas');
    await manager.buildIndex();

    const network = await manager.getCanvasNetwork();

    expect(network.nodes).toHaveLength(2);
    expect(network.nodes[0]).toHaveProperty('id');
    expect(network.nodes[0]).toHaveProperty('topic');
    expect(network.nodes[0]).toHaveProperty('size');
    expect(network.nodes[0]).toHaveProperty('state');
  });
});
```

#### TC-CR-028: Generate network edges from relationships
```typescript
it('should generate edges between related canvases', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const network = await manager.getCanvasNetwork();

  expect(network.edges.length).toBeGreaterThan(0);
  expect(network.edges[0]).toHaveProperty('source');
  expect(network.edges[0]).toHaveProperty('target');
  expect(network.edges[0]).toHaveProperty('weight');
});
```

#### TC-CR-029: Deduplicate bidirectional edges
```typescript
it('should not create duplicate edges for bidirectional relationships', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const network = await manager.getCanvasNetwork();

  // Should only have one edge between a and b
  const edgeCount = network.edges.filter(
    e => (e.source.includes('a') && e.target.includes('b')) ||
         (e.source.includes('b') && e.target.includes('a'))
  ).length;
  expect(edgeCount).toBe(1);
});
```

---

## 8. `suggestCanvasLinks()` Tests

#### TC-CR-030: Suggest links based on shared keywords
```typescript
describe('suggestCanvasLinks', () => {
  it('should suggest links to related canvases', async () => {
    vol.fromJSON({
      '03_Canvas/source.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**ML** **AI**' }],
        edges: [],
      }),
      '03_Canvas/related.canvas': JSON.stringify({
        nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 450, height: 120, text: '# AI Research', color: '6' },
                { id: 'n2', type: 'text', x: 0, y: 150, width: 400, height: 100, text: '**ML** **neural networks**' }],
        edges: [],
      }),
    });
    const manager = new CrossReferenceManager('03_Canvas');
    await manager.buildIndex();

    const suggestions = await manager.suggestCanvasLinks('03_Canvas/source.canvas');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0]).toHaveProperty('canvas');
    expect(suggestions[0]).toHaveProperty('topic');
    expect(suggestions[0]).toHaveProperty('reason');
    expect(suggestions[0]).toHaveProperty('score');
  });
});
```

#### TC-CR-031: Exclude already linked canvases
```typescript
it('should not suggest already linked canvases', async () => {
  // Canvas A already has B in linkedCanvases
  const canvasA = {
    nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
    edges: [],
  };
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify(canvasA),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**shared**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  const index = await manager.buildIndex();
  // Manually mark b as already linked
  index.canvases['03_Canvas/a.canvas'].linkedCanvases = ['03_Canvas/b.canvas'];

  const suggestions = await manager.suggestCanvasLinks('03_Canvas/a.canvas');

  const suggestedPaths = suggestions.map(s => s.canvas);
  expect(suggestedPaths).not.toContain('03_Canvas/b.canvas');
});
```

#### TC-CR-032: Include shared keywords in reason
```typescript
it('should include shared keywords in suggestion reason', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**TypeScript** **Node.js**' }],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**TypeScript** **React**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const suggestions = await manager.suggestCanvasLinks('03_Canvas/a.canvas');

  expect(suggestions[0].reason).toContain('TypeScript');
});
```

---

## 9. `getStatistics()` Tests

#### TC-CR-033: Get total canvas count
```typescript
describe('getStatistics', () => {
  it('should return total canvas count', async () => {
    vol.fromJSON({
      '03_Canvas/a.canvas': JSON.stringify({ nodes: [], edges: [] }),
      '03_Canvas/b.canvas': JSON.stringify({ nodes: [], edges: [] }),
      '03_Canvas/c.canvas': JSON.stringify({ nodes: [], edges: [] }),
    });
    const manager = new CrossReferenceManager('03_Canvas');
    await manager.buildIndex();

    const stats = await manager.getStatistics();

    expect(stats.totalCanvases).toBe(3);
  });
});
```

#### TC-CR-034: Get canvas count by workflow state
```typescript
it('should count canvases by workflow state', async () => {
  vol.fromJSON({
    '03_Canvas/created.canvas': JSON.stringify({ nodes: [], edges: [] }),
    '03_Canvas/expanded.canvas': JSON.stringify({ nodes: [], edges: [] }),
    '03_Canvas/.meta/created.meta.json': JSON.stringify({ workflow: { state: 'created' } }),
    '03_Canvas/.meta/expanded.meta.json': JSON.stringify({ workflow: { state: 'expanded' } }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const stats = await manager.getStatistics();

  expect(stats.byState).toHaveProperty('created');
  expect(stats.byState).toHaveProperty('expanded');
});
```

#### TC-CR-035: Get top shared keywords
```typescript
it('should return top shared keywords', async () => {
  vol.fromJSON({
    '03_Canvas/a.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**popular** **common**' }],
      edges: [],
    }),
    '03_Canvas/b.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**popular** **common**' }],
      edges: [],
    }),
    '03_Canvas/c.canvas': JSON.stringify({
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 400, height: 100, text: '**popular** **rare**' }],
      edges: [],
    }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const stats = await manager.getStatistics();

  expect(stats.topSharedKeywords[0][0]).toBe('popular');
  expect(stats.topSharedKeywords[0][1]).toBe(3);
});
```

#### TC-CR-036: Get most connected canvases
```typescript
it('should return most connected canvases', async () => {
  vol.fromJSON({
    '03_Canvas/connected.canvas': JSON.stringify({
      nodes: [
        { id: 'n1', type: 'file', x: 0, y: 0, width: 300, height: 100, file: 'note1.md' },
        { id: 'n2', type: 'file', x: 0, y: 150, width: 300, height: 100, file: 'note2.md' },
        { id: 'n3', type: 'file', x: 0, y: 300, width: 300, height: 100, file: 'note3.md' },
      ],
      edges: [],
    }),
    '03_Canvas/isolated.canvas': JSON.stringify({ nodes: [], edges: [] }),
  });
  const manager = new CrossReferenceManager('03_Canvas');
  await manager.buildIndex();

  const stats = await manager.getStatistics();

  expect(stats.mostConnected[0].path).toContain('connected');
});
```

---

## 10. Index Persistence Tests

#### TC-CR-037: Save index to file
```typescript
describe('Index Persistence', () => {
  it('should save index to .cross_reference.json', async () => {
    vol.fromJSON({
      '03_Canvas/test.canvas': JSON.stringify({ nodes: [], edges: [] }),
    });
    const manager = new CrossReferenceManager('03_Canvas');

    await manager.buildIndex();

    expect(vol.existsSync('03_Canvas/.cross_reference.json')).toBe(true);
  });
});
```

#### TC-CR-038: Load existing index
```typescript
it('should load existing index without rebuilding', async () => {
  const existingIndex = {
    version: '1.0',
    indexedAt: new Date().toISOString(),
    canvases: {
      'cached.canvas': { topic: 'Cached', keywords: [], linkedNotes: [], linkedCanvases: [], questions: [], nodeCount: 0, edgeCount: 0, workflowState: 'created' },
    },
    sharedKeywords: {},
    relatedCanvases: {},
  };
  vol.fromJSON({
    '03_Canvas/.cross_reference.json': JSON.stringify(existingIndex),
  });
  const manager = new CrossReferenceManager('03_Canvas');

  const stats = await manager.getStatistics();

  expect(stats.totalCanvases).toBe(1);
});
```

---

## 11. Edge Cases

#### TC-CR-039: Handle corrupted canvas file
```typescript
describe('Edge Cases', () => {
  it('should skip corrupted canvas files', async () => {
    vol.fromJSON({
      '03_Canvas/good.canvas': JSON.stringify({ nodes: [], edges: [] }),
      '03_Canvas/bad.canvas': 'not valid json {',
    });
    const manager = new CrossReferenceManager('03_Canvas');

    const result = await manager.buildIndex();

    expect(Object.keys(result.canvases)).toHaveLength(1);
  });
});
```

#### TC-CR-040: Handle empty canvas directory gracefully
```typescript
it('should handle missing canvas directory', async () => {
  vol.fromJSON({});
  const manager = new CrossReferenceManager('nonexistent');

  const result = await manager.buildIndex();

  expect(Object.keys(result.canvases)).toHaveLength(0);
});
```
