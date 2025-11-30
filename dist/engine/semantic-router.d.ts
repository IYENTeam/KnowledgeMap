/**
 * Semantic Router
 *
 * 의미적 관계(Semantic Relation)를 공간 Zone으로 매핑합니다.
 * Agent는 레이아웃을 모르고, 오직 의미적 관계만 표현합니다.
 */
import { SemanticRelation, Zone, ZoneSpec } from '../types/index.js';
export declare class SemanticRouter {
    /**
     * 문자열을 SemanticRelation으로 변환합니다.
     */
    static resolveRelation(relation: string): SemanticRelation | null;
    /**
     * 의미적 관계를 Zone과 스펙으로 라우팅합니다.
     */
    static route(relation: string): {
        zone: Zone;
        spec: ZoneSpec;
    };
    /**
     * 관계에 따른 Edge 방향을 반환합니다.
     */
    static getEdgeDirections(relation: string): {
        fromSide: 'top' | 'right' | 'bottom' | 'left';
        toSide: 'top' | 'right' | 'bottom' | 'left';
    };
    /**
     * 관계에 따른 기본 노드 색상을 반환합니다.
     */
    static getDefaultColor(relation: string): string;
    /**
     * Zone의 한글 라벨을 반환합니다.
     */
    static getZoneLabel(zone: Zone): string;
    /**
     * 모든 지원되는 관계 목록을 반환합니다.
     */
    static getSupportedRelations(): SemanticRelation[];
    /**
     * 모든 Zone 목록을 반환합니다.
     */
    static getAllZones(): Zone[];
    /**
     * Zone별 노드 크기를 반환합니다.
     */
    static getNodeSize(zone: Zone): {
        width: number;
        height: number;
    };
}
//# sourceMappingURL=semantic-router.d.ts.map