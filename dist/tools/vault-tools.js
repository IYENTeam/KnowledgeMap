/**
 * Vault Tools
 *
 * 볼트 인덱싱, 노트 검색, 크로스 레퍼런스를 위한 MCP 도구들
 */
import { z } from 'zod';
import { VaultIndexer, CrossReferenceManager } from '../engine/index.js';
// =============================================================================
// Tool Schemas
// =============================================================================
export const SearchNotesSchema = z.object({
    query: z.string().describe('검색 키워드'),
    type: z.enum(['keyword', 'tag', 'title']).optional().describe('검색 유형'),
    limit: z.number().optional().describe('결과 개수 제한 (기본: 10)'),
});
export const FindRelatedNotesSchema = z.object({
    keywords: z.array(z.string()).describe('관련 노트를 찾을 키워드 목록'),
    limit: z.number().optional().describe('결과 개수 제한 (기본: 5)'),
});
export const GetNoteMetadataSchema = z.object({
    notePath: z.string().describe('노트 경로'),
});
export const BuildIndexSchema = z.object({
    force: z.boolean().optional().describe('강제 재빌드 여부'),
});
export const GetVaultStatsSchema = z.object({});
export const FindRelatedCanvasesSchema = z.object({
    canvasPath: z.string().describe('기준 캔버스 경로'),
    limit: z.number().optional().describe('결과 개수 제한 (기본: 5)'),
});
export const SearchCanvasesSchema = z.object({
    keyword: z.string().describe('검색 키워드'),
});
export const GetCanvasNetworkSchema = z.object({});
export const SuggestLinksSchema = z.object({
    canvasPath: z.string().describe('캔버스 경로'),
});
export const GetCrossRefStatsSchema = z.object({});
// =============================================================================
// Tool Implementations
// =============================================================================
export class VaultTools {
    vaultIndexer;
    crossRefManager;
    constructor(vaultPath = '.', canvasDir = '03_Canvas') {
        this.vaultIndexer = new VaultIndexer(vaultPath);
        this.crossRefManager = new CrossReferenceManager(canvasDir);
    }
    /**
     * 노트 검색
     */
    async searchNotes(params) {
        const { query, type = 'keyword', limit = 10 } = params;
        let results;
        switch (type) {
            case 'tag':
                results = await this.vaultIndexer.searchByTag(query, { limit });
                break;
            case 'keyword':
            default:
                results = await this.vaultIndexer.searchByKeyword(query, { limit });
                break;
        }
        return {
            results: results.map((r) => ({
                path: r.note.path,
                title: r.note.title,
                score: r.score,
                matchedKeywords: r.matchedKeywords,
                matchedTags: r.matchedTags,
            })),
            totalFound: results.length,
        };
    }
    /**
     * 여러 키워드로 관련 노트 찾기
     */
    async findRelatedNotes(params) {
        const { keywords, limit = 5 } = params;
        const results = await this.vaultIndexer.findRelatedNotes(keywords, { limit });
        return {
            results: results.map((r) => ({
                path: r.note.path,
                title: r.note.title,
                score: r.score,
                matchedKeywords: r.matchedKeywords || [],
            })),
        };
    }
    /**
     * 노트 메타데이터 조회
     */
    async getNoteMetadata(params) {
        const { notePath } = params;
        const note = await this.vaultIndexer.getNoteMetadata(notePath);
        if (!note)
            return null;
        return {
            path: note.path,
            title: note.title,
            tags: note.tags,
            links: note.links,
            backlinks: note.backlinks,
            keywords: note.keywords,
            createdAt: note.createdAt,
            modifiedAt: note.modifiedAt,
            size: note.size,
        };
    }
    /**
     * 볼트 인덱스 빌드
     */
    async buildIndex(params) {
        const { force = false } = params;
        await this.vaultIndexer.buildIndex(force);
        const stats = await this.vaultIndexer.getStatistics();
        return {
            totalNotes: stats.totalNotes,
            totalTags: stats.totalTags,
            totalKeywords: stats.totalKeywords,
            indexedAt: stats.indexedAt,
        };
    }
    /**
     * 볼트 통계 조회
     */
    async getVaultStats(_params) {
        return await this.vaultIndexer.getStatistics();
    }
    /**
     * 관련 캔버스 찾기
     */
    async findRelatedCanvases(params) {
        const { canvasPath, limit = 5 } = params;
        const related = await this.crossRefManager.getRelatedCanvases(canvasPath, limit);
        return {
            canvases: related,
        };
    }
    /**
     * 키워드로 캔버스 검색
     */
    async searchCanvases(params) {
        const { keyword } = params;
        const canvases = await this.crossRefManager.findCanvasesByKeyword(keyword);
        return { canvases };
    }
    /**
     * 캔버스 네트워크 데이터 조회
     */
    async getCanvasNetwork(_params) {
        return await this.crossRefManager.getCanvasNetwork();
    }
    /**
     * 캔버스 링크 제안
     */
    async suggestLinks(params) {
        const { canvasPath } = params;
        const suggestions = await this.crossRefManager.suggestCanvasLinks(canvasPath);
        return { suggestions };
    }
    /**
     * 크로스 레퍼런스 통계
     */
    async getCrossRefStats(_params) {
        return await this.crossRefManager.getStatistics();
    }
    /**
     * 크로스 레퍼런스 인덱스 빌드
     */
    async buildCrossRefIndex(force = false) {
        const index = await this.crossRefManager.buildIndex(force);
        return {
            totalCanvases: Object.keys(index.canvases).length,
            indexedAt: index.indexedAt,
        };
    }
}
// =============================================================================
// Tool Definitions (for MCP registration)
// =============================================================================
export const vaultToolDefinitions = [
    {
        name: 'vault_search',
        description: '볼트 내 노트를 키워드, 태그, 제목으로 검색합니다.',
        inputSchema: SearchNotesSchema,
    },
    {
        name: 'vault_find_related',
        description: '여러 키워드와 관련된 노트를 찾습니다.',
        inputSchema: FindRelatedNotesSchema,
    },
    {
        name: 'vault_note_metadata',
        description: '특정 노트의 메타데이터를 조회합니다.',
        inputSchema: GetNoteMetadataSchema,
    },
    {
        name: 'vault_build_index',
        description: '볼트 인덱스를 빌드/리빌드합니다.',
        inputSchema: BuildIndexSchema,
    },
    {
        name: 'vault_stats',
        description: '볼트 통계를 조회합니다.',
        inputSchema: GetVaultStatsSchema,
    },
    {
        name: 'canvas_find_related',
        description: '특정 캔버스와 관련된 다른 캔버스들을 찾습니다.',
        inputSchema: FindRelatedCanvasesSchema,
    },
    {
        name: 'canvas_search',
        description: '키워드로 캔버스를 검색합니다.',
        inputSchema: SearchCanvasesSchema,
    },
    {
        name: 'canvas_network',
        description: '캔버스 네트워크 그래프 데이터를 조회합니다.',
        inputSchema: GetCanvasNetworkSchema,
    },
    {
        name: 'canvas_suggest_links',
        description: '캔버스에 추가할 링크를 제안합니다.',
        inputSchema: SuggestLinksSchema,
    },
    {
        name: 'crossref_stats',
        description: '크로스 레퍼런스 통계를 조회합니다.',
        inputSchema: GetCrossRefStatsSchema,
    },
];
//# sourceMappingURL=vault-tools.js.map