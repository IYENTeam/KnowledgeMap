/**
 * Cross Reference Manager
 *
 * 캔버스 간 상호 참조 및 연결을 관리합니다.
 */
import type { CrossReferenceIndex, CanvasNetwork } from '../types/index.js';
export declare class CrossReferenceManager {
    private readonly canvasDir;
    private readonly indexPath;
    private index;
    private metaManager;
    constructor(canvasDir?: string);
    /**
     * 크로스 레퍼런스 인덱스 빌드
     */
    buildIndex(force?: boolean): Promise<CrossReferenceIndex>;
    /**
     * 캔버스에서 정보 추출
     */
    private extractCanvasInfo;
    private buildSharedKeywords;
    private buildRelatedCanvases;
    private calculateSimilarity;
    /**
     * 특정 캔버스와 관련된 캔버스들 조회
     */
    getRelatedCanvases(canvasPath: string, limit?: number): Promise<Array<{
        path: string;
        score: number;
    }>>;
    /**
     * 키워드로 캔버스 검색
     */
    findCanvasesByKeyword(keyword: string): Promise<string[]>;
    /**
     * 캔버스 네트워크 데이터 생성 (시각화용)
     */
    getCanvasNetwork(): Promise<CanvasNetwork>;
    /**
     * 캔버스에 추가할 링크 제안
     */
    suggestCanvasLinks(canvasPath: string): Promise<Array<{
        canvas: string;
        topic: string;
        reason: string;
        score: number;
    }>>;
    /**
     * 통계
     */
    getStatistics(): Promise<{
        totalCanvases: number;
        byState: Record<string, number>;
        topSharedKeywords: Array<[string, number]>;
        mostConnected: Array<{
            path: string;
            topic: string;
            connections: number;
        }>;
    }>;
    private findCanvasFiles;
    private createEmptyIndex;
    private loadIndex;
    private saveIndex;
    private ensureIndex;
}
//# sourceMappingURL=cross-reference.d.ts.map