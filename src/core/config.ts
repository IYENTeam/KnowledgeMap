/**
 * Configuration Management
 *
 * 환경 검증, 경로 관리, 자동 복구 기능을 포함한 설정 시스템
 */

import { existsSync, mkdirSync, accessSync, constants } from 'fs';
import { resolve, join } from 'path';
import { ConfigurationError } from './errors.js';
import { logger } from './logger.js';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Omit<ServerConfig, 'vaultPath'> = {
  name: 'canvas-knowledge-mcp',
  version: '2.0.0',
  canvasDir: '03_Canvas',
  metaDir: '.meta',
};

// =============================================================================
// Configuration Loader
// =============================================================================

export class ConfigManager {
  private config: ServerConfig | null = null;

  /**
   * 환경 변수에서 설정을 로드하고 검증합니다.
   */
  load(): ServerConfig {
    if (this.config) return this.config;

    const vaultPath = process.env.VAULT_PATH;
    const canvasDir = process.env.CANVAS_DIR ?? DEFAULT_CONFIG.canvasDir;

    if (!vaultPath) {
      throw ConfigurationError.missingEnv('VAULT_PATH');
    }

    this.config = {
      ...DEFAULT_CONFIG,
      vaultPath: resolve(vaultPath),
      canvasDir,
      metaDir: join(canvasDir, DEFAULT_CONFIG.metaDir),
    };

    return this.config;
  }

  /**
   * 설정을 검증하고 필요시 자동 복구합니다.
   */
  async validate(autoFix = true): Promise<ValidationResult> {
    const config = this.load();
    const issues: ValidationIssue[] = [];
    const autoFixed: string[] = [];

    // 1. Vault 경로 검증
    const vaultValidation = this.validateDirectory(config.vaultPath, 'Vault', autoFix);
    issues.push(...vaultValidation.issues);
    autoFixed.push(...vaultValidation.autoFixed);

    // 2. Canvas 디렉토리 검증
    const canvasPath = join(config.vaultPath, config.canvasDir);
    const canvasValidation = this.validateDirectory(canvasPath, 'Canvas', autoFix);
    issues.push(...canvasValidation.issues);
    autoFixed.push(...canvasValidation.autoFixed);

    // 3. Meta 디렉토리 검증
    const metaPath = join(config.vaultPath, config.metaDir);
    const metaValidation = this.validateDirectory(metaPath, 'Meta', autoFix);
    issues.push(...metaValidation.issues);
    autoFixed.push(...metaValidation.autoFixed);

    // 로그 출력
    if (autoFixed.length > 0) {
      logger.info('Auto-fixed configuration issues', { fixed: autoFixed });
    }

    const errors = issues.filter((i) => i.type === 'error' && !i.recoverable);
    if (errors.length > 0) {
      logger.error('Configuration validation failed', undefined, {
        errorCount: errors.length,
        errors: errors.map((e) => e.message),
      });
    }

    return {
      valid: errors.length === 0,
      issues,
      autoFixed,
    };
  }

  /**
   * 디렉토리를 검증하고 필요시 생성합니다.
   */
  private validateDirectory(
    path: string,
    name: string,
    autoFix: boolean
  ): { issues: ValidationIssue[]; autoFixed: string[] } {
    const issues: ValidationIssue[] = [];
    const autoFixed: string[] = [];

    // 존재 여부 확인
    if (!existsSync(path)) {
      if (autoFix) {
        try {
          mkdirSync(path, { recursive: true });
          autoFixed.push(`Created ${name} directory: ${path}`);
          logger.info(`Created missing directory: ${path}`, { directory: name });
        } catch (error) {
          issues.push({
            type: 'error',
            path,
            message: `Failed to create ${name} directory: ${path}`,
            recoverable: false,
          });
        }
      } else {
        issues.push({
          type: 'error',
          path,
          message: `${name} directory does not exist: ${path}`,
          recoverable: true,
        });
      }
      return { issues, autoFixed };
    }

    // 권한 확인
    try {
      accessSync(path, constants.R_OK | constants.W_OK);
    } catch {
      issues.push({
        type: 'error',
        path,
        message: `No read/write permission for ${name} directory: ${path}`,
        recoverable: false,
      });
    }

    return { issues, autoFixed };
  }

  /**
   * 캔버스 경로를 정규화합니다.
   */
  resolveCanvasPath(canvasPath: string): string {
    const config = this.load();

    // 이미 절대 경로인 경우
    if (canvasPath.startsWith('/')) {
      return canvasPath;
    }

    // 캔버스 디렉토리 접두사가 있는 경우
    if (canvasPath.startsWith(config.canvasDir)) {
      return join(config.vaultPath, canvasPath);
    }

    // 파일명만 있는 경우
    return join(config.vaultPath, config.canvasDir, canvasPath);
  }

  /**
   * 메타 파일 경로를 생성합니다.
   */
  resolveMetaPath(canvasPath: string): string {
    const config = this.load();
    const canvasName = canvasPath.split('/').pop()?.replace('.canvas', '') ?? 'unknown';
    return join(config.vaultPath, config.metaDir, `${canvasName}.meta.json`);
  }

  /**
   * 현재 설정을 반환합니다.
   */
  getConfig(): ServerConfig {
    return this.load();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const configManager = new ConfigManager();

// =============================================================================
// Initialization Helper
// =============================================================================

/**
 * 서버 시작 시 환경을 검증하고 초기화합니다.
 */
export async function initializeEnvironment(): Promise<void> {
  logger.info('Initializing environment...');

  const config = configManager.load();
  logger.info('Configuration loaded', {
    vaultPath: config.vaultPath,
    canvasDir: config.canvasDir,
  });

  const validation = await configManager.validate(true);

  if (!validation.valid) {
    const errors = validation.issues.filter((i) => i.type === 'error');
    throw ConfigurationError.invalidPath(
      config.vaultPath,
      errors.map((e) => e.message).join('; ')
    );
  }

  logger.info('Environment initialized successfully', {
    autoFixed: validation.autoFixed.length,
    warnings: validation.issues.filter((i) => i.type === 'warning').length,
  });
}
