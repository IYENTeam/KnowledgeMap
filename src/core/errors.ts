/**
 * Structured Error System
 *
 * 모든 에러에 컨텍스트와 복구 힌트를 포함하는 타입 안전한 에러 시스템
 */

// =============================================================================
// Error Codes
// =============================================================================

export const ErrorCodes = {
  // Configuration Errors (1xxx)
  CONFIG_INVALID_PATH: 'E1001',
  CONFIG_MISSING_ENV: 'E1002',
  CONFIG_PERMISSION_DENIED: 'E1003',

  // Layout Errors (2xxx)
  LAYOUT_ALLOCATION_FAILED: 'E2001',
  LAYOUT_ANCHOR_NOT_FOUND: 'E2002',
  LAYOUT_ZONE_SATURATED: 'E2003',
  LAYOUT_COLLISION_UNRESOLVABLE: 'E2004',

  // Canvas Errors (3xxx)
  CANVAS_NOT_FOUND: 'E3001',
  CANVAS_PARSE_ERROR: 'E3002',
  CANVAS_SAVE_ERROR: 'E3003',
  CANVAS_INVALID_NODE: 'E3004',

  // Vault Errors (4xxx)
  VAULT_INDEX_ERROR: 'E4001',
  VAULT_NOTE_NOT_FOUND: 'E4002',
  VAULT_SEARCH_ERROR: 'E4003',

  // Tool Errors (5xxx)
  TOOL_VALIDATION_ERROR: 'E5001',
  TOOL_EXECUTION_ERROR: 'E5002',
  TOOL_NOT_FOUND: 'E5003',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// =============================================================================
// Base Error Class
// =============================================================================

export interface ErrorContext {
  [key: string]: unknown;
}

export interface RecoveryHint {
  action: string;
  description: string;
  automatic?: boolean;
}

export abstract class KnowledgeOSError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly httpStatus: number;

  constructor(
    message: string,
    public readonly context: ErrorContext = {},
    public readonly recoveryHints: RecoveryHint[] = [],
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      recoveryHints: this.recoveryHints,
      stack: this.stack,
      cause: this.cause?.message,
    };
  }

  toString(): string {
    return `[${this.code}] ${this.name}: ${this.message}`;
  }
}

// =============================================================================
// Configuration Errors
// =============================================================================

export class ConfigurationError extends KnowledgeOSError {
  readonly code = ErrorCodes.CONFIG_INVALID_PATH;
  readonly httpStatus = 500;

  static invalidPath(path: string, reason: string): ConfigurationError {
    return new ConfigurationError(`Invalid path: ${path}`, { path, reason }, [
      {
        action: 'create_directory',
        description: `Create the missing directory: ${path}`,
        automatic: true,
      },
      {
        action: 'check_permissions',
        description: 'Verify read/write permissions for the path',
      },
    ]);
  }

  static missingEnv(varName: string, defaultValue?: string): ConfigurationError {
    const error = new ConfigurationError(
      `Missing environment variable: ${varName}`,
      { varName, defaultValue },
      [
        {
          action: 'set_env',
          description: `Set ${varName} in your environment or .env file`,
        },
        ...(defaultValue
          ? [
              {
                action: 'use_default',
                description: `Using default value: ${defaultValue}`,
                automatic: true,
              },
            ]
          : []),
      ]
    );
    (error as { code: ErrorCode }).code = ErrorCodes.CONFIG_MISSING_ENV;
    return error;
  }

  static permissionDenied(path: string): ConfigurationError {
    const error = new ConfigurationError(
      `Permission denied: ${path}`,
      { path },
      [
        {
          action: 'check_ownership',
          description: `Run: ls -la ${path}`,
        },
        {
          action: 'fix_permissions',
          description: `Run: chmod 755 ${path}`,
        },
      ]
    );
    (error as { code: ErrorCode }).code = ErrorCodes.CONFIG_PERMISSION_DENIED;
    return error;
  }
}

// =============================================================================
// Layout Errors
// =============================================================================

export interface LayoutErrorContext extends ErrorContext {
  zone: string;
  anchorId: string;
  existingNodeCount: number;
  attemptedPositions?: Array<{ x: number; y: number }>;
  canvasPath?: string;
}

export class LayoutError extends KnowledgeOSError {
  readonly code = ErrorCodes.LAYOUT_ALLOCATION_FAILED;
  readonly httpStatus = 422;

  constructor(
    message: string,
    public override readonly context: LayoutErrorContext,
    recoveryHints: RecoveryHint[] = [],
    cause?: Error
  ) {
    super(message, context, recoveryHints, cause);
  }

  static allocationFailed(context: LayoutErrorContext): LayoutError {
    return new LayoutError(
      `Failed to allocate node position in zone ${context.zone}`,
      context,
      [
        {
          action: 'try_adjacent_zone',
          description: `Attempt allocation in adjacent zone`,
          automatic: true,
        },
        {
          action: 'compact_zone',
          description: `Compact existing nodes in ${context.zone} to free space`,
        },
        {
          action: 'increase_canvas_size',
          description: 'Expand canvas boundaries to accommodate more nodes',
        },
      ]
    );
  }

  static anchorNotFound(anchorId: string, canvasPath?: string): LayoutError {
    const error = new LayoutError(
      `Anchor node not found: ${anchorId}`,
      { zone: 'unknown', anchorId, existingNodeCount: 0, canvasPath },
      [
        {
          action: 'verify_node_id',
          description: 'Check if the node ID exists in the canvas',
        },
        {
          action: 'use_topic_node',
          description: 'Use the topic node as anchor instead',
          automatic: true,
        },
      ]
    );
    (error as { code: ErrorCode }).code = ErrorCodes.LAYOUT_ANCHOR_NOT_FOUND;
    return error;
  }

  static zoneSaturated(zone: string, nodeCount: number): LayoutError {
    const error = new LayoutError(
      `Zone ${zone} is saturated with ${nodeCount} nodes`,
      { zone, anchorId: '', existingNodeCount: nodeCount },
      [
        {
          action: 'overflow_to_adjacent',
          description: 'Automatically overflow to adjacent zone',
          automatic: true,
        },
        {
          action: 'create_subcanvas',
          description: 'Create a sub-canvas for this zone',
        },
      ]
    );
    (error as { code: ErrorCode }).code = ErrorCodes.LAYOUT_ZONE_SATURATED;
    return error;
  }
}

// =============================================================================
// Canvas Errors
// =============================================================================

export class CanvasError extends KnowledgeOSError {
  readonly code = ErrorCodes.CANVAS_NOT_FOUND;
  readonly httpStatus = 404;

  static notFound(canvasPath: string): CanvasError {
    return new CanvasError(
      `Canvas not found: ${canvasPath}`,
      { canvasPath },
      [
        {
          action: 'create_new',
          description: 'Create a new canvas at this path',
        },
        {
          action: 'check_path',
          description: 'Verify the canvas path is correct',
        },
      ]
    );
  }

  static parseError(canvasPath: string, cause: Error): CanvasError {
    const error = new CanvasError(
      `Failed to parse canvas: ${canvasPath}`,
      { canvasPath, parseError: cause.message },
      [
        {
          action: 'validate_json',
          description: 'Check if the canvas file is valid JSON',
        },
        {
          action: 'backup_and_recreate',
          description: 'Backup corrupted file and create new canvas',
        },
      ],
      cause
    );
    (error as { code: ErrorCode }).code = ErrorCodes.CANVAS_PARSE_ERROR;
    return error;
  }

  static saveError(canvasPath: string, cause: Error): CanvasError {
    const error = new CanvasError(
      `Failed to save canvas: ${canvasPath}`,
      { canvasPath, saveError: cause.message },
      [
        {
          action: 'check_disk_space',
          description: 'Verify available disk space',
        },
        {
          action: 'check_permissions',
          description: 'Verify write permissions for the directory',
        },
      ],
      cause
    );
    (error as { code: ErrorCode }).code = ErrorCodes.CANVAS_SAVE_ERROR;
    return error;
  }
}

// =============================================================================
// Tool Errors
// =============================================================================

export class ToolError extends KnowledgeOSError {
  readonly code = ErrorCodes.TOOL_EXECUTION_ERROR;
  readonly httpStatus = 500;

  static validationError(
    toolName: string,
    errors: Array<{ path: string; message: string }>
  ): ToolError {
    const error = new ToolError(
      `Validation failed for tool: ${toolName}`,
      { toolName, validationErrors: errors },
      [
        {
          action: 'check_parameters',
          description: 'Verify all required parameters are provided',
        },
        {
          action: 'check_types',
          description: 'Ensure parameter types match the schema',
        },
      ]
    );
    (error as { code: ErrorCode }).code = ErrorCodes.TOOL_VALIDATION_ERROR;
    return error;
  }

  static executionError(toolName: string, cause: Error): ToolError {
    return new ToolError(
      `Execution failed for tool: ${toolName}`,
      { toolName, originalError: cause.message },
      [
        {
          action: 'retry',
          description: 'Retry the operation',
        },
        {
          action: 'check_logs',
          description: 'Check server logs for details',
        },
      ],
      cause
    );
  }

  static notFound(toolName: string): ToolError {
    const error = new ToolError(
      `Tool not found: ${toolName}`,
      { toolName },
      [
        {
          action: 'list_tools',
          description: 'List available tools to find the correct name',
        },
      ]
    );
    (error as { code: ErrorCode }).code = ErrorCodes.TOOL_NOT_FOUND;
    return error;
  }
}

// =============================================================================
// Error Utilities
// =============================================================================

export function isKnowledgeOSError(error: unknown): error is KnowledgeOSError {
  return error instanceof KnowledgeOSError;
}

export function wrapError(error: unknown, context?: ErrorContext): KnowledgeOSError {
  if (isKnowledgeOSError(error)) {
    if (context) {
      return new ToolError(error.message, { ...error.context, ...context }, error.recoveryHints, error);
    }
    return error;
  }

  if (error instanceof Error) {
    return new ToolError(error.message, context ?? {}, [], error);
  }

  return new ToolError(String(error), context ?? {});
}
