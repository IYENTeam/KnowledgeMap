# VaultIndexer Unit Test Specification

## Module Under Test
- **File:** `src/engine/vault-indexer.ts`
- **Class:** `VaultIndexer`
- **Dependencies:** `fs/promises`

---

## Test Setup

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VaultIndexer } from '../engine/vault-indexer';
import { vol } from 'memfs';

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs');
  return memfs.fs.promises;
});

const createNote = (title: string, content: string, tags: string[] = []) => {
  const tagFrontmatter = tags.length > 0 ? `tags: [${tags.join(', ')}]\n` : '';
  return `---\n${tagFrontmatter}---\n\n# ${title}\n\n${content}`;
};
```

---

## 1. Constructor & Initialization Tests

#### TC-VI-001: Initialize with default vault path
```typescript
describe('constructor', () => {
  it('should use current directory as default vault path', () => {
    const indexer = new VaultIndexer();
    // Internal vaultPath should be '.'
  });
});
```

#### TC-VI-002: Initialize with custom vault path
```typescript
it('should accept custom vault path', () => {
  const indexer = new VaultIndexer('/custom/vault/path');
  // Internal vaultPath should be '/custom/vault/path'
});
```

---

## 2. `buildIndex()` Tests

### 2.1 Basic Indexing

#### TC-VI-003: Build index for empty vault
```typescript
describe('buildIndex', () => {
  it('should build empty index for vault with no markdown files', async () => {
    vol.fromJSON({
      '/vault/': null,
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(Object.keys(result.notes)).toHaveLength(0);
  });
});
```

#### TC-VI-004: Index single markdown file
```typescript
it('should index single markdown file', async () => {
  vol.fromJSON({
    '/vault/note.md': createNote('Test Note', 'Content here'),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(Object.keys(result.notes)).toHaveLength(1);
  expect(result.notes['note.md']).toBeDefined();
  expect(result.notes['note.md'].title).toBe('Test Note');
});
```

#### TC-VI-005: Index multiple markdown files
```typescript
it('should index multiple markdown files', async () => {
  vol.fromJSON({
    '/vault/note1.md': createNote('Note 1', 'Content 1'),
    '/vault/note2.md': createNote('Note 2', 'Content 2'),
    '/vault/note3.md': createNote('Note 3', 'Content 3'),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(Object.keys(result.notes)).toHaveLength(3);
});
```

#### TC-VI-006: Index nested directory structure
```typescript
it('should index files in nested directories', async () => {
  vol.fromJSON({
    '/vault/root.md': createNote('Root', 'Root content'),
    '/vault/folder/nested.md': createNote('Nested', 'Nested content'),
    '/vault/folder/deep/deeper.md': createNote('Deeper', 'Deep content'),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['root.md']).toBeDefined();
  expect(result.notes['folder/nested.md']).toBeDefined();
  expect(result.notes['folder/deep/deeper.md']).toBeDefined();
});
```

### 2.2 Exclusion Patterns

#### TC-VI-007: Exclude hidden folders
```typescript
it('should exclude hidden folders starting with dot', async () => {
  vol.fromJSON({
    '/vault/visible.md': createNote('Visible', 'Content'),
    '/vault/.hidden/secret.md': createNote('Secret', 'Hidden content'),
    '/vault/.obsidian/config.md': createNote('Config', 'Config content'),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(Object.keys(result.notes)).toHaveLength(1);
  expect(result.notes['visible.md']).toBeDefined();
});
```

#### TC-VI-008: Exclude node_modules
```typescript
it('should exclude node_modules directory', async () => {
  vol.fromJSON({
    '/vault/app.md': createNote('App', 'Content'),
    '/vault/node_modules/package/readme.md': createNote('Package', 'Content'),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(Object.keys(result.notes)).toHaveLength(1);
});
```

#### TC-VI-009: Exclude canvas files
```typescript
it('should exclude .canvas files', async () => {
  vol.fromJSON({
    '/vault/note.md': createNote('Note', 'Content'),
    '/vault/canvas.canvas': '{"nodes":[],"edges":[]}',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(Object.keys(result.notes)).toHaveLength(1);
  expect(result.notes['canvas.canvas']).toBeUndefined();
});
```

### 2.3 Incremental Indexing

#### TC-VI-010: Skip unchanged files (incremental update)
```typescript
it('should skip files that have not changed', async () => {
  vol.fromJSON({
    '/vault/note.md': createNote('Note', 'Content'),
    '/vault/.vault_index.json': JSON.stringify({
      version: '1.0',
      indexedAt: new Date().toISOString(),
      vaultPath: '/vault',
      notes: {
        'note.md': {
          path: 'note.md',
          title: 'Note',
          tags: [],
          links: [],
          backlinks: [],
          keywords: ['note', 'content'],
          modifiedAt: Date.now() + 10000, // Future time to ensure skip
          size: 100,
        },
      },
      tagIndex: {},
      keywordIndex: {},
    }),
  });
  const indexer = new VaultIndexer('/vault');

  // Should use cached index without re-processing
  const result = await indexer.buildIndex(false);

  expect(result.notes['note.md'].title).toBe('Note');
});
```

#### TC-VI-011: Force full rebuild
```typescript
it('should rebuild entire index when force=true', async () => {
  vol.fromJSON({
    '/vault/note.md': createNote('New Title', 'New content'),
    '/vault/.vault_index.json': JSON.stringify({
      version: '1.0',
      indexedAt: new Date().toISOString(),
      vaultPath: '/vault',
      notes: {
        'note.md': {
          path: 'note.md',
          title: 'Old Title', // This should be updated
          tags: [],
          links: [],
          backlinks: [],
          keywords: [],
          modifiedAt: Date.now() + 10000,
          size: 100,
        },
      },
      tagIndex: {},
      keywordIndex: {},
    }),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex(true);

  expect(result.notes['note.md'].title).toBe('New Title');
});
```

---

## 3. Content Extraction Tests

### 3.1 Title Extraction

#### TC-VI-012: Extract title from H1 heading
```typescript
describe('Title Extraction', () => {
  it('should extract title from # heading', async () => {
    vol.fromJSON({
      '/vault/note.md': '# My Title\n\nContent here',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['note.md'].title).toBe('My Title');
  });
});
```

#### TC-VI-013: Use filename when no heading
```typescript
it('should use filename when no # heading exists', async () => {
  vol.fromJSON({
    '/vault/my-note.md': 'Just content without heading',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['my-note.md'].title).toBe('my-note');
});
```

### 3.2 Tag Extraction

#### TC-VI-014: Extract tags from frontmatter
```typescript
describe('Tag Extraction', () => {
  it('should extract tags from YAML frontmatter', async () => {
    vol.fromJSON({
      '/vault/note.md': '---\ntags: [tag1, tag2, tag3]\n---\n\n# Note',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['note.md'].tags).toContain('tag1');
    expect(result.notes['note.md'].tags).toContain('tag2');
    expect(result.notes['note.md'].tags).toContain('tag3');
  });
});
```

#### TC-VI-015: Extract inline hashtags
```typescript
it('should extract inline #tags from content', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\nThis has #inline and #tags here',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].tags).toContain('inline');
  expect(result.notes['note.md'].tags).toContain('tags');
});
```

#### TC-VI-016: Extract Korean hashtags
```typescript
it('should extract Korean hashtags', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\nThis has #한글태그 and #영어mixed태그',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].tags).toContain('한글태그');
  expect(result.notes['note.md'].tags).toContain('영어mixed태그');
});
```

#### TC-VI-017: Handle tags with slashes (nested tags)
```typescript
it('should handle nested tags with slashes', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n#project/work #category/subcategory',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].tags).toContain('project/work');
  expect(result.notes['note.md'].tags).toContain('category/subcategory');
});
```

### 3.3 Link Extraction

#### TC-VI-018: Extract wiki links
```typescript
describe('Link Extraction', () => {
  it('should extract [[wiki links]]', async () => {
    vol.fromJSON({
      '/vault/note.md': '# Note\n\nSee [[Other Note]] and [[Another]]',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['note.md'].links).toContain('Other Note');
    expect(result.notes['note.md'].links).toContain('Another');
  });
});
```

#### TC-VI-019: Extract wiki links with display text
```typescript
it('should extract link target from [[link|display]]', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n[[Actual Target|Display Text]]',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].links).toContain('Actual Target');
  expect(result.notes['note.md'].links).not.toContain('Display Text');
});
```

#### TC-VI-020: Deduplicate links
```typescript
it('should deduplicate repeated links', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n[[Same Link]] and again [[Same Link]]',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  const linkCount = result.notes['note.md'].links.filter(l => l === 'Same Link').length;
  expect(linkCount).toBe(1);
});
```

### 3.4 Keyword Extraction

#### TC-VI-021: Extract keywords from headings
```typescript
describe('Keyword Extraction', () => {
  it('should extract keywords from ## headings', async () => {
    vol.fromJSON({
      '/vault/note.md': '# Main\n\n## Important Section\n\n### Another Topic',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['note.md'].keywords).toContain('important');
    expect(result.notes['note.md'].keywords).toContain('section');
    expect(result.notes['note.md'].keywords).toContain('another');
    expect(result.notes['note.md'].keywords).toContain('topic');
  });
});
```

#### TC-VI-022: Extract keywords from bold text
```typescript
it('should extract keywords from **bold** text', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\nThis is **important keyword** here',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].keywords).toContain('important');
  expect(result.notes['note.md'].keywords).toContain('keyword');
});
```

#### TC-VI-023: Extract keywords from code snippets
```typescript
it('should extract short code as keywords', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\nUse `functionName` and `variable`',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].keywords).toContain('functionname');
  expect(result.notes['note.md'].keywords).toContain('variable');
});
```

#### TC-VI-024: Skip very long code snippets
```typescript
it('should skip code snippets longer than 30 characters', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n`this is a very long code snippet that exceeds thirty characters`',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].keywords).not.toContain('this is a very long code snippet');
});
```

#### TC-VI-025: Skip code with spaces
```typescript
it('should skip code snippets containing spaces', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n`multi word code`',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].keywords).not.toContain('multi word code');
});
```

### 3.5 Created Date Extraction

#### TC-VI-026: Extract created date from frontmatter
```typescript
describe('Created Date', () => {
  it('should extract Created date from content', async () => {
    vol.fromJSON({
      '/vault/note.md': '# Note\n\nCreated: 2024-01-15\n\nContent',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['note.md'].createdAt).toBe('2024-01-15');
  });
});
```

#### TC-VI-027: Return undefined when no created date
```typescript
it('should return undefined when no Created date found', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\nJust content',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['note.md'].createdAt).toBeUndefined();
});
```

---

## 4. Backlink Calculation Tests

#### TC-VI-028: Calculate backlinks
```typescript
describe('Backlinks', () => {
  it('should calculate backlinks between notes', async () => {
    vol.fromJSON({
      '/vault/note-a.md': '# Note A\n\n[[Note B]]',
      '/vault/note-b.md': '# Note B\n\nContent',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['note-b.md'].backlinks).toContain('note-a.md');
  });
});
```

#### TC-VI-029: Multiple backlinks
```typescript
it('should track multiple backlinks to same note', async () => {
  vol.fromJSON({
    '/vault/note-a.md': '# Note A\n\n[[Target]]',
    '/vault/note-b.md': '# Note B\n\n[[Target]]',
    '/vault/note-c.md': '# Note C\n\n[[Target]]',
    '/vault/target.md': '# Target\n\nContent',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['target.md'].backlinks).toHaveLength(3);
});
```

#### TC-VI-030: Case insensitive backlink matching
```typescript
it('should match backlinks case-insensitively', async () => {
  vol.fromJSON({
    '/vault/linker.md': '# Linker\n\n[[target]]', // lowercase
    '/vault/Target.md': '# Target\n\nContent',    // capitalized filename
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['Target.md'].backlinks).toContain('linker.md');
});
```

---

## 5. Index Building Tests

#### TC-VI-031: Build tag index
```typescript
describe('Index Building', () => {
  it('should build tag index', async () => {
    vol.fromJSON({
      '/vault/note1.md': '# Note 1\n\n#shared-tag #unique1',
      '/vault/note2.md': '# Note 2\n\n#shared-tag #unique2',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.tagIndex['shared-tag']).toHaveLength(2);
    expect(result.tagIndex['unique1']).toHaveLength(1);
  });
});
```

#### TC-VI-032: Build keyword index
```typescript
it('should build keyword index', async () => {
  vol.fromJSON({
    '/vault/note1.md': '# Note\n\n**important** concept',
    '/vault/note2.md': '# Note\n\n**important** other',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.keywordIndex['important']).toHaveLength(2);
});
```

---

## 6. Search Tests

### 6.1 `searchByKeyword()`

#### TC-VI-033: Search by keyword
```typescript
describe('searchByKeyword', () => {
  it('should find notes containing keyword', async () => {
    vol.fromJSON({
      '/vault/note1.md': '# Machine Learning\n\nContent about **algorithms**',
      '/vault/note2.md': '# Cooking\n\nRecipes here',
    });
    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const results = await indexer.searchByKeyword('machine');

    expect(results).toHaveLength(1);
    expect(results[0].note.title).toBe('Machine Learning');
  });
});
```

#### TC-VI-034: Keyword search is case insensitive
```typescript
it('should search case-insensitively', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n**IMPORTANT** content',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const results = await indexer.searchByKeyword('important');

  expect(results).toHaveLength(1);
});
```

#### TC-VI-035: Search in title gets higher score
```typescript
it('should score title matches higher', async () => {
  vol.fromJSON({
    '/vault/python-guide.md': '# Python Guide\n\nBasic content',
    '/vault/other.md': '# Other\n\n**Python** mentioned in content',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const results = await indexer.searchByKeyword('python');

  expect(results[0].note.title).toBe('Python Guide'); // Title match first
});
```

#### TC-VI-036: Respect limit option
```typescript
it('should respect limit option', async () => {
  vol.fromJSON({
    '/vault/note1.md': '# Note 1\n\n**keyword**',
    '/vault/note2.md': '# Note 2\n\n**keyword**',
    '/vault/note3.md': '# Note 3\n\n**keyword**',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const results = await indexer.searchByKeyword('keyword', { limit: 2 });

  expect(results).toHaveLength(2);
});
```

### 6.2 `searchByTag()`

#### TC-VI-037: Search by tag
```typescript
describe('searchByTag', () => {
  it('should find notes with specific tag', async () => {
    vol.fromJSON({
      '/vault/note1.md': '# Note 1\n\n#project',
      '/vault/note2.md': '# Note 2\n\n#other',
    });
    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const results = await indexer.searchByTag('project');

    expect(results).toHaveLength(1);
    expect(results[0].note.path).toBe('note1.md');
  });
});
```

#### TC-VI-038: Search with # prefix
```typescript
it('should handle tag with # prefix', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note\n\n#mytag',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const results = await indexer.searchByTag('#mytag');

  expect(results).toHaveLength(1);
});
```

### 6.3 `findRelatedNotes()`

#### TC-VI-039: Find related notes by multiple keywords
```typescript
describe('findRelatedNotes', () => {
  it('should find notes matching multiple keywords', async () => {
    vol.fromJSON({
      '/vault/note1.md': '# Machine Learning\n\n**algorithms** and **data**',
      '/vault/note2.md': '# Data Science\n\n**data** analysis',
      '/vault/note3.md': '# Cooking\n\nUnrelated content',
    });
    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const results = await indexer.findRelatedNotes(['machine', 'data']);

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].matchedKeywords.length).toBeGreaterThan(0);
  });
});
```

#### TC-VI-040: Score by keyword match count
```typescript
it('should score higher for more keyword matches', async () => {
  vol.fromJSON({
    '/vault/best-match.md': '# Best\n\n**alpha** **beta** **gamma**',
    '/vault/partial.md': '# Partial\n\n**alpha** only',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const results = await indexer.findRelatedNotes(['alpha', 'beta', 'gamma']);

  expect(results[0].note.path).toBe('best-match.md');
});
```

---

## 7. `getNoteMetadata()` Tests

#### TC-VI-041: Get metadata for existing note
```typescript
describe('getNoteMetadata', () => {
  it('should return metadata for existing note', async () => {
    vol.fromJSON({
      '/vault/note.md': '---\ntags: [tag1]\n---\n\n# My Note\n\n[[Other]]\n\nContent',
    });
    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const result = await indexer.getNoteMetadata('note.md');

    expect(result).not.toBeNull();
    expect(result!.title).toBe('My Note');
    expect(result!.tags).toContain('tag1');
    expect(result!.links).toContain('Other');
  });
});
```

#### TC-VI-042: Return null for non-existent note
```typescript
it('should return null for non-existent note', async () => {
  vol.fromJSON({
    '/vault/note.md': '# Note',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const result = await indexer.getNoteMetadata('nonexistent.md');

  expect(result).toBeNull();
});
```

---

## 8. `getStatistics()` Tests

#### TC-VI-043: Get vault statistics
```typescript
describe('getStatistics', () => {
  it('should return accurate vault statistics', async () => {
    vol.fromJSON({
      '/vault/note1.md': '# Note 1\n\n#tag1 #tag2',
      '/vault/note2.md': '# Note 2\n\n#tag1 #tag3',
      '/vault/note3.md': '# Note 3\n\n#tag4',
    });
    const indexer = new VaultIndexer('/vault');
    await indexer.buildIndex();

    const stats = await indexer.getStatistics();

    expect(stats.totalNotes).toBe(3);
    expect(stats.totalTags).toBe(4); // tag1, tag2, tag3, tag4
  });
});
```

#### TC-VI-044: Get top tags
```typescript
it('should return top tags sorted by count', async () => {
  vol.fromJSON({
    '/vault/note1.md': '# Note 1\n\n#popular #common',
    '/vault/note2.md': '# Note 2\n\n#popular #common',
    '/vault/note3.md': '# Note 3\n\n#popular',
    '/vault/note4.md': '# Note 4\n\n#rare',
  });
  const indexer = new VaultIndexer('/vault');
  await indexer.buildIndex();

  const stats = await indexer.getStatistics();

  expect(stats.topTags[0][0]).toBe('popular');
  expect(stats.topTags[0][1]).toBe(3);
});
```

---

## 9. Edge Cases

#### TC-VI-045: Handle empty markdown files
```typescript
describe('Edge Cases', () => {
  it('should handle empty markdown files', async () => {
    vol.fromJSON({
      '/vault/empty.md': '',
    });
    const indexer = new VaultIndexer('/vault');

    const result = await indexer.buildIndex();

    expect(result.notes['empty.md']).toBeDefined();
    expect(result.notes['empty.md'].title).toBe('empty');
  });
});
```

#### TC-VI-046: Handle unicode filenames
```typescript
it('should handle unicode filenames', async () => {
  vol.fromJSON({
    '/vault/한글노트.md': '# 한글 제목\n\n내용',
    '/vault/日本語ノート.md': '# 日本語タイトル\n\n内容',
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['한글노트.md']).toBeDefined();
  expect(result.notes['한글노트.md'].title).toBe('한글 제목');
});
```

#### TC-VI-047: Handle malformed frontmatter
```typescript
it('should handle malformed YAML frontmatter gracefully', async () => {
  vol.fromJSON({
    '/vault/broken.md': '---\nbroken: [unclosed\n---\n\n# Title',
  });
  const indexer = new VaultIndexer('/vault');

  // Should not throw
  const result = await indexer.buildIndex();

  expect(result.notes['broken.md']).toBeDefined();
});
```

#### TC-VI-048: Handle large files
```typescript
it('should handle large markdown files', async () => {
  const largeContent = '# Title\n\n' + 'Lorem ipsum '.repeat(10000);
  vol.fromJSON({
    '/vault/large.md': largeContent,
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.buildIndex();

  expect(result.notes['large.md']).toBeDefined();
});
```

---

## 10. Index Persistence Tests

#### TC-VI-049: Save index to file
```typescript
describe('Index Persistence', () => {
  it('should save index to .vault_index.json', async () => {
    vol.fromJSON({
      '/vault/note.md': '# Note\n\nContent',
    });
    const indexer = new VaultIndexer('/vault');

    await indexer.buildIndex();

    expect(vol.existsSync('/vault/.vault_index.json')).toBe(true);
  });
});
```

#### TC-VI-050: Load existing index
```typescript
it('should load existing index on subsequent operations', async () => {
  const existingIndex = {
    version: '1.0',
    indexedAt: new Date().toISOString(),
    vaultPath: '/vault',
    notes: { 'cached.md': { path: 'cached.md', title: 'Cached', tags: [], links: [], backlinks: [], keywords: [], modifiedAt: Date.now() + 100000, size: 100 } },
    tagIndex: {},
    keywordIndex: {},
  };
  vol.fromJSON({
    '/vault/.vault_index.json': JSON.stringify(existingIndex),
  });
  const indexer = new VaultIndexer('/vault');

  const result = await indexer.searchByKeyword('anything');

  // Should use cached index without rebuilding
  expect(result).toBeDefined();
});
```

---

## 11. Performance Tests

#### TC-VI-051: Index 1000 files within time limit
```typescript
describe('Performance', () => {
  it('should index 1000 files within 5 seconds', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 1000; i++) {
      files[`/vault/note${i}.md`] = `# Note ${i}\n\n#tag${i % 10}\n\nContent ${i}`;
    }
    vol.fromJSON(files);
    const indexer = new VaultIndexer('/vault');

    const start = performance.now();
    await indexer.buildIndex();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5000);
  });
});
```
