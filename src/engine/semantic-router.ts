/**
 * Semantic Router
 *
 * 의미적 관계(Semantic Relation)를 공간 Zone으로 매핑합니다.
 * Agent는 레이아웃을 모르고, 오직 의미적 관계만 표현합니다.
 */

import {
  SemanticRelation,
  Zone,
  ZoneSpec,
  RELATION_TO_ZONE,
  ZONE_SPECS,
  ZONE_LABELS,
  RELATION_ALIASES,
} from '../types/index.js';

// =============================================================================
// Semantic Router Class
// =============================================================================

export class SemanticRouter {
  /**
   * 문자열을 SemanticRelation으로 변환합니다.
   */
  static resolveRelation(relation: string): SemanticRelation | null {
    const relationLower = relation.toLowerCase().trim();

    // 직접 매칭
    if (relationLower in RELATION_TO_ZONE) {
      return relationLower as SemanticRelation;
    }

    // 별칭 매칭
    if (relationLower in RELATION_ALIASES) {
      return RELATION_ALIASES[relationLower];
    }

    return null;
  }

  /**
   * 의미적 관계를 Zone과 스펙으로 라우팅합니다.
   */
  static route(relation: string): { zone: Zone; spec: ZoneSpec } {
    const resolved = this.resolveRelation(relation);

    if (resolved === null) {
      // 알 수 없는 관계는 기본적으로 SOUTH로
      return {
        zone: 'SOUTH',
        spec: ZONE_SPECS.SOUTH,
      };
    }

    const zone = RELATION_TO_ZONE[resolved];
    return {
      zone,
      spec: ZONE_SPECS[zone],
    };
  }

  /**
   * 관계에 따른 Edge 방향을 반환합니다.
   */
  static getEdgeDirections(
    relation: string
  ): { fromSide: 'top' | 'right' | 'bottom' | 'left'; toSide: 'top' | 'right' | 'bottom' | 'left' } {
    const { spec } = this.route(relation);
    return {
      fromSide: spec.edgeFrom,
      toSide: spec.edgeTo,
    };
  }

  /**
   * 관계에 따른 기본 노드 색상을 반환합니다.
   */
  static getDefaultColor(relation: string): string {
    const { spec } = this.route(relation);
    return spec.defaultColor;
  }

  /**
   * Zone의 한글 라벨을 반환합니다.
   */
  static getZoneLabel(zone: Zone): string {
    return ZONE_LABELS[zone] || '기타';
  }

  /**
   * 모든 지원되는 관계 목록을 반환합니다.
   */
  static getSupportedRelations(): SemanticRelation[] {
    return Object.keys(RELATION_TO_ZONE) as SemanticRelation[];
  }

  /**
   * 모든 Zone 목록을 반환합니다.
   */
  static getAllZones(): Zone[] {
    return Object.keys(ZONE_SPECS) as Zone[];
  }

  /**
   * Zone별 노드 크기를 반환합니다.
   */
  static getNodeSize(zone: Zone): { width: number; height: number } {
    return ZONE_SPECS[zone].nodeSize;
  }
}
