/**
 * Canvas Meta Manager
 *
 * Sidecar 패턴으로 캔버스 메타데이터를 관리합니다.
 * 캔버스 파일의 순수성을 보존하면서 워크플로우 상태를 추적합니다.
 */
import { readFile, writeFile, mkdir, stat, access } from 'fs/promises';
import { basename, join } from 'path';
import { createDefaultMeta } from '../types/index.js';
import { CanvasParser } from './canvas-parser.js';
// =============================================================================
// Meta Manager Class
// =============================================================================
export class MetaManager {
    metaDir;
    constructor(canvasDir = '03_Canvas') {
        this.metaDir = join(canvasDir, '.meta');
    }
    // ===========================================================================
    // Path Helpers
    // ===========================================================================
    getMetaPath(canvasPath) {
        const canvasName = basename(canvasPath, '.canvas');
        return join(this.metaDir, `${canvasName}.meta.json`);
    }
    async ensureMetaDir() {
        await mkdir(this.metaDir, { recursive: true });
    }
    // ===========================================================================
    // CRUD Operations
    // ===========================================================================
    /**
     * 메타 파일 존재 여부 확인
     */
    async exists(canvasPath) {
        try {
            await access(this.getMetaPath(canvasPath));
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * 메타데이터 로드
     */
    async load(canvasPath, autoCreate = true) {
        const metaPath = this.getMetaPath(canvasPath);
        try {
            const content = await readFile(metaPath, 'utf-8');
            const meta = JSON.parse(content);
            // 동기화 확인
            try {
                const canvasStat = await stat(canvasPath);
                if (canvasStat.mtimeMs > meta.syncedAt) {
                    // 캔버스가 외부에서 수정됨 → Re-index
                    return await this.reindex(canvasPath, meta);
                }
            }
            catch {
                // 캔버스 파일 없음 - 메타만 반환
            }
            return meta;
        }
        catch {
            if (autoCreate) {
                return await this.create(canvasPath);
            }
            throw new Error(`Meta file not found: ${metaPath}`);
        }
    }
    /**
     * 메타데이터 저장
     */
    async save(canvasPath, meta) {
        await this.ensureMetaDir();
        const metaPath = this.getMetaPath(canvasPath);
        // 업데이트 시간 갱신
        meta.updatedAt = new Date().toISOString();
        meta.syncedAt = Date.now();
        await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    }
    /**
     * 새 메타데이터 생성
     */
    async create(canvasPath) {
        await this.ensureMetaDir();
        const meta = createDefaultMeta(canvasPath);
        // 캔버스 파일이 존재하면 초기 인덱싱
        try {
            await access(canvasPath);
            const indexed = await this.indexCanvas(canvasPath, meta);
            await this.save(canvasPath, indexed);
            return indexed;
        }
        catch {
            // 캔버스 파일 없음 - 빈 메타 저장
            await this.save(canvasPath, meta);
            return meta;
        }
    }
    // ===========================================================================
    // Indexing
    // ===========================================================================
    /**
     * 캔버스 파일에서 메타데이터 추출
     */
    async indexCanvas(canvasPath, meta) {
        const canvas = await CanvasParser.load(canvasPath);
        const nodes = canvas.nodes;
        // 통계 초기화
        meta.statistics = {
            totalNodes: nodes.length,
            questions: 0,
            resolvedQuestions: 0,
            webLinks: 0,
            vaultNotes: 0,
        };
        // 각 노드 분석
        for (const node of nodes) {
            const role = this.inferNodeRole(node);
            let status = 'active';
            let intent;
            // Text 노드 특수 처리
            if (node.type === 'text') {
                const text = node.text;
                const color = node.color;
                // Intent Node 감지 (Red 노드)
                if (color === '1' && text.includes(':')) {
                    const parts = text.split(':');
                    const action = parts[0].trim().toUpperCase();
                    if (['RESEARCH', 'EXPAND', 'ANSWER', 'LINK', 'ATOMIZE', 'CRYSTALLIZE'].includes(action)) {
                        intent = action;
                        status = 'pending';
                    }
                }
                // 질문 노드 감지
                if (text.includes('?') || color === '4') {
                    meta.statistics.questions++;
                    status = 'pending';
                }
            }
            // 파일/링크 통계
            if (node.type === 'file') {
                meta.statistics.vaultNotes++;
            }
            else if (node.type === 'link') {
                meta.statistics.webLinks++;
            }
            else if (node.type === 'text' && node.text.includes('](http')) {
                meta.statistics.webLinks++;
            }
            // semantic_graph에 추가
            meta.semanticGraph[node.id] = {
                role,
                status,
                intent,
                createdAt: meta.createdAt,
            };
        }
        return meta;
    }
    /**
     * 노드의 역할 추론
     */
    inferNodeRole(node) {
        const color = node.color;
        // 색상 기반 추론
        const colorRoles = {
            '1': 'command', // Red
            '2': 'context', // Orange
            '3': 'answer', // Yellow
            '4': 'question', // Green
            '5': 'resource', // Cyan
            '6': 'topic', // Purple
        };
        if (color && color in colorRoles) {
            // Red + ":" 는 command, 아니면 vaultNote
            if (color === '1' && node.type === 'text' && !node.text.includes(':')) {
                return 'vaultNote';
            }
            return colorRoles[color];
        }
        // 텍스트 기반 추론
        if (node.type === 'text') {
            if (node.text.startsWith('# '))
                return 'topic';
            if (node.text.includes('?'))
                return 'question';
        }
        if (node.type === 'file')
            return 'vaultNote';
        if (node.type === 'link')
            return 'resource';
        return 'content';
    }
    /**
     * 캔버스 변경 시 메타데이터 재구축
     */
    async reindex(canvasPath, oldMeta) {
        const canvas = await CanvasParser.load(canvasPath);
        const nodes = canvas.nodes;
        const currentIds = new Set(nodes.map((n) => n.id));
        const knownIds = new Set(Object.keys(oldMeta.semanticGraph));
        // 새 노드 추가
        for (const node of nodes) {
            if (!knownIds.has(node.id)) {
                const role = this.inferNodeRole(node);
                oldMeta.semanticGraph[node.id] = {
                    role,
                    status: 'active',
                    createdAt: new Date().toISOString(),
                };
            }
        }
        // 삭제된 노드 제거
        for (const nodeId of knownIds) {
            if (!currentIds.has(nodeId)) {
                delete oldMeta.semanticGraph[nodeId];
            }
        }
        // 통계 재계산
        const reindexed = await this.indexCanvas(canvasPath, oldMeta);
        reindexed.syncedAt = Date.now();
        return reindexed;
    }
    // ===========================================================================
    // Workflow Actions
    // ===========================================================================
    /**
     * 워크플로우 이력 추가
     */
    async addWorkflowAction(canvasPath, action, agent, details = {}) {
        const meta = await this.load(canvasPath);
        const workflowAction = {
            action,
            agent,
            timestamp: new Date().toISOString(),
            details,
        };
        meta.workflow.history.push(workflowAction);
        // 상태 업데이트
        const stateMap = {
            created: 'created',
            expanded: 'expanded',
            crystallized: 'crystallized',
            atomized: 'atomized',
            archived: 'archived',
        };
        if (action in stateMap) {
            meta.workflow.state = stateMap[action];
        }
        await this.save(canvasPath, meta);
    }
    /**
     * 질문 노드를 해결됨으로 표시
     */
    async markQuestionResolved(canvasPath, questionId, resolvedBy) {
        const meta = await this.load(canvasPath);
        if (meta.semanticGraph[questionId]) {
            meta.semanticGraph[questionId].status = 'resolved';
            meta.semanticGraph[questionId].resolvedBy = resolvedBy;
            meta.statistics.resolvedQuestions++;
        }
        await this.save(canvasPath, meta);
    }
    // ===========================================================================
    // Query Methods
    // ===========================================================================
    /**
     * 미해결 질문 노드 ID 목록
     */
    async getPendingQuestions(canvasPath) {
        const meta = await this.load(canvasPath);
        return Object.entries(meta.semanticGraph)
            .filter(([_, nodeMeta]) => nodeMeta.role === 'question' && nodeMeta.status === 'pending')
            .map(([nodeId]) => nodeId);
    }
    /**
     * Intent Node 목록 (처리 대기 중인 것만)
     */
    async getIntentNodes(canvasPath) {
        const meta = await this.load(canvasPath);
        return Object.entries(meta.semanticGraph)
            .filter(([_, nodeMeta]) => nodeMeta.intent && nodeMeta.status === 'pending')
            .map(([nodeId, nodeMeta]) => ({
            id: nodeId,
            intent: nodeMeta.intent,
        }));
    }
    /**
     * 워크플로우 상태 조회
     */
    async getWorkflowState(canvasPath) {
        const meta = await this.load(canvasPath);
        return meta.workflow.state;
    }
    /**
     * 통계 조회
     */
    async getStatistics(canvasPath) {
        const meta = await this.load(canvasPath);
        return meta.statistics;
    }
}
//# sourceMappingURL=meta-manager.js.map