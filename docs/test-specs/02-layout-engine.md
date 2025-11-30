# LayoutEngine Unit Test Specification

## Module Under Test
- **File:** `src/engine/layout-engine.ts`
- **Class:** `LayoutEngine`
- **Dependencies:** `CanvasParser`, `SemanticRouter`, Types

---

## Test Setup

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LayoutEngine } from '../engine/layout-engine';
import { CanvasParser } from '../engine/canvas-parser';

// Mock UUID for deterministic tests
vi.mock('uuid', () => ({
  v4: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
}));

// Helper to create anchor node
const createAnchorNode = (id = 'anchor-1') => ({
  id,
  type: 'text' as const,
  x: 0,
  y: 0,
  width: 450,
  height: 120,
  text: '# Test Topic',
  color: '6' as const,
});
```

---

## 1. Constructor Tests

### 1.1 Initialization

#### TC-LE-001: Initialize with empty arrays
```typescript
describe('constructor', () => {
  it('should initialize with empty nodes and edges', () => {
    // Act
    const engine = new LayoutEngine();

    // Assert
    expect(engine.getNodes()).toEqual([]);
    expect(engine.getEdges()).toEqual([]);
  });
});
```

#### TC-LE-002: Initialize with existing nodes
```typescript
it('should initialize with provided nodes and edges', () => {
  // Arrange
  const nodes = [createAnchorNode()];
  const edges = [{ id: 'e1', fromNode: 'anchor-1', toNode: 'n2' }];

  // Act
  const engine = new LayoutEngine(nodes, edges);

  // Assert
  expect(engine.getNodes()).toHaveLength(1);
  expect(engine.getEdges()).toHaveLength(1);
});
```

#### TC-LE-003: Initialize zone counts from existing metadata
```typescript
it('should initialize zone counts from existing node metadata', () => {
  // Arrange
  const nodes = [
    createAnchorNode(),
    {
      id: 'n2', type: 'text' as const,
      x: 0, y: 200, width: 400, height: 150, text: 'Answer',
      _metadata: { zone: 'SOUTH', relation: 'answers', anchorId: 'anchor-1' },
    } as any,
  ];

  // Act
  const engine = new LayoutEngine(nodes, []);
  const zoneCounts = engine.getZoneCounts();

  // Assert
  expect(zoneCounts['SOUTH']).toBe(1);
});
```

---

## 2. Core API Tests - `allocateByRelation()`

### 2.1 Basic Allocation

#### TC-LE-004: Allocate node with 'answers' relation (SOUTH zone)
```typescript
describe('allocateByRelation', () => {
  it('should place "answers" node in SOUTH zone', () => {
    // Arrange
    const engine = new LayoutEngine([createAnchorNode()], []);

    // Act
    const result = engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: 'This is the answer' },
    });

    // Assert
    expect(result).not.toBeNull();
    expect(result!.node.y).toBeGreaterThan(120); // Below anchor
    expect(result!.node.x).toBeCloseTo(0, -1); // Aligned with anchor
  });
});
```

#### TC-LE-005: Allocate node with 'background' relation (WEST zone)
```typescript
it('should place "background" node in WEST zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'background',
    content: { type: 'file', file: 'context.md' },
  });

  // Assert
  expect(result).not.toBeNull();
  expect(result!.node.x).toBeLessThan(0); // Left of anchor
});
```

#### TC-LE-006: Allocate node with 'elaborates' relation (SOUTH_EAST zone)
```typescript
it('should place "elaborates" node in SOUTH_EAST zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'elaborates',
    content: { type: 'text', text: 'More details...' },
  });

  // Assert
  expect(result).not.toBeNull();
  expect(result!.node.x).toBeGreaterThan(0); // Right of anchor
  expect(result!.node.y).toBeGreaterThan(0); // Below anchor
});
```

#### TC-LE-007: Allocate node with 'contradicts' relation (SOUTH_WEST zone)
```typescript
it('should place "contradicts" node in SOUTH_WEST zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'contradicts',
    content: { type: 'text', text: 'Counter argument' },
  });

  // Assert
  expect(result).not.toBeNull();
  expect(result!.node.x).toBeLessThan(0); // Left of anchor
  expect(result!.node.y).toBeGreaterThan(0); // Below anchor
});
```

#### TC-LE-008: Allocate node with 'parent' relation (NORTH zone)
```typescript
it('should place "parent" node in NORTH zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'parent',
    content: { type: 'text', text: 'Parent concept' },
  });

  // Assert
  expect(result).not.toBeNull();
  expect(result!.node.y).toBeLessThan(0); // Above anchor
});
```

### 2.2 Node Type Handling

#### TC-LE-009: Create text node
```typescript
it('should create text node for type "text"', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Answer content' },
  });

  // Assert
  expect(result!.node.type).toBe('text');
  expect((result!.node as any).text).toBe('Answer content');
});
```

#### TC-LE-010: Create file node
```typescript
it('should create file node for type "file"', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'background',
    content: { type: 'file', file: 'notes/context.md' },
  });

  // Assert
  expect(result!.node.type).toBe('file');
  expect((result!.node as any).file).toBe('notes/context.md');
});
```

#### TC-LE-011: Create link node
```typescript
it('should create link node for type "link"', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'resource',
    content: { type: 'link', url: 'https://example.com' },
  });

  // Assert
  expect(result!.node.type).toBe('link');
  expect((result!.node as any).url).toBe('https://example.com');
});
```

### 2.3 Edge Creation

#### TC-LE-012: Create edge with correct directions
```typescript
it('should create edge with zone-appropriate side connections', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act - SOUTH zone should have bottom→top edge
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Answer' },
  });

  // Assert
  expect(result!.edge.fromNode).toBe('anchor-1');
  expect(result!.edge.toNode).toBe(result!.node.id);
  expect(result!.edge.fromSide).toBe('bottom');
  expect(result!.edge.toSide).toBe('top');
});
```

#### TC-LE-013: Edge for WEST zone (left→right)
```typescript
it('should create left→right edge for WEST zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'background',
    content: { type: 'text', text: 'Background' },
  });

  // Assert
  expect(result!.edge.fromSide).toBe('left');
  expect(result!.edge.toSide).toBe('right');
});
```

### 2.4 Color Handling

#### TC-LE-014: Use default zone color when not specified
```typescript
it('should use zone default color when not provided', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act - SOUTH zone default is '3' (yellow)
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Answer' },
  });

  // Assert
  expect(result!.node.color).toBe('3');
});
```

#### TC-LE-015: Use provided color override
```typescript
it('should use provided color instead of default', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Answer' },
    color: '5', // Override with cyan
  });

  // Assert
  expect(result!.node.color).toBe('5');
});
```

### 2.5 Error Handling

#### TC-LE-016: Throw error for non-existent anchor
```typescript
it('should throw error when anchor node does not exist', () => {
  // Arrange
  const engine = new LayoutEngine([], []);

  // Act & Assert
  expect(() => {
    engine.allocateByRelation({
      anchorId: 'nonexistent',
      relation: 'answers',
      content: { type: 'text', text: 'Answer' },
    });
  }).toThrow('Anchor node not found: nonexistent');
});
```

#### TC-LE-017: Handle unknown relation (fallback to SOUTH)
```typescript
it('should default to SOUTH zone for unknown relation', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'unknown-relation',
    content: { type: 'text', text: 'Unknown' },
  });

  // Assert
  expect(result).not.toBeNull();
  expect(result!.node.y).toBeGreaterThan(120); // SOUTH zone
});
```

---

## 3. Zone Position Calculation Tests

### 3.1 Column Stacking (First 3 nodes)

#### TC-LE-018: First node at zone base position
```typescript
describe('Zone Position Calculation', () => {
  it('should place first node at zone base position', () => {
    // Arrange
    const engine = new LayoutEngine([createAnchorNode()], []);

    // Act
    const result = engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: 'First' },
    });

    // Assert - SOUTH zone base position
    const expectedY = 0 + 1 * (120 + 80); // anchor.y + dy * (height + gap*2)
    expect(result!.node.y).toBeCloseTo(expectedY, -1);
  });
});
```

#### TC-LE-019: Second node stacked below first
```typescript
it('should stack second node vertically below first', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'First' },
  });

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Second' },
  });

  // Assert
  const firstNode = engine.getNodes()[1];
  expect(result!.node.y).toBeGreaterThan(firstNode.y);
});
```

#### TC-LE-020: Third node continues column stack
```typescript
it('should continue column stacking for third node', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  for (let i = 0; i < 2; i++) {
    engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: `Node ${i}` },
    });
  }

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Third' },
  });

  // Assert
  const secondNode = engine.getNodes()[2];
  expect(result!.node.y).toBeGreaterThan(secondNode.y);
  expect(result!.node.x).toBe(secondNode.x); // Same column
});
```

### 3.2 Grid Packing (After 3 nodes)

#### TC-LE-021: Fourth node starts second column
```typescript
it('should switch to 2-column grid after 3 nodes', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  for (let i = 0; i < 3; i++) {
    engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: `Node ${i}` },
    });
  }

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Fourth' },
  });

  // Assert - Should be in different position (grid layout)
  const thirdNode = engine.getNodes()[3];
  expect(result!.node.x).not.toBe(thirdNode.x);
});
```

#### TC-LE-022: Grid packing maintains rows
```typescript
it('should arrange nodes in 2-column grid pattern', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  const results = [];

  // Act - Add 6 nodes
  for (let i = 0; i < 6; i++) {
    const result = engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: `Node ${i}` },
    });
    results.push(result);
  }

  // Assert - Nodes 4 and 5 should be in same row, different columns
  const node4 = results[3]!.node;
  const node5 = results[4]!.node;
  expect(node5.x).not.toBe(node4.x);
});
```

---

## 4. Collision Detection Tests

### 4.1 Basic Collision Detection

#### TC-LE-023: Detect overlapping nodes
```typescript
describe('Collision Detection', () => {
  it('should avoid placing nodes that overlap', () => {
    // Arrange
    const existingNode = {
      id: 'existing',
      type: 'text' as const,
      x: 0,
      y: 200,
      width: 400,
      height: 200,
      text: 'Blocking node',
    };
    const engine = new LayoutEngine([createAnchorNode(), existingNode], []);

    // Act
    const result = engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: 'Should avoid collision' },
    });

    // Assert - Should not overlap with existing node
    const newNode = result!.node;
    const noOverlap =
      newNode.x + newNode.width < existingNode.x ||
      newNode.x > existingNode.x + existingNode.width ||
      newNode.y + newNode.height < existingNode.y ||
      newNode.y > existingNode.y + existingNode.height;
    expect(noOverlap).toBe(true);
  });
});
```

#### TC-LE-024: Find fallback position when collision detected
```typescript
it('should find fallback position when primary position is occupied', () => {
  // Arrange - Fill SOUTH zone base position
  const blockingNodes = Array.from({ length: 5 }, (_, i) => ({
    id: `block-${i}`,
    type: 'text' as const,
    x: 0,
    y: 200 + i * 250,
    width: 400,
    height: 200,
    text: `Blocking ${i}`,
  }));
  const engine = new LayoutEngine([createAnchorNode(), ...blockingNodes], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Needs fallback position' },
  });

  // Assert
  expect(result).not.toBeNull();
});
```

#### TC-LE-025: Collision includes padding
```typescript
it('should maintain padding between nodes', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  const first = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'First' },
  });

  // Act
  const second = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Second' },
  });

  // Assert - Gap between nodes
  const gap = second!.node.y - (first!.node.y + first!.node.height);
  expect(gap).toBeGreaterThanOrEqual(20); // collisionPadding
});
```

#### TC-LE-026: Skip group nodes in collision check
```typescript
it('should ignore group nodes during collision detection', () => {
  // Arrange
  const groupNode = {
    id: 'group-1',
    type: 'group' as const,
    x: -100,
    y: 100,
    width: 600,
    height: 500,
    label: 'Large Group',
  };
  const engine = new LayoutEngine([createAnchorNode(), groupNode], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Inside group area' },
  });

  // Assert - Should place node even if it's inside group bounds
  expect(result).not.toBeNull();
});
```

---

## 5. Visual Grouping Tests

### 5.1 Group Creation

#### TC-LE-027: Create group when zone reaches threshold
```typescript
describe('Visual Grouping', () => {
  it('should create group node when zone has 5+ nodes', () => {
    // Arrange
    const engine = new LayoutEngine([createAnchorNode()], []);

    // Act - Add 5 nodes to SOUTH zone
    for (let i = 0; i < 5; i++) {
      engine.allocateByRelation({
        anchorId: 'anchor-1',
        relation: 'answers',
        content: { type: 'text', text: `Answer ${i}` },
      });
    }

    // Assert
    const nodes = engine.getNodes();
    const groupNodes = nodes.filter(n => n.type === 'group');
    expect(groupNodes.length).toBeGreaterThanOrEqual(1);
  });
});
```

#### TC-LE-028: Group has zone label
```typescript
it('should assign zone label to created group', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  for (let i = 0; i < 5; i++) {
    engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: `Answer ${i}` },
    });
  }

  // Assert
  const groupNode = engine.getNodes().find(n => n.type === 'group');
  expect((groupNode as any).label).toBe('답변/결론'); // SOUTH zone label
});
```

#### TC-LE-029: Group bounds contain all zone nodes
```typescript
it('should size group to contain all nodes in zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  const addedNodes: any[] = [];

  // Act
  for (let i = 0; i < 5; i++) {
    const result = engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: `Answer ${i}` },
    });
    addedNodes.push(result!.node);
  }

  // Assert
  const groupNode = engine.getNodes().find(n => n.type === 'group') as any;
  for (const node of addedNodes) {
    expect(node.x).toBeGreaterThanOrEqual(groupNode.x);
    expect(node.y).toBeGreaterThanOrEqual(groupNode.y);
    expect(node.x + node.width).toBeLessThanOrEqual(groupNode.x + groupNode.width);
    expect(node.y + node.height).toBeLessThanOrEqual(groupNode.y + groupNode.height);
  }
});
```

### 5.2 Group Expansion

#### TC-LE-030: Expand existing group when adding more nodes
```typescript
it('should expand group when adding more nodes to zone', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Add 5 nodes to create group
  for (let i = 0; i < 5; i++) {
    engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: `Answer ${i}` },
    });
  }
  const initialGroup = engine.getNodes().find(n => n.type === 'group') as any;
  const initialHeight = initialGroup.height;

  // Act - Add 6th node
  engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'Answer 6' },
  });

  // Assert
  const expandedGroup = engine.getNodes().find(n => n.type === 'group') as any;
  expect(expandedGroup.height).toBeGreaterThanOrEqual(initialHeight);
});
```

---

## 6. `allocateMultiple()` Tests

#### TC-LE-031: Add multiple nodes at once
```typescript
describe('allocateMultiple', () => {
  it('should add multiple nodes with different relations', () => {
    // Arrange
    const engine = new LayoutEngine([createAnchorNode()], []);

    // Act
    const results = engine.allocateMultiple('anchor-1', [
      { relation: 'answers', content: { type: 'text', text: 'Answer' } },
      { relation: 'background', content: { type: 'file', file: 'bg.md' } },
      { relation: 'elaborates', content: { type: 'text', text: 'Detail' } },
    ]);

    // Assert
    expect(results).toHaveLength(3);
    expect(engine.getNodes()).toHaveLength(4); // anchor + 3 new
    expect(engine.getEdges()).toHaveLength(3);
  });
});
```

#### TC-LE-032: Continue on individual allocation failure
```typescript
it('should continue processing remaining items if one fails', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act - Middle item will fail (unknown type)
  const results = engine.allocateMultiple('anchor-1', [
    { relation: 'answers', content: { type: 'text', text: 'A' } },
    { relation: 'answers', content: { type: 'text', text: 'B' } },
  ]);

  // Assert
  expect(results.length).toBe(2);
});
```

---

## 7. `createInitialLayout()` Tests

#### TC-LE-033: Create topic node at center
```typescript
describe('createInitialLayout', () => {
  it('should create topic node at origin', () => {
    // Arrange
    const engine = new LayoutEngine();

    // Act
    const { nodes } = engine.createInitialLayout('Test Topic');

    // Assert
    const topicNode = nodes[0];
    expect(topicNode.x).toBe(0);
    expect(topicNode.y).toBe(0);
    expect((topicNode as any).text).toBe('# Test Topic');
    expect(topicNode.color).toBe('6'); // purple
  });
});
```

#### TC-LE-034: Add vault notes as background
```typescript
it('should add vault notes in WEST zone', () => {
  // Arrange
  const engine = new LayoutEngine();

  // Act
  const { nodes } = engine.createInitialLayout('Test', {
    vaultNotes: ['note1.md', 'note2.md'],
  });

  // Assert
  const fileNodes = nodes.filter(n => n.type === 'file');
  expect(fileNodes).toHaveLength(2);
  fileNodes.forEach(node => {
    expect(node.x).toBeLessThan(0); // WEST zone
  });
});
```

#### TC-LE-035: Add initial questions in EAST zone
```typescript
it('should add questions in EAST zone', () => {
  // Arrange
  const engine = new LayoutEngine();

  // Act
  const { nodes } = engine.createInitialLayout('Test', {
    questions: ['What is this?', 'Why does it matter?'],
  });

  // Assert
  const questionNodes = nodes.filter(n =>
    n.type === 'text' && (n as any).text.includes('?')
  );
  expect(questionNodes).toHaveLength(2);
});
```

#### TC-LE-036: Limit vault notes to 5
```typescript
it('should limit vault notes to maximum 5', () => {
  // Arrange
  const engine = new LayoutEngine();
  const manyNotes = Array.from({ length: 10 }, (_, i) => `note${i}.md`);

  // Act
  const { nodes } = engine.createInitialLayout('Test', {
    vaultNotes: manyNotes,
  });

  // Assert
  const fileNodes = nodes.filter(n => n.type === 'file');
  expect(fileNodes).toHaveLength(5);
});
```

#### TC-LE-037: Limit questions to 5
```typescript
it('should limit questions to maximum 5', () => {
  // Arrange
  const engine = new LayoutEngine();
  const manyQuestions = Array.from({ length: 10 }, (_, i) => `Question ${i}?`);

  // Act
  const { nodes } = engine.createInitialLayout('Test', {
    questions: manyQuestions,
  });

  // Assert
  const questionNodes = nodes.filter(n =>
    n.type === 'text' && (n as any).text.includes('?')
  );
  expect(questionNodes).toHaveLength(5);
});
```

#### TC-LE-038: Prepend '?' to questions without it
```typescript
it('should prepend "? " to questions that do not start with "?"', () => {
  // Arrange
  const engine = new LayoutEngine();

  // Act
  const { nodes } = engine.createInitialLayout('Test', {
    questions: ['How does this work'],
  });

  // Assert
  const questionNode = nodes.find(n =>
    n.type === 'text' && (n as any).text.includes('work')
  ) as any;
  expect(questionNode.text).toMatch(/^\? /);
});
```

---

## 8. Utility Method Tests

#### TC-LE-039: getNodes() strips metadata
```typescript
describe('Utility Methods', () => {
  it('getNodes should return nodes without _metadata', () => {
    // Arrange
    const engine = new LayoutEngine([createAnchorNode()], []);
    engine.allocateByRelation({
      anchorId: 'anchor-1',
      relation: 'answers',
      content: { type: 'text', text: 'Answer' },
    });

    // Act
    const nodes = engine.getNodes();

    // Assert
    nodes.forEach(node => {
      expect((node as any)._metadata).toBeUndefined();
    });
  });
});
```

#### TC-LE-040: getEdges() returns copy
```typescript
it('getEdges should return a copy of edges array', () => {
  // Arrange
  const edges = [{ id: 'e1', fromNode: 'n1', toNode: 'n2' }];
  const engine = new LayoutEngine([createAnchorNode()], edges);

  // Act
  const returnedEdges = engine.getEdges();
  returnedEdges.push({ id: 'e2', fromNode: 'n2', toNode: 'n3' });

  // Assert
  expect(engine.getEdges()).toHaveLength(1); // Original unchanged
});
```

#### TC-LE-041: addNode() adds to internal list
```typescript
it('addNode should add node to internal list', () => {
  // Arrange
  const engine = new LayoutEngine();
  const node = createAnchorNode();

  // Act
  engine.addNode(node);

  // Assert
  expect(engine.getNodes()).toContainEqual(expect.objectContaining({ id: 'anchor-1' }));
});
```

#### TC-LE-042: addEdge() adds to internal list
```typescript
it('addEdge should add edge to internal list', () => {
  // Arrange
  const engine = new LayoutEngine();
  const edge = { id: 'e1', fromNode: 'n1', toNode: 'n2' };

  // Act
  engine.addEdge(edge);

  // Assert
  expect(engine.getEdges()).toContainEqual(edge);
});
```

#### TC-LE-043: getZoneCounts() returns copy
```typescript
it('getZoneCounts should return copy of zone counts', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: 'A' },
  });

  // Act
  const counts = engine.getZoneCounts();
  counts['SOUTH'] = 999;

  // Assert
  expect(engine.getZoneCounts()['SOUTH']).toBe(1);
});
```

---

## 9. All Zone Coverage Tests

#### TC-LE-044 to TC-LE-052: Test all 9 zones
```typescript
describe('All Zones Coverage', () => {
  const zoneRelations = [
    { relation: 'parent', expectedZone: 'NORTH' },
    { relation: 'answers', expectedZone: 'SOUTH' },
    { relation: 'follows', expectedZone: 'EAST' },
    { relation: 'background', expectedZone: 'WEST' },
    { relation: 'prerequisite', expectedZone: 'NORTH_WEST' },
    { relation: 'elaborates', expectedZone: 'SOUTH_EAST' },
    { relation: 'contradicts', expectedZone: 'SOUTH_WEST' },
  ];

  zoneRelations.forEach(({ relation, expectedZone }) => {
    it(`should place "${relation}" in ${expectedZone} zone`, () => {
      // Arrange
      const engine = new LayoutEngine([createAnchorNode()], []);

      // Act
      const result = engine.allocateByRelation({
        anchorId: 'anchor-1',
        relation,
        content: { type: 'text', text: `${relation} content` },
      });

      // Assert
      expect(result).not.toBeNull();
      const zoneCounts = engine.getZoneCounts();
      expect(zoneCounts[expectedZone]).toBe(1);
    });
  });
});
```

---

## 10. Edge Cases & Stress Tests

#### TC-LE-053: Handle 100+ nodes in single zone
```typescript
describe('Stress Tests', () => {
  it('should handle 100 nodes in single zone', () => {
    // Arrange
    const engine = new LayoutEngine([createAnchorNode()], []);

    // Act
    for (let i = 0; i < 100; i++) {
      engine.allocateByRelation({
        anchorId: 'anchor-1',
        relation: 'answers',
        content: { type: 'text', text: `Answer ${i}` },
      });
    }

    // Assert
    expect(engine.getNodes().length).toBeGreaterThanOrEqual(101);
    expect(engine.getZoneCounts()['SOUTH']).toBe(100);
  });
});
```

#### TC-LE-054: Handle empty content
```typescript
it('should handle empty text content', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: '' },
  });

  // Assert
  expect(result).not.toBeNull();
  expect((result!.node as any).text).toBe('');
});
```

#### TC-LE-055: Handle very long content
```typescript
it('should handle very long text content', () => {
  // Arrange
  const engine = new LayoutEngine([createAnchorNode()], []);
  const longText = 'A'.repeat(10000);

  // Act
  const result = engine.allocateByRelation({
    anchorId: 'anchor-1',
    relation: 'answers',
    content: { type: 'text', text: longText },
  });

  // Assert
  expect(result).not.toBeNull();
  expect((result!.node as any).text).toBe(longText);
});
```
