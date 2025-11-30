/**
 * Vault Indexer
 *
 * 볼트 내 노트를 인덱싱하여 빠른 검색을 지원합니다.
 * 캔버스 생성/확장 시 관련 노트를 빠르게 찾을 수 있습니다.
 */
import type { NoteMetadata, VaultIndex, SearchOptions, SearchResult } from '../types/index.js';
export declare class VaultIndexer {
    private readonly vaultPath;
    private readonly indexPath;
    private index;
    constructor(vaultPath?: string);
    /**
     * 전체 볼트 인덱스 빌드
     */
    buildIndex(force?: boolean): Promise<VaultIndex>;
    /**
     * 단일 노트 인덱싱
     */
    private indexNote;
    private extractTitle;
    private extractTags;
    private extractLinks;
    private extractKeywords;
    private extractCreatedDate;
    private buildBacklinks;
    private buildTagIndex;
    private buildKeywordIndex;
    /**
     * 키워드로 노트 검색
     */
    searchByKeyword(keyword: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * 태그로 노트 검색
     */
    searchByTag(tag: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * 여러 키워드로 관련 노트 찾기
     */
    findRelatedNotes(keywords: string[], options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * 특정 노트의 메타데이터 조회
     */
    getNoteMetadata(path: string): Promise<NoteMetadata | null>;
    /**
     * 인덱스 통계
     */
    getStatistics(): Promise<{
        totalNotes: number;
        totalTags: number;
        totalKeywords: number;
        indexedAt: string;
        topTags: Array<[string, number]>;
    }>;
    private shouldExclude;
    private findMarkdownFiles;
    private createEmptyIndex;
    private loadIndex;
    private saveIndex;
    private ensureIndex;
}
//# sourceMappingURL=vault-indexer.d.ts.map