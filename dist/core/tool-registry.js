/**
 * Type-Safe Tool Handler Registry
 *
 * 타입 안전한 도구 등록 및 실행 시스템
 * - Zod 스키마 기반 런타임 검증
 * - 정확한 JSON Schema 변환
 * - 실행 시간 측정 및 로깅
 */
import { wrapError, isKnowledgeOSError } from './errors.js';
import { logger } from './logger.js';
// =============================================================================
// Zod to JSON Schema Converter
// =============================================================================
export class ZodSchemaConverter {
    /**
     * Zod 스키마를 JSON Schema로 변환합니다.
     */
    static toJSONSchema(schema) {
        return this.convertType(schema);
    }
    static convertType(schema) {
        const typeName = schema._def?.typeName;
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
                return this.convertType(schema._def.innerType);
            case 'ZodDefault':
                return {
                    ...this.convertType(schema._def.innerType),
                    default: schema._def.defaultValue(),
                };
            case 'ZodNullable':
                return this.convertType(schema._def.innerType);
            case 'ZodUnion':
                return this.convertUnion(schema);
            case 'ZodLiteral':
                return this.convertLiteral(schema);
            default:
                return { type: 'string', description: schema.description };
        }
    }
    static convertString(schema) {
        const result = {
            type: 'string',
            description: schema.description,
        };
        // 체크들 추출 (minLength, maxLength, regex 등)
        const checks = schema._def?.checks || [];
        for (const check of checks) {
            if (check.kind === 'min') {
                result.minLength = check.value;
            }
            else if (check.kind === 'max') {
                result.maxLength = check.value;
            }
            else if (check.kind === 'regex') {
                result.pattern = check.regex.source;
            }
            else if (check.kind === 'email') {
                result.format = 'email';
            }
            else if (check.kind === 'url') {
                result.format = 'uri';
            }
        }
        return result;
    }
    static convertNumber(schema) {
        const result = {
            type: 'number',
            description: schema.description,
        };
        const checks = schema._def?.checks || [];
        for (const check of checks) {
            if (check.kind === 'min') {
                result.minimum = check.value;
            }
            else if (check.kind === 'max') {
                result.maximum = check.value;
            }
            else if (check.kind === 'int') {
                result.type = 'integer';
            }
        }
        return result;
    }
    static convertArray(schema) {
        const itemsSchema = schema._def?.type;
        return {
            type: 'array',
            description: schema.description,
            items: itemsSchema ? this.convertType(itemsSchema) : { type: 'string' },
        };
    }
    static convertObject(schema) {
        const shape = schema._def?.shape?.() || schema.shape || {};
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            properties[key] = this.convertType(value);
            // Optional 체크
            const valueTypeName = value?._def?.typeName;
            if (valueTypeName !== 'ZodOptional' && valueTypeName !== 'ZodDefault') {
                required.push(key);
            }
        }
        return {
            type: 'object',
            description: schema.description,
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }
    static convertEnum(schema) {
        const values = schema._def?.values || [];
        return {
            type: 'string',
            description: schema.description,
            enum: values,
        };
    }
    static convertUnion(schema) {
        const options = schema._def?.options || [];
        // 단순화: 첫 번째 옵션의 타입 사용
        if (options.length > 0) {
            return this.convertType(options[0]);
        }
        return { type: 'string' };
    }
    static convertLiteral(schema) {
        const value = schema._def?.value;
        return {
            type: typeof value,
            description: schema.description,
            enum: [value],
        };
    }
    /**
     * Zod 객체 스키마에서 필수 필드를 추출합니다.
     */
    static getRequiredFields(schema) {
        const shape = schema._def?.shape?.() || schema.shape || {};
        const required = [];
        for (const [key, value] of Object.entries(shape)) {
            const typeName = value?._def?.typeName;
            if (typeName !== 'ZodOptional' && typeName !== 'ZodDefault') {
                required.push(key);
            }
        }
        return required;
    }
}
export class ToolRegistry {
    tools = new Map();
    /**
     * 도구를 등록합니다.
     */
    register(definition) {
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
    registerAll(definitions) {
        for (const def of definitions) {
            this.register(def);
        }
        return this;
    }
    /**
     * 도구를 실행합니다.
     */
    async execute(name, params) {
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
        }
        catch (error) {
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
    getMCPToolDefinitions() {
        const definitions = [];
        for (const [name, tool] of this.tools) {
            const jsonSchema = ZodSchemaConverter.toJSONSchema(tool.inputSchema);
            definitions.push({
                name,
                description: tool.description,
                inputSchema: {
                    type: 'object',
                    properties: jsonSchema.properties || {},
                    required: ZodSchemaConverter.getRequiredFields(tool.inputSchema),
                },
            });
        }
        return definitions;
    }
    /**
     * 등록된 도구 이름 목록을 반환합니다.
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }
    /**
     * 도구가 등록되어 있는지 확인합니다.
     */
    has(name) {
        return this.tools.has(name);
    }
    /**
     * 도구 개수를 반환합니다.
     */
    get size() {
        return this.tools.size;
    }
}
// =============================================================================
// Tool Builder (Fluent API)
// =============================================================================
export class ToolBuilder {
    _name = '';
    _description = '';
    _schema = null;
    /**
     * 도구 이름을 설정합니다.
     */
    name(name) {
        this._name = name;
        return this;
    }
    /**
     * 도구 설명을 설정합니다.
     */
    description(description) {
        this._description = description;
        return this;
    }
    /**
     * 입력 스키마를 설정합니다.
     */
    input(schema) {
        this._schema = schema;
        return this;
    }
    /**
     * 핸들러를 설정하고 도구 정의를 반환합니다.
     */
    handler(fn) {
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
export function defineTool() {
    return new ToolBuilder();
}
// =============================================================================
// Singleton Registry Instance
// =============================================================================
export const toolRegistry = new ToolRegistry();
//# sourceMappingURL=tool-registry.js.map