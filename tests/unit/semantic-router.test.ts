/**
 * SemanticRouter Unit Tests
 *
 * 의미적 관계를 공간 Zone으로 매핑하는 라우터 테스트
 */

import { describe, it, expect } from 'vitest';
import { SemanticRouter } from '../../src/engine/semantic-router.js';
import {
  RELATION_TO_ZONE,
  ZONE_SPECS,
  ZONE_LABELS,
  RELATION_ALIASES,
  SemanticRelation,
  Zone,
} from '../../src/types/semantic.js';

describe('SemanticRouter', () => {
  // ===========================================================================
  // resolveRelation Tests
  // ===========================================================================

  describe('resolveRelation()', () => {
    it('should resolve direct relation names', () => {
      const directRelations: SemanticRelation[] = [
        'answers', 'solution', 'elaborates', 'detail', 'example',
        'background', 'context', 'precedes', 'prerequisite',
        'follows', 'implication', 'followUp',
        'contradicts', 'alternative', 'counter',
        'parent', 'generalization', 'resource', 'reference',
      ];

      for (const relation of directRelations) {
        const resolved = SemanticRouter.resolveRelation(relation);
        expect(resolved).toBe(relation);
      }
    });

    it('should resolve relation aliases', () => {
      const aliases: Record<string, SemanticRelation> = {
        answer: 'answers',
        solve: 'solution',
        explain: 'elaborates',
        details: 'detail',
        examples: 'example',
        bg: 'background',
        ctx: 'context',
        before: 'precedes',
        prereq: 'prerequisite',
        after: 'follows',
        next: 'followUp',
        followup: 'followUp',
        oppose: 'contradicts',
        alt: 'alternative',
        vs: 'contradicts',
        super: 'parent',
        general: 'generalization',
        ref: 'reference',
        link: 'resource',
      };

      for (const [alias, expected] of Object.entries(aliases)) {
        const resolved = SemanticRouter.resolveRelation(alias);
        expect(resolved).toBe(expected);
      }
    });

    it('should be case insensitive', () => {
      expect(SemanticRouter.resolveRelation('ANSWERS')).toBe('answers');
      expect(SemanticRouter.resolveRelation('Answers')).toBe('answers');
      expect(SemanticRouter.resolveRelation('aNsWeRs')).toBe('answers');
    });

    it('should trim whitespace', () => {
      expect(SemanticRouter.resolveRelation('  answers  ')).toBe('answers');
      expect(SemanticRouter.resolveRelation('\tanswers\n')).toBe('answers');
    });

    it('should return null for unknown relations', () => {
      expect(SemanticRouter.resolveRelation('unknown')).toBeNull();
      expect(SemanticRouter.resolveRelation('random_string')).toBeNull();
      expect(SemanticRouter.resolveRelation('')).toBeNull();
    });
  });

  // ===========================================================================
  // route Tests
  // ===========================================================================

  describe('route()', () => {
    describe('Zone Mapping', () => {
      it('should route answers/solution to SOUTH', () => {
        expect(SemanticRouter.route('answers').zone).toBe('SOUTH');
        expect(SemanticRouter.route('solution').zone).toBe('SOUTH');
      });

      it('should route elaborates/detail/example/instance to SOUTH_EAST', () => {
        expect(SemanticRouter.route('elaborates').zone).toBe('SOUTH_EAST');
        expect(SemanticRouter.route('detail').zone).toBe('SOUTH_EAST');
        expect(SemanticRouter.route('example').zone).toBe('SOUTH_EAST');
        expect(SemanticRouter.route('instance').zone).toBe('SOUTH_EAST');
      });

      it('should route background/context to WEST', () => {
        expect(SemanticRouter.route('background').zone).toBe('WEST');
        expect(SemanticRouter.route('context').zone).toBe('WEST');
      });

      it('should route precedes/prerequisite to NORTH_WEST', () => {
        expect(SemanticRouter.route('precedes').zone).toBe('NORTH_WEST');
        expect(SemanticRouter.route('prerequisite').zone).toBe('NORTH_WEST');
      });

      it('should route follows/implication/followUp to EAST', () => {
        expect(SemanticRouter.route('follows').zone).toBe('EAST');
        expect(SemanticRouter.route('implication').zone).toBe('EAST');
        expect(SemanticRouter.route('followUp').zone).toBe('EAST');
      });

      it('should route contradicts/alternative/counter to SOUTH_WEST', () => {
        expect(SemanticRouter.route('contradicts').zone).toBe('SOUTH_WEST');
        expect(SemanticRouter.route('alternative').zone).toBe('SOUTH_WEST');
        expect(SemanticRouter.route('counter').zone).toBe('SOUTH_WEST');
      });

      it('should route parent/generalization to NORTH', () => {
        expect(SemanticRouter.route('parent').zone).toBe('NORTH');
        expect(SemanticRouter.route('generalization').zone).toBe('NORTH');
      });

      it('should route resource/reference to EAST', () => {
        expect(SemanticRouter.route('resource').zone).toBe('EAST');
        expect(SemanticRouter.route('reference').zone).toBe('EAST');
      });
    });

    describe('Spec Retrieval', () => {
      it('should return correct spec for each zone', () => {
        const relations: Array<{ relation: string; expectedZone: Zone }> = [
          { relation: 'answers', expectedZone: 'SOUTH' },
          { relation: 'background', expectedZone: 'WEST' },
          { relation: 'parent', expectedZone: 'NORTH' },
          { relation: 'followUp', expectedZone: 'EAST' },
        ];

        for (const { relation, expectedZone } of relations) {
          const { zone, spec } = SemanticRouter.route(relation);
          expect(zone).toBe(expectedZone);
          expect(spec).toEqual(ZONE_SPECS[expectedZone]);
        }
      });

      it('should return spec with all required properties', () => {
        const { spec } = SemanticRouter.route('answers');

        expect(spec).toHaveProperty('zone');
        expect(spec).toHaveProperty('dx');
        expect(spec).toHaveProperty('dy');
        expect(spec).toHaveProperty('edgeFrom');
        expect(spec).toHaveProperty('edgeTo');
        expect(spec).toHaveProperty('defaultColor');
        expect(spec).toHaveProperty('label');
        expect(spec).toHaveProperty('nodeSize');
      });
    });

    describe('Fallback Behavior', () => {
      it('should default to SOUTH for unknown relations', () => {
        const { zone, spec } = SemanticRouter.route('unknown_relation');

        expect(zone).toBe('SOUTH');
        expect(spec).toEqual(ZONE_SPECS.SOUTH);
      });

      it('should default to SOUTH for empty string', () => {
        const { zone } = SemanticRouter.route('');

        expect(zone).toBe('SOUTH');
      });

      it('should handle relation with only whitespace', () => {
        const { zone } = SemanticRouter.route('   ');

        expect(zone).toBe('SOUTH');
      });
    });

    describe('Alias Resolution', () => {
      it('should route aliases to correct zones', () => {
        // 'answer' alias for 'answers'
        expect(SemanticRouter.route('answer').zone).toBe('SOUTH');

        // 'bg' alias for 'background'
        expect(SemanticRouter.route('bg').zone).toBe('WEST');

        // 'prereq' alias for 'prerequisite'
        expect(SemanticRouter.route('prereq').zone).toBe('NORTH_WEST');

        // 'alt' alias for 'alternative'
        expect(SemanticRouter.route('alt').zone).toBe('SOUTH_WEST');
      });
    });
  });

  // ===========================================================================
  // getEdgeDirections Tests
  // ===========================================================================

  describe('getEdgeDirections()', () => {
    it('should return correct edge directions for SOUTH zone', () => {
      const directions = SemanticRouter.getEdgeDirections('answers');

      expect(directions.fromSide).toBe('bottom');
      expect(directions.toSide).toBe('top');
    });

    it('should return correct edge directions for NORTH zone', () => {
      const directions = SemanticRouter.getEdgeDirections('parent');

      expect(directions.fromSide).toBe('top');
      expect(directions.toSide).toBe('bottom');
    });

    it('should return correct edge directions for EAST zone', () => {
      const directions = SemanticRouter.getEdgeDirections('followUp');

      expect(directions.fromSide).toBe('right');
      expect(directions.toSide).toBe('left');
    });

    it('should return correct edge directions for WEST zone', () => {
      const directions = SemanticRouter.getEdgeDirections('background');

      expect(directions.fromSide).toBe('left');
      expect(directions.toSide).toBe('right');
    });

    it('should return SOUTH directions for unknown relations', () => {
      const directions = SemanticRouter.getEdgeDirections('unknown');

      expect(directions.fromSide).toBe('bottom');
      expect(directions.toSide).toBe('top');
    });
  });

  // ===========================================================================
  // getDefaultColor Tests
  // ===========================================================================

  describe('getDefaultColor()', () => {
    it('should return yellow for answers (SOUTH)', () => {
      expect(SemanticRouter.getDefaultColor('answers')).toBe('3');
    });

    it('should return orange for background (WEST)', () => {
      expect(SemanticRouter.getDefaultColor('background')).toBe('2');
    });

    it('should return green for followUp (EAST)', () => {
      expect(SemanticRouter.getDefaultColor('followUp')).toBe('4');
    });

    it('should return purple for parent (NORTH)', () => {
      expect(SemanticRouter.getDefaultColor('parent')).toBe('6');
    });

    it('should return cyan for elaborates (SOUTH_EAST)', () => {
      expect(SemanticRouter.getDefaultColor('elaborates')).toBe('5');
    });

    it('should return red for alternative (SOUTH_WEST)', () => {
      expect(SemanticRouter.getDefaultColor('alternative')).toBe('1');
    });

    it('should return SOUTH default color for unknown relations', () => {
      const unknownColor = SemanticRouter.getDefaultColor('unknown');
      expect(unknownColor).toBe(ZONE_SPECS.SOUTH.defaultColor);
    });
  });

  // ===========================================================================
  // getZoneLabel Tests
  // ===========================================================================

  describe('getZoneLabel()', () => {
    it('should return Korean labels for all zones', () => {
      const expectedLabels: Record<Zone, string> = {
        CORE: '주제',
        NORTH: '상위 개념',
        SOUTH: '답변/결론',
        EAST: '후속 탐구',
        WEST: '배경 지식',
        NORTH_EAST: '확장',
        NORTH_WEST: '선행 지식',
        SOUTH_EAST: '예시/상세',
        SOUTH_WEST: '대안/반례',
      };

      for (const [zone, expectedLabel] of Object.entries(expectedLabels)) {
        const label = SemanticRouter.getZoneLabel(zone as Zone);
        expect(label).toBe(expectedLabel);
      }
    });

    it('should return "기타" for invalid zone', () => {
      const label = SemanticRouter.getZoneLabel('INVALID' as Zone);
      expect(label).toBe('기타');
    });
  });

  // ===========================================================================
  // getSupportedRelations Tests
  // ===========================================================================

  describe('getSupportedRelations()', () => {
    it('should return all supported relations', () => {
      const relations = SemanticRouter.getSupportedRelations();

      expect(relations).toContain('answers');
      expect(relations).toContain('solution');
      expect(relations).toContain('elaborates');
      expect(relations).toContain('background');
      expect(relations).toContain('followUp');
      expect(relations).toContain('contradicts');
      expect(relations).toContain('parent');
      expect(relations).toContain('resource');
    });

    it('should return exactly the relations in RELATION_TO_ZONE', () => {
      const relations = SemanticRouter.getSupportedRelations();
      const expected = Object.keys(RELATION_TO_ZONE);

      expect(relations.sort()).toEqual(expected.sort());
    });

    it('should not include aliases', () => {
      const relations = SemanticRouter.getSupportedRelations();

      expect(relations).not.toContain('answer'); // alias for 'answers'
      expect(relations).not.toContain('bg'); // alias for 'background'
      expect(relations).not.toContain('prereq'); // alias for 'prerequisite'
    });
  });

  // ===========================================================================
  // getAllZones Tests
  // ===========================================================================

  describe('getAllZones()', () => {
    it('should return all 9 zones', () => {
      const zones = SemanticRouter.getAllZones();

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

    it('should return zones in ZONE_SPECS', () => {
      const zones = SemanticRouter.getAllZones();
      const expected = Object.keys(ZONE_SPECS);

      expect(zones.sort()).toEqual(expected.sort());
    });
  });

  // ===========================================================================
  // getNodeSize Tests
  // ===========================================================================

  describe('getNodeSize()', () => {
    it('should return correct size for CORE zone', () => {
      const size = SemanticRouter.getNodeSize('CORE');

      expect(size.width).toBe(450);
      expect(size.height).toBe(120);
    });

    it('should return correct size for SOUTH zone', () => {
      const size = SemanticRouter.getNodeSize('SOUTH');

      expect(size.width).toBe(400);
      expect(size.height).toBe(200);
    });

    it('should return correct size for EAST zone', () => {
      const size = SemanticRouter.getNodeSize('EAST');

      expect(size.width).toBe(350);
      expect(size.height).toBe(150);
    });

    it('should return correct size for corner zones', () => {
      const neSize = SemanticRouter.getNodeSize('NORTH_EAST');
      expect(neSize.width).toBe(300);
      expect(neSize.height).toBe(120);

      const seSize = SemanticRouter.getNodeSize('SOUTH_EAST');
      expect(seSize.width).toBe(350);
      expect(seSize.height).toBe(150);
    });

    it('should return different sizes for different zones', () => {
      const sizes = SemanticRouter.getAllZones().map((zone) => ({
        zone,
        ...SemanticRouter.getNodeSize(zone),
      }));

      // Verify we have variation in sizes
      const uniqueWidths = new Set(sizes.map((s) => s.width));
      const uniqueHeights = new Set(sizes.map((s) => s.height));

      expect(uniqueWidths.size).toBeGreaterThan(1);
      expect(uniqueHeights.size).toBeGreaterThan(1);
    });
  });

  // ===========================================================================
  // Integration/Consistency Tests
  // ===========================================================================

  describe('Data Consistency', () => {
    it('should have matching zones in ZONE_SPECS and ZONE_LABELS', () => {
      const specZones = Object.keys(ZONE_SPECS);
      const labelZones = Object.keys(ZONE_LABELS);

      expect(specZones.sort()).toEqual(labelZones.sort());
    });

    it('should have all relations map to valid zones', () => {
      const validZones = new Set(Object.keys(ZONE_SPECS));

      for (const zone of Object.values(RELATION_TO_ZONE)) {
        expect(validZones.has(zone)).toBe(true);
      }
    });

    it('should have all aliases map to valid relations', () => {
      const validRelations = new Set(Object.keys(RELATION_TO_ZONE));

      for (const relation of Object.values(RELATION_ALIASES)) {
        expect(validRelations.has(relation)).toBe(true);
      }
    });

    it('should have valid edge directions in zone specs', () => {
      const validSides = new Set(['top', 'right', 'bottom', 'left']);

      for (const spec of Object.values(ZONE_SPECS)) {
        expect(validSides.has(spec.edgeFrom)).toBe(true);
        expect(validSides.has(spec.edgeTo)).toBe(true);
      }
    });

    it('should have valid color codes in zone specs', () => {
      const validColors = new Set(['1', '2', '3', '4', '5', '6']);

      for (const spec of Object.values(ZONE_SPECS)) {
        expect(validColors.has(spec.defaultColor)).toBe(true);
      }
    });

    it('should have positive node sizes in zone specs', () => {
      for (const spec of Object.values(ZONE_SPECS)) {
        expect(spec.nodeSize.width).toBeGreaterThan(0);
        expect(spec.nodeSize.height).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle relation with special characters', () => {
      const { zone } = SemanticRouter.route('answers!@#$%');
      // Should not match, fall back to SOUTH
      expect(zone).toBe('SOUTH');
    });

    it('should handle relation with numbers', () => {
      const { zone } = SemanticRouter.route('answers123');
      expect(zone).toBe('SOUTH');
    });

    it('should handle very long relation string', () => {
      const longRelation = 'a'.repeat(1000);
      const { zone } = SemanticRouter.route(longRelation);
      expect(zone).toBe('SOUTH');
    });

    it('should handle mixed case aliases', () => {
      expect(SemanticRouter.resolveRelation('BG')).toBe('background');
      expect(SemanticRouter.resolveRelation('Ctx')).toBe('context');
      expect(SemanticRouter.resolveRelation('PREREQ')).toBe('prerequisite');
    });

    it('should handle unicode relation strings', () => {
      const { zone } = SemanticRouter.route('답변'); // Korean for "answer"
      expect(zone).toBe('SOUTH'); // Should fall back
    });
  });
});
