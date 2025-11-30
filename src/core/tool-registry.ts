/**
 * Type-Safe Tool Handler Registry
 *
 * 타입 안전한 도구 등록 및 실행 시스템
 * - Zod 스키마 기반 런타임 검증
 * - 정확한 JSON Schema 변환
 * - 실행 시간 측정 및 로깅
 */

import { z, type ZodType, type ZodObject, type ZodRawShape } from 'zod';
import { wrapError, isKnowledgeOSError } from './errors.js';
import { logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

export interface ToolDefinition<TInput extends ZodRawShape = ZodRawShape> {
  name: string;
  description: string;
  inputSchema: ZodObject<TInput, any, any>;
  handler: (params: z.infer<ZodObject<TInput, any, any>>) => Promise<unknown>;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, JSONSchemaProperty>;
    required: string[];
  };
}

export interface JSONSchemaProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

export interface ToolExecutionResult {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
    recoveryHints?: Array<{ action: string; description: string }>;
  };
  duration: number;
}

// =============================================================================
// Zod to JSON Schema Converter
// =============================================================================

export class ZodSchemaConverter {
  /**
   * Zod 스키마를 JSON Schema로 변환합니다.
   */
  static toJSONSchema(schema: ZodType): JSONSchemaProperty {
    return this.convertType(schema);
  }

  private static convertType(schema: ZodType): JSONSchemaProperty {
    const typeName = (schema._def as any)?.typeName;

    switch (typeName) {
      case 'ZodString':
        return this.convertString(schema);
      case 'ZodNumber':
        return this.convertNumber(schema);
      case 'ZodBoolean':
        return { type: 'boolean', description: schema.description };
      case 'ZodArray':
        return this.convertArray(schema);
      case 'ZodObject':
        return this.convertObject(schema);
      case 'ZodEnum':
        return this.convertEnum(schema);
      case 'ZodOptional':
        return this.convertType((schema as any)._def.innerType);
      case 'ZodDefault':
        return {
          ...this.convertType((schema as any)._def.innerType),
          default: (schema as any)._def.defaultValue(),
        };
      case 'ZodNullable':
        return this.convertType((schema as any)._def.innerType);
      case 'ZodUnion':
        return this.convertUnion(schema);
      case 'ZodLiteral':
        return this.convertLiteral(schema);
      default:
        return { type: 'string', description: schema.description };
    }
  }

  private static convertString(schema: ZodType): JSONSchemaProperty {
    const result: JSONSchemaProperty = {
      type: 'string',
      description: schema.description,
    };

    // 체크들 추출 (minLength, maxLength, regex 등)
    const checks = (schema as any)._def?.checks || [];
    for (const check of checks) {
      if (check.kind === 'min') {
        (result as any).minLength = check.value;
      } else if (check.kind === 'max') {
        (result as any).maxLength = check.value;
      } else if (check.kind === 'regex') {
        (result as any).pattern = check.regex.source;
      } else if (check.kind === 'email') {
        (result as any).format = 'email';
      } else if (check.kind === 'url') {
        (result as any).format = 'uri';
      }
    }

    return result;
  }

  private static convertNumber(schema: ZodType): JSONSchemaProperty {
    const result: JSONSchemaProperty = {
      type: 'number',
      description: schema.description,
    };

    const checks = (schema as any)._def?.checks || [];
    for (const check of checks) {
      if (check.kind === 'min') {
        (result as any).minimum = check.value;
      } else if (check.kind === 'max') {
        (result as any).maximum = check.value;
      } else if (check.kind === 'int') {
        result.type = 'integer';
      }
    }

    return result;
  }

  private static convertArray(schema: ZodType): JSONSchemaProperty {
    const itemsSchema = (schema as any)._def?.type;
    return {
      type: 'array',
      description: schema.description,
      items: itemsSchema ? this.convertType(itemsSchema) : { type: 'string' },
    };
  }

  private static convertObject(schema: ZodType): JSONSchemaProperty {
    const shape = (schema as any)._def?.shape?.() || (schema as any).shape || {};
    const properties: Record<string, JSONSchemaProperty> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = this.convertType(value as ZodType);

      // Optional 체크
      const valueTypeName = ((value as ZodType)?._def as any)?.typeName;
      if (valueTypeName !== 'ZodOptional' && valueTypeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    return {
      type: 'object',
      description: schema.description,
      properties,
      required: required.length > 0 ? required : undefined,
    } as JSONSchemaProperty;
  }

  private static convertEnum(schema: ZodType): JSONSchemaProperty {
    const values = (schema as any)._def?.values || [];
    return {
      type: 'string',
      description: schema.description,
      enum: values,
    };
  }

  private static convertUnion(schema: ZodType): JSONSchemaProperty {
    const options = (schema as any)._def?.options || [];
    // 단순화: 첫 번째 옵션의 타입 사용
    if (options.length > 0) {
      return this.convertType(options[0]);
    }
    return { type: 'string' };
  }

  private static convertLiteral(schema: ZodType): JSONSchemaProperty {
    const value = (schema as any)._def?.value;
    return {
      type: typeof value,
      description: schema.description,
      enum: [value],
    };
  }

  /**
   * Zod 객체 스키마에서 필수 필드를 추출합니다.
   */
  static getRequiredFields(schema: ZodObject<any>): string[] {
    const shape = (schema._def as any)?.shape?.() || (schema as any).shape || {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const typeName = ((value as ZodType)?._def as any)?.typeName;
      if (typeName !== 'ZodOptional' && typeName !== 'ZodDefault') {
        required.push(key);
      }
    }

    return required;
  }
}

// =============================================================================
// Tool Registry
// =============================================================================

// 내부 저장용 타입 (any 허용)
interface InternalToolDefinition {
  name: string;
  description: string;
  inputSchema: ZodObject<any, any, any>;
  handler: (params: any) => Promise<unknown>;
}

export class ToolRegistry {
  private tools: Map<string, InternalToolDefinition> = new Map();

  /**
   * 도구를 등록합니다.
   */
  register(definition: {
    name: string;
    description: string;
    inputSchema: ZodObject<any, any, any>;
    handler: (params: any) => Promise<unknown>;
  }): this {
    if (this.tools.has(definition.name)) {
      logger.warn(`Tool '${definition.name}' is being overwritten`);
    }

    this.tools.set(definition.name, definition);
    logger.debug(`Tool registered: ${definition.name}`);

    return this;
  }

  /**
   * 여러 도구를 한 번에 등록합니다.
   */
  registerAll(definitions: Array<ToolDefinition<any>>): this {
    for (const def of definitions) {
      this.register(def);
    }
    return this;
  }

  /**
   * 도구를 실행합니다.
   */
  async execute(name: string, params: unknown): Promise<ToolExecutionResult> {
    const startTime = performance.now();

    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'E5003',
          message: `Tool not found: ${name}`,
        },
        duration: Math.round(performance.now() - startTime),
      };
    }

    try {
      // 1. 입력 검증
      const parseResult = tool.inputSchema.safeParse(params);
      if (!parseResult.success) {
        const validationErrors = parseResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));

        logger.warn(`Validation failed for tool: ${name}`, {
          tool: name,
          errors: validationErrors,
        });

        return {
          success: false,
          error: {
            code: 'E5001',
            message: `Validation failed for tool: ${name}`,
            context: { validationErrors },
            recoveryHints: [
              { action: 'check_parameters', description: 'Verify all required parameters are provided' },
              { action: 'check_types', description: 'Ensure parameter types match the schema' },
            ],
          },
          duration: Math.round(performance.now() - startTime),
        };
      }

      // 2. 핸들러 실행
      logger.debug(`Executing tool: ${name}`, { tool: name });
      const result = await tool.handler(parseResult.data);

      const duration = Math.round(performance.now() - startTime);
      logger.info(`Tool executed successfully: ${name}`, { tool: name, duration });

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      if (isKnowledgeOSError(error)) {
        logger.error(`Tool execution failed: ${name}`, error, { tool: name, duration });

        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            context: error.context,
            recoveryHints: error.recoveryHints,
          },
          duration,
        };
      }

      const wrappedError = wrapError(error, { tool: name });
      logger.error(`Tool execution failed: ${name}`, wrappedError, { tool: name, duration });

      return {
        success: false,
        error: {
          code: wrappedError.code,
          message: wrappedError.message,
          context: wrappedError.context,
        },
        duration,
      };
    }
  }

  /**
   * MCP 형식의 도구 목록을 반환합니다.
   */
  getMCPToolDefinitions(): MCPToolDefinition[] {
    const definitions: MCPToolDefinition[] = [];

    for (const [name, tool] of this.tools) {
      const jsonSchema = ZodSchemaConverter.toJSONSchema(tool.inputSchema);

      definitions.push({
        name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: (jsonSchema as any).properties || {},
          required: ZodSchemaConverter.getRequiredFields(tool.inputSchema),
        },
      });
    }

    return definitions;
  }

  /**
   * 등록된 도구 이름 목록을 반환합니다.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * 도구가 등록되어 있는지 확인합니다.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 도구 개수를 반환합니다.
   */
  get size(): number {
    return this.tools.size;
  }
}

// =============================================================================
// Tool Builder (Fluent API)
// =============================================================================

export class ToolBuilder<TInput extends ZodRawShape = {}> {
  private _name: string = '';
  private _description: string = '';
  private _schema: ZodObject<TInput> | null = null;

  /**
   * 도구 이름을 설정합니다.
   */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * 도구 설명을 설정합니다.
   */
  description(description: string): this {
    this._description = description;
    return this;
  }

  /**
   * 입력 스키마를 설정합니다.
   */
  input<T extends ZodRawShape>(schema: ZodObject<T>): ToolBuilder<T> {
    (this as any)._schema = schema;
    return this as unknown as ToolBuilder<T>;
  }

  /**
   * 핸들러를 설정하고 도구 정의를 반환합니다.
   */
  handler(
    fn: (params: z.infer<ZodObject<TInput>>) => Promise<unknown>
  ): ToolDefinition<TInput> {
    if (!this._name) {
      throw new Error('Tool name is required');
    }
    if (!this._description) {
      throw new Error('Tool description is required');
    }
    if (!this._schema) {
      throw new Error('Tool input schema is required');
    }

    return {
      name: this._name,
      description: this._description,
      inputSchema: this._schema,
      handler: fn,
    };
  }
}

/**
 * 새 도구 빌더를 생성합니다.
 */
export function defineTool(): ToolBuilder {
  return new ToolBuilder();
}

// =============================================================================
// Singleton Registry Instance
// =============================================================================

export const toolRegistry = new ToolRegistry();
