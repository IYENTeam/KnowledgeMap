/**
 * Dashboard Tools
 *
 * 워크플로우 진행 상황 모니터링 및 대시보드를 위한 MCP 도구들
 */
import { z } from 'zod';
import type { WorkflowState } from '../types/index.js';
export declare const GetDashboardSchema: z.ZodObject<{
    format: z.ZodOptional<z.ZodEnum<["summary", "detailed", "json"]>>;
}, "strip", z.ZodTypeAny, {
    format?: "summary" | "detailed" | "json" | undefined;
}, {
    format?: "summary" | "detailed" | "json" | undefined;
}>;
export declare const GetWorkflowProgressSchema: z.ZodObject<{
    canvasPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
}, {
    canvasPath: string;
}>;
export declare const ListCanvasesSchema: z.ZodObject<{
    state: z.ZodOptional<z.ZodEnum<["created", "expanded", "crystallized", "atomized", "archived", "all"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number | undefined;
    state?: "created" | "expanded" | "crystallized" | "atomized" | "archived" | "all" | undefined;
}, {
    limit?: number | undefined;
    state?: "created" | "expanded" | "crystallized" | "atomized" | "archived" | "all" | undefined;
}>;
export declare const GetActivityLogSchema: z.ZodObject<{
    canvasPath: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    canvasPath?: string | undefined;
    limit?: number | undefined;
}, {
    canvasPath?: string | undefined;
    limit?: number | undefined;
}>;
export declare const GetPendingTasksSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare const GetSystemHealthSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
export declare class DashboardTools {
    private readonly canvasDir;
    private readonly metaManager;
    private readonly vaultIndexer;
    private readonly crossRefManager;
    constructor(canvasDir?: string, vaultPath?: string);
    /**
     * 전체 대시보드 정보 조회
     */
    getDashboard(params: z.infer<typeof GetDashboardSchema>): Promise<{
        overview: {
            totalCanvases: number;
            activeCanvases: number;
            completedCanvases: number;
            pendingQuestions: number;
            totalNotes: number;
        };
        byState: Record<string, number>;
        recentActivity: Array<{
            canvas: string;
            action: string;
            timestamp: string;
        }>;
        topCanvases: Array<{
            path: string;
            topic: string;
            nodeCount: number;
            state: string;
        }>;
    }>;
    /**
     * 특정 캔버스의 워크플로우 진행 상황
     */
    getWorkflowProgress(params: z.infer<typeof GetWorkflowProgressSchema>): Promise<{
        canvasPath: string;
        currentState: WorkflowState;
        completionPercent: number;
        statistics: {
            totalNodes: number;
            questions: number;
            resolvedQuestions: number;
            webLinks: number;
            vaultNotes: number;
        };
        history: Array<{
            action: string;
            agent: string;
            timestamp: string;
        }>;
        nextSteps: string[];
    }>;
    /**
     * 캔버스 목록 조회
     */
    listCanvases(params: z.infer<typeof ListCanvasesSchema>): Promise<{
        canvases: Array<{
            path: string;
            topic: string;
            state: string;
            nodeCount: number;
            lastActivity: string;
        }>;
        total: number;
    }>;
    /**
     * 활동 로그 조회
     */
    getActivityLog(params: z.infer<typeof GetActivityLogSchema>): Promise<{
        events: Array<{
            canvas: string;
            action: string;
            agent: string;
            timestamp: string;
            details?: Record<string, unknown>;
        }>;
    }>;
    /**
     * 대기 중인 작업 목록
     */
    getPendingTasks(_params: z.infer<typeof GetPendingTasksSchema>): Promise<{
        tasks: Array<{
            canvas: string;
            type: 'question' | 'intent';
            nodeId: string;
            description: string;
        }>;
        totalPending: number;
    }>;
    /**
     * 시스템 상태 확인
     */
    getSystemHealth(_params: z.infer<typeof GetSystemHealthSchema>): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        components: {
            canvasDir: boolean;
            vaultIndex: boolean;
            crossRefIndex: boolean;
            metaDir: boolean;
        };
        lastIndexed: {
            vault: string | null;
            crossRef: string | null;
        };
        recommendations: string[];
    }>;
    private findCanvases;
}
export declare const dashboardToolDefinitions: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
}[];
//# sourceMappingURL=dashboard-tools.d.ts.map