/**
 * Canvas Metadata Types
 *
 * Sidecar 패턴으로 캔버스 메타데이터를 관리합니다.
 * 캔버스 파일의 순수성을 보존하면서 워크플로우 상태를 추적합니다.
 */
// =============================================================================
// Default Values
// =============================================================================
export function createDefaultMeta(canvasPath) {
    const now = new Date().toISOString();
    return {
        $schema: 'canvas-meta-v1',
        canvasId: crypto.randomUUID(),
        linkedFile: canvasPath,
        createdAt: now,
        updatedAt: now,
        syncedAt: Date.now(),
        workflow: {
            state: 'created',
            history: [],
        },
        semanticGraph: {},
        layoutState: {
            engineVersion: 'zoning-v1',
            zoneCounts: {},
            groupsCreated: [],
        },
        statistics: {
            totalNodes: 0,
            questions: 0,
            resolvedQuestions: 0,
            webLinks: 0,
            vaultNotes: 0,
        },
    };
}
//# sourceMappingURL=meta.js.map