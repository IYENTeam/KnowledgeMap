# CanvasParser Unit Test Specification

## Module Under Test
- **File:** `src/engine/canvas-parser.ts`
- **Class:** `CanvasParser` (Static utility class)
- **Dependencies:** `fs/promises`, `uuid`, Types

---

## Test Setup

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CanvasParser } from '../engine/canvas-parser';
import { vol } from 'memfs';

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

vi.mock('uuid', () => ({
  v4: vi.fn(() => '12345678-1234-1234-1234-123456789012'),
}));
```

---

## 1. File I/O Tests

### 1.1 `load()` Method

#### TC-CP-001: Load valid canvas file
```typescript
describe('load', () => {
  it('should load and parse a valid canvas file', async () => {
    // Arrange
    const canvasData = {
      nodes: [{ id: 'n1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Hello' }],
      edges: [{ id: 'e1', fromNode: 'n1', toNode: 'n2' }],
    };
    vol.fromJSON({ '/test.canvas': JSON.stringify(canvasData) });

    // Act
    const result = await CanvasParser.load('/test.canvas');

    // Assert
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
    expect(result.nodes[0].id).toBe('n1');
  });
});
```

#### TC-CP-002: Load empty canvas file
```typescript
it('should return empty arrays for canvas with no nodes/edges', async () => {
  // Arrange
  vol.fromJSON({ '/empty.canvas': '{}' });

  // Act
  const result = await CanvasParser.load('/empty.canvas');

  // Assert
  expect(result.nodes).toEqual([]);
  expect(result.edges).toEqual([]);
});
```

#### TC-CP-003: File not found error
```typescript
it('should throw error when file does not exist', async () => {
  // Act & Assert
  await expect(CanvasParser.load('/nonexistent.canvas'))
    .rejects.toThrow(/ENOENT/);
});
```

#### TC-CP-004: Invalid JSON error
```typescript
it('should throw error for invalid JSON content', async () => {
  // Arrange
  vol.fromJSON({ '/invalid.canvas': 'not valid json {' });

  // Act & Assert
  await expect(CanvasParser.load('/invalid.canvas'))
    .rejects.toThrow(SyntaxError);
});
```

#### TC-CP-005: Load canvas with all node types
```typescript
it('should correctly parse all node types (text, file, link, group)', async () => {
  // Arrange
  const canvasData = {
    nodes: [
      { id: 'text1', type: 'text', x: 0, y: 0, width: 100, height: 50, text: 'Hello' },
      { id: 'file1', type: 'file', x: 100, y: 0, width: 100, height: 50, file: 'note.md' },
      { id: 'link1', type: 'link', x: 200, y: 0, width: 100, height: 50, url: 'https://example.com' },
      { id: 'group1', type: 'group', x: 0, y: 100, width: 300, height: 200, label: 'Group' },
    ],
    edges: [],
  };
  vol.fromJSON({ '/all-types.canvas': JSON.stringify(canvasData) });

  // Act
  const result = await CanvasParser.load('/all-types.canvas');

  // Assert
  expect(result.nodes).toHaveLength(4);
  expect(result.nodes.map(n => n.type)).toEqual(['text', 'file', 'link', 'group']);
});
```

### 1.2 `save()` Method

#### TC-CP-006: Save canvas to existing directory
```typescript
describe('save', () => {
  it('should save canvas to file with proper formatting', async () => {
    // Arrange
    const nodes = [{ id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Test' }];
    const edges = [{ id: 'e1', fromNode: 'n1', toNode: 'n2' }];
    vol.fromJSON({ '/canvas/': null });

    // Act
    await CanvasParser.save('/canvas/test.canvas', nodes, edges);

    // Assert
    const content = vol.readFileSync('/canvas/test.canvas', 'utf-8');
    const parsed = JSON.parse(content as string);
    expect(parsed.nodes).toHaveLength(1);
    expect(parsed.edges).toHaveLength(1);
  });
});
```

#### TC-CP-007: Create directory if not exists
```typescript
it('should create parent directories if they do not exist', async () => {
  // Arrange
  const nodes = [{ id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Test' }];

  // Act
  await CanvasParser.save('/deep/nested/path/test.canvas', nodes, []);

  // Assert
  expect(vol.existsSync('/deep/nested/path/test.canvas')).toBe(true);
});
```

#### TC-CP-008: Strip metadata fields starting with underscore
```typescript
it('should remove metadata fields starting with underscore', async () => {
  // Arrange
  const nodes = [{
    id: 'n1',
    type: 'text' as const,
    x: 0, y: 0, width: 100, height: 50,
    text: 'Test',
    _metadata: { zone: 'SOUTH', relation: 'answers' }, // Should be stripped
  }];

  // Act
  await CanvasParser.save('/test.canvas', nodes as any, []);

  // Assert
  const content = vol.readFileSync('/test.canvas', 'utf-8');
  const parsed = JSON.parse(content as string);
  expect(parsed.nodes[0]._metadata).toBeUndefined();
});
```

#### TC-CP-009: Preserve JSON formatting (2-space indent)
```typescript
it('should use 2-space indentation for JSON output', async () => {
  // Arrange
  const nodes = [{ id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Test' }];

  // Act
  await CanvasParser.save('/test.canvas', nodes, []);

  // Assert
  const content = vol.readFileSync('/test.canvas', 'utf-8') as string;
  expect(content).toContain('  "nodes"'); // 2-space indent
});
```

---

## 2. ID Generation Tests

### 2.1 `generateId()` Method

#### TC-CP-010: Generate ID without prefix
```typescript
describe('generateId', () => {
  it('should generate 8-character ID without prefix', () => {
    // Act
    const id = CanvasParser.generateId();

    // Assert
    expect(id).toBe('12345678'); // First 8 chars of mocked UUID
  });
});
```

#### TC-CP-011: Generate ID with prefix
```typescript
it('should generate ID with prefix', () => {
  // Act
  const id = CanvasParser.generateId('text');

  // Assert
  expect(id).toBe('text-12345678');
});
```

#### TC-CP-012: Different prefixes produce unique IDs
```typescript
it('should include prefix in generated ID format', () => {
  // Act
  const textId = CanvasParser.generateId('text');
  const fileId = CanvasParser.generateId('file');
  const linkId = CanvasParser.generateId('link');

  // Assert
  expect(textId).toMatch(/^text-/);
  expect(fileId).toMatch(/^file-/);
  expect(linkId).toMatch(/^link-/);
});
```

---

## 3. Node Creation Tests

### 3.1 `createTextNode()` Method

#### TC-CP-013: Create text node with required fields
```typescript
describe('createTextNode', () => {
  it('should create text node with required fields', () => {
    // Act
    const node = CanvasParser.createTextNode({
      x: 100, y: 200, text: 'Hello World',
    });

    // Assert
    expect(node.type).toBe('text');
    expect(node.x).toBe(100);
    expect(node.y).toBe(200);
    expect(node.text).toBe('Hello World');
    expect(node.width).toBe(400); // Default
    expect(node.height).toBe(150); // Default
  });
});
```

#### TC-CP-014: Create text node with custom dimensions
```typescript
it('should accept custom width and height', () => {
  // Act
  const node = CanvasParser.createTextNode({
    x: 0, y: 0, text: 'Test',
    width: 500, height: 300,
  });

  // Assert
  expect(node.width).toBe(500);
  expect(node.height).toBe(300);
});
```

#### TC-CP-015: Create text node with color
```typescript
it('should include color when provided', () => {
  // Act
  const node = CanvasParser.createTextNode({
    x: 0, y: 0, text: 'Test', color: '4',
  });

  // Assert
  expect(node.color).toBe('4');
});
```

#### TC-CP-016: Round coordinates to integers
```typescript
it('should round floating point coordinates to integers', () => {
  // Act
  const node = CanvasParser.createTextNode({
    x: 100.7, y: 200.3, text: 'Test',
  });

  // Assert
  expect(node.x).toBe(101);
  expect(node.y).toBe(200);
});
```

#### TC-CP-017: Use provided ID if given
```typescript
it('should use provided ID instead of generating one', () => {
  // Act
  const node = CanvasParser.createTextNode({
    id: 'custom-id', x: 0, y: 0, text: 'Test',
  });

  // Assert
  expect(node.id).toBe('custom-id');
});
```

### 3.2 `createFileNode()` Method

#### TC-CP-018: Create file node with vault path
```typescript
describe('createFileNode', () => {
  it('should create file node referencing vault file', () => {
    // Act
    const node = CanvasParser.createFileNode({
      x: 0, y: 0, file: '01_Inbox/note.md',
    });

    // Assert
    expect(node.type).toBe('file');
    expect(node.file).toBe('01_Inbox/note.md');
    expect(node.width).toBe(300); // Default
    expect(node.height).toBe(100); // Default
  });
});
```

#### TC-CP-019: Create file node with subpath
```typescript
it('should include subpath for heading links', () => {
  // Act
  const node = CanvasParser.createFileNode({
    x: 0, y: 0, file: 'note.md', subpath: '#Section1',
  });

  // Assert
  expect(node.subpath).toBe('#Section1');
});
```

### 3.3 `createLinkNode()` Method

#### TC-CP-020: Create link node with URL
```typescript
describe('createLinkNode', () => {
  it('should create link node with external URL', () => {
    // Act
    const node = CanvasParser.createLinkNode({
      x: 0, y: 0, url: 'https://example.com',
    });

    // Assert
    expect(node.type).toBe('link');
    expect(node.url).toBe('https://example.com');
    expect(node.width).toBe(300); // Default
    expect(node.height).toBe(80); // Default
  });
});
```

### 3.4 `createGroupNode()` Method

#### TC-CP-021: Create group node with label
```typescript
describe('createGroupNode', () => {
  it('should create group node with label', () => {
    // Act
    const node = CanvasParser.createGroupNode({
      x: 0, y: 0, width: 500, height: 400, label: 'My Group',
    });

    // Assert
    expect(node.type).toBe('group');
    expect(node.label).toBe('My Group');
    expect(node.width).toBe(500);
    expect(node.height).toBe(400);
  });
});
```

#### TC-CP-022: Group node without label
```typescript
it('should create group node without label', () => {
  // Act
  const node = CanvasParser.createGroupNode({
    x: 0, y: 0, width: 500, height: 400,
  });

  // Assert
  expect(node.label).toBeUndefined();
});
```

---

## 4. Edge Creation Tests

### 4.1 `createEdge()` Method

#### TC-CP-023: Create edge with minimal options
```typescript
describe('createEdge', () => {
  it('should create edge with from and to nodes', () => {
    // Act
    const edge = CanvasParser.createEdge('node1', 'node2');

    // Assert
    expect(edge.fromNode).toBe('node1');
    expect(edge.toNode).toBe('node2');
    expect(edge.id).toBeDefined();
  });
});
```

#### TC-CP-024: Create edge with side specifications
```typescript
it('should include fromSide and toSide when provided', () => {
  // Act
  const edge = CanvasParser.createEdge('n1', 'n2', {
    fromSide: 'bottom', toSide: 'top',
  });

  // Assert
  expect(edge.fromSide).toBe('bottom');
  expect(edge.toSide).toBe('top');
});
```

#### TC-CP-025: Create edge with end types (arrows)
```typescript
it('should include end types for arrows', () => {
  // Act
  const edge = CanvasParser.createEdge('n1', 'n2', {
    fromEnd: 'none', toEnd: 'arrow',
  });

  // Assert
  expect(edge.fromEnd).toBe('none');
  expect(edge.toEnd).toBe('arrow');
});
```

#### TC-CP-026: Create edge with label
```typescript
it('should include label when provided', () => {
  // Act
  const edge = CanvasParser.createEdge('n1', 'n2', {
    label: 'relates to',
  });

  // Assert
  expect(edge.label).toBe('relates to');
});
```

#### TC-CP-027: Create edge with color
```typescript
it('should include color when provided', () => {
  // Act
  const edge = CanvasParser.createEdge('n1', 'n2', { color: '4' });

  // Assert
  expect(edge.color).toBe('4');
});
```

---

## 5. Query Method Tests

### 5.1 `findNodeById()` Method

#### TC-CP-028: Find existing node by ID
```typescript
describe('findNodeById', () => {
  it('should return node when ID exists', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'A' },
      { id: 'n2', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'B' },
    ];

    // Act
    const result = CanvasParser.findNodeById(nodes, 'n2');

    // Assert
    expect(result?.id).toBe('n2');
  });
});
```

#### TC-CP-029: Return undefined for non-existent ID
```typescript
it('should return undefined when ID does not exist', () => {
  // Arrange
  const nodes = [{ id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'A' }];

  // Act
  const result = CanvasParser.findNodeById(nodes, 'nonexistent');

  // Assert
  expect(result).toBeUndefined();
});
```

### 5.2 `findNodesByType()` Method

#### TC-CP-030: Find all nodes of specific type
```typescript
describe('findNodesByType', () => {
  it('should return all nodes of specified type', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'A' },
      { id: 'n2', type: 'file' as const, x: 0, y: 0, width: 100, height: 50, file: 'a.md' },
      { id: 'n3', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'B' },
    ];

    // Act
    const result = CanvasParser.findNodesByType(nodes, 'text');

    // Assert
    expect(result).toHaveLength(2);
    expect(result.every(n => n.type === 'text')).toBe(true);
  });
});
```

#### TC-CP-031: Return empty array when no nodes match
```typescript
it('should return empty array when no nodes of type exist', () => {
  // Arrange
  const nodes = [{ id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'A' }];

  // Act
  const result = CanvasParser.findNodesByType(nodes, 'link');

  // Assert
  expect(result).toEqual([]);
});
```

### 5.3 `findNodesContainingText()` Method

#### TC-CP-032: Find nodes containing text (case insensitive)
```typescript
describe('findNodesContainingText', () => {
  it('should find nodes containing search text (case insensitive)', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Hello World' },
      { id: 'n2', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Goodbye' },
      { id: 'n3', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'hello again' },
    ];

    // Act
    const result = CanvasParser.findNodesContainingText(nodes, 'hello');

    // Assert
    expect(result).toHaveLength(2);
  });
});
```

#### TC-CP-033: Find nodes containing text (case sensitive)
```typescript
it('should respect case sensitivity when specified', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Hello World' },
    { id: 'n2', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'hello world' },
  ];

  // Act
  const result = CanvasParser.findNodesContainingText(nodes, 'Hello', true);

  // Assert
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('n1');
});
```

### 5.4 `findQuestionNodes()` Method

#### TC-CP-034: Find nodes containing question marks
```typescript
describe('findQuestionNodes', () => {
  it('should find text nodes containing question marks', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'What is this?' },
      { id: 'n2', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'This is an answer.' },
      { id: 'n3', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'Why? How?' },
    ];

    // Act
    const result = CanvasParser.findQuestionNodes(nodes);

    // Assert
    expect(result).toHaveLength(2);
    expect(result.map(n => n.id)).toEqual(['n1', 'n3']);
  });
});
```

### 5.5 `findNodesByColor()` Method

#### TC-CP-035: Find nodes by color code
```typescript
describe('findNodesByColor', () => {
  it('should find all nodes with specified color', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'A', color: '4' as const },
      { id: 'n2', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'B', color: '3' as const },
      { id: 'n3', type: 'file' as const, x: 0, y: 0, width: 100, height: 50, file: 'a.md', color: '4' as const },
    ];

    // Act
    const result = CanvasParser.findNodesByColor(nodes, '4');

    // Assert
    expect(result).toHaveLength(2);
  });
});
```

### 5.6 `getConnectedNodes()` Method

#### TC-CP-036: Get outgoing connections
```typescript
describe('getConnectedNodes', () => {
  it('should return outgoing connected node IDs', () => {
    // Arrange
    const edges = [
      { id: 'e1', fromNode: 'n1', toNode: 'n2' },
      { id: 'e2', fromNode: 'n1', toNode: 'n3' },
      { id: 'e3', fromNode: 'n2', toNode: 'n1' },
    ];

    // Act
    const result = CanvasParser.getConnectedNodes('n1', edges, 'outgoing');

    // Assert
    expect(result).toEqual(['n2', 'n3']);
  });
});
```

#### TC-CP-037: Get incoming connections
```typescript
it('should return incoming connected node IDs', () => {
  // Arrange
  const edges = [
    { id: 'e1', fromNode: 'n1', toNode: 'n2' },
    { id: 'e2', fromNode: 'n3', toNode: 'n2' },
  ];

  // Act
  const result = CanvasParser.getConnectedNodes('n2', edges, 'incoming');

  // Assert
  expect(result).toEqual(['n1', 'n3']);
});
```

#### TC-CP-038: Get bidirectional connections
```typescript
it('should return all connected node IDs for both directions', () => {
  // Arrange
  const edges = [
    { id: 'e1', fromNode: 'n1', toNode: 'n2' },
    { id: 'e2', fromNode: 'n3', toNode: 'n1' },
  ];

  // Act
  const result = CanvasParser.getConnectedNodes('n1', edges, 'both');

  // Assert
  expect(result).toEqual(['n2', 'n3']);
});
```

---

## 6. Utility Method Tests

### 6.1 `getCanvasBounds()` Method

#### TC-CP-039: Calculate bounds for multiple nodes
```typescript
describe('getCanvasBounds', () => {
  it('should calculate bounding box for all nodes', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'A' },
      { id: 'n2', type: 'text' as const, x: 200, y: 100, width: 150, height: 75, text: 'B' },
    ];

    // Act
    const result = CanvasParser.getCanvasBounds(nodes);

    // Assert
    expect(result.minX).toBe(0);
    expect(result.minY).toBe(0);
    expect(result.maxX).toBe(350); // 200 + 150
    expect(result.maxY).toBe(175); // 100 + 75
    expect(result.width).toBe(350);
    expect(result.height).toBe(175);
  });
});
```

#### TC-CP-040: Return zero bounds for empty node array
```typescript
it('should return zero bounds for empty array', () => {
  // Act
  const result = CanvasParser.getCanvasBounds([]);

  // Assert
  expect(result).toEqual({
    minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0,
  });
});
```

#### TC-CP-041: Handle negative coordinates
```typescript
it('should correctly handle negative coordinates', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: -100, y: -50, width: 100, height: 50, text: 'A' },
    { id: 'n2', type: 'text' as const, x: 50, y: 25, width: 100, height: 50, text: 'B' },
  ];

  // Act
  const result = CanvasParser.getCanvasBounds(nodes);

  // Assert
  expect(result.minX).toBe(-100);
  expect(result.minY).toBe(-50);
  expect(result.maxX).toBe(150);
  expect(result.maxY).toBe(75);
});
```

### 6.2 `extractKeywords()` Method

#### TC-CP-042: Extract headings as keywords
```typescript
describe('extractKeywords', () => {
  it('should extract markdown headings as keywords', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: '# Main Topic\n## Subtopic' },
    ];

    // Act
    const result = CanvasParser.extractKeywords(nodes);

    // Assert
    expect(result).toContain('Main Topic');
    expect(result).toContain('Subtopic');
  });
});
```

#### TC-CP-043: Extract bold text as keywords
```typescript
it('should extract **bold** text as keywords', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'This is **important** and **critical**' },
  ];

  // Act
  const result = CanvasParser.extractKeywords(nodes);

  // Assert
  expect(result).toContain('important');
  expect(result).toContain('critical');
});
```

#### TC-CP-044: Extract wiki links as keywords
```typescript
it('should extract [[wiki links]] as keywords', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: 'See [[Note A]] and [[Note B|display]]' },
  ];

  // Act
  const result = CanvasParser.extractKeywords(nodes);

  // Assert
  expect(result).toContain('Note A');
  expect(result).toContain('Note B');
});
```

#### TC-CP-045: Return unique keywords only
```typescript
it('should return unique keywords without duplicates', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50, text: '# Topic\n**Topic**' },
  ];

  // Act
  const result = CanvasParser.extractKeywords(nodes);

  // Assert
  const topicCount = result.filter(k => k === 'Topic').length;
  expect(topicCount).toBe(1);
});
```

#### TC-CP-046: Skip non-text nodes
```typescript
it('should skip non-text nodes', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'file' as const, x: 0, y: 0, width: 100, height: 50, file: 'important.md' },
    { id: 'n2', type: 'link' as const, x: 0, y: 0, width: 100, height: 50, url: 'https://important.com' },
  ];

  // Act
  const result = CanvasParser.extractKeywords(nodes);

  // Assert
  expect(result).toEqual([]);
});
```

### 6.3 `extractUrls()` Method

#### TC-CP-047: Extract URLs from link nodes
```typescript
describe('extractUrls', () => {
  it('should extract URLs from link nodes', () => {
    // Arrange
    const nodes = [
      { id: 'n1', type: 'link' as const, x: 0, y: 0, width: 100, height: 50, url: 'https://example.com' },
      { id: 'n2', type: 'link' as const, x: 0, y: 0, width: 100, height: 50, url: 'https://test.org' },
    ];

    // Act
    const result = CanvasParser.extractUrls(nodes);

    // Assert
    expect(result).toEqual(['https://example.com', 'https://test.org']);
  });
});
```

#### TC-CP-048: Extract URLs from markdown links in text
```typescript
it('should extract URLs from markdown links in text nodes', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50,
      text: 'Check [Google](https://google.com) and [GitHub](https://github.com)' },
  ];

  // Act
  const result = CanvasParser.extractUrls(nodes);

  // Assert
  expect(result).toContain('https://google.com');
  expect(result).toContain('https://github.com');
});
```

#### TC-CP-049: Ignore non-http URLs in markdown
```typescript
it('should ignore non-http URLs in markdown links', () => {
  // Arrange
  const nodes = [
    { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 100, height: 50,
      text: 'See [local](./file.md) and [web](https://example.com)' },
  ];

  // Act
  const result = CanvasParser.extractUrls(nodes);

  // Assert
  expect(result).toEqual(['https://example.com']);
});
```

---

## 7. Edge Cases & Error Handling

#### TC-CP-050: Handle very large canvas files
```typescript
describe('Edge Cases', () => {
  it('should handle canvas with 1000+ nodes', async () => {
    // Arrange
    const nodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `n${i}`,
      type: 'text' as const,
      x: i * 100,
      y: 0,
      width: 100,
      height: 50,
      text: `Node ${i}`,
    }));
    vol.fromJSON({ '/large.canvas': JSON.stringify({ nodes, edges: [] }) });

    // Act
    const result = await CanvasParser.load('/large.canvas');

    // Assert
    expect(result.nodes).toHaveLength(1000);
  });
});
```

#### TC-CP-051: Handle unicode content
```typescript
it('should correctly handle unicode characters in text', async () => {
  // Arrange
  const nodes = [{
    id: 'n1', type: 'text' as const,
    x: 0, y: 0, width: 100, height: 50,
    text: '한글 테스트 🚀 日本語',
  }];

  // Act
  await CanvasParser.save('/unicode.canvas', nodes, []);
  const loaded = await CanvasParser.load('/unicode.canvas');

  // Assert
  expect((loaded.nodes[0] as any).text).toBe('한글 테스트 🚀 日本語');
});
```

#### TC-CP-052: Handle special characters in file paths
```typescript
it('should handle special characters in file paths', async () => {
  // Arrange
  const nodes = [{
    id: 'n1', type: 'file' as const,
    x: 0, y: 0, width: 100, height: 50,
    file: "Notes/What's New?.md",
  }];

  // Act & Assert - should not throw
  await expect(CanvasParser.save('/test.canvas', nodes, [])).resolves.not.toThrow();
});
```

---

## 8. Performance Tests

#### TC-CP-053: Load performance benchmark
```typescript
describe('Performance', () => {
  it('should load 1MB canvas file within 100ms', async () => {
    // Arrange
    const largeContent = JSON.stringify({
      nodes: Array.from({ length: 5000 }, (_, i) => ({
        id: `n${i}`, type: 'text', x: i, y: i, width: 100, height: 50,
        text: 'A'.repeat(100),
      })),
      edges: [],
    });
    vol.fromJSON({ '/perf.canvas': largeContent });

    // Act
    const start = performance.now();
    await CanvasParser.load('/perf.canvas');
    const duration = performance.now() - start;

    // Assert
    expect(duration).toBeLessThan(100);
  });
});
```

---

## Test Data Fixtures

### fixtures/canvases/empty.canvas
```json
{
  "nodes": [],
  "edges": []
}
```

### fixtures/canvases/simple-topic.canvas
```json
{
  "nodes": [
    {
      "id": "topic-1",
      "type": "text",
      "x": 0,
      "y": 0,
      "width": 450,
      "height": 120,
      "text": "# Test Topic",
      "color": "6"
    }
  ],
  "edges": []
}
```

### fixtures/canvases/complex-layout.canvas
```json
{
  "nodes": [
    {"id": "n1", "type": "text", "x": 0, "y": 0, "width": 400, "height": 100, "text": "# Topic", "color": "6"},
    {"id": "n2", "type": "text", "x": 0, "y": 200, "width": 400, "height": 150, "text": "Answer", "color": "3"},
    {"id": "n3", "type": "file", "x": -500, "y": 0, "width": 350, "height": 150, "file": "note.md", "color": "2"},
    {"id": "n4", "type": "link", "x": 500, "y": 0, "width": 350, "height": 150, "url": "https://example.com", "color": "5"}
  ],
  "edges": [
    {"id": "e1", "fromNode": "n1", "toNode": "n2", "fromSide": "bottom", "toSide": "top"},
    {"id": "e2", "fromNode": "n1", "toNode": "n3", "fromSide": "left", "toSide": "right"},
    {"id": "e3", "fromNode": "n1", "toNode": "n4", "fromSide": "right", "toSide": "left"}
  ]
}
```
