/**
 * Canvas Tools
 *
 * 캔버스 생성, 확장, 결정화를 위한 MCP 도구들
 */
import { z } from 'zod';
import { CanvasParser, LayoutEngine, MetaManager, VaultIndexer, } from '../engine/index.js';
// =============================================================================
// Tool Schemas
// =============================================================================
export const CreateCanvasSchema = z.object({
    topic: z.string().describe('캔버스의 주제'),
    canvasPath: z.string().optional().describe('저장할 캔버스 경로 (기본: 03_Canvas/{topic}.canvas)'),
    relatedKeywords: z.array(z.string()).optional().describe('관련 키워드 목록'),
    initialQuestions: z.array(z.string()).optional().describe('초기 질문 목록'),
});
export const ExpandCanvasSchema = z.object({
    canvasPath: z.string().describe('확장할 캔버스 경로'),
    anchorId: z.string().describe('확장 기준 노드 ID'),
    items: z.array(z.object({
        relation: z.string().describe('의미적 관계 (answers, elaborates, background, etc.)'),
        type: z.enum(['text', 'file', 'link']).describe('노드 타입'),
        content: z.string().describe('노드 내용 (text, file path, or URL)'),
        color: z.string().optional().describe('노드 색상 (1-6)'),
    })).describe('추가할 노드 목록'),
    useTopicAsAnchor: z.boolean().optional().describe('true로 설정하면 anchorId를 무시하고 Topic(CORE) 노드를 기준으로 배치합니다. ' +
        '캔버스 레이아웃의 일관성을 위해 권장됩니다. (기본: false)'),
});
export const AddNodeSchema = z.object({
    canvasPath: z.string().describe('캔버스 경로'),
    anchorId: z.string().describe('기준 노드 ID'),
    relation: z.string().describe('의미적 관계'),
    type: z.enum(['text', 'file', 'link']).describe('노드 타입'),
    content: z.string().describe('노드 내용'),
    color: z.string().optional().describe('노드 색상'),
    useTopicAsAnchor: z.boolean().optional().describe('true로 설정하면 anchorId를 무시하고 Topic(CORE) 노드를 기준으로 배치합니다. (기본: false)'),
});
export const GetCanvasInfoSchema = z.object({
    canvasPath: z.string().describe('캔버스 경로'),
});
export const ListQuestionsSchema = z.object({
    canvasPath: z.string().describe('캔버스 경로'),
    status: z.enum(['pending', 'resolved', 'all']).optional().describe('질문 상태 필터'),
});
export const ResolveQuestionSchema = z.object({
    canvasPath: z.string().describe('캔버스 경로'),
    questionId: z.string().describe('질문 노드 ID'),
    answerIds: z.array(z.string()).describe('답변 노드 ID 목록'),
});
export const CrystallizeCanvasSchema = z.object({
    canvasPath: z.string().describe('결정화할 캔버스 경로'),
    outputPath: z.string().optional().describe('출력 노트 경로 (기본: 01_Inbox/{topic}.md)'),
    format: z.enum(['summary', 'detailed', 'outline']).optional().describe('출력 형식'),
});
// =============================================================================
// Tool Implementations
// =============================================================================
export class CanvasTools {
    canvasDir;
    metaManager;
    vaultIndexer;
    constructor(canvasDir = '03_Canvas', vaultPath = '.') {
        this.canvasDir = canvasDir;
        this.metaManager = new MetaManager(canvasDir);
        this.vaultIndexer = new VaultIndexer(vaultPath);
    }
    /**
     * 새 캔버스 생성
     */
    async createCanvas(params) {
        const { topic, relatedKeywords, initialQuestions } = params;
        const canvasPath = params.canvasPath || `${this.canvasDir}/${this.sanitizeFilename(topic)}.canvas`;
        // 관련 볼트 노트 검색
        let vaultNotes = [];
        if (relatedKeywords && relatedKeywords.length > 0) {
            const results = await this.vaultIndexer.findRelatedNotes(relatedKeywords, { limit: 5 });
            vaultNotes = results.map((r) => r.note.path);
        }
        // Layout Engine으로 초기 레이아웃 생성
        const engine = new LayoutEngine();
        const { nodes, edges } = engine.createInitialLayout(topic, {
            vaultNotes,
            questions: initialQuestions,
        });
        // 캔버스 저장
        await CanvasParser.save(canvasPath, nodes, edges);
        // 메타데이터 생성
        await this.metaManager.create(canvasPath);
        await this.metaManager.addWorkflowAction(canvasPath, 'created', 'canvas-tools', {
            topic,
            keywords: relatedKeywords,
        });
        // Topic 노드 ID 찾기
        const topicNode = nodes.find((n) => n.type === 'text' && n.text?.startsWith('# '));
        return {
            canvasPath,
            topicNodeId: topicNode?.id || nodes[0]?.id || '',
            nodeCount: nodes.length,
            edgeCount: edges.length,
        };
    }
    /**
     * 캔버스 확장 (여러 노드 추가)
     */
    async expandCanvas(params) {
        const { canvasPath, anchorId, items, useTopicAsAnchor } = params;
        // 기존 캔버스 로드
        const canvas = await CanvasParser.load(canvasPath);
        const engine = new LayoutEngine(canvas.nodes, canvas.edges);
        const addedNodes = [];
        // 각 항목에 대해 노드 추가
        for (const item of items) {
            const content = {
                type: item.type,
            };
            switch (item.type) {
                case 'text':
                    content.text = item.content;
                    break;
                case 'file':
                    content.file = item.content;
                    break;
                case 'link':
                    content.url = item.content;
                    break;
            }
            const result = engine.allocateByRelation({
                anchorId,
                relation: item.relation,
                content,
                color: item.color,
                useTopicAsAnchor, // Topic 기준 배치 옵션 전달
            });
            if (result) {
                addedNodes.push(result.node.id);
            }
        }
        // 캔버스 저장
        await CanvasParser.save(canvasPath, engine.getNodes(), engine.getEdges());
        // 워크플로우 액션 기록
        await this.metaManager.addWorkflowAction(canvasPath, 'expanded', 'canvas-tools', {
            anchorId,
            addedCount: addedNodes.length,
            useTopicAsAnchor,
        });
        return {
            addedNodes,
            addedEdges: addedNodes.length,
            usedTopicAnchor: useTopicAsAnchor,
        };
    }
    /**
     * 단일 노드 추가
     */
    async addNode(params) {
        const { canvasPath, anchorId, relation, type, content, color, useTopicAsAnchor } = params;
        const canvas = await CanvasParser.load(canvasPath);
        const engine = new LayoutEngine(canvas.nodes, canvas.edges);
        const contentObj = {
            type,
        };
        switch (type) {
            case 'text':
                contentObj.text = content;
                break;
            case 'file':
                contentObj.file = content;
                break;
            case 'link':
                contentObj.url = content;
                break;
        }
        // allocateByRelation은 이제 항상 결과를 반환하거나 LayoutError를 던짐
        const result = engine.allocateByRelation({
            anchorId,
            relation,
            content: contentObj,
            color,
            useTopicAsAnchor, // Topic 기준 배치 옵션 전달
        });
        await CanvasParser.save(canvasPath, engine.getNodes(), engine.getEdges());
        return {
            nodeId: result.node.id,
            edgeId: result.edge?.id ?? null,
            zone: result.zone,
            usedTopicAnchor: useTopicAsAnchor,
        };
    }
    /**
     * 캔버스 정보 조회
     */
    async getCanvasInfo(params) {
        const { canvasPath } = params;
        const canvas = await CanvasParser.load(canvasPath);
        const meta = await this.metaManager.load(canvasPath);
        // Topic 추출
        let topic = 'Untitled';
        for (const node of canvas.nodes) {
            if (node.type === 'text') {
                const text = node.text;
                if (text?.startsWith('# ')) {
                    topic = text.replace(/^#\s+/, '').trim();
                    break;
                }
            }
        }
        // 노드 요약
        const nodeSummaries = canvas.nodes.slice(0, 20).map((node) => {
            let preview = '';
            if (node.type === 'text') {
                preview = (node.text || '').slice(0, 50);
            }
            else if (node.type === 'file') {
                preview = node.file || '';
            }
            else if (node.type === 'link') {
                preview = node.url || '';
            }
            else if (node.type === 'group') {
                preview = `[Group: ${node.label || 'unnamed'}]`;
            }
            return {
                id: node.id,
                type: node.type,
                preview,
                color: node.color,
            };
        });
        return {
            topic,
            nodeCount: canvas.nodes.length,
            edgeCount: canvas.edges.length,
            workflowState: meta.workflow.state,
            statistics: meta.statistics,
            nodes: nodeSummaries,
        };
    }
    /**
     * 질문 노드 목록 조회
     */
    async listQuestions(params) {
        const { canvasPath, status = 'all' } = params;
        const canvas = await CanvasParser.load(canvasPath);
        const meta = await this.metaManager.load(canvasPath);
        const questions = [];
        for (const node of canvas.nodes) {
            if (node.type !== 'text')
                continue;
            const text = node.text || '';
            const color = node.color;
            const nodeMeta = meta.semanticGraph[node.id];
            // 질문 노드 판별 (? 포함 또는 green 색상 또는 메타에서 question role)
            const isQuestion = text.includes('?') || color === '4' || nodeMeta?.role === 'question';
            if (!isQuestion)
                continue;
            const nodeStatus = nodeMeta?.status || 'pending';
            if (status !== 'all' && status !== nodeStatus)
                continue;
            questions.push({
                id: node.id,
                text: text.slice(0, 100),
                status: nodeStatus,
                resolvedBy: nodeMeta?.resolvedBy,
            });
        }
        return { questions };
    }
    /**
     * 질문 해결됨 표시
     */
    async resolveQuestion(params) {
        const { canvasPath, questionId, answerIds } = params;
        await this.metaManager.markQuestionResolved(canvasPath, questionId, answerIds);
        return {
            success: true,
            questionId,
        };
    }
    /**
     * 캔버스 결정화 (노트로 변환)
     */
    async crystallizeCanvas(params) {
        const { canvasPath, format = 'summary' } = params;
        const canvas = await CanvasParser.load(canvasPath);
        // Topic 추출
        let topic = 'Untitled';
        for (const node of canvas.nodes) {
            if (node.type === 'text') {
                const text = node.text;
                if (text?.startsWith('# ')) {
                    topic = text.replace(/^#\s+/, '').trim();
                    break;
                }
            }
        }
        const outputPath = params.outputPath || `01_Inbox/${this.sanitizeFilename(topic)}.md`;
        // 콘텐츠 수집
        const sections = [];
        // Header
        sections.push(`# ${topic}`);
        sections.push('');
        sections.push(`> Crystallized from: [[${canvasPath}]]`);
        sections.push(`> Created: ${new Date().toISOString().split('T')[0]}`);
        sections.push('');
        // 노드별 콘텐츠 수집 (Zone 기반 정렬)
        const textNodes = canvas.nodes.filter((n) => n.type === 'text');
        if (format === 'outline') {
            // 아웃라인 형식
            sections.push('## Outline');
            sections.push('');
            for (const node of textNodes) {
                const text = node.text || '';
                if (text.startsWith('# '))
                    continue; // Topic 제외
                const line = text.startsWith('##') ? text : `- ${text.slice(0, 100)}`;
                sections.push(line);
            }
        }
        else if (format === 'detailed') {
            // 상세 형식
            sections.push('## Content');
            sections.push('');
            for (const node of textNodes) {
                const text = node.text || '';
                if (text.startsWith('# '))
                    continue;
                sections.push(text);
                sections.push('');
            }
            // 참조 자료
            const fileNodes = canvas.nodes.filter((n) => n.type === 'file');
            if (fileNodes.length > 0) {
                sections.push('## References');
                sections.push('');
                for (const node of fileNodes) {
                    sections.push(`- [[${node.file}]]`);
                }
            }
            const linkNodes = canvas.nodes.filter((n) => n.type === 'link');
            if (linkNodes.length > 0) {
                sections.push('');
                sections.push('## External Links');
                sections.push('');
                for (const node of linkNodes) {
                    sections.push(`- ${node.url}`);
                }
            }
        }
        else {
            // Summary 형식 (기본)
            sections.push('## Summary');
            sections.push('');
            // 주요 포인트만 추출
            const keyPoints = textNodes
                .filter((n) => {
                const text = n.text || '';
                return !text.startsWith('# ') && !text.startsWith('?');
            })
                .slice(0, 10);
            for (const node of keyPoints) {
                const text = (node.text || '').slice(0, 200);
                sections.push(`- ${text}`);
            }
        }
        // 콘텐츠 생성
        const content = sections.join('\n');
        const wordCount = content.split(/\s+/).length;
        // 파일 저장
        const { writeFile, mkdir } = await import('fs/promises');
        const { dirname } = await import('path');
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, content, 'utf-8');
        // 워크플로우 액션 기록
        await this.metaManager.addWorkflowAction(canvasPath, 'crystallized', 'canvas-tools', {
            outputPath,
            format,
        });
        return {
            outputPath,
            sections: sections.filter((s) => s.startsWith('#')).length,
            wordCount,
        };
    }
    // ===========================================================================
    // Helper Methods
    // ===========================================================================
    sanitizeFilename(name) {
        return name
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 100);
    }
}
// =============================================================================
// Tool Definitions (for MCP registration)
// =============================================================================
export const canvasToolDefinitions = [
    {
        name: 'canvas_create',
        description: '새로운 캔버스를 생성합니다. 주제와 관련 키워드를 기반으로 초기 레이아웃을 구성합니다.',
        inputSchema: CreateCanvasSchema,
    },
    {
        name: 'canvas_expand',
        description: '기존 캔버스에 여러 노드를 추가합니다. 의미적 관계(relation)를 기반으로 자동 배치됩니다.',
        inputSchema: ExpandCanvasSchema,
    },
    {
        name: 'canvas_add_node',
        description: '캔버스에 단일 노드를 추가합니다.',
        inputSchema: AddNodeSchema,
    },
    {
        name: 'canvas_info',
        description: '캔버스의 정보와 통계를 조회합니다.',
        inputSchema: GetCanvasInfoSchema,
    },
    {
        name: 'canvas_list_questions',
        description: '캔버스의 질문 노드 목록을 조회합니다.',
        inputSchema: ListQuestionsSchema,
    },
    {
        name: 'canvas_resolve_question',
        description: '질문 노드를 해결됨으로 표시합니다.',
        inputSchema: ResolveQuestionSchema,
    },
    {
        name: 'canvas_crystallize',
        description: '캔버스를 영구 노트로 결정화합니다.',
        inputSchema: CrystallizeCanvasSchema,
    },
];
//# sourceMappingURL=canvas-tools.js.map