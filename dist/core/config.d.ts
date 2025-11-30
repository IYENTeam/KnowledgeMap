/**
 * Configuration Management
 *
 * 환경 검증, 경로 관리, 자동 복구 기능을 포함한 설정 시스템
 */
export interface ServerConfig {
    name: string;
    version: string;
    vaultPath: string;
    canvasDir: string;
    metaDir: string;
}
export interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    autoFixed: string[];
}
export interface ValidationIssue {
    type: 'error' | 'warning';
    path?: string;
    message: string;
    recoverable: boolean;
}
export declare class ConfigManager {
    private config;
    /**
     * 환경 변수에서 설정을 로드하고 검증합니다.
     */
    load(): ServerConfig;
    /**
     * 설정을 검증하고 필요시 자동 복구합니다.
     */
    validate(autoFix?: boolean): Promise<ValidationResult>;
    /**
     * 디렉토리를 검증하고 필요시 생성합니다.
     */
    private validateDirectory;
    /**
     * 캔버스 경로를 정규화합니다.
     */
    resolveCanvasPath(canvasPath: string): string;
    /**
     * 메타 파일 경로를 생성합니다.
     */
    resolveMetaPath(canvasPath: string): string;
    /**
     * 현재 설정을 반환합니다.
     */
    getConfig(): ServerConfig;
}
export declare const configManager: ConfigManager;
/**
 * 서버 시작 시 환경을 검증하고 초기화합니다.
 */
export declare function initializeEnvironment(): Promise<void>;
//# sourceMappingURL=config.d.ts.map