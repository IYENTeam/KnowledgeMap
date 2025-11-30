/**
 * Type-Safe Tool Handler Registry
 *
 * 타입 안전한 도구 등록 및 실행 시스템
 * - Zod 스키마 기반 런타임 검증
 * - 정확한 JSON Schema 변환
 * - 실행 시간 측정 및 로깅
 */
import { z, type ZodType, type ZodObject, type ZodRawShape } from 'zod';
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
        recoveryHints?: Array<{
            action: string;
            description: string;
        }>;
    };
    duration: number;
}
export declare class ZodSchemaConverter {
    /**
     * Zod 스키마를 JSON Schema로 변환합니다.
     */
    static toJSONSchema(schema: ZodType): JSONSchemaProperty;
    private static convertType;
    private static convertString;
    private static convertNumber;
    private static convertArray;
    private static convertObject;
    private static convertEnum;
    private static convertUnion;
    private static convertLiteral;
    /**
     * Zod 객체 스키마에서 필수 필드를 추출합니다.
     */
    static getRequiredFields(schema: ZodObject<any>): string[];
}
export declare class ToolRegistry {
    private tools;
    /**
     * 도구를 등록합니다.
     */
    register(definition: {
        name: string;
        description: string;
        inputSchema: ZodObject<any, any, any>;
        handler: (params: any) => Promise<unknown>;
    }): this;
    /**
     * 여러 도구를 한 번에 등록합니다.
     */
    registerAll(definitions: Array<ToolDefinition<any>>): this;
    /**
     * 도구를 실행합니다.
     */
    execute(name: string, params: unknown): Promise<ToolExecutionResult>;
    /**
     * MCP 형식의 도구 목록을 반환합니다.
     */
    getMCPToolDefinitions(): MCPToolDefinition[];
    /**
     * 등록된 도구 이름 목록을 반환합니다.
     */
    getToolNames(): string[];
    /**
     * 도구가 등록되어 있는지 확인합니다.
     */
    has(name: string): boolean;
    /**
     * 도구 개수를 반환합니다.
     */
    get size(): number;
}
export declare class ToolBuilder<TInput extends ZodRawShape = {}> {
    private _name;
    private _description;
    private _schema;
    /**
     * 도구 이름을 설정합니다.
     */
    name(name: string): this;
    /**
     * 도구 설명을 설정합니다.
     */
    description(description: string): this;
    /**
     * 입력 스키마를 설정합니다.
     */
    input<T extends ZodRawShape>(schema: ZodObject<T>): ToolBuilder<T>;
    /**
     * 핸들러를 설정하고 도구 정의를 반환합니다.
     */
    handler(fn: (params: z.infer<ZodObject<TInput>>) => Promise<unknown>): ToolDefinition<TInput>;
}
/**
 * 새 도구 빌더를 생성합니다.
 */
export declare function defineTool(): ToolBuilder;
export declare const toolRegistry: ToolRegistry;
//# sourceMappingURL=tool-registry.d.ts.map