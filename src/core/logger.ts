/**
 * Structured Logging System
 *
 * JSON 기반의 구조화된 로그로 관찰성(Observability) 확보
 */

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Log Level Hierarchy
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// =============================================================================
// Logger Class
// =============================================================================

export class Logger {
  private readonly minLevel: number;
  private readonly prettyPrint: boolean;
  private readonly includeStack: boolean;
  private traceId?: string;

  constructor(options: LoggerOptions = {}) {
    this.minLevel = LOG_LEVELS[options.minLevel ?? 'info'];
    this.prettyPrint = options.prettyPrint ?? process.env.NODE_ENV === 'development';
    this.includeStack = options.includeStack ?? true;
  }

  /**
   * 트레이스 ID 설정 (요청 추적용)
   */
  withTraceId(traceId: string): Logger {
    const child = new Logger({
      minLevel: Object.entries(LOG_LEVELS).find(([, v]) => v === this.minLevel)?.[0] as LogLevel,
      prettyPrint: this.prettyPrint,
      includeStack: this.includeStack,
    });
    child.traceId = traceId;
    return child;
  }

  /**
   * 디버그 로그
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  /**
   * 정보 로그
   */
  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  /**
   * 경고 로그
   */
  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  /**
   * 에러 로그
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logError('error', message, error, context);
  }

  /**
   * 치명적 에러 로그
   */
  fatal(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logError('fatal', message, error, context);
  }

  /**
   * 도구 실행 시간 측정 데코레이터
   */
  timed<T>(
    name: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = performance.now();

    return fn()
      .then((result) => {
        const duration = Math.round(performance.now() - startTime);
        this.info(`${name} completed`, { ...context, duration });
        return result;
      })
      .catch((error) => {
        const duration = Math.round(performance.now() - startTime);
        this.error(`${name} failed`, error, { ...context, duration });
        throw error;
      });
  }

  /**
   * 도구 실행 래퍼
   */
  async toolExecution<T>(
    toolName: string,
    params: unknown,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();

    this.debug(`Tool execution started: ${toolName}`, {
      tool: toolName,
      params: this.sanitizeParams(params),
    });

    try {
      const result = await fn();
      const duration = Math.round(performance.now() - startTime);

      this.info(`Tool execution completed: ${toolName}`, {
        tool: toolName,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - startTime);

      this.error(`Tool execution failed: ${toolName}`, error, {
        tool: toolName,
        duration,
        success: false,
      });

      throw error;
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(this.traceId && { traceId: this.traceId }),
    };

    this.write(entry);
  }

  private logError(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext
  ): void {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && { context }),
      ...(this.traceId && { traceId: this.traceId }),
    };

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
          ...(this.includeStack && { stack: error.stack }),
          ...('code' in error && { code: String(error.code) }),
        };
      } else {
        entry.error = {
          name: 'UnknownError',
          message: String(error),
        };
      }
    }

    this.write(entry);
  }

  private write(entry: LogEntry): void {
    const output = this.prettyPrint
      ? this.formatPretty(entry)
      : JSON.stringify(entry);

    // MCP는 stderr로 로그 출력
    console.error(output);
  }

  private formatPretty(entry: LogEntry): string {
    const levelColors: Record<LogLevel, string> = {
      debug: '\x1b[90m', // gray
      info: '\x1b[36m', // cyan
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    const time = entry.timestamp.split('T')[1].split('.')[0];
    const level = entry.level.toUpperCase().padEnd(5);

    let line = `${color}[${time}] ${level}${reset} ${entry.message}`;

    if (entry.context) {
      const contextStr = Object.entries(entry.context)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join(' ');
      line += ` ${'\x1b[90m'}${contextStr}${reset}`;
    }

    if (entry.error) {
      line += `\n  ${color}Error: ${entry.error.message}${reset}`;
      if (entry.error.stack && this.includeStack) {
        const stackLines = entry.error.stack.split('\n').slice(1, 4);
        line += `\n  ${'\x1b[90m'}${stackLines.join('\n  ')}${reset}`;
      }
    }

    return line;
  }

  private sanitizeParams(params: unknown): unknown {
    if (typeof params !== 'object' || params === null) {
      return params;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      // 큰 문자열은 잘라내기
      if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = `${value.slice(0, 200)}... (${value.length} chars)`;
      } else if (Array.isArray(value) && value.length > 10) {
        sanitized[key] = `[${value.length} items]`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

// =============================================================================
// Default Logger Instance
// =============================================================================

export const logger = new Logger({
  minLevel: (process.env.LOG_LEVEL as LogLevel) ?? 'info',
  prettyPrint: process.env.NODE_ENV === 'development',
});
