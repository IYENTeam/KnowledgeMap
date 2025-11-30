/**
 * Canvas Parser
 *
 * Obsidian .canvas 파일 (JSON Canvas 스펙)을 파싱하고 생성하는 유틸리티
 * https://jsoncanvas.org/spec/1.0/
 */
import type { CanvasDocument, CanvasNode, CanvasEdge, TextNode, FileNode, LinkNode, GroupNode, NodeBounds, CreateTextNodeOptions, CreateFileNodeOptions, CreateLinkNodeOptions, CreateGroupNodeOptions, CreateEdgeOptions, Color } from '../types/index.js';
export declare class CanvasParser {
    /**
     * .canvas 파일을 로드합니다.
     */
    static load(filePath: string): Promise<CanvasDocument>;
    /**
     * .canvas 파일로 저장합니다.
     */
    static save(filePath: string, nodes: CanvasNode[], edges: CanvasEdge[]): Promise<void>;
    /**
     * 고유 ID를 생성합니다.
     */
    static generateId(prefix?: string): string;
    /**
     * Text 노드를 생성합니다.
     */
    static createTextNode(options: CreateTextNodeOptions): TextNode;
    /**
     * File 노드를 생성합니다 (볼트 내 파일 참조).
     */
    static createFileNode(options: CreateFileNodeOptions): FileNode;
    /**
     * Link 노드를 생성합니다 (외부 URL).
     */
    static createLinkNode(options: CreateLinkNodeOptions): LinkNode;
    /**
     * Group 노드를 생성합니다 (시각적 컨테이너).
     */
    static createGroupNode(options: CreateGroupNodeOptions): GroupNode;
    /**
     * Edge(연결선)를 생성합니다.
     */
    static createEdge(fromNode: string, toNode: string, options?: CreateEdgeOptions): CanvasEdge;
    /**
     * ID로 노드를 찾습니다.
     */
    static findNodeById(nodes: CanvasNode[], nodeId: string): CanvasNode | undefined;
    /**
     * 타입으로 노드들을 찾습니다.
     */
    static findNodesByType<T extends CanvasNode>(nodes: CanvasNode[], nodeType: T['type']): T[];
    /**
     * 텍스트를 포함하는 노드들을 찾습니다.
     */
    static findNodesContainingText(nodes: CanvasNode[], searchText: string, caseSensitive?: boolean): TextNode[];
    /**
     * 질문 노드들을 찾습니다 (텍스트가 '?'를 포함).
     */
    static findQuestionNodes(nodes: CanvasNode[]): TextNode[];
    /**
     * 색상으로 노드들을 찾습니다.
     */
    static findNodesByColor(nodes: CanvasNode[], color: Color): CanvasNode[];
    /**
     * 특정 노드와 연결된 노드들의 ID를 반환합니다.
     */
    static getConnectedNodes(nodeId: string, edges: CanvasEdge[], direction?: 'outgoing' | 'incoming' | 'both'): string[];
    /**
     * 모든 노드를 포함하는 경계 영역을 계산합니다.
     */
    static getCanvasBounds(nodes: CanvasNode[]): NodeBounds;
    /**
     * 노드들에서 키워드를 추출합니다 (# 헤딩, **볼드** 등).
     */
    static extractKeywords(nodes: CanvasNode[]): string[];
    /**
     * 노드에서 URL들을 추출합니다.
     */
    static extractUrls(nodes: CanvasNode[]): string[];
}
//# sourceMappingURL=canvas-parser.d.ts.map