# SemanticRouter Unit Test Specification

## Module Under Test
- **File:** `src/engine/semantic-router.ts`
- **Class:** `SemanticRouter` (Static utility class)
- **Dependencies:** Types (`semantic.ts`)

---

## Test Setup

```typescript
import { describe, it, expect } from 'vitest';
import { SemanticRouter } from '../engine/semantic-router';
import { RELATION_TO_ZONE, ZONE_SPECS, RELATION_ALIASES } from '../types';
```

---

## 1. `resolveRelation()` Tests

### 1.1 Direct Relation Matching

#### TC-SR-001: Resolve standard relation 'answers'
```typescript
describe('resolveRelation', () => {
  it('should resolve "answers" to SemanticRelation.answers', () => {
    // Act
    const result = SemanticRouter.resolveRelation('answers');

    // Assert
    expect(result).toBe('answers');
  });
});
```

#### TC-SR-002: Resolve all standard relations
```typescript
it('should resolve all standard semantic relations', () => {
  const standardRelations = [
    'answers', 'solution',
    'elaborates', 'detail', 'example', 'instance',
    'background', 'context', 'precedes', 'prerequisite',
    'follows', 'implication', 'followUp',
    'contradicts', 'alternative', 'counter',
    'parent', 'generalization',
    'resource', 'reference',
  ];

  standardRelations.forEach(relation => {
    const result = SemanticRouter.resolveRelation(relation);
    expect(result).toBe(relation);
  });
});
```

#### TC-SR-003: Case insensitive matching
```typescript
it('should match relations case-insensitively', () => {
  // Act & Assert
  expect(SemanticRouter.resolveRelation('ANSWERS')).toBe('answers');
  expect(SemanticRouter.resolveRelation('Answers')).toBe('answers');
  expect(SemanticRouter.resolveRelation('aNsWeRs')).toBe('answers');
});
```

#### TC-SR-004: Trim whitespace
```typescript
it('should trim whitespace from relation string', () => {
  // Act & Assert
  expect(SemanticRouter.resolveRelation('  answers  ')).toBe('answers');
  expect(SemanticRouter.resolveRelation('\tanswers\n')).toBe('answers');
});
```

### 1.2 Alias Resolution

#### TC-SR-005: Resolve 'answer' alias to 'answers'
```typescript
it('should resolve "answer" alias to "answers"', () => {
  // Act
  const result = SemanticRouter.resolveRelation('answer');

  // Assert
  expect(result).toBe('answers');
});
```

#### TC-SR-006: Resolve all defined aliases
```typescript
it('should resolve all defined aliases correctly', () => {
  const expectedMappings: Record<string, string> = {
    'answer': 'answers',
    'solve': 'solution',
    'explain': 'elaborates',
    'details': 'detail',
    'examples': 'example',
    'bg': 'background',
    'ctx': 'context',
    'before': 'precedes',
    'prereq': 'prerequisite',
    'after': 'follows',
    'next': 'followUp',
    'followup': 'followUp',
    'oppose': 'contradicts',
    'alt': 'alternative',
    'vs': 'contradicts',
    'super': 'parent',
    'general': 'generalization',
    'ref': 'reference',
    'link': 'resource',
  };

  Object.entries(expectedMappings).forEach(([alias, expected]) => {
    const result = SemanticRouter.resolveRelation(alias);
    expect(result).toBe(expected);
  });
});
```

#### TC-SR-007: Alias case insensitive
```typescript
it('should match aliases case-insensitively', () => {
  // Act & Assert
  expect(SemanticRouter.resolveRelation('BG')).toBe('background');
  expect(SemanticRouter.resolveRelation('Ctx')).toBe('context');
  expect(SemanticRouter.resolveRelation('VS')).toBe('contradicts');
});
```

### 1.3 Unknown Relations

#### TC-SR-008: Return null for unknown relation
```typescript
it('should return null for unknown relation', () => {
  // Act
  const result = SemanticRouter.resolveRelation('unknown-relation');

  // Assert
  expect(result).toBeNull();
});
```

#### TC-SR-009: Return null for empty string
```typescript
it('should return null for empty string', () => {
  // Act
  const result = SemanticRouter.resolveRelation('');

  // Assert
  expect(result).toBeNull();
});
```

#### TC-SR-010: Return null for whitespace-only string
```typescript
it('should return null for whitespace-only string', () => {
  // Act
  const result = SemanticRouter.resolveRelation('   ');

  // Assert
  expect(result).toBeNull();
});
```

---

## 2. `route()` Tests

### 2.1 Zone Mapping

#### TC-SR-011: Route 'answers' to SOUTH zone
```typescript
describe('route', () => {
  it('should route "answers" to SOUTH zone', () => {
    // Act
    const { zone, spec } = SemanticRouter.route('answers');

    // Assert
    expect(zone).toBe('SOUTH');
    expect(spec.zone).toBe('SOUTH');
  });
});
```

#### TC-SR-012: Route 'background' to WEST zone
```typescript
it('should route "background" to WEST zone', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('background');

  // Assert
  expect(zone).toBe('WEST');
});
```

#### TC-SR-013: Route 'elaborates' to SOUTH_EAST zone
```typescript
it('should route "elaborates" to SOUTH_EAST zone', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('elaborates');

  // Assert
  expect(zone).toBe('SOUTH_EAST');
});
```

#### TC-SR-014: Route 'contradicts' to SOUTH_WEST zone
```typescript
it('should route "contradicts" to SOUTH_WEST zone', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('contradicts');

  // Assert
  expect(zone).toBe('SOUTH_WEST');
});
```

#### TC-SR-015: Route 'parent' to NORTH zone
```typescript
it('should route "parent" to NORTH zone', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('parent');

  // Assert
  expect(zone).toBe('NORTH');
});
```

#### TC-SR-016: Route 'prerequisite' to NORTH_WEST zone
```typescript
it('should route "prerequisite" to NORTH_WEST zone', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('prerequisite');

  // Assert
  expect(zone).toBe('NORTH_WEST');
});
```

#### TC-SR-017: Route 'follows' to EAST zone
```typescript
it('should route "follows" to EAST zone', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('follows');

  // Assert
  expect(zone).toBe('EAST');
});
```

### 2.2 Complete Zone Mapping Coverage

#### TC-SR-018: All relations map to correct zones
```typescript
it('should map all relations to their correct zones', () => {
  const expectedMappings: Record<string, string> = {
    // SOUTH
    'answers': 'SOUTH',
    'solution': 'SOUTH',
    // SOUTH_EAST
    'elaborates': 'SOUTH_EAST',
    'detail': 'SOUTH_EAST',
    'example': 'SOUTH_EAST',
    'instance': 'SOUTH_EAST',
    // WEST
    'background': 'WEST',
    'context': 'WEST',
    // NORTH_WEST
    'precedes': 'NORTH_WEST',
    'prerequisite': 'NORTH_WEST',
    // EAST
    'follows': 'EAST',
    'implication': 'EAST',
    'followUp': 'EAST',
    'resource': 'EAST',
    'reference': 'EAST',
    // SOUTH_WEST
    'contradicts': 'SOUTH_WEST',
    'alternative': 'SOUTH_WEST',
    'counter': 'SOUTH_WEST',
    // NORTH
    'parent': 'NORTH',
    'generalization': 'NORTH',
  };

  Object.entries(expectedMappings).forEach(([relation, expectedZone]) => {
    const { zone } = SemanticRouter.route(relation);
    expect(zone).toBe(expectedZone);
  });
});
```

### 2.3 Default Zone for Unknown Relations

#### TC-SR-019: Unknown relation defaults to SOUTH
```typescript
it('should default to SOUTH zone for unknown relation', () => {
  // Act
  const { zone, spec } = SemanticRouter.route('completely-unknown');

  // Assert
  expect(zone).toBe('SOUTH');
  expect(spec).toEqual(ZONE_SPECS.SOUTH);
});
```

### 2.4 ZoneSpec Validation

#### TC-SR-020: Return complete ZoneSpec object
```typescript
it('should return complete ZoneSpec with all properties', () => {
  // Act
  const { spec } = SemanticRouter.route('answers');

  // Assert
  expect(spec).toHaveProperty('zone', 'SOUTH');
  expect(spec).toHaveProperty('dx', 0);
  expect(spec).toHaveProperty('dy', 1);
  expect(spec).toHaveProperty('edgeFrom', 'bottom');
  expect(spec).toHaveProperty('edgeTo', 'top');
  expect(spec).toHaveProperty('defaultColor', '3');
  expect(spec).toHaveProperty('label', '답변/결론');
  expect(spec).toHaveProperty('nodeSize');
  expect(spec.nodeSize).toHaveProperty('width');
  expect(spec.nodeSize).toHaveProperty('height');
});
```

---

## 3. `getEdgeDirections()` Tests

#### TC-SR-021: Get edge directions for SOUTH zone
```typescript
describe('getEdgeDirections', () => {
  it('should return bottom→top for SOUTH zone relations', () => {
    // Act
    const { fromSide, toSide } = SemanticRouter.getEdgeDirections('answers');

    // Assert
    expect(fromSide).toBe('bottom');
    expect(toSide).toBe('top');
  });
});
```

#### TC-SR-022: Get edge directions for WEST zone
```typescript
it('should return left→right for WEST zone relations', () => {
  // Act
  const { fromSide, toSide } = SemanticRouter.getEdgeDirections('background');

  // Assert
  expect(fromSide).toBe('left');
  expect(toSide).toBe('right');
});
```

#### TC-SR-023: Get edge directions for EAST zone
```typescript
it('should return right→left for EAST zone relations', () => {
  // Act
  const { fromSide, toSide } = SemanticRouter.getEdgeDirections('follows');

  // Assert
  expect(fromSide).toBe('right');
  expect(toSide).toBe('left');
});
```

#### TC-SR-024: Get edge directions for NORTH zone
```typescript
it('should return top→bottom for NORTH zone relations', () => {
  // Act
  const { fromSide, toSide } = SemanticRouter.getEdgeDirections('parent');

  // Assert
  expect(fromSide).toBe('top');
  expect(toSide).toBe('bottom');
});
```

#### TC-SR-025: Edge directions for all zones
```typescript
it('should return correct edge directions for all zones', () => {
  const testCases = [
    { relation: 'parent', from: 'top', to: 'bottom' },      // NORTH
    { relation: 'answers', from: 'bottom', to: 'top' },     // SOUTH
    { relation: 'follows', from: 'right', to: 'left' },     // EAST
    { relation: 'background', from: 'left', to: 'right' },  // WEST
    { relation: 'prerequisite', from: 'left', to: 'right' }, // NORTH_WEST
    { relation: 'elaborates', from: 'right', to: 'left' },  // SOUTH_EAST
    { relation: 'contradicts', from: 'left', to: 'right' }, // SOUTH_WEST
  ];

  testCases.forEach(({ relation, from, to }) => {
    const result = SemanticRouter.getEdgeDirections(relation);
    expect(result.fromSide).toBe(from);
    expect(result.toSide).toBe(to);
  });
});
```

---

## 4. `getDefaultColor()` Tests

#### TC-SR-026: Get default color for SOUTH (yellow)
```typescript
describe('getDefaultColor', () => {
  it('should return yellow (3) for SOUTH zone', () => {
    // Act
    const color = SemanticRouter.getDefaultColor('answers');

    // Assert
    expect(color).toBe('3');
  });
});
```

#### TC-SR-027: Get default color for WEST (orange)
```typescript
it('should return orange (2) for WEST zone', () => {
  // Act
  const color = SemanticRouter.getDefaultColor('background');

  // Assert
  expect(color).toBe('2');
});
```

#### TC-SR-028: Get default color for EAST (green)
```typescript
it('should return green (4) for EAST zone', () => {
  // Act
  const color = SemanticRouter.getDefaultColor('follows');

  // Assert
  expect(color).toBe('4');
});
```

#### TC-SR-029: Get default color for SOUTH_WEST (red)
```typescript
it('should return red (1) for SOUTH_WEST zone', () => {
  // Act
  const color = SemanticRouter.getDefaultColor('contradicts');

  // Assert
  expect(color).toBe('1');
});
```

#### TC-SR-030: Get default color for SOUTH_EAST (cyan)
```typescript
it('should return cyan (5) for SOUTH_EAST zone', () => {
  // Act
  const color = SemanticRouter.getDefaultColor('elaborates');

  // Assert
  expect(color).toBe('5');
});
```

#### TC-SR-031: Get default color for NORTH (purple)
```typescript
it('should return purple (6) for NORTH zone', () => {
  // Act
  const color = SemanticRouter.getDefaultColor('parent');

  // Assert
  expect(color).toBe('6');
});
```

---

## 5. `getZoneLabel()` Tests

#### TC-SR-032: Get Korean label for CORE zone
```typescript
describe('getZoneLabel', () => {
  it('should return "주제" for CORE zone', () => {
    // Act
    const label = SemanticRouter.getZoneLabel('CORE');

    // Assert
    expect(label).toBe('주제');
  });
});
```

#### TC-SR-033: Get Korean label for SOUTH zone
```typescript
it('should return "답변/결론" for SOUTH zone', () => {
  // Act
  const label = SemanticRouter.getZoneLabel('SOUTH');

  // Assert
  expect(label).toBe('답변/결론');
});
```

#### TC-SR-034: Get all zone labels
```typescript
it('should return correct Korean labels for all zones', () => {
  const expectedLabels: Record<string, string> = {
    'CORE': '주제',
    'NORTH': '상위 개념',
    'SOUTH': '답변/결론',
    'EAST': '후속 탐구',
    'WEST': '배경 지식',
    'NORTH_EAST': '확장',
    'NORTH_WEST': '선행 지식',
    'SOUTH_EAST': '예시/상세',
    'SOUTH_WEST': '대안/반례',
  };

  Object.entries(expectedLabels).forEach(([zone, expectedLabel]) => {
    const label = SemanticRouter.getZoneLabel(zone as any);
    expect(label).toBe(expectedLabel);
  });
});
```

#### TC-SR-035: Return '기타' for unknown zone
```typescript
it('should return "기타" for unknown zone', () => {
  // Act
  const label = SemanticRouter.getZoneLabel('UNKNOWN' as any);

  // Assert
  expect(label).toBe('기타');
});
```

---

## 6. `getSupportedRelations()` Tests

#### TC-SR-036: Return all supported relations
```typescript
describe('getSupportedRelations', () => {
  it('should return all supported semantic relations', () => {
    // Act
    const relations = SemanticRouter.getSupportedRelations();

    // Assert
    expect(relations).toContain('answers');
    expect(relations).toContain('elaborates');
    expect(relations).toContain('background');
    expect(relations).toContain('contradicts');
    expect(relations).toContain('parent');
    expect(relations).toContain('resource');
  });
});
```

#### TC-SR-037: Return correct number of relations
```typescript
it('should return exactly 20 supported relations', () => {
  // Act
  const relations = SemanticRouter.getSupportedRelations();

  // Assert
  expect(relations).toHaveLength(20);
});
```

#### TC-SR-038: Not include aliases
```typescript
it('should not include aliases in supported relations', () => {
  // Act
  const relations = SemanticRouter.getSupportedRelations();

  // Assert - Aliases should not be in the list
  expect(relations).not.toContain('answer'); // alias
  expect(relations).not.toContain('bg');     // alias
  expect(relations).not.toContain('ctx');    // alias
});
```

---

## 7. `getAllZones()` Tests

#### TC-SR-039: Return all 9 zones
```typescript
describe('getAllZones', () => {
  it('should return all 9 zones', () => {
    // Act
    const zones = SemanticRouter.getAllZones();

    // Assert
    expect(zones).toHaveLength(9);
    expect(zones).toContain('CORE');
    expect(zones).toContain('NORTH');
    expect(zones).toContain('SOUTH');
    expect(zones).toContain('EAST');
    expect(zones).toContain('WEST');
    expect(zones).toContain('NORTH_EAST');
    expect(zones).toContain('NORTH_WEST');
    expect(zones).toContain('SOUTH_EAST');
    expect(zones).toContain('SOUTH_WEST');
  });
});
```

---

## 8. `getNodeSize()` Tests

#### TC-SR-040: Get node size for CORE zone
```typescript
describe('getNodeSize', () => {
  it('should return large size for CORE zone', () => {
    // Act
    const size = SemanticRouter.getNodeSize('CORE');

    // Assert
    expect(size.width).toBe(450);
    expect(size.height).toBe(120);
  });
});
```

#### TC-SR-041: Get node size for SOUTH zone
```typescript
it('should return standard size for SOUTH zone', () => {
  // Act
  const size = SemanticRouter.getNodeSize('SOUTH');

  // Assert
  expect(size.width).toBe(400);
  expect(size.height).toBe(200);
});
```

#### TC-SR-042: Get node sizes for all zones
```typescript
it('should return valid node sizes for all zones', () => {
  const zones = SemanticRouter.getAllZones();

  zones.forEach(zone => {
    const size = SemanticRouter.getNodeSize(zone);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});
```

#### TC-SR-043: Diagonal zones have smaller nodes
```typescript
it('should return smaller sizes for diagonal zones', () => {
  // Act
  const southEastSize = SemanticRouter.getNodeSize('SOUTH_EAST');
  const northWestSize = SemanticRouter.getNodeSize('NORTH_WEST');
  const coreSize = SemanticRouter.getNodeSize('CORE');

  // Assert
  expect(southEastSize.width).toBeLessThan(coreSize.width);
  expect(northWestSize.width).toBeLessThan(coreSize.width);
});
```

---

## 9. Integration with ZONE_SPECS Tests

#### TC-SR-044: Zone dx/dy values are correct
```typescript
describe('ZONE_SPECS Integration', () => {
  it('should have correct dx/dy for cardinal directions', () => {
    // NORTH: dy=-1
    const { spec: northSpec } = SemanticRouter.route('parent');
    expect(northSpec.dx).toBe(0);
    expect(northSpec.dy).toBe(-1);

    // SOUTH: dy=1
    const { spec: southSpec } = SemanticRouter.route('answers');
    expect(southSpec.dx).toBe(0);
    expect(southSpec.dy).toBe(1);

    // EAST: dx=1
    const { spec: eastSpec } = SemanticRouter.route('follows');
    expect(eastSpec.dx).toBe(1);
    expect(eastSpec.dy).toBe(0);

    // WEST: dx=-1
    const { spec: westSpec } = SemanticRouter.route('background');
    expect(westSpec.dx).toBe(-1);
    expect(westSpec.dy).toBe(0);
  });
});
```

#### TC-SR-045: Diagonal zones have correct dx/dy
```typescript
it('should have correct dx/dy for diagonal directions', () => {
  // NORTH_WEST: dx=-1, dy=-1
  const { spec: nwSpec } = SemanticRouter.route('prerequisite');
  expect(nwSpec.dx).toBe(-1);
  expect(nwSpec.dy).toBe(-1);

  // SOUTH_EAST: dx=1, dy=1
  const { spec: seSpec } = SemanticRouter.route('elaborates');
  expect(seSpec.dx).toBe(1);
  expect(seSpec.dy).toBe(1);

  // SOUTH_WEST: dx=-1, dy=1
  const { spec: swSpec } = SemanticRouter.route('contradicts');
  expect(swSpec.dx).toBe(-1);
  expect(swSpec.dy).toBe(1);
});
```

---

## 10. Edge Cases

#### TC-SR-046: Handle special characters in relation
```typescript
describe('Edge Cases', () => {
  it('should handle relation with special characters', () => {
    // Act
    const result = SemanticRouter.resolveRelation('answers!@#');

    // Assert
    expect(result).toBeNull();
  });
});
```

#### TC-SR-047: Handle numeric relation
```typescript
it('should return null for numeric relation', () => {
  // Act
  const result = SemanticRouter.resolveRelation('123');

  // Assert
  expect(result).toBeNull();
});
```

#### TC-SR-048: Handle mixed case aliases
```typescript
it('should handle mixed case aliases correctly', () => {
  // Act & Assert
  expect(SemanticRouter.resolveRelation('FollowUp')).toBe('followUp');
  expect(SemanticRouter.resolveRelation('FOLLOWUP')).toBe('followUp');
});
```

---

## Test Fixtures

### Expected Zone Mapping Table
```typescript
const EXPECTED_ZONE_MAPPING = {
  // Relation -> Zone
  'answers': 'SOUTH',
  'solution': 'SOUTH',
  'elaborates': 'SOUTH_EAST',
  'detail': 'SOUTH_EAST',
  'example': 'SOUTH_EAST',
  'instance': 'SOUTH_EAST',
  'background': 'WEST',
  'context': 'WEST',
  'precedes': 'NORTH_WEST',
  'prerequisite': 'NORTH_WEST',
  'follows': 'EAST',
  'implication': 'EAST',
  'followUp': 'EAST',
  'contradicts': 'SOUTH_WEST',
  'alternative': 'SOUTH_WEST',
  'counter': 'SOUTH_WEST',
  'parent': 'NORTH',
  'generalization': 'NORTH',
  'resource': 'EAST',
  'reference': 'EAST',
};
```

### Expected Alias Mapping Table
```typescript
const EXPECTED_ALIAS_MAPPING = {
  'answer': 'answers',
  'solve': 'solution',
  'explain': 'elaborates',
  'details': 'detail',
  'examples': 'example',
  'bg': 'background',
  'ctx': 'context',
  'before': 'precedes',
  'prereq': 'prerequisite',
  'after': 'follows',
  'next': 'followUp',
  'followup': 'followUp',
  'oppose': 'contradicts',
  'alt': 'alternative',
  'vs': 'contradicts',
  'super': 'parent',
  'general': 'generalization',
  'ref': 'reference',
  'link': 'resource',
};
```
