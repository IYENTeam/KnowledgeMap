/**
 * Canvas Tools
 *
 * 캔버스 생성, 확장, 결정화를 위한 MCP 도구들
 */
import { z } from 'zod';
export declare const CreateCanvasSchema: z.ZodObject<{
    topic: z.ZodString;
    canvasPath: z.ZodOptional<z.ZodString>;
    relatedKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    initialQuestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    topic: string;
    canvasPath?: string | undefined;
    relatedKeywords?: string[] | undefined;
    initialQuestions?: string[] | undefined;
}, {
    topic: string;
    canvasPath?: string | undefined;
    relatedKeywords?: string[] | undefined;
    initialQuestions?: string[] | undefined;
}>;
export declare const ExpandCanvasSchema: z.ZodObject<{
    canvasPath: z.ZodString;
    anchorId: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        relation: z.ZodString;
        type: z.ZodEnum<["text", "file", "link"]>;
        content: z.ZodString;
        color: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "text" | "file" | "link";
        content: string;
        relation: string;
        color?: string | undefined;
    }, {
        type: "text" | "file" | "link";
        content: string;
        relation: string;
        color?: string | undefined;
    }>, "many">;
    useTopicAsAnchor: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    anchorId: string;
    canvasPath: string;
    items: {
        type: "text" | "file" | "link";
        content: string;
        relation: string;
        color?: string | undefined;
    }[];
    useTopicAsAnchor?: boolean | undefined;
}, {
    anchorId: string;
    canvasPath: string;
    items: {
        type: "text" | "file" | "link";
        content: string;
        relation: string;
        color?: string | undefined;
    }[];
    useTopicAsAnchor?: boolean | undefined;
}>;
export declare const AddNodeSchema: z.ZodObject<{
    canvasPath: z.ZodString;
    anchorId: z.ZodString;
    relation: z.ZodString;
    type: z.ZodEnum<["text", "file", "link"]>;
    content: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
    useTopicAsAnchor: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    anchorId: string;
    canvasPath: string;
    type: "text" | "file" | "link";
    content: string;
    relation: string;
    color?: string | undefined;
    useTopicAsAnchor?: boolean | undefined;
}, {
    anchorId: string;
    canvasPath: string;
    type: "text" | "file" | "link";
    content: string;
    relation: string;
    color?: string | undefined;
    useTopicAsAnchor?: boolean | undefined;
}>;
export declare const GetCanvasInfoSchema: z.ZodObject<{
    canvasPath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
}, {
    canvasPath: string;
}>;
export declare const ListQuestionsSchema: z.ZodObject<{
    canvasPath: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["pending", "resolved", "all"]>>;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
    status?: "pending" | "resolved" | "all" | undefined;
}, {
    canvasPath: string;
    status?: "pending" | "resolved" | "all" | undefined;
}>;
export declare const ResolveQuestionSchema: z.ZodObject<{
    canvasPath: z.ZodString;
    questionId: z.ZodString;
    answerIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
    questionId: string;
    answerIds: string[];
}, {
    canvasPath: string;
    questionId: string;
    answerIds: string[];
}>;
export declare const CrystallizeCanvasSchema: z.ZodObject<{
    canvasPath: z.ZodString;
    outputPath: z.ZodOptional<z.ZodString>;
    format: z.ZodOptional<z.ZodEnum<["summary", "detailed", "outline"]>>;
}, "strip", z.ZodTypeAny, {
    canvasPath: string;
    outputPath?: string | undefined;
    format?: "summary" | "detailed" | "outline" | undefined;
}, {
    canvasPath: string;
    outputPath?: string | undefined;
    format?: "summary" | "detailed" | "outline" | undefined;
}>;
export declare class CanvasTools {
    private readonly canvasDir;
    private readonly metaManager;
    private readonly vaultIndexer;
    constructor(canvasDir?: string, vaultPath?: string);
    /**
     * 새 캔버스 생성
     */
    createCanvas(params: z.infer<typeof CreateCanvasSchema>): Promise<{
        canvasPath: string;
        topicNodeId: string;
        nodeCount: number;
        edgeCount: number;
    }>;
    /**
     * 캔버스 확장 (여러 노드 추가)
     */
    expandCanvas(params: z.infer<typeof ExpandCanvasSchema>): Promise<{
        addedNodes: string[];
        addedEdges: number;
        usedTopicAnchor?: boolean;
    }>;
    /**
     * 단일 노드 추가
     */
    addNode(params: z.infer<typeof AddNodeSchema>): Promise<{
        nodeId: string;
        edgeId: string | null;
        zone: string;
        usedTopicAnchor?: boolean;
    }>;
    /**
     * 캔버스 정보 조회
     */
    getCanvasInfo(params: z.infer<typeof GetCanvasInfoSchema>): Promise<{
        topic: string;
        nodeCount: number;
        edgeCount: number;
        workflowState: string;
        statistics: {
            totalNodes: number;
            questions: number;
            resolvedQuestions: number;
            webLinks: number;
            vaultNotes: number;
        };
        nodes: Array<{
            id: string;
            type: string;
            preview: string;
            color?: string;
        }>;
    }>;
    /**
     * 질문 노드 목록 조회
     */
    listQuestions(params: z.infer<typeof ListQuestionsSchema>): Promise<{
        questions: Array<{
            id: string;
            text: string;
            status: string;
            resolvedBy?: string[];
        }>;
    }>;
    /**
     * 질문 해결됨 표시
     */
    resolveQuestion(params: z.infer<typeof ResolveQuestionSchema>): Promise<{
        success: boolean;
        questionId: string;
    }>;
    /**
     * 캔버스 결정화 (노트로 변환)
     */
    crystallizeCanvas(params: z.infer<typeof CrystallizeCanvasSchema>): Promise<{
        outputPath: string;
        sections: number;
        wordCount: number;
    }>;
    private sanitizeFilename;
}
export declare const canvasToolDefinitions: ({
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        topic: z.ZodString;
        canvasPath: z.ZodOptional<z.ZodString>;
        relatedKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        initialQuestions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        topic: string;
        canvasPath?: string | undefined;
        relatedKeywords?: string[] | undefined;
        initialQuestions?: string[] | undefined;
    }, {
        topic: string;
        canvasPath?: string | undefined;
        relatedKeywords?: string[] | undefined;
        initialQuestions?: string[] | undefined;
    }>;
} | {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        canvasPath: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        canvasPath: string;
    }, {
        canvasPath: string;
    }>;
})[];
//# sourceMappingURL=canvas-tools.d.ts.map