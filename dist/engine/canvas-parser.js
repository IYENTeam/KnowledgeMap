/**
 * Canvas Parser
 *
 * Obsidian .canvas 파일 (JSON Canvas 스펙)을 파싱하고 생성하는 유틸리티
 * https://jsoncanvas.org/spec/1.0/
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
// =============================================================================
// Canvas Parser Class
// =============================================================================
export class CanvasParser {
    // ===========================================================================
    // File I/O
    // ===========================================================================
    /**
     * .canvas 파일을 로드합니다.
     */
    static async load(filePath) {
        const content = await readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        return {
            nodes: data.nodes || [],
            edges: data.edges || [],
        };
    }
    /**
     * .canvas 파일로 저장합니다.
     */
    static async save(filePath, nodes, edges) {
        // 메타데이터 필드 제거 (Obsidian이 인식하지 못하는 필드)
        const cleanNodes = nodes.map((node) => {
            const clean = {};
            for (const [key, value] of Object.entries(node)) {
                if (!key.startsWith('_')) {
                    clean[key] = value;
                }
            }
            return clean;
        });
        const data = {
            nodes: cleanNodes,
            edges,
        };
        // 디렉토리가 없으면 생성
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    // ===========================================================================
    // ID Generation
    // ===========================================================================
    /**
     * 고유 ID를 생성합니다.
     */
    static generateId(prefix = '') {
        const uid = uuidv4().slice(0, 8);
        return prefix ? `${prefix}-${uid}` : uid;
    }
    // ===========================================================================
    // Node Creation
    // ===========================================================================
    /**
     * Text 노드를 생성합니다.
     */
    static createTextNode(options) {
        return {
            id: options.id || this.generateId('text'),
            type: 'text',
            x: Math.round(options.x),
            y: Math.round(options.y),
            width: options.width || 400,
            height: options.height || 150,
            text: options.text,
            ...(options.color && { color: options.color }),
        };
    }
    /**
     * File 노드를 생성합니다 (볼트 내 파일 참조).
     */
    static createFileNode(options) {
        return {
            id: options.id || this.generateId('file'),
            type: 'file',
            x: Math.round(options.x),
            y: Math.round(options.y),
            width: options.width || 300,
            height: options.height || 100,
            file: options.file,
            ...(options.subpath && { subpath: options.subpath }),
            ...(options.color && { color: options.color }),
        };
    }
    /**
     * Link 노드를 생성합니다 (외부 URL).
     */
    static createLinkNode(options) {
        return {
            id: options.id || this.generateId('link'),
            type: 'link',
            x: Math.round(options.x),
            y: Math.round(options.y),
            width: options.width || 300,
            height: options.height || 80,
            url: options.url,
            ...(options.color && { color: options.color }),
        };
    }
    /**
     * Group 노드를 생성합니다 (시각적 컨테이너).
     */
    static createGroupNode(options) {
        return {
            id: options.id || this.generateId('group'),
            type: 'group',
            x: Math.round(options.x),
            y: Math.round(options.y),
            width: Math.round(options.width),
            height: Math.round(options.height),
            ...(options.label && { label: options.label }),
            ...(options.color && { color: options.color }),
        };
    }
    // ===========================================================================
    // Edge Creation
    // ===========================================================================
    /**
     * Edge(연결선)를 생성합니다.
     */
    static createEdge(fromNode, toNode, options = {}) {
        return {
            id: options.id || this.generateId('edge'),
            fromNode,
            toNode,
            ...(options.fromSide && { fromSide: options.fromSide }),
            ...(options.toSide && { toSide: options.toSide }),
            ...(options.fromEnd && { fromEnd: options.fromEnd }),
            ...(options.toEnd && { toEnd: options.toEnd }),
            ...(options.color && { color: options.color }),
            ...(options.label && { label: options.label }),
        };
    }
    // ===========================================================================
    // Query Methods
    // ===========================================================================
    /**
     * ID로 노드를 찾습니다.
     */
    static findNodeById(nodes, nodeId) {
        return nodes.find((n) => n.id === nodeId);
    }
    /**
     * 타입으로 노드들을 찾습니다.
     */
    static findNodesByType(nodes, nodeType) {
        return nodes.filter((n) => n.type === nodeType);
    }
    /**
     * 텍스트를 포함하는 노드들을 찾습니다.
     */
    static findNodesContainingText(nodes, searchText, caseSensitive = false) {
        const textNodes = this.findNodesByType(nodes, 'text');
        const search = caseSensitive ? searchText : searchText.toLowerCase();
        return textNodes.filter((node) => {
            const text = caseSensitive ? node.text : node.text.toLowerCase();
            return text.includes(search);
        });
    }
    /**
     * 질문 노드들을 찾습니다 (텍스트가 '?'를 포함).
     */
    static findQuestionNodes(nodes) {
        return this.findNodesByType(nodes, 'text').filter((node) => node.text.includes('?'));
    }
    /**
     * 색상으로 노드들을 찾습니다.
     */
    static findNodesByColor(nodes, color) {
        return nodes.filter((n) => n.color === color);
    }
    /**
     * 특정 노드와 연결된 노드들의 ID를 반환합니다.
     */
    static getConnectedNodes(nodeId, edges, direction = 'both') {
        const connected = [];
        for (const edge of edges) {
            if (direction === 'outgoing' || direction === 'both') {
                if (edge.fromNode === nodeId) {
                    connected.push(edge.toNode);
                }
            }
            if (direction === 'incoming' || direction === 'both') {
                if (edge.toNode === nodeId) {
                    connected.push(edge.fromNode);
                }
            }
        }
        return connected;
    }
    // ===========================================================================
    // Utility Methods
    // ===========================================================================
    /**
     * 모든 노드를 포함하는 경계 영역을 계산합니다.
     */
    static getCanvasBounds(nodes) {
        if (nodes.length === 0) {
            return {
                minX: 0,
                minY: 0,
                maxX: 0,
                maxY: 0,
                width: 0,
                height: 0,
            };
        }
        const minX = Math.min(...nodes.map((n) => n.x));
        const minY = Math.min(...nodes.map((n) => n.y));
        const maxX = Math.max(...nodes.map((n) => n.x + n.width));
        const maxY = Math.max(...nodes.map((n) => n.y + n.height));
        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }
    /**
     * 노드들에서 키워드를 추출합니다 (# 헤딩, **볼드** 등).
     */
    static extractKeywords(nodes) {
        const keywords = new Set();
        for (const node of nodes) {
            if (node.type !== 'text')
                continue;
            const text = node.text;
            // # 헤딩 추출
            const headings = text.match(/^#+\s+(.+)$/gm);
            if (headings) {
                for (const h of headings) {
                    keywords.add(h.replace(/^#+\s+/, '').trim());
                }
            }
            // **볼드** 추출
            const bolds = text.match(/\*\*(.+?)\*\*/g);
            if (bolds) {
                for (const b of bolds) {
                    keywords.add(b.replace(/\*\*/g, '').trim());
                }
            }
            // [[위키링크]] 추출
            const wikiLinks = text.match(/\[\[([^\]|]+)/g);
            if (wikiLinks) {
                for (const w of wikiLinks) {
                    keywords.add(w.replace('[[', '').trim());
                }
            }
        }
        return Array.from(keywords).filter((k) => k.length > 0);
    }
    /**
     * 노드에서 URL들을 추출합니다.
     */
    static extractUrls(nodes) {
        const urls = [];
        for (const node of nodes) {
            if (node.type === 'link') {
                urls.push(node.url);
            }
            else if (node.type === 'text') {
                // 마크다운 링크 [title](url)
                const mdLinks = node.text.match(/\[([^\]]+)\]\(([^)]+)\)/g);
                if (mdLinks) {
                    for (const link of mdLinks) {
                        const urlMatch = link.match(/\(([^)]+)\)/);
                        if (urlMatch && urlMatch[1].startsWith('http')) {
                            urls.push(urlMatch[1]);
                        }
                    }
                }
            }
        }
        return urls;
    }
}
//# sourceMappingURL=canvas-parser.js.map