/**
 * Dashboard Tools
 *
 * 워크플로우 진행 상황 모니터링 및 대시보드를 위한 MCP 도구들
 */
import { z } from 'zod';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { MetaManager, VaultIndexer, CrossReferenceManager } from '../engine/index.js';
// =============================================================================
// Tool Schemas
// =============================================================================
export const GetDashboardSchema = z.object({
    format: z.enum(['summary', 'detailed', 'json']).optional().describe('출력 형식'),
});
export const GetWorkflowProgressSchema = z.object({
    canvasPath: z.string().describe('캔버스 경로'),
});
export const ListCanvasesSchema = z.object({
    state: z.enum(['created', 'expanded', 'crystallized', 'atomized', 'archived', 'all']).optional()
        .describe('워크플로우 상태 필터'),
    limit: z.number().optional().describe('결과 개수 제한'),
});
export const GetActivityLogSchema = z.object({
    canvasPath: z.string().optional().describe('특정 캔버스 경로 (없으면 전체)'),
    limit: z.number().optional().describe('이벤트 개수 제한'),
});
export const GetPendingTasksSchema = z.object({});
export const GetSystemHealthSchema = z.object({});
// =============================================================================
// Tool Implementations
// =============================================================================
export class DashboardTools {
    canvasDir;
    metaManager;
    vaultIndexer;
    crossRefManager;
    constructor(canvasDir = '03_Canvas', vaultPath = '.') {
        this.canvasDir = canvasDir;
        this.metaManager = new MetaManager(canvasDir);
        this.vaultIndexer = new VaultIndexer(vaultPath);
        this.crossRefManager = new CrossReferenceManager(canvasDir);
    }
    /**
     * 전체 대시보드 정보 조회
     */
    async getDashboard(params) {
        const { format: _format = 'summary' } = params;
        // 모든 캔버스 목록 가져오기
        const canvasList = await this.findCanvases();
        const byState = {
            created: 0,
            expanded: 0,
            crystallized: 0,
            atomized: 0,
            archived: 0,
        };
        const recentActivity = [];
        const topCanvases = [];
        let pendingQuestions = 0;
        for (const canvasPath of canvasList) {
            try {
                const meta = await this.metaManager.load(canvasPath, false);
                // 상태별 집계
                byState[meta.workflow.state] = (byState[meta.workflow.state] || 0) + 1;
                // 미해결 질문 집계
                pendingQuestions += meta.statistics.questions - meta.statistics.resolvedQuestions;
                // 최근 활동 수집
                if (meta.workflow.history.length > 0) {
                    const lastAction = meta.workflow.history[meta.workflow.history.length - 1];
                    recentActivity.push({
                        canvas: canvasPath,
                        action: lastAction.action,
                        timestamp: lastAction.timestamp,
                    });
                }
                // 상위 캔버스 정보
                topCanvases.push({
                    path: canvasPath,
                    topic: canvasPath.split('/').pop()?.replace('.canvas', '') || '',
                    nodeCount: meta.statistics.totalNodes,
                    state: meta.workflow.state,
                });
            }
            catch {
                // 메타 파일 없는 캔버스
                byState.created = (byState.created || 0) + 1;
            }
        }
        // 최근 활동 정렬
        recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // 상위 캔버스 정렬 (노드 수 기준)
        topCanvases.sort((a, b) => b.nodeCount - a.nodeCount);
        // 볼트 통계
        let totalNotes = 0;
        try {
            const vaultStats = await this.vaultIndexer.getStatistics();
            totalNotes = vaultStats.totalNotes;
        }
        catch {
            // 인덱스 없음
        }
        return {
            overview: {
                totalCanvases: canvasList.length,
                activeCanvases: byState.created + byState.expanded,
                completedCanvases: byState.crystallized + byState.atomized,
                pendingQuestions,
                totalNotes,
            },
            byState,
            recentActivity: recentActivity.slice(0, 10),
            topCanvases: topCanvases.slice(0, 10),
        };
    }
    /**
     * 특정 캔버스의 워크플로우 진행 상황
     */
    async getWorkflowProgress(params) {
        const { canvasPath } = params;
        const meta = await this.metaManager.load(canvasPath);
        // 완료율 계산
        const stateProgress = {
            created: 20,
            expanded: 50,
            crystallized: 80,
            atomized: 100,
            archived: 100,
        };
        const completionPercent = stateProgress[meta.workflow.state] || 0;
        // 다음 단계 제안
        const nextSteps = [];
        switch (meta.workflow.state) {
            case 'created':
                nextSteps.push('웹 검색을 통해 캔버스를 확장하세요');
                nextSteps.push('질문 노드에 답변을 추가하세요');
                break;
            case 'expanded':
                if (meta.statistics.questions > meta.statistics.resolvedQuestions) {
                    nextSteps.push(`${meta.statistics.questions - meta.statistics.resolvedQuestions}개의 미해결 질문이 있습니다`);
                }
                nextSteps.push('충분히 탐색했다면 결정화를 진행하세요');
                break;
            case 'crystallized':
                nextSteps.push('원자 노트로 분해할 준비가 되었습니다');
                break;
            case 'atomized':
            case 'archived':
                nextSteps.push('완료된 캔버스입니다');
                break;
        }
        return {
            canvasPath,
            currentState: meta.workflow.state,
            completionPercent,
            statistics: meta.statistics,
            history: meta.workflow.history.map((h) => ({
                action: h.action,
                agent: h.agent,
                timestamp: h.timestamp,
            })),
            nextSteps,
        };
    }
    /**
     * 캔버스 목록 조회
     */
    async listCanvases(params) {
        const { state = 'all', limit = 50 } = params;
        const canvasList = await this.findCanvases();
        const results = [];
        for (const canvasPath of canvasList) {
            try {
                const meta = await this.metaManager.load(canvasPath, false);
                if (state !== 'all' && meta.workflow.state !== state) {
                    continue;
                }
                const lastAction = meta.workflow.history[meta.workflow.history.length - 1];
                results.push({
                    path: canvasPath,
                    topic: canvasPath.split('/').pop()?.replace('.canvas', '') || '',
                    state: meta.workflow.state,
                    nodeCount: meta.statistics.totalNodes,
                    lastActivity: lastAction?.timestamp || meta.createdAt,
                });
            }
            catch {
                if (state === 'all' || state === 'created') {
                    results.push({
                        path: canvasPath,
                        topic: canvasPath.split('/').pop()?.replace('.canvas', '') || '',
                        state: 'created',
                        nodeCount: 0,
                        lastActivity: '',
                    });
                }
            }
        }
        // 최근 활동순 정렬
        results.sort((a, b) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime());
        return {
            canvases: results.slice(0, limit),
            total: results.length,
        };
    }
    /**
     * 활동 로그 조회
     */
    async getActivityLog(params) {
        const { canvasPath, limit = 20 } = params;
        const events = [];
        if (canvasPath) {
            // 특정 캔버스만
            try {
                const meta = await this.metaManager.load(canvasPath);
                for (const action of meta.workflow.history) {
                    events.push({
                        canvas: canvasPath,
                        action: action.action,
                        agent: action.agent,
                        timestamp: action.timestamp,
                        details: action.details,
                    });
                }
            }
            catch {
                // 메타 없음
            }
        }
        else {
            // 모든 캔버스
            const canvasList = await this.findCanvases();
            for (const path of canvasList) {
                try {
                    const meta = await this.metaManager.load(path, false);
                    for (const action of meta.workflow.history) {
                        events.push({
                            canvas: path,
                            action: action.action,
                            agent: action.agent,
                            timestamp: action.timestamp,
                            details: action.details,
                        });
                    }
                }
                catch {
                    // 메타 없음
                }
            }
        }
        // 시간순 정렬 (최신 먼저)
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return {
            events: events.slice(0, limit),
        };
    }
    /**
     * 대기 중인 작업 목록
     */
    async getPendingTasks(_params) {
        const canvasList = await this.findCanvases();
        const tasks = [];
        for (const canvasPath of canvasList) {
            try {
                // 미해결 질문
                const questions = await this.metaManager.getPendingQuestions(canvasPath);
                for (const qId of questions) {
                    tasks.push({
                        canvas: canvasPath,
                        type: 'question',
                        nodeId: qId,
                        description: '미해결 질문',
                    });
                }
                // Intent 노드
                const intents = await this.metaManager.getIntentNodes(canvasPath);
                for (const intent of intents) {
                    tasks.push({
                        canvas: canvasPath,
                        type: 'intent',
                        nodeId: intent.id,
                        description: `Intent: ${intent.intent}`,
                    });
                }
            }
            catch {
                // 메타 없음
            }
        }
        return {
            tasks: tasks.slice(0, 50),
            totalPending: tasks.length,
        };
    }
    /**
     * 시스템 상태 확인
     */
    async getSystemHealth(_params) {
        const components = {
            canvasDir: false,
            vaultIndex: false,
            crossRefIndex: false,
            metaDir: false,
        };
        const lastIndexed = {
            vault: null,
            crossRef: null,
        };
        const recommendations = [];
        // 캔버스 디렉토리 확인
        try {
            await stat(this.canvasDir);
            components.canvasDir = true;
        }
        catch {
            recommendations.push(`캔버스 디렉토리(${this.canvasDir})가 없습니다`);
        }
        // 메타 디렉토리 확인
        try {
            await stat(join(this.canvasDir, '.meta'));
            components.metaDir = true;
        }
        catch {
            recommendations.push('메타 디렉토리가 없습니다. 첫 캔버스 생성 시 자동 생성됩니다');
        }
        // 볼트 인덱스 확인
        try {
            const vaultStats = await this.vaultIndexer.getStatistics();
            components.vaultIndex = true;
            lastIndexed.vault = vaultStats.indexedAt;
        }
        catch {
            recommendations.push('볼트 인덱스를 빌드하세요: vault_build_index');
        }
        // 크로스 레퍼런스 인덱스 확인
        try {
            await this.crossRefManager.getStatistics();
            components.crossRefIndex = true;
        }
        catch {
            recommendations.push('크로스 레퍼런스 인덱스를 빌드하세요');
        }
        // 전체 상태 결정
        const componentValues = Object.values(components);
        const healthyCount = componentValues.filter(Boolean).length;
        let status;
        if (healthyCount === componentValues.length) {
            status = 'healthy';
        }
        else if (healthyCount >= 2) {
            status = 'degraded';
        }
        else {
            status = 'unhealthy';
        }
        return {
            status,
            components,
            lastIndexed,
            recommendations,
        };
    }
    // ===========================================================================
    // Helper Methods
    // ===========================================================================
    async findCanvases() {
        const canvases = [];
        const scanDir = async (dir) => {
            try {
                const entries = await readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = join(dir, entry.name);
                    if (entry.isDirectory() && !entry.name.startsWith('.')) {
                        await scanDir(fullPath);
                    }
                    else if (entry.isFile() && extname(entry.name) === '.canvas') {
                        canvases.push(fullPath);
                    }
                }
            }
            catch {
                // 디렉토리 없음
            }
        };
        await scanDir(this.canvasDir);
        return canvases;
    }
}
// =============================================================================
// Tool Definitions (for MCP registration)
// =============================================================================
export const dashboardToolDefinitions = [
    {
        name: 'dashboard_overview',
        description: '전체 워크플로우 대시보드를 조회합니다.',
        inputSchema: GetDashboardSchema,
    },
    {
        name: 'dashboard_progress',
        description: '특정 캔버스의 워크플로우 진행 상황을 조회합니다.',
        inputSchema: GetWorkflowProgressSchema,
    },
    {
        name: 'dashboard_list_canvases',
        description: '캔버스 목록을 조회합니다.',
        inputSchema: ListCanvasesSchema,
    },
    {
        name: 'dashboard_activity',
        description: '워크플로우 활동 로그를 조회합니다.',
        inputSchema: GetActivityLogSchema,
    },
    {
        name: 'dashboard_pending',
        description: '대기 중인 작업(미해결 질문, Intent) 목록을 조회합니다.',
        inputSchema: GetPendingTasksSchema,
    },
    {
        name: 'dashboard_health',
        description: '시스템 상태를 확인합니다.',
        inputSchema: GetSystemHealthSchema,
    },
];
//# sourceMappingURL=dashboard-tools.js.map