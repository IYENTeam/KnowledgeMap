/**
 * Vault Tools
 *
 * 볼트 인덱싱, 노트 검색, 크로스 레퍼런스를 위한 MCP 도구들
 */
import { z } from 'zod';
export declare const SearchNotesSchema: z.ZodObject<{
    query: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<["keyword", "tag", "title"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    type?: "title" | "tag" | "keyword" | undefined;
    limit?: number | undefined;
}, {
    query: string;
    type?: "title" | "tag" | "keyword" | undefined;
    limit?: number | undefined;
}>;
export declare const FindRelatedNotesSchema: z.ZodObject<{
    keywords: z.ZodArray<z.ZodString, "many">;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    keywords: string[];
    limit?: number | undefined;
}, {
    keywords: string[];
    limit?: number | undefined;
}>;
export declare const GetNoteMetadataSchema: z.ZodObject<{
    notePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    notePath: string;
}, {
    notePath: string;
}>;
export declare const BuildIndexSchema: z.ZodObject<{
    force: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    force?: boolean | undefined;
}, {
    force?: boolean | undefined;
}>;
export declare const GetVaultStatsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const FindRelatedCanvasesSchema: z.ZodObject<{
    canvasPath: z.ZodString;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
    limit?: number | undefined;
}, {
    canvasPath: string;
    limit?: number | undefined;
}>;
export declare const SearchCanvasesSchema: z.ZodObject<{
    keyword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    keyword: string;
}, {
    keyword: string;
}>;
export declare const GetCanvasNetworkSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const SuggestLinksSchema: z.ZodObject<{
    canvasPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
}, {
    canvasPath: string;
}>;
export declare const GetCrossRefStatsSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare class VaultTools {
    private readonly vaultIndexer;
    private readonly crossRefManager;
    constructor(vaultPath?: string, canvasDir?: string);
    /**
     * 노트 검색
     */
    searchNotes(params: z.infer<typeof SearchNotesSchema>): Promise<{
        results: Array<{
            path: string;
            title: string;
            score: number;
            matchedKeywords?: string[];
            matchedTags?: string[];
        }>;
        totalFound: number;
    }>;
    /**
     * 여러 키워드로 관련 노트 찾기
     */
    findRelatedNotes(params: z.infer<typeof FindRelatedNotesSchema>): Promise<{
        results: Array<{
            path: string;
            title: string;
            score: number;
            matchedKeywords: string[];
        }>;
    }>;
    /**
     * 노트 메타데이터 조회
     */
    getNoteMetadata(params: z.infer<typeof GetNoteMetadataSchema>): Promise<{
        path: string;
        title: string;
        tags: string[];
        links: string[];
        backlinks: string[];
        keywords: string[];
        createdAt?: string;
        modifiedAt: number;
        size: number;
    } | null>;
    /**
     * 볼트 인덱스 빌드
     */
    buildIndex(params: z.infer<typeof BuildIndexSchema>): Promise<{
        totalNotes: number;
        totalTags: number;
        totalKeywords: number;
        indexedAt: string;
    }>;
    /**
     * 볼트 통계 조회
     */
    getVaultStats(_params: z.infer<typeof GetVaultStatsSchema>): Promise<{
        totalNotes: number;
        totalTags: number;
        totalKeywords: number;
        indexedAt: string;
        topTags: Array<[string, number]>;
    }>;
    /**
     * 관련 캔버스 찾기
     */
    findRelatedCanvases(params: z.infer<typeof FindRelatedCanvasesSchema>): Promise<{
        canvases: Array<{
            path: string;
            score: number;
        }>;
    }>;
    /**
     * 키워드로 캔버스 검색
     */
    searchCanvases(params: z.infer<typeof SearchCanvasesSchema>): Promise<{
        canvases: string[];
    }>;
    /**
     * 캔버스 네트워크 데이터 조회
     */
    getCanvasNetwork(_params: z.infer<typeof GetCanvasNetworkSchema>): Promise<{
        nodes: Array<{
            id: string;
            topic: string;
            size: number;
            state: string;
        }>;
        edges: Array<{
            source: string;
            target: string;
            weight: number;
        }>;
    }>;
    /**
     * 캔버스 링크 제안
     */
    suggestLinks(params: z.infer<typeof SuggestLinksSchema>): Promise<{
        suggestions: Array<{
            canvas: string;
            topic: string;
            reason: string;
            score: number;
        }>;
    }>;
    /**
     * 크로스 레퍼런스 통계
     */
    getCrossRefStats(_params: z.infer<typeof GetCrossRefStatsSchema>): Promise<{
        totalCanvases: number;
        byState: Record<string, number>;
        topSharedKeywords: Array<[string, number]>;
        mostConnected: Array<{
            path: string;
            topic: string;
            connections: number;
        }>;
    }>;
    /**
     * 크로스 레퍼런스 인덱스 빌드
     */
    buildCrossRefIndex(force?: boolean): Promise<{
        totalCanvases: number;
        indexedAt: string;
    }>;
}
export declare const vaultToolDefinitions: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}[];
//# sourceMappingURL=vault-tools.d.ts.map