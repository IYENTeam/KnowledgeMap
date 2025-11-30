/**
 * Vault Index Types
 *
 * 볼트 내 노트를 인덱싱하여 빠른 검색을 지원합니다.
 */
export interface NoteMetadata {
    path: string;
    title: string;
    tags: string[];
    links: string[];
    backlinks: string[];
    keywords: string[];
    createdAt?: string;
    modifiedAt: number;
    size: number;
}
export interface VaultIndex {
    version: string;
    indexedAt: string;
    vaultPath: string;
    notes: Record<string, NoteMetadata>;
    tagIndex: Record<string, string[]>;
    keywordIndex: Record<string, string[]>;
}
export interface SearchOptions {
    limit?: number;
    tags?: string[];
    paths?: string[];
}
export interface SearchResult {
    note: NoteMetadata;
    score: number;
    matchedKeywords?: string[];
    matchedTags?: string[];
}
export interface CanvasReference {
    canvasPath: string;
    topic: string;
    keywords: string[];
    linkedNotes: string[];
    linkedCanvases: string[];
    questions: string[];
    nodeCount: number;
    edgeCount: number;
    workflowState: string;
    createdAt?: string;
    updatedAt?: string;
}
export interface CrossReferenceIndex {
    version: string;
    indexedAt: string;
    canvases: Record<string, CanvasReference>;
    sharedKeywords: Record<string, string[]>;
    relatedCanvases: Record<string, Array<[string, number]>>;
}
export interface CanvasNetworkNode {
    id: string;
    topic: string;
    size: number;
    state: string;
}
export interface CanvasNetworkEdge {
    source: string;
    target: string;
    weight: number;
}
export interface CanvasNetwork {
    nodes: CanvasNetworkNode[];
    edges: CanvasNetworkEdge[];
}
//# sourceMappingURL=vault.d.ts.map