/**
 * Canvas Meta Manager
 *
 * Sidecar 패턴으로 캔버스 메타데이터를 관리합니다.
 * 캔버스 파일의 순수성을 보존하면서 워크플로우 상태를 추적합니다.
 */
import type { CanvasMeta, WorkflowState } from '../types/index.js';
export declare class MetaManager {
    private readonly metaDir;
    constructor(canvasDir?: string);
    private getMetaPath;
    private ensureMetaDir;
    /**
     * 메타 파일 존재 여부 확인
     */
    exists(canvasPath: string): Promise<boolean>;
    /**
     * 메타데이터 로드
     */
    load(canvasPath: string, autoCreate?: boolean): Promise<CanvasMeta>;
    /**
     * 메타데이터 저장
     */
    save(canvasPath: string, meta: CanvasMeta): Promise<void>;
    /**
     * 새 메타데이터 생성
     */
    create(canvasPath: string): Promise<CanvasMeta>;
    /**
     * 캔버스 파일에서 메타데이터 추출
     */
    private indexCanvas;
    /**
     * 노드의 역할 추론
     */
    private inferNodeRole;
    /**
     * 캔버스 변경 시 메타데이터 재구축
     */
    private reindex;
    /**
     * 워크플로우 이력 추가
     */
    addWorkflowAction(canvasPath: string, action: string, agent: string, details?: Record<string, unknown>): Promise<void>;
    /**
     * 질문 노드를 해결됨으로 표시
     */
    markQuestionResolved(canvasPath: string, questionId: string, resolvedBy: string[]): Promise<void>;
    /**
     * 미해결 질문 노드 ID 목록
     */
    getPendingQuestions(canvasPath: string): Promise<string[]>;
    /**
     * Intent Node 목록 (처리 대기 중인 것만)
     */
    getIntentNodes(canvasPath: string): Promise<Array<{
        id: string;
        intent: string;
    }>>;
    /**
     * 워크플로우 상태 조회
     */
    getWorkflowState(canvasPath: string): Promise<WorkflowState>;
    /**
     * 통계 조회
     */
    getStatistics(canvasPath: string): Promise<CanvasMeta['statistics']>;
}
//# sourceMappingURL=meta-manager.d.ts.map