/**
 * Structured Logging System
 *
 * JSON 기반의 구조화된 로그로 관찰성(Observability) 확보
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export interface LogContext {
    tool?: string;
    canvasPath?: string;
    nodeId?: string;
    zone?: string;
    duration?: number;
    [key: string]: unknown;
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        code?: string;
        stack?: string;
    };
    traceId?: string;
}
export interface LoggerOptions {
    minLevel?: LogLevel;
    prettyPrint?: boolean;
    includeStack?: boolean;
}
export declare class Logger {
    private readonly minLevel;
    private readonly prettyPrint;
    private readonly includeStack;
    private traceId?;
    constructor(options?: LoggerOptions);
    /**
     * 트레이스 ID 설정 (요청 추적용)
     */
    withTraceId(traceId: string): Logger;
    /**
     * 디버그 로그
     */
    debug(message: string, context?: LogContext): void;
    /**
     * 정보 로그
     */
    info(message: string, context?: LogContext): void;
    /**
     * 경고 로그
     */
    warn(message: string, context?: LogContext): void;
    /**
     * 에러 로그
     */
    error(message: string, error?: Error | unknown, context?: LogContext): void;
    /**
     * 치명적 에러 로그
     */
    fatal(message: string, error?: Error | unknown, context?: LogContext): void;
    /**
     * 도구 실행 시간 측정 데코레이터
     */
    timed<T>(name: string, fn: () => Promise<T>, context?: LogContext): Promise<T>;
    /**
     * 도구 실행 래퍼
     */
    toolExecution<T>(toolName: string, params: unknown, fn: () => Promise<T>): Promise<T>;
    private log;
    private logError;
    private write;
    private formatPretty;
    private sanitizeParams;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map