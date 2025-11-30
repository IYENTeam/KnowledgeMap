/**
 * Structured Error System
 *
 * 모든 에러에 컨텍스트와 복구 힌트를 포함하는 타입 안전한 에러 시스템
 */
export declare const ErrorCodes: {
    readonly CONFIG_INVALID_PATH: "E1001";
    readonly CONFIG_MISSING_ENV: "E1002";
    readonly CONFIG_PERMISSION_DENIED: "E1003";
    readonly LAYOUT_ALLOCATION_FAILED: "E2001";
    readonly LAYOUT_ANCHOR_NOT_FOUND: "E2002";
    readonly LAYOUT_ZONE_SATURATED: "E2003";
    readonly LAYOUT_COLLISION_UNRESOLVABLE: "E2004";
    readonly CANVAS_NOT_FOUND: "E3001";
    readonly CANVAS_PARSE_ERROR: "E3002";
    readonly CANVAS_SAVE_ERROR: "E3003";
    readonly CANVAS_INVALID_NODE: "E3004";
    readonly VAULT_INDEX_ERROR: "E4001";
    readonly VAULT_NOTE_NOT_FOUND: "E4002";
    readonly VAULT_SEARCH_ERROR: "E4003";
    readonly TOOL_VALIDATION_ERROR: "E5001";
    readonly TOOL_EXECUTION_ERROR: "E5002";
    readonly TOOL_NOT_FOUND: "E5003";
};
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
export interface ErrorContext {
    [key: string]: unknown;
}
export interface RecoveryHint {
    action: string;
    description: string;
    automatic?: boolean;
}
export declare abstract class KnowledgeOSError extends Error {
    readonly context: ErrorContext;
    readonly recoveryHints: RecoveryHint[];
    readonly cause?: Error | undefined;
    abstract readonly code: ErrorCode;
    abstract readonly httpStatus: number;
    constructor(message: string, context?: ErrorContext, recoveryHints?: RecoveryHint[], cause?: Error | undefined);
    toJSON(): Record<string, unknown>;
    toString(): string;
}
export declare class ConfigurationError extends KnowledgeOSError {
    readonly code: "E1001";
    readonly httpStatus = 500;
    static invalidPath(path: string, reason: string): ConfigurationError;
    static missingEnv(varName: string, defaultValue?: string): ConfigurationError;
    static permissionDenied(path: string): ConfigurationError;
}
export interface LayoutErrorContext extends ErrorContext {
    zone: string;
    anchorId: string;
    existingNodeCount: number;
    attemptedPositions?: Array<{
        x: number;
        y: number;
    }>;
    canvasPath?: string;
}
export declare class LayoutError extends KnowledgeOSError {
    readonly context: LayoutErrorContext;
    readonly code: "E2001";
    readonly httpStatus = 422;
    constructor(message: string, context: LayoutErrorContext, recoveryHints?: RecoveryHint[], cause?: Error);
    static allocationFailed(context: LayoutErrorContext): LayoutError;
    static anchorNotFound(anchorId: string, canvasPath?: string): LayoutError;
    static zoneSaturated(zone: string, nodeCount: number): LayoutError;
}
export declare class CanvasError extends KnowledgeOSError {
    readonly code: "E3001";
    readonly httpStatus = 404;
    static notFound(canvasPath: string): CanvasError;
    static parseError(canvasPath: string, cause: Error): CanvasError;
    static saveError(canvasPath: string, cause: Error): CanvasError;
}
export declare class ToolError extends KnowledgeOSError {
    readonly code: "E5002";
    readonly httpStatus = 500;
    static validationError(toolName: string, errors: Array<{
        path: string;
        message: string;
    }>): ToolError;
    static executionError(toolName: string, cause: Error): ToolError;
    static notFound(toolName: string): ToolError;
}
export declare function isKnowledgeOSError(error: unknown): error is KnowledgeOSError;
export declare function wrapError(error: unknown, context?: ErrorContext): KnowledgeOSError;
//# sourceMappingURL=errors.d.ts.map