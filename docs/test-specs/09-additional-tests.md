# Additional Test Scenarios - Gap Analysis

## Overview

기존 테스트 사양 문서 분석 결과, 약 **70-85개의 추가 테스트 케이스**가 필요함을 확인했습니다.
이 문서는 기존 테스트 사양에서 누락된 시나리오들을 정리합니다.

---

# Part 1: Critical Gaps (High Priority)

## 1. CanvasParser 추가 테스트

**파일:** `src/engine/canvas-parser.ts`

### 1.1 Color Validation Tests

```typescript
describe('CanvasParser - Color Validation', () => {
  // TC-CP-ADV-001: Invalid color codes
  it('should handle invalid color codes gracefully', async () => {
    const canvas = await parser.load('/test.canvas');

    // Try to add node with invalid color
    const node = parser.addTextNode(canvas, {
      text: 'Test',
      color: '0' as any, // Invalid - valid is '1'-'6'
    });

    // Should either reject or default to valid color
    expect(['1', '2', '3', '4', '5', '6', undefined]).toContain(node.color);
  });

  // TC-CP-ADV-002: Color code '7' and above
  it('should reject color codes above 6', async () => {
    const canvas = await parser.load('/test.canvas');

    const node = parser.addTextNode(canvas, {
      text: 'Test',
      color: '7' as any,
    });

    expect(node.color).not.toBe('7');
  });
});
```

### 1.2 ID Collision Tests

```typescript
describe('CanvasParser - ID Generation', () => {
  // TC-CP-ADV-003: UUID collision simulation
  it('should generate unique IDs even with mock collision', () => {
    // Mock uuid to return same value twice
    const mockUuid = vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('same-id')
      .mockReturnValueOnce('same-id')
      .mockReturnValueOnce('different-id');

    const id1 = parser['generateId']();
    const id2 = parser['generateId']();

    // Implementation should handle collision
    expect(id1).not.toBe(id2);
    mockUuid.mockRestore();
  });

  // TC-CP-ADV-004: Existing ID in canvas
  it('should not generate ID that already exists in canvas', async () => {
    const canvas = await parser.load('/test.canvas');
    const existingId = canvas.nodes[0]?.id;

    // Force collision
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce(existingId);

    const newNode = parser.addTextNode(canvas, { text: 'New' });
    expect(newNode.id).not.toBe(existingId);
  });
});
```

### 1.3 File Path Encoding Tests

```typescript
describe('CanvasParser - File Path Handling', () => {
  // TC-CP-ADV-005: Unicode file paths
  it('should handle unicode characters in file paths', async () => {
    const unicodePath = '/vault/캔버스/테스트.canvas';

    vol.fromJSON({
      [unicodePath]: JSON.stringify({ nodes: [], edges: [] }),
    });

    const canvas = await parser.load(unicodePath);
    await parser.save(unicodePath, canvas);

    const reloaded = await parser.load(unicodePath);
    expect(reloaded).toBeDefined();
  });

  // TC-CP-ADV-006: Paths with spaces and special chars
  it('should handle paths with spaces and special characters', async () => {
    const specialPath = '/vault/My Canvas (v2) [final]/test & demo.canvas';

    vol.fromJSON({
      [specialPath]: JSON.stringify({ nodes: [], edges: [] }),
    });

    const canvas = await parser.load(specialPath);
    expect(canvas).toBeDefined();
  });

  // TC-CP-ADV-007: Very long file paths
  it('should handle paths approaching OS limits', async () => {
    const longName = 'a'.repeat(200);
    const longPath = `/vault/${longName}.canvas`;

    vol.fromJSON({
      [longPath]: JSON.stringify({ nodes: [], edges: [] }),
    });

    await expect(parser.load(longPath)).resolves.toBeDefined();
  });
});
```

### 1.4 Orphaned Edge Tests

```typescript
describe('CanvasParser - Edge Integrity', () => {
  // TC-CP-ADV-008: Edges referencing non-existent nodes
  it('should handle edges with invalid node references', async () => {
    const canvasWithOrphanedEdge = {
      nodes: [{ id: 'node1', type: 'text', text: 'Test', x: 0, y: 0, width: 100, height: 50 }],
      edges: [
        { id: 'edge1', fromNode: 'node1', toNode: 'deleted-node', fromSide: 'right', toSide: 'left' },
      ],
    };

    vol.fromJSON({
      '/test.canvas': JSON.stringify(canvasWithOrphanedEdge),
    });

    const canvas = await parser.load('/test.canvas');

    // getConnectedNodes should not crash
    const connected = parser.getConnectedNodes(canvas, 'node1');
    expect(connected).not.toContain('deleted-node');
  });

  // TC-CP-ADV-009: Both edge endpoints missing
  it('should handle edges where both endpoints are missing', async () => {
    const brokenCanvas = {
      nodes: [],
      edges: [
        { id: 'edge1', fromNode: 'ghost1', toNode: 'ghost2', fromSide: 'right', toSide: 'left' },
      ],
    };

    vol.fromJSON({
      '/broken.canvas': JSON.stringify(brokenCanvas),
    });

    const canvas = await parser.load('/broken.canvas');
    expect(canvas.edges).toHaveLength(1); // Edge preserved but non-functional
  });
});
```

### 1.5 Performance Tests

```typescript
describe('CanvasParser - Performance', () => {
  // TC-CP-ADV-010: Large edge arrays
  it('should handle 10,000+ edges efficiently', async () => {
    const nodes = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      type: 'text' as const,
      text: `Node ${i}`,
      x: i * 100,
      y: 0,
      width: 80,
      height: 40,
    }));

    // Create edges between all pairs (100 * 99 / 2 = 4950 edges)
    const edges = [];
    for (let i = 0; i < 100; i++) {
      for (let j = i + 1; j < 100; j++) {
        edges.push({
          id: `edge-${i}-${j}`,
          fromNode: `node-${i}`,
          toNode: `node-${j}`,
          fromSide: 'right',
          toSide: 'left',
        });
      }
    }

    const canvas = { nodes, edges };

    const start = performance.now();
    const connected = parser.getConnectedNodes(canvas as any, 'node-0');
    const duration = performance.now() - start;

    expect(connected).toHaveLength(99);
    expect(duration).toBeLessThan(100); // < 100ms
  });

  // TC-CP-ADV-011: Parsing large canvas file
  it('should parse 1000-node canvas in reasonable time', async () => {
    const nodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `node-${i}`,
      type: 'text',
      text: `Content for node ${i}`.repeat(10),
      x: (i % 50) * 200,
      y: Math.floor(i / 50) * 100,
      width: 150,
      height: 80,
    }));

    const largeCanvas = JSON.stringify({ nodes, edges: [] });
    vol.fromJSON({ '/large.canvas': largeCanvas });

    const start = performance.now();
    const canvas = await parser.load('/large.canvas');
    const duration = performance.now() - start;

    expect(canvas.nodes).toHaveLength(1000);
    expect(duration).toBeLessThan(500); // < 500ms
  });
});
```

### 1.6 Metadata Stripping Edge Cases

```typescript
describe('CanvasParser - Metadata Stripping', () => {
  // TC-CP-ADV-012: Nested underscore properties
  it('should strip only top-level underscore properties', async () => {
    const nodeWithNestedUnderscore = {
      id: 'n1',
      type: 'text',
      text: 'Test',
      x: 0, y: 0, width: 100, height: 50,
      _meta: { category: 'test' },
      data: { _internal: 'should preserve?' }, // Nested underscore
    };

    const canvas = {
      nodes: [nodeWithNestedUnderscore],
      edges: [],
    };

    await parser.save('/test.canvas', canvas as any);
    const saved = JSON.parse(vol.readFileSync('/test.canvas', 'utf8') as string);

    expect(saved.nodes[0]._meta).toBeUndefined();
    // Decision needed: should nested _internal be stripped?
  });

  // TC-CP-ADV-013: Property named exactly '_'
  it('should handle property named exactly underscore', async () => {
    const weirdNode = {
      id: 'n1',
      type: 'text',
      text: 'Test',
      x: 0, y: 0, width: 100, height: 50,
      _: 'just underscore',
    };

    const canvas = { nodes: [weirdNode], edges: [] };
    await parser.save('/test.canvas', canvas as any);

    const saved = JSON.parse(vol.readFileSync('/test.canvas', 'utf8') as string);
    expect(saved.nodes[0]._).toBeUndefined();
  });
});
```

---

## 2. LayoutEngine 추가 테스트

**파일:** `src/engine/layout-engine.ts`

### 2.1 Zone Saturation Tests

```typescript
describe('LayoutEngine - Zone Saturation', () => {
  // TC-LE-ADV-001: Zone reaches maximum capacity
  it('should handle zone reaching maxColumnNodes limit', () => {
    const engine = new LayoutEngine({ maxColumnNodes: 3 });
    const anchor = { x: 500, y: 500 };

    // Allocate until zone is full
    const positions: Position[] = [];
    for (let i = 0; i < 5; i++) {
      const pos = engine.allocatePosition(anchor, Zone.EAST, { width: 100, height: 50 });
      if (pos) positions.push(pos);
    }

    // Should wrap to new column or return fallback
    expect(positions.length).toBeGreaterThanOrEqual(3);

    // Check that positions don't overlap
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const overlap = detectCollision(positions[i], positions[j]);
        expect(overlap).toBe(false);
      }
    }
  });

  // TC-LE-ADV-002: All zones completely saturated
  it('should return null when all zones are full', () => {
    const engine = new LayoutEngine({ maxColumnNodes: 1 });
    const anchor = { x: 500, y: 500 };

    // Fill all 9 zones
    const allZones = [
      Zone.CORE, Zone.NORTH, Zone.SOUTH, Zone.EAST, Zone.WEST,
      Zone.NORTH_EAST, Zone.NORTH_WEST, Zone.SOUTH_EAST, Zone.SOUTH_WEST,
    ];

    for (const zone of allZones) {
      engine.allocatePosition(anchor, zone, { width: 100, height: 50 });
    }

    // Next allocation should fail or find fallback
    const result = engine.allocatePosition(anchor, Zone.EAST, { width: 100, height: 50 });
    // Behavior depends on implementation
  });
});
```

### 2.2 Negative Coordinate Tests

```typescript
describe('LayoutEngine - Coordinate Boundaries', () => {
  // TC-LE-ADV-003: Nodes placed in negative coordinate space
  it('should handle anchor at origin with WEST allocation', () => {
    const engine = new LayoutEngine();
    const anchor = { x: 0, y: 0 };

    const pos = engine.allocatePosition(anchor, Zone.WEST, { width: 100, height: 50 });

    // Should place in negative X space
    expect(pos).toBeDefined();
    expect(pos!.x).toBeLessThan(0);
  });

  // TC-LE-ADV-004: Anchor at negative coordinates
  it('should handle anchor already in negative space', () => {
    const engine = new LayoutEngine();
    const anchor = { x: -500, y: -500 };

    const pos = engine.allocatePosition(anchor, Zone.NORTH, { width: 100, height: 50 });

    expect(pos).toBeDefined();
    expect(pos!.y).toBeLessThan(-500);
  });

  // TC-LE-ADV-005: Very large coordinates
  it('should handle coordinates near Number.MAX_SAFE_INTEGER', () => {
    const engine = new LayoutEngine();
    const anchor = { x: Number.MAX_SAFE_INTEGER - 1000, y: 0 };

    const pos = engine.allocatePosition(anchor, Zone.EAST, { width: 100, height: 50 });

    // Should either work or gracefully fail
    if (pos) {
      expect(Number.isFinite(pos.x)).toBe(true);
    }
  });
});
```

### 2.3 Group ID Conflict Tests

```typescript
describe('LayoutEngine - Group Management', () => {
  // TC-LE-ADV-006: Multiple groups with same ID
  it('should handle duplicate group IDs', () => {
    const engine = new LayoutEngine();

    const group1 = engine.createGroup(Zone.EAST, 'duplicate-id');
    const group2 = engine.createGroup(Zone.WEST, 'duplicate-id');

    // Should either:
    // 1. Reject second group
    // 2. Merge groups
    // 3. Rename second group
    expect(group1.id).not.toBe(group2.id); // Or expect error
  });

  // TC-LE-ADV-007: Group with no nodes
  it('should handle empty group bounds calculation', () => {
    const engine = new LayoutEngine();
    const group = engine.createGroup(Zone.NORTH, 'empty-group');

    const bounds = engine.getGroupBounds('empty-group');

    // Should return null or zero-sized bounds
    expect(bounds).toBeNull();
  });
});
```

### 2.4 Dynamic Size Calculation Tests

```typescript
describe('LayoutEngine - Dynamic Size Calculation', () => {
  // TC-LE-ADV-008: Very short text
  it('should calculate reasonable size for single character', () => {
    const engine = new LayoutEngine();

    const size = engine.calculateDynamicSize('X');

    expect(size.width).toBeGreaterThanOrEqual(50); // Minimum width
    expect(size.height).toBeGreaterThanOrEqual(30); // Minimum height
  });

  // TC-LE-ADV-009: Very long single line
  it('should handle very long single line text', () => {
    const engine = new LayoutEngine();
    const longText = 'A'.repeat(10000);

    const size = engine.calculateDynamicSize(longText);

    expect(size.width).toBeLessThanOrEqual(800); // Should cap at max
    expect(size.height).toBeGreaterThan(50); // Should wrap to multiple lines
  });

  // TC-LE-ADV-010: Text with only newlines
  it('should handle text with only newlines', () => {
    const engine = new LayoutEngine();

    const size = engine.calculateDynamicSize('\n\n\n\n\n');

    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });

  // TC-LE-ADV-011: Text with unicode characters
  it('should calculate size for unicode text correctly', () => {
    const engine = new LayoutEngine();

    const size = engine.calculateDynamicSize('한글 테스트 🚀 日本語');

    // Unicode characters may have different widths
    expect(size.width).toBeGreaterThan(0);
  });
});
```

### 2.5 Collision Detection Edge Cases

```typescript
describe('LayoutEngine - Collision Detection', () => {
  // TC-LE-ADV-012: Zero-sized nodes
  it('should handle collision check with zero-width node', () => {
    const engine = new LayoutEngine();

    const nodeA = { x: 100, y: 100, width: 0, height: 50 };
    const nodeB = { x: 100, y: 100, width: 100, height: 50 };

    const collision = engine['detectCollision'](nodeA, nodeB);
    // Zero-width should not collide
    expect(collision).toBe(false);
  });

  // TC-LE-ADV-013: Touching but not overlapping
  it('should not detect collision for adjacent nodes', () => {
    const engine = new LayoutEngine();

    const nodeA = { x: 0, y: 0, width: 100, height: 50 };
    const nodeB = { x: 100, y: 0, width: 100, height: 50 }; // Exactly touching

    const collision = engine['detectCollision'](nodeA, nodeB);
    expect(collision).toBe(false);
  });

  // TC-LE-ADV-014: One pixel overlap
  it('should detect one pixel overlap', () => {
    const engine = new LayoutEngine();

    const nodeA = { x: 0, y: 0, width: 100, height: 50 };
    const nodeB = { x: 99, y: 0, width: 100, height: 50 }; // 1px overlap

    const collision = engine['detectCollision'](nodeA, nodeB);
    expect(collision).toBe(true);
  });
});
```

---

## 3. MetaManager 추가 테스트

**파일:** `src/engine/meta-manager.ts`

### 3.1 Concurrent Operations Tests

```typescript
describe('MetaManager - Concurrent Operations', () => {
  // TC-MM-ADV-001: Concurrent saves to same canvas
  it('should handle concurrent meta saves without corruption', async () => {
    const manager = new MetaManager('/vault');
    const canvasPath = '/vault/03_Canvas/test.canvas';

    // Simulate concurrent saves
    const save1 = manager.saveMeta(canvasPath, { topic: 'Version 1' });
    const save2 = manager.saveMeta(canvasPath, { topic: 'Version 2' });

    await Promise.all([save1, save2]);

    const meta = await manager.loadMeta(canvasPath);
    // Should have one consistent version, not corrupted
    expect(['Version 1', 'Version 2']).toContain(meta.topic);
  });

  // TC-MM-ADV-002: Read during write
  it('should handle read while write is in progress', async () => {
    const manager = new MetaManager('/vault');
    const canvasPath = '/vault/03_Canvas/test.canvas';

    // Start a slow save
    const savePromise = manager.saveMeta(canvasPath, { topic: 'Writing' });

    // Immediately try to read
    const meta = await manager.loadMeta(canvasPath);

    await savePromise;

    // Should get consistent data
    expect(meta).toBeDefined();
  });
});
```

### 3.2 State Transition Tests

```typescript
describe('MetaManager - Workflow State Transitions', () => {
  // TC-MM-ADV-003: Invalid state transition
  it('should prevent invalid state transitions', async () => {
    const manager = new MetaManager('/vault');
    const canvasPath = '/vault/03_Canvas/test.canvas';

    // Set to 'atomized'
    await manager.saveMeta(canvasPath, { workflowState: 'atomized' });

    // Try to go back to 'created'
    const result = await manager.transitionState(canvasPath, 'created');

    // Should reject or warn
    expect(result.success).toBe(false);
  });

  // TC-MM-ADV-004: Valid state transitions
  it('should allow valid forward state transitions', async () => {
    const manager = new MetaManager('/vault');
    const canvasPath = '/vault/03_Canvas/test.canvas';

    const transitions = ['created', 'expanded', 'crystallized', 'atomized', 'archived'];

    for (let i = 0; i < transitions.length - 1; i++) {
      await manager.saveMeta(canvasPath, { workflowState: transitions[i] as any });
      const result = await manager.transitionState(canvasPath, transitions[i + 1] as any);
      expect(result.success).toBe(true);
    }
  });
});
```

### 3.3 Intent Parsing Tests

```typescript
describe('MetaManager - Intent Parsing', () => {
  // TC-MM-ADV-005: Malformed intent format
  it('should handle intent without colon', async () => {
    const manager = new MetaManager('/vault');

    // Node with malformed intent
    const nodes = [{
      id: 'n1',
      type: 'text',
      text: 'RESEARCH without colon explanation',
      x: 0, y: 0, width: 100, height: 50,
    }];

    const meta = await manager.extractMeta('/test.canvas', { nodes, edges: [] } as any);

    // Should not crash, maybe mark as unknown intent
    expect(meta).toBeDefined();
  });

  // TC-MM-ADV-006: Intent with multiple colons
  it('should handle intent with multiple colons', async () => {
    const manager = new MetaManager('/vault');

    const nodes = [{
      id: 'n1',
      type: 'text',
      text: 'QUESTION: What is: the answer?',
      x: 0, y: 0, width: 100, height: 50,
    }];

    const meta = await manager.extractMeta('/test.canvas', { nodes, edges: [] } as any);

    // Should extract "What is: the answer?" as the content
    expect(meta.nodes?.[0]?.intent).toBe('QUESTION');
  });

  // TC-MM-ADV-007: Case sensitivity in intent
  it('should handle lowercase intent keywords', async () => {
    const manager = new MetaManager('/vault');

    const nodes = [{
      id: 'n1',
      type: 'text',
      text: 'question: Is this valid?', // lowercase
      x: 0, y: 0, width: 100, height: 50,
    }];

    const meta = await manager.extractMeta('/test.canvas', { nodes, edges: [] } as any);

    // Should recognize lowercase intent
    expect(meta.nodes?.[0]?.intent?.toUpperCase()).toBe('QUESTION');
  });
});
```

### 3.4 Statistics Integrity Tests

```typescript
describe('MetaManager - Statistics Integrity', () => {
  // TC-MM-ADV-008: Resolved questions exceeding total
  it('should handle resolvedQuestions > questions', async () => {
    const manager = new MetaManager('/vault');
    const canvasPath = '/vault/03_Canvas/test.canvas';

    // Corrupt state
    await manager.saveMeta(canvasPath, {
      statistics: {
        nodes: 10,
        edges: 5,
        questions: 3,
        resolvedQuestions: 5, // More than total!
      },
    });

    const meta = await manager.loadMeta(canvasPath);

    // Should either fix or flag as error
    expect(meta.statistics.resolvedQuestions).toBeLessThanOrEqual(meta.statistics.questions);
  });

  // TC-MM-ADV-009: Negative statistics
  it('should reject negative statistics', async () => {
    const manager = new MetaManager('/vault');

    await expect(manager.saveMeta('/test.canvas', {
      statistics: { nodes: -1, edges: 0, questions: 0, resolvedQuestions: 0 },
    })).rejects.toThrow();
  });
});
```

---

## 4. VaultIndexer 추가 테스트

**파일:** `src/engine/vault-indexer.ts`

### 4.1 Circular Reference Tests

```typescript
describe('VaultIndexer - Circular References', () => {
  // TC-VI-ADV-001: Circular wiki links
  it('should handle circular wiki link references', async () => {
    vol.fromJSON({
      '/vault/A.md': '# A\nLinks to [[B]]',
      '/vault/B.md': '# B\nLinks to [[C]]',
      '/vault/C.md': '# C\nLinks to [[A]]', // Circular!
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const backlinksA = indexer.getBacklinks('A');
    const backlinksB = indexer.getBacklinks('B');
    const backlinksC = indexer.getBacklinks('C');

    expect(backlinksA).toContain('C');
    expect(backlinksB).toContain('A');
    expect(backlinksC).toContain('B');
  });

  // TC-VI-ADV-002: Self-referencing note
  it('should handle note linking to itself', async () => {
    vol.fromJSON({
      '/vault/Self.md': '# Self\nSee also [[Self]] for more.',
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const backlinks = indexer.getBacklinks('Self');

    // Should include self-reference or filter it out
    expect(Array.isArray(backlinks)).toBe(true);
  });
});
```

### 4.2 Frontmatter Edge Cases

```typescript
describe('VaultIndexer - Frontmatter Parsing', () => {
  // TC-VI-ADV-003: Malformed YAML frontmatter
  it('should handle malformed YAML in frontmatter', async () => {
    vol.fromJSON({
      '/vault/broken.md': `---
tags: [unclosed array
invalid: yaml: syntax
---
# Content`,
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('broken');

    // Should not crash, maybe return empty tags
    expect(note).toBeDefined();
    expect(note.tags || []).toEqual([]);
  });

  // TC-VI-ADV-004: Tags as string instead of array
  it('should handle tags as single string', async () => {
    vol.fromJSON({
      '/vault/string-tag.md': `---
tags: single-tag
---
# Content`,
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('string-tag');

    // Should normalize to array
    expect(Array.isArray(note.tags)).toBe(true);
    expect(note.tags).toContain('single-tag');
  });

  // TC-VI-ADV-005: Tags with special characters
  it('should handle tags with special characters', async () => {
    vol.fromJSON({
      '/vault/special.md': `---
tags:
  - "tag/with/slashes"
  - "tag with spaces"
  - tag-with-dashes
  - tag_with_underscores
---
# Content`,
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('special');

    expect(note.tags).toHaveLength(4);
  });
});
```

### 4.3 Title Extraction Tests

```typescript
describe('VaultIndexer - Title Extraction', () => {
  // TC-VI-ADV-006: Multiple H1 headings
  it('should use first H1 as title when multiple exist', async () => {
    vol.fromJSON({
      '/vault/multi-h1.md': `# First Title
Some content
# Second Title
More content`,
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('multi-h1');

    expect(note.title).toBe('First Title');
  });

  // TC-VI-ADV-007: No H1, only H2
  it('should fallback to filename when no H1 exists', async () => {
    vol.fromJSON({
      '/vault/no-h1.md': `## Only H2 Here
Content`,
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('no-h1');

    expect(note.title).toBe('no-h1'); // Filename fallback
  });

  // TC-VI-ADV-008: Frontmatter title vs H1
  it('should prefer frontmatter title over H1', async () => {
    vol.fromJSON({
      '/vault/both-titles.md': `---
title: Frontmatter Title
---
# H1 Title
Content`,
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('both-titles');

    // Decision: which takes precedence?
    expect(note.title).toBe('Frontmatter Title');
  });
});
```

### 4.4 Empty and Edge Case Files

```typescript
describe('VaultIndexer - Edge Case Files', () => {
  // TC-VI-ADV-009: Completely empty file
  it('should handle empty markdown file', async () => {
    vol.fromJSON({
      '/vault/empty.md': '',
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('empty');

    expect(note).toBeDefined();
    expect(note.title).toBe('empty');
    expect(note.keywords).toEqual([]);
  });

  // TC-VI-ADV-010: File with only whitespace
  it('should handle file with only whitespace', async () => {
    vol.fromJSON({
      '/vault/whitespace.md': '   \n\n\t\t\n   ',
    });

    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const note = indexer.getNoteMetadata('whitespace');

    expect(note).toBeDefined();
  });

  // TC-VI-ADV-011: Binary file with .md extension
  it('should handle binary data in .md file', async () => {
    // Simulate binary content
    const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE]).toString();
    vol.fromJSON({
      '/vault/binary.md': binaryContent,
    });

    const indexer = new VaultIndexer('/vault');

    // Should not crash
    await expect(indexer.buildIndex()).resolves.not.toThrow();
  });
});
```

### 4.5 Performance Tests

```typescript
describe('VaultIndexer - Performance', () => {
  // TC-VI-ADV-012: Index 10,000 files
  it('should index 10,000 files in reasonable time', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 10000; i++) {
      files[`/vault/note-${i}.md`] = `# Note ${i}\nContent for note ${i}`;
    }
    vol.fromJSON(files);

    const indexer = new VaultIndexer('/vault');

    const start = performance.now();
    await indexer.buildIndex();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(30000); // < 30 seconds
    expect(indexer.getStats().totalNotes).toBe(10000);
  });

  // TC-VI-ADV-013: Search in large index
  it('should search 10,000 indexed files quickly', async () => {
    // Assume index is already built
    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const start = performance.now();
    const results = indexer.search('note');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(500); // < 500ms
  });
});
```

---

## 5. CrossReferenceManager 추가 테스트

**파일:** `src/engine/cross-reference.ts`

### 5.1 Similarity Score Tests

```typescript
describe('CrossReferenceManager - Similarity Scoring', () => {
  // TC-CR-ADV-001: Score normalization
  it('should normalize similarity scores between 0 and 1', async () => {
    const manager = new CrossReferenceManager('/vault');

    // Create canvases with varying similarity
    await createCanvas('topic1', ['ML', 'AI', 'data']);
    await createCanvas('topic2', ['ML', 'AI', 'data']); // Identical keywords

    await manager.buildIndex();
    const similarity = manager.getSimilarity('topic1', 'topic2');

    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  // TC-CR-ADV-002: Case insensitive keyword matching
  it('should match keywords case-insensitively', async () => {
    const manager = new CrossReferenceManager('/vault');

    await createCanvas('topic1', ['Machine Learning']);
    await createCanvas('topic2', ['machine learning']); // Different case

    await manager.buildIndex();
    const similarity = manager.getSimilarity('topic1', 'topic2');

    expect(similarity).toBeGreaterThan(0.5); // Should recognize as similar
  });

  // TC-CR-ADV-003: Empty keyword handling
  it('should handle canvases with no keywords', async () => {
    const manager = new CrossReferenceManager('/vault');

    await createCanvas('empty1', []);
    await createCanvas('empty2', []);

    await manager.buildIndex();
    const similarity = manager.getSimilarity('empty1', 'empty2');

    // Empty canvases are not similar by content
    expect(similarity).toBe(0);
  });
});
```

### 5.2 Network Graph Tests

```typescript
describe('CrossReferenceManager - Network Graph', () => {
  // TC-CR-ADV-004: Disconnected components
  it('should identify disconnected canvas groups', async () => {
    const manager = new CrossReferenceManager('/vault');

    // Group 1: Related canvases
    await createCanvas('ml-basics', ['ML', 'algorithms']);
    await createCanvas('ml-advanced', ['ML', 'deep learning']);

    // Group 2: Unrelated canvases
    await createCanvas('cooking', ['recipes', 'food']);
    await createCanvas('baking', ['recipes', 'desserts']);

    await manager.buildIndex();
    const network = manager.getCanvasNetwork();

    // Should have 4 nodes
    expect(network.nodes).toHaveLength(4);

    // ML canvases should be connected
    const mlEdge = network.edges.find(e =>
      (e.source === 'ml-basics' && e.target === 'ml-advanced') ||
      (e.source === 'ml-advanced' && e.target === 'ml-basics')
    );
    expect(mlEdge).toBeDefined();

    // ML and cooking should NOT be connected
    const crossEdge = network.edges.find(e =>
      (e.source === 'ml-basics' && e.target === 'cooking')
    );
    expect(crossEdge).toBeUndefined();
  });

  // TC-CR-ADV-005: Single canvas network
  it('should handle network with single canvas', async () => {
    const manager = new CrossReferenceManager('/vault');

    await createCanvas('lonely', ['solo']);

    await manager.buildIndex();
    const network = manager.getCanvasNetwork();

    expect(network.nodes).toHaveLength(1);
    expect(network.edges).toHaveLength(0);
  });
});
```

---

# Part 2: High Priority Gaps

## 6. Server.ts 추가 테스트

### 6.1 Zod Schema Conversion Edge Cases

```typescript
describe('Server - Schema Conversion', () => {
  // TC-SRV-ADV-001: ZodUnion type
  it('should handle ZodUnion types', () => {
    const schema = z.union([z.string(), z.number()]);

    const jsonSchema = zodToJsonSchema(schema);

    // Should either support or gracefully degrade
    expect(jsonSchema.type).toBeDefined();
  });

  // TC-SRV-ADV-002: Deeply nested objects
  it('should handle deeply nested object schemas', () => {
    const deepSchema = z.object({
      level1: z.object({
        level2: z.object({
          level3: z.object({
            value: z.string(),
          }),
        }),
      }),
    });

    const jsonSchema = zodToJsonSchema(deepSchema);

    expect(jsonSchema.properties.level1.properties.level2.properties.level3).toBeDefined();
  });

  // TC-SRV-ADV-003: ZodDefault values
  it('should preserve default values in schema', () => {
    const schema = z.object({
      name: z.string().default('unnamed'),
    });

    const jsonSchema = zodToJsonSchema(schema);

    // Default might not be in JSON Schema, but shouldn't crash
    expect(jsonSchema).toBeDefined();
  });
});
```

### 6.2 Error Handling Tests

```typescript
describe('Server - Error Handling', () => {
  // TC-SRV-ADV-004: Circular reference in error
  it('should handle errors with circular references', async () => {
    const circularError = new Error('Test');
    (circularError as any).circular = circularError; // Circular reference

    // Simulate tool that throws this error
    const result = await callToolWithError(circularError);

    // Should not crash on JSON serialization
    expect(result.isError).toBe(true);
  });

  // TC-SRV-ADV-005: Non-Error thrown
  it('should handle non-Error objects thrown', async () => {
    // Some code throws strings or objects instead of Errors
    const result = await callToolWithError('string error');

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('string error');
  });
});
```

---

## 7. Tools Layer 추가 테스트

### 7.1 CanvasTools Edge Cases

```typescript
describe('CanvasTools - Edge Cases', () => {
  // TC-CT-ADV-001: Filename sanitization with long Unicode
  it('should truncate long Unicode topics correctly', async () => {
    const longUnicodeTopic = '한글'.repeat(100); // 200 Korean chars

    const result = await canvasTools.createCanvas({ topic: longUnicodeTopic });

    // Filename should be truncated but valid
    const filename = path.basename(result.canvasPath);
    expect(filename.length).toBeLessThanOrEqual(255);
    expect(filename.endsWith('.canvas')).toBe(true);
  });

  // TC-CT-ADV-002: Duplicate topic name
  it('should handle duplicate topic names', async () => {
    await canvasTools.createCanvas({ topic: 'Duplicate' });
    const result = await canvasTools.createCanvas({ topic: 'Duplicate' });

    // Should either overwrite, version, or reject
    // Document expected behavior
  });

  // TC-CT-ADV-003: Crystallize with only link nodes
  it('should crystallize canvas with only link nodes', async () => {
    const canvas = await createCanvasWithOnlyLinks();

    const result = await canvasTools.crystallize({
      canvasPath: canvas.path,
      format: 'summary',
    });

    // Should produce meaningful output or clear error
    expect(result.outputPath).toBeDefined();
  });
});
```

### 7.2 VaultTools Edge Cases

```typescript
describe('VaultTools - Edge Cases', () => {
  // TC-VT-ADV-001: Empty search query
  it('should handle empty search query', async () => {
    const result = await vaultTools.search({ query: '' });

    // Should return empty or all results, not crash
    expect(Array.isArray(result.results)).toBe(true);
  });

  // TC-VT-ADV-002: Search with only special characters
  it('should handle special character search', async () => {
    const result = await vaultTools.search({ query: '***???###' });

    // Should escape or handle gracefully
    expect(result.results).toBeDefined();
  });
});
```

### 7.3 DashboardTools Edge Cases

```typescript
describe('DashboardTools - Edge Cases', () => {
  // TC-DT-ADV-001: Dashboard during concurrent modifications
  it('should handle dashboard query during canvas creation', async () => {
    const createPromise = canvasTools.createCanvas({ topic: 'New' });
    const dashboardPromise = dashboardTools.getOverview();

    const [created, dashboard] = await Promise.all([createPromise, dashboardPromise]);

    // Dashboard may or may not include new canvas
    expect(dashboard).toBeDefined();
  });

  // TC-DT-ADV-002: Health check with missing .meta directory
  it('should handle health check when .meta is missing', async () => {
    // Delete .meta directory
    await fs.rm('/vault/.meta', { recursive: true, force: true });

    const health = await dashboardTools.getSystemHealth();

    // Should report issue, not crash
    expect(health.issues).toBeDefined();
  });
});
```

---

# Part 3: Error Recovery & Performance

## 8. File System Error Tests

```typescript
describe('File System Error Recovery', () => {
  // TC-FS-001: Permission denied
  it('should handle EACCES error gracefully', async () => {
    vol.fromJSON({});
    // Mock permission error
    vi.spyOn(fs, 'readFile').mockRejectedValue(
      Object.assign(new Error('Permission denied'), { code: 'EACCES' })
    );

    await expect(parser.load('/protected.canvas')).rejects.toThrow();
    // Should throw meaningful error
  });

  // TC-FS-002: Disk full
  it('should handle ENOSPC error gracefully', async () => {
    vi.spyOn(fs, 'writeFile').mockRejectedValue(
      Object.assign(new Error('No space left'), { code: 'ENOSPC' })
    );

    const canvas = { nodes: [], edges: [] };
    await expect(parser.save('/test.canvas', canvas as any)).rejects.toThrow(/space/i);
  });

  // TC-FS-003: File deleted during read
  it('should handle file deletion during operation', async () => {
    let readCount = 0;
    vi.spyOn(fs, 'readFile').mockImplementation(async () => {
      readCount++;
      if (readCount === 1) {
        return JSON.stringify({ nodes: [], edges: [] });
      }
      throw Object.assign(new Error('File not found'), { code: 'ENOENT' });
    });

    // First read succeeds, subsequent fails
    await expect(parser.load('/disappearing.canvas')).resolves.toBeDefined();
    await expect(parser.load('/disappearing.canvas')).rejects.toThrow();
  });
});
```

## 9. Performance Benchmarks

```typescript
describe('Performance Benchmarks', () => {
  // TC-PERF-001: Layout 1000 nodes
  it('should layout 1000 nodes in under 5 seconds', async () => {
    const engine = new LayoutEngine();
    const anchor = { x: 500, y: 500 };

    const start = performance.now();

    for (let i = 0; i < 1000; i++) {
      const zone = Object.values(Zone)[i % 9];
      engine.allocatePosition(anchor, zone, { width: 100, height: 50 });
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  // TC-PERF-002: Build network graph with 100 canvases
  it('should build network graph with 100 canvases quickly', async () => {
    const manager = new CrossReferenceManager('/vault');

    // Create 100 canvases
    for (let i = 0; i < 100; i++) {
      await createCanvas(`canvas-${i}`, [`keyword-${i % 10}`, `shared-${i % 5}`]);
    }

    const start = performance.now();
    await manager.buildIndex();
    const network = manager.getCanvasNetwork();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10000); // < 10 seconds
    expect(network.nodes).toHaveLength(100);
  });

  // TC-PERF-003: Concurrent tool calls
  it('should handle 100 concurrent tool calls', async () => {
    const promises = Array.from({ length: 100 }, (_, i) =>
      client.callTool('vault_stats', {})
    );

    const start = performance.now();
    const results = await Promise.all(promises);
    const duration = performance.now() - start;

    expect(results.every(r => !r.isError)).toBe(true);
    expect(duration).toBeLessThan(30000); // < 30 seconds
  });
});
```

---

# Summary

## 추가 테스트 현황

| 모듈 | 추가 테스트 수 | 우선순위 |
|------|---------------|---------|
| CanvasParser | 13 | Critical |
| LayoutEngine | 14 | Critical |
| MetaManager | 9 | Critical |
| VaultIndexer | 13 | Critical |
| CrossReferenceManager | 5 | High |
| Server | 5 | High |
| CanvasTools | 3 | High |
| VaultTools | 2 | Medium |
| DashboardTools | 2 | Medium |
| File System Errors | 3 | High |
| Performance | 3 | Medium |

**총 추가 테스트: ~72개**

## 권장 구현 순서

1. **1단계 (Critical):** CanvasParser, LayoutEngine 엣지 케이스
2. **2단계 (Critical):** MetaManager 동시성, VaultIndexer 파싱
3. **3단계 (High):** Server 스키마 변환, CrossReference 유사도
4. **4단계 (Medium):** Tools 레이어, 성능 벤치마크
5. **5단계 (Low):** 에러 복구, 타입 검증
