/**
 * Vault Index Types
 *
 * 볼트 내 노트를 인덱싱하여 빠른 검색을 지원합니다.
 */

// =============================================================================
// Note Metadata
// =============================================================================

export interface NoteMetadata {
  path: string;              // 상대 경로
  title: string;             // 제목 (# 헤딩 또는 파일명)
  tags: string[];            // #태그들
  links: string[];           // [[위키링크]]들
  backlinks: string[];       // 이 노트를 참조하는 노트들
  keywords: string[];        // 추출된 키워드
  createdAt?: string;        // Created 프론트매터
  modifiedAt: number;        // 파일 mtime
  size: number;              // 파일 크기 (bytes)
}

// =============================================================================
// Vault Index
// =============================================================================

export interface VaultIndex {
  version: string;
  indexedAt: string;
  vaultPath: string;
  notes: Record<string, NoteMetadata>;  // path -> metadata
  tagIndex: Record<string, string[]>;    // tag -> [paths]
  keywordIndex: Record<string, string[]>; // keyword -> [paths]
}

// =============================================================================
// Search Options
// =============================================================================

export interface SearchOptions {
  limit?: number;
  tags?: string[];
  paths?: string[];  // 특정 디렉토리만 검색
}

// =============================================================================
// Search Result
// =============================================================================

export interface SearchResult {
  note: NoteMetadata;
  score: number;
  matchedKeywords?: string[];
  matchedTags?: string[];
}

// =============================================================================
// Cross Reference Types
// =============================================================================

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
  sharedKeywords: Record<string, string[]>;  // keyword -> [canvas paths]
  relatedCanvases: Record<string, Array<[string, number]>>; // canvas -> [(related, score)]
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
